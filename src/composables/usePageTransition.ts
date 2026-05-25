import { ref } from 'vue'
import gsap from 'gsap'

export function usePageTransition() {
  const isTransitioning = ref(false)

  function enterPage(container: HTMLElement): gsap.core.Timeline {
    isTransitioning.value = true
    const tl = gsap.timeline({
      onComplete: () => {
        isTransitioning.value = false
      },
    })

    tl.fromTo(
      container,
      { autoAlpha: 0, y: 40 },
      { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' },
    )

    return tl
  }

  function leavePage(container: HTMLElement): gsap.core.Timeline {
    isTransitioning.value = true
    return gsap
      .timeline({
        onComplete: () => {
          isTransitioning.value = false
        },
      })
      .to(container, {
        autoAlpha: 0,
        y: -20,
        duration: 0.3,
        ease: 'power2.in',
      })
  }

  return { isTransitioning, enterPage, leavePage }
}
