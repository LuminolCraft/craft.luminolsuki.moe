import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { API_BASE_URL } from '@/lib/api-base'
import { normalizePaged } from '@/lib/paged'
import type { Paged } from '@/types/nexus'
import type {
  AdminNotificationInput,
  AdminNotificationResult,
  MarkReadResult,
  NotificationItem,
  UnreadCountResult,
} from '@/types/notification'

/**
 * 站内通知 store —— 通知域唯一状态入口（组件零网络逻辑）。
 *
 * 数据面：
 * - WS（/api/v1/notifications/ws，同源 Cookie）实时推送 + 指数退避重连（1s 起 ×2、max 30s、jitter 0.8~1.2）
 * - REST 权威：unread-count / 列表分页 / 已读回执的 unreadCount 直接覆盖本地
 * - BroadcastChannel（'nexus-notifications'）跨标签页同步推送与已读状态
 *
 * 生命周期：登录后由 auth store 调 connect()（fetchCurrentUser 成功且登录态建立的转移点），
 * 登出/会话失效由 clearAuthState() 调 disconnect()。未登录不建连。
 * generation 计数防止旧 socket 复活：每次 connect/disconnect 递增，一切异步回调先比对。
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
interface WsNotificationMessage {
  type: 'notification'
  payload: NotificationItem
}

/** 从 API 基地址推导 WS 地址：生产=同源（契约写法），dev=直连后端端口（:8787） */
function buildWsUrl(): string {
  const base = API_BASE_URL.startsWith('http') ? API_BASE_URL : window.location.origin
  return `${base.replace(/^http/, 'ws')}/api/v1/notifications/ws`
}

export const useNotificationsStore = defineStore('notifications', () => {
  // ---------- 对外状态 ----------
  /** 当前列表：铃铛下拉（前 10 条）与通知中心分页共用（REST 分页整体替换，权威） */
  const list = ref<NotificationItem[]>([])
  const unreadCount = ref(0)
  const total = ref(0)
  /** WS 连接状态：connecting/open/closed/reconnecting */
  const connectionState = ref<'connecting' | 'open' | 'closed' | 'reconnecting'>('closed')
  /** 列表加载态（铃铛/中心页共用：reconcile 与 fetchList 置位） */
  const listLoading = ref(false)
  const listError = ref(false)

  // ---------- 内部连接句柄（不进入持久化/序列化） ----------
  let ws: WebSocket | null = null
  /** 连接代际：connect()/disconnect() 递增；一切异步回调（onopen/onclose/重连定时器）先比对，不匹配即丢弃 */
  let generation = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0
  /** 应用层保活：每 30s 发 "ping"（服务端自动回 "pong"），防中间层掐空闲连接 */
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let channel: BroadcastChannel | null = null

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function clearPingTimer() {
    if (pingTimer !== null) {
      clearInterval(pingTimer)
      pingTimer = null
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

  // ---------- WS 生命周期 ----------

  /** 登录态建立后调用（auth store 接线点）；重复调用幂等：连接中/已连接直接返回 */
  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    clearReconnectTimer()
    const gen = ++generation
    connectionState.value = 'connecting'
    ensureChannel()
    try {
      ws = new WebSocket(buildWsUrl())
    } catch {
      scheduleReconnect(gen)
      return
    }

    ws.onopen = () => {
      if (gen !== generation) return // 旧代际迟到回调，丢弃
      reconnectAttempt = 0
      connectionState.value = 'open'
      // 应用层保活：每 30s 发 "ping"，服务端自动回 "pong"
      clearPingTimer()
      pingTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN && gen === generation) {
          try {
            ws.send('ping')
          } catch {
            /* 发送失败交由 onclose 处理重连 */
          }
        }
      }, 30000)
      // 建连/重连成功一律 reconcile：REST 权威覆盖本地（并发拉 unread-count + 第一页）
      void reconcile()
    }

    ws.onmessage = (ev: MessageEvent) => {
      if (gen !== generation) return
      if (ev.data === 'pong') return // 保活回包
      try {
        const msg = JSON.parse(String(ev.data)) as WsNotificationMessage
        if (msg?.type === 'notification') applyIncoming(msg.payload, true)
      } catch {
        /* 非 JSON 消息忽略 */
      }
    }

    ws.onerror = () => {
      /* 错误后必然伴随 close，统一由 onclose 走重连，避免双触发 */
    }

    ws.onclose = () => {
      if (gen !== generation) return
      scheduleReconnect(gen)
    }
  }

  /** 指数退避重连：1s 起 ×2、max 30s、×random(0.8,1.2) jitter；到点后再比对代际 */
  function scheduleReconnect(gen: number) {
    if (gen !== generation) return
    clearPingTimer()
    ws = null
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

  /** 登出/会话失效时调用：断开 WS、停掉重连定时器与保活并使所有旧回调失效（代际递增） */
  function disconnect() {
    generation++
    clearReconnectTimer()
    clearPingTimer()
    reconnectAttempt = 0
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null
      try {
        ws.close()
      } catch {
        /* 已关闭/关闭中忽略 */
      }
      ws = null
    }
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
  }
})
