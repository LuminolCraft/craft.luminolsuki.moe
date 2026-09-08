<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <AuthSplitLayout>
    <section ref="rootRef" class="register">
      <p class="register-overline">{{ t('auth.register.overline') }}</p>
      <h1 class="register-title">{{ t('auth.register.title') }}</h1>
      <p class="register-subtitle">{{ t('auth.register.subtitle') }}</p>

      <!-- 注册成功但需邮箱验证：页内成功态（跨浏览器验证状态自动感知，见 startVerifyWaitPolling） -->
      <div v-if="registered" class="register-success" role="status">
        <h2 class="register-success-title">{{ t('auth.register.successTitle') }}</h2>
        <p class="register-success-text">{{ t('auth.register.successDesc') }}</p>
        <p class="register-waiting" :class="{ 'is-done': verifyDone }">
          <span class="register-waiting-dot" aria-hidden="true"></span>
          {{ verifyDone ? t('auth.register.verifiedEntering') : t('auth.register.waitingDetect') }}
        </p>
        <RouterLink v-if="!verifyDone" to="/login" class="register-success-link">
          {{ t('auth.register.toLogin') }}
        </RouterLink>
      </div>

      <form v-else class="register-form" novalidate @submit.prevent="onSubmit">
        <AuthField
          v-model="username"
          type="text"
          :label="t('auth.register.usernameLabel')"
          autocomplete="username"
          :invalid="formInvalid"
        />
        <AuthField
          v-model="email"
          type="email"
          :label="t('auth.register.emailLabel')"
          autocomplete="email"
          placeholder="you@example.com"
          :invalid="formInvalid"
        />
        <AuthField
          v-model="password"
          type="password"
          :label="t('auth.register.passwordLabel')"
          autocomplete="new-password"
          :invalid="formInvalid"
        />
        <AuthField
          v-model="confirmPassword"
          type="password"
          :label="t('auth.register.confirmLabel')"
          autocomplete="new-password"
          :invalid="formInvalid"
        />

        <AuthButton :loading="pending">{{ t('auth.register.submit') }}</AuthButton>
      </form>

      <div v-if="errorMsg" class="register-error" role="alert">
        <p class="register-error-text">{{ errorMsg }}</p>
      </div>

      <p class="register-login">
        <span>{{ t('auth.register.hasAccount') }}</span>
        <RouterLink to="/login">{{ t('auth.register.login') }}</RouterLink>
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
import { api, isAppError } from '@/lib/api'
import { resolveInternalPath } from '@/utils/internalPath'
import { useGsap } from '@/composables/useGsap'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { create, reduceMotion } = useGsap()

const rootRef = ref<HTMLElement | null>(null)
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const pending = ref(false)
const registered = ref(false)
const verifyDone = ref(false)
const formInvalid = ref(false)
const errorMsg = ref('')

// ---------- 跨浏览器验证状态感知（参照 MC 绑定验证：状态以服务端为真相源） ----------
// 注册后持后端签发的短期等待令牌轮询验证状态：用户在【任何浏览器】点击邮件
// 链接完成验证后，本页面都能感知并自动补登（用注册表单中用户自己输入的
// 凭据走标准 BA 登录）。密码仅存于组件内存，不落任何存储；令牌过期/限流
// 优雅降级为"手动刷新/登录"主路径。
const VERIFY_WAIT_POLL_MS = 4000
const VERIFY_WAIT_MAX_MS = 15 * 60 * 1000
let pollTimer: number | null = null
let pollStopped = false

function stopVerifyWaitPolling() {
  pollStopped = true
  if (pollTimer !== null) {
    window.clearTimeout(pollTimer)
    pollTimer = null
  }
}

async function startVerifyWaitPolling() {
  pollStopped = false
  let token = ''
  try {
    const res = await api.post<{ token: string; expiresIn: number }>('/auth/verify-wait', {
      email: email.value.trim(),
    })
    token = res.token
  } catch {
    // 令牌创建失败（限流/网络）→ 仅失去跨浏览器自动感知，主流程不受影响
    return
  }
  const startedAt = Date.now()
  const poll = async () => {
    if (pollStopped) return
    try {
      const r = await api.get<{ status: 'pending' | 'verified' }>(`/auth/verify-wait/${token}`)
      if (r.status === 'verified') {
        await finishVerified()
        return
      }
    } catch (e) {
      if (isAppError(e) && e.code === 'NOT_FOUND') return // 令牌过期：停止轮询
      // 429 / 网络错误：跳过本轮，下个周期继续
    }
    if (pollStopped) return
    if (Date.now() - startedAt > VERIFY_WAIT_MAX_MS) return // 超时：引导手动登录
    pollTimer = window.setTimeout(poll, VERIFY_WAIT_POLL_MS)
  }
  pollTimer = window.setTimeout(poll, VERIFY_WAIT_POLL_MS)
}

async function finishVerified() {
  stopVerifyWaitPolling()
  verifyDone.value = true
  try {
    // 自动补登（rememberMe 持久会话）；signIn 成功内部已广播其他标签页
    await auth.signIn(email.value.trim(), password.value, true)
    router.replace(resolveInternalPath(route.query.redirect, '/settings'))
  } catch {
    // 自动登录失败（罕见：密码校验不过等）→ 引导去登录页手动登录
    await router.replace('/login')
  }
}

function handleAuthError(e: unknown) {
  if (!isAppError(e)) {
    errorMsg.value = t('auth.register.networkError')
    return
  }
  switch (e.code) {
    case 'USER_ALREADY_EXISTS':
      errorMsg.value = t('auth.register.emailTaken')
      formInvalid.value = true
      break
    case 'INVALID_PASSWORD':
      errorMsg.value = t('auth.register.weakPassword')
      formInvalid.value = true
      break
    case 'RATE_LIMITED':
      errorMsg.value = t('auth.register.rateLimited')
      break
    case 'NETWORK_ERROR':
      errorMsg.value = t('auth.register.networkError')
      break
    default:
      errorMsg.value = t('auth.register.genericError')
  }
}

async function onSubmit() {
  if (pending.value) return
  errorMsg.value = ''
  formInvalid.value = false

  const name = username.value.trim()
  if (name.length < 2 || name.length > 32) {
    formInvalid.value = true
    errorMsg.value = t('auth.register.invalidUsername')
    return
  }
  if (!EMAIL_RE.test(email.value.trim())) {
    formInvalid.value = true
    errorMsg.value = t('auth.register.invalidEmail')
    return
  }
  if (password.value.length < 8) {
    formInvalid.value = true
    errorMsg.value = t('auth.register.weakPassword')
    return
  }
  if (password.value !== confirmPassword.value) {
    formInvalid.value = true
    errorMsg.value = t('auth.register.passwordMismatch')
    return
  }

  pending.value = true
  try {
    const autoSignedIn = await auth.signUp(name, email.value.trim(), password.value)
    if (autoSignedIn) {
      // 注册即登录（后端未强制邮箱验证）：回跳安全站内路径，无 redirect 时进入用户中心
      router.replace(resolveInternalPath(route.query.redirect, '/settings'))
    } else {
      // 后端要求邮箱验证：页内提示查收邮件，并启动跨浏览器验证状态轮询
      registered.value = true
      startVerifyWaitPolling()
    }
  } catch (e) {
    handleAuthError(e)
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.register > *', {
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

// 离开页面（含自动登录跳转）时停止轮询，避免悬挂定时器
onUnmounted(stopVerifyWaitPolling)
</script>

<style scoped>
.register {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.register-overline {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--primary-color);
  margin: 0 0 1.1rem;
}

.register-title {
  font-size: clamp(2.2rem, 4.6vw, 3.1rem);
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1.05;
  color: var(--text-color);
  margin: 0 0 1rem;
}

.register-subtitle {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 2.2rem;
  max-width: 26rem;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  width: 100%;
  max-width: 26rem;
}
.register-form .auth-btn {
  max-width: 26rem;
  margin-top: 0.35rem;
}

.register-error {
  margin-top: 1.2rem;
  padding: 0.85rem 1rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  max-width: 26rem;
}
.register-error-text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}

/* ---------- 注册成功（待邮箱验证） ---------- */
.register-success {
  max-width: 26rem;
  padding: 1.1rem 1.25rem;
  border-left: 2px solid var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 6%, transparent);
}
.register-success-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-color);
}
.register-success-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text-secondary);
}
.register-waiting {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.85rem 0 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
}
.register-waiting.is-done {
  color: var(--primary-color);
  font-weight: 500;
}
.register-waiting-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
  animation: register-waiting-pulse 1.2s ease-in-out infinite;
}
.register-waiting.is-done .register-waiting-dot {
  animation: none;
}
@keyframes register-waiting-pulse {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .register-waiting-dot {
    animation: none;
  }
}
.register-success-link {
  display: inline-block;
  margin-top: 0.9rem;
  color: var(--primary-color);
  font-weight: 500;
  font-size: 0.9rem;
  text-decoration: none;
}
.register-success-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.register-login {
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
.register-login a {
  color: var(--primary-color);
  font-weight: 500;
  text-decoration: none;
}
.register-login a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 896px) {
  .register-overline {
    margin-bottom: 0.8rem;
  }
  .register-title {
    font-size: clamp(1.9rem, 8.5vw, 2.4rem);
    margin-bottom: 0.7rem;
  }
  .register-subtitle {
    font-size: 0.92rem;
    margin-bottom: 1.5rem;
  }
  .register-form {
    gap: 0.95rem;
  }
  .register-login {
    margin-top: 1.8rem;
    padding-top: 1.1rem;
  }
}
</style>
