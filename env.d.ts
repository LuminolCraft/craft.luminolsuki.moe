/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 基地址（可选）。未配置时由 src/lib/api-base.ts 按构建模式回退：dev → localhost:8787，生产构建 → https://api.craft.luminolsuki.moe */
  readonly VITE_API_BASE_URL?: string
}

declare module '*.json' {
  const content: any
  export default content
}
