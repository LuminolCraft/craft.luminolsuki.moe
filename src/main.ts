import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './styles/theme-colors.css'

const app = createApp(App)
const head = createHead()

app.use(head)
app.use(createPinia())
app.use(i18n)
app.use(router)



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