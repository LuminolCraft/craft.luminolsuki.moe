export interface LastViewedNews {
  id: number
  title: string
}

const COOKIE_NAME = 'last_viewed_news'
const MAX_AGE_SECONDS = 2592000 // 30 days

export function useLastViewedCookie() {
  function getLastViewedNews(): LastViewedNews | null {
    try {
      const match = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${COOKIE_NAME}\\s*=\\s*([^;]*)`)
      )
      if (!match || !match[1]) return null

      const decoded = decodeURIComponent(match[1])
      const parsed = JSON.parse(decoded)

      if (
        parsed &&
        typeof parsed.id === 'number' &&
        typeof parsed.title === 'string' &&
        parsed.title.length > 0
      ) {
        return { id: parsed.id, title: parsed.title }
      }
      return null
    } catch (e) {
      console.warn('[LastViewedCookie] Failed to parse cookie:', e)
      return null
    }
  }

  function setLastViewedNews(id: number, title: string): void {
    try {
      const value = JSON.stringify({ id, title })
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`
    } catch (e) {
      console.warn('[LastViewedCookie] Failed to set cookie:', e)
    }
  }

  function clearLastViewedNews(): void {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
  }

  return {
    getLastViewedNews,
    setLastViewedNews,
    clearLastViewedNews,
  }
}
