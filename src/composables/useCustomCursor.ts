/**
 * useCustomCursor — Technical HUD 光标
 *
 * 目标：让光标与 Magnetic Corner Brackets 说同一种语言——细线、直角、精准、克制。
 * 不用 CSS `cursor: url(...)` 换图片（那套有 32px 尺寸上限、热点坐标、失败静默忽略等坑），
 * 改用「隐藏系统光标 + 一个 pointer-events: none 的定位元素」：命中点仍然精确，
 * 也不会有图片加载失败导致光标悄悄变回箭头的问题。
 *
 * 结构：
 * - 中心点（紧跟指针，1:1）：告知真实点击位置。
 * - 追踪环（quickTo 轻微延迟）：制造跟随感与惯性。
 * - 四个小角标：指针经过可交互元素（链接 / 按钮 / [data-cursor-hover]）时展开；
 *   经过 [data-drag] 区域时展开得更大。
 *
 * 性能：只有一个 window pointermove 监听；位置更新交给 quickTo；
 * 命中检测用 elementFromPoint 且限制在 100ms 一次；所有元素 pointer-events: none。
 *
 * 降级：粗指针 / prefers-reduced-motion → 完全不启用，系统光标原样保留。
 */
import { onUnmounted, ref } from 'vue'
import gsap from 'gsap'
import { EASINGS } from '@/gsap/config/easings'

const HIT_TEST_INTERVAL = 100
const DOT_FOLLOW = 0.06
const RING_FOLLOW = 0.34

/**
 * 是否已启用自定义光标。全局标记：Home.vue 用它决定要不要在根容器上写 `cursor: none`，
 * 避免「光标图层没起来、系统光标却已经被隐藏」的空白期。
 */
export const customCursorEnabled = ref(false)

export interface CustomCursorOptions {
  /** 中心点跟随时长（秒） */
  dotDuration?: number
  /** 追踪环跟随时长（秒） */
  ringDuration?: number
  /**
   * 有元素角标框时是否把四角让给它。
   * true = 指针压在 [data-mcf] 元素上时隐藏光标四角（推荐：同一时间只出现一个框）
   */
  yieldToFrames?: boolean
  /** 四角对齐到目标 rect 的跟随时长（秒） */
  bracketDuration?: number
}

/** 命中测试结果：只有 target 有值时光标四角才出现 */
export interface CursorTarget {
  kind: 'frame' | 'drag'
  rect: DOMRect
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
  let root: HTMLElement | null = null
  let dot: HTMLElement | null = null
  let ring: HTMLElement | null = null
  let brackets: HTMLElement | null = null

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
  let setBracketLeft: ((v: number) => void) | null = null
  let setBracketTop: ((v: number) => void) | null = null
  let setBracketWidth: ((v: number) => void) | null = null
  let setBracketHeight: ((v: number) => void) | null = null
  let bracketVisible = false
  let lastTarget: CursorTarget | null = null

  const yieldToFrames = options.yieldToFrames ?? true
  const bracketDuration = options.bracketDuration ?? 0.3

  function hitTest(): CursorTarget | null {
    if (!dot) return null
    const el = document.elementFromPoint(pointerX, pointerY)
    if (!el) return null

    // 元素角标框优先：让它的四角负责表现「锁定」，光标四角让位
    const frameEl = el.closest<HTMLElement>('[data-mcf]')
    if (frameEl && yieldToFrames) {
      dragging.value = false
      hovering.value = true
      return { kind: 'frame', rect: frameEl.getBoundingClientRect() }
    }

    const dragZone = el.closest<HTMLElement>('[data-drag]')
    if (dragZone) {
      dragging.value = true
      hovering.value = true
      return { kind: 'drag', rect: dragZone.getBoundingClientRect() }
    }

    const interactive = el.closest(
      '[data-cursor-hover], a, button, [role="button"], input, textarea, select',
    )
    dragging.value = false
    hovering.value = Boolean(interactive)
    return null
  }

  /** 把四角贴到目标 rect 上（视角 rect，用 transform 定位，避免读 layout） */
  function syncBrackets(target: CursorTarget | null): void {
    if (!brackets) return
    if (!target) {
      if (bracketVisible) {
        bracketVisible = false
        gsap.to(brackets, { autoAlpha: 0, duration: 0.22, ease: EASINGS.hover, overwrite: 'auto' })
      }
      return
    }

    const { left, top, width, height } = target.rect
    if (!bracketVisible) {
      bracketVisible = true
      gsap.set(brackets, { x: left, y: top, width, height })
      gsap.to(brackets, { autoAlpha: 1, duration: 0.26, ease: EASINGS.hover, overwrite: 'auto' })
      return
    }

    setBracketLeft?.(left)
    setBracketTop?.(top)
    setBracketWidth?.(width)
    setBracketHeight?.(height)
  }

  function applyState(): void {
    if (!brackets) return
    const mode = dragging.value ? 'drag' : hovering.value ? 'hover' : 'idle'
    if (ring) {
      gsap.to(ring, {
        scale: mode === 'idle' ? 1 : 1.22,
        opacity: mode === 'idle' ? 0.55 : 0.85,
        duration: 0.32,
        ease: EASINGS.hover,
        overwrite: 'auto',
      })
    }
  }

  function onMove(event: PointerEvent): void {
    pointerX = event.clientX
    pointerY = event.clientY
    // 已经对齐到某个元素时，跟随时同步刷新它的 rect（元素可能在被拖动/滚动）
    if (bracketVisible && lastTarget?.kind === 'frame') {
      const frameEl = document
        .elementFromPoint(pointerX, pointerY)
        ?.closest<HTMLElement>('[data-mcf]')
      if (frameEl) lastTarget = { kind: 'frame', rect: frameEl.getBoundingClientRect() }
    }

    if (!moved) {
      moved = true
      // 第一次移动才显示，避免页面加载时在左上角闪一下
      gsap.set([dot, ring, brackets].filter(Boolean), { autoAlpha: 0 })
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
      const target = hitTest()
      lastTarget = target
      syncBrackets(target)
      applyState()
    })
  }

  function onLeaveWindow(): void {
    gsap.to([dot, ring].filter(Boolean), { autoAlpha: 0, duration: 0.2 })
    if (brackets) gsap.to(brackets, { autoAlpha: 0, duration: 0.2 })
    bracketVisible = false
    moved = false
  }

  function onDragStart(): void {
    dragging.value = true
    applyState()
  }

  function onDragEnd(): void {
    dragging.value = false
    applyState()
  }

  /** 绑定：传入根容器与三个光标元素 */
  function bind(
    container: HTMLElement,
    els: { dot: HTMLElement | null; ring: HTMLElement | null; brackets: HTMLElement | null },
  ): void {
    if (!supportsCustomCursor()) return
    destroy()

    root = container
    dot = els.dot
    ring = els.ring
    brackets = els.brackets
    if (!dot || !ring || !brackets) return

    active.value = true
    customCursorEnabled.value = true

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

      // 四角按目标 rect 走：left/top/width/height 各自 quickTo，尺寸随元素变化
      setBracketLeft = gsap.quickTo(brackets, 'x', {
        duration: bracketDuration,
        ease: EASINGS.snappy,
      }) as unknown as (v: number) => void
      setBracketTop = gsap.quickTo(brackets, 'y', {
        duration: bracketDuration,
        ease: EASINGS.snappy,
      }) as unknown as (v: number) => void
      setBracketWidth = gsap.quickTo(brackets, 'width', {
        duration: bracketDuration,
        ease: EASINGS.snappy,
      }) as unknown as (v: number) => void
      setBracketHeight = gsap.quickTo(brackets, 'height', {
        duration: bracketDuration,
        ease: EASINGS.snappy,
      }) as unknown as (v: number) => void
    }, root)

    // 四角层改成「对齐目标 rect」，不再用居中定位
    gsap.set([dot, ring], { autoAlpha: 0, xPercent: -50, yPercent: -50 })
    gsap.set(brackets, { autoAlpha: 0, xPercent: 0, yPercent: 0, width: 0, height: 0 })
    bracketVisible = false

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDragStart, { passive: true })
    window.addEventListener('pointerup', onDragEnd, { passive: true })
    document.addEventListener('pointerleave', onLeaveWindow)
  }

  function destroy(): void {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDragStart)
    window.removeEventListener('pointerup', onDragEnd)
    document.removeEventListener('pointerleave', onLeaveWindow)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    queued = false
    moved = false
    hovering.value = false
    dragging.value = false
    active.value = false
    customCursorEnabled.value = false
    setDotX = null
    setDotY = null
    setRingX = null
    setRingY = null
    setBracketLeft = null
    setBracketTop = null
    setBracketWidth = null
    setBracketHeight = null
    lastTarget = null
    bracketVisible = false
    ctx?.revert()
    ctx = null
    root = null
  }

  onUnmounted(() => {
    destroy()
  })

  return { active, hovering, dragging, bind, destroy }
}
