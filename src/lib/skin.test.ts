import { afterEach, describe, expect, it, vi } from 'vitest'

const { envelopeMock } = vi.hoisted(() => ({ envelopeMock: vi.fn() }))

vi.mock('@/lib/api', () => ({ apiGetEnvelope: envelopeMock }))

import { clearSkinCache, fetchSkinByName } from './skin'

afterEach(() => {
  envelopeMock.mockReset()
  clearSkinCache()
})

describe('fetchSkinByName：按角色名查皮肤', () => {
  it('命中返回 skin + 后端 type', async () => {
    envelopeMock.mockResolvedValue({
      data: 'https://cdn.test/skin.png',
      meta: { success: true, type: 'url' },
    })

    await expect(fetchSkinByName('Notch')).resolves.toEqual({
      skin: 'https://cdn.test/skin.png',
      type: 'url',
    })
    expect(envelopeMock).toHaveBeenCalledWith('/skin/Notch')
  })

  it('后端未给 type 时按值兜底', async () => {
    envelopeMock.mockResolvedValue({ data: '069a79f4-44e9-4726-a5be-fca90e38aaf5', meta: {} })

    await expect(fetchSkinByName('Steve')).resolves.toEqual({
      skin: '069a79f4-44e9-4726-a5be-fca90e38aaf5',
      type: 'uuid',
    })
  })

  it('未知 type → type 置 null（渲染端不猜）', async () => {
    envelopeMock.mockResolvedValue({ data: 'Notch', meta: { type: 'hash' } })

    await expect(fetchSkinByName('Alex')).resolves.toEqual({ skin: 'Notch', type: null })
  })

  it('失败不入缓存：下一次会重试', async () => {
    envelopeMock.mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
    await expect(fetchSkinByName('Alice')).resolves.toBeNull()

    envelopeMock.mockResolvedValueOnce({ data: 'Alice', meta: { type: 'name' } })
    await expect(fetchSkinByName('Alice')).resolves.toEqual({ skin: 'Alice', type: 'name' })

    expect(envelopeMock).toHaveBeenCalledTimes(2)
  })

  it('成功结果命中缓存，不重复请求', async () => {
    envelopeMock.mockResolvedValue({ data: 'Steve', meta: { type: 'name' } })

    await fetchSkinByName('Steve')
    await fetchSkinByName('Steve')

    expect(envelopeMock).toHaveBeenCalledTimes(1)
  })

  it('clearSkinCache 后重新请求（登出清理）', async () => {
    envelopeMock.mockResolvedValue({ data: 'Steve', meta: { type: 'name' } })

    await fetchSkinByName('Steve')
    clearSkinCache()
    await fetchSkinByName('Steve')

    expect(envelopeMock).toHaveBeenCalledTimes(2)
  })

  it('空名不发请求', async () => {
    await expect(fetchSkinByName('   ')).resolves.toBeNull()
    expect(envelopeMock).not.toHaveBeenCalled()
  })
})
