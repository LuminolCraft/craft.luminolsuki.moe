/**
 * `NotificationComposeView.vue`（管理端发布通知）分段选择改造测试。
 *
 * 覆盖：
 * - 发送目标由裸按钮组改为 `role="radiogroup"` 的三段原生 radio，文案来自 i18n；
 * - 通知类型由 `<select>` 改为两段分段选择，默认 announcement；
 * - 选择「指定用户」后用户选择区出现（v-if 联动未被破坏）；
 * - `sending` 时目标/类型 radio 全部 disabled。
 *
 * 只 mock 网络与管理端接口：`@/lib/api`、notifications store、GSAP 组合式函数。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import NotificationComposeView from './NotificationComposeView.vue'
import zh from '@/i18n/locales/zh'

const { getMock, adminSendMock } = vi.hoisted(() => ({
  getMock: vi.fn(async () => ({ items: [], total: 0, page: 1, limit: 50 })),
  adminSendMock: vi.fn(async () => 1),
}))

vi.mock('@/lib/api', () => ({
  api: { get: getMock },
  isAppError: (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error,
}))

vi.mock('@/stores/notifications', () => ({
  useNotificationsStore: () => ({ adminSend: adminSendMock }),
}))

// 挂载动画与 reduceMotion 对本测试无关，直接短路
vi.mock('@/composables/useGsap', () => ({
  useGsap: () => ({ create: () => {}, reduceMotion: () => true }),
}))

const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh } })

async function mountCompose() {
  const wrapper = mount(NotificationComposeView, { global: { plugins: [i18n] } })
  await flushPromises()
  return wrapper
}

/** 目标控件是 value 为 all/user/multi 的那组 radio */
function targetRadios(wrapper: Awaited<ReturnType<typeof mountCompose>>) {
  return wrapper.findAll('input[type="radio"][value="all"], input[type="radio"][value="user"], input[type="radio"][value="multi"]')
}

function typeRadios(wrapper: Awaited<ReturnType<typeof mountCompose>>) {
  return wrapper.findAll('input[type="radio"][value="announcement"], input[type="radio"][value="warning"]')
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('NotificationComposeView（管理端发布通知）', () => {
  it('发送目标为三段分段选择，默认「全员」', async () => {
    const wrapper = await mountCompose()
    const group = wrapper.find('[role="radiogroup"]')
    expect(group.exists()).toBe(true)
    const radios = targetRadios(wrapper)
    expect(radios).toHaveLength(3)
    expect(radios.map((r) => r.attributes('value'))).toEqual(['all', 'user', 'multi'])
    expect((radios[0]!.element as HTMLInputElement).checked).toBe(true)
    for (const label of ['全员', '指定用户', '多选用户']) {
      expect(wrapper.text()).toContain(label)
    }
  })

  it('选择「指定用户」后出现用户选择区', async () => {
    const wrapper = await mountCompose()
    expect(wrapper.find('input[type="search"]').exists()).toBe(false)
    await targetRadios(wrapper)[1]!.setValue(true)
    expect((targetRadios(wrapper)[1]!.element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.find('input[type="search"]').exists()).toBe(true)
  })

  it('通知类型由 select 改为两段分段选择，默认 announcement', async () => {
    const wrapper = await mountCompose()
    expect(wrapper.find('select').exists()).toBe(false)
    const radios = typeRadios(wrapper)
    expect(radios).toHaveLength(2)
    expect((radios[0]!.element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.text()).toContain('公告')
    expect(wrapper.text()).toContain('警示')
  })

  it('发送中时目标与类型 radio 全部 disabled', async () => {
    const wrapper = await mountCompose()
    adminSendMock.mockImplementationOnce(() => new Promise<number>(() => {}))
    await wrapper.find('input[type="text"]').setValue('维护通知')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    const all = [...targetRadios(wrapper), ...typeRadios(wrapper)]
    expect(all).toHaveLength(5)
    for (const radio of all) {
      expect((radio.element as HTMLInputElement).disabled).toBe(true)
    }
  })
})
