/**
 * 首页布局切换配置
 *
 * 控制首页（Home.vue）渲染哪一套 section 布局。
 * 切换布局只需修改下方 CURRENT_LAYOUT 常量值，无需改动路由 / 导航栏 / 返回按钮。
 *
 * 可选值：
 * - `'artistic'`：Z 形偏移 + 有机旋转卡片 + pin-scrub（当前默认，来自 art-direct-homepage-composition spec）
 * - `'cinema'`：影院式非对称冲击构图（全屏色块 + 巨型编号 + 四角非对称 + servers 横向条带 + cinematic pin 视差）
 * - `'bento'`：经典 Bento Grid（features 2×3 + servers auto-fit + team 4×3 asymmetric，恢复自 git HEAD 14013c7）
 * - `'random'`：每次页面加载/刷新随机三选一（artistic/cinema/bento，未来新增自动参与），生命周期内被缓存，所有组件读到一致结果
 *
 * 未来扩展：新增主题只需① 向类型字面量追加；② 向对应 OPTIONS 数组追加；③ 在消费方 COMPONENT_MAP 中补组件映射（TS 会在缺映射时报错）
 */
export type HomeLayout = 'artistic' | 'cinema' | 'bento' | 'random'
export type ResolvedHomeLayout = Exclude<HomeLayout, 'random'>

export const HOME_LAYOUT_OPTIONS: readonly ResolvedHomeLayout[] = ['artistic', 'cinema', 'bento'] as const

/**
 * 当前激活的首页布局。
 *
 * 修改此值后刷新页面即可切换布局（Vite HMR 也会自动重载）。
 * 默认 `'artistic'` 以保留现有体验。
 */
export const CURRENT_LAYOUT: HomeLayout = 'artistic'

/**
 * team 区域（团队成员展示）的样式风格。
 *
 * 与上方布局样式（HomeLayout / CURRENT_LAYOUT）相互独立，可任意组合。
 * 例如：`CURRENT_LAYOUT = 'bento'` + `CURRENT_TEAM_STYLE = 'cinema'`
 * 表示 bento 布局骨架 + cinema 风格的 team section。
 *
 * 可选值：
 * - `'artistic'`：Z 形偏移 + 有机旋转卡片（当前默认）
 * - `'cinema'`：影院式非对称冲击构图
 * - `'bento'`：经典 Bento Grid 4×3 非对称排列
 * - `'random'`：每次页面加载/刷新随机三选一（artistic/cinema/bento，未来新增自动参与），生命周期内被缓存，所有组件读到一致结果
 *
 * 未来扩展：新增主题只需① 向类型字面量追加；② 向对应 OPTIONS 数组追加；③ 在消费方 COMPONENT_MAP 中补组件映射（TS 会在缺映射时报错）
 */
export type TeamStyle = 'artistic' | 'cinema' | 'bento' | 'random'
export type ResolvedTeamStyle = Exclude<TeamStyle, 'random'>

export const TEAM_STYLE_OPTIONS: readonly ResolvedTeamStyle[] = ['artistic', 'cinema', 'bento'] as const

/**
 * 当前激活的 team 样式。
 *
 * 修改此值后刷新页面即可切换 team section 样式（Vite HMR 也会自动重载）。
 * 默认 `'artistic'`，与 CURRENT_LAYOUT 解耦，可自由搭配。
 */
export const CURRENT_TEAM_STYLE: TeamStyle = 'bento'

let _resolvedLayoutCache: ResolvedHomeLayout | null = null
let _resolvedTeamStyleCache: ResolvedTeamStyle | null = null

export function resolveLayout(input: HomeLayout = CURRENT_LAYOUT): ResolvedHomeLayout {
  if (input !== 'random') return input as ResolvedHomeLayout
  if (_resolvedLayoutCache === null) {
    const idx = Math.floor(Math.random() * HOME_LAYOUT_OPTIONS.length)
    _resolvedLayoutCache = HOME_LAYOUT_OPTIONS[idx]!
  }
  return _resolvedLayoutCache
}

export function resolveTeamStyle(input: TeamStyle = CURRENT_TEAM_STYLE): ResolvedTeamStyle {
  if (input !== 'random') return input as ResolvedTeamStyle
  if (_resolvedTeamStyleCache === null) {
    const idx = Math.floor(Math.random() * TEAM_STYLE_OPTIONS.length)
    _resolvedTeamStyleCache = TEAM_STYLE_OPTIONS[idx]!
  }
  return _resolvedTeamStyleCache
}
