<template>
  <AuthSplitLayout>
    <section ref="rootRef" class="verify">
      <p class="verify-overline">{{ t('auth.verify.overline') }}</p>
      <h1 class="verify-title">{{ t('auth.verify.title') }}</h1>
      <p class="verify-subtitle">{{ t('auth.verify.subtitle') }}</p>

      <!-- 链接无效/缺 token -->
      <div v-if="linkInvalid" class="verify-notice" role="alert">
        <h2 class="verify-notice-title">{{ t('auth.verify.invalidTitle') }}</h2>
        <p class="verify-notice-text">{{ t('auth.verify.invalidDesc') }}</p>
        <RouterLink to="/login" class="verify-notice-link">{{ t('auth.verify.backToLogin') }}</RouterLink>
      </div>

      <!-- 验证中 -->
      <div v-else-if="verifying" class="verify-state" role="status">
        <span class="verify-spinner" aria-hidden="true"></span>
        <p class="verify-state-text">{{ t('auth.verify.verifying') }}</p>
      </div>

      <!-- 验证成功 -->
      <div v-else-if="succeeded" class="verify-notice" role="status">
        <h2 class="verify-notice-title">{{ t('auth.verify.successTitle') }}</h2>
        <p class="verify-notice-text">{{ t('auth.verify.successDesc') }}</p>
        <RouterLink :to="auth.isAuthenticated ? '/' : '/login'" class="verify-notice-link">
          {{ auth.isAuthenticated ? t('auth.verify.toHome') : t('auth.verify.toLogin') }}
        </RouterLink>
      </div>

      <!-- 验证失败 -->
      <div v-else class="verify-notice" role="alert">
        <h2 class="verify-notice-title">{{ t('auth.verify.failedTitle') }}</h2>
        <p class="verify-notice-text">{{ t('auth.verify.failedDesc') }}</p>
        <button type="button" class="verify-retry" :disabled="pending" @click="runVerify">
          {{ pending ? t('auth.verify.verifying') : t('auth.verify.retry') }}
        </button>
      </div>
    </section>
  </AuthSplitLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useGsap } from '@/composables/useGsap'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const { create, reduceMotion } = useGsap()

const rootRef = ref<HTMLElement | null>(null)
const verifying = ref(true)
const succeeded = ref(false)
const pending = ref(false)

/** 邮件验证链接落地：?token=...（token 不落地存储，仅在内存中转交给 Better Auth） */
const token = computed(() => {
  const value = route.query.token
  return typeof value === 'string' && value.length > 0 ? value : ''
})
const linkInvalid = computed(() => !token.value || route.query.error === 'invalid_token')

async function runVerify() {
  if (pending.value) return
  pending.value = true
  try {
    await auth.verifyEmail(token.value)
    succeeded.value = true
  } catch {
    succeeded.value = false
  } finally {
    verifying.value = false
    pending.value = false
  }
}

onMounted(() => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.verify > *', {
      autoAlpha: 0,
      y: 22,
      duration: 0.65,
      ease: 'power3.out',
      stagger: 0.08,
      delay: 0.15,
      clearProps: 'all',
    })
  })

  if (!linkInvalid.value) runVerify()
  else verifying.value = false
})
</script>

<style scoped>
.verify {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.verify-overline {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--primary-color);
  margin: 0 0 1.1rem;
}

.verify-title {
  font-size: clamp(2.2rem, 4.6vw, 3.1rem);
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1.05;
  color: var(--text-color);
  margin: 0 0 1rem;
}

.verify-subtitle {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 2.2rem;
  max-width: 26rem;
}

/* ---------- 验证中 ---------- */
.verify-state {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  max-width: 26rem;
  padding: 1.1rem 1.25rem;
  border-left: 2px solid var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 6%, transparent);
}
.verify-spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--primary-color) 30%, transparent);
  border-top-color: var(--primary-color);
  animation: verify-spin 0.7s linear infinite;
}
@keyframes verify-spin {
  to {
    transform: rotate(360deg);
  }
}
.verify-state-text {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* ---------- 结果通知 ---------- */
.verify-notice {
  max-width: 26rem;
  padding: 1.1rem 1.25rem;
  border-left: 2px solid var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 6%, transparent);
}
.verify-notice-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-color);
}
.verify-notice-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text-secondary);
}
.verify-notice-link {
  display: inline-block;
  margin-top: 0.9rem;
  color: var(--primary-color);
  font-weight: 500;
  font-size: 0.9rem;
  text-decoration: none;
}
.verify-notice-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.verify-retry {
  margin-top: 0.9rem;
  padding: 0.5rem 1.15rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}
.verify-retry:hover:not(:disabled) {
  border-color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 8%, transparent);
}
.verify-retry:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.verify-retry:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

@media (max-width: 896px) {
  .verify-overline {
    margin-bottom: 0.8rem;
  }
  .verify-title {
    font-size: clamp(1.9rem, 8.5vw, 2.4rem);
    margin-bottom: 0.7rem;
  }
  .verify-subtitle {
    font-size: 0.92rem;
    margin-bottom: 1.5rem;
  }
}
</style>
