/**
 * 新闻筛选的 URL 写入层
 *
 * 筛选值只有一份真相：URL query。组件调用这里的 `setCategory` / `setTag` /
 * `setSearch`，由 router 驱动 `useNewsData` 重新拉取——不在内存里维护第二份
 * 筛选状态，也就不存在「界面选中的标签和实际请求不一致」。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { NewsCategory, NewsQuery } from '@/types/news'
import {
  NEWS_DEFAULT_LIMIT,
  parseNewsQuery,
  patchNewsQuery,
  toLocationQuery,
} from '@/utils/news/news-query'

export function useNewsFilter() {
  const route = useRoute()
  const router = useRouter()

  const query = computed<NewsQuery>(() => parseNewsQuery(route.query, NEWS_DEFAULT_LIMIT))

  /** 覆盖式跳转（保留当前每页条数，筛选一律回到第 1 页）。 */
  function apply(patch: Partial<Omit<NewsQuery, 'page'>>): void {
    void router.push({ query: patchNewsQuery(query.value, patch, NEWS_DEFAULT_LIMIT) })
  }

  function setCategory(category: NewsCategory | undefined): void {
    apply({ category })
  }

  /** 标签单选：再次点击同一个标签即取消（URL 里不留空值）。 */
  function setTag(tag: string | undefined): void {
    apply({ tag: tag === query.value.tag ? undefined : tag })
  }

  function setSearch(q: string): void {
    const trimmed = q.trim()
    apply({ q: trimmed.length > 0 ? trimmed : undefined })
  }

  /** 清空全部筛选（保留每页条数）。 */
  function reset(): void {
    void router.push({
      query: toLocationQuery({ page: 1, limit: query.value.limit }, NEWS_DEFAULT_LIMIT),
    })
  }

  return {
    query,
    setCategory,
    setTag,
    setSearch,
    reset,
  }
}
