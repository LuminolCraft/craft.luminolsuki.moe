/**
 * 「设置 → 安全」修改密码区块（`ChangePassword.vue`）行为测试。
 *
 * 改密走邮箱验证码门禁（事前验证），故流程为两步：
 * 1. 填三步表单 → 点「发送邮箱验证码」（store.requestPasswordChangeOtp）；
 * 2. 输入 6 位验证码 → 提交（store.changePassword(current, next, otp)）。
 *
 * 覆盖：本地一致性校验不打后端、发码成功/失败、完整改密成功、验证码失效类
 * 错误收起输入区、原密码错误 / 限流 / 无密码登录方式的文案分流。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ChangePassword from './ChangePassword.vue'
import zh from '@/i18n/locales/zh'
import { useAuthStore } from '@/stores/auth'
import type { AppError, PasswordChangeOtpInfo } from '@/types/auth'

const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh } })

const SENT: PasswordChangeOtpInfo = { expiresIn: 600, maskedEmail: 'ab****@qq.com' }

/** 挂载区块并注入两个 store 方法的行为（默认发码成功） */
function mountSection(opts: {
  request?: () => Promise<PasswordChangeOtpInfo>
  change?: (current: string, next: string, otp: string) => Promise<void>
}) {
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
  return { wrapper, requestSpy, changeSpy }
}

/** 填三步表单 */
async function fillForm(
  wrapper: VueWrapper,
  values: { current?: string; next?: string; confirm?: string },
) {
  await wrapper.find('#cp-current').setValue(values.current ?? '')
  await wrapper.find('#cp-new').setValue(values.next ?? '')
  await wrapper.find('#cp-confirm').setValue(values.confirm ?? '')
}

/** 点「发送邮箱验证码」 */
async function sendCode(wrapper: VueWrapper) {
  await wrapper.find('.cp-code-btn').trigger('click')
  await flushPromises()
}

/** 逐格填入验证码 */
async function typeOtp(wrapper: VueWrapper, code: string) {
  const cells = wrapper.findAll('.otp-cell')
  for (let i = 0; i < code.length && i < cells.length; i += 1) {
    await cells[i]!.setValue(code[i] as string)
  }
  await flushPromises()
}

/** 填表 → 取码 → 输码（一条完整可提交的前置状态） */
async function completeFlow(wrapper: VueWrapper, code = '123456') {
  await fillForm(wrapper, {
    current: 'old-password',
    next: 'new-password-1',
    confirm: 'new-password-1',
  })
  await sendCode(wrapper)
  await typeOtp(wrapper, code)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ChangePassword（设置 → 安全：修改密码）', () => {
  it('渲染标题、三输入框、发送验证码按钮；验证码区初始不展开', () => {
    const { wrapper } = mountSection({})
    expect(wrapper.find('.security-section-title').text()).toBe('修改密码')
    expect(wrapper.findAll('input[type="password"]')).toHaveLength(3)
    expect(wrapper.find('.cp-code-btn').text()).toBe('发送邮箱验证码')
    expect(wrapper.find('.otp-cell').exists()).toBe(false)
  })

  it('当前密码框不给显示切换（旧密码不允许明文回看），仅新密码 / 确认密码可切换', () => {
    const { wrapper } = mountSection({})
    expect(wrapper.findAll('button.pw-reveal')).toHaveLength(2)
    const currentField = wrapper.find('#cp-current').element.closest('.pw-field')
    expect(currentField?.querySelector('button')).toBeNull()
  })

  it('新密码少于 8 位 → 内联提示，不请求验证码', async () => {
    const { wrapper, requestSpy } = mountSection({})
    await fillForm(wrapper, { current: 'old-password', next: 'short', confirm: 'short' })
    await sendCode(wrapper)
    expect(wrapper.find('.cp-error').text()).toBe('密码至少需要 8 位')
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('两次新密码不一致 → 内联提示，不请求验证码', async () => {
    const { wrapper, requestSpy } = mountSection({})
    await fillForm(wrapper, {
      current: 'old-password',
      next: 'new-password-1',
      confirm: 'new-password-2',
    })
    await sendCode(wrapper)
    expect(wrapper.find('.cp-error').text()).toBe('两次输入的新密码不一致')
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('未填当前密码 → 内联提示，不请求验证码', async () => {
    const { wrapper, requestSpy } = mountSection({})
    await fillForm(wrapper, { next: 'new-password-1', confirm: 'new-password-1' })
    await sendCode(wrapper)
    expect(wrapper.find('.cp-error').text()).toBe('请输入当前密码')
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('发码成功 → 提示打码邮箱并展开 6 格验证码输入，按钮进入倒计时', async () => {
    const { wrapper } = mountSection({})
    await fillForm(wrapper, {
      current: 'old-password',
      next: 'new-password-1',
      confirm: 'new-password-1',
    })
    await sendCode(wrapper)
    expect(wrapper.find('.cp-otp-hint').text()).toContain('ab****@qq.com')
    expect(wrapper.findAll('.otp-cell')).toHaveLength(6)
    expect(wrapper.find('.cp-code-btn').text()).toContain('秒后可重发')
    expect(wrapper.find('.cp-submit').attributes('disabled')).toBeDefined()
  })

  it('发码失败（EMAIL_NOT_VERIFIED）→ 提示先验证邮箱', async () => {
    const { wrapper } = mountSection({
      request: async () => {
        throw { code: 'EMAIL_NOT_VERIFIED' } as AppError
      },
    })
    await fillForm(wrapper, {
      current: 'old-password',
      next: 'new-password-1',
      confirm: 'new-password-1',
    })
    await sendCode(wrapper)
    expect(wrapper.find('.cp-error').text()).toBe('邮箱尚未验证，请先完成邮箱验证')
    expect(wrapper.find('.otp-cell').exists()).toBe(false)
  })

  it('完整流程 → changePassword 收到 (当前密码, 新密码, 验证码)，显示成功提示并清空输入', async () => {
    const { wrapper, changeSpy } = mountSection({})
    await completeFlow(wrapper, '654321')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(changeSpy).toHaveBeenCalledWith('old-password', 'new-password-1', '654321')
    expect(wrapper.find('.cp-success').text()).toBe('密码已修改成功')
    expect(wrapper.find('.cp-success-hint').text()).toContain('其他设备已退出登录')
    expect(wrapper.find('.cp-error').exists()).toBe(false)
    expect((wrapper.find('#cp-current').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#cp-new').element as HTMLInputElement).value).toBe('')
  })

  it('验证码不正确（PASSWORD_CHANGE_OTP_INVALID）→ 提示重输，输入区保留', async () => {
    const { wrapper } = mountSection({
      change: async () => {
        throw { code: 'PASSWORD_CHANGE_OTP_INVALID' } as AppError
      },
    })
    await completeFlow(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.cp-error').text()).toBe('验证码不正确，请重新输入')
    expect(wrapper.findAll('.otp-cell')).toHaveLength(6)
  })

  it('验证码过期（PASSWORD_CHANGE_OTP_EXPIRED）→ 提示并收起输入区，引导重新取码', async () => {
    const { wrapper } = mountSection({
      change: async () => {
        throw { code: 'PASSWORD_CHANGE_OTP_EXPIRED' } as AppError
      },
    })
    await completeFlow(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.cp-error').text()).toBe('验证码已过期，请重新获取')
    expect(wrapper.find('.otp-cell').exists()).toBe(false)
    expect(wrapper.find('.cp-code-btn').exists()).toBe(true)
  })

  it('原密码错误（INVALID_PASSWORD）→ 提示当前密码错误', async () => {
    const { wrapper } = mountSection({
      change: async () => {
        throw { code: 'INVALID_PASSWORD' } as AppError
      },
    })
    await completeFlow(wrapper)
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
    await completeFlow(wrapper)
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
    await completeFlow(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.cp-error').text()).toBe('当前账号没有密码登录方式，请使用「设置密码」')
  })
})
