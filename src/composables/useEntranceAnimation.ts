import { type Ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { EASINGS } from '@/gsap'

type EntranceType = 'fadeUp' | 'fadeIn' | 'scaleIn' | 'slideLeft' | 'slideRight'

interface EntranceOptions {
  type?: EntranceType
  stagger?: number | object
  scrollTrigger?: boolean
  delay?: number
}

const VARIANT_MAP: Record<EntranceType, gsap.TweenVars> = {
  fadeUp: { autoAlpha: 0, y: 40 },
  fadeIn: { autoAlpha: 0 },
  scaleIn: { autoAlpha: 0, scale: 0.9 },
  slideLeft: { autoAlpha: 0, x: -60 },
  slideRight: { autoAlpha: 0, x: 60 },
}

export function useEntranceAnimation(
  targets: Ref<HTMLElement | null> | string,
  options?: EntranceOptions,
) {
  function animate(): gsap.core.Tween | gsap.core.Timeline {
    const type = options?.type ?? 'fadeUp'
    const fromVars = { ...VARIANT_MAP[type] }

    const tweenVars: gsap.TweenVars = {
      ...fromVars,
      duration: 0.8,
      ease: EASINGS.entrance,
      delay: options?.delay ?? 0,
      stagger: options?.stagger,
    }

    if (options?.scrollTrigger) {
      tweenVars.scrollTrigger = {
        trigger: typeof targets === 'string' ? targets : targets.value,
        start: 'top 85%',
        once: true,
      }
    }

    const target =
      typeof targets === 'string' ? targets : targets.value!

    return gsap.from(target, tweenVars)
  }

  return { animate }
}
