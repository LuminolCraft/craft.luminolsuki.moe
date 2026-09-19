/**
 * 用户名规则 parity 测试：用例表与后端 luminol-nexus 的 tests/unit/username.test.ts 一致。
 */
import { describe, expect, it } from 'vitest'
import {
  canonicalUsername,
  cleanUsernameInput,
  prepareUsername,
  sliceCodePoints,
  USERNAME_MAX,
  type UsernameInvalidReason,
  validateUsername,
  withUsernameSuffix,
} from './username'

/** 满长度中文名（32 码点）。 */
const HAN_MAX = '张'.repeat(USERNAME_MAX)

describe('prepareUsername：宽度折叠 + 首尾空白移除 + NFC', () => {
  it('全角折半角', () => {
    expect(prepareUsername('ＡＢＣ')).toBe('ABC')
    expect(prepareUsername('１２３')).toBe('123')
  })

  it('首尾空白移除（含表意空格），内部空白保留', () => {
    expect(prepareUsername(' 张三丰 ')).toBe('张三丰')
    expect(prepareUsername('\u3000张三丰\u3000')).toBe('张三丰')
    expect(prepareUsername('张 三')).toBe('张 三')
  })

  it('NFC 生效：e + U+0301 合成为 é（该结果不合字符集，由 validate 拒绝）', () => {
    expect(prepareUsername('e\u0301')).toBe('é')
  })

  it('幂等', () => {
    for (const value of ['ＡＢＣ', ' 张三丰 ', 'e\u0301', '李_雷-1', '张三丰']) {
      expect(prepareUsername(prepareUsername(value))).toBe(prepareUsername(value))
    }
  })
})

describe('validateUsername：通过', () => {
  it.each(['张三丰', '张三丰ABC', '李_雷-1', 'a-b_c', '𠀀张三', HAN_MAX])('%s', (value) => {
    const result = validateUsername(value)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(prepareUsername(value))
  })

  it('首尾空白归一化移除后通过', () => {
    expect(validateUsername(' 张三丰 ')).toEqual({ ok: true, value: '张三丰' })
  })

  it('全角归一化后通过', () => {
    expect(validateUsername('ＡＢＣ')).toEqual({ ok: true, value: 'ABC' })
  })
})

describe('validateUsername：拒绝', () => {
  const rejected: Array<[string, UsernameInvalidReason]> = [
    ['张', 'too_short'],
    ['张三', 'too_short'],
    ['A'.repeat(USERNAME_MAX + 1), 'too_long'],
    [`${HAN_MAX}张`, 'too_long'],
    ['张 三', 'charset'],
    ['张三丰😀', 'charset'],
    ['раypal', 'charset'],
    ['张\u200D三', 'charset'],
    ['\u202Eabc', 'charset'],
    ['ééé', 'charset'],
    ['e\u0301e\u0301e\u0301', 'charset'],
    // 康熙部首 U+2F00：Script=Han，NFC 保留、NFKC 变 "一" → 兼容性分支
    ['\u2F00ABC', 'compatibility'],
  ]

  it.each(rejected)('%s → %s', (value, reason) => {
    expect(validateUsername(value)).toEqual({ ok: false, reason })
  })
})

describe('canonicalUsername：仅服务保留词检测', () => {
  it('小写 + leet + l→i + 宽度折叠', () => {
    expect(canonicalUsername('ADM1N')).toBe('admin')
    expect(canonicalUsername('r00t')).toBe('root')
    expect(canonicalUsername('ａｄｍｉｎ')).toBe('admin')
    expect(canonicalUsername(' 管理员 ')).toBe('管理员')
  })

  it('不参与唯一性：大小写不同 canonical 相同，但 prepare 不同', () => {
    expect(canonicalUsername('Zhang')).toBe(canonicalUsername('zhang'))
    expect(prepareUsername('Zhang')).not.toBe(prepareUsername('zhang'))
  })
})

describe('withUsernameSuffix：去重后缀计入长度上限', () => {
  it('32 码点中文名 + 4 位后缀 → 仍为 32 码点且合法', () => {
    const result = withUsernameSuffix(HAN_MAX, '1234')
    expect(Array.from(result)).toHaveLength(USERNAME_MAX)
    expect(result.endsWith('1234')).toBe(true)
    expect(validateUsername(result).ok).toBe(true)
  })

  it('短名 + 1 位后缀 → 原样拼接', () => {
    expect(withUsernameSuffix('张三', '7')).toBe('张三7')
  })
})

describe('sliceCodePoints：不在代理对中间截断', () => {
  it('astral 汉字按码点截断', () => {
    expect(sliceCodePoints('𠀀𠀁𠀂', 2)).toBe('𠀀𠀁')
    expect(Array.from(sliceCodePoints('𠀀𠀁𠀂', 2))).toHaveLength(2)
    expect(sliceCodePoints('张三', 5)).toBe('张三')
  })
})

// 说明：cleanUsernameInput 是前端输入卫生（后端直接拒绝不可见字符，不做清洗），
// 因此后端 tests/unit/username.test.ts 没有对应用例。
describe('cleanUsernameInput：粘贴清洗（前端输入卫生）', () => {
  it('移除零宽与双向控制字符', () => {
    expect(cleanUsernameInput('张\u200D三丰')).toBe('张三丰')
    expect(cleanUsernameInput('\u202Eabc')).toBe('abc')
    expect(cleanUsernameInput('张\uFEFF三丰')).toBe('张三丰')
  })

  it('顺带做宽度折叠与首尾空白移除', () => {
    expect(cleanUsernameInput(' 张三丰 ')).toBe('张三丰')
    expect(cleanUsernameInput('ＡＢＣ')).toBe('ABC')
  })
})
