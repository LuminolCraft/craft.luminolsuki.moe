/**
 * `UsersView.vue`（管理端用户列表）分页组件可见性测试。
 *
 * 覆盖回归：末页 `hasMore` 为 false 时 pager 曾整块 `v-if` 消失，导致无法回到上一页。
 * 期望：只要不在第 1 页，pager 必须仍渲染，「上一页」可点，「下一页」禁用。
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
function makeUser(id: number) {
  return {
    id: String(id),
    username: `u${id}`,
    email: `u${id}@example.com`,
    email_verified: true,
    created_at: Date.UTC(2024, 0, 2),
    roles: ['user'],
  }
}

async function mountView() {
  const wrapper = mount(UsersView, { global: { plugins: [i18n], stubs: { RouterLink: true } } })
  await flushPromises()
  return wrapper
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('UsersView（管理端用户列表）分页', () => {
  it('末页仍渲染 pager，「上一页」可用、「下一页」禁用', async () => {
    // total=25 → 第 2 页为末页，hasMore 为 false
    getMock.mockImplementation(async (url: string) => {
      const page = Number(/page=(\d+)/.exec(url)?.[1] ?? 1)
      const start = (page - 1) * 20
      const count = Math.max(0, Math.min(20, 25 - start))
      return {
        items: Array.from({ length: count }, (_, i) => makeUser(start + i + 1)),
        total: 25,
        page,
        limit: 20,
      }
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
    getMock.mockResolvedValue({
      items: [makeUser(1)],
      total: 1,
      page: 1,
      limit: 20,
    })

    const wrapper = await mountView()
    const cells = wrapper.findAll('tbody tr td')
    const joined = cells[3]
    if (!joined) throw new Error('注册时间列缺失')

    expect(joined.text()).not.toBe('—')
    expect(joined.text()).toContain(String(new Date(Date.UTC(2024, 0, 2)).getFullYear()))
  })
})
