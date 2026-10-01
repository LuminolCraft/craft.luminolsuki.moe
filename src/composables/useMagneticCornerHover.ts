/**
 * useMagneticCornerHover — Magnetic Cursor + Corner Brackets
 *
 * 鼠标进入目标元素时，四个 L 形定位角从外侧展开淡入；鼠标在元素内移动时，
 * 四个角参照鼠标位置产生「越靠边吸得越紧」的磁吸位移；离开时平滑收回。
 *
 * 设计取向：Technical HUD 式的克制微交互（Stripe / Apple / Awwwards 那一类），
 * 不是赛博朋克 HUD——被包裹的元素本身绝不位移、不缩放、不加阴影。
 *
 * 实现要点：
 * - 跟随用 gsap.quickTo()，每个角 x/y 各一个（4 角 × 2 轴 = 8 个）；
 *   mousemove 里只写目标值，绝不新建 tween / timeline。
 * - mousemove 用 requestAnimationFrame 合并，同帧内多次移动只计算一次。
 * - 几何量（rect）缓存，只在 mouseenter 与 ResizeObserver 回调里刷新，
 *   移动过程中不读布局，避免强制同步布局。
 * - 所有动画包在 gsap.context()，卸载时 revert()；quickTo 目标元素另行 killTweensOf。
 * - prefers-reduced-motion：角标仍然出现（内容可见优先），但跳过入场位移、
 *   跳过错峰、跳过磁吸跟随（不启动 rAF 循环）。
 * - 粗指针（(pointer: coarse) 或 (hover: none)）：整层角标不启用。
 */
import { onUnmounted } from 'vue'
import gsap from 'gsap'
import { EASINGS } from '@/gsap/config/easings'

/** 四个角的渲染顺序，与 MagneticCornerFrame 的 DOM 顺序一致 */
export const CORNER_KEYS = ['tl', 'tr', 'bl', 'br'] as const
export type CornerKey = (typeof CORNER_KEYS)[number]

/** 入场错峰顺序：左上 → 右下 → 右上 → 左下 */
const ENTER_ORDER: CornerKey[] = ['tl', 'br', 'tr', 'bl']

const ENTER_STAGGER = 0.03
const LEAVE_STAGGER = 0.02
const ENTER_DURATION = 0.45
const LEAVE_DURATION = 0.3
const FOLLOW_DURATION = 0.5
/** 入场起点再往元素外侧退的距离（px） */
const SEED_EXTRA = 12

interface Offset {
  x: number
  y: number
}

interface AxisSetters {
  x: (value: number) => void
  y: (value: number) => void
}

interface Frame {
  el: HTMLElement
  corners: HTMLElement[]
  rect: DOMRect | null
  setters: AxisSetters[]
  resizeObserver: ResizeObserver | null
  pointer: { x: number; y: number }
  active: boolean
  focusActive: boolean
  queued: boolean
  teardown: (() => void) | null
}

export interface MagneticCornerHoverOptions {
  /** 静止时角标相对元素边缘的外扩距离（px） */
  padding?: number
  /** 磁吸位移上限（px） */
  magnetStrength?: number
  /** 边缘加权倍数：越大，鼠标靠边时吸得越紧、居中时越安静 */
  edgeBias?: number
  /** 是否在键盘 focus 时也进入锁定态 */
  activeOnFocus?: boolean
  /** 角标激活色（写进 --corner-accent，由样式读取） */
  accentColor?: string
}

/** 是否应该启用这套交互（粗指针不启用） */
export function supportsMagneticCorner(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  if (window.matchMedia('(pointer: coarse)').matches) return false
  if (window.matchMedia('(hover: none)').matches) return false
  return true
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useMagneticCornerHover(options: MagneticCornerHoverOptions = {}) {
  const padding = options.padding ?? 8
  const magnetStrength = options.magnetStrength ?? 6
  const edgeBias = options.edgeBias ?? 2.2
  const activeOnFocus = options.activeOnFocus ?? true
  const accentColor = options.accentColor ?? ''

  let ctx: gsap.Context | null = null
  let detach: (() => void) | null = null
  let frames: Frame[] = []
  let magnetEnabled = true

  /* ---------- 几何 ---------- */

  function restOffset(key: CornerKey, width: number, height: number): Offset {
    return {
      x: key === 'tl' || key === 'bl' ? -padding : width + padding,
      y: key === 'tl' || key === 'tr' ? -padding : height + padding,
    }
  }

  function seedOffset(key: CornerKey, width: number, height: number): Offset {
    const rest = restOffset(key, width, height)
    const signX = key === 'tl' || key === 'bl' ? 1 : -1
    const signY = key === 'tl' || key === 'tr' ? 1 : -1
    return { x: rest.x - signX * SEED_EXTRA, y: rest.y - signY * SEED_EXTRA }
  }

  function resetFrame(frame: Frame): void {
    const width = frame.rect?.width ?? 0
    const height = frame.rect?.height ?? 0
    frame.corners.forEach((corner, index) => {
      const key = CORNER_KEYS[index]
      if (!key) return
      const rest = restOffset(key, width, height)
      gsap.set(corner, { x: rest.x, y: rest.y })
      corner.style.setProperty('--corner-active', '0')
    })
  }

  function seedFrame(frame: Frame): void {
    const width = frame.rect?.width ?? 0
    const height = frame.rect?.height ?? 0
    frame.corners.forEach((corner, index) => {
      const key = CORNER_KEYS[index]
      if (!key) return
      const seed = seedOffset(key, width, height)
      gsap.set(corner, { x: seed.x, y: seed.y })
    })
  }

  /* ---------- 入场 / 收回 ---------- */

  function enter(frame: Frame): void {
    if (frame.active) return
    frame.active = true

    const width = frame.rect?.width ?? 0
    const height = frame.rect?.height ?? 0

    frame.corners.forEach((corner, index) => {
      const key = CORNER_KEYS[index]
      if (!key) return
      gsap.killTweensOf(corner)
      const rest = restOffset(key, width, height)

      if (!magnetEnabled) {
        // reduce：角标直接可见并归位，不做位移与错峰
        gsap.set(corner, { x: rest.x, y: rest.y, autoAlpha: 1 })
        return
      }

      const orderIndex = ENTER_ORDER.indexOf(key)
      gsap.to(corner, {
        autoAlpha: 1,
        x: rest.x,
        y: rest.y,
        duration: ENTER_DURATION,
        delay: orderIndex < 0 ? 0 : orderIndex * ENTER_STAGGER,
        ease: EASINGS.entrance,
        overwrite: 'auto',
      })
    })
  }

  function leave(frame: Frame): void {
    if (!frame.active) return
    frame.active = false

    const width = frame.rect?.width ?? 0
    const height = frame.rect?.height ?? 0

    frame.corners.forEach((corner, index) => {
      const key = CORNER_KEYS[index]
      if (!key) return
      gsap.killTweensOf(corner)
      corner.style.setProperty('--corner-active', '0')
      const seed = seedOffset(key, width, height)

      if (!magnetEnabled) {
        gsap.set(corner, { autoAlpha: 0, x: seed.x, y: seed.y })
        return
      }

      const orderIndex = ENTER_ORDER.indexOf(key)
      gsap.to(corner, {
        autoAlpha: 0,
        x: seed.x,
        y: seed.y,
        duration: LEAVE_DURATION,
        delay: orderIndex < 0 ? 0 : orderIndex * LEAVE_STAGGER,
        ease: EASINGS.smooth,
        overwrite: 'auto',
      })
    })
  }

  /* ---------- 磁吸 ---------- */

  /**
   * 单个角的磁吸目标：方向指向鼠标，幅度随「靠近哪条边」加权。
   * 贴边时达到 magnetStrength，正中心时趋近 0；toCorner 用于驱动该角的激活色。
   */
  function magnetFor(key: CornerKey, frame: Frame): { x: number; y: number; toCorner: number } {
    const rect = frame.rect
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0, toCorner: 0 }

    const px = ((frame.pointer.x - rect.left) / rect.width) * 2 - 1
    const py = ((frame.pointer.y - rect.top) / rect.height) * 2 - 1
    const nx = Math.max(-1, Math.min(1, px))
    const ny = Math.max(-1, Math.min(1, py))

    const left = key === 'tl' || key === 'bl'
    const top = key === 'tl' || key === 'tr'

    const dirX = left ? nx : -nx
    const dirY = top ? ny : -ny
    const nearX = left ? px : -px
    const nearY = top ? py : -py

    const weightX = 1 + Math.min(1, Math.max(0, 0.5 + nearX / 2)) * 2 * (edgeBias - 1)
    const weightY = 1 + Math.min(1, Math.max(0, 0.5 + nearY / 2)) * 2 * (edgeBias - 1)

    return {
      x: dirX * weightX * magnetStrength,
      y: dirY * weightY * magnetStrength,
      toCorner: Math.max(Math.abs(dirX), Math.abs(dirY)),
    }
  }

  function schedule(frame: Frame): void {
    if (frame.queued) return
    frame.queued = true

    requestAnimationFrame(() => {
      frame.queued = false
      const rect = frame.rect
      if (!frame.active || !rect || !magnetEnabled) return

      ensureSetters(frame)

      frame.corners.forEach((corner, index) => {
        const key = CORNER_KEYS[index]
        const setter = frame.setters[index]
        if (!key || !setter) return

        const rest = restOffset(key, rect.width, rect.height)
        const magnet = magnetFor(key, frame)
        setter.x(rest.x + magnet.x)
        setter.y(rest.y + magnet.y)
        corner.style.setProperty('--corner-active', magnet.toCorner.toFixed(3))
      })
    })
  }

  /**
   * quickTo 懒创建：一个 quickTo 会常驻一个小 tween 实例。页面上角标框很多，
   * 全部预建会有上百个 tween 一直在时间线上挂着。这里改成首次 hover 时才为这一框
   * 创建 8 个 quickTo（4 角 × x/y），离开后缓存在 frame 上复用。
   */
  function ensureSetters(frame: Frame): void {
    if (frame.setters.length) return
    frame.setters = frame.corners.map((corner) => ({
      x: gsap.quickTo(corner, 'x', {
        duration: FOLLOW_DURATION,
        ease: EASINGS.snappy,
      }) as unknown as (v: number) => void,
      y: gsap.quickTo(corner, 'y', {
        duration: FOLLOW_DURATION,
        ease: EASINGS.snappy,
      }) as unknown as (v: number) => void,
    }))
  }

  function disposeSetters(frame: Frame): void {
    frame.corners.forEach((corner) => gsap.killTweensOf(corner))
    frame.setters = []
  }

  /* ---------- frame 装配 ---------- */

  function createFrame(el: HTMLElement, corners: HTMLElement[]): Frame {
    const frame: Frame = {
      el,
      corners,
      rect: el.getBoundingClientRect(),
      setters: [],
      resizeObserver: null,
      pointer: { x: -1, y: -1 },
      active: false,
      focusActive: false,
      queued: false,
      teardown: null,
    }

    if (accentColor) {
      corners.forEach((corner) => corner.style.setProperty('--corner-accent', accentColor))
    }

    // 尺寸变化自适应：不写死宽高
    frame.resizeObserver = new ResizeObserver(() => {
      frame.rect = el.getBoundingClientRect()
      if (!frame.active) resetFrame(frame)
    })
    frame.resizeObserver.observe(el)

    const onEnter = () => {
      frame.rect = el.getBoundingClientRect()
      seedFrame(frame)
      enter(frame)
    }

    const onMove = (event: MouseEvent) => {
      frame.rect = frame.rect ?? el.getBoundingClientRect()
      frame.pointer.x = event.clientX
      frame.pointer.y = event.clientY
      schedule(frame)
    }

    const onLeave = () => {
      frame.pointer.x = -1
      frame.pointer.y = -1
      if (!frame.focusActive) leave(frame)
    }

    const onFocusIn = () => {
      if (!activeOnFocus) return
      frame.focusActive = true
      frame.rect = el.getBoundingClientRect()
      seedFrame(frame)
      enter(frame)
    }

    const onFocusOut = () => {
      if (!activeOnFocus) return
      frame.focusActive = false
      if (!frame.active) leave(frame)
    }

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    if (activeOnFocus) {
      el.addEventListener('focusin', onFocusIn)
      el.addEventListener('focusout', onFocusOut)
    }

    frame.teardown = () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('focusin', onFocusIn)
      el.removeEventListener('focusout', onFocusOut)
      frame.resizeObserver?.disconnect()
      frame.resizeObserver = null
    }

    // 初始：隐藏并归位，等 hover 再展开
    corners.forEach((corner) => gsap.set(corner, { autoAlpha: 0 }))
    resetFrame(frame)

    return frame
  }

  /** 注册一组 frame；返回解绑函数 */
  function bind(root: HTMLElement, frameMap: Map<HTMLElement, HTMLElement[]>): () => void {
    destroy()
    if (!supportsMagneticCorner()) return () => {}

    magnetEnabled = !prefersReducedMotion()

    ctx = gsap.context(() => {
      frames = Array.from(frameMap.entries())
        .filter(([, corners]) => corners.length === CORNER_KEYS.length)
        .map(([el, corners]) => createFrame(el, corners))
    }, root)

    detach = () => destroy()
    return detach
  }

  function destroy(): void {
    frames.forEach((frame) => {
      frame.teardown?.()
      frame.teardown = null
      disposeSetters(frame)
    })
    frames = []
    ctx?.revert()
    ctx = null
    detach = null
  }

  onUnmounted(() => {
    destroy()
  })

  return { bind, destroy, supportsMagneticCorner, prefersReducedMotion }
}
