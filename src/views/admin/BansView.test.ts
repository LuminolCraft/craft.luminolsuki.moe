/**
 * `BansView.vue`（管理端封禁列表）新建封禁流程测试。
 *
 * 覆盖：
 * - 页头「新建封禁」打开弹窗；
 * - 按 MC 角色名搜索：防抖后请求 `/admin/minecraft?q=`，渲染候选；
 * - 选中候选：请求 `/admin/bans/preview?minecraftAccountId=`，渲染连带清单；
 * - 提交：POST `/admin/bans` 带 minecraftAccountId + type + reason + expiresAt；
 * - 输入完整 UUID：不搜名字，改走「按该 UUID 直接封」，提交带 minecraftUuid。
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

/** 点击按钮时按文案定位（i18n 变化即断言失败，避免静默选错按钮）。 */
function buttonByText(wrapper: Awaited<ReturnType<typeof mountView>>, text: string) {
  const btn = wrapper.findAll('button').find((b) => b.text() === text)
  if (!btn) throw new Error(`按钮缺失：${text}`)
  return btn
}

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('BansView 新建封禁', () => {
  it('搜索角色名 → 预览影响面 → 提交带 minecraftAccountId', async () => {
    vi.useFakeTimers()
    routeGet()
    postMock.mockResolvedValue({ id: 'ban_new', deduped: false })

    const wrapper = await mountView()

    await buttonByText(wrapper, '新建封禁').trigger('click')
    await flushPromises()
    expect(wrapper.find('.create-ban-modal').exists()).toBe(true)

    // 防抖：350ms 后才发搜索请求
    const input = wrapper.find('.create-ban-modal input[type="search"]')
    await input.setValue('Notch')
    expect(urlsWhere(/\/admin\/minecraft/)).toHaveLength(0)
    vi.advanceTimersByTime(350)
    await flushPromises()

    const searchUrls = urlsWhere(/\/admin\/minecraft/)
    expect(searchUrls).toHaveLength(1)
    expect(searchUrls[0]).toContain('q=Notch')

    // 选中候选 → 拉影响面
    const item = wrapper.find('.target-item')
    expect(item.exists()).toBe(true)
    await item.trigger('click')
    await flushPromises()

    const previewUrls = urlsWhere(/\/admin\/bans\/preview/)
    expect(previewUrls).toHaveLength(1)
    expect(previewUrls[0]).toContain('minecraftAccountId=mc_target')
    expect(wrapper.findAll('.scope-list li')).toHaveLength(2)

    // 填原因并提交
    await wrapper.find('.create-ban-modal textarea').setValue('使用作弊客户端')
    await buttonByText(wrapper, '确认封禁').trigger('click')
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
    routeGet()
    postMock.mockResolvedValue({ id: 'ban_uuid', deduped: false })
    getMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/admin/bans?')) return EMPTY_PAGE
      if (url.startsWith('/admin/bans/preview')) {
        return { target: { accountId: null, uuid: UNBOUND_UUID, name: null }, bound: false, items: [], total: 0 }
      }
      throw new Error(`未预期的请求：${url}`)
    })

    const wrapper = await mountView()

    await buttonByText(wrapper, '新建封禁').trigger('click')
    await flushPromises()

    await wrapper.find('.create-ban-modal input[type="search"]').setValue(UNBOUND_UUID)
    vi.advanceTimersByTime(350)
    await flushPromises()

    // UUID 形态不触发角色名搜索
    expect(urlsWhere(/\/admin\/minecraft/)).toHaveLength(0)

    await buttonByText(wrapper, '按该 UUID 直接封禁').trigger('click')
    await flushPromises()

    const previewUrls = urlsWhere(/\/admin\/bans\/preview/)
    expect(previewUrls).toHaveLength(1)
    expect(previewUrls[0]).toContain(`minecraftUuid=${UNBOUND_UUID}`)
    // 未绑定：清单为空、给出单身份提示
    expect(wrapper.find('.scope-list').exists()).toBe(false)

    await wrapper.find('.create-ban-modal textarea').setValue('跨服恶意行为')
    await buttonByText(wrapper, '确认封禁').trigger('click')
    await flushPromises()

    const [, payload] = postMock.mock.calls[0] as [string, Record<string, unknown>]
    expect(payload.minecraftUuid).toBe(UNBOUND_UUID)
    expect(payload.minecraftAccountId).toBeUndefined()
  })
})
