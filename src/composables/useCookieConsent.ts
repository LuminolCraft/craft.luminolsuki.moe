export type ConsentState = 'accepted' | 'declined' | null

const STORAGE_KEY = 'cookie_consent'

export function useCookieConsent() {
  function getConsent(): ConsentState {
    try {
      const value = localStorage.getItem(STORAGE_KEY)
      if (value === 'accepted' || value === 'declined') {
        return value
      }
      return null
    } catch (e) {
      console.warn('[CookieConsent] Failed to read consent from localStorage:', e)
      return null
    }
  }

  function setConsent(state: 'accepted' | 'declined'): void {
    try {
      localStorage.setItem(STORAGE_KEY, state)
    } catch (e) {
      console.warn('[CookieConsent] Failed to write consent to localStorage:', e)
    }
  }

  return {
    getConsent,
    setConsent,
  }
}
