/**
 * 生日规则 parity 测试：与后端 luminol-nexus 的 tests/unit/birthday.test.ts 共享用例。
 *
 * 只覆盖**共享核心算法**（格式 / 真实日历日 / 下限）；站点时区上界是后端专有行为，
 * 前端不判上界，故此处没有对应用例（这是有意差异，不是漏测）。
 */
import { describe, expect, it } from 'vitest'
import {
  BIRTHDAY_MIN_YEAR,
  effectiveMonthDay,
  isBirthdayToday,
  isValidBirthday,
  normalizeBirthday,
  toDateInputValue,
} from './birthday'

describe('normalizeBirthday：严格格式 + 真实日历日 + 下限（shared parity）', () => {
  it.each(['1900-01-01', '2000-02-29', '2004-02-29', '1999-12-31', '2026-09-20'])(
    '%s 合法',
    (value) => {
      expect(normalizeBirthday(value)).toBe(value)
    },
  )

  it.each([
    '2000-1-1',
    '2000/01/01',
    '2000-01-01T00:00:00Z',
    '20000101',
    '',
    ' 2000-01-01',
    'abcd-ef-gh',
  ])('%s 非法（不做宽松补齐）', (value) => {
    expect(normalizeBirthday(value)).toBeNull()
    expect(isValidBirthday(value)).toBe(false)
  })

  it('非字符串一律非法（表单空值 / null 走清空分支，不进本函数）', () => {
    expect(normalizeBirthday(null)).toBeNull()
    expect(normalizeBirthday(undefined)).toBeNull()
    expect(normalizeBirthday(20000101)).toBeNull()
  })

  it('真实日历日：非闰年 2·29 / 2·30 / 13 月 / 0 日 / 4·31 一律非法', () => {
    expect(normalizeBirthday('2001-02-29')).toBeNull()
    expect(normalizeBirthday('2000-02-30')).toBeNull()
    expect(normalizeBirthday('2000-13-01')).toBeNull()
    expect(normalizeBirthday('2000-00-10')).toBeNull()
    expect(normalizeBirthday('2000-04-31')).toBeNull()
  })

  it(`下限 ${BIRTHDAY_MIN_YEAR}-01-01`, () => {
    expect(normalizeBirthday('1899-12-31')).toBeNull()
    expect(normalizeBirthday('1900-01-01')).toBe('1900-01-01')
  })

  it('不判上界（站点时区校验由后端唯一执行）', () => {
    expect(normalizeBirthday('2999-01-01')).toBe('2999-01-01')
  })
})

describe('effectiveMonthDay：2·29 非闰年回落 02-28', () => {
  it('闰年保持 02-29，非闰年回落 02-28（含百年 / 四百年规则）', () => {
    expect(effectiveMonthDay('2004-02-29', 2024)).toBe('02-29')
    expect(effectiveMonthDay('2004-02-29', 2025)).toBe('02-28')
    expect(effectiveMonthDay('2004-02-29', 2100)).toBe('02-28')
    expect(effectiveMonthDay('2004-02-29', 2000)).toBe('02-29')
  })

  it('普通日期原样返回', () => {
    expect(effectiveMonthDay('1999-12-31', 2026)).toBe('12-31')
  })
})

describe('isBirthdayToday：纯字符串比较（按浏览器本地日期）', () => {
  it('同月同日命中；2·29 在非闰年按 02-28 命中', () => {
    expect(isBirthdayToday('2000-09-20', new Date(2026, 8, 20))).toBe(true)
    expect(isBirthdayToday('2000-09-20', new Date(2026, 8, 21))).toBe(false)
    expect(isBirthdayToday('2004-02-29', new Date(2025, 1, 28))).toBe(true)
    expect(isBirthdayToday('2004-02-29', new Date(2024, 1, 29))).toBe(true)
    expect(isBirthdayToday('2004-02-29', new Date(2025, 1, 27))).toBe(false)
  })

  it('个位数月日补零后仍能命中', () => {
    expect(isBirthdayToday('1999-01-05', new Date(2026, 0, 5))).toBe(true)
    expect(isBirthdayToday('1999-01-05', new Date(2026, 0, 15))).toBe(false)
  })

  it('非法生日一律 false', () => {
    expect(isBirthdayToday('2000-1-1', new Date(2026, 8, 20))).toBe(false)
  })
})

describe('展示辅助', () => {
  it('toDateInputValue：非法/空值回退空串（input[type=date] 不吃乱码）', () => {
    expect(toDateInputValue('1999-12-31')).toBe('1999-12-31')
    expect(toDateInputValue(null)).toBe('')
    expect(toDateInputValue(undefined)).toBe('')
    expect(toDateInputValue('1999-12-32')).toBe('')
  })
})
