/**
 * 用户头像测试：按 MC 角色名查皮肤（GET /api/v1/skin/:name）。
 *
 * 覆盖：
 * - 后端 type=name/uuid → 套 mc-heads（尺寸按 2 倍生成）；
 * - 后端 type=url → 皮肤纹理裁「头 + 帽檐」，不渲染整张纹理；
 * - 查不到（未绑定 / 网络异常）→ 首字母占位，不回退 mc-heads；
 * - 没传 mcName → 不请求、直接首字母；
 * - 图片 / 纹理加载失败 → 首字母占位。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { envelopeMock } = vi.hoisted(() => ({ envelopeMock: vi.fn() }))

vi.mock('@/lib/api', () => ({ apiGetEnvelope: envelopeMock }))

import { clearSkinCache } from '@/lib/skin'
import UserAvatar from './UserAvatar.vue'

afterEach(() => {
  envelopeMock.mockReset()
  clearSkinCache()
  vi.unstubAllGlobals()
})

describe('UserAvatar 按名查皮肤', () => {
  it('type=name → mc-heads 头部图（尺寸 2 倍）', async () => {
    envelopeMock.mockResolvedValue({ data: 'Notch', meta: { type: 'name' } })

    const wrapper = mount(UserAvatar, {
      props: { mcName: 'Alice', name: 'Alice', size: 40 },
    })
    await flushPromises()

    expect(envelopeMock).toHaveBeenCalledWith('/skin/Alice')
    expect(wrapper.find('img').attributes('src')).toBe('https://mc-heads.net/avatar/Notch/80')
  })

  it('type=url → 裁头（帽檐 + 脸两层），不渲染原图', async () => {
    envelopeMock.mockResolvedValue({
      data: 'https://cdn.test/skin.png',
      meta: { type: 'url' },
    })

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
    envelopeMock.mockRejectedValue({ code: 'MINECRAFT_ACCOUNT_NOT_FOUND' })

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

    expect(envelopeMock).not.toHaveBeenCalled()
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('D')
  })

  it('图片加载失败 → 首字母占位', async () => {
    envelopeMock.mockResolvedValue({ data: 'Notch', meta: { type: 'name' } })

    const wrapper = mount(UserAvatar, {
      props: { mcName: 'Eve', name: 'Eve', size: 40 },
    })
    await flushPromises()

    await wrapper.find('img').trigger('error')
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('E')
  })

  it('纹理加载失败 → 首字母占位（背景图不触发 error，靠预探测）', async () => {
    envelopeMock.mockResolvedValue({
      data: 'https://cdn.test/broken.png',
      meta: { type: 'url' },
    })
    class FailingImage {
      onerror: (() => void) | null = null
      set src(_value: string) {
        this.onerror?.()
      }
    }
    vi.stubGlobal('Image', FailingImage)

    const wrapper = mount(UserAvatar, {
      props: { mcName: 'Frank', name: 'Frank', size: 40 },
    })
    await flushPromises()

    expect(wrapper.find('.user-avatar-head').exists()).toBe(false)
    expect(wrapper.text()).toBe('F')
  })
})
