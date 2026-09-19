/**
 * 审计展示辅助单测：未知值回退、metadata 格式化稳定性。
 */
import { describe, expect, it } from 'vitest'
import {
  auditActionLabelKey,
  auditCategoryLabelKey,
  auditTargetTypeLabelKey,
  formatAuditMetadata,
  normalizeAuditMetadata,
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

  it('metadata 为 JSON 字符串（旧后端 / 归档行）时解析成对象，不按字符下标展开', () => {
    const raw = JSON.stringify({ platform: 'java', uuid: 'f79d46d7-93fa-38b4-ab4b-3b1e87ba367b' })
    expect(normalizeAuditMetadata(raw)).toEqual({
      platform: 'java',
      uuid: 'f79d46d7-93fa-38b4-ab4b-3b1e87ba367b',
    })
    expect(formatAuditMetadata(raw)).toBe(
      JSON.stringify({ platform: 'java', uuid: 'f79d46d7-93fa-38b4-ab4b-3b1e87ba367b' }, null, 2),
    )
    // 关键回归：字符串绝不能被当成对象做 Object.keys（那会产出 {"0":"{",…}）
    expect(formatAuditMetadata(raw)).not.toContain('"0"')
  })

  it('无法归一化（坏 JSON / 数组 / 数字 / 空串）一律返回空串', () => {
    expect(formatAuditMetadata('{not-json')).toBe('')
    expect(formatAuditMetadata('[1,2]')).toBe('')
    expect(formatAuditMetadata('   ')).toBe('')
    expect(formatAuditMetadata(42)).toBe('')
  })
})
