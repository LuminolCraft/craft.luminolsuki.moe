import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { API_BASE_URL } from '@/lib/api-base'
import { normalizePaged } from '@/lib/paged'
import type { Paged } from '@/types/nexus'
import type {
  AdminNotificationInput,
  AdminNotificationResult,
  DeleteSentNotificationsResult,
  MarkReadResult,
  NotificationItem,
  SentNotificationBatch,
  SentNotificationSelector,
  UnreadCountResult,
} from '@/types/notification'

/**
 * 站内通知 store —— 通知域唯一状态入口（组件零网络逻辑）。
 *
 * 数据面：
 * - SSE（`GET /api/v1/notifications/stream`，同源 + 会话 Cookie）实时推送；
 *   连接断开由 EventSource 自身重连，被彻底关闭时按指数退避重建（1s 起 ×2、max 30s、jitter 0.8~1.2）
 * - REST 权威：unread-count / 列表分页 / 已读回执的 unreadCount 直接覆盖本地
 * - BroadcastChannel（'nexus-notifications'）跨标签页同步推送与已读状态
 *
 * 生命周期：登录后由 auth store 调 connect()（fetchCurrentUser 成功且登录态建立的转移点），
 * 登出/会话失效由 clearAuthState() 调 disconnect()。未登录不建连。
 * generation 计数防止旧连接复活：每次 connect/disconnect 递增，一切异步回调先比对。
 */

/** 跨标签页广播消息（BroadcastChannel 'nexus-notifications'） */
export type NotificationBroadcast =
  | { kind: 'notification'; payload: NotificationItem }
  | { kind: 'read'; id: string; unreadCount: number }
  | { kind: 'read-all'; unreadCount: number }

export const NOTIFICATION_CHANNEL_NAME = 'nexus-notifications'

/** 断线重连：1s 起步，×2 指数退避，封顶 30s，再乘 jitter */
const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000

/** 拉取通知列表的页大小（铃铛取前 10 条展示，与中心页共用 20） */
const LIST_PAGE_SIZE = 20

/** WS 推送消息体（服务端 → 客户端） */
/** 服务端推送消息体（SSE `data:` 行内容） */
interface PushMessage {
  type: 'notification'
  payload: NotificationItem
}

/**
 * 实时通知流地址：**同源 SSE**（`GET /api/v1/notifications/stream`）。
 *
 * 为什么不用 WebSocket：生产前端经 Netlify 反代访问同源 `/api/*`，Netlify 会把
 * `Upgrade`/`Connection` 这类 hop-by-hop 头吃掉，升级请求到不了 Worker（DO 恒 404）；
 * 直连 Worker 域的 WS 又受用户侧网络影响。SSE 只是普通 HTTP 响应流，经任何反代
 * 都能过，且同源请求自带会话 Cookie（`withCredentials`）。
 */
function streamUrl(): string {
  const base = API_BASE_URL.startsWith('http') ? API_BASE_URL : window.location.origin
  return `${base}/api/v1/notifications/stream`
}

export const useNotificationsStore = defineStore('notifications', () => {
  // ---------- 对外状态 ----------
  /** 当前列表：铃铛下拉（前 10 条）与通知中心分页共用（REST 分页整体替换，权威） */
  const list = ref<NotificationItem[]>([])
  const unreadCount = ref(0)
  const total = ref(0)
  /** 连接状态：connecting/open/closed/reconnecting（实时通道 = SSE） */
  const connectionState = ref<'connecting' | 'open' | 'closed' | 'reconnecting'>('closed')
  /** 列表加载态（铃铛/中心页共用：reconcile 与 fetchList 置位） */
  const listLoading = ref(false)
  const listError = ref(false)

  // ---------- 内部连接句柄（不进入持久化/序列化） ----------
  let eventSource: EventSource | null = null
  /** 连接代际：connect()/disconnect() 递增；一切异步回调（onopen/onerror/重连定时器）先比对，不匹配即丢弃 */
  let generation = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0
  let channel: BroadcastChannel | null = null

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function ensureChannel(): BroadcastChannel | null {
    if (channel) return channel
    if (typeof BroadcastChannel === 'undefined') return null // 老环境降级：仅本标签页实时
    try {
      channel = new BroadcastChannel(NOTIFICATION_CHANNEL_NAME)
      channel.onmessage = (ev: MessageEvent) => {
        const msg = ev.data as NotificationBroadcast | null
        if (!msg || typeof msg !== 'object') return
        // 其他标签页的通知/已读事件 → 更新本地状态（propagate=false 防广播回环）
        if (msg.kind === 'notification') {
          applyIncoming(msg.payload, false)
        } else if (msg.kind === 'read' && typeof msg.unreadCount === 'number') {
          unreadCount.value = msg.unreadCount
          list.value = list.value.map((n) =>
            n.id === msg.id && !n.readAt ? { ...n, readAt: Date.now() } : n,
          )
        } else if (msg.kind === 'read-all' && typeof msg.unreadCount === 'number') {
          unreadCount.value = msg.unreadCount
          const now = Date.now()
          list.value = list.value.map((n) => (n.readAt ? n : { ...n, readAt: now }))
        }
      }
      return channel
    } catch {
      return null
    }
  }

  function broadcast(msg: NotificationBroadcast) {
    const ch = ensureChannel()
    try {
      ch?.postMessage(msg)
    } catch {
      /* 广播失败不影响本页 */
    }
  }

  /** 按 id 去重（保留首个出现位置） */
  function dedupe(items: NotificationItem[]): NotificationItem[] {
    const seen = new Set<string>()
    const out: NotificationItem[] = []
    for (const n of items) {
      if (seen.has(n.id)) continue
      seen.add(n.id)
      out.push(n)
    }
    return out
  }

  /**
   * WS 推送 / 跨标签页广播共用的入列逻辑：
   * 按 payload.id 去重后头插，未读通知 unreadCount++；propagate=true 时再广播给其他标签页。
   */
  function applyIncoming(payload: NotificationItem, propagate: boolean) {
    if (!payload || typeof payload.id !== 'string') return
    if (list.value.some((n) => n.id === payload.id)) return // 去重：已存在直接丢弃
    list.value = [payload, ...list.value]
    total.value += 1
    if (!payload.readAt) unreadCount.value += 1
    if (propagate) broadcast({ kind: 'notification', payload })
  }

  // ---------- SSE 生命周期 ----------

  /** 登录态建立后调用（auth store 接线点）；重复调用幂等：已连接/连接中直接返回 */
  function connect() {
    if (eventSource && eventSource.readyState !== EventSource.CLOSED) return
    clearReconnectTimer()
    const gen = ++generation
    connectionState.value = 'connecting'
    ensureChannel()

    let source: EventSource
    try {
      source = new EventSource(streamUrl(), { withCredentials: true })
    } catch {
      scheduleReconnect(gen)
      return
    }
    eventSource = source

    source.onopen = () => {
      if (gen !== generation) return // 旧代际迟到回调，丢弃
      reconnectAttempt = 0
      connectionState.value = 'open'
      // 建连/重连成功一律 reconcile：REST 权威覆盖本地（并发拉 unread-count + 第一页）
      void reconcile()
    }

    source.onmessage = (ev: MessageEvent) => {
      if (gen !== generation) return
      try {
        const msg = JSON.parse(String(ev.data)) as PushMessage
        if (msg?.type === 'notification') applyIncoming(msg.payload, true)
      } catch {
        /* 非 JSON（心跳等）忽略 */
      }
    }

    source.onerror = () => {
      if (gen !== generation) return
      connectionState.value = 'reconnecting'
      // EventSource 自身会重连；只有被彻底关闭（4xx/5xx 等）才由我们按退避重建，
      // 避免与浏览器内置重连打架。
      if (eventSource?.readyState === EventSource.CLOSED) scheduleReconnect(gen)
    }
  }

  /** 指数退避重连：1s 起 ×2、max 30s、×random(0.8,1.2) jitter；到点后再比对代际 */
  function scheduleReconnect(gen: number) {
    if (gen !== generation) return
    closeEventSource()
    connectionState.value = 'reconnecting'
    const backoff = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS)
    const delay = backoff * (0.8 + Math.random() * 0.4)
    reconnectAttempt++
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (gen !== generation) return
      connect()
    }, delay)
  }

  /** 关闭 SSE 并清空回调（登出 / 重建连接前调用） */
  function closeEventSource() {
    if (!eventSource) return
    eventSource.onopen = eventSource.onmessage = eventSource.onerror = null
    try {
      eventSource.close()
    } catch {
      /* 已关闭忽略 */
    }
    eventSource = null
  }

  /** 登出/会话失效时调用：关闭 SSE、停掉重连定时器并使所有旧回调失效（代际递增） */
  function disconnect() {
    generation++
    clearReconnectTimer()
    reconnectAttempt = 0
    closeEventSource()
    connectionState.value = 'closed'
  }

  // ---------- REST（权威） ----------

  /**
   * 对账：并发拉 unread-count + 第一页列表整体替换。
   * 建连/重连成功（onopen）时调用；REST 结果权威，直接覆盖本地实时累积的状态。
   */
  async function reconcile() {
    listLoading.value = true
    listError.value = false
    try {
      const [count, page1] = await Promise.all([
        api.get<UnreadCountResult>('/notifications/unread-count'),
        api.get<Paged<NotificationItem>>(`/notifications?page=1&limit=${LIST_PAGE_SIZE}`),
      ])
      unreadCount.value = typeof count?.count === 'number' ? count.count : 0
      const paged = normalizePaged<NotificationItem>(page1)
      list.value = dedupe(paged.items)
      total.value = paged.total ?? paged.items.length
    } catch {
      listError.value = true // 静默失败：UI 展示错误态，可由 fetchList 重试
    } finally {
      listLoading.value = false
    }
  }

  /** 中心页分页拉取：REST 结果整体替换当前列表（权威）。由页面显式调用 */
  async function fetchList(page: number, limit = LIST_PAGE_SIZE) {
    listLoading.value = true
    listError.value = false
    try {
      const data = await api.get<Paged<NotificationItem>>(
        `/notifications?page=${page}&limit=${limit}`,
      )
      const paged = normalizePaged<NotificationItem>(data)
      list.value = paged.items
      total.value = paged.total ?? paged.items.length
    } catch (e) {
      listError.value = true
      throw e
    } finally {
      listLoading.value = false
    }
  }

  /**
   * 标记单条已读：服务端 unreadCount 权威直接覆盖本地；list 中该条 readAt 置值；广播其他标签页。
   */
  async function markRead(id: string) {
    const res = await api.post<MarkReadResult>(`/notifications/${id}/read`)
    if (typeof res?.unreadCount === 'number') unreadCount.value = res.unreadCount
    list.value = list.value.map((n) =>
      n.id === id && !n.readAt ? { ...n, readAt: Date.now() } : n,
    )
    broadcast({ kind: 'read', id, unreadCount: unreadCount.value })
  }

  /** 全部已读：同 markRead 的权威覆盖 + 全量置已读 + 广播 */
  async function markAllRead() {
    const res = await api.post<MarkReadResult>('/notifications/read-all')
    if (typeof res?.unreadCount === 'number') unreadCount.value = res.unreadCount
    const now = Date.now()
    list.value = list.value.map((n) => (n.readAt ? n : { ...n, readAt: now }))
    broadcast({ kind: 'read-all', unreadCount: unreadCount.value })
  }

  // ---------- 管理端发布（mirror nexus store 的 admin 动作组织） ----------

  /**
   * 发布站内通知（POST /admin/notifications）。
   * 403 FORBIDDEN / 400 VALIDATION_ERROR（title 1-120、body ≤2000、link 仅站内路径）由调用方按 AppError 呈现。
   */
  async function adminSend(input: AdminNotificationInput): Promise<number> {
    const res = await api.post<AdminNotificationResult>('/admin/notifications', input)
    return typeof res?.count === 'number' ? res.count : 0
  }

  /**
   * 管理端·已发布公告批次列表（GET /admin/notifications/sent，limit 一次拉满后端上限）。
   * 批次数量级小（每条 = 一次发布动作），故一次拉满不分页。
   */
  async function adminListSent(limit = 100): Promise<SentNotificationBatch[]> {
    const res = await api.get<{ items: SentNotificationBatch[] }>(
      `/admin/notifications/sent?limit=${limit}`,
    )
    return res?.items ?? []
  }

  /**
   * 管理端·删除一批已发布公告（DELETE，body=批次选择器；幂等空删 deleted=0）。
   * selector 四字段与后端聚合口径一致（createdAt/type/title/createdBy 唯一定位一个批次）。
   */
  async function adminDeleteSent(selector: SentNotificationSelector): Promise<number> {
    const res = await api.delete<DeleteSentNotificationsResult>('/admin/notifications/sent', {
      data: selector,
    })
    return typeof res?.deleted === 'number' ? res.deleted : 0
  }

  return {
    list,
    unreadCount,
    total,
    connectionState,
    listLoading,
    listError,
    connect,
    disconnect,
    reconcile,
    fetchList,
    markRead,
    markAllRead,
    adminSend,
    adminListSent,
    adminDeleteSent,
  }
})
