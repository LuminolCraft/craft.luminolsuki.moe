import gsap from 'gsap'

export function setupGsapDefaults(): void {
  gsap.defaults({
    duration: 0.6,
    ease: 'power2.out',
    overwrite: 'auto',
  })
}
