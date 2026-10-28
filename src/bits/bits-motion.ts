/**
 * bits-motion —— 动效预算与「该不该跑特效」的响应式判定
 *
 * 两个必须分开的概念：
 * 1. `mode`    —— 这个特效源该不该跑（live / static / off）
 * 2. `quality` —— 跑的话用什么画质档（high / low）
 *
 * ⚠️ 判定必须是**响应式**的。`prefers-reduced-motion` 是用户随时可切的系统设置，
 * 视口宽度也会因为分屏 / DevTools / 横竖屏变化。写成纯函数（或 computed 内部调用
 * 一个读 `innerWidth` 的同步函数）会被永久缓存，表现为「打开减少动态效果后页面照样满屏动」。
 * 所以这里只认三个 matchMedia 驱动的 ref，并且**不调用** `isLowEndDevice()`
 * （它内部读了 `innerWidth < 900`，会把宽度判定一起冻住）。
 *
 * 降级矩阵（冻结版）：
 * | 条件 | 结果 |
 * | RM | static（pointer → off） |
 * | 无 WebGL | static |
 * | `saveData`（用户明确省流量） | static |
 * | 窄屏 < 900 | static（移动端 0 canvas） |
 * | 桌面低端硬件 | **live + quality low**（不砍构图，只降 dpr） |
 * | 其余 | live + quality high |
 */
import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from 'vue'
import { isCoarsePointer, prefersReducedMotion, supportsWebGL } from '@/components/home/fx/home-fx-env'

/**
 * 一屏动效预算（设计预算，按并发公式估算得出，不是运行时实测值 —— 不要拿它做断言）。
 *
 * 自查公式：并发峰值 ≈ tween.duration() / staggerEach（上限 = 元素总数）。
 * 例：Hero 逐字 0.6s / 0.03s = 20，但只有 15 个字 → 15。
 */
export const MOTION_BUDGET = {
  /** 同屏可见的动效源上限 */
  maxSourcesVisible: 3,
  /** 同屏可见的被动画元素上限（整页峰值：首屏 20 为最高） */
  maxElementsVisible: 24,
  /** 首屏允许参与入场动画的元素上限（15 字 + rule + sub + 2 按钮） */
  maxElementsFirstPaint: 20,
  /** 单个区块入场动画的总时长上限（ms） */
  maxBlockEnterMs: 1100,
  /** 滚动钉住的屏数上限 */
  maxPinScreens: 3,
  /** 背景漂移速度上限（px/s），超过会明显抢注意力 */
  maxDriftPxPerSec: 12,
} as const

export type FxMode = 'live' | 'static' | 'off'
export type FxKind = 'webgl' | 'pointer' | 'css3d'
export type FxQuality = 'high' | 'low'

/** LCP 兜底超时（ms）：等不到 LCP 就当作已完成，不能让首屏一直等 */
const LCP_FALLBACK_MS = 500
/** narrow 变化的沉淀时间（ms）：拖窗口跨 900px 会连续触发，避免反复重建 context */
const NARROW_SETTLE_MS = 300

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

/** 静态硬件判定（一次性）：不含 innerWidth，也不含 saveData */
function isLowEndHardware(): boolean {
  if (typeof navigator === 'undefined') return true
  const nav = navigator as NavigatorWithHints
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return true
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return true
  return false
}

/** 用户明确要求省流量 → 直接 static（不能只在 low 档里降质量） */
function prefersSaveData(): boolean {
  if (typeof navigator === 'undefined') return false
  return Boolean((navigator as NavigatorWithHints).connection?.saveData)
}

/* ---------- 模块级单例：整页只挂一套 matchMedia 监听 ---------- */

const reduceMotion = ref(false)
const coarsePointer = ref(false)
/** 原始窄屏状态（变化即触发） */
const narrowRaw = ref(false)
/** 沉淀后的窄屏状态（300ms 后才落），fxMode 读它 */
const narrowSettled = ref(false)

const unbinders: Array<() => void> = []
let bound = false
let settleTimer: number | null = null

function bindMedia(query: string, target: Ref<boolean>, onChange?: (matches: boolean) => void): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  const mq = window.matchMedia(query)
  target.value = mq.matches
  const handler = (event: MediaQueryListEvent): void => {
    target.value = event.matches
    onChange?.(event.matches)
  }
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', handler)
    unbinders.push(() => mq.removeEventListener('change', handler))
  } else if (typeof mq.addListener === 'function') {
    mq.addListener(handler)
    unbinders.push(() => mq.removeListener(handler))
  }
}

function bindAll(): void {
  if (bound) return
  bound = true
  if (typeof window === 'undefined') return

  bindMedia('(prefers-reduced-motion: reduce)', reduceMotion)
  bindMedia('(pointer: coarse)', coarsePointer)
  // 窄屏用 matchMedia，不用 resize 监听（后者每帧都可能触发）
  bindMedia('(max-width: 899.98px)', narrowRaw, (matches) => {
    if (settleTimer !== null) window.clearTimeout(settleTimer)
    settleTimer = window.setTimeout(() => {
      narrowSettled.value = matches
      settleTimer = null
    }, NARROW_SETTLE_MS)
  })

  // 首帧：raw 与 settled 对齐（不经过 settle 延迟）
  narrowSettled.value = narrowRaw.value

  if (typeof import.meta.hot !== 'undefined') {
    import.meta.hot.dispose(() => {
      unbinders.forEach((off) => off())
      unbinders.length = 0
      if (settleTimer !== null) window.clearTimeout(settleTimer)
      settleTimer = null
      bound = false
    })
  }
}

function resolveKind(kind: FxKind | (() => FxKind)): FxKind {
  return typeof kind === 'function' ? kind() : kind
}

/**
 * 同步快照版判定（非响应式）。只在**没有响应式上下文**的地方用（测试、日志），
 * 组件内部一律用 `useFxMode()`。
 */
export function resolveFxMode(kind: FxKind): FxMode {
  bindAll()
  const rm = reduceMotion.value || prefersReducedMotion()
  const coarse = coarsePointer.value || isCoarsePointer()

  if (rm) return kind === 'pointer' ? 'off' : 'static'
  if (kind === 'webgl' && !supportsWebGL()) return 'static'
  if (kind === 'pointer') return coarse ? 'off' : 'live'
  if (kind === 'webgl' && (prefersSaveData() || narrowSettled.value)) return 'static'
  return 'live'
}

/**
 * 响应式判定：RM / 粗指针 / 窄屏（300ms 沉淀）任一变化都会重新求值。
 * 跨模式边界（live ↔ static）允许销毁重建；同模式内的离屏只走 `paused`。
 */
export function useFxMode(kind: FxKind | (() => FxKind) = 'webgl'): ComputedRef<FxMode> {
  bindAll()
  return computed<FxMode>(() => {
    const resolved = resolveKind(kind)
    if (reduceMotion.value) return resolved === 'pointer' ? 'off' : 'static'
    if (resolved === 'webgl' && !supportsWebGL()) return 'static'
    if (resolved === 'pointer') return coarsePointer.value ? 'off' : 'live'
    if (resolved === 'webgl' && (prefersSaveData() || narrowSettled.value)) return 'static'
    return 'live'
  })
}

/**
 * 画质档：低端硬件不砍效果，只降规格（dpr 1）。
 * `narrow` 不进这里 —— 窄屏已经是 `static`，没有 live 档可降。
 */
export function useFxQuality(): ComputedRef<FxQuality> {
  bindAll()
  return computed<FxQuality>(() => (isLowEndHardware() ? 'low' : 'high'))
}

/**
 * 响应式窄屏状态（已过 300ms 沉淀）。
 * 给需要「按宽度换布局」而非「开关特效」的地方用（Gallery 的 wall / rail 两档）。
 */
export function useFxNarrow(): ComputedRef<boolean> {
  bindAll()
  return computed(() => narrowSettled.value)
}

/**
 * LCP 是否已经落地。
 *
 * 用途：Hero 的 WebGL 画布从 opacity 0 淡入时，要等最大内容元素（背景截图）画完再起，
 * 否则画布自己会变成 LCP，把指标推后一个淡入时长。**h1 不参与门控**：
 * h1 是纯文本、没有 decode 成本，藏起来只有坏处。
 *
 * - `buffered: true`：观察器挂上之前就已经 LCP 的页面也能立刻拿到结果
 * - 500ms 兜底：不支持 PerformanceObserver / 没有 LCP 候选时不会卡住首屏
 */
export function useLcpDone(): Ref<boolean> {
  const done = ref(false)

  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    done.value = true
    return done
  }

  let observer: PerformanceObserver | null = null
  let timer: number | null = null

  function cleanup(): void {
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
    observer?.disconnect()
    observer = null
  }

  function finish(): void {
    if (done.value) return
    done.value = true
    cleanup()
  }

  onMounted(() => {
    if (done.value) return
    try {
      observer = new PerformanceObserver((list) => {
        if (list.getEntries().length > 0) finish()
      })
      observer.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      // 不支持 largest-contentful-paint：直接放行
      finish()
      return
    }
    timer = window.setTimeout(finish, LCP_FALLBACK_MS)
  })

  onUnmounted(cleanup)

  return done
}
