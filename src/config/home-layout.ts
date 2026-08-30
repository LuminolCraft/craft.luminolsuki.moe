/**
 * 首页布局配置
 *
 * Layout 固定为 bento（LayoutCSections），不再支持切换/随机。
 * team 区域样式仍支持多主题切换，见下方 TeamStyle。
 */

/**
 * team 区域（团队成员展示）的样式风格。
 *
 * 可选值：
 * - `'artistic'`：Z 形偏移 + 有机旋转卡片
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
 */
export const CURRENT_TEAM_STYLE: TeamStyle = 'random'

let _resolvedTeamStyleCache: ResolvedTeamStyle | null = null

export function resolveTeamStyle(input: TeamStyle = CURRENT_TEAM_STYLE): ResolvedTeamStyle {
  if (input !== 'random') return input as ResolvedTeamStyle
  if (_resolvedTeamStyleCache === null) {
    const idx = Math.floor(Math.random() * TEAM_STYLE_OPTIONS.length)
    _resolvedTeamStyleCache = TEAM_STYLE_OPTIONS[idx]!
  }
  return _resolvedTeamStyleCache
}
