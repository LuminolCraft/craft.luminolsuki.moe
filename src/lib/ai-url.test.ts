import { describe, expect, it } from 'vitest'
import { isAllowedAiUrl } from './ai-url'

/**
 * 链接白名单是防钓鱼的最后一道闸：AI 输出里的链接如果只是「看起来像站内」，
 * 用户点了就去到攻击者的登录页。这里覆盖的每一种绕过写法都对应一个真实手法。
 */
describe('isAllowedAiUrl', () => {
  it('站内相对路径放行', () => {
    expect(isAllowedAiUrl('/News/38')).toBe(true)
    expect(isAllowedAiUrl('/players/abc')).toBe(true)
  })

  it('协议相对 URL 不放行（//evil.com 会跳出站外）', () => {
    expect(isAllowedAiUrl('//evil.com/login')).toBe(false)
  })

  it('自有域名放行，子域也放行', () => {
    expect(isAllowedAiUrl('https://luminolsuki.moe/News')).toBe(true)
    expect(isAllowedAiUrl('https://craft.luminolsuki.moe/SimpleRules')).toBe(true)
    expect(isAllowedAiUrl('https://cortex.narcssu.top/health')).toBe(true)
  })

  it('形似自有域名的钓鱼域不放行', () => {
    expect(isAllowedAiUrl('https://luminolsuki.moe.evil.com/login')).toBe(false)
    expect(isAllowedAiUrl('https://notluminolsuki.moe/login')).toBe(false)
    expect(isAllowedAiUrl('https://evil.com/luminolsuki.moe')).toBe(false)
  })

  it('http 明文不放行（会被中间人替换内容）', () => {
    expect(isAllowedAiUrl('http://luminolsuki.moe/News')).toBe(false)
  })

  it('javascript / data 协议不放行', () => {
    expect(isAllowedAiUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedAiUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isAllowedAiUrl('vbscript:msgbox(1)')).toBe(false)
  })

  it('锚点与查询串放行（仍在当前页内）', () => {
    expect(isAllowedAiUrl('#section')).toBe(true)
    expect(isAllowedAiUrl('?page=2')).toBe(true)
  })

  it('空值与非法值不放行', () => {
    expect(isAllowedAiUrl(undefined)).toBe(false)
    expect(isAllowedAiUrl('')).toBe(false)
    expect(isAllowedAiUrl('   ')).toBe(false)
  })
})
