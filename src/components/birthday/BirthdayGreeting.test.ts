/**
 * 生日祝福（1A）触发规则 + 吹蜡烛交互测试。
 *
 * 覆盖：
 * - 判定：命中「浏览器本地日期 = 生日 MM-DD」→ 弹一次并写入去重 key；
 *   同年已弹过 / 生日不在今天 / 未填生日 / 认证页（`route.meta.hideChrome`）→ 均不弹；
 * - 场景与交互：蛋糕有 3 根蜡烛；点「吹蜡烛」→ 三根全部熄灭、按钮切换为收下祝福、
 *   心愿文案转为可见（动效本身由 GSAP 承担，jsdom 不做像素断言）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import BirthdayGreeting from './BirthdayGreeting.vue'
import zh from '@/i18n/locales/zh'
import { birthdayGreetingKey } from '@/lib/birthday'
import { useAuthStore } from '@/stores/auth'
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

async function makeRouter(path: string): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', component: { template: '<div />' }, meta: { hideChrome: true } },
    ],
  })
  await router.push(path)
  await router.isReady()
  return router
}

const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh } })

/** 挂载组件（Teleport 到 body，故断言查 document 而非 wrapper.html） */
async function mountGreeting(birthday: string | null, path = '/') {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().me = makeUser(birthday)
  const router = await makeRouter(path)
  mount(BirthdayGreeting, {
    attachTo: document.body,
    global: { plugins: [pinia, i18n, router] },
  })
  await new Promise((resolve) => setTimeout(resolve, 0))
  return document.querySelector('.bday-overlay')
}

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('BirthdayGreeting（1A 触发规则）', () => {
  it('今天生日 → 弹出祝福并写入「今年已弹过」key', async () => {
    const overlay = await mountGreeting(todayBirthday)
    expect(overlay).not.toBeNull()
    expect(overlay?.textContent).toContain('生日快乐')
    expect(localStorage.getItem(birthdayGreetingKey('user_test', today.getFullYear()))).toBe('1')
  })

  it('同年第二次进入 → 不再弹（key 已存在）', async () => {
    localStorage.setItem(birthdayGreetingKey('user_test', today.getFullYear()), '1')
    expect(await mountGreeting(todayBirthday)).toBeNull()
  })

  it('生日不在今天 → 不弹，且不写 key', async () => {
    expect(await mountGreeting(otherBirthday)).toBeNull()
    expect(localStorage.getItem(birthdayGreetingKey('user_test', today.getFullYear()))).toBeNull()
  })

  it('未填生日 → 不弹', async () => {
    expect(await mountGreeting(null)).toBeNull()
  })

  it('认证页（hideChrome）→ 不弹且不写 key', async () => {
    expect(await mountGreeting(todayBirthday, '/login')).toBeNull()
    expect(localStorage.getItem(birthdayGreetingKey('user_test', today.getFullYear()))).toBeNull()
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

  it('点单根烛火 → 只灭那一根，未全灭则不进入许愿阶段', async () => {
    const overlay = await mountGreeting(todayBirthday)
    overlay?.querySelector<HTMLButtonElement>('.cake-candle')?.click()
    await nextTick()

    expect(document.querySelectorAll('.cake-candle.is-out')).toHaveLength(1)
    expect(document.querySelector('.bday-btn')?.textContent).toContain('吹蜡烛')
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
