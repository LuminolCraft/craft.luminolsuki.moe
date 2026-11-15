/**
 * 新闻列表数据（服务端分页版）
 *
 * 与旧实现的区别：不再持有 NewsManager 实例、不再往 IndexedDB 写增量。
 * 唯一状态源是 URL query —— 刷新、分享、前进后退都复现同一屏；
 * 请求结果只做「当前 query 对应的那一页」的快照。
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { NewsListItem, NewsListResponse, NewsQuery } from '@/types/news'
import { fetchNewsList, fetchNewsReadCounts } from '@/utils/news/news-api'
import { NEWS_DEFAULT_LIMIT, parseNewsQuery } from '@/utils/news/news-query'

export function useNewsData() {
  const route = useRoute()

  /** 当前 query（响应式派生，组件只读）。 */
  const query = computed<NewsQuery>(() => parseNewsQuery(route.query, NEWS_DEFAULT_LIMIT))

  const items = ref<NewsListItem[]>([])
  const total = ref(0)
  const totalPages = ref(1)
  const loading = ref(true)
  const error = ref(false)
  const readCounts = ref<Record<number, number>>({})

  /** 竞态守卫：只接受最后一次请求的结果（快速切分类/翻页时旧请求可能后到）。 */
  let requestId = 0

  /** 拉取当前页；失败保留空列表并置错误态（由视图展示重试）。 */
  async function load(): Promise<void> {
    const current = ++requestId
    loading.value = true
    error.value = false

    try {
      const data: NewsListResponse = await fetchNewsList(query.value)
      if (current !== requestId) return
      items.value = data.items
      total.value = data.total
      totalPages.value = data.totalPages
    } catch {
      if (current !== requestId) return
      error.value = true
      items.value = []
      total.value = 0
      totalPages.value = 1
    } finally {
      if (current === requestId) loading.value = false
    }
  }

  /** 阅读数单独拉：失败静默，卡片不显示次数即可，不影响列表。 */
  async function loadReadCounts(): Promise<void> {
    readCounts.value = await fetchNewsReadCounts()
  }

  /** 重新加载（错误态重试按钮用）。 */
  async function reload(): Promise<void> {
    await Promise.all([load(), loadReadCounts()])
  }

  watch(
    () => route.query,
    () => {
      void load()
    },
    { immediate: true },
  )

  void loadReadCounts()

  return {
    query,
    items,
    total,
    totalPages,
    loading,
    error,
    readCounts,
    reload,
    loadReadCounts,
  }
}
