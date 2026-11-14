<template>
  <!-- 区块 C：修改密码 —— 仅已有 credential（邮箱密码）登录方式的账号渲染；
       没有密码的 OAuth 账号走 LinkedAccounts 的「设置密码」区块，两者互补。
       改密走邮箱验证码门禁：第一次点「修改密码」= 校验三框并发码（提示走全局
       toast），第二次点「确认修改」= 校验验证码后提交，故没有独立的发码按钮。
       根元素沿用 .security-section（AccountSecurity.vue 的 GSAP 入场选择器
       按该文档级类名覆盖本组件，见 LinkedAccounts.vue 同名注释）。 -->
  <section class="security-section cp-card">
    <header class="cp-head">
      <span class="cp-head-icon" aria-hidden="true">
        <HugeiconsIcon :icon="lockIcon" :size="18" :stroke-width="1.8" />
      </span>
      <div class="cp-head-text">
        <h2 class="cp-title">{{ t('auth.security.changePassword.sectionTitle') }}</h2>
        <p class="cp-desc">{{ t('auth.security.changePassword.sectionDesc') }}</p>
      </div>
      <span class="cp-badge" :data-state="hasCode ? 'sent' : 'idle'">
        {{
          hasCode
            ? t('auth.security.changePassword.stepSent')
            : t('auth.security.changePassword.stepIdle')
        }}
      </span>
    </header>

    <form class="cp-form" novalidate @submit.prevent="onSubmit">
      <div class="cp-grid">
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
      </div>

      <!-- 发码后才展开：验证码格子 + 重发 + 安全提示 -->
      <Transition name="cp-reveal">
        <div v-if="hasCode" class="cp-code-panel">
          <div class="cp-code-head">
            <span class="cp-code-label">{{ t('auth.security.changePassword.codeLabel') }}</span>
            <button
              type="button"
              class="cp-resend"
              :disabled="sending || countdown > 0 || submitting"
              @click="sendCode"
            >
              {{
                sending
                  ? t('auth.security.changePassword.sendingCode')
                  : countdown > 0
                    ? t('auth.security.changePassword.resendIn', { seconds: countdown })
                    : t('auth.security.changePassword.resendLabel')
              }}
            </button>
          </div>

          <CodeSlots
            :length="OTP_LENGTH"
            :value="otp"
            :status="codeStatus"
            :slot-size="46"
            :gap="8"
            :radius="10"
            ink-color="var(--text-color)"
            slot-color="color-mix(in srgb, var(--text-color) 7%, transparent)"
            accent-color="var(--primary-color)"
            digit-color="#ffffff"
            danger-color="var(--error-color, #e5484d)"
            :aria-label="t('auth.security.changePassword.codeLabel')"
            :disabled="submitting"
            auto-focus
            @change="onCodeChange"
          />

          <p class="cp-code-hint">{{ t('auth.security.changePassword.codeWarning') }}</p>
        </div>
      </Transition>

      <div class="cp-foot">
        <button type="submit" class="cp-submit" :disabled="submitting || sending">
          {{
            submitting
              ? t('auth.security.changePassword.submitting')
              : hasCode
                ? t('auth.security.changePassword.confirmSubmit')
                : t('auth.security.changePassword.submit')
          }}
        </button>
        <p v-if="errorMsg" class="cp-error" role="alert">{{ errorMsg }}</p>
        <p v-else-if="done" class="cp-success" role="status">
          {{ t('auth.security.changePassword.done') }}
        </p>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { LockPasswordIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconArray } from '@hugeicons/vue'
import CodeSlots, { type CodeSlotsStatus } from '@/components/bits/CodeSlots.vue'
import PasswordField from '@/components/account/PasswordField.vue'
import { errorToResetAt, isAppError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { PasswordChangeOtpInfo } from '@/types/auth'

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()

const lockIcon = LockPasswordIcon as unknown as IconArray

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const otp = ref('')
const submitting = ref(false)
const sending = ref(false)
const codeSent = ref<PasswordChangeOtpInfo | null>(null)
const codeStatus = ref<CodeSlotsStatus>('idle')
const countdown = ref(0)
const errorMsg = ref('')
const done = ref(false)

const hasCode = computed(() => codeSent.value !== null)

/** 密码最小长度与注册 / 设置密码一致（后端 8~128，前端先做一致性校验） */
const MIN_PASSWORD_LENGTH = 8
/** 验证码位数（与后端 SECURITY_POLICY.passwordChangeOtpLength 一致） */
const OTP_LENGTH = 6
/** 重发冷却秒数（服务端按用户 3 次 / 10 分钟限流，此处只做交互防抖） */
const RESEND_COOLDOWN_SECONDS = 60

let timer: ReturnType<typeof setInterval> | null = null
let statusTimer: ReturnType<typeof setTimeout> | null = null

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
  if (statusTimer) clearTimeout(statusTimer)
})

/** 本地区块校验：三框都过才允许发码 */
function validatePasswords(): boolean {
  if (newPassword.value.length < MIN_PASSWORD_LENGTH) {
    errorMsg.value = t('auth.security.changePassword.weakPassword')
    return false
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = t('auth.security.changePassword.passwordMismatch')
    return false
  }
  if (currentPassword.value.length === 0) {
    errorMsg.value = t('auth.security.changePassword.currentRequired')
    return false
  }
  return true
}

/** 发送（或重发）验证码：成功即用 toast 提示「验证邮件已发送」并展开验证码区 */
async function sendCode() {
  if (sending.value || submitting.value || countdown.value > 0) return
  errorMsg.value = ''
  done.value = false
  // 先做本地密码校验：避免填错密码却先烧掉一次发码额度
  if (!validatePasswords()) return

  sending.value = true
  try {
    const info = await auth.requestPasswordChangeOtp(currentPassword.value)
    codeSent.value = info
    otp.value = ''
    codeStatus.value = 'idle'
    startCountdown()
    toast.success(
      t('auth.security.changePassword.codeSentTitle'),
      t('auth.security.changePassword.codeSentDesc', { email: info.maskedEmail }),
    )
  } catch (e) {
    const msg = resolveSendError(e)
    errorMsg.value = msg
    toast.error(t('auth.security.changePassword.sendCodeFailed'), msg)
  } finally {
    sending.value = false
  }
}

/** 验证码变化：错误态在用户重新输入时复位，避免一直停在红色 */
function onCodeChange(code: string) {
  otp.value = code
  if (codeStatus.value === 'error') codeStatus.value = 'idle'
}

/** 发码错误文案分发（只依赖 code） */
function resolveSendError(e: unknown): string {
  if (isAppError(e)) {
    // 服务端发码前先验当前密码：密码错就不发信，提示与提交阶段一致
    if (e.code === 'INVALID_PASSWORD') return t('auth.security.changePassword.invalidCurrent')
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
    case 'PASSWORD_WEAK':
      return t('auth.passwordWeak')
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

/**
 * 一个按钮两段语义：
 * - 未发码 → 校验三框并发码（提示走 toast，不弹内联横幅）；
 * - 已发码 → 校验 6 位码后提交改密。
 */
async function onSubmit() {
  if (submitting.value || sending.value) return
  errorMsg.value = ''
  done.value = false

  if (!hasCode.value) {
    await sendCode()
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
    codeStatus.value = 'success'
    done.value = true
    toast.success(t('auth.security.changePassword.done'), t('auth.security.changePassword.doneHint'))
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    otp.value = ''
    codeSent.value = null
    scheduleStatusReset()
  } catch (e) {
    const msg = resolveSubmitError(e)
    errorMsg.value = msg
    codeStatus.value = 'error'
    toast.error(t('auth.security.changePassword.failed'), msg)
    // 验证码失效类错误：收起输入区，引导重新发码
    if (
      isAppError(e) &&
      (e.code === 'PASSWORD_CHANGE_OTP_EXPIRED' ||
        e.code === 'PASSWORD_CHANGE_OTP_TOO_MANY_ATTEMPTS')
    ) {
      codeSent.value = null
      otp.value = ''
    }
    scheduleStatusReset()
  } finally {
    submitting.value = false
  }
}

/** 成功勾/错误红停留一小会儿再回 idle，避免颜色卡死 */
function scheduleStatusReset() {
  if (statusTimer) clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    codeStatus.value = 'idle'
  }, 900)
}
</script>

<style scoped>
/* 与 LinkedAccounts.vue 的 .security-section 同构（父页 GSAP 入场选择器依赖该
   文档级类名）；视觉上包成一张卡片，与下方「设备 / 危险区」拉开层级 */
.security-section {
  margin-bottom: 1.6rem;
}

.cp-card {
  padding: 1.5rem 1.5rem 1.35rem;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg, transparent);
}

/* ---------- 头部 ---------- */
.cp-head {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  margin-bottom: 1.5rem;
}

.cp-head-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 9px;
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  color: var(--primary-color);
}

.cp-head-text {
  min-width: 0;
}

.cp-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-color);
}

.cp-desc {
  margin: 0.32rem 0 0;
  font-size: 0.85rem;
  line-height: 1.65;
  color: var(--text-secondary);
}

.cp-badge {
  flex: none;
  margin-left: auto;
  padding: 0.18rem 0.55rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  font-size: 0.7rem;
  line-height: 1.5;
  color: var(--text-secondary);
  white-space: nowrap;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}
.cp-badge[data-state='sent'] {
  border-color: color-mix(in srgb, var(--primary-color) 42%, transparent);
  background: color-mix(in srgb, var(--primary-color) 9%, transparent);
  color: var(--primary-color);
}

/* ---------- 表单 ---------- */
.cp-form {
  max-width: 34rem;
}

.cp-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 720px) {
  .cp-grid {
    grid-template-columns: 1fr 1fr;
  }
  /* 当前密码独占整行：它是旧密码，与「新密码 / 确认」不是同一组对话 */
  .cp-grid > :first-child {
    grid-column: 1 / -1;
  }
}

/* ---------- 验证码区 ---------- */
.cp-code-panel {
  margin-top: 1.4rem;
  padding-top: 1.4rem;
  border-top: 1px dashed var(--border-color);
}

.cp-code-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.cp-code-label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.cp-resend {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--primary-color);
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.cp-resend:hover:not(:disabled) {
  opacity: 0.75;
}
.cp-resend:disabled {
  color: var(--text-secondary);
  cursor: not-allowed;
}
.cp-resend:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 3px;
  border-radius: 3px;
}

.cp-code-hint {
  margin: 0.95rem 0 0;
  font-size: 0.76rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* 展开过渡 */
.cp-reveal-enter-active,
.cp-reveal-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.28s cubic-bezier(0.23, 1, 0.32, 1);
}
.cp-reveal-enter-from,
.cp-reveal-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---------- 底部操作 ---------- */
.cp-foot {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1.5rem;
}

.cp-submit {
  align-self: flex-start;
  padding: 0.62rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--vercel-white, #fff);
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    translate 0.16s ease,
    box-shadow 0.2s ease,
    opacity 0.16s ease;
}
.cp-submit:hover:not(:disabled) {
  translate: 0 -1px;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--primary-color) 26%, transparent);
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
  margin: 0;
  padding: 0.7rem 0.85rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  font-size: 0.82rem;
  color: var(--error-color, #e5484d);
}

.cp-success {
  margin: 0;
  font-size: 0.82rem;
  color: var(--primary-color);
}

@media (max-width: 600px) {
  .cp-card {
    padding: 1.15rem 1.1rem 1.05rem;
  }
  .cp-head {
    flex-wrap: wrap;
    gap: 0.7rem;
  }
  .cp-badge {
    margin-left: 0;
  }
}
</style>
