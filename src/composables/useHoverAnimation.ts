import { onUnmounted, type Ref } from 'vue'
import gsap from 'gsap'
import { DURATIONS, EASINGS } from '@/gsap'

export function useHoverAnimation(target: Ref<HTMLElement | null>) {
  let enterTween: gsap.core.Tween | null = null
  let leaveTween: gsap.core.Tween | null = null

  function bind(
    hoverVars: gsap.TweenVars = {},
    leaveVars?: gsap.TweenVars,
  ): () => void {
    const el = target.value
    if (!el) return () => {}

    const onEnter = () => {
      leaveTween?.kill()
      enterTween = gsap.to(el, {
        scale: 1.03,
        y: -2,
        duration: DURATIONS.hover,
        ease: EASINGS.hover,
        overwrite: 'auto',
        ...hoverVars,
      })
    }

    const onLeave = () => {
      enterTween?.kill()
      leaveTween = gsap.to(el, {
        scale: 1,
        y: 0,
        duration: DURATIONS.hover,
        ease: EASINGS.hover,
        overwrite: 'auto',
        ...leaveVars,
      })
    }

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)

    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
    }
  }

  onUnmounted(() => {
    enterTween?.kill()
    leaveTween?.kill()
  })

  return { bind }
}
