/**
 * 生日祝福（1A）触发规则 + 吹蜡烛交互测试。
 *
 * 覆盖：
 * - 判定：命中「浏览器本地日期 = 生日 MM-DD」→ 先向后端领取今年名额
 *   （`POST /me/birthday-greeting`），只有 `shouldShow=true` 才弹；
 *   后端返回 false（同年已在别的设备 / 浏览器 / 清缓存后弹过）/ 领取失败 /
 *   生日不在今天 / 未填生日 / 认证页（`route.meta.hideChrome`）→ 均不弹；
 * - 场景与交互：蛋糕有 3 根蜡烛，烛火是纯装饰（不可点击）；入场后到点自动依次
 *   吹灭并进入许愿阶段，「吹蜡烛」按钮可提前吹灭（动效本身由 GSAP 承担，jsdom 不做像素断言）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import BirthdayGreeting from './BirthdayGreeting.vue'
import zh from '@/i18n/locales/zh'
import { useAuthStore } from '@/stores/auth'
import { useNexusStore } from '@/stores/nexus'
import type { User } from '@/types/auth'

const pad = (n: number) => String(n).padStart(2, '0')
const today = new Date()
/** 命中今天的生日（年份取 1999，年份不参与 MM-DD 比较） */
const todayBirthday = `1999-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
/** 同月但不同日（今天 1 号则取 2 号，反之取 1 号）→ 必然不命中 */
const otherBirthday = `1999-${pad(today.getMonth() + 1)}-${pad(today.getDate() === 1 ? 2 : 1)}`

function makeUser(birthday: string | null): User {
  return {
    id: 'user_test',
    username: '测试用户',
    email: 'tester@gmail.com',
    emailVerified: true,
    avatarKey: null,
    birthday,
    birthdaySelfEdited: false,
    // 固定注册时间：一起走过多少天那行必须有确定值
    createdAt: Date.UTC(today.getFullYear() - 1, 0, 1),
  }
}

async function makeRouter(path: string, query: Record<string, string> = {}): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', component: { template: '<div />' }, meta: { hideChrome: true } },
    ],
  })
  await router.push({ path, query })
  await router.isReady()
  return router
}

const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh } })

/** 默认的「领取成功」：后端说今年由本次展示 */
const claimOk = async () => ({ shouldShow: true })

/**
 * 挂载组件（Teleport 到 body，故断言查 document 而非 wrapper.html）。
 *
 * `claim` 注入 `claimBirthdayGreeting` 的行为（默认领取成功），
 * 组件只依赖这个返回值决定是否弹。
 */
async function mountGreeting(
  birthday: string | null,
  path = '/',
  claim: () => Promise<{ shouldShow: boolean }> = claimOk,
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().me = makeUser(birthday)
  vi.spyOn(useNexusStore(), 'claimBirthdayGreeting').mockImplementation(claim)
  const router = await makeRouter(path)
  mount(BirthdayGreeting, {
    attachTo: document.body,
    global: { plugins: [pinia, i18n, router] },
  })
  // 领取是异步的：跑完微任务 + 一次渲染
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
  return document.querySelector('.bday-overlay')
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('BirthdayGreeting（1A 触发规则）', () => {
  it('今天生日 + 后端领取到名额 → 弹出祝福，且只领一次', async () => {
    const claim = vi.fn(claimOk)
    const overlay = await mountGreeting(todayBirthday, '/', claim)

    expect(overlay).not.toBeNull()
    expect(overlay?.textContent).toContain('生日快乐')
    expect(claim).toHaveBeenCalledTimes(1)
  })

  it('后端返回 shouldShow=false（同年已在别的设备弹过）→ 不弹', async () => {
    const overlay = await mountGreeting(todayBirthday, '/', async () => ({ shouldShow: false }))
    expect(overlay).toBeNull()
  })

  it('领取失败（离线 / 网络错误）→ 不弹，也不记账（下次登录仍可领）', async () => {
    const claim = vi.fn(async () => {
      throw new Error('NETWORK_ERROR')
    })
    expect(await mountGreeting(todayBirthday, '/', claim)).toBeNull()
    expect(claim).toHaveBeenCalledTimes(1)
  })

  it('生日不在今天 → 不弹，且不请求后端', async () => {
    const claim = vi.fn(claimOk)
    expect(await mountGreeting(otherBirthday, '/', claim)).toBeNull()
    expect(claim).not.toHaveBeenCalled()
  })

  it('未填生日 → 不弹，且不请求后端', async () => {
    const claim = vi.fn(claimOk)
    expect(await mountGreeting(null, '/', claim)).toBeNull()
    expect(claim).not.toHaveBeenCalled()
  })

  it('认证页（hideChrome）→ 不弹，且不请求后端', async () => {
    const claim = vi.fn(claimOk)
    expect(await mountGreeting(todayBirthday, '/login', claim)).toBeNull()
    expect(claim).not.toHaveBeenCalled()
  })
})

describe('BirthdayGreeting（场景与吹蜡烛交互）', () => {
  it('渲染蛋糕与 3 根未熄灭的蜡烛，并带个人化「第 N 天」文案', async () => {
    const overlay = await mountGreeting(todayBirthday)
    expect(overlay?.querySelectorAll('.cake-candle')).toHaveLength(3)
    expect(overlay?.querySelectorAll('.cake-candle.is-out')).toHaveLength(0)
    expect(overlay?.querySelector('.bday-days')?.textContent).toContain('第')
  })

  it('点「吹蜡烛」→ 三根全灭 + 按钮切换为收下祝福 + 心愿文案已就位', async () => {
    const overlay = await mountGreeting(todayBirthday)
    const button = overlay?.querySelector<HTMLButtonElement>('.bday-btn')
    expect(button?.textContent).toContain('吹蜡烛')

    button?.click()
    await nextTick()

    expect(document.querySelectorAll('.cake-candle.is-out')).toHaveLength(3)
    expect(document.querySelector('.bday-btn')?.textContent).toContain('收下祝福')
    expect(document.querySelector('.bday-close')).not.toBeNull()
    expect(document.querySelector('.bday-wish')?.textContent).toContain('愿望')
  })

  it('烛火不接受点击（装饰元素，不是按钮）', async () => {
    const overlay = await mountGreeting(todayBirthday)
    const candle = overlay?.querySelector('.cake-candle')
    expect(candle?.tagName).toBe('SPAN')
    expect(overlay?.querySelectorAll('.cake-candle button')).toHaveLength(0)
  })

  it('到点自动依次吹灭：不点任何烛火也会全灭并进入许愿阶段', async () => {
    vi.useFakeTimers()
    try {
      const pinia = createPinia()
      setActivePinia(pinia)
      useAuthStore().me = makeUser(todayBirthday)
      vi.spyOn(useNexusStore(), 'claimBirthdayGreeting').mockImplementation(claimOk)
      const router = await makeRouter('/')

      mount(BirthdayGreeting, {
        attachTo: document.body,
        global: { plugins: [pinia, i18n, router] },
      })
      // 领取是异步的：两次 microtask 后才进入展示（fake timers 下 setTimeout 不可用）
      await nextTick()
      await nextTick()

      expect(document.querySelectorAll('.cake-candle.is-out')).toHaveLength(0)
      vi.advanceTimersByTime(5000)
      await nextTick()

      expect(document.querySelectorAll('.cake-candle.is-out')).toHaveLength(3)
      expect(document.querySelector('.bday-btn')?.textContent).toContain('收下祝福')
    } finally {
      vi.useRealTimers()
    }
  })

  it('收下祝福 → 关闭遮罩并解除滚动锁', async () => {
    const overlay = await mountGreeting(todayBirthday)
    overlay?.querySelector<HTMLButtonElement>('.bday-btn')?.click()
    await nextTick()
    document.querySelector<HTMLButtonElement>('.bday-close')?.click()
    await nextTick()

    expect(document.querySelector('.bday-overlay')).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })
})
