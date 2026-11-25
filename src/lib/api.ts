import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import type { AppError, ErrorEnvelope } from '@/types/auth'
import { API_BASE_URL } from '@/lib/api-base'

/**
 * Nexus 业务 API 客户端（/api/v1/*，统一 Envelope 格式）。
 * - 登录态载体是后端 HttpOnly Cookie，前端不读写、不保存任何 Token
 * - 必须 withCredentials（CORS 凭据）
 * - 响应拦截器自动拆统一信封：成功返回 data，失败抛结构化 AppError（按 code 分支）
 * - 注意：/api/auth/*（Better Auth 原生格式）走 src/lib/auth-client.ts，不得用本客户端解析
 */
const CLIENT_CONFIG = {
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
  timeout: 15000,
}

/** 统一错误归一：信封里的 error 优先，其余（无响应/网络错误）按 NETWORK_ERROR 兜底。 */
function normalizeApiError(error: AxiosError<ErrorEnvelope>): AppError {
  const envelope = error.response?.data
  return envelope?.error
    ? {
        code: envelope.error.code,
        message: envelope.error.message,
        details: envelope.error.details,
        requestId: envelope.requestId,
      }
    : { code: 'NETWORK_ERROR', message: error.message }
}

export const apiClient = axios.create(CLIENT_CONFIG)

apiClient.interceptors.response.use(
  (response) => {
    const contentType = (response.headers['content-type'] as string | undefined) ?? ''

    // JSON API：拆掉统一响应信封，直接返回 data
    if (contentType.includes('application/json')) {
      return response.data?.data as AxiosResponse
    }

    // 二进制/流式响应：直接返回原始数据
    return response.data as AxiosResponse
  },
  (error: AxiosError<ErrorEnvelope>) => Promise.reject(normalizeApiError(error)),
)

/**
 * 只做错误归一、**不拆信封**的客户端：给需要读取信封顶层字段的端点用
 * （当前仅 `GET /skin/:name` 的 `type`）。
 */
const envelopeClient = axios.create(CLIENT_CONFIG)

envelopeClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorEnvelope>) => Promise.reject(normalizeApiError(error)),
)

/**
 * GET 并保留统一信封：返回 `data` 与整个信封（`meta`，含 `type` 等顶层字段）。
 * 仅用于少数需要 meta 的端点；其余一律走 `api.*`。
 */
export async function apiGetEnvelope<T>(
  url: string,
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const response = await envelopeClient.get<Record<string, unknown>>(url)
  const body = response.data ?? {}
  return { data: body.data as T, meta: body }
}

/** multipart 上传附加选项 */
export interface UploadOptions {
  /** 附加 multipart 文本字段（如封禁证据的 setId / setIndex） */
  fields?: Record<string, string>
  /** 上传文件名（Blob 无自带 name，或需要重命名如 evi_xxx.avif 时指定） */
  filename?: string
  /** 上传进度回调（0-100；responseTotal 未知时不回调） */
  onProgress?: (percent: number) => void
  /** 取消信号（关闭面板 / 切换目标时中止在途上传） */
  signal?: AbortSignal
}

/**
 * 上传专用超时：120 秒。
 *
 * 全局 15s 是给普通 JSON 请求的；5MiB 附件在 1Mbps 上行需要 ~42s，用 15s
 * 会让移动网络下的上传必然 NETWORK_ERROR。超时按"整包传输"计，不按"最后一个
 * 字节"，因此给足余量。
 */
const UPLOAD_TIMEOUT_MS = 120_000

/** 上传重试次数（网络错误 / 5xx 才重试；4xx 立即失败，避免无意义重放） */
const UPLOAD_MAX_ATTEMPTS = 3
/** 退避间隔（毫秒）：1s / 3s */
const UPLOAD_RETRY_DELAYS_MS = [1000, 3000]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 判断错误是否值得重试：无响应、超时、5xx 可重试；4xx（含 401/403/409/413/429）不重试 */
function isRetryableUploadError(error: unknown): boolean {
  const e = error as { code?: string; status?: number; response?: { status?: number } }
  const status = e?.response?.status ?? e?.status
  if (typeof status === 'number') return status >= 500
  // 无状态码：网络错误 / 超时
  return e?.code === 'NETWORK_ERROR' || e?.code === 'ECONNABORTED' || e?.code === 'ERR_NETWORK'
}

/** 类型化请求门面：拦截器已解包信封，调用方直接拿到 data */
export const api = {
  get<T>(url: string): Promise<T> {
    return apiClient.get(url) as Promise<T>
  },
  post<T>(url: string, body?: unknown): Promise<T> {
    return apiClient.post(url, body) as Promise<T>
  },
  patch<T>(url: string, body?: unknown): Promise<T> {
    return apiClient.patch(url, body) as Promise<T>
  },
  delete<T>(url: string, config?: { data?: unknown }): Promise<T> {
    return apiClient.delete(url, config) as Promise<T>
  },
  /**
   * multipart 文件上传。不要手动设 Content-Type——由浏览器自动生成含 boundary 的头。
   *
   * 与普通请求的差异（都踩过）：
   * - **独立超时 120s**：全局 15s 会卡死移动网络下的 5MiB 上传；
   * - **可取消**：传 `options.signal`，关闭浮层时中止，避免"面板已关、上传完成后
   *   把结果 append 到别的列表"；
   * - **可重试**：仅对网络错误 / 5xx 退避重试 3 次，4xx 立即失败（409 槽位冲突、
   *   413 超限重放没有意义）。
   *
   * 每次重试都重建 FormData：body 是一次性的，复用会发送空包。
   */
  async upload<T>(
    url: string,
    file: File | Blob,
    options: UploadOptions = {},
    fieldName = 'file',
  ): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt < UPLOAD_MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        const delay = UPLOAD_RETRY_DELAYS_MS[attempt - 1] ?? 3000
        await sleep(delay)
        options.onProgress?.(0)
      }
      try {
        const form = new FormData()
        if (options.filename) {
          form.append(fieldName, file, options.filename)
        } else {
          form.append(fieldName, file)
        }
        for (const [key, value] of Object.entries(options.fields ?? {})) {
          form.append(key, value)
        }
        return (await apiClient.post(url, form, {
          timeout: UPLOAD_TIMEOUT_MS,
          signal: options.signal,
          onUploadProgress: (event) => {
            if (!options.onProgress || !event.total) return
            options.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
          },
        })) as T
      } catch (error) {
        // 主动取消：不重试，原样抛出
        if (options.signal?.aborted) throw error
        lastError = error
        if (!isRetryableUploadError(error)) throw error
      }
    }
    throw lastError
  },
}

/** 判断抛出对象是否为结构化 AppError */
export function isAppError(value: unknown): value is AppError {
  return typeof value === 'object' && value !== null && 'code' in value
}

/** 从 429 错误的 details.resetAt 取重试时间戳（毫秒），非法返回 null */
export function errorToResetAt(error: AppError): number | null {
  const resetAt = (error.details as { resetAt?: unknown } | undefined)?.resetAt
  const n = Number(resetAt)
  return Number.isFinite(n) && n > 0 ? n : null
}
