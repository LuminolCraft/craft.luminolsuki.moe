import { createI18n } from 'vue-i18n'
import zh from './locales/zh'
import en from './locales/en'

// 从localStorage获取保存的语言，如果没有则使用默认语言
const savedLocale = localStorage.getItem('locale')
const defaultLocale = savedLocale || 'zh'

// 创建i18n实例
const i18n = createI18n({
  legacy: false, // 使用组合式API
  locale: defaultLocale, // 默认语言
  fallbackLocale: 'en', // 回退语言
  messages: {
    zh,
    en
  }
})

export default i18n
