/**
 * 新闻领域类型（`/api/v1/news*` 拆包后的 data 形状）
 *
 * 契约与后端 `src/modules/news/news.service.ts` 的 View 严格对齐：
 * - 列表不返回正文（`body` 只在详情里），避免一次拉全部内容；
 * - `publishedAt` / `updatedAt` 为 epoch 毫秒；`null` 只可能出现在草稿；
 * - `tags` 由服务端解析 JSON 列后下发，前端不再自己 split。
 */

/** 分类枚举（与后端 CHECK 约束一致，顺序即展示顺序）。 */
export const NEWS_CATEGORIES = [
  'announcement',
  'update',
  'event',
  'guide',
  'devlog',
  'moderation',
] as const

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]

/** 列表项（卡片渲染所需字段）。 */
export interface NewsListItem {
  id: number
  slug: string
  title: string
  description: string
  category: NewsCategory
  tags: string[]
  coverUrl: string | null
  /** 列表置顶 */
  pinned: boolean
  /** 重要公告（通知栏置顶区 + 卡片徽标） */
  isImportant: boolean
  publishedAt: number | null
  updatedAt: number
  /** 字数（服务端按 CJK 逐字 / 拉丁分词统计） */
  wordCount: number
  /** 预计阅读分钟数 */
  readingMinutes: number
}

/** 详情（含正文与公告字段）。 */
export interface NewsDetail extends NewsListItem {
  body: string
  status: 'draft' | 'published'
  /** 公告展示截止时间；过期后不再进通知栏 */
  noticeExpiresAt: number | null
  createdAt: number
}

/** 列表查询参数（全部进 URL query，可分享）。 */
export interface NewsQuery {
  page: number
  limit: number
  category?: NewsCategory
  tag?: string
  q?: string
  important?: boolean
}

/** 分页响应。 */
export interface NewsListResponse {
  items: NewsListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/** 标签聚合。 */
export interface NewsTagCount {
  tag: string
  count: number
}

/** 分类聚合（六项全量，无内容时为 0）。 */
export interface NewsCategoryCount {
  category: NewsCategory
  count: number
}

/** 归档月份聚合（只有月份与条数）。 */
export interface NewsArchiveMonth {
  month: string
  count: number
}
