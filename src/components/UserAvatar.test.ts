/**
 * 用户头像两段式取图测试。
 *
 * 覆盖：
 * - media 头像接口命中（`<img>` 未 error）→ 直接用后端地址，不请求来源端点；
 * - media 接口无图（204 → `<img>` error）→ 取 `/media/avatar-source/:userId`：
 *   `skin` 是 http(s) 直链就直接用，否则当 uuid / 皮肤名套 mc-heads；
 * - 来源端点 204（用户无绑定 MC 账号）→ 用户名首字母占位；
 * - 兜底地址也加载失败 → 首字母，不再发请求。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import UserAvatar from './UserAvatar.vue'
import { API_BASE_URL } from '@/lib/api-base'

/** 构造来源端点的 JSON 响应（统一信封）。 */
function sourceResponse(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ success: true, data, requestId: 'req_test' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('UserAvatar 两段式取图', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('media 命中时直接用后端头像，不请求来源端点', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const wrapper = mount(UserAvatar, { props: { userId: 'u-1', name: 'Alice' } })

    expect(wrapper.find('img').attributes('src')).toBe(`${API_BASE_URL}/api/v1/media/avatar/u-1`)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('media 无图时，skin 为直链则直接使用该地址', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sourceResponse({ uuid: 'uuid-1', name: 'Alice', skin: 'https://cdn.test/skin.png' }),
    )
    const wrapper = mount(UserAvatar, { props: { userId: 'u-1', name: 'Alice', size: 40 } })

    await wrapper.find('img').trigger('error')
    await flushPromises()

    expect(wrapper.find('img').attributes('src')).toBe('https://cdn.test/skin.png')
  })

  it('skin 为 uuid 时套 mc-heads，尺寸按 2 倍', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sourceResponse({ uuid: 'uuid-1', name: 'Alice', skin: 'skin-uuid-2' }),
    )
    const wrapper = mount(UserAvatar, { props: { userId: 'u-1', name: 'Alice', size: 40 } })

    await wrapper.find('img').trigger('error')
    await flushPromises()

    expect(wrapper.find('img').attributes('src')).toBe(
      'https://mc-heads.net/avatar/skin-uuid-2/80',
    )
  })

  it('来源端点 204（无绑定账号）→ 首字母占位', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    const wrapper = mount(UserAvatar, { props: { userId: 'u-1', name: 'Alice' } })

    await wrapper.find('img').trigger('error')
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('A')
  })

  it('兜底地址也失败 → 首字母，且不再继续发请求', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(sourceResponse({ uuid: 'uuid-1', name: 'Alice', skin: 'skin-uuid-2' }))
    const wrapper = mount(UserAvatar, { props: { userId: 'u-1', name: 'Alice' } })

    await wrapper.find('img').trigger('error')
    await flushPromises()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    await wrapper.find('img').trigger('error')
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('A')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
