/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 添加BackgroundSlider到window对象的类型定义
declare global {
  interface Window {
    BackgroundSlider: any;
  }
}
