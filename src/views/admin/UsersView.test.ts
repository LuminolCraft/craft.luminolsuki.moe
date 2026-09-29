/**
 * `UsersView.vue`（管理端用户列表）测试：注册时间列、分页、排序、搜索。
 *
 * 覆盖回归与新增：
 * - 注册时间列渲染日期而非 `—`（后端 `created_at` snake_case 归一化）；
 * - 末页仍渲染 pager，「上一页」可用、「下一页」禁用；
 * - 点击「注册时间」表头切换 `order=asc|desc` 并回到第 1 页，aria-sort 与 icon 同步；
 * - 搜索边输边搜：防抖 300ms、不足 2 字符不发请求、请求带 `q` 且回第 1 页；
 * - 清除搜索后请求不再带 `q`。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import UsersView from './UsersView.vue'
import zh from '@/i18n/locales/zh'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/lib/api', () => ({
  api: { get: getMock },
  isAppError: (error: unknown) => typeof error === 'object' && error !== null && 'code' in error,
}))

vi.mock('@/composables/useGsap', () => ({
  useGsap: () => ({ create: () => {}, reduceMotion: () => true }),
}))

const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh } })

/** 后端实际下发的原始行：snake_case（`created_at`），前端曾因读 `createdAt` 恒显示 `—` */
function makeUser(id: number, createdAt = Date.UTC(2024, 0, 2)) {
  return {
    id: String(id),
    username: `u${id}`,
    email: `u${id}@example.com`,
    email_verified: true,
    created_at: createdAt,
    roles: ['user'],
  }
}

/** 统一返回信封 `{ items, total, page, limit }`，items 由 rows 提供。 */
function reply(rows: ReturnType<typeof makeUser>[], total = rows.length) {
  return { items: rows, total, page: 1, limit: 20 }
}

/** 取第 n 次请求的 URL（未发起该次请求即抛错，避免静默跳过）。 */
function requestUrl(index: number): string {
  const call = getMock.mock.calls[index]
  if (!call) throw new Error(`未发起第 ${index + 1} 次请求`)
  return String(call[0])
}

async function mountView() {
  const wrapper = mount(UsersView, { global: { plugins: [i18n], stubs: { RouterLink: true } } })
  await flushPromises()
  return wrapper
}

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('UsersView（管理端用户列表）分页', () => {
  it('末页仍渲染 pager，「上一页」可用、「下一页」禁用', async () => {
    // total=25 → 第 2 页为末页，hasMore 为 false
    getMock.mockImplementation(async (url: string) => {
      const page = Number(/page=(\d+)/.exec(url)?.[1] ?? 1)
      const start = (page - 1) * 20
      const count = Math.max(0, Math.min(20, 25 - start))
      return reply(
        Array.from({ length: count }, (_, i) => makeUser(start + i + 1)),
        25,
      )
    })

    const wrapper = await mountView()
    expect(wrapper.find('.pager').exists()).toBe(true)

    /** 按索引取分页按钮；缺失即断言失败，避免索引越界静默跳过 */
    const pagerButton = (index: number) => {
      const btn = wrapper.findAll('.pager-btn')[index]
      if (!btn) throw new Error(`pager 按钮缺失：index ${index}`)
      return btn
    }
    const clickPager = async (index: number) => {
      await pagerButton(index).trigger('click')
      await flushPromises()
    }

    // 第 1 页点「下一页」进入末页
    await clickPager(1)

    expect(wrapper.find('.pager').exists()).toBe(true)
    expect(pagerButton(0).attributes('disabled')).toBeUndefined()
    expect(pagerButton(1).attributes('disabled')).toBeDefined()

    // 末页点「上一页」应回到第 1 页
    await clickPager(0)
    expect(wrapper.find('.pager-label').text()).toContain('1')
  })

  it('注册时间列渲染日期而非「—」（后端 snake_case created_at）', async () => {
    getMock.mockResolvedValue(reply([makeUser(1)]))

    const wrapper = await mountView()
    const cells = wrapper.findAll('tbody tr td')
    const joined = cells[3]
    if (!joined) throw new Error('注册时间列缺失')

    expect(joined.text()).not.toBe('—')
    expect(joined.text()).toContain(String(new Date(Date.UTC(2024, 0, 2)).getFullYear()))
    // 排序作为接口契约下发：默认升序
    expect(requestUrl(0)).toContain('sort=created_at')
    expect(requestUrl(0)).toContain('order=asc')
  })
})

describe('UsersView（管理端用户列表）注册时间排序', () => {
  it('点表头切降序：请求 order=desc 且回第 1 页，aria-sort 与 icon 同步；再点回升序', async () => {
    getMock.mockResolvedValue(reply([makeUser(1), makeUser(2)]))
    const wrapper = await mountView()

    const sortBtn = wrapper.find('.sort-btn')
    expect(sortBtn.exists()).toBe(true)
    expect(wrapper.find('.th-sort').attributes('aria-sort')).toBe('ascending')
    const ascIcon = wrapper.find('.sort-icon').html()

    await sortBtn.trigger('click')
    await flushPromises()

    expect(requestUrl(1)).toContain('sort=created_at')
    expect(requestUrl(1)).toContain('order=desc')
    expect(requestUrl(1)).toContain('page=1')
    expect(wrapper.find('.th-sort').attributes('aria-sort')).toBe('descending')
    expect(wrapper.find('.sort-icon').html()).not.toBe(ascIcon)

    await wrapper.find('.sort-btn').trigger('click')
    await flushPromises()

    expect(requestUrl(2)).toContain('order=asc')
    expect(wrapper.find('.th-sort').attributes('aria-sort')).toBe('ascending')
    expect(wrapper.find('.sort-icon').html()).toBe(ascIcon)
  })
})

describe('UsersView（管理端用户列表）搜索', () => {
  it('边输边搜：防抖 300ms 后仅发一次请求，带 q 且回第 1 页', async () => {
    getMock.mockResolvedValue(reply([makeUser(1)]))
    vi.useFakeTimers()

    const wrapper = await mountView()
    const input = wrapper.find('input[type="search"]')
    expect(input.exists()).toBe(true)

    await input.setValue('al')
    expect(getMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(299)
    expect(getMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    await flushPromises()

    expect(getMock).toHaveBeenCalledTimes(2)
    expect(requestUrl(1)).toContain('q=al')
    expect(requestUrl(1)).toContain('page=1')
  })

  it('不足 2 个字符不发请求；清空输入立即恢复无过滤', async () => {
    getMock.mockResolvedValue(reply([makeUser(1)]))
    vi.useFakeTimers()

    const wrapper = await mountView()
    const input = wrapper.find('input[type="search"]')

    await input.setValue('a')
    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(getMock).toHaveBeenCalledTimes(1)

    await input.setValue('al')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(requestUrl(1)).toContain('q=al')

    await input.setValue('')
    await flushPromises()
    expect(getMock).toHaveBeenCalledTimes(3)
    expect(requestUrl(2)).not.toContain('q=')
  })

  it('清除按钮清空输入并重新拉取未过滤列表', async () => {
    getMock.mockResolvedValue(reply([makeUser(1)]))
    const wrapper = await mountView()
    vi.useFakeTimers()

    const input = wrapper.find('input[type="search"]')
    await input.setValue('al')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(requestUrl(1)).toContain('q=al')

    const clear = wrapper.findAll('.filter-row button').find((b) => b.text() === '清除')
    if (!clear) throw new Error('清除按钮缺失')
    await clear.trigger('click')
    await flushPromises()

    expect((input.element as HTMLInputElement).value).toBe('')
    expect(requestUrl(2)).not.toContain('q=')
  })

  it('搜索零命中显示「没有匹配的用户」', async () => {
    getMock.mockResolvedValueOnce(reply([])).mockResolvedValue(reply([]))
    const wrapper = await mountView()
    vi.useFakeTimers()

    await wrapper.find('input[type="search"]').setValue('nobody')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(wrapper.find('.page-empty').text()).toBe('没有匹配的用户')
  })
})
