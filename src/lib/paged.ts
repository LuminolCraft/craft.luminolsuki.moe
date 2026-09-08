import type { Paged } from '@/types/nexus'

/**
 * 分页响应容错归一化。
 * 后端分页合同（items/total/page/limit）以实际实现为准：
 * - 兼容裸数组（无分页信息）
 * - 兼容 { items, total, page, limit }
 * - 兼容 { list, total } 等常见别名
 */
export function normalizePaged<T>(data: unknown): Paged<T> {
  if (Array.isArray(data)) {
    return { items: data as T[] }
  }
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>
    const items = (obj.items ?? obj.list ?? obj.rows ?? []) as T[]
    const total = typeof obj.total === 'number' ? obj.total : undefined
    const page = typeof obj.page === 'number' ? obj.page : undefined
    const limit = typeof obj.limit === 'number' ? obj.limit : undefined
    return { items, total, page, limit }
  }
  return { items: [] }
}
