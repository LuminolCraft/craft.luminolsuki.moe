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
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
  timeout: 15000,
})

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
  (error: AxiosError<ErrorEnvelope>) => {
    const envelope = error.response?.data

    const appError: AppError = envelope?.error
      ? {
          code: envelope.error.code,
          message: envelope.error.message,
          details: envelope.error.details,
          requestId: envelope.requestId,
        }
      : // 无响应/网络错误兜底
        { code: 'NETWORK_ERROR', message: error.message }

    return Promise.reject(appError)
  },
)

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
   * 本轮唯一用途：管理端封禁证据上传（POST /admin/bans/:id/evidence）。
   */
  upload<T>(url: string, file: File, fieldName = 'file'): Promise<T> {
    const form = new FormData()
    form.append(fieldName, file)
    return apiClient.post(url, form) as Promise<T>
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
