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
  /** 是否主账号：最早绑定的账号（列表按绑定时间正序，仅首项 true）；站点用户头像取该账号皮肤 */
  isMain?: boolean
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
  /** 目标 MC 身份的快照 UUID（账号解绑/删除后仍在，缺省表示老数据或非 MC 封禁） */
  minecraftUuid?: string | null
  /** 目标 MC 用户名快照 */
  minecraftUsername?: string | null
  type: BanType | string
  reason: string
  createdAt?: number
  /** null/缺省 = 永久 */
  expiresAt?: number | null
  revokedAt?: number | null
  createdBy?: string | null
  /** 管理端列表专用：createdBy 解析出的用户名（非用户命名空间或用户已删时为 null） */
  createdByName?: string | null
  revokedBy?: string | null
}

/** 创建封禁入参（POST /admin/bans）；expiresAt 省略 = 永久。
 *  目标二选一：已绑定账号传 minecraftAccountId，未绑定玩家直接传 minecraftUuid。 */
export interface CreateBanInput {
  minecraftAccountId?: string
  minecraftUuid?: string
  type: BanType
  reason: string
  expiresAt?: number | null
}

/** 封禁目标候选（GET /admin/minecraft?q=）：按角色名模糊 / uuid 精确命中 */
export interface BanTargetCandidate {
  /** 本库账号 id；null = 未绑定玩家（搜索经 Mojang 代查兜底命中），只能按 uuid 封 */
  id: string | null
  uuid: string
  name: string
  platform: string | null
  verifiedAt?: number | null
  /** 所属网站账号；未绑定为 null */
  userId: string | null
  username: string | null
  /** 该 uuid 当前的有效封禁摘要（已在封禁中时非空） */
  activeBan?: { id: string; reason: string; expiresAt: number | null; createdAt: number } | null
}

/** 封禁影响面预览（GET /admin/bans/preview）：本次封禁会覆盖的全部 MC 账号 */
export interface BanScopePreview {
  target: { accountId: string | null; uuid: string; name: string | null }
  /** 目标 uuid 是否已绑定本站账号；false 时无连带，仅封该 uuid */
  bound: boolean
  items: Array<{
    id: string
    uuid: string
    name: string
    userId: string
    username: string | null
    /** 已在封禁中：提交时幂等跳过，不新建行 */
    alreadyBanned: boolean
  }>
  total: number
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
  /** 拆帧序列 ID（随 multipart setId 字段产生；单元素集合无此字段） */
  setId?: string
  /** 拆帧序列内序号 0..N-1（单元素集合无此字段） */
  setIndex?: number
  uploadedBy?: string | null
  createdAt?: number
}

// ---------- 管理端·用户 ----------

/**
 * 后端 RBAC 角色名（0007 + 0027 种子）。
 * staff 为只读治理角色：可看举报 / 投票 / 看举报附件，不能封禁、不能改角色、
 * 不能读封禁证据；moderator 及以上自动继承 staff 能力。
 */
export type NexusRoleName = 'user' | 'staff' | 'moderator' | 'admin' | 'owner'

/** 用户列表项（GET /admin/users） */
export interface AdminUserListItem {
  id: string
  username: string
  email?: string
  emailVerified?: boolean
  avatarKey?: string | null
  /** 生日（`YYYY-MM-DD`，可空；仅本人与管理端可见） */
  birthday?: string | null
  /** 是否已用掉唯一一次自助修改生日的机会 */
  birthdaySelfEdited?: boolean
  createdAt?: number
  roles?: string[]
}

/** 管理端用户详情附带的 MC 账号当前有效封禁摘要（activeBan；无有效封禁时为 null） */
export interface MinecraftBanSummary {
  id: string
  reason: string
  /** null/缺省 = 永久封禁 */
  expiresAt?: number | null
  createdAt?: number
}

/** 管理端用户详情（GET /admin/users/:id）的 minecraftAccounts 项：通用 MC 账号 + 管理侧聚合字段 */
export interface AdminMinecraftAccount extends MinecraftAccount {
  /** 是否主号：main_alt 关联 owner 端；名下完全无关联时为最早绑定的账号 */
  isMain?: boolean
  /** 该账号 uuid 当前有效 minecraft 封禁摘要；null = 无有效封禁 */
  activeBan?: MinecraftBanSummary | null
}

/** 用户详情（GET /admin/users/:id）：附角色与 MC 账号（后端补齐） */
export interface AdminUserDetail extends AdminUserListItem {
  updatedAt?: number
  minecraftAccounts?: AdminMinecraftAccount[]
  /** 名下全部类型的有效封禁（只读展示 + 撤销；创建统一走封禁页） */
  bans?: Ban[]
}

/** 分页信封宽容类型：items 必有，total/page/limit 以后端实际为准 */
export interface Paged<T> {
  items: T[]
  total?: number
  page?: number
  limit?: number
}

// ---------- 管理端·审计 ----------

/** 审计日志（GET /admin/audit 元素；操作者/目标名由后端读取期解析） */
export interface AuditLog {
  id: string
  actorUserId?: string | null
  /** 操作者用户名；null = 该用户已注销（actorUserId 仍保留） */
  actorName?: string | null
  /** 操作者邮箱（仅行内详情展示） */
  actorEmail?: string | null
  action: string
  /** 事件分类 id（见后端 AUDIT_ACTION_CATALOG） */
  actionCategory?: string | null
  targetType?: string | null
  targetId?: string | null
  /** 目标名（user / minecraft_account 类型解析得出，其余为 null） */
  targetName?: string | null
  /** 结构化后的 metadata（后端已解析；非法 JSON 为 null） */
  metadata?: Record<string, unknown> | null
  ipHash?: string | null
  userAgent?: string | null
  createdAt?: number
}

/** 审计事件目录项（GET /admin/audit/actions 元素） */
export interface AuditActionOption {
  action: string
  category: string
}

/** 审计归档对象（GET /admin/audit/archive 元素，R2 JSONL 对象元信息） */
export interface AuditArchive {
  key: string
  size?: number
  lastModified?: number
}

// ---------- 举报（/me/reports · /reports · /admin/reports/:id/resolve） ----------

/**
 * 举报类型。与后端 `report.schema.ts` 的 ReportCategory 一一对应，
 * 也是 `reports.category` 的 CHECK 取值。
 */
export type ReportCategory = 'cheat' | 'steal' | 'grief' | 'insult' | 'spam' | 'exploit' | 'other'

/** 举报状态：pending 待处理 / banned 已封禁 / rejected 已驳回 */
export type ReportStatus = 'pending' | 'banned' | 'rejected'

/** 投票结论（仅供处置参考，无约束力） */
export type ReportVerdict = 'violation' | 'no_violation'

/** 票数汇总 */
export interface ReportVoteTally {
  violation: number
  noViolation: number
}

/** 举报附件元数据（三个视图共用；后端不返回 object_key） */
export interface ReportEvidence {
  id: string
  filename: string
  contentType: string
  size: number
  setId: string
  setIndex: number
  createdAt: number
}

/** 我的举报（`GET /me/reports`）：**不含**投票、内部备注、目标 uuid */
export interface MyReport {
  id: string
  targetPlayerName: string
  category: ReportCategory
  description: string
  linkUrl: string | null
  status: ReportStatus
  banId: string | null
  /** 对举报人可见的结案说明 */
  resolutionMessage: string | null
  createdAt: number
  resolvedAt: number | null
  evidence: ReportEvidence[]
}

/** staff 视图：多举报人用户名与票数汇总，仍不含 uuid / 内部备注 / 逐票明细 */
export interface StaffReport extends MyReport {
  reporterUsername: string
  reporterAccountDeleted: boolean
  voteTally: ReportVoteTally
}

/** 逐票明细项（仅 moderator+ 视图返回） */
export interface ReportVoteDetail {
  voterUsername: string
  voterDeleted: boolean
  verdict: ReportVerdict
  note: string | null
  createdAt: number
  updatedAt: number
}

/** moderator 视图：staff 视图 + 目标 uuid / 内部备注 / 处置人 / 逐票明细 */
export interface ModeratorReport extends StaffReport {
  targetMinecraftUuid: string | null
  targetMinecraftAccountId: string | null
  resolutionNote: string | null
  resolvedBy: string | null
  votes: ReportVoteDetail[]
}

/**
 * 前端待上传的附件产物（EvidenceDrop 编码后交给父页面上传）。
 * 单张为 setId/setIndex 均 undefined；拆帧序列共享 setId、setIndex 递增。
 */
export interface ReportEvidenceItem {
  blob: Blob
  /** 上传文件名（服务端只作展示元数据） */
  name: string
  setId?: string
  setIndex?: number
}

/** 提交举报入参（不含 uuid / accountId：目标由服务端按名字解析） */
export interface CreateReportInput {
  targetPlayerName: string
  category: ReportCategory
  description: string
  linkUrl?: string
}

/** 处置入参：封禁或驳回 */
export interface ResolveReportInput {
  action: 'ban' | 'reject'
  type?: 'website' | 'minecraft' | 'chat'
  reason?: string
  expiresAt?: number
  /** 举报单未快照到 MC 账号时显式指定目标（须与举报对象同名） */
  minecraftAccountId?: string
  minecraftUuid?: string
  note?: string
  message?: string
}

/** 处置结果 */
export interface ResolveReportResult {
  ok: true
  status: 'banned' | 'rejected'
  banId: string | null
  /** 目标已有生效封禁时为 true（banId 指向既有封禁，未新建） */
  deduped: boolean
}
