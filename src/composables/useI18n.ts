import { computed } from 'vue'
import { useI18n as useVueI18n } from 'vue-i18n'
import type { Ref, ComputedRef } from 'vue'

export type Lang = 'zh' | 'en'

export interface I18nContextValue {
  lang: ComputedRef<Lang>
  toggleLang: () => void
  t: (key: string) => string
}

export function useI18n(): I18nContextValue {
  const { locale, t } = useVueI18n()

  const lang = computed<Lang>(() => {
    const val = locale.value
    return val === 'en' ? 'en' : 'zh'
  })

  const toggleLang = () => {
    locale.value = locale.value === 'zh' ? 'en' : 'zh'
    localStorage.setItem('locale', locale.value)
  }

  return { lang, toggleLang, t }
}
