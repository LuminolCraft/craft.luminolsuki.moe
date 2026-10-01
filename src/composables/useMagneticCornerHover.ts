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

/** 角标框的标记属性：带这个属性的元素会被内层优先判定与光标层识别 */
export const FRAME_ATTR = 'data-mcf'

/** 入场错峰顺序：左上 → 右下 → 右上 → 左下 */
const ENTER_ORDER: CornerKey[] = ['tl', 'br', 'tr', 'bl']

const ENTER_STAGGER = 0.03
const LEAVE_STAGGER = 0.02
const ENTER_DURATION = 0.45
const LEAVE_DURATION = 0.3
const FOLLOW_DURATION = 0.5
/** 角标自适应参数：臂长随元素尺寸走，避免大元素上角标小得像蚂蚁、小元素上粗得像画框 */
const ARM_RATIO = 0.11
const ARM_MIN = 10
const ARM_MAX = 28
/** 角标参考尺寸上限：超过这个尺寸的元素不再继续放大臂长 */
const ARM_SIZE_CAP = 220
/** 元素短边小于该值不成框（进度条这类细条跳过） */
export const FRAME_MIN_SIZE = 24
/** 入场起点相对臂长再往元素外侧退的比例 */
const SEED_RATIO = 0.6
const SEED_MIN = 6
const SEED_MAX = 16

export interface CornerGeometry {
  width: number
  height: number
  arm: number
  padding: number
  seedExtra: number
  magnetStrength: number
  edgeBias: number
  /** false = 尺寸太小，不值得出角标 */
  ok: boolean
}

/** 按元素尺寸与上限算出一套角标几何量（导出供 CursorLayer 等复用同一套尺寸） */
export function computeCornerGeometry(
  width: number,
  height: number,
  opts: {
    maxArm?: number
    minArm?: number
    magnetStrength?: number
    edgeBias?: number
    paddingOverride?: number
  } = {},
): CornerGeometry {
  const maxArm = opts.maxArm ?? ARM_MAX
  const minArm = Math.min(opts.minArm ?? ARM_MIN, maxArm)
  const reference = Math.min(width, height, ARM_SIZE_CAP)
  const arm = Math.round(Math.min(maxArm, Math.max(minArm, reference * ARM_RATIO)))
  const defaultPadding = Math.min(14, Math.max(6, Math.round(arm * 0.45)))
  const seedExtra = Math.min(SEED_MAX, Math.max(SEED_MIN, Math.round(arm * SEED_RATIO)))

  return {
    width,
    height,
    arm,
    padding: opts.paddingOverride ?? defaultPadding,
    seedExtra,
    magnetStrength: opts.magnetStrength ?? 6,
    edgeBias: opts.edgeBias ?? 2.2,
    ok: Math.min(width, height) >= FRAME_MIN_SIZE,
  }
}

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
  /** 按当前元素尺寸算出的几何量（臂长 / 间距 / 入场外扩 / 磁吸幅度） */
  geo: CornerGeometry | null
  setters: AxisSetters[]
  resizeObserver: ResizeObserver | null
  pointer: { x: number; y: number }
  active: boolean
  focusActive: boolean
  queued: boolean
  teardown: (() => void) | null
  /** 尺寸变化时重算几何量，未激活时顺便归位 */
  refreshGeometry: (() => void) | null
  /** 入场/收回的计时器：内层抢占时要能把外层未完成的动画压下去 */
  timers: number[]
}

/** 全站共用的一个管理器：光标层与包装组件都通过它登记/查询 frame */
export interface MagneticCornerHoverManager {
  bind: (root: HTMLElement, frameMap: Map<HTMLElement, HTMLElement[]>) => () => void
  destroy: () => void
  /** 立即隐藏某框的角标（不做收回动画） */
  hide: (frame: Frame) => void
  /** 当前激活的最内层框元素（光标层按它对齐四角） */
  activeFrameElement: () => HTMLElement | null
  /** 尺寸批变时统一重算 */
  updateAllGeometry: () => void
  /** 该元素内部是否还有别的角标框 */
  hasInnerFrame: (el: HTMLElement) => boolean
  /** 当前登记的 frame 数量 */
  frameCount: () => number
  /** 登记单个 frame（包装组件用；与增强器共用同一份注册表，所以不会互相覆盖） */
  addFrame: (el: HTMLElement, corners: HTMLElement[]) => () => void
}

export interface MagneticCornerHoverOptions {
  /** 臂长上限（px）。不传走自适应公式；传了就作为该框的硬上限 */
  armMax?: number
  /** 间距固定值（px）。不传按臂长比例自适应 */
  padding?: number
  /** 元素短边小于该值不成框 */
  minSize?: number
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
/** 全站共用一份帧注册表：包装组件与自动增强器都注册到它 */
let sharedManager: MagneticCornerHoverManager | null = null

export function getSharedCornerManager(): MagneticCornerHoverManager | null {
  if (sharedManager) return sharedManager
  if (!supportsMagneticCorner() || prefersReducedMotion()) return null
  sharedManager = createMagneticCornerManager()
  return sharedManager
}

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

/**
 * 纯工厂：不依赖 Vue 组件实例，可在 main.ts / 非组件上下文里安全调用。
 * 组件内请用 useMagneticCornerHover（它额外负责卸载时清理）。
 */
export function createMagneticCornerManager(
  options: MagneticCornerHoverOptions = {},
): MagneticCornerHoverManager {
  const armMax = options.armMax ?? ARM_MAX
  const minSize = options.minSize ?? FRAME_MIN_SIZE
  const magnetStrength = options.magnetStrength ?? 6
  const edgeBias = options.edgeBias ?? 2.2
  const activeOnFocus = options.activeOnFocus ?? true
  const accentColor = options.accentColor ?? ''

  let ctx: gsap.Context | null = null
  let frames: Frame[] = []
  let magnetEnabled = true
  /** 用于 createFrame 的早期返回判断：没有 Vue 实例时也安全 */
  const enabled = true

  /* ---------- 几何 ---------- */

  /** 按当前元素尺寸重算几何量，并写回 CSS 变量（臂长/间距随元素大小变化） */
  function updateGeometry(frame: Frame): CornerGeometry {
    const width = frame.rect?.width ?? 0
    const height = frame.rect?.height ?? 0
    const overrideArm = Number(frame.el.dataset.mcfMaxArm ?? '')
    const overrideGap = Number(frame.el.dataset.mcfGap ?? '')

    const geo = computeCornerGeometry(width, height, {
      maxArm: Number.isFinite(overrideArm) && overrideArm > 0 ? overrideArm : armMax,
      magnetStrength,
      edgeBias,
      paddingOverride: Number.isFinite(overrideGap) && overrideGap >= 0 ? overrideGap : undefined,
    })
    if (Math.min(width, height) < minSize) geo.ok = false

    frame.geo = geo
    frame.corners.forEach((corner) => {
      corner.style.setProperty('--corner-arm', `${geo.arm}px`)
    })
    return geo
  }

  function geoOf(frame: Frame): CornerGeometry {
    return frame.geo ?? updateGeometry(frame)
  }

  function restOffset(key: CornerKey, geo: CornerGeometry): Offset {
    return {
      x: key === 'tl' || key === 'bl' ? -geo.padding : geo.width + geo.padding,
      y: key === 'tl' || key === 'tr' ? -geo.padding : geo.height + geo.padding,
    }
  }

  function seedOffset(key: CornerKey, geo: CornerGeometry): Offset {
    const rest = restOffset(key, geo)
    const signX = key === 'tl' || key === 'bl' ? 1 : -1
    const signY = key === 'tl' || key === 'tr' ? 1 : -1
    return { x: rest.x - signX * geo.seedExtra, y: rest.y - signY * geo.seedExtra }
  }

  function resetFrame(frame: Frame): void {
    const geo = updateGeometry(frame)
    frame.corners.forEach((corner, index) => {
      const key = CORNER_KEYS[index]
      if (!key) return
      const rest = restOffset(key, geo)
      gsap.set(corner, { x: rest.x, y: rest.y })
      corner.style.setProperty('--corner-active', '0')
    })
  }

  function seedFrame(frame: Frame): void {
    const geo = geoOf(frame)
    frame.corners.forEach((corner, index) => {
      const key = CORNER_KEYS[index]
      if (!key) return
      const seed = seedOffset(key, geo)
      gsap.set(corner, { x: seed.x, y: seed.y })
    })
  }

  /* ---------- 入场 / 收回 ---------- */

  function enter(frame: Frame): void {
    if (frame.active) return
    frame.active = true
    suppressAncestors(frame.el)

    const geo = updateGeometry(frame)

    frame.corners.forEach((corner, index) => {
      const key = CORNER_KEYS[index]
      if (!key) return
      gsap.killTweensOf(corner)
      const rest = restOffset(key, geo)

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

    const geo = geoOf(frame)

    frame.corners.forEach((corner, index) => {
      const key = CORNER_KEYS[index]
      if (!key) return
      gsap.killTweensOf(corner)
      corner.style.setProperty('--corner-active', '0')
      const seed = seedOffset(key, geo)

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
  function magnetFor(
    key: CornerKey,
    frame: Frame,
    geo: CornerGeometry,
  ): { x: number; y: number; toCorner: number } {
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

    const bias = geo.edgeBias
    const amp = geo.magnetStrength
    const weightX = 1 + Math.min(1, Math.max(0, 0.5 + nearX / 2)) * 2 * (bias - 1)
    const weightY = 1 + Math.min(1, Math.max(0, 0.5 + nearY / 2)) * 2 * (bias - 1)

    return {
      x: dirX * weightX * amp,
      y: dirY * weightY * amp,
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

      const geo = updateGeometry(frame)
      ensureSetters(frame)

      frame.corners.forEach((corner, index) => {
        const key = CORNER_KEYS[index]
        const setter = frame.setters[index]
        if (!key || !setter) return

        const rest = restOffset(key, geo)
        const magnet = magnetFor(key, frame, geo)
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
      geo: null,
      refreshGeometry: null,
      timers: [],
    }

    if (accentColor) {
      corners.forEach((corner) => corner.style.setProperty('--corner-accent', accentColor))
    }

    // 尺寸变化自适应：重算臂长/间距；未激活时顺便归位
    frame.refreshGeometry = () => {
      frame.rect = el.getBoundingClientRect()
      if (!frame.active) resetFrame(frame)
      else updateGeometry(frame)
    }
    frame.resizeObserver = new ResizeObserver(() => frame.refreshGeometry?.())
    frame.resizeObserver.observe(el)

    const onEnter = () => {
      frame.rect = el.getBoundingClientRect()
      const geo = updateGeometry(frame)
      // 尺寸太小不值得出角标；内层还有框时让内层接住
      if (!geo.ok || hasInnerFrame(el)) {
        hide(frame)
        return
      }
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
      const geo = updateGeometry(frame)
      if (!geo.ok || hasInnerFrame(el)) {
        hide(frame)
        return
      }
      seedFrame(frame)
      enter(frame)
    }

    const onFocusOut = () => {
      if (!activeOnFocus) return
      frame.focusActive = false
      if (!frame.active) leave(frame)
    }

    /*
      同时监听 mouseenter 与 mouseover：部分环境（含 headless 合成事件）只派发 mouseover，
      不派发 mouseenter，导致元素框永远不亮。mouseover 会冒泡，命中子元素时也能带出父框。
    */
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseover', onEnter)
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    if (activeOnFocus) {
      el.addEventListener('focusin', onFocusIn)
      el.addEventListener('focusout', onFocusOut)
    }

    frame.teardown = () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseover', onEnter)
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

  /* ---------- 内层优先 ---------- */

  /** 该元素内部是否还有别的角标框（有就让内层接住，避免两个框同时出现） */
  function hasInnerFrame(el: HTMLElement): boolean {
    return el.querySelector(`[${FRAME_ATTR}]`) !== null
  }

  /**
   * 立即隐藏该框的角标（不做收回动画）。
   * 用于「尺寸太小」与「内层抢占」两种情况：外层不该慢慢淡出，而要马上让位。
   */
  function hide(frame: Frame): void {
    frame.active = false
    frame.timers.forEach((id) => window.clearTimeout(id))
    frame.timers = []
    frame.corners.forEach((corner) => {
      gsap.killTweensOf(corner)
      corner.style.setProperty('--corner-active', '0')
      gsap.set(corner, { autoAlpha: 0 })
    })
  }

  /**
   * 内层框激活时把祖先链上的其他框压下去。
   * 外层框本身不参与指针交互，所以直接在激活时清掉祖先的角即可。
   */
  function suppressAncestors(el: HTMLElement): void {
    let parent = el.parentElement?.closest(`[${FRAME_ATTR}]`) ?? null
    while (parent) {
      const ancestor = frames.find((f) => f.el === parent)
      if (ancestor?.active) hide(ancestor)
      parent = parent.parentElement?.closest(`[${FRAME_ATTR}]`) ?? null
    }
  }

  /** 当前处于激活态的框（供光标层对齐用，取最内层那个） */
  function activeFrameElement(): HTMLElement | null {
    let found: HTMLElement | null = null
    for (const frame of frames) {
      if (!frame.active) continue
      if (!found || found.contains(frame.el)) found = frame.el
    }
    return found
  }

  /**
   * 增量登记一组 frame；返回只解绑这一组的函数。
   * 不再 destroy 已有注册表 —— 包装组件与自动增强器是先后登记的，
   * 谁后登记都不能把前者的 frame 清掉。
   */
  function bind(root: HTMLElement, frameMap: Map<HTMLElement, HTMLElement[]>): () => void {
    if (!enabled) return () => {}

    magnetEnabled = !prefersReducedMotion()

    const known = new Set(frames.map((frame) => frame.el))
    const added: Frame[] = []

    ctx = gsap.context(() => {
      frameMap.forEach((corners, el) => {
        if (known.has(el)) return
        if (corners.length !== CORNER_KEYS.length) return
        added.push(createFrame(el, corners))
      })
    }, root)

    frames = [...frames, ...added]

    const release = () => {
      added.forEach((frame) => {
        frame.teardown?.()
        frame.teardown = null
        frame.timers.forEach((id) => window.clearTimeout(id))
        frame.timers = []
        disposeSetters(frame)
      })
      frames = frames.filter((frame) => !added.includes(frame))
    }

    return release
  }

  /** 尺寸批变（窗口 resize、字体加载完成）时统一重算 */
  function updateAllGeometry(): void {
    frames.forEach((frame) => frame.refreshGeometry?.())
  }

  /** 当前登记的 frame 数量 */
  function frameCount(): number {
    return frames.length
  }

  /**
   * 登记单个 frame，返回解绑函数。
   * 包装组件（MagneticCornerFrame）与自动增强器（useUiFx）都走这里，
   * 共用同一份 frames 注册表 —— 否则两边各自 bind 会互相把对方的注册清掉。
   */
  function addFrame(el: HTMLElement, corners: HTMLElement[]): () => void {
    if (!enabled) return () => {}
    if (corners.length !== CORNER_KEYS.length) return () => {}

    // 保底：登记时先把角按当前尺寸摆好并隐藏，避免初始化顺序导致角停在 0×0
    updateGeometry({ el, corners, rect: el.getBoundingClientRect(), geo: null } as Frame)

    // 同一元素只登记一次：重复登记会出现两个 frame 争同一批角，
    // 内层优先判定又会把先登记的那个压掉，表现就是「怎么 hover 都不亮」
    if (frames.some((item) => item.el === el)) return () => {}

    const frame = createFrame(el, corners)
    frames = [...frames, frame]

    return () => {
      frame.teardown?.()
      frame.teardown = null
      frame.timers.forEach((id) => window.clearTimeout(id))
      frame.timers = []
      disposeSetters(frame)
      frames = frames.filter((item) => item !== frame)
    }
  }

  function destroy(): void {
    frames.forEach((frame) => {
      frame.teardown?.()
      frame.teardown = null
      frame.timers.forEach((id) => window.clearTimeout(id))
      frame.timers = []
      disposeSetters(frame)
    })
    frames = []
    ctx?.revert()
    ctx = null
  }

  return {
    bind,
    destroy,
    hide,
    activeFrameElement,
    updateAllGeometry,
    hasInnerFrame,
    frameCount,
    addFrame,
  }
}

/**
 * 组件内使用：登记单个 frame 到共享注册表，卸载时自动解绑。
 *
 * 注意：不再返回 bind()。全站只有一份帧注册表（getSharedCornerManager），
 * 包装组件与自动增强器都往里 addFrame；两边各自 bind 会互相把对方清掉。
 */
export function useMagneticCornerFrame(options: MagneticCornerHoverOptions = {}) {
  const manager = getSharedCornerManager()
  let detach: (() => void) | null = null

  function attach(el: HTMLElement, corners: HTMLElement[]): void {
    if (!manager) return
    detach?.()
    detach = manager.addFrame(el, corners)
  }

  onUnmounted(() => {
    detach?.()
    detach = null
    void options
  })

  return { attach, manager }
}
