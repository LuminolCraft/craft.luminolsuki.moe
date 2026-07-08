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

setupGsap()

// Lenis 惯性滚动初始化（触屏与 reduce-motion 跳过）
const lenisMm = gsap.matchMedia()
let lenisInstance: Lenis | null = null

lenisMm.add(
    {
        isDesktop: '(min-width: 769px) and (pointer: fine)',
        reduceMotion: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
        const { isDesktop, reduceMotion } = context.conditions!
        if (!isDesktop || reduceMotion) return

        lenisInstance = new Lenis({
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1.2,
            touchMultiplier: 1.5,
        })

        // Lenis scroll 事件同步到 ScrollTrigger
        lenisInstance.on('scroll', ScrollTrigger.update)

        // 用 gsap.ticker 驱动 lenis.raf()
        gsap.ticker.add((time) => {
            lenisInstance?.raf(time * 1000)
        })

        return () => {
            lenisInstance?.destroy()
            lenisInstance = null
        }
    },
)

const app = createApp(App)
const head = createHead()

app.use(head)
app.use(createPinia())
app.use(i18n)
app.use(router)

head.push({
    script: [
        {
            src: 'https://cloud.umami.is/script.js',
            'data-website-id': '99722dca-d63f-4f8a-91f0-429d18477455',
            defer: true,
        },
    ],
})
//<script defer src="https://cloud.umami.is/script.js" data-website-id="99722dca-d63f-4f8a-91f0-429d18477455"></script>
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
        link: [{ rel: 'canonical', href: currentUrl.split('?')[0] }]
    })
})

app.mount('#app')