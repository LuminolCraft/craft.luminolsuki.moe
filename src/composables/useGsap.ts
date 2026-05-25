import { onUnmounted, type Ref } from 'vue'
import gsap from 'gsap'

interface UseGsapOptions {
  scope?: Ref<HTMLElement | null> | HTMLElement | null
}

export function useGsap(options?: UseGsapOptions) {
  let ctx: gsap.Context | null = null

  function create(callback: (gsapInstance: typeof gsap) => void): void {
    const scopeEl = options?.scope
    const resolvedScope = scopeEl && 'value' in scopeEl ? scopeEl.value : scopeEl
    ctx = gsap.context(() => {
      callback(gsap)
    }, resolvedScope ?? undefined)
  }

  onUnmounted(() => {
    ctx?.revert()
  })

  return { create }
}
