/**
 * 管理端用户归一化测试。
 *
 * 覆盖回归：后端 `/admin/users` 下发 users 表原始行（snake_case），前端读 camelCase
 * 导致「注册时间」恒为 `—`。归一化后两种拼写都要能读出来。
 */
import { describe, expect, it } from 'vitest'
import { normalizeAdminUser, normalizeAdminUserDetail } from './admin-user'

describe('normalizeAdminUser', () => {
  it('读取后端实际下发的 snake_case 字段', () => {
    const u = normalizeAdminUser({
      id: 'u1',
      username: 'alice',
      email: 'a@example.com',
      email_verified: true,
      birthday: '2000-01-02',
      birthday_self_edited: true,
      created_at: 1725000000000,
      roles: ['admin'],
    })

    expect(u.createdAt).toBe(1725000000000)
    expect(u.emailVerified).toBe(true)
    expect(u.birthdaySelfEdited).toBe(true)
    expect(u.roles).toEqual(['admin'])
  })

  it('camelCase 字段仍然可用', () => {
    const u = normalizeAdminUser({
      id: 'u2',
      username: 'bob',
      emailVerified: false,
      createdAt: 1,
    })

    expect(u.createdAt).toBe(1)
    expect(u.emailVerified).toBe(false)
    expect(u.birthdaySelfEdited).toBe(false)
  })

  it('缺字段不造假值：createdAt / emailVerified 保持 undefined', () => {
    const u = normalizeAdminUser({ id: 'u3', username: 'carol' })

    expect(u.createdAt).toBeUndefined()
    expect(u.emailVerified).toBeUndefined()
    expect(u.avatarKey).toBeNull()
    expect(u.roles).toEqual([])
  })

  it('非对象输入不抛错', () => {
    expect(normalizeAdminUser(null).id).toBe('')
    expect(normalizeAdminUser(undefined).username).toBe('')
  })
})

describe('normalizeAdminUserDetail', () => {
  it('详情归一附带 updatedAt 与 MC 账号', () => {
    const d = normalizeAdminUserDetail({
      id: 'u1',
      username: 'alice',
      created_at: 100,
      updated_at: 200,
      minecraftAccounts: [{ id: 'mc1', uuid: 'x', name: 'Alice', platform: 'java' }],
    })

    expect(d.createdAt).toBe(100)
    expect(d.updatedAt).toBe(200)
    expect(d.minecraftAccounts).toHaveLength(1)
  })

  it('缺 MC 账号时为数组而非 undefined', () => {
    expect(normalizeAdminUserDetail({ id: 'u2', username: 'bob' }).minecraftAccounts).toEqual([])
  })
})
