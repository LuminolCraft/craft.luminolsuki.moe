<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <AuthSplitLayout>
    <section ref="rootRef" class="login">
      <p class="login-overline">{{ t('auth.login.overline') }}</p>
      <h1 class="login-title">{{ t('auth.login.title') }}</h1>
      <p class="login-subtitle">{{ t('auth.login.subtitle') }}</p>

      <form class="login-form" novalidate @submit.prevent="onSubmit">
        <AuthField
          v-model="email"
          type="email"
          :label="t('auth.login.emailLabel')"
          autocomplete="email"
          placeholder="you@example.com"
          :invalid="formInvalid"
        />
        <AuthField
          v-model="password"
          type="password"
          :label="t('auth.login.passwordLabel')"
          autocomplete="current-password"
          :invalid="formInvalid"
        />

        <label class="login-remember">
          <input v-model="remember" type="checkbox" class="remember-input" />
          <span class="remember-box" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12l5 5L19 7" />
            </svg>
          </span>
          <span class="remember-text">{{ t('auth.login.remember') }}</span>
        </label>

        <AuthButton :loading="pending">{{ t('auth.login.submit') }}</AuthButton>
      </form>

      <p class="login-forgot">
        <RouterLink to="/forgot-password">{{ t('auth.login.forgot') }}</RouterLink>
      </p>

      <div v-if="errorMsg" class="login-error" role="alert">
        <p class="login-error-text">{{ errorMsg }}</p>
        <button
          v-if="emailUnverified && !resent"
          type="button"
          class="login-resend"
          :disabled="resendPending || resendCooldown > 0"
          @click="onResend"
        >
          {{
            resendPending
              ? t('auth.forgot.resending')
              : resendCooldown > 0
                ? t('auth.forgot.resendCooldown', { time: resendCooldown })
                : t('auth.forgot.resendVerification')
          }}
        </button>
        <p v-if="resent" class="login-resend-done" role="status">{{ t('auth.forgot.resent') }}</p>
      </div>

      <div class="login-divider" aria-hidden="true">
        <span>{{ t('auth.login.orDivider') }}</span>
      </div>

      <!-- 第三方登录：QQ 暂下线置灰占位（用户决策），GitHub 整页跳转授权 -->
      <div class="login-providers">
        <button
          type="button"
          class="login-qq"
          disabled
          :title="t('auth.login.qqUnavailable')"
          :aria-label="t('auth.login.qqUnavailable')"
        >
          <span class="login-qq-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673"
              />
            </svg>
          </span>
          <span>{{ t('auth.login.qq') }}</span>
        </button>
        <button
          type="button"
          class="login-github"
          :disabled="githubPending || githubUnavailable"
          :title="githubUnavailable ? t('auth.login.githubUnavailable') : t('auth.login.github')"
          :aria-label="githubUnavailable ? t('auth.login.githubUnavailable') : t('auth.login.github')"
          @click="onGithubLogin"
        >
          <span class="login-qq-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
          </span>
          <span>{{ t('auth.login.github') }}</span>
        </button>
      </div>

      <p class="login-signup">
        <span>{{ t('auth.login.noAccount') }}</span>
        <RouterLink to="/register">{{ t('auth.login.signup') }}</RouterLink>
      </p>
    </section>
  </AuthSplitLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout.vue'
import AuthButton from '@/components/auth/AuthButton.vue'
import AuthField from '@/components/auth/AuthField.vue'
import { useAuthStore } from '@/stores/auth'
import { isAppError, errorToResetAt } from '@/lib/api'
import { resolveInternalPath } from '@/utils/internalPath'
import { useGsap } from '@/composables/useGsap'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { create, reduceMotion } = useGsap()

const rootRef = ref<HTMLElement | null>(null)
const email = ref('')
const password = ref('')
const remember = ref(false)
const pending = ref(false)
const formInvalid = ref(false)
const errorMsg = ref('')
// 未验证门禁状态：后端 403 EMAIL_NOT_VERIFIED 时展示重发验证邮件入口。
// 后端 sendOnSignIn 已随本次登录自动补发一封验证邮件，因此按钮带 60s 冷却，
// 避免用户立刻再点导致重复发信（邮件传输层有按收件人配额，超发会被静默跳过）
const emailUnverified = ref(false)
const resendPending = ref(false)
const resent = ref(false)
const resendCooldown = ref(0)
let cooldownTimer: number | null = null

function startResendCooldown(seconds = 60) {
  resendCooldown.value = seconds
  if (cooldownTimer !== null) window.clearInterval(cooldownTimer)
  cooldownTimer = window.setInterval(() => {
    resendCooldown.value -= 1
    if (resendCooldown.value <= 0 && cooldownTimer !== null) {
      window.clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

// GitHub 登录（2026-09-09 实测可用后解除置灰；此前曾按用户要求临时置灰）
const githubPending = ref(false)
const githubUnavailable = ref(false)

/**
 * GitHub 登录：整页跳转授权（store.signInWithGitHub）。
 * 后端未配置 GitHub 凭证（404 PROVIDER_NOT_FOUND）时按钮置灰降级为「GitHub 登录暂未开放」。
 */
async function onGithubLogin() {
  if (githubPending.value || githubUnavailable.value) return
  errorMsg.value = ''
  githubPending.value = true
  try {
    // 成功路径：signInWithGitHub 内部已发起整页跳转离开本页。
    // 注意：location.href 赋值后页面卸载有延迟，此处刻意不重置 pending，
    // 让按钮在跳转完成前保持禁用，防止用户连点并发起多次 OAuth 请求。
    await auth.signInWithGitHub(route.query.redirect)
  } catch (e) {
    githubPending.value = false
    if (isAppError(e) && e.code === 'PROVIDER_NOT_FOUND') {
      githubUnavailable.value = true
    } else {
      errorMsg.value = t('auth.login.genericError')
    }
  }
}

function handleAuthError(e: unknown) {
  if (!isAppError(e)) {
    errorMsg.value = t('auth.login.networkError')
    return
  }
  switch (e.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      errorMsg.value = t('auth.login.invalidCredentials')
      formInvalid.value = true
      break
    case 'EMAIL_VERIFICATION_REQUIRED':
      emailUnverified.value = true
      startResendCooldown() // 登录时后端已自动补发一封，冷却防止立刻重复发送
      errorMsg.value = t('auth.login.emailNotVerified')
      break
    case 'RATE_LIMITED': {
      const resetAt = errorToResetAt(e)
      errorMsg.value = resetAt
        ? t('auth.login.rateLimitedUntil', { time: new Date(resetAt).toLocaleString() })
        : t('auth.login.rateLimited')
      break
    }
    case 'NETWORK_ERROR':
      errorMsg.value = t('auth.login.networkError')
      break
    default:
      errorMsg.value = t('auth.login.genericError')
  }
}

/** 重发验证邮件（未验证门禁的自愈路径，避免「反复登录刷邮件」死循环） */
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

  if (!EMAIL_RE.test(email.value.trim()) || password.value.length === 0) {
    formInvalid.value = true
    errorMsg.value = t('auth.login.invalidForm')
    return
  }

  pending.value = true
  try {
    await auth.signIn(email.value.trim(), password.value, remember.value, route.query.redirect)
    // 登录成功：回跳安全站内路径（防开放重定向），无 redirect 时进入用户中心
    router.replace(resolveInternalPath(route.query.redirect, '/settings'))
  } catch (e) {
    handleAuthError(e)
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.login > *', {
      autoAlpha: 0,
      y: 22,
      duration: 0.65,
      ease: 'power3.out',
      stagger: 0.08,
      delay: 0.15,
      // 入场结束后清除内联样式，避免与按钮的 hover 位移/禁用态样式冲突
      clearProps: 'all',
    })
  })
})

// 离开页面清理冷却倒计时，避免悬挂定时器
onUnmounted(() => {
  if (cooldownTimer !== null) {
    window.clearInterval(cooldownTimer)
    cooldownTimer = null
  }
})
</script>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.login-overline {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--primary-color);
  margin: 0 0 1.1rem;
}

.login-title {
  font-size: clamp(2.4rem, 5vw, 3.4rem);
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1.05;
  color: var(--text-color);
  margin: 0 0 1rem;
}

.login-subtitle {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 2.2rem;
  max-width: 26rem;
}

/* ---------- 表单 ---------- */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  width: 100%;
  max-width: 26rem;
}
.login-form .auth-btn {
  max-width: 26rem;
  margin-top: 0.35rem;
}

/* ---------- 记住我 ---------- */
.login-remember {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  user-select: none;
  margin: -0.15rem 0 0;
}
.remember-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.remember-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  border-radius: 5px;
  border: 1.5px solid var(--border-color);
  background: var(--background-color);
  color: transparent;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}
.remember-box svg {
  width: 12px;
  height: 12px;
}
.remember-input:checked + .remember-box {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--vercel-white);
}
.remember-input:focus-visible + .remember-box {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}
.remember-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
}
.login-remember:hover .remember-text {
  color: var(--text-color);
}

/* ---------- 次级入口 ---------- */
.login-forgot {
  margin: 1.4rem 0 0;
  font-size: 0.85rem;
}
.login-forgot a {
  color: var(--text-secondary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition:
    color 0.2s ease,
    border-color 0.2s ease;
}
.login-forgot a:hover {
  color: var(--text-color);
  border-bottom-color: var(--text-secondary);
}

/* ---------- 错误区 ---------- */
.login-error {
  margin-top: 1.2rem;
  padding: 0.85rem 1rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  max-width: 26rem;
}
.login-error-text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}
.login-resend {
  margin-top: 0.75rem;
  padding: 0.5rem 0.9rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.82rem;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    opacity 0.2s ease;
}
.login-resend:hover {
  border-color: var(--text-secondary);
}
.login-resend:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.login-resend:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}
.login-resend-done {
  margin: 0.6rem 0 0;
  font-size: 0.82rem;
  color: var(--text-color);
}

/* ---------- 分割线 + QQ 登录 ---------- */
.login-divider {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  width: 100%;
  max-width: 26rem;
  margin-top: 2rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}
.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
}

/* 第三方登录按钮容器：QQ + GitHub 两列 */
.login-providers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
  width: 100%;
  max-width: 26rem;
  margin-top: 1.1rem;
}
/* QQ / GitHub 登录（站点自绘样式，可用态） */
.login-qq,
.login-github {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 13px 28px;
  background: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;
}
.login-qq:hover,
.login-github:hover {
  border-color: var(--text-secondary);
}
.login-qq:disabled,
.login-github:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.login-qq:focus-visible,
.login-github:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 3px;
}
.login-qq-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--primary-color);
  color: var(--vercel-white);
}
.login-qq-badge svg {
  width: 13px;
  height: 13px;
}

.login-signup {
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
.login-signup a {
  color: var(--primary-color);
  font-weight: 500;
  text-decoration: none;
}
.login-signup a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ---------- 移动端：压缩纵向间距，配合 32dvh 艺术面板尽量单屏呈现 ---------- */
@media (max-width: 896px) {
  .login-overline {
    margin-bottom: 0.8rem;
  }
  .login-title {
    font-size: clamp(2rem, 9vw, 2.6rem);
    margin-bottom: 0.7rem;
  }
  .login-subtitle {
    font-size: 0.92rem;
    margin-bottom: 1.5rem;
  }
  .login-form {
    gap: 0.95rem;
  }
  .login-forgot {
    margin-top: 1.1rem;
  }
  .login-divider {
    margin-top: 1.5rem;
  }
  .login-signup {
    margin-top: 1.8rem;
    padding-top: 1.1rem;
  }
}
</style>
