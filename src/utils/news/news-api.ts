/**
 * 新闻 API 客户端（唯一的 HTTP 出口）
 *
 * 不复用旧的 `NewsManager`：那一层同时承担 IndexedDB 增量、指纹比对、
 * 分页筛选，改一处牵三处。现在服务端已经给出分页与筛选能力，前端只做
 * 「拼 query → 发请求 → 返回数据」，缓存交给 HTTP（ETag / Cache-Control）。
 *
 * 统一走 `@/lib/api` 的 axios 实例：自带信封拆包、超时、错误码结构化，
 * 与站内其它模块同一套错误处理，不重复造轮子。
 */
import { api } from '@/lib/api'
import type {
  NewsArchiveMonth,
  NewsCategoryCount,
  NewsDetail,
  NewsListItem,
  NewsListResponse,
  NewsQuery,
  NewsTagCount,
} from '@/types/news'

/** 查询对象 → query string（省略空值）。 */
function toSearchParams(query: NewsQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('limit', String(query.limit))
  if (query.category) params.set('category', query.category)
  if (query.tag && query.tag.length > 0) params.set('tag', query.tag.join(','))
  if (query.q) params.set('q', query.q)
  if (query.important) params.set('important', '1')
  return params.toString()
}

/** 新闻列表（服务端分页 + 筛选 + 排序）。 */
export function fetchNewsList(query: NewsQuery): Promise<NewsListResponse> {
  return api.get<NewsListResponse>(`/news?${toSearchParams(query)}`)
}

/** 单篇详情：slug 或旧数字 id 都由服务端兼容。 */
export function fetchNewsDetail(key: string | number): Promise<NewsDetail> {
  return api.get<NewsDetail>(`/news/${encodeURIComponent(String(key))}`)
}

/** 标签全集与计数。 */
export async function fetchNewsTags(): Promise<NewsTagCount[]> {
  const data = await api.get<{ tags: NewsTagCount[] }>('/news/tags')
  return data.tags
}

/** 分类聚合（六项全量）。 */
export async function fetchNewsCategories(): Promise<NewsCategoryCount[]> {
  const data = await api.get<{ categories: NewsCategoryCount[] }>('/news/categories')
  return data.categories
}

/** 归档月份。 */
export async function fetchNewsArchive(): Promise<NewsArchiveMonth[]> {
  const data = await api.get<{ months: NewsArchiveMonth[] }>('/news/archive')
  return data.months
}

/** 批量阅读数（失败时返回空对象：卡片不显示次数，不影响列表）。 */
export async function fetchNewsReadCounts(): Promise<Record<number, number>> {
  try {
    const data = await api.get<{ counts: Record<string, number> }>('/news/read-counts')
    const counts: Record<number, number> = {}
    for (const [rawId, count] of Object.entries(data.counts ?? {})) {
      const id = Number(rawId)
      if (Number.isSafeInteger(id) && id > 0 && typeof count === 'number') counts[id] = count
    }
    return counts
  } catch {
    return {}
  }
}

/**
 * 上报一次阅读，返回服务端最新计数；失败返回 null（详情页不显示次数）。
 *
 * 去重与防刷在服务端（同访客同日 KV 去重 + per-IP 限流），前端不做本地去重。
 */
export async function recordNewsRead(id: number): Promise<number | null> {
  try {
    const data = await api.post<{ readCount: number }>(`/news/${id}/read`)
    return typeof data.readCount === 'number' ? data.readCount : null
  } catch {
    return null
  }
}

/** 列表项 → 卡片渲染用（保持引用稳定，避免下游重复判空）。 */
export function isNewsListItem(value: unknown): value is NewsListItem {
  return Boolean(value) && typeof (value as NewsListItem).slug === 'string'
}
