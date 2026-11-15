/**
 * 新闻查询串 ↔ URL query 的双向转换（纯函数，可单测）
 *
 * 设计约束：**列表状态只存在于 URL**。分页、分类、标签、搜索、仅看重要
 * 全部写进 query，刷新、分享、前进后退都能复现同一屏内容；组件不维护
 * 第二份筛选状态，避免「UI 显示的筛选与请求参数不一致」这类漂移。
 */
import type { LocationQuery, LocationQueryValue } from 'vue-router'
import { NEWS_CATEGORIES, type NewsCategory, type NewsQuery } from '@/types/news'

/** 每页条数上限（与后端 schema 的 max 对齐）。 */
export const NEWS_MAX_LIMIT = 50

/** 默认每页条数：桌面 6、移动 6（与旧配置保持一致）。 */
export const NEWS_DEFAULT_LIMIT = 6

/** 单个 query 值取字符串（数组取第一个，undefined 容忍）。 */
function firstValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** 正整数解析，非法回退默认值。 */
function positiveInt(raw: string | undefined, fallback: number, max: number): number {
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

/** 分类合法性校验（非法值直接丢弃，不把脏参数带给后端）。 */
function parseCategory(raw: string | undefined): NewsCategory | undefined {
  return NEWS_CATEGORIES.includes(raw as NewsCategory) ? (raw as NewsCategory) : undefined
}

/** URL query → 查询对象。 */
export function parseNewsQuery(
  query: LocationQuery,
  defaultLimit: number = NEWS_DEFAULT_LIMIT,
): NewsQuery {
  const category = parseCategory(firstValue(query.category))
  const tag = firstValue(query.tag)
  const q = firstValue(query.q)
  const important = firstValue(query.important) === '1'

  return {
    page: positiveInt(firstValue(query.page), 1, 10_000),
    limit: positiveInt(firstValue(query.limit), defaultLimit, NEWS_MAX_LIMIT),
    ...(category ? { category } : {}),
    ...(tag ? { tag } : {}),
    ...(q ? { q } : {}),
    ...(important ? { important } : {}),
  }
}

/**
 * 查询对象 → URL query。
 *
 * 省略默认值（page=1、important=false、空筛选），让 URL 尽量短且语义清晰；
 * `limit` 只有与默认值不同才写进 URL。
 */
export function toLocationQuery(
  newsQuery: NewsQuery,
  defaultLimit: number = NEWS_DEFAULT_LIMIT,
): Record<string, string> {
  const result: Record<string, string> = {}
  if (newsQuery.page > 1) result.page = String(newsQuery.page)
  if (newsQuery.limit !== defaultLimit) result.limit = String(newsQuery.limit)
  if (newsQuery.category) result.category = newsQuery.category
  if (newsQuery.tag) result.tag = newsQuery.tag
  if (newsQuery.q) result.q = newsQuery.q
  if (newsQuery.important) result.important = '1'
  return result
}

/** 合并改动并回到第 1 页（改筛选条件时页码必须归位，否则会出现空页）。 */
export function patchNewsQuery(
  current: NewsQuery,
  patch: Partial<Omit<NewsQuery, 'page'>>,
  defaultLimit: number = NEWS_DEFAULT_LIMIT,
): Record<string, string> {
  return toLocationQuery({ ...current, ...patch, page: 1 }, defaultLimit)
}
