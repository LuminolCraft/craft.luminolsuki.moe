import { onUnmounted, type Ref } from 'vue'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

interface UseScrollTriggerOptions {
  trigger: Ref<HTMLElement | null> | string
  start?: string
  end?: string
  scrub?: boolean | number
  pin?: boolean
  markers?: boolean
  once?: boolean
}

export function useScrollTrigger(_options: UseScrollTriggerOptions) {
  const triggers: ScrollTrigger[] = []

  function refresh(): void {
    ScrollTrigger.refresh()
  }

  onUnmounted(() => {
    triggers.forEach((t) => t.kill())
  })

  return { triggers, refresh }
}
