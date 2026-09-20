/**
 * 第三方单文件库的类型声明（库本身是 vendored 的构建产物，不带类型）。
 *
 * canvas-confetti 1.9.4（MIT，https://github.com/catdad/canvas-confetti）：
 * jsDelivr 的 ESM 构建落在 src/vendor/canvas-confetti.esm.js，这里只声明用到的那部分 API。
 */
declare module '*/canvas-confetti.esm.js' {
  /** canvas-confetti 的调用选项（只列出本仓库用到的字段） */
  export interface ConfettiOptions {
    particleCount?: number
    angle?: number
    spread?: number
    startVelocity?: number
    decay?: number
    gravity?: number
    drift?: number
    ticks?: number
    origin?: { x?: number; y?: number }
    colors?: string[]
    shapes?: Array<'square' | 'circle' | 'star' | unknown>
    scalar?: number
    zIndex?: number
    disableForReducedMotion?: boolean
    resize?: boolean
    flat?: boolean
  }

  export interface ConfettiInstance {
    (options?: ConfettiOptions): Promise<null> | null
    reset: () => void
    create: (canvas?: HTMLCanvasElement, options?: { resize?: boolean }) => ConfettiInstance
    /** 把文本（如 emoji）转成可用的粒子形状（canvas-confetti 1.6+） */
    shapeFromText: (options: { text: string; scalar?: number; color?: string }) => unknown
  }

  const confetti: ConfettiInstance
  export default confetti
}
