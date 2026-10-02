/**
 * useServerStatus —— 服务器在线状态与在线人数
 *
 * 数据源：mcstatus.io 公开 API（用户浏览器直连，不经后端）。
 * 行为：每 30 秒轮询一次；单次请求 8 秒超时；失败或超时按「离线」处理。
 *
 * 返回：
 * - loading       首次请求是否仍在进行
 * - online        data.online === true
 * - playersOnline / playersMax  来自 data.players
 * - playersLabel  "9/50"，数据不可用时为 "N/A"
 * - statusLabel   在线 / 服务器离线
 */
import { computed, onUnmounted, ref } from 'vue'

/** 服务器地址与查询端点（Java 版状态查询） */
export const SERVER_ADDRESS = 'craft.luminolsuki.moe'
const STATUS_ENDPOINT = `https://api.mcstatus.io/v2/status/java/${SERVER_ADDRESS}`

/** 轮询间隔与单次请求超时（毫秒） */
const POLL_INTERVAL = 30_000
const REQUEST_TIMEOUT = 8_000

/** 数据不可用时展示的占位文案 */
const PLAYERS_UNAVAILABLE = 'N/A'
const STATUS_OFFLINE = '服务器离线'
const STATUS_ONLINE = '在线'

interface McStatusResponse {
  online?: boolean
  players?: {
    online?: number
    max?: number
  }
}

export function useServerStatus() {
  const loading = ref(true)
  const online = ref(false)
  const playersOnline = ref<number | null>(null)
  const playersMax = ref<number | null>(null)

  let timer: number | null = null

  /** 是否已经有可用结果：只用它决定文字是数字还是占位符 */
  const hasPlayers = computed(
    () => playersOnline.value !== null && playersMax.value !== null && online.value,
  )

  const playersLabel = computed(() =>
    hasPlayers.value ? `${playersOnline.value}/${playersMax.value}` : PLAYERS_UNAVAILABLE,
  )

  const statusLabel = computed(() => (online.value ? STATUS_ONLINE : STATUS_OFFLINE))

  async function fetchStatus(): Promise<void> {
    try {
      const response = await fetch(STATUS_ENDPOINT, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = (await response.json()) as McStatusResponse
      online.value = data.online === true

      const current = data.players?.online
      const max = data.players?.max
      // 只有在线且字段是数字时才采用，否则退回占位符
      if (online.value && typeof current === 'number' && typeof max === 'number') {
        playersOnline.value = current
        playersMax.value = max
      } else {
        playersOnline.value = null
        playersMax.value = null
      }
    } catch {
      // 网络错误、超时、非 2xx、JSON 解析失败统一按离线处理
      online.value = false
      playersOnline.value = null
      playersMax.value = null
    } finally {
      loading.value = false
    }
  }

  function start(): void {
    if (timer !== null) return
    void fetchStatus()
    timer = window.setInterval(() => void fetchStatus(), POLL_INTERVAL)
  }

  function stop(): void {
    if (timer === null) return
    window.clearInterval(timer)
    timer = null
  }

  onUnmounted(stop)

  return {
    loading,
    online,
    playersOnline,
    playersMax,
    playersLabel,
    statusLabel,
    /** 由使用方在挂载时调用，便于与页面自身的生命周期对齐 */
    start,
    stop,
  }
}
