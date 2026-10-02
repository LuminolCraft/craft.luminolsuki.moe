/**
 * useCustomCursor — Technical HUD 风格自绘光标
 *
 * 组成只有两层：
 * - 中心点（1:1 跟手）：标出真实点击位置。
 * - 追踪环（quickTo 轻微延迟）：制造跟随惯性；指针压在链接 / 按钮 / 拖拽区上时放大。
 *
 * 刻意**不做**「跟随元素四角的框」：那种框挂在 fixed 层上、位置由命中瞬间的 rect 算出，
 * 页面一滚动它就和元素脱开，观感像坏掉的贴纸。元素的定格框由 MagneticCornerFrame /
 * useUiFx 长在元素自己身上（在页面 DOM 内，天然随滚动）。
 *
 * 实现要点：
 * - 只有一个 window pointermove 监听；位置更新交给 gsap.quickTo。
 * - 命中检测（elementFromPoint）限制在 100ms 一次，且合并到一帧里执行。
 * - 自绘元素 `pointer-events: none`，命中点仍然精确。
 * - 粗指针 / prefers-reduced-motion：完全不启用，系统光标原样保留。
 */
import { onUnmounted, ref } from 'vue'
import gsap from 'gsap'
import { EASINGS } from '@/gsap/config/easings'

const HIT_TEST_INTERVAL = 100
const DOT_FOLLOW = 0.06
const RING_FOLLOW = 0.34

/**
 * 是否已启用自绘光标。全局标记：页面用它决定要不要写 `cursor: none`，
 * 避免「光标层没起来、系统光标却已经被隐藏」的空白期。
 */
export const customCursorEnabled = ref(false)

export interface CustomCursorOptions {
  /** 中心点跟随时长（秒） */
  dotDuration?: number
  /** 追踪环跟随时长（秒） */
  ringDuration?: number
}

export interface CustomCursorElements {
  dot: HTMLElement | null
  ring: HTMLElement | null
}

export function supportsCustomCursor(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  if (window.matchMedia('(pointer: coarse)').matches) return false
  if (window.matchMedia('(hover: none)').matches) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return true
}

export function useCustomCursor(options: CustomCursorOptions = {}) {
  const active = ref(false)
  const hovering = ref(false)
  const dragging = ref(false)

  let ctx: gsap.Context | null = null
  let dot: HTMLElement | null = null
  let ring: HTMLElement | null = null

  let setDotX: ((v: number) => void) | null = null
  let setDotY: ((v: number) => void) | null = null
  let setRingX: ((v: number) => void) | null = null
  let setRingY: ((v: number) => void) | null = null

  let lastHitTest = 0
  let raf = 0
  let queued = false
  let pointerX = 0
  let pointerY = 0
  let moved = false

  /**
   * 命中检测只更新两个状态标记，外观交给 CSS（见 CursorLayer.vue）：
   * 尺寸、配色、缩放都是 CSS 变量，JS 不参与补间，主题切换也不会留下旧色。
   */
  function hitTest(): void {
    const el = document.elementFromPoint(pointerX, pointerY)
    if (!el) return

    const nextDragging = Boolean(el.closest('[data-drag]'))
    const nextHovering = Boolean(
      el.closest('[data-cursor-hover], a, button, [role="button"], [data-drag]'),
    )

    if (nextDragging !== dragging.value) dragging.value = nextDragging
    if (nextHovering !== hovering.value) hovering.value = nextHovering
  }

  function onMove(event: PointerEvent): void {
    pointerX = event.clientX
    pointerY = event.clientY

    if (!moved) {
      moved = true
      // 第一次移动才显示，避免页面加载时在左上角闪一下
      gsap.set([dot, ring].filter(Boolean), { autoAlpha: 0 })
      gsap.to([dot, ring].filter(Boolean), { autoAlpha: 1, duration: 0.2 })
      setDotX?.(pointerX)
      setDotY?.(pointerY)
      setRingX?.(pointerX)
      setRingY?.(pointerY)
    }

    setDotX?.(pointerX)
    setDotY?.(pointerY)
    setRingX?.(pointerX)
    setRingY?.(pointerY)

    const now = performance.now()
    if (now - lastHitTest < HIT_TEST_INTERVAL) return
    lastHitTest = now
    if (queued) return
    queued = true
    raf = requestAnimationFrame(() => {
      queued = false
      hitTest()
    })
  }

  function onLeaveWindow(): void {
    gsap.to([dot, ring].filter(Boolean), { autoAlpha: 0, duration: 0.2 })
    moved = false
  }

  /** 绑定：传入根容器与点 / 环两个元素 */
  function bind(container: HTMLElement, els: CustomCursorElements): void {
    if (!supportsCustomCursor()) return
    destroy()

    dot = els.dot
    ring = els.ring
    if (!dot || !ring) return

    active.value = true
    customCursorEnabled.value = true
    // 全站隐藏系统光标：门禁写在 <html> 上，样式在 CursorLayer.vue 的全局块里
    document.documentElement.setAttribute('data-custom-cursor', 'on')

    ctx = gsap.context(() => {
      setDotX = gsap.quickTo(dot, 'x', {
        duration: options.dotDuration ?? DOT_FOLLOW,
        ease: 'power2.out',
      }) as unknown as (v: number) => void
      setDotY = gsap.quickTo(dot, 'y', {
        duration: options.dotDuration ?? DOT_FOLLOW,
        ease: 'power2.out',
      }) as unknown as (v: number) => void
      setRingX = gsap.quickTo(ring, 'x', {
        duration: options.ringDuration ?? RING_FOLLOW,
        ease: EASINGS.snappy,
      }) as unknown as (v: number) => void
      setRingY = gsap.quickTo(ring, 'y', {
        duration: options.ringDuration ?? RING_FOLLOW,
        ease: EASINGS.snappy,
      }) as unknown as (v: number) => void
    }, container)

    // 点 / 环都用居中定位（translate -50%）
    gsap.set([dot, ring], { autoAlpha: 0, xPercent: -50, yPercent: -50 })

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeaveWindow)
  }

  function destroy(): void {
    window.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerleave', onLeaveWindow)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    queued = false
    moved = false
    hovering.value = false
    dragging.value = false
    active.value = false
    customCursorEnabled.value = false
    document.documentElement.removeAttribute('data-custom-cursor')
    setDotX = null
    setDotY = null
    setRingX = null
    setRingY = null
    ctx?.revert()
    ctx = null
    dot = null
    ring = null
  }

  onUnmounted(() => {
    destroy()
  })

  return { active, hovering, dragging, bind, destroy }
}
