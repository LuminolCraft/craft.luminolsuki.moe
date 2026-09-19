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

/**
 * metadata → 键排序稳定的 pretty JSON 文本（便于横向对比两条记录）。
 * 空 / null 返回空串，调用方据此显示「无」。
 */
export function formatAuditMetadata(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return ''
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(metadata).sort()) sorted[key] = metadata[key]
  return JSON.stringify(sorted, null, 2)
}
