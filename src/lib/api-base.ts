/**
 * API 基地址解析（认证与业务接口共用）。
 *
 * 优先级：
 * 1. 构建环境变量 VITE_API_BASE_URL（本地 .env.* 或 Netlify 后台 / netlify.toml 均可覆盖）
 * 2. 未配置时按构建模式回退：
 *    - dev（pnpm dev）→ http://127.0.0.1:8787
 *    - 生产构建        → window.location.origin（同源：Netlify 将 /api/* 反代到
 *      Worker，Cookie 全部第一方；Worker 自域托管前端时同样适用）
 *
 * dev 回退用 127.0.0.1 而不是 localhost：本机 ::1:8787 曾被别的进程占着
 * （对任何请求回 502），localhost 在 Windows 上先解析 IPv6，会让整个
 * 前端数据层静默失败（表现为「新闻不存在」「登录不上」）。
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8787' : window.location.origin)
