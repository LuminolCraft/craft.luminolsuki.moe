<template>
  <!-- 区块 C：修改密码 —— 仅已有 credential（邮箱密码）登录方式的账号渲染；
       没有密码的 OAuth 账号走 LinkedAccounts 的「设置密码」区块，两者互补。
       改密走邮箱验证码门禁（事前验证）：先取码，再提交三步表单 + 验证码。
       根元素沿用 .security-section（AccountSecurity.vue 的 GSAP 入场选择器
       按该文档级类名覆盖本组件，见 LinkedAccounts.vue 同名注释）。 -->
  <section class="security-section">
    <h2 class="security-section-title">{{ t('auth.security.changePassword.sectionTitle') }}</h2>
    <p class="cp-desc">{{ t('auth.security.changePassword.sectionDesc') }}</p>

    <form class="cp-form" novalidate @submit.prevent="onSubmit">
      <!-- 当前密码是旧密码：不给眼睛按钮，明文不允许回看 -->
      <PasswordField
        id="cp-current"
        v-model="currentPassword"
        :label="t('auth.security.changePassword.currentLabel')"
        :placeholder="t('auth.security.changePassword.currentPlaceholder')"
        autocomplete="current-password"
        :disabled="submitting"
        :revealable="false"
      />

      <PasswordField
        id="cp-new"
        v-model="newPassword"
        :label="t('auth.security.changePassword.newLabel')"
        :placeholder="t('auth.security.changePassword.newPlaceholder')"
        autocomplete="new-password"
        :disabled="submitting"
      />

      <PasswordField
        id="cp-confirm"
        v-model="confirmPassword"
        :label="t('auth.security.changePassword.confirmLabel')"
        :placeholder="t('auth.security.changePassword.newPlaceholder')"
        autocomplete="new-password"
        :disabled="submitting"
      />

      <div class="cp-otp-send">
        <button
          type="button"
          class="cp-code-btn"
          :disabled="sending || countdown > 0 || submitting"
          @click="onSendCode"
        >
          {{
            sending
              ? t('auth.security.changePassword.sendingCode')
              : countdown > 0
                ? t('auth.security.changePassword.resendIn', { seconds: countdown })
                : codeSent
                  ? t('auth.security.changePassword.resendCode')
                  : t('auth.security.changePassword.sendCode')
          }}
        </button>
        <span v-if="codeSent" class="cp-otp-hint">
          {{ t('auth.security.changePassword.codeSentTo', { email: codeSent.maskedEmail }) }}
        </span>
      </div>

      <template v-if="codeSent">
        <span class="cp-otp-label">{{ t('auth.security.changePassword.codeLabel') }}</span>
        <OtpCodeField v-model="otp" :disabled="submitting" :label="t('auth.security.changePassword.codeLabel')" />
        <p class="cp-otp-warn">{{ t('auth.security.changePassword.codeWarning') }}</p>
      </template>

      <button
        type="submit"
        class="cp-submit"
        :disabled="submitting || !codeSent || otp.length !== OTP_LENGTH"
      >
        {{ submitting ? t('auth.security.changePassword.submitting') : t('auth.security.changePassword.submit') }}
      </button>

      <p v-if="errorMsg" class="cp-error" role="alert">{{ errorMsg }}</p>
      <template v-if="done">
        <p class="cp-success" role="status">{{ t('auth.security.changePassword.done') }}</p>
        <p class="cp-success-hint">{{ t('auth.security.changePassword.doneHint') }}</p>
      </template>
    </form>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import OtpCodeField from '@/components/account/OtpCodeField.vue'
import PasswordField from '@/components/account/PasswordField.vue'
import { errorToResetAt, isAppError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { PasswordChangeOtpInfo } from '@/types/auth'

const { t } = useI18n()
const auth = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const otp = ref('')
const submitting = ref(false)
const sending = ref(false)
const codeSent = ref<PasswordChangeOtpInfo | null>(null)
const countdown = ref(0)
const errorMsg = ref('')
const done = ref(false)

/** 密码最小长度与注册 / 设置密码一致（后端 8~128，前端先做一致性校验） */
const MIN_PASSWORD_LENGTH = 8
/** 验证码位数（与后端 SECURITY_POLICY.passwordChangeOtpLength 一致） */
const OTP_LENGTH = 6
/** 重发冷却秒数（服务端按用户 3 次 / 10 分钟限流，此处只做交互防抖） */
const RESEND_COOLDOWN_SECONDS = 60

let timer: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  countdown.value = RESEND_COOLDOWN_SECONDS
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

/** 发送（或重发）验证码：成功后展开验证码输入区并开始冷却倒计时 */
async function onSendCode() {
  if (sending.value || submitting.value) return
  errorMsg.value = ''
  done.value = false
  // 先做本地密码校验：避免填错密码却先烧掉一次发码额度
  if (newPassword.value.length < MIN_PASSWORD_LENGTH) {
    errorMsg.value = t('auth.security.changePassword.weakPassword')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = t('auth.security.changePassword.passwordMismatch')
    return
  }
  if (currentPassword.value.length === 0) {
    errorMsg.value = t('auth.security.changePassword.currentRequired')
    return
  }

  sending.value = true
  try {
    codeSent.value = await auth.requestPasswordChangeOtp()
    otp.value = ''
    startCountdown()
  } catch (e) {
    errorMsg.value = resolveSendError(e)
  } finally {
    sending.value = false
  }
}

/** 发码错误文案分发（只依赖 code） */
function resolveSendError(e: unknown): string {
  if (isAppError(e)) {
    if (e.code === 'EMAIL_NOT_VERIFIED') return t('auth.security.changePassword.emailNotVerified')
    if (e.code === 'CREDENTIAL_ACCOUNT_NOT_FOUND') {
      return t('auth.security.changePassword.notAvailable')
    }
    if (e.code === 'RATE_LIMITED') {
      const resetAt = errorToResetAt(e)
      return resetAt
        ? t('auth.security.changePassword.rateLimitedUntil', {
            time: new Date(resetAt).toLocaleString(),
          })
        : t('auth.security.changePassword.rateLimited')
    }
  }
  return t('auth.security.changePassword.sendCodeFailed')
}

/** 改密错误文案分发（验证码 / 原密码 / 限流各自可定位） */
function resolveSubmitError(e: unknown): string {
  if (!isAppError(e)) return t('auth.security.changePassword.failed')
  switch (e.code) {
    case 'INVALID_PASSWORD':
      return t('auth.security.changePassword.invalidCurrent')
    case 'PASSWORD_CHANGE_OTP_INVALID':
      return t('auth.security.changePassword.codeInvalid')
    case 'PASSWORD_CHANGE_OTP_EXPIRED':
      return t('auth.security.changePassword.codeExpired')
    case 'PASSWORD_CHANGE_OTP_TOO_MANY_ATTEMPTS':
      return t('auth.security.changePassword.codeTooManyAttempts')
    case 'CREDENTIAL_ACCOUNT_NOT_FOUND':
      return t('auth.security.changePassword.notAvailable')
    case 'EMAIL_NOT_VERIFIED':
      return t('auth.security.changePassword.emailNotVerified')
    case 'RATE_LIMITED': {
      const resetAt = errorToResetAt(e)
      return resetAt
        ? t('auth.security.changePassword.rateLimitedUntil', {
            time: new Date(resetAt).toLocaleString(),
          })
        : t('auth.security.changePassword.rateLimited')
    }
    default:
      return t('auth.security.changePassword.failed')
  }
}

async function onSubmit() {
  if (submitting.value) return
  errorMsg.value = ''
  done.value = false

  if (newPassword.value.length < MIN_PASSWORD_LENGTH) {
    errorMsg.value = t('auth.security.changePassword.weakPassword')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = t('auth.security.changePassword.passwordMismatch')
    return
  }
  if (currentPassword.value.length === 0) {
    errorMsg.value = t('auth.security.changePassword.currentRequired')
    return
  }
  if (otp.value.length !== OTP_LENGTH) {
    errorMsg.value = t('auth.security.changePassword.codeRequired')
    return
  }

  submitting.value = true
  try {
    // store 内部成功后重拉设备列表（服务端已撤销其他设备会话）
    await auth.changePassword(currentPassword.value, newPassword.value, otp.value)
    done.value = true
    codeSent.value = null
    otp.value = ''
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    errorMsg.value = resolveSubmitError(e)
    // 验证码失效类错误：收起输入区，引导重新取码
    if (
      isAppError(e) &&
      (e.code === 'PASSWORD_CHANGE_OTP_EXPIRED' ||
        e.code === 'PASSWORD_CHANGE_OTP_TOO_MANY_ATTEMPTS')
    ) {
      codeSent.value = null
      otp.value = ''
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* 与 LinkedAccounts.vue 的 .security-section / 表单范式同构（父页 GSAP 入场
   选择器依赖 .security-section 这一文档级类名） */
.security-section {
  margin-bottom: 2.2rem;
}
.security-section-title {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 0.4rem;
}

.cp-desc {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0 0 1rem;
}

.cp-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 26rem;
}

.cp-otp-send {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.cp-code-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border-color, #e4e4e7);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    opacity 0.15s ease;
}
.cp-code-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
}
.cp-code-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cp-code-btn:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

.cp-otp-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.cp-otp-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: -0.5rem;
}

.cp-otp-warn {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.cp-submit {
  align-self: flex-start;
  padding: 0.6rem 1.4rem;
  background: var(--primary-color);
  border: none;
  border-radius: 6px;
  color: var(--vercel-white);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    translate 0.15s ease,
    opacity 0.15s ease;
}
.cp-submit:hover:not(:disabled) {
  translate: 0 -1px;
}
.cp-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cp-submit:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

.cp-error {
  margin: 0.8rem 0 0;
  padding: 0.75rem 0.9rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}

.cp-success {
  margin: 0.8rem 0 0;
  font-size: 0.85rem;
  color: var(--primary-color);
}
.cp-success-hint {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
</style>
