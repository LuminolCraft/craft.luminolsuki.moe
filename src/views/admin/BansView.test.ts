/**
 * `BansView.vue`（管理端封禁列表）搜索框入口测试。
 *
 * 覆盖：
 * - 搜索框输入角色名：防抖后同时请求 `/admin/minecraft?q=`（候选）与
 *   `/admin/bans?...&q=`（列表同步过滤）；
 * - 选中候选：请求 `/admin/bans/preview?minecraftAccountId=`，抽屉列出连带范围；
 * - 提交：POST `/admin/bans` 带 minecraftAccountId + type + reason + expiresAt；
 * - 输入完整 UUID：不搜名字，走「按该 UUID 封禁」，提交带 minecraftUuid。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import BansView from './BansView.vue'
import zh from '@/i18n/locales/zh'

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))

vi.mock('@/lib/api', () => ({
  api: { get: getMock, post: postMock, patch: vi.fn(), upload: vi.fn() },
  isAppError: (error: unknown) => typeof error === 'object' && error !== null && 'code' in error,
}))

vi.mock('@/composables/useGsap', () => ({
  useGsap: () => ({ create: () => {}, reduceMotion: () => true }),
}))

// 证据面板依赖 ffmpeg 运行时，测试不涉及上传，整体替身
vi.mock('@/lib/evidence-image', () => ({
  canEncodeInBrowser: () => false,
  evidenceFileName: () => 'evidence.avif',
  prepareEvidenceFile: vi.fn(),
  probeFfmpegCore: async () => false,
  randomSetId: () => 'setid12',
}))

const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh } })

const ACCOUNT_UUID = 'aaaaaaaa-0001-0000-0000-000000000001'
const ALT_UUID = 'aaaaaaaa-0001-0000-0000-000000000002'
const UNBOUND_UUID = 'cccccccc-0009-0000-0000-000000000009'

const CANDIDATE = {
  id: 'mc_target',
  uuid: ACCOUNT_UUID,
  name: 'Notch',
  platform: 'java',
  verifiedAt: null,
  userId: 'user_target',
  username: 'notch_fan',
  activeBan: null,
}

const PREVIEW = {
  target: { accountId: 'mc_target', uuid: ACCOUNT_UUID, name: 'Notch' },
  bound: true,
  items: [
    {
      id: 'mc_target',
      uuid: ACCOUNT_UUID,
      name: 'Notch',
      userId: 'user_target',
      username: 'notch_fan',
      alreadyBanned: false,
    },
    {
      id: 'mc_alt',
      uuid: ALT_UUID,
      name: 'NotchAlt',
      userId: 'user_target',
      username: 'notch_fan',
      alreadyBanned: false,
    },
  ],
  total: 2,
}

const EMPTY_PAGE = { items: [], total: 0, page: 1, limit: 20 }

/** 按 URL 分派列表 / 搜索 / 预览三类请求。 */
function routeGet() {
  getMock.mockImplementation(async (url: string) => {
    if (url.startsWith('/admin/bans?')) return EMPTY_PAGE
    if (url.startsWith('/admin/minecraft')) return { items: [CANDIDATE] }
    if (url.startsWith('/admin/bans/preview')) return PREVIEW
    throw new Error(`未预期的请求：${url}`)
  })
}

function urlsWhere(re: RegExp): string[] {
  return getMock.mock.calls.map((call) => String(call[0])).filter((u) => re.test(u))
}

async function mountView() {
  const wrapper = mount(BansView, { global: { plugins: [i18n] } })
  await flushPromises()
  return wrapper
}

/** 按文案定位按钮（i18n 变更即失败，避免静默点错目标）。 */
function buttonByText(wrapper: Awaited<ReturnType<typeof mountView>>, text: string) {
  const btn = wrapper.findAll('button').find((b) => b.text() === text)
  if (!btn) throw new Error(`按钮缺失：${text}`)
  return btn
}

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('BansView 搜索框新建封禁', () => {
  it('搜索角色名 → 列表同步过滤 → 预览连带范围 → 提交带 minecraftAccountId', async () => {
    vi.useFakeTimers()
    routeGet()
    postMock.mockResolvedValue({ id: 'ban_new', deduped: false })

    const wrapper = await mountView()

    await wrapper.find('.search-input').setValue('Notch')
    // 防抖：300ms 内不发请求
    expect(urlsWhere(/\/admin\/minecraft/)).toHaveLength(0)
    vi.advanceTimersByTime(300)
    await flushPromises()

    const searchUrls = urlsWhere(/\/admin\/minecraft/)
    expect(searchUrls).toHaveLength(1)
    expect(searchUrls[0]).toContain('q=Notch')
    // 列表也要带 q：前端不再过滤当前页
    expect(urlsWhere(/\/admin\/bans\?[^/]*q=Notch/)).toHaveLength(1)

    // 候选入浮层，点选后拉影响面
    const item = wrapper.find('.candidate')
    expect(item.exists()).toBe(true)
    await item.trigger('click')
    await flushPromises()

    const previewUrls = urlsWhere(/\/admin\/bans\/preview/)
    expect(previewUrls).toHaveLength(1)
    expect(previewUrls[0]).toContain('minecraftAccountId=mc_target')
    expect(wrapper.findAll('.scope-line')).toHaveLength(2)

    await wrapper.find('.ban-drawer textarea').setValue('使用作弊客户端')
    await buttonByText(wrapper, '封禁 2 个账号').trigger('click')
    await flushPromises()

    expect(postMock).toHaveBeenCalledTimes(1)
    const [url, payload] = postMock.mock.calls[0] as [string, Record<string, unknown>]
    expect(url).toBe('/admin/bans')
    expect(payload).toMatchObject({
      minecraftAccountId: 'mc_target',
      type: 'minecraft',
      reason: '使用作弊客户端',
      expiresAt: null,
    })
    expect(payload.minecraftUuid).toBeUndefined()
  })

  it('输入完整 UUID：不搜名字，按 UUID 直接封', async () => {
    vi.useFakeTimers()
    postMock.mockResolvedValue({ id: 'ban_uuid', deduped: false })
    getMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/admin/bans?')) return EMPTY_PAGE
      if (url.startsWith('/admin/bans/preview')) {
        return {
          target: { accountId: null, uuid: UNBOUND_UUID, name: null },
          bound: false,
          items: [],
          total: 0,
        }
      }
      throw new Error(`未预期的请求：${url}`)
    })

    const wrapper = await mountView()

    await wrapper.find('.search-input').setValue(UNBOUND_UUID)
    vi.advanceTimersByTime(300)
    await flushPromises()

    // UUID 形态不触发角色名搜索
    expect(urlsWhere(/\/admin\/minecraft/)).toHaveLength(0)

    await wrapper.find('.candidate').trigger('click')
    await flushPromises()

    const previewUrls = urlsWhere(/\/admin\/bans\/preview/)
    expect(previewUrls).toHaveLength(1)
    expect(previewUrls[0]).toContain(`minecraftUuid=${UNBOUND_UUID}`)
    // 未绑定：清单为空，落单身份提示
    expect(wrapper.find('.scope-line').text()).toContain('仅此号')

    await wrapper.find('.ban-drawer textarea').setValue('跨服恶意行为')
    await buttonByText(wrapper, '确认封禁').trigger('click')
    await flushPromises()

    const [, payload] = postMock.mock.calls[0] as [string, Record<string, unknown>]
    expect(payload.minecraftUuid).toBe(UNBOUND_UUID)
    expect(payload.minecraftAccountId).toBeUndefined()
  })

  it('未绑定玩家候选（id 为 null，Mojang 兜底）：按 uuid 封，标题显示玩家名', async () => {
    vi.useFakeTimers()
    postMock.mockResolvedValue({ id: 'ban_ghost', deduped: false })
    getMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/admin/bans?')) return EMPTY_PAGE
      if (url.startsWith('/admin/minecraft')) {
        return {
          items: [
            {
              id: null,
              uuid: UNBOUND_UUID,
              name: 'GhostPlayer',
              platform: null,
              userId: null,
              username: null,
              activeBan: null,
            },
          ],
        }
      }
      if (url.startsWith('/admin/bans/preview')) {
        return {
          target: { accountId: null, uuid: UNBOUND_UUID, name: 'GhostPlayer' },
          bound: false,
          items: [],
          total: 0,
        }
      }
      throw new Error(`未预期的请求：${url}`)
    })

    const wrapper = await mountView()

    await wrapper.find('.search-input').setValue('GhostPlayer')
    vi.advanceTimersByTime(300)
    await flushPromises()

    // 候选卡显示玩家名与「未绑定」标记，不显示所属网站账号
    const item = wrapper.find('.candidate')
    expect(item.exists()).toBe(true)
    expect(item.text()).toContain('GhostPlayer')
    expect(item.text()).toContain('未绑定')

    await item.trigger('click')
    await flushPromises()

    // 没有账号 id：预览与提交都走 minecraftUuid
    const previewUrls = urlsWhere(/\/admin\/bans\/preview/)
    expect(previewUrls).toHaveLength(1)
    expect(previewUrls[0]).toContain(`minecraftUuid=${UNBOUND_UUID}`)
    // 抽屉标题用代查到的玩家名而不是裸 uuid
    expect(wrapper.find('.ban-drawer').text()).toContain('GhostPlayer')

    await wrapper.find('.ban-drawer textarea').setValue('外挂行为')
    await buttonByText(wrapper, '确认封禁').trigger('click')
    await flushPromises()

    const [, payload] = postMock.mock.calls[0] as [string, Record<string, unknown>]
    expect(payload.minecraftUuid).toBe(UNBOUND_UUID)
    expect(payload.minecraftAccountId).toBeUndefined()
  })
})
