/**
 * 审计日志展示辅助（纯函数）。
 *
 * 事件目录来自后端 `GET /admin/audit/actions`（action + category）；这里只做
 * 「目录值 → i18n key」映射。未知事件 / 分类 / 目标类型不抛错、也不显示空白，
 * 调用方按 te() 判断后回退显示原始常量（后端加新事件时页面照常可用）。
 */

/** 事件标题 i18n key：`admin.audit.actions.<ACTION>`。 */
export function auditActionLabelKey(action: string): string {
  return `admin.audit.actions.${action}`
}

/** 分类标题 i18n key：`admin.audit.categories.<category>`。 */
export function auditCategoryLabelKey(category: string): string {
  return `admin.audit.categories.${category}`
}

/** 目标类型标题 i18n key：`admin.audit.targetTypes.<type>`。 */
export function auditTargetTypeLabelKey(type: string): string {
  return `admin.audit.targetTypes.${type}`
}

/** 是否为普通对象（非 null / 非数组）。 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * metadata 归一化成对象。
 *
 * 后端新版返回已解析对象；旧版后端 / 归档 JSONL 行返回的是 JSON 字符串。
 * 两者都接受：字符串尝试 JSON.parse，失败或非对象一律 null。
 *
 * 注意：**不要**对字符串直接做 Object.keys/展开——那会得到
 * `{"0":"{","1":"\"",…}` 这种按字符下标的结果（真实踩过的坑）。
 */
export function normalizeAuditMetadata(metadata: unknown): Record<string, unknown> | null {
  if (metadata === null || metadata === undefined) return null
  if (typeof metadata === 'string') {
    if (metadata.trim() === '') return null
    try {
      const parsed: unknown = JSON.parse(metadata)
      return isPlainObject(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return isPlainObject(metadata) ? metadata : null
}

/**
 * metadata → 键排序稳定的 pretty JSON 文本（便于横向对比两条记录）。
 * 空 / null / 无法归一化 返回空串，调用方据此显示「无」。
 */
export function formatAuditMetadata(metadata: unknown): string {
  const normalized = normalizeAuditMetadata(metadata)
  if (!normalized) return ''
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(normalized).sort()) sorted[key] = normalized[key]
  return JSON.stringify(sorted, null, 2)
}
