/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 基地址（可选）。未配置时由 src/lib/api-base.ts 按构建模式回退：dev → localhost:8787，生产构建 → https://api.craft.luminolsuki.moe */
  readonly VITE_API_BASE_URL?: string
  /**
   * 站内通知 WebSocket 的基地址（可选，必须能直连到 Worker）。
   *
   * 生产环境 **不能** 用同源：Netlify 反代会剥离 `Upgrade` 头，同源 WS 建不起来，
   * 故生产指向 `https://luminolcraft-nexus.narcssu.top`，鉴权走一次性 ticket。
   */
  readonly VITE_WS_BASE_URL?: string
}

declare module '*.json' {
  const content: any
  export default content
}
