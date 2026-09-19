/**
 * 审计展示辅助单测：未知值回退、metadata 格式化稳定性。
 */
import { describe, expect, it } from 'vitest'
import {
  auditActionLabelKey,
  auditCategoryLabelKey,
  auditTargetTypeLabelKey,
  formatAuditMetadata,
} from './audit'

describe('审计展示辅助', () => {
  it('label key 由原始值拼出，未知值同样可用（不抛错）', () => {
    expect(auditActionLabelKey('BAN_CREATE')).toBe('admin.audit.actions.BAN_CREATE')
    expect(auditActionLabelKey('FUTURE_EVENT')).toBe('admin.audit.actions.FUTURE_EVENT')
    expect(auditCategoryLabelKey('ban')).toBe('admin.audit.categories.ban')
    expect(auditTargetTypeLabelKey('minecraft_account')).toBe(
      'admin.audit.targetTypes.minecraft_account',
    )
  })

  it('metadata：键排序稳定 + 两空格缩进；空值与 null 返回空串', () => {
    expect(formatAuditMetadata(null)).toBe('')
    expect(formatAuditMetadata(undefined)).toBe('')
    expect(formatAuditMetadata({})).toBe('{}')
    expect(formatAuditMetadata({ b: 1, a: { y: 2, x: 3 } })).toBe(
      JSON.stringify({ a: { y: 2, x: 3 }, b: 1 }, null, 2),
    )
  })
})
