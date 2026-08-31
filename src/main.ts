import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { setupGsap } from '@/gsap'
import { lenisScrollDirective, destroyAllInstances } from '@/directives/lenisScroll'
import { lenisInstances } from '@/utils/lenisInstances'

setupGsap()

// ---------- 全局 Lenis（窗口滚动）----------
const lenisMm = gsap.matchMedia()
let globalLenis: Lenis | null = null

lenisMm.add(
  {
    isDesktop: '(min-width: 769px) and (pointer: fine)',
    reduceMotion: '(prefers-reduced-motion: reduce)',
  },
  (context) => {
    const { isDesktop, reduceMotion } = context.conditions!
    if (!isDesktop || reduceMotion) return

    globalLenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.2,
      touchMultiplier: 1.5,
      // 关键：全局 Lenis 不处理任何内部可滚动容器的滚轮事件，让它们使用原生滚动或自己的 Lenis
      prevent: (node) => {
        
        let el = node as HTMLElement | null
        while (el && el !== document.documentElement) {
          const style = window.getComputedStyle(el)
          const overflowY = style.overflowY
          if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
            return true // 让内部容器自己处理滚动
          }
          el = el.parentElement
        }
        // 如果事件发生在带有 data-lenis-scroll 属性的元素内，则返回 true，让该元素自己的 Lenis 处理
        return node.closest('[data-lenis-scroll]') !== null
      }
    })

    globalLenis.on('scroll', ScrollTrigger.update)
    lenisInstances.push(globalLenis)

    // 统一使用 gsap.ticker 驱动所有 Lenis 实例（包括全局和内部容器）
    const tickerCallback = (time: number) => {
      const timestamp = time * 1000
      lenisInstances.forEach((instance) => instance.raf(timestamp))
    }
    gsap.ticker.add(tickerCallback)

    // 返回清理函数（当媒体查询条件变化时执行）
    return () => {
      // 移除 ticker 回调
      gsap.ticker.remove(tickerCallback)

      // 销毁全局 Lenis
      const index = lenisInstances.indexOf(globalLenis!)
      if (index > -1) lenisInstances.splice(index, 1)
      globalLenis?.destroy()
      globalLenis = null

      // 同时销毁所有由指令创建的内部 Lenis 实例
      destroyAllInstances()
    }
  }
)

// ---------- 创建 Vue 应用 ----------
const app = createApp(App)
const head = createHead()

app.use(head)
app.use(createPinia())
app.use(i18n)
app.use(router)

// 注册自定义指令
app.directive('lenis-scroll', lenisScrollDirective)

// Umami 统计脚本
head.push({
  script: [
    {
      src: 'https://cloud.umami.is/script.js',
      'data-website-id': '99722dca-d63f-4f8a-91f0-429d18477455',
      defer: true,
    },
  ],
})

// 路由元数据 SEO 处理（保持原有逻辑）
router.beforeEach((to) => {
  const og = to.meta.og as any
  if (!og) return

  const image = og.image || {}
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  head.push({
    title: og.title || 'LuminolCraft',
    meta: [
      { name: 'description', content: og.description },
      { name: 'robots', content: 'index, follow' },
      { property: 'og:title', content: og.title },
      { property: 'og:description', content: og.description },
      { property: 'og:image', content: image.url },
      { property: 'og:image:width', content: image.width || 1200 },
      { property: 'og:image:height', content: image.height || 630 },
      { property: 'og:type', content: to.name === 'newsdetail' ? 'article' : 'website' },
      { property: 'og:site_name', content: 'LuminolCraft 服务器' },
      { property: 'og:url', content: currentUrl },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: og.title },
      { name: 'twitter:description', content: og.description },
      { name: 'twitter:image', content: image.url },
    ],
    link: [{ rel: 'canonical', href: currentUrl.split('?')[0] }],
  })
})

app.mount('#app')