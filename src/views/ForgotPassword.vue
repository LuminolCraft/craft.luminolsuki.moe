<template>
  <AuthSplitLayout>
    <section ref="rootRef" class="forgot">
      <p class="forgot-overline">{{ t('auth.forgot.overline') }}</p>
      <h1 class="forgot-title">{{ t('auth.forgot.title') }}</h1>
      <p class="forgot-subtitle">{{ t('auth.forgot.subtitle') }}</p>

      <!-- 防账号枚举：无论邮箱是否存在都显示同一结果（文档 §13） -->
      <div v-if="sent" class="forgot-sent" role="status">
        <h2 class="forgot-sent-title">{{ t('auth.forgot.sentTitle') }}</h2>
        <p class="forgot-sent-text">{{ t('auth.forgot.sentDesc') }}</p>
        <RouterLink to="/login" class="forgot-sent-link">{{ t('auth.forgot.backToLogin') }}</RouterLink>
      </div>

      <form v-else class="forgot-form" novalidate @submit.prevent="onSubmit">
        <AuthField
          v-model="email"
          type="email"
          :label="t('auth.forgot.emailLabel')"
          autocomplete="email"
          placeholder="you@example.com"
          :invalid="formInvalid"
        />
        <AuthButton :loading="pending">{{ t('auth.forgot.submit') }}</AuthButton>
      </form>

      <div v-if="errorMsg" class="forgot-error" role="alert">
        <p class="forgot-error-text">{{ errorMsg }}</p>
        <!-- 未验证门禁：提供重发验证邮件的自愈入口（BA send-verification-email 防枚举恒 200） -->
        <button
          v-if="emailUnverified && !resent"
          class="forgot-resend"
          type="button"
          :disabled="resendPending"
          @click="onResend"
        >
          {{ resendPending ? t('auth.forgot.resending') : t('auth.forgot.resendVerification') }}
        </button>
        <p v-if="resent" class="forgot-resend-done" role="status">{{ t('auth.forgot.resent') }}</p>
      </div>

      <p class="forgot-login">
        <span>{{ t('auth.forgot.remembered') }}</span>
        <RouterLink to="/login">{{ t('auth.forgot.backToLogin') }}</RouterLink>
      </p>
    </section>
  </AuthSplitLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout.vue'
import AuthButton from '@/components/auth/AuthButton.vue'
import AuthField from '@/components/auth/AuthField.vue'
import { useAuthStore } from '@/stores/auth'
import { isAppError, errorToResetAt } from '@/lib/api'
import { useGsap } from '@/composables/useGsap'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const { t } = useI18n()
const auth = useAuthStore()
const { create, reduceMotion } = useGsap()

const rootRef = ref<HTMLElement | null>(null)
const email = ref('')
const pending = ref(false)
const sent = ref(false)
const formInvalid = ref(false)
const errorMsg = ref('')
// 未验证门禁状态：后端 403 EMAIL_NOT_VERIFIED 时展示重发验证邮件入口
const emailUnverified = ref(false)
const resendPending = ref(false)
const resent = ref(false)

function handleAuthError(e: unknown) {
  if (!isAppError(e)) {
    errorMsg.value = t('auth.forgot.networkError')
    return
  }
  switch (e.code) {
    case 'RATE_LIMITED': {
      const resetAt = errorToResetAt(e)
      errorMsg.value = resetAt
        ? t('auth.forgot.rateLimitedUntil', { time: new Date(resetAt).toLocaleString() })
        : t('auth.forgot.rateLimited')
      break
    }
    case 'EMAIL_VERIFICATION_REQUIRED':
      emailUnverified.value = true
      errorMsg.value = t('auth.forgot.emailNotVerified')
      break
    case 'NETWORK_ERROR':
      errorMsg.value = t('auth.forgot.networkError')
      break
    default:
      errorMsg.value = t('auth.forgot.genericError')
  }
}

/** 重发验证邮件（未验证门禁的自愈路径：验证 → 登录 → 再走找回/登录） */
async function onResend() {
  if (resendPending.value) return
  resendPending.value = true
  try {
    await auth.sendVerificationEmail(email.value.trim())
    resent.value = true
  } catch (e) {
    handleAuthError(e)
  } finally {
    resendPending.value = false
  }
}

async function onSubmit() {
  if (pending.value) return
  errorMsg.value = ''
  formInvalid.value = false
  // 新一次提交重置未验证门禁状态（错误提示与重发入口随之收起）
  emailUnverified.value = false
  resent.value = false

  if (!EMAIL_RE.test(email.value.trim())) {
    formInvalid.value = true
    errorMsg.value = t('auth.forgot.invalidEmail')
    return
  }

  pending.value = true
  try {
    await auth.requestPasswordReset(email.value.trim())
    sent.value = true
  } catch (e) {
    handleAuthError(e)
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.forgot > *', {
      autoAlpha: 0,
      y: 22,
      duration: 0.65,
      ease: 'power3.out',
      stagger: 0.08,
      delay: 0.15,
      clearProps: 'all',
    })
  })
})
</script>

<style scoped>
.forgot {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.forgot-overline {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--primary-color);
  margin: 0 0 1.1rem;
}

.forgot-title {
  font-size: clamp(2.2rem, 4.6vw, 3.1rem);
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1.05;
  color: var(--text-color);
  margin: 0 0 1rem;
}

.forgot-subtitle {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 2.2rem;
  max-width: 26rem;
}

.forgot-form {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  width: 100%;
  max-width: 26rem;
}
.forgot-form .auth-btn {
  max-width: 26rem;
  margin-top: 0.35rem;
}

/* ---------- 已发送（防枚举统一文案） ---------- */
.forgot-sent {
  max-width: 26rem;
  padding: 1.1rem 1.25rem;
  border-left: 2px solid var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 6%, transparent);
}
.forgot-sent-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-color);
}
.forgot-sent-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text-secondary);
}
.forgot-sent-link {
  display: inline-block;
  margin-top: 0.9rem;
  color: var(--primary-color);
  font-weight: 500;
  font-size: 0.9rem;
  text-decoration: none;
}
.forgot-sent-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.forgot-error {
  margin-top: 1.2rem;
  padding: 0.85rem 1rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  max-width: 26rem;
}
.forgot-error-text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}

/* 未验证门禁：重发验证邮件入口 */
.forgot-resend {
  margin-top: 0.8rem;
  padding: 0.45rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-color);
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary-color) 45%, transparent);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.forgot-resend:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary-color) 22%, transparent);
}
.forgot-resend:disabled {
  opacity: 0.55;
  cursor: wait;
}
.forgot-resend-done {
  margin: 0.8rem 0 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-color);
}

.forgot-login {
  margin: 2.2rem 0 0;
  padding-top: 1.4rem;
  width: 100%;
  border-top: 1px solid var(--border-color);
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.forgot-login a {
  color: var(--primary-color);
  font-weight: 500;
  text-decoration: none;
}
.forgot-login a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 896px) {
  .forgot-overline {
    margin-bottom: 0.8rem;
  }
  .forgot-title {
    font-size: clamp(1.9rem, 8.5vw, 2.4rem);
    margin-bottom: 0.7rem;
  }
  .forgot-subtitle {
    font-size: 0.92rem;
    margin-bottom: 1.5rem;
  }
  .forgot-form {
    gap: 0.95rem;
  }
  .forgot-login {
    margin-top: 1.8rem;
    padding-top: 1.1rem;
  }
}
</style>
