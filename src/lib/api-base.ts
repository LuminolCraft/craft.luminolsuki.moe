/**
 * API 基地址解析（认证与业务接口共用）。
 *
 * 优先级：
 * 1. 构建环境变量 VITE_API_BASE_URL（本地 .env.* 或 Netlify 后台 / netlify.toml 均可覆盖）
 * 2. 未配置时按构建模式回退：
 *    - dev（pnpm dev）→ http://localhost:8787
 *    - 生产构建        → window.location.origin（同源：Netlify 将 /api/* 反代到
 *      Worker，Cookie 全部第一方；Worker 自域托管前端时同样适用）
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:8787' : window.location.origin)
