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
 */
export type HomeLayout = 'artistic' | 'cinema' | 'bento'

/**
 * 当前激活的首页布局。
 *
 * 修改此值后刷新页面即可切换布局（Vite HMR 也会自动重载）。
 * 默认 `'artistic'` 以保留现有体验。
 */
export const CURRENT_LAYOUT: HomeLayout = 'bento'

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
 */
export type TeamStyle = 'artistic' | 'cinema' | 'bento'

/**
 * 当前激活的 team 样式。
 *
 * 修改此值后刷新页面即可切换 team section 样式（Vite HMR 也会自动重载）。
 * 默认 `'artistic'`，与 CURRENT_LAYOUT 解耦，可自由搭配。
 */
export const CURRENT_TEAM_STYLE: TeamStyle = 'artistic'
