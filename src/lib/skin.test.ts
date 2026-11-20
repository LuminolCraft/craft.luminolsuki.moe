import { afterEach, describe, expect, it, vi } from 'vitest'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/lib/api', () => ({ api: { get: getMock } }))

import { fetchSkinByName } from './skin'

afterEach(() => {
  getMock.mockReset()
})

describe('fetchSkinByName：按角色名查皮肤', () => {
  it('命中返回 skin 串', async () => {
    getMock.mockResolvedValue('https://cdn.test/skin.png')

    await expect(fetchSkinByName('Notch')).resolves.toBe('https://cdn.test/skin.png')
    expect(getMock).toHaveBeenCalledWith('/skin/Notch')
  })

  it('未绑定（404）→ null', async () => {
    getMock.mockRejectedValue({ code: 'MINECRAFT_ACCOUNT_NOT_FOUND' })

    await expect(fetchSkinByName('Nobody')).resolves.toBeNull()
  })

  it('网络异常 → null', async () => {
    getMock.mockRejectedValue({ code: 'NETWORK_ERROR' })

    await expect(fetchSkinByName('Offline')).resolves.toBeNull()
  })

  it('同名二次调用走缓存，不再打请求', async () => {
    getMock.mockResolvedValue('Steve')

    await fetchSkinByName('Steve')
    await fetchSkinByName('Steve')

    expect(getMock).toHaveBeenCalledTimes(1)
  })

  it('查不到也缓存，不重复打请求', async () => {
    getMock.mockRejectedValue(new Error('boom'))

    await fetchSkinByName('Ghost')
    await fetchSkinByName('Ghost')

    expect(getMock).toHaveBeenCalledTimes(1)
  })

  it('空名不发请求', async () => {
    await expect(fetchSkinByName('   ')).resolves.toBeNull()
    expect(getMock).not.toHaveBeenCalled()
  })
})
