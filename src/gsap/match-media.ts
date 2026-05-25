import gsap from 'gsap'

export const globalMatchMedia = gsap.matchMedia()

globalMatchMedia.add(
  {
    isDesktop: '(min-width: 1024px)',
    isTablet: '(min-width: 768px) and (max-width: 1023px)',
    isMobile: '(max-width: 767px)',
    reduceMotion: '(prefers-reduced-motion: reduce)',
  },
  (_context) => {
    // 全局 matchMedia handler — 各 composable/组件 自行创建局部 matchMedia 实例处理具体动画
  },
)
