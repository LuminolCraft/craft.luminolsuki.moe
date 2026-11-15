/**
 * 新闻分页（URL 驱动）
 *
 * 页码同样只存在 URL 里：`goTo(3)` 就是改 query 的 `page`，由 `useNewsData`
 * 的 watch 触发重新拉取。这里只负责边界判断与相邻页计算。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Ref } from 'vue'
import { NEWS_DEFAULT_LIMIT, parseNewsQuery } from '@/utils/news/news-query'

export function useNewsPagination(totalPages: Ref<number>) {
  const route = useRoute()
  const router = useRouter()

  const currentPage = computed(() => parseNewsQuery(route.query, NEWS_DEFAULT_LIMIT).page)
  const canPrev = computed(() => currentPage.value > 1)
  const canNext = computed(() => currentPage.value < totalPages.value)

  /** 跳到指定页（越界不跳，避免把用户停在空页）。 */
  function goTo(page: number): void {
    if (!Number.isInteger(page) || page < 1 || page > totalPages.value) return
    if (page === currentPage.value) return
    void router.push({ query: { ...route.query, page: String(page) } })
  }

  const prevPage = (): void => goTo(currentPage.value - 1)
  const nextPage = (): void => goTo(currentPage.value + 1)

  return { currentPage, totalPages, canPrev, canNext, goTo, prevPage, nextPage }
}
