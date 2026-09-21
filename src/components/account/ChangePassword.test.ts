/**
 * 「设置 → 安全」修改密码区块（`ChangePassword.vue`）行为测试。
 *
 * 覆盖：
 * - 前端一致性校验（新密码 <8 位 / 两次不一致 / 未填当前密码）→ 内联提示，
 *   **不**调用 store（不产生后端请求）；
 * - 成功 → 调用 `store.changePassword(current, next)`、显示成功提示并清空输入；
 * - 错误分流：`INVALID_PASSWORD` → 原密码错误；`RATE_LIMITED` + resetAt →
 *   带时间的频率提示；`CREDENTIAL_ACCOUNT_NOT_FOUND` → 引导改用「设置密码」；
 *   其他 → 通用失败提示。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ChangePassword from './ChangePassword.vue'
import zh from '@/i18n/locales/zh'
import { useAuthStore } from '@/stores/auth'
import type { AppError } from '@/types/auth'

const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh } })

/** 挂载区块并注入 store.changePassword 的行为 */
function mountSection(impl: (current: string, next: string) => Promise<void>) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const spy = vi.spyOn(useAuthStore(), 'changePassword').mockImplementation(impl)
  const wrapper = mount(ChangePassword, { global: { plugins: [pinia, i18n] } })
  return { wrapper, spy }
}

/** 填三个输入框并提交 */
async function submit(
  wrapper: VueWrapper,
  values: { current?: string; next?: string; confirm?: string },
) {
  await wrapper.find('#cp-current').setValue(values.current ?? '')
  await wrapper.find('#cp-new').setValue(values.next ?? '')
  await wrapper.find('#cp-confirm').setValue(values.confirm ?? '')
  await wrapper.find('form').trigger('submit')
}

const ok = async () => {}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ChangePassword（设置 → 安全：修改密码）', () => {
  it('渲染标题、三输入框与提交按钮（区块 C）', () => {
    const { wrapper } = mountSection(ok)
    expect(wrapper.find('.security-section-title').text()).toBe('修改密码')
    expect(wrapper.findAll('input[type="password"]')).toHaveLength(3)
    expect(wrapper.find('.cp-submit').text()).toBe('修改密码')
  })

  it('新密码少于 8 位 → 内联提示，不调用 store', async () => {
    const { wrapper, spy } = mountSection(ok)
    await submit(wrapper, { current: 'old-password', next: 'short', confirm: 'short' })
    expect(wrapper.find('.cp-error').text()).toBe('密码至少需要 8 位')
    expect(spy).not.toHaveBeenCalled()
  })

  it('两次新密码不一致 → 内联提示，不调用 store', async () => {
    const { wrapper, spy } = mountSection(ok)
    await submit(wrapper, {
      current: 'old-password',
      next: 'new-password-1',
      confirm: 'new-password-2',
    })
    expect(wrapper.find('.cp-error').text()).toBe('两次输入的新密码不一致')
    expect(spy).not.toHaveBeenCalled()
  })

  it('未填当前密码 → 内联提示，不调用 store', async () => {
    const { wrapper, spy } = mountSection(ok)
    await submit(wrapper, { next: 'new-password-1', confirm: 'new-password-1' })
    expect(wrapper.find('.cp-error').text()).toBe('请输入当前密码')
    expect(spy).not.toHaveBeenCalled()
  })

  it('成功 → 传入 (当前密码, 新密码)，显示成功提示并清空输入', async () => {
    const { wrapper, spy } = mountSection(ok)
    await submit(wrapper, {
      current: 'old-password',
      next: 'new-password-1',
      confirm: 'new-password-1',
    })
    expect(spy).toHaveBeenCalledWith('old-password', 'new-password-1')
    expect(wrapper.find('.cp-success').text()).toBe('密码已修改成功')
    expect(wrapper.find('.cp-success-hint').text()).toContain('其他设备已退出登录')
    expect(wrapper.find('.cp-error').exists()).toBe(false)
    expect((wrapper.find('#cp-current').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#cp-new').element as HTMLInputElement).value).toBe('')
  })

  it('原密码错误（INVALID_PASSWORD）→ 提示当前密码错误', async () => {
    const { wrapper } = mountSection(async () => {
      throw { code: 'INVALID_PASSWORD' } as AppError
    })
    await submit(wrapper, {
      current: 'wrong-password',
      next: 'new-password-1',
      confirm: 'new-password-1',
    })
    expect(wrapper.find('.cp-error').text()).toBe('当前密码错误，请重试')
    expect(wrapper.find('.cp-success').exists()).toBe(false)
  })

  it('限流（RATE_LIMITED + resetAt）→ 带时间的频率提示', async () => {
    const { wrapper } = mountSection(async () => {
      throw {
        code: 'RATE_LIMITED',
        details: { resetAt: Date.now() + 60_000 },
      } as AppError
    })
    await submit(wrapper, {
      current: 'old-password',
      next: 'new-password-1',
      confirm: 'new-password-1',
    })
    expect(wrapper.find('.cp-error').text()).toContain('操作过于频繁')
    expect(wrapper.find('.cp-error').text()).toContain('后再试')
  })

  it('账号无密码登录方式（CREDENTIAL_ACCOUNT_NOT_FOUND）→ 引导改用「设置密码」', async () => {
    const { wrapper } = mountSection(async () => {
      throw { code: 'CREDENTIAL_ACCOUNT_NOT_FOUND' } as AppError
    })
    await submit(wrapper, {
      current: 'old-password',
      next: 'new-password-1',
      confirm: 'new-password-1',
    })
    expect(wrapper.find('.cp-error').text()).toBe('当前账号没有密码登录方式，请使用「设置密码」')
  })
})
