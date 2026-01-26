declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
  }

declare module 'lodash/debounce' {
  import { debounce } from 'lodash'
  export default debounce
}

declare global {
  interface Window {
    debugMode?: boolean
    DebugManager?: any
  }
}