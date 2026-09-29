/**
 * `UsersView.vue`（管理端用户列表）测试：注册时间列、分页、排序、搜索。
 *
 * 覆盖回归与新增：
 * - 注册时间列渲染日期而非 `—`（后端 `created_at` snake_case 归一化）；
 * - 末页仍渲染 pager，「上一页」可用、「下一页」禁用；
 * - 点击「注册时间」表头切换 `order=asc|desc` 并回到第 1 页，aria-sort 与 icon 同步；
 * - 排序 SWR 缓存：命中先瞬时渲染缓存数据，后台重验后更新为最新；
 * - 搜索边输边搜：防抖 300ms、不足 2 字符不发请求、请求带 `q` 且回第 1 页；
 * - 输入法组合期间（`v-model` 被 Vue 跳过）仍按防抖发请求；回车立即搜；
 * - 清除搜索后请求不再带 `q`。
 *
 * 注意：每次 page1 主请求后会静默预取反向排序（SWR），请求总数/绝对序号不稳定，
 * 断言一律按 URL 参数过滤（`urlsWhere`），不做全量计数。
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

/** 按正则过滤全部请求 URL（反向预取会多发请求，绝对序号/总数不可靠）。 */
function urlsWhere(re: RegExp): string[] {
  return getMock.mock.calls.map((c) => String(c[0])).filter((u) => re.test(u))
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

    // 挂载时反向预取 + 点击后重验都会发出 desc 请求，均应回到第 1 页
    const descReqs = urlsWhere(/order=desc/)
    expect(descReqs.length).toBeGreaterThan(0)
    expect(descReqs.every((u) => u.includes('page=1'))).toBe(true)
    expect(wrapper.find('.th-sort').attributes('aria-sort')).toBe('descending')
    expect(wrapper.find('.sort-icon').html()).not.toBe(ascIcon)

    await wrapper.find('.sort-btn').trigger('click')
    await flushPromises()

    // asc 请求至少 2 次：挂载主请求 + 点击后重验
    expect(urlsWhere(/order=asc/).length).toBeGreaterThan(1)
    expect(wrapper.find('.th-sort').attributes('aria-sort')).toBe('ascending')
    expect(wrapper.find('.sort-icon').html()).toBe(ascIcon)
  })

  it('排序命中缓存：先瞬时渲染缓存数据，后台重验后更新为最新', async () => {
    let seq = 0
    getMock.mockImplementation(async () => reply([makeUser(++seq)]))
    vi.useFakeTimers()
    const wrapper = await mountView()
    // 挂载：主请求 u1（缓存 asc），反向预取 u2（缓存 desc）
    expect(wrapper.find('tbody td').text()).toBe('u1')

    // 后续请求延迟响应，制造可观察的 SWR 间隙
    getMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(reply([makeUser(++seq)])), 100)),
    )

    await wrapper.find('.sort-btn').trigger('click')
    // 命中 desc 缓存：不等网络，立即渲染预取数据
    expect(wrapper.find('tbody td').text()).toBe('u2')

    vi.advanceTimersByTime(100)
    await flushPromises()
    // 重验完成：覆盖为最新数据（后端为准）
    expect(wrapper.find('tbody td').text()).toBe('u3')
  })
})

describe('UsersView（管理端用户列表）搜索', () => {
  it('边输边搜：防抖 300ms 后仅发一次搜索请求，带 q 且回第 1 页', async () => {
    getMock.mockResolvedValue(reply([makeUser(1)]))
    vi.useFakeTimers()

    const wrapper = await mountView()
    const input = wrapper.find('input[type="search"]')
    expect(input.exists()).toBe(true)

    await input.setValue('al')
    expect(urlsWhere(/q=/)).toHaveLength(0)

    vi.advanceTimersByTime(299)
    expect(urlsWhere(/q=/)).toHaveLength(0)

    vi.advanceTimersByTime(1)
    await flushPromises()

    // 主搜索请求恰 1 次（asc），另加其触发的反向预取（desc），按参数过滤断言
    const main = urlsWhere(/order=asc&q=al/)
    expect(main).toHaveLength(1)
    expect(main[0]).toContain('page=1')
  })

  it('不足 2 个字符不发请求；清空输入立即恢复无过滤', async () => {
    getMock.mockResolvedValue(reply([makeUser(1)]))
    vi.useFakeTimers()

    const wrapper = await mountView()
    const input = wrapper.find('input[type="search"]')

    await input.setValue('a')
    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(urlsWhere(/q=/)).toHaveLength(0)

    await input.setValue('al')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(urlsWhere(/order=asc&q=al/)).toHaveLength(1)

    await input.setValue('')
    await flushPromises()
    // 清空立即恢复无过滤：'al' 相关请求总数不变（1 主 + 1 预取），最新请求不带 q
    expect(urlsWhere(/q=/)).toHaveLength(2)
    const lastCall = getMock.mock.calls[getMock.mock.calls.length - 1]
    if (!lastCall) throw new Error('未发起任何请求')
    expect(String(lastCall[0])).not.toContain('q=')
  })

  it('清除按钮清空输入并重新拉取未过滤列表', async () => {
    getMock.mockResolvedValue(reply([makeUser(1)]))
    const wrapper = await mountView()
    vi.useFakeTimers()

    const input = wrapper.find('input[type="search"]')
    await input.setValue('al')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(urlsWhere(/order=asc&q=al/)).toHaveLength(1)

    const clear = wrapper.findAll('.filter-row button').find((b) => b.text() === '清除')
    if (!clear) throw new Error('清除按钮缺失')
    await clear.trigger('click')
    await flushPromises()

    expect((input.element as HTMLInputElement).value).toBe('')
    const lastCall = getMock.mock.calls[getMock.mock.calls.length - 1]
    if (!lastCall) throw new Error('未发起任何请求')
    expect(String(lastCall[0])).not.toContain('q=')
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

  it('输入法组合期间（v-model 被 Vue 跳过）仍按防抖发请求', async () => {
    getMock.mockResolvedValue(reply([makeUser(1)]))
    vi.useFakeTimers()

    const wrapper = await mountView()
    const input = wrapper.find('input[type="search"]')
    const el = input.element as HTMLInputElement & { composing?: boolean }

    // 模拟 vModelText 的组合态：composing=true 时它忽略 input 事件，searchInput 不更新。
    // 旧实现只 watch(searchInput)，此时一次请求都不会发出（用户要失焦提交组合后才搜）。
    el.composing = true
    el.value = 'al'
    await input.trigger('input')

    expect(urlsWhere(/q=/)).toHaveLength(0)
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(urlsWhere(/order=asc&q=al/)).toHaveLength(1)
  })

  it('回车立即搜（不等防抖）；不足 2 字符回车不发请求', async () => {
    getMock.mockResolvedValue(reply([makeUser(1)]))
    vi.useFakeTimers()

    const wrapper = await mountView()
    const input = wrapper.find('input[type="search"]')

    await input.setValue('a')
    await input.trigger('keydown.enter')
    await flushPromises()
    expect(urlsWhere(/q=/)).toHaveLength(0)

    await input.setValue('al')
    await input.trigger('keydown.enter')
    await flushPromises()

    const main = urlsWhere(/order=asc&q=al/)
    expect(main).toHaveLength(1)
    expect(main[0]).toContain('page=1')
  })
})
