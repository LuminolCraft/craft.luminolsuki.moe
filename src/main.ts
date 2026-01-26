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

app.mount('#app')
