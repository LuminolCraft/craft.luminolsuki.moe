/**
 * useUiFx —— 角标微交互与自定义光标的**全站安装器**
 *
 * 在 main.ts 里安装一次：
 *   import { installUiFx, destroyUiFx } from '@/composables/useUiFx'
 *   app.use(uiFxPlugin)          // 或 installUiFx()
 *
 * 行为：
 * - 把光标层（CursorLayer.vue）挂到 body，全站可用。
 * - 扫描 DOM：命中 UI_FX.frames.selectors 且不在 offSelectors 里的元素，
 *   就地插入四个角 span 并打上 data-mcf；随后登记进共享的角标管理器。
 * - MutationObserver 监听新增节点，路由切换 / 异步数据渲染出的新元素会自动增强，
 *   不需要在页面组件里接线。
 *
 * 关闭：UI_FX.enabled = false（全站），或 frames.enabled = false（只关角标）。
 *
 * 注意：本模块不调用 Vue 生命周期钩子（它在 main.ts 里运行，没有组件实例），
 * 全部资源在 destroyUiFx() 里手动释放。
 */
import { createApp, h, type App } from 'vue'
import { UI_FX, UI_FX_FRAME_ATTR } from '@/config/ui-fx'
import CursorLayer from '@/components/common/CursorLayer.vue'
import { CORNER_KEYS, getSharedCornerManager } from './useMagneticCornerHover'

interface EnhancedEntry {
  el: HTMLElement
  corners: HTMLElement[]
}

let installed = false
let enhancedRoots = new WeakSet<Element>()
let entries: EnhancedEntry[] = []
let observer: MutationObserver | null = null
let cursorHost: HTMLElement | null = null
let cursorApp: App | null = null
let bindQueued = false
let warnedAboutLimit = false
let onResize: (() => void) | null = null

/*
  全站共用的角标管理器（单例）。
  首参在第一次 installUiFx() 时传入 UI_FX.frames.defaults —— 工厂若拿不到这些值
  会退回内置兜底 minSize，config 里放宽的 minSize 就不生效（实测 team-row__gh 因此被判太矮）。
  包装组件走 useMagneticCornerFrame → 同一个 getSharedCornerManager()，共用这一份注册表。
*/
let manager = getSharedCornerManager({
  armMax: UI_FX.frames.defaults.maxArm,
  minSize: UI_FX.frames.defaults.minSize,
  magnetStrength: UI_FX.frames.defaults.magnetStrength,
  edgeBias: UI_FX.frames.defaults.edgeBias,
})

/** 元素是否值得增强：只做「已处理 / 逃生舱」两次短路，尺寸判定在 enhance 里按 override 逐元素算 */
function isEligible(el: HTMLElement): boolean {
  if (el.hasAttribute(UI_FX_FRAME_ATTR)) return false
  if (enhancedRoots.has(el)) return false
  if (el.closest(offSelectorText())) return false
  return true
}

function offSelectorText(): string {
  return UI_FX.frames.offSelectors.join(',')
}

function selectorText(): string {
  return UI_FX.frames.selectors.join(',')
}

/** 找出该元素命中的 override（取最后一个命中的，方便后来者覆盖） */
function overrideFor(el: HTMLElement) {
  let found: (typeof UI_FX.frames.overrides)[number] | null = null
  for (const item of UI_FX.frames.overrides) {
    if (el.matches(item.selector)) found = item
  }
  return found
}

/** 元素原始 position 记录在哪个属性上（清理时还原） */
const POS_ATTR = 'data-fx-pos'

/** 为一个元素插入四个角并登记 */
function enhance(el: HTMLElement): void {
  if (enhancedRoots.has(el)) return

  const override = overrideFor(el)
  const minSize = override?.minSize ?? UI_FX.frames.defaults.minSize

  // 尺寸太小不值得框（细条这类；override 里可以单独放宽，例如行内文字链接）
  const rect = el.getBoundingClientRect()
  if (rect.width < minSize || rect.height < minSize) return

  const computed = getComputedStyle(el)
  if (computed.display === 'contents') return

  /*
    关键：角标是 position: absolute，它的包含块是「最近的定位祖先」。
    li / div / a 这些元素的 position 通常是 static —— 那样四个角会跑到
    最近的定位祖先（例如 .compare__col）或初始包含块（文档左上角）上，
    表现就是「框没框住 tag，反而贴在父级左上角」。
    所以在元素自身补一个 position: relative，让角正好以它为基准。
  */
  const originalPosition = el.style.position
  if (computed.position === 'static') {
    el.setAttribute(POS_ATTR, originalPosition)
    el.style.position = 'relative'
  }

  /*
    角标的基础样式必须内联写：这些 span 是运行时插进任意页面组件的 DOM，
    拿不到 SFC 的 scoped 属性（data-v-xxxx），scoped 的角标样式对它们无效。
  */
  const corners: HTMLElement[] = []
  for (const key of CORNER_KEYS) {
    const corner = document.createElement('span')
    corner.className = `magnetic-corner-frame__corner magnetic-corner-frame__corner--${key}`
    corner.setAttribute('aria-hidden', 'true')
    Object.assign(corner.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      boxSizing: 'border-box',
      // 显式给一个基准尺寸：只靠 --corner-arm 变量时，运行时插入的元素在没有该变量的一刻会塌成 0
      width: `${UI_FX.frames.defaults.maxArm}px`,
      height: `${UI_FX.frames.defaults.maxArm}px`,
      pointerEvents: 'none',
      opacity: '0',
      visibility: 'hidden',
      willChange: 'transform, opacity',
    })
    // 只画 L 形两段细线
    if (key === 'tl') {
      corner.style.borderTop = '1px solid'
      corner.style.borderLeft = '1px solid'
    } else if (key === 'tr') {
      corner.style.borderTop = '1px solid'
      corner.style.borderRight = '1px solid'
    } else if (key === 'bl') {
      corner.style.borderBottom = '1px solid'
      corner.style.borderLeft = '1px solid'
    } else {
      corner.style.borderBottom = '1px solid'
      corner.style.borderRight = '1px solid'
    }
    el.appendChild(corner)
    corners.push(corner)
  }

  // 颜色：优先继承页面已有的 --ink / --accent，缺省给中性值与品牌紫
  el.style.setProperty('--corner-color', 'var(--ink, #171717)')
  el.style.setProperty('--corner-accent', 'var(--accent, #a78bfa)')
  el.setAttribute(UI_FX_FRAME_ATTR, '')
  enhancedRoots.add(el)
  entries.push({ el, corners })
}

/**
 * 清理「没有人认领」的角标，并回收被上一份模块实例（HMR / Vue 换节点）遗留的旧增强。
 *
 * 角是 position: absolute 且元素通常没有定位祖先时会贴在文档左上角，
 * 看起来就是「按钮左上角多出一个 L」。认领标记是 UI_FX_FRAME_ATTR：
 * 没有标记的直接删；有标记但不属于当前 entries 的是陈旧的，撤销标记后让本轮 scan 重新增强。
 */
function sweepOrphanCorners(): void {
  const owned = new Set(entries.map((entry) => entry.el))
  const stale = new Set<HTMLElement>()

  document.querySelectorAll<HTMLElement>('.magnetic-corner-frame__corner').forEach((corner) => {
    const parent = corner.parentElement
    if (!parent) {
      corner.remove()
      return
    }
    if (!parent.hasAttribute(UI_FX_FRAME_ATTR)) {
      corner.remove()
      return
    }
    if (!owned.has(parent)) stale.add(parent)
  })

  stale.forEach((el) => {
    el.querySelectorAll(':scope > .magnetic-corner-frame__corner').forEach((c) => c.remove())
    el.removeAttribute(UI_FX_FRAME_ATTR)
    el.removeAttribute(POS_ATTR)
    delete el.dataset.mcfMaxArm
    delete el.dataset.mcfGap
    enhancedRoots.delete(el)
  })
}

/**
 * 把「已经被别的模块实例打过标记、但不在当前 entries 里」的元素重新纳入管理。
 *
 * 开发态热更新会新建一份模块状态，旧实例留下的 data-mcf 与角标还在 DOM 上；
 * 若不接管，那些角标既不会被清理也不会响应交互，就是「多出来的一个框」。
 */
function adoptPending(): void {
  const owned = new Set(entries.map((entry) => entry.el))
  document.querySelectorAll<HTMLElement>(`[${UI_FX_FRAME_ATTR}]`).forEach((el) => {
    if (owned.has(el)) return
    const corners = Array.from(
      el.querySelectorAll<HTMLElement>(':scope > .magnetic-corner-frame__corner'),
    )
    if (corners.length !== CORNER_KEYS.length) {
      // 角不完整（被页面组件重渲染截断）→ 撤销标记，交给紧随其后的 scan 重新增强
      el.removeAttribute(UI_FX_FRAME_ATTR)
      enhancedRoots.delete(el)
      return
    }
    enhancedRoots.add(el)
    entries.push({ el, corners })
  })
}

/**
 * 懒加载图片补扫。
 *
 * enhance() 会因为「尺寸不足 16px」跳过尚未加载的 img，那时它还没有尺寸；
 * 加载完成后再扫一次就必须有触发点，否则这张图永远不会被框。
 * 每个 img 只挂一次监听，loaded 标记避免重复注册。
 */
function adoptImages(): void {
  document.querySelectorAll<HTMLImageElement>('img:not([data-fx-loaded])').forEach((img) => {
    img.setAttribute('data-fx-loaded', '')
    const rescan = () => {
      if (!isEligible(img)) return
      enhance(img)
      queueBind()
    }
    if (img.complete) rescan()
    else {
      img.addEventListener('load', rescan, { once: true })
      img.addEventListener('error', () => img.removeAttribute('data-fx-loaded'), { once: true })
    }
  })
}

/** 扫描一个子树，命中白名单就增强；超过上限就停并提示一次 */
function scan(root: ParentNode): void {
  if (!manager) return
  adoptPending()
  adoptImages()
  sweepOrphanCorners()

  const matches = root.querySelectorAll<HTMLElement>(selectorText())

  for (const el of matches) {
    if (entries.length >= UI_FX.frames.maxFrames) {
      if (!warnedAboutLimit) {
        warnedAboutLimit = true
        console.warn(
          `[ui-fx] 角标框数量达到上限 ${UI_FX.frames.maxFrames}，其余元素未增强。` +
            `要更多请调 src/config/ui-fx.ts 里的 frames.maxFrames，或收窄 frames.selectors。`,
        )
      }
      break
    }
    if (!isEligible(el)) continue
    enhance(el)
  }
}

/** 合并到一帧里重新登记（新增/移除后重建 frame 列表） */
function queueBind(): void {
  if (bindQueued) return
  bindQueued = true
  requestAnimationFrame(() => {
    bindQueued = false
    if (!manager) return
    // 重建前把旧的角标从 DOM 上摘掉，避免管理器缓存幽灵元素
    const frameMap = new Map<HTMLElement, HTMLElement[]>()
    for (const entry of entries) {
      frameMap.set(entry.el, entry.corners)
    }
    // 增量登记：已经把包装组件的 frame 也算进同一份注册表，不会互相清掉
    manager.bind(document.body, frameMap)
  })
}

let scanQueued = false
function queueScan(): void {
  if (scanQueued) return
  scanQueued = true
  requestAnimationFrame(() => {
    scanQueued = false
    scan(document.body)
    queueBind()
  })
}

/** 清理某个元素上的增强 */
function unenhanceAll(): void {
  for (const entry of entries) {
    entry.corners.forEach((corner) => corner.remove())
    entry.el.removeAttribute(UI_FX_FRAME_ATTR)
    // 还原 enhance() 补上的定位，避免把页面元素的 offsetParent 关系永久改掉
    if (entry.el.hasAttribute(POS_ATTR)) {
      entry.el.style.position = entry.el.getAttribute(POS_ATTR) ?? ''
      entry.el.removeAttribute(POS_ATTR)
    }
    delete entry.el.dataset.mcfMaxArm
    delete entry.el.dataset.mcfGap
  }
  entries = []
  enhancedRoots = new WeakSet<Element>()
  sweepOrphanCorners()
}

export function installUiFx(): void {
  if (installed) return
  if (UI_FX.enabled === false) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  installed = true
  manager =
    manager ??
    getSharedCornerManager({
      armMax: UI_FX.frames.defaults.maxArm,
      minSize: UI_FX.frames.defaults.minSize,
      magnetStrength: UI_FX.frames.defaults.magnetStrength,
      edgeBias: UI_FX.frames.defaults.edgeBias,
    })

  // ---------- 光标层 ----------
  if (UI_FX.cursor.enabled && supportsCustomCursorSafe()) {
    cursorHost = document.createElement('div')
    cursorHost.setAttribute('data-ui-fx-cursor', '')
    document.body.appendChild(cursorHost)
    cursorApp = createApp({ render: () => h(CursorLayer) })
    cursorApp.mount(cursorHost)
  }

  // ---------- 角标增强 ----------
  if (UI_FX.frames.enabled && manager) {
    queueScan()

    observer = new MutationObserver((mutations) => {
      let dirty = false
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) dirty = true
        if (mutation.removedNodes.length) dirty = true
      }
      if (dirty) queueScan()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const activeManager = manager
    if (activeManager) {
      onResize = () => activeManager.updateAllGeometry()
      window.addEventListener('resize', onResize, { passive: true })
    }
  }
}

function supportsCustomCursorSafe(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  if (window.matchMedia('(pointer: coarse)').matches) return false
  if (window.matchMedia('(hover: none)').matches) return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function destroyUiFx(): void {
  observer?.disconnect()
  observer = null
  if (onResize) {
    window.removeEventListener('resize', onResize)
    onResize = null
  }
  manager?.destroy()
  unenhanceAll()
  cursorApp?.unmount()
  cursorApp = null
  cursorHost?.remove()
  cursorHost = null
  installed = false
  warnedAboutLimit = false
}

/** 暴露给需要手动触发的场景（例如某个页面加载完大量异步内容后） */
export function refreshUiFx(): void {
  if (!installed) return
  queueScan()
}

/** Vue 插件形态，方便 main.ts 用 app.use() 安装 */
export const uiFxPlugin = {
  install(app: App): void {
    void app
    installUiFx()
  },
}
