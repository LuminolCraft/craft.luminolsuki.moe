import { createAuthClient } from 'better-auth/vue'
import type { AppError } from '@/types/auth'
import { API_BASE_URL } from '@/lib/api-base'

/**
 * Better Auth 前端客户端（/api/auth/*，Better Auth 原生请求/响应格式）。
 *
 * - 认证层与业务层严格分离：登录/注册/找回密码/邮箱验证走本客户端，
 *   Nexus 业务 API（/api/v1/*，统一 Envelope）走 src/lib/api.ts
 * - 前后端不同 Origin，必须 credentials: 'include' 才能携带 HttpOnly Session Cookie
 * - baseURL 只传 API 基地址；Better Auth 默认挂载路径 /api/auth/* 与后端约定一致
 * - 前端不保存任何 Token：Session 由浏览器 Cookie + 服务端管理
 */
export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  fetchOptions: {
    credentials: 'include',
  },
})

/** Better Auth 客户端错误的最小结构（原生格式，非 Nexus Envelope） */
interface BetterAuthClientError {
  message?: string
  code?: string | null
  status?: number | null
  /** BA 原生 429 body 为 { message, resetAt }，resetAt 为 epoch 毫秒 */
  resetAt?: number | null
}

/** Better Auth 错误码 → 文档约定的业务错误码 */
const CODE_MAP: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'AUTH_INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_VERIFICATION_REQUIRED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_NOT_FOUND: 'AUTH_INVALID_CREDENTIALS',
  // 登录方式关联/解绑流程（Better Auth 原生 code 直接透传）
  FAILED_TO_UNLINK_LAST_ACCOUNT: 'FAILED_TO_UNLINK_LAST_ACCOUNT',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  PASSWORD_ALREADY_SET: 'PASSWORD_ALREADY_SET',
}

/** Better Auth 原生 422 重复邮箱注册：{ message: "User already exists" }（无 code） */
const ALREADY_EXISTS_RE = /already exists/i

/**
 * 把 Better Auth 客户端错误归一化为 AppError，
 * 页面统一按 error.code 分支（与 Nexus Envelope 错误同一消费模型）。
 */
export function toAppError(error: unknown): AppError {
  if (!error || typeof error !== 'object') {
    return { code: 'NETWORK_ERROR', message: 'Network error' }
  }

  const e = error as Record<string, unknown>

  // Nexus Envelope 包装（迁移文档 §40/L1646）：{ success: false, error: { code, message }, requestId }
  // 后端若选择把 Better Auth 错误包装为统一信封，直接透传其业务 code 与 requestId
  if (e.success === false) {
    const inner = e.error as { code?: unknown; message?: unknown } | undefined
    if (inner && typeof inner === 'object' && typeof inner.code === 'string') {
      return {
        code: inner.code,
        message: typeof inner.message === 'string' ? inner.message : undefined,
        requestId: typeof e.requestId === 'string' ? e.requestId : undefined,
      }
    }
  }

  // Better Auth 原生格式：{ message, code, status }
  const native = e as BetterAuthClientError

  // Better Auth 内置限流返回 429（无稳定 code），resetAt 透传至 details 供 errorToResetAt 读取
  if (native.status === 429) {
    return {
      code: 'RATE_LIMITED',
      message: native.message,
      details: typeof native.resetAt === 'number' ? { resetAt: native.resetAt } : undefined,
    }
  }

  // 重复邮箱注册：Better Auth 原生 422 { message: "User already exists" }（无 code，非 Nexus 信封）
  if (native.status === 422 && native.message && ALREADY_EXISTS_RE.test(native.message)) {
    return { code: 'USER_ALREADY_EXISTS', message: native.message }
  }

  const code = (native.code && CODE_MAP[native.code]) || native.code || 'AUTH_ERROR'
  return { code, message: native.message }
}
