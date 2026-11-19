/**
 * `UserDetail.vue` 封禁区块测试。
 *
 * 该区块从「创建封禁表单」改为「有效封禁只读清单 + 撤销」：创建统一走封禁页，
 * 详情页只展示与撤销。覆盖：
 * - 详情返回多个类型的有效封禁时逐条渲染（含类型标签、理由、到期）；
 * - 没有有效封禁时显示空态文案；
 * - 点撤销 → 二次确认后 POST `/admin/bans/:id/revoke` 并重拉详情。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import UserDetail from './UserDetail.vue'
import zh from '@/i18n/locales/zh'

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))

vi.mock('@/lib/api', () => ({
  api: { get: getMock, post: postMock, patch: vi.fn(), delete: vi.fn() },
  isAppError: (error: unknown) => typeof error === 'object' && error !== null && 'code' in error,
}))

vi.mock('@/composables/useGsap', () => ({
  useGsap: () => ({ create: () => {}, reduceMotion: () => true }),
}))

// 详情页按 route.params.id 拉数据、按 router.push 返回列表；测试只断言封禁区块
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'user_1' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/stores/authorization', () => ({
  useAuthorizationStore: () => ({ hasRole: () => false }),
}))

vi.mock('@/stores/nexus', () => ({
  useNexusStore: () => ({ adminForceUnbindMinecraft: vi.fn(), adminChangeBirthday: vi.fn() }),
}))

vi.mock('@/stores/notifications', () => ({
  useNotificationsStore: () => ({ adminSend: vi.fn() }),
}))

const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh } })

const RouterLinkStub = { props: ['to'], template: '<a><slot /></a>' }

const DETAIL = {
  id: 'user_1',
  username: 'bowkuri',
  email: 'bow@example.com',
  email_verified: true,
  created_at: 1_700_000_000_000,
  roles: ['user'],
  minecraftAccounts: [],
  bans: [
    {
      id: 'ban_mc',
      type: 'minecraft',
      reason: '开挂',
      minecraftAccountId: 'mc_1',
      minecraftUuid: 'aaaaaaaa-0001-0000-0000-000000000001',
      minecraftUsername: 'Bowkuri',
      createdAt: 1_700_000_300_000,
      expiresAt: null,
    },
    {
      id: 'ban_web',
      type: 'website',
      reason: '站内骚扰',
      minecraftAccountId: 'mc_2',
      minecraftUuid: 'aaaaaaaa-0001-0000-0000-000000000002',
      minecraftUsername: 'BowAlt',
      createdAt: 1_700_000_400_000,
      expiresAt: 1_800_000_400_000,
    },
  ],
}

function mountPage() {
  return mount(UserDetail, {
    global: {
      plugins: [i18n],
      components: { RouterLink: RouterLinkStub },
      stubs: { UserAvatar: true },
    },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  getMock.mockReset()
  postMock.mockReset()
})

describe('UserDetail 封禁区块', () => {
  it('逐条渲染名下全部有效封禁，并提供撤销与前往封禁页入口', async () => {
    getMock.mockResolvedValue(DETAIL)
    const wrapper = mountPage()
    await flushPromises()

    const items = wrapper.findAll('.ban-item')
    expect(items).toHaveLength(2)
    expect(items[0]?.text()).toContain('Minecraft')
    expect(items[0]?.text()).toContain('开挂')
    expect(items[0]?.text()).toContain('永久')
    expect(items[1]?.text()).toContain('网站')
    expect(items[1]?.text()).toContain('站内骚扰')
    // 到期时间渲染成「... 到期」而不是「永久」
    expect(items[1]?.text()).not.toContain('永久')
    expect(items[1]?.text()).toContain('到期')

    expect(wrapper.find('.section-link').exists()).toBe(true)
    expect(wrapper.findAll('.ban-revoke')).toHaveLength(2)
  })

  it('没有有效封禁时显示空态', async () => {
    getMock.mockResolvedValue({ ...DETAIL, bans: [] })
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll('.ban-item')).toHaveLength(0)
    // 第三个 detail-section 是封禁区块（前两个是角色 / MC 账号）
    expect(wrapper.findAll('.detail-section')[2]?.text()).toContain('没有生效中的封禁')
  })

  it('撤销走二次确认，确认后 POST 并对该封禁调撤销接口后重拉详情', async () => {
    getMock.mockResolvedValue(DETAIL)
    postMock.mockResolvedValue({})
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = mountPage()
    await flushPromises()
    getMock.mockClear()

    await wrapper.findAll('.ban-revoke')[0]?.trigger('click')
    await flushPromises()

    expect(window.confirm).toHaveBeenCalled()
    expect(postMock).toHaveBeenCalledWith('/admin/bans/ban_mc/revoke')
    // 撤销后重拉详情（列表随之更新）
    expect(getMock).toHaveBeenCalledTimes(1)
  })

  it('确认框取消时不发请求', async () => {
    getMock.mockResolvedValue(DETAIL)
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.findAll('.ban-revoke')[0]?.trigger('click')
    await flushPromises()

    expect(postMock).not.toHaveBeenCalled()
  })
})
