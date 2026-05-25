import { CustomEase } from 'gsap/CustomEase'

const heroReveal = CustomEase.create(
  'heroReveal',
  'M0,0 C0.126,0.382 0.282,0.674 0.574,0.828 0.758,0.926 1,1 1,1',
)

export const EASINGS = {
  entrance: 'power3.out',
  exit: 'power3.in',
  hover: 'power2.out',
  press: 'power1.in',
  bounce: 'back.out(1.7)',
  elastic: 'elastic.out(1, 0.3)',
  smooth: 'power2.inOut',
  snappy: 'power4.out',
  heroReveal,
} as const
