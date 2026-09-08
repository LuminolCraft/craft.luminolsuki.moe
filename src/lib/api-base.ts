/**
 * API 基地址解析（认证与业务接口共用）。
 *
 * 优先级：
 * 1. 构建环境变量 VITE_API_BASE_URL（本地 .env.* 或 Netlify 后台 / netlify.toml 均可覆盖）
 * 2. 未配置时按构建模式回退——保证 Netlify 从 git 构建时零环境变量配置也能指向生产 API：
 *    - dev（pnpm dev）→ http://localhost:8787
 *    - 生产构建        → https://api.craft.luminolsuki.moe
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:8787' : 'https://api.craft.luminolsuki.moe')
