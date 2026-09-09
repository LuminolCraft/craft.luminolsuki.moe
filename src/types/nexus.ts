/**
 * Nexus 业务域类型（/api/v1/*，统一 Envelope 拆包后的 data 形状）
 * 契约基线：.trae/specs/build-user-and-admin-pages/spec.md「后端合同」表
 * 注意：分页/列表字段以后端实际响应为准，类型保持宽容（可选字段），页面按缺省降级
 */

// ---------- 授权（GET /me/authorization） ----------

/** 授权信息：仅内存缓存于 authorization store，禁止持久化 */
export interface AuthorizationInfo {
  roles: string[]
  permissions: string[]
}

/** 进入管理后台的核心权限 key */
export const ADMIN_ACCESS_PERMISSION = 'admin:access'

// ---------- Minecraft 账号 ----------

/** 平台枚举：服务器已停用基岩版，仅支持 Java */
export type MinecraftPlatform = 'java'

/** MC 账号（GET /me/minecraft 元素；POST /me/minecraft 直接落库时的 201 返回体） */
export interface MinecraftAccount {
  id: string
  uuid: string
  name: string
  platform: MinecraftPlatform | string
  /** 皮肤来源：玩家名字或图片 URL（服务器设置皮肤两种情况，后端均为 string），由前端判断 */
  skin?: string | null
  /** null = 未验证（后端当前绑定时直接写当前时间） */
  verifiedAt?: number | null
  createdAt?: number
}

/** 绑定入参（POST /me/minecraft）——只输名字，uuid 由插件进服核验时上报 */
export interface BindMinecraftInput {
  platform: MinecraftPlatform
  name: string
}

/**
 * 绑定两步流程 pending 返回体（POST /me/minecraft 201）：
 * 6 位验证码，玩家进服 `/v <code>` 由 MC 插件核验后才落库；
 * pending 态没有 id 字段（判别联合以 status 区分）。
 */
export interface MinecraftBindPending {
  status: 'pending'
  code: string
  name: string
  platform: string
  /** 验证码有效期（秒），约 600 */
  expiresIn: number
}

/** POST /me/minecraft 201 返回体：一律为 pending（验证码引导态；rework-mc-bind-name-only） */
export type MinecraftBindResult = MinecraftBindPending

/** 玩家名解析代查结果（GET /mc/resolve）：name 为 Mojang 官方大小写，uuid 为小写连字符标准格式 */
export interface MinecraftNameResolve {
  name: string
  uuid: string
}

// ---------- 主号↔小号关联 ----------

export type AccountLinkRelation = 'main_alt'

/** 关联（GET /me/minecraft/:id/links 元素） */
export interface AccountLink {
  id: string
  ownerMinecraftAccountId: string
  linkedMinecraftAccountId: string
  relation: AccountLinkRelation | string
  createdAt?: number
  createdBy?: string | null
}

/** 建链入参（POST /account-links） */
export interface CreateAccountLinkInput {
  ownerId: string
  linkedId: string
  relation: AccountLinkRelation
}

// ---------- 封禁 ----------

export type BanType = 'website' | 'minecraft' | 'chat'

/** 封禁记录。有效性后端动态计算：revokedAt 为空 且（expiresAt 为空 = 永久 或 > now） */
export interface Ban {
  id: string
  minecraftAccountId: string | null
  type: BanType | string
  reason: string
  createdAt?: number
  /** null/缺省 = 永久 */
  expiresAt?: number | null
  revokedAt?: number | null
  createdBy?: string | null
  revokedBy?: string | null
}

/** 创建封禁入参（POST /admin/bans）；expiresAt 省略 = 永久 */
export interface CreateBanInput {
  minecraftAccountId: string
  type: BanType
  reason: string
  expiresAt?: number | null
}

/** 修改封禁入参（PATCH /admin/bans/:id）；expiresAt 显式 null = 改为永久 */
export interface UpdateBanInput {
  reason?: string
  expiresAt?: number | null
}

// ---------- 封禁证据 ----------

/** 证据记录（POST /admin/bans/:id/evidence 返回体） */
export interface BanEvidence {
  id: string
  banId: string
  filename: string
  contentType: string
  size: number
  sha256?: string
  uploadedBy?: string | null
  createdAt?: number
}

// ---------- 管理端·用户 ----------

export type NexusRoleName = 'user' | 'moderator' | 'admin' | 'owner'

/** 用户列表项（GET /admin/users） */
export interface AdminUserListItem {
  id: string
  username: string
  email?: string
  emailVerified?: boolean
  avatarKey?: string | null
  createdAt?: number
  roles?: string[]
}

/** 用户详情（GET /admin/users/:id）：附角色与 MC 账号（后端补齐） */
export interface AdminUserDetail extends AdminUserListItem {
  updatedAt?: number
  minecraftAccounts?: MinecraftAccount[]
}

/** 分页信封宽容类型：items 必有，total/page/limit 以后端实际为准 */
export interface Paged<T> {
  items: T[]
  total?: number
  page?: number
  limit?: number
}

// ---------- 管理端·审计 ----------

/** 审计日志（GET /admin/audit 元素） */
export interface AuditLog {
  id: string
  actorUserId?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown> | null
  ipHash?: string | null
  userAgent?: string | null
  createdAt?: number
}

/** 审计归档对象（GET /admin/audit/archive 元素，R2 JSONL 对象元信息） */
export interface AuditArchive {
  key: string
  size?: number
  lastModified?: number
}
