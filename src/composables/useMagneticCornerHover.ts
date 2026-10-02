/**
 * useMagneticCornerHover — Corner Brackets（固定位置版）
 *
 * 鼠标进入目标元素时，四个 L 形定位角从外侧展开淡入，离开时平滑收回。
 * 角的位置**只由元素几何决定，与鼠标位置无关**：鼠标在元素内怎么移动，角都不动。
 *
 * 设计取向：Technical HUD 式的克制微交互（Stripe / Apple / Awwwards 那一类），
 * 不是赛博朋克 HUD——被包裹的元素本身绝不位移、不缩放、不加阴影。
 *
 * 实现要点：
 * - 只有「进入 / 离开」两种状态，各自一条补间；没有 mousemove 驱动的跟随，
 *   因此不监听 mousemove、不建 quickTo、不跑 rAF 循环。
 * - 几何量缓存，只在 mouseenter 与 ResizeObserver 回调里刷新。
 * - 所有动画包在 gsap.context()，卸载时 revert()，并 killTweensOf 每个角。
 * - prefers-reduced-motion：角标仍然出现（内容可见优先），但跳过入场位移与错峰。
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
/** 角臂长度固定值（px）：全站统一，避免同一排元素角标大小不一致 */
const ARM_FIXED = 14
/** 角臂长度下限（override 可调小，但不低于它） */
const ARM_FLOOR = 8
/** 角标相对元素边缘的外扩距离（px），固定值 */
const GAP_FIXED = 8
/** 元素短边小于该值的兜底阈值（实际以 ui-fx 的 frames.defaults.minSize 为准） */
export const FRAME_MIN_SIZE = 16
/** 入场起点相对元素边缘再往外的距离（px） */
const SEED_EXTRA = 8

export interface CornerGeometry {
  width: number
  height: number
  /**
   * 边框宽度（px）。角是 absolute、以元素的 **padding box** 为定位基准，
   * 而 offsetWidth/offsetHeight 是 border box。所以上/左还要再各让出边框宽度，
   * 否则四边间距会差出一个 border（实测带 1px 边框的元素左上 6px、右下 8px）。
   */
  border: { top: number; right: number; bottom: number; left: number }
  arm: number
  padding: number
  seedExtra: number
  /** false = 尺寸太小，不值得出角标 */
  ok: boolean
}

/**
 * 角标几何量。
 *
 * 臂长刻意**不随元素尺寸变化**：同一排元素用同一个臂长，观感才整齐。
 * 按尺寸缩放会让小元素上的角粗得像画框、大元素上的角小得像蚂蚁，实测很廉价。
 * 元素尺寸只用来决定「值不值得框」（短边过小直接跳过）。
 */
export function computeCornerGeometry(
  width: number,
  height: number,
  opts: {
    maxArm?: number
    paddingOverride?: number
    border?: { top: number; right: number; bottom: number; left: number }
  } = {},
): CornerGeometry {
  const arm = Math.max(ARM_FLOOR, opts.maxArm ?? ARM_FIXED)

  return {
    width,
    height,
    border: opts.border ?? { top: 0, right: 0, bottom: 0, left: 0 },
    arm,
    padding: opts.paddingOverride ?? GAP_FIXED,
    seedExtra: SEED_EXTRA,
    // ok 由管理器用「该元素的 effective minSize」覆写（见 updateGeometry）
    ok: true,
  }
}

interface Offset {
  x: number
  y: number
}

interface Frame {
  el: HTMLElement
  corners: HTMLElement[]
  rect: DOMRect | null
  /** 按当前元素尺寸算出的几何量（臂长 / 间距 / 入场外扩） */
  geo: CornerGeometry | null
  resizeObserver: ResizeObserver | null
  active: boolean
  focusActive: boolean
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
  /** 尺寸批变时统一重算 */
  updateAllGeometry: () => void
  /** 当前登记的 frame 数量 */
  frameCount: () => number
  /** 登记单个 frame（包装组件用；与增强器共用同一份注册表，所以不会互相覆盖） */
  addFrame: (el: HTMLElement, corners: HTMLElement[]) => () => void
}

export interface MagneticCornerHoverOptions {
  /** 角臂长度（px）。不传用全站固定值 14；不低于 8 */
  armMax?: number
  /** 固定间距（px）。不传用全站固定值 8 */
  padding?: number
  /** 元素短边小于该值不成框 */
  minSize?: number

  /** 是否在键盘 focus 时也进入锁定态 */
  activeOnFocus?: boolean
  /** 角标激活色（写进 --corner-accent，由样式读取） */
  accentColor?: string
}

/** 是否应该启用这套交互（粗指针不启用） */
/** 全站共用一份帧注册表：包装组件与自动增强器都注册到它 */
let sharedManager: MagneticCornerHoverManager | null = null

/**
 * 取全站唯一的角标管理器；首次调用时的 options 生效（后调用的 options 被忽略）。
 * useUiFx 安装时会带上 UI_FX.frames.defaults，所以配置里的 minSize 等能真正生效。
 */
export function getSharedCornerManager(
  options: MagneticCornerHoverOptions = {},
): MagneticCornerHoverManager | null {
  if (sharedManager) return sharedManager
  if (!supportsMagneticCorner() || prefersReducedMotion()) return null
  sharedManager = createMagneticCornerManager(options)
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
  const armMax = options.armMax ?? ARM_FIXED
  const minSize = options.minSize ?? FRAME_MIN_SIZE
  const activeOnFocus = options.activeOnFocus ?? true
  const accentColor = options.accentColor ?? ''

  let ctx: gsap.Context | null = null
  let frames: Frame[] = []
  /** false = prefers-reduced-motion：角标仍出现，但不做位移与错峰 */
  let animateEnabled = true
  /** 用于 createFrame 的早期返回判断：没有 Vue 实例时也安全 */
  const enabled = true

  /* ---------- 几何 ---------- */

  /**
   * 算几何量并写回 CSS 变量。臂长固定，尺寸只决定值不值得框。
   *
   * 尺寸取 offsetWidth/offsetHeight 而不是 getBoundingClientRect()：
   * 角是 absolute、以元素的 padding box 为基准，而 rect 的宽度是 border box。
   * 元素带 1px 边框时，rect 会让右下两侧各多出 1px，视觉上就是「框不居中、某边多某边少」。
   * offsetWidth 与角处在同一个坐标空间，四边间距因此严格相等。
   */
  function updateGeometry(frame: Frame): CornerGeometry {
    const width = frame.el.offsetWidth || (frame.rect?.width ?? 0)
    const height = frame.el.offsetHeight || (frame.rect?.height ?? 0)
    /*
      注意：属性不存在时 Number(undefined) / Number('') 都是 0，会被误当成
      「显式指定 gap=0 / arm=0」。必须先判存在再转数字，否则默认间距会被悄悄吃成 0
      （实测表现：四个角停在原地不展开、框紧贴元素边缘看似没框住）。
    */
    const armAttr = frame.el.dataset.mcfMaxArm
    const gapAttr = frame.el.dataset.mcfGap
    const overrideArm = armAttr === undefined ? Number.NaN : Number(armAttr)
    const overrideGap = gapAttr === undefined ? Number.NaN : Number(gapAttr)

    const cs = getComputedStyle(frame.el)
    const border = {
      top: Number.parseFloat(cs.borderTopWidth) || 0,
      right: Number.parseFloat(cs.borderRightWidth) || 0,
      bottom: Number.parseFloat(cs.borderBottomWidth) || 0,
      left: Number.parseFloat(cs.borderLeftWidth) || 0,
    }

    const geo = computeCornerGeometry(width, height, {
      maxArm: Number.isFinite(overrideArm) && overrideArm > 0 ? overrideArm : armMax,
      paddingOverride: Number.isFinite(overrideGap) && overrideGap >= 0 ? overrideGap : undefined,
      border,
    })
    // 零尺寸（懒加载图片未加载、display:none 的容器）不算「太小」，直接标为不可激活且不缓存
    if (width === 0 || height === 0 || Math.min(width, height) < minSize) geo.ok = false

    // 只在尺寸有效时缓存：零尺寸时缓存会让后续 enter/seed 都按 0 算，四个角叠在原点
    if (width > 0 && height > 0) frame.geo = geo
    frame.corners.forEach((corner) => {
      corner.style.setProperty('--corner-arm', `${geo.arm}px`)
    })
    return geo
  }

  /**
   * 取缓存几何；缓存缺失或已被标为不可激活时重算。
   *
   * 为什么要判 `!geo.ok`：懒加载图片在加载完成前 offsetWidth/Height 是 0，
   * 那次算出的 geo 会被标 ok=false 但仍是合法对象；如果直接返回它，
   * 图片加载完后的第一次进入就会按 0 尺寸摆角（四个角叠在原点，或框到父级左上角）。
   */
  function geoOf(frame: Frame): CornerGeometry {
    const cached = frame.geo
    if (cached && cached.width > 0 && cached.height > 0) return cached
    return updateGeometry(frame)
  }

  /**
   * 静止位：以元素 padding box 左上角为原点，让角的 L **骑在元素边界上**。
   *
   * 角臂是 14px 的方框，若把它的外缘贴到「边界 + gap」，左上的 L 会整条落在元素外侧、
   * 右下的 L 会整条落在内侧，四边看着就不一样宽。这里改成让 L 的中点对齐边界：
   *   左/上角顶点 = -(arm/2) - border
   *   右/下角顶点 = 尺寸 - arm/2 + border
   * 于是「元素边缘 → L 内缘」四边都等于 arm/2，视觉上元素正好居中。
   */
  function restOffset(key: CornerKey, geo: CornerGeometry): Offset {
    const b = geo.border
    const inset = geo.arm / 2
    return {
      x: key === 'tl' || key === 'bl' ? -inset - b.left : geo.width - inset + b.right,
      y: key === 'tl' || key === 'tr' ? -inset - b.top : geo.height - inset + b.bottom,
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

  /**
   * 进入：先把角摆到元素外侧的起点，再补间到静止位。
   *
   * 摆位必须在 `frame.active` 守卫**之内**：mouseover 会为每个子元素冒泡触发一次，
   * 若在守卫之外摆位，指针在元素内从一个子元素移到另一个子元素时，
   * 角会被反复推回起点而补间又被守卫挡掉，表现就是「框跟着光标位置乱走、贴着某条边」。
   */
  function enter(frame: Frame): void {
    if (frame.active) return

    frame.rect = frame.el.getBoundingClientRect()
    const geo = updateGeometry(frame)

    // 尺寸太小不值得出角标；其余情况一律激活（含「内部还有子框」的父容器）
    if (!shouldActivate(geo)) {
      hide(frame)
      return
    }

    frame.active = true
    seedFrame(frame)

    frame.corners.forEach((corner, index) => {
      const key = CORNER_KEYS[index]
      if (!key) return
      gsap.killTweensOf(corner)
      const rest = restOffset(key, geo)
      corner.style.setProperty('--corner-active', '1')

      if (!animateEnabled) {
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

      if (!animateEnabled) {
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

  /* ---------- frame 装配 ---------- */

  function createFrame(el: HTMLElement, corners: HTMLElement[]): Frame {
    const frame: Frame = {
      el,
      corners,
      rect: el.getBoundingClientRect(),
      resizeObserver: null,
      active: false,
      focusActive: false,
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
      enter(frame)
    }

    const onLeave = () => {
      if (!frame.focusActive) leave(frame)
    }

    /*
      焦点锁定只给键盘用。
      点击 RouterLink 之类的元素会让焦点留在它身上；若把「点出来的焦点」也算锁定态，
      鼠标移开时 leave() 会被 focusActive 挡住，角标就永远挂在那里不消失
      （实测后台侧边栏导航点击后就是这样）。这里按「最近一次交互是鼠标还是键盘」判断，
      键盘 Tab 仍保留锁定态。
    */
    let clickFocused = false

    const onPointerDown = () => {
      clickFocused = true
      frame.focusActive = false
    }

    const onKeyDown = () => {
      clickFocused = false
    }

    const onFocusIn = () => {
      if (!activeOnFocus) return
      if (clickFocused) return
      frame.focusActive = true
      frame.rect = el.getBoundingClientRect()
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
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('pointerdown', onPointerDown, { passive: true })
    if (activeOnFocus) {
      el.addEventListener('focusin', onFocusIn)
      el.addEventListener('focusout', onFocusOut)
      window.addEventListener('keydown', onKeyDown, { passive: true })
    }

    frame.teardown = () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseover', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('focusin', onFocusIn)
      el.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('keydown', onKeyDown)
      frame.resizeObserver?.disconnect()
      frame.resizeObserver = null
    }

    // 初始：隐藏并归位，等 hover 再展开
    corners.forEach((corner) => gsap.set(corner, { autoAlpha: 0 }))
    resetFrame(frame)

    return frame
  }

  /* ---------- 激活判据 ---------- */

  /**
   * 是否激活这个框：只看尺寸够不够。
   * 内部还有子框**不再**阻止父框激活 —— 指针进子容器时父框与子框一起亮，
   * 形成「父框大、子框小」的嵌套层次。
   */
  function shouldActivate(geo: CornerGeometry): boolean {
    return geo.ok
  }

  /** 立即隐藏该框的角标（不做收回动画），用于尺寸过小的元素 */
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
   * 增量登记一组 frame；返回只解绑这一组的函数。
   * 不再 destroy 已有注册表 —— 包装组件与自动增强器是先后登记的，
   * 谁后登记都不能把前者的 frame 清掉。
   */
  function bind(root: HTMLElement, frameMap: Map<HTMLElement, HTMLElement[]>): () => void {
    if (!enabled) return () => {}

    animateEnabled = !prefersReducedMotion()

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
      frames = frames.filter((item) => item !== frame)
    }
  }

  function destroy(): void {
    frames.forEach((frame) => {
      frame.teardown?.()
      frame.teardown = null
      frame.timers.forEach((id) => window.clearTimeout(id))
      frame.timers = []
    })
    frames = []
    ctx?.revert()
    ctx = null
  }

  return {
    bind,
    destroy,
    hide,
    updateAllGeometry,
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
export function useMagneticCornerFrame() {
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
  })

  return { attach, manager }
}
