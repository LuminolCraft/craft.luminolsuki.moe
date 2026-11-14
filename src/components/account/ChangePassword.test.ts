/**
 * 「设置 → 安全」修改密码区块（`ChangePassword.vue`）行为测试。
 *
 * 改密走邮箱验证码门禁，且**没有独立的发码按钮**：同一个「修改密码」按钮两段语义
 * 1. 未发码：校验三框 → 发码，弹 toast「验证邮件已发送」，展开验证码格；
 * 2. 已发码：校验 6 位码 → 提交（store.changePassword(current, next, otp)）。
 *
 * 覆盖：本地一致性校验不打后端、发码成功/失败、完整改密成功、验证码不足、
 * 验证码失效类错误收起码区、原密码错误 / 限流 / 无密码登录方式的文案分流。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ChangePassword from './ChangePassword.vue'
import zh from '@/i18n/locales/zh'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { AppError, PasswordChangeOtpInfo } from '@/types/auth'

const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh } })

const SENT: PasswordChangeOtpInfo = { expiresIn: 600, maskedEmail: 'ab****@qq.com' }

/** 取最后一条 toast（TS 的 lib 不含 es2022，不能用 Array.prototype.at） */
const lastOf = <T>(arr: T[]): T | undefined => arr[arr.length - 1]

/** 挂载区块并注入两个 store 方法的行为（默认发码成功） */
function mountSection(
  opts: {
    request?: () => Promise<PasswordChangeOtpInfo>
    change?: (current: string, next: string, otp: string) => Promise<void>
  } = {},
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  const requestSpy = vi
    .spyOn(auth, 'requestPasswordChangeOtp')
    .mockImplementation(opts.request ?? (async () => SENT))
  const changeSpy = vi
    .spyOn(auth, 'changePassword')
    .mockImplementation(opts.change ?? (async () => {}))
  const wrapper = mount(ChangePassword, { global: { plugins: [pinia, i18n] } })
  const toast = useToastStore()
  return { wrapper, requestSpy, changeSpy, toast }
}

/** 填三框后点「修改密码」（未发码时这一下即发码） */
async function fillAndSubmit(
  wrapper: VueWrapper,
  values: { current?: string; next?: string; confirm?: string } = {},
) {
  await wrapper.find('#cp-current').setValue(values.current ?? 'old-password')
  await wrapper.find('#cp-new').setValue(values.next ?? 'new-password-1')
  await wrapper.find('#cp-confirm').setValue(values.confirm ?? 'new-password-1')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

/** 逐位敲入验证码（CodeSlots 通过隐藏 input 的 keydown 收数字） */
async function typeCode(wrapper: VueWrapper, code: string) {
  const input = wrapper.find('.cs-input')
  for (const ch of code) {
    await input.trigger('keydown', { key: ch })
  }
  await flushPromises()
}

/** 走完发码并输好验证码，停在「可提交」状态 */
async function readyToSubmit(wrapper: VueWrapper, code = '654321') {
  await fillAndSubmit(wrapper)
  await typeCode(wrapper, code)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ChangePassword（设置 → 安全：修改密码）', () => {
  it('渲染标题、三输入框、单个提交按钮；验证码区初始不展开、无独立发码按钮', () => {
    const { wrapper } = mountSection()
    expect(wrapper.find('.cp-title').text()).toBe('修改密码')
    expect(wrapper.findAll('input[type="password"]')).toHaveLength(3)
    expect(wrapper.find('.cp-submit').text()).toBe('修改密码')
    expect(wrapper.find('.cp-code-btn').exists()).toBe(false)
    expect(wrapper.find('.cs-input').exists()).toBe(false)
    expect(wrapper.find('.cp-badge').text()).toBe('待发送验证码')
  })

  it('当前密码框不给显示切换（旧密码不允许明文回看），仅新密码 / 确认密码可切换', () => {
    const { wrapper } = mountSection()
    expect(wrapper.findAll('button.pw-reveal')).toHaveLength(2)
    const currentField = wrapper.find('#cp-current').element.closest('.pw-field')
    expect(currentField?.querySelector('button')).toBeNull()
  })

  it('新密码少于 8 位 → 内联提示，不发码', async () => {
    const { wrapper, requestSpy } = mountSection()
    await fillAndSubmit(wrapper, { next: 'short', confirm: 'short' })
    expect(wrapper.find('.cp-error').text()).toBe('密码至少需要 8 位')
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('两次新密码不一致 → 内联提示，不发码', async () => {
    const { wrapper, requestSpy } = mountSection()
    await fillAndSubmit(wrapper, { next: 'new-password-1', confirm: 'new-password-2' })
    expect(wrapper.find('.cp-error').text()).toBe('两次输入的新密码不一致')
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('未填当前密码 → 内联提示，不发码', async () => {
    const { wrapper, requestSpy } = mountSection()
    await wrapper.find('#cp-current').setValue('')
    await wrapper.find('#cp-new').setValue('new-password-1')
    await wrapper.find('#cp-confirm').setValue('new-password-1')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.cp-error').text()).toBe('请输入当前密码')
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('三框合法点「修改密码」→ 直接发码，toast 提示验证邮件，展开验证码格', async () => {
    const { wrapper, requestSpy, toast } = mountSection()
    await fillAndSubmit(wrapper)
    expect(requestSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.cs-input').exists()).toBe(true)
    expect(wrapper.findAll('.cs-slot')).toHaveLength(6)
    expect(wrapper.find('.cp-badge').text()).toBe('待输入验证码')
    expect(wrapper.find('.cp-submit').text()).toBe('确认修改')
    expect(lastOf(toast.items)?.title).toBe('验证邮件已发送')
    expect(lastOf(toast.items)?.description).toContain('ab****@qq.com')
    expect(lastOf(toast.items)?.variant).toBe('success')
  })

  it('发码失败（EMAIL_NOT_VERIFIED）→ 提示先验证邮箱，码区不展开', async () => {
    const { wrapper, toast } = mountSection({
      request: async () => {
        throw { code: 'EMAIL_NOT_VERIFIED' } as AppError
      },
    })
    await fillAndSubmit(wrapper)
    expect(wrapper.find('.cp-error').text()).toBe('邮箱尚未验证，请先完成邮箱验证')
    expect(wrapper.find('.cs-input').exists()).toBe(false)
    expect(lastOf(toast.items)?.variant).toBe('error')
  })

  it('验证码不足 6 位 → 内联提示，不调用 changePassword', async () => {
    const { wrapper, changeSpy } = mountSection()
    await readyToSubmit(wrapper, '123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.cp-error').text()).toBe('请输入 6 位邮箱验证码')
    expect(changeSpy).not.toHaveBeenCalled()
  })

  it('完整流程 → changePassword 收到 (当前密码, 新密码, 验证码)，成功 toast 并清空输入', async () => {
    const { wrapper, changeSpy, toast } = mountSection()
    await readyToSubmit(wrapper, '654321')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(changeSpy).toHaveBeenCalledWith('old-password', 'new-password-1', '654321')
    expect(wrapper.find('.cp-success').text()).toBe('密码已修改成功')
    expect(wrapper.find('.cp-error').exists()).toBe(false)
    expect((wrapper.find('#cp-new').element as HTMLInputElement).value).toBe('')
    expect(lastOf(toast.items)?.title).toBe('密码已修改成功')
    expect(lastOf(toast.items)?.description).toContain('其他设备已退出登录')
  })

  it('验证码不正确（PASSWORD_CHANGE_OTP_INVALID）→ 提示重输，码区保留', async () => {
    const { wrapper } = mountSection({
      change: async () => {
        throw { code: 'PASSWORD_CHANGE_OTP_INVALID' } as AppError
      },
    })
    await readyToSubmit(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.cp-error').text()).toBe('验证码不正确，请重新输入')
    expect(wrapper.find('.cs-input').exists()).toBe(true)
  })

  it('验证码过期（PASSWORD_CHANGE_OTP_EXPIRED）→ 提示并收起码区，引导重新发码', async () => {
    const { wrapper } = mountSection({
      change: async () => {
        throw { code: 'PASSWORD_CHANGE_OTP_EXPIRED' } as AppError
      },
    })
    await readyToSubmit(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.cp-error').text()).toBe('验证码已过期，请重新获取')
    expect(wrapper.find('.cs-input').exists()).toBe(false)
    expect(wrapper.find('.cp-badge').text()).toBe('待发送验证码')
  })

  it('原密码错误（INVALID_PASSWORD）→ 提示当前密码错误', async () => {
    const { wrapper } = mountSection({
      change: async () => {
        throw { code: 'INVALID_PASSWORD' } as AppError
      },
    })
    await readyToSubmit(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.cp-error').text()).toBe('当前密码错误，请重试')
    expect(wrapper.find('.cp-success').exists()).toBe(false)
  })

  it('限流（RATE_LIMITED + resetAt）→ 带时间的频率提示', async () => {
    const { wrapper } = mountSection({
      change: async () => {
        throw {
          code: 'RATE_LIMITED',
          details: { resetAt: Date.now() + 60_000 },
        } as AppError
      },
    })
    await readyToSubmit(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.cp-error').text()).toContain('操作过于频繁')
    expect(wrapper.find('.cp-error').text()).toContain('后再试')
  })

  it('账号无密码登录方式（CREDENTIAL_ACCOUNT_NOT_FOUND）→ 引导改用「设置密码」', async () => {
    const { wrapper } = mountSection({
      change: async () => {
        throw { code: 'CREDENTIAL_ACCOUNT_NOT_FOUND' } as AppError
      },
    })
    await readyToSubmit(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.cp-error').text()).toBe('当前账号没有密码登录方式，请使用「设置密码」')
  })
})
