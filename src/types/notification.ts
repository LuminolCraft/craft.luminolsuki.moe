/**
 * 站内通知域类型（/api/v1/notifications*，统一 Envelope 拆包后的 data 形状）。
 * WS 推送 payload 与 REST 列表元素同构；时间戳均为毫秒，字段保持宽容（可选）。
 */

/** 通知类型：announcement = 运营公告 / warning = 管理警示（如违规提醒） */
export type NotificationType = 'announcement' | 'warning'

/** 站内通知条目（WS 推送 payload、GET /notifications 列表元素） */
export interface NotificationItem {
  id: string
  type: NotificationType | string
  title: string
  body?: string | null
  /** 仅站内路径（/xxx），空则不可跳转 */
  link?: string | null
  /** null/缺省 = 未读 */
  readAt?: number | null
  createdAt?: number
}

/** GET /notifications/unread-count 返回体 */
export interface UnreadCountResult {
  count: number
}

/** POST /notifications/:id/read、POST /notifications/read-all 返回体（unreadCount 以服务端为权威） */
export interface MarkReadResult {
  ok: boolean
  unreadCount: number
}

/** POST /admin/notifications 入参：target = 'all' | userId | userId[] */
export interface AdminNotificationInput {
  target: 'all' | string | string[]
  type: NotificationType | string
  /** 1-120 字 */
  title: string
  /** ≤2000 字，可省略 */
  body?: string
  /** 仅站内路径（/xxx），可省略 */
  link?: string
}

/** POST /admin/notifications 返回体 */
export interface AdminNotificationResult {
  ok: boolean
  count: number
}

/** 管理端「已发布公告」批次聚合行（GET /admin/notifications/sent） */
export interface SentNotificationBatch {
  createdBy?: string | null
  type: NotificationType | string
  title: string
  body?: string | null
  link?: string | null
  createdAt?: number
  total?: number
  unread?: number
}

/** 删除批次的批次选择器（DELETE /admin/notifications/sent body） */
export interface SentNotificationSelector {
  createdAt: number
  type: NotificationType | string
  title: string
  createdBy: string
}

/** DELETE /admin/notifications/sent 返回体 */
export interface DeleteSentNotificationsResult {
  ok: boolean
  deleted: number
}
