import { CustomEase } from 'gsap/CustomEase'

let heroRevealEase: EaseFunction | undefined

export const EASINGS = {
  entrance: 'power3.out',
  exit: 'power3.in',
  hover: 'power2.out',
  press: 'power1.in',
  bounce: 'back.out(1.7)',
  elastic: 'elastic.out(1, 0.3)',
  smooth: 'power2.inOut',
  snappy: 'power4.out',
  parallax: 'none',
  tilt: 'power3.out',
  get heroReveal(): EaseFunction {
    if (!heroRevealEase) {
      heroRevealEase = CustomEase.create('heroReveal', 'M0,0 C0.25,1 0.5,1 1,1')
    }
    return heroRevealEase
  },
} as const
