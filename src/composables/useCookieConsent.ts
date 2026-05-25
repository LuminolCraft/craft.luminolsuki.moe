export type ConsentState = 'accepted' | 'declined' | null

const STORAGE_KEY = 'cookie_consent'

export function useCookieConsent() {
  function getConsent(): ConsentState {
    try {
      const local = localStorage.getItem(STORAGE_KEY)
      if (local === 'accepted') {
        return 'accepted'
      }
      // 兼容旧数据：清除 localStorage 中残留的 'declined'
      if (local === 'declined') {
        localStorage.removeItem(STORAGE_KEY)
      }

      const session = sessionStorage.getItem(STORAGE_KEY)
      if (session === 'declined') {
        return 'declined'
      }

      return null
    } catch (e) {
      console.warn('[CookieConsent] Failed to read consent:', e)
      return null
    }
  }

  function setConsent(state: 'accepted' | 'declined'): void {
    try {
      if (state === 'accepted') {
        localStorage.setItem(STORAGE_KEY, state)
        sessionStorage.removeItem(STORAGE_KEY)
      } else {
        sessionStorage.setItem(STORAGE_KEY, state)
        // 清除 localStorage 中可能残留的旧 'declined'
        if (localStorage.getItem(STORAGE_KEY) === 'declined') {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (e) {
      console.warn('[CookieConsent] Failed to write consent:', e)
    }
  }

  return {
    getConsent,
    setConsent,
  }
}
