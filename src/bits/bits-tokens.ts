/**
 * bits-tokens —— Vue Bits 组件的「主题令牌 → 6 位 hex」适配层
 *
 * 为什么需要这一层：
 * Vue Bits 的 WebGL 组件（WebThreads / GradientWaves 等）颜色 prop 走的是
 * `hexToRgb()`，正则是 /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/。
 * 传 `var(--x)` / `rgba()` / 8 位 hex 时正则不匹配，函数会 **静默返回 [1,1,1]（白色）**，
 * 既不报错也不抛异常 —— 表现为「WebGL 层莫名变成一片白」。
 *
 * 因此所有颜色都必须先经过这里：运行时读 `theme-colors.css` 的 CSS 变量，
 * 归一化成 6 位 hex 后再交给组件的 prop。这样 `theme-colors.css` 依旧是唯一事实来源，
 * 而不是在 TS 里再抄一份色板。
 *
 * 约束：
 * - 读不到（SSR / 变量未定义 / 仍是未展开的 var() 链）时返回调用方给的 fallback
 * - 每个 token 都带浅色 / 深色两套 fallback，保证首帧和降级路径都有正确颜色
 */
import { reactive } from 'vue'

export interface BitsTokens {
  /** 主紫：浅色 #a78bfa / 深色 #9370db */
  primary: string
  /** 更深的紫，用于渐变另一端与描边：两端 #9370db */
  primaryDeep: string
  /** 画布：浅色 #fafafa / 深色 #010102 */
  canvas: string
  /** 卡片底色（rgba 输入会丢掉 alpha，取 RGB 部分） */
  card: string
  /** 在线状态点的青绿 */
  online: string
  /** Vercel 控制台紫 #7928ca */
  consolePurple: string
  /** Vercel 工作流粉 #de1d8d */
  previewPink: string
  /** 正文色 */
  text: string
  /** 当前是否深色主题 */
  isDark: boolean
}

interface TokenSpec {
  /** 读取的 CSS 自定义属性名 */
  readonly varName: string
  /** 浅色主题 fallback */
  readonly light: string
  /** 深色主题 fallback */
  readonly dark: string
}

/**
 * token → CSS 变量映射。fallback 取自 theme-colors.css 的对应值，
 * 只在「取不到 / 取到非颜色」时兜底，正常路径永远是运行时读到的值。
 */
const TOKEN_SPECS = {
  primary: { varName: '--primary-color', light: '#a78bfa', dark: '#9370db' },
  // 深色主题主紫同时作为「深紫」令牌的两套取值：它在浅色画布上同样成立
  primaryDeep: { varName: '--bases-dark-primary', light: '#9370db', dark: '#9370db' },
  canvas: { varName: '--background-color', light: '#fafafa', dark: '#010102' },
  card: { varName: '--card-bg', light: '#ffffff', dark: '#18181e' },
  online: { varName: '--online-color', light: '#00bfa6', dark: '#009688' },
  consolePurple: { varName: '--vercel-console-purple', light: '#7928ca', dark: '#7928ca' },
  previewPink: { varName: '--vercel-preview-pink', light: '#de1d8d', dark: '#de1d8d' },
  text: { varName: '--text-color', light: '#2c3e50', dark: '#f2eefc' },
} as const satisfies Record<string, TokenSpec>

type TokenKey = keyof typeof TOKEN_SPECS

const HEX6 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i
const HEX3 = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
/** rgb(1 2 3) / rgb(1, 2, 3) / rgba(1, 2, 3, 0.4) / rgb(1 2 3 / 40%) —— alpha 部分忽略 */
const RGB_FN = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i
/** 未展开的自定义属性引用，例如 var(--x) 或 var(--x, #fff) */
const VAR_REF = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*))?\)$/

function channelToHex(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)))
  return clamped.toString(16).padStart(2, '0')
}

/**
 * 把各种 CSS 颜色写法归一化成 `#rrggbb`（小写）。
 * 支持 `#abc` / `#aabbcc` / `rgb()` / `rgba()`；其它写法（关键词、hsl、8 位 hex）返回 null。
 */
export function normalizeHex(input: string): string | null {
  const value = input.trim()
  if (!value) return null

  const hex6 = HEX6.exec(value)
  if (hex6) return `#${hex6[1]}${hex6[2]}${hex6[3]}`.toLowerCase()

  const hex3 = HEX3.exec(value)
  if (hex3) return `#${hex3[1]}${hex3[1]}${hex3[2]}${hex3[2]}${hex3[3]}${hex3[3]}`.toLowerCase()

  const rgb = RGB_FN.exec(value)
  if (rgb) {
    const [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null
    return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`
  }

  return null
}

/**
 * 读一个自定义属性并展开它可能嵌套的 var() 链。
 *
 * Chrome 通常会在 computed value 里直接把 var() 展开好，
 * 但 `--text-color: var(--bases-text-color)` 这类多级引用在某些引擎/时序下会拿到原始 token 串，
 * 这里做一次递归展开，宁可多读几次也不要把颜色判成缺失。
 */
function readCustomProperty(name: string, depth = 0): string {
  if (depth > 8) return ''
  let raw = ''
  try {
    raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  } catch {
    return ''
  }
  if (!raw) return ''

  const ref = VAR_REF.exec(raw)
  if (!ref) return raw

  const resolved = ref[1] ? readCustomProperty(ref[1], depth + 1) : ''
  if (resolved) return resolved
  return (ref[2] ?? '').trim()
}

/**
 * 读取 CSS 变量并归一化成 6 位 hex。
 *
 * @param cssVar  自定义属性名，`--primary-color` 与 `primary-color` 都接受
 * @param fallback 取不到（无 document / 变量不存在 / 不是 hex 或 rgb）时返回它
 */
export function resolveHex(cssVar: string, fallback = '#ffffff'): string {
  const fb = normalizeHex(fallback) ?? '#ffffff'
  if (typeof window === 'undefined' || typeof document === 'undefined') return fb

  const name = cssVar.startsWith('--') ? cssVar : `--${cssVar}`
  const raw = readCustomProperty(name)
  if (!raw) return fb
  // 仍然带 var() 说明链没解开（例如循环引用），不能用
  if (raw.includes('var(')) return fb

  return normalizeHex(raw) ?? fb
}

function prefersDarkScheme(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** 主题判定：`html[data-theme]` 优先，缺省时跟随系统 */
function detectDark(): boolean {
  if (typeof document === 'undefined') return false
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'dark') return true
  if (attr === 'light') return false
  return prefersDarkScheme()
}

/** 全局共享状态：整页只解析一份、只挂一套监听 */
const state = reactive<BitsTokens>({
  primary: TOKEN_SPECS.primary.light,
  primaryDeep: TOKEN_SPECS.primaryDeep.light,
  canvas: TOKEN_SPECS.canvas.light,
  card: TOKEN_SPECS.card.light,
  online: TOKEN_SPECS.online.light,
  consolePurple: TOKEN_SPECS.consolePurple.light,
  previewPink: TOKEN_SPECS.previewPink.light,
  text: TOKEN_SPECS.text.light,
  isDark: false,
})

let listenersInstalled = false
let mediaQuery: MediaQueryList | null = null

function readTokens(): void {
  const dark = detectDark()
  state.isDark = dark

  const keys = Object.keys(TOKEN_SPECS) as TokenKey[]
  for (const key of keys) {
    const spec = TOKEN_SPECS[key]
    state[key] = resolveHex(spec.varName, dark ? spec.dark : spec.light)
  }
}

function onMediaChange(): void {
  // data-theme 显式设置时系统偏好不生效，readTokens 内部会再判一次
  readTokens()
}

/**
 * 安装一次全局监听：
 * - `html[data-theme]` 属性变化（TocToggles 写这个属性）
 * - `prefers-color-scheme` 变化（未手动切主题时跟随系统）
 *
 * 只在第一次调用时挂载，页面生命周期内常驻（监听器只依赖 documentElement，不会泄漏组件）。
 */
function installListeners(): void {
  if (listenersInstalled) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  listenersInstalled = true

  readTokens()

  // 首帧样式表可能还没生效，下一帧再读一次拿真实变量值
  window.requestAnimationFrame(() => readTokens())

  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => readTokens())
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
  }

  if (window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onMediaChange)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(onMediaChange)
    }
  }
}

/**
 * 取主题令牌（6 位 hex，可直接喂给 WebGL 组件的颜色 prop）。
 *
 * 返回的是全局共享的 reactive 对象：主题切换后所有使用方自动拿到新值，
 * 无需重新挂载组件（WebGL 侧由各自组件的 props watcher 同步 uniform）。
 */
export function useBitsTokens(): BitsTokens {
  installListeners()
  return state
}

/** 仅供测试/调试：强制重算一次（例如样式表异步注入后） */
export function refreshBitsTokens(): void {
  if (typeof document === 'undefined') return
  readTokens()
}
