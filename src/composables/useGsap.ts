import { onUnmounted, type Ref } from 'vue'
import gsap from 'gsap'

interface UseGsapOptions {
  scope?: Ref<HTMLElement | null> | HTMLElement | null
}

export function useGsap(options?: UseGsapOptions) {
  let ctx: gsap.Context | null = null

  /**
   * Wraps `gsap.context(callback, scope)`: all GSAP animations and
   * ScrollTriggers created inside `callback` are scoped to the element passed
   * via `options.scope` and tracked for cleanup. `ctx.revert()` is invoked
   * automatically in `onUnmounted` so tweens/ScrollTriggers are killed and
   * inline styles are reverted when the component unmounts.
   *
   * @param callback receives the `gsap` instance to build animations with.
   */
  function create(callback: (gsapInstance: typeof gsap) => void): void {
    const scopeEl = options?.scope
    const resolvedScope = scopeEl && 'value' in scopeEl ? scopeEl.value : scopeEl
    ctx = gsap.context(() => {
      callback(gsap)
    }, resolvedScope ?? undefined)
  }

  /**
   * Returns `true` when the user has requested reduced motion
   * (`prefers-reduced-motion: reduce`). SSR-safe: returns `false` when
   * `matchMedia` is unavailable.
   */
  function reduceMotion(): boolean {
    if (typeof matchMedia !== 'undefined') {
      return matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  }

  onUnmounted(() => {
    ctx?.revert()
  })

  return { create, reduceMotion }
}
