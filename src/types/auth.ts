/**
 * 认证相关类型定义
 * - Better Auth 认证层：/api/auth/*（原生格式），客户端类型经 authClient.$Infer 推导
 * - Nexus 业务层：/api/v1/*（统一 Envelope）
 * 契约以 2/Luminol-Nexus-Better-Auth-Frontend-Integration-v1.md 为准
 */

/** 当前用户（GET /api/v1/me 返回体，Nexus 业务用户） */
export interface User {
  id: string
  username: string
  email: string
  emailVerified: boolean
  avatarKey: string | null
  createdAt?: number
}

/** 会话类型：ephemeral 普通登录 / persistent 记住我 */
export type SessionKind = 'ephemeral' | 'persistent'

/** 会话条目（GET /api/v1/me/sessions 返回体元素） */
export interface SessionInfo {
  id: string
  deviceId?: string | null
  kind: SessionKind | string
  createdAt: number
  expiresAt?: number | null
  lastUsedAt?: number | null
  revokedAt?: number | null
  current?: boolean
  userAgent?: string | null
}

/** DELETE /me/sessions/:id 返回体 */
export interface SessionRevokeResult {
  ok: boolean
}

/** 前端需要按 code 分支处理的错误码（Nexus Envelope + Better Auth 归一化后） */
export type ApiErrorCode =
  // 未认证（清态 + 回登录页）
  | 'AUTH_REQUIRED'
  | 'UNAUTHORIZED'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_SESSION_REVOKED'
  // 认证流程
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_ERROR'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'PASSWORD_RESET_INVALID'
  | 'USER_ALREADY_EXISTS'
  | 'INVALID_PASSWORD'
  | 'USER_NOT_FOUND'
  // OAuth
  | 'OAUTH_PROVIDER_UNSUPPORTED'
  | 'OAUTH_CALLBACK_FAILED'
  | 'OAUTH_ACCOUNT_LINK_REQUIRED'
  // Minecraft 账号
  | 'MINECRAFT_ACCOUNT_NOT_FOUND'
  | 'MINECRAFT_ACCOUNT_ALREADY_LINKED'
  | 'MINECRAFT_PLATFORM_UNSUPPORTED'
  | 'MINECRAFT_VERIFICATION_FAILED'
  // 封禁
  | 'BAN_NOT_FOUND'
  | 'BAN_ACCESS_DENIED'
  | 'BAN_ALREADY_REVOKED'
  | 'BAN_INVALID_TYPE'
  // 账号关联（主号↔小号）
  | 'ACCOUNT_LINK_NOT_FOUND'
  | 'ACCOUNT_LINK_DUPLICATE'
  | 'ACCOUNT_LINK_RATE_LIMITED'
  // 文件
  | 'FILE_TOO_LARGE'
  | 'FILE_TYPE_NOT_ALLOWED'
  | 'FILE_INVALID_IMAGE'
  | 'FILE_NOT_FOUND'
  // 通用
  | 'REAUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'INTERNAL_SERVER_ERROR'

/** 后端失败信封 */
export interface ErrorEnvelope {
  success: false
  error: {
    code: string
    message?: string
    details?: Record<string, unknown>
  }
  requestId?: string
}

/**
 * 拦截器抛出的结构化错误。
 * 业务只能依赖 `code` 分支，不得依赖 `message`（展示文案可变）。
 */
export interface AppError {
  code: string
  message?: string
  details?: Record<string, unknown>
  requestId?: string
}
