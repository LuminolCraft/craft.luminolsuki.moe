/**
 * 用户头像测试：按 MC 角色名查皮肤（GET /api/v1/skin/:name）。
 *
 * 覆盖：
 * - skin 为角色名 / UUID → 套 mc-heads（尺寸按 2 倍生成）；
 * - skin 为图片 URL → 皮肤纹理裁「头 + 帽檐」，不渲染整张纹理；
 * - 查不到（未绑定 / 网络异常）→ 首字母占位，不回退 mc-heads；
 * - 没传 mcName → 不请求、直接首字母；
 * - 图片加载失败 → 首字母占位。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/lib/api', () => ({ api: { get: getMock } }))

import UserAvatar from './UserAvatar.vue'

afterEach(() => {
  getMock.mockReset()
})

describe('UserAvatar 按名查皮肤', () => {
  it('skin 为角色名 → mc-heads 头部图（尺寸 2 倍）', async () => {
    getMock.mockResolvedValue('Notch')

    const wrapper = mount(UserAvatar, {
      props: { mcName: 'Alice', name: 'Alice', size: 40 },
    })
    await flushPromises()

    expect(getMock).toHaveBeenCalledWith('/skin/Alice')
    expect(wrapper.find('img').attributes('src')).toBe('https://mc-heads.net/avatar/Notch/80')
  })

  it('skin 为图片 URL → 裁头（帽檐 + 脸两层），不渲染原图', async () => {
    getMock.mockResolvedValue('https://cdn.test/skin.png')

    const wrapper = mount(UserAvatar, {
      props: { mcName: 'Bob', name: 'Bob', size: 40 },
    })
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(false)
    const head = wrapper.find('.user-avatar-head')
    expect(head.exists()).toBe(true)
    const style = head.attributes('style') ?? ''
    expect(style).toContain('https://cdn.test/skin.png')
    // jsdom 会把 `320px auto` 归一成 `320px`（单值时高度默认 auto，等价）
    expect(style).toContain('background-size: 320px')
    expect(style).toContain('-200px -40px')
  })

  it('查不到 → 首字母占位', async () => {
    getMock.mockRejectedValue({ code: 'MINECRAFT_ACCOUNT_NOT_FOUND' })

    const wrapper = mount(UserAvatar, {
      props: { mcName: 'Carol', name: 'Carol', size: 40 },
    })
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('C')
  })

  it('没传 mcName → 不请求，直接首字母', async () => {
    const wrapper = mount(UserAvatar, { props: { name: 'Dave', size: 40 } })
    await flushPromises()

    expect(getMock).not.toHaveBeenCalled()
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('D')
  })

  it('图片加载失败 → 首字母占位', async () => {
    getMock.mockResolvedValue('Notch')

    const wrapper = mount(UserAvatar, {
      props: { mcName: 'Eve', name: 'Eve', size: 40 },
    })
    await flushPromises()

    await wrapper.find('img').trigger('error')
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('E')
  })
})
