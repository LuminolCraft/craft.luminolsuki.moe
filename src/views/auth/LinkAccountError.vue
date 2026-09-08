<template>
  <AuthSplitLayout>
    <section ref="rootRef" class="link-error">
      <p class="link-error-overline">{{ t('auth.security.overline') }}</p>
      <h1 class="link-error-title">{{ t('auth.security.linkError.title', { provider: providerLabel }) }}</h1>

      <div class="link-error-alert" role="alert">
        <p class="link-error-text">{{ errorMessage }}</p>
      </div>

      <RouterLink to="/settings/security" class="link-error-back">
        {{ t('auth.security.linkError.back') }}
      </RouterLink>
    </section>
  </AuthSplitLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout.vue'
import { useGsap } from '@/composables/useGsap'
import { OAUTH_PROVIDER_KEY } from '@/stores/auth'

// 后端 Better Auth genericOAuth 关联失败时 302 到 /auth/link-error?error=<code>
const ERROR_KEYS: Record<string, string> = {
  account_already_linked_to_different_user: 'auth.security.linkError.accountAlreadyLinked',
  unable_to_link_account: 'auth.security.linkError.unableToLink',
  email_does_not_match: 'auth.security.linkError.emailMismatch',
  oauth_provider_not_found: 'auth.security.linkError.providerNotFound',
  invalid_code: 'auth.security.linkError.invalidCode',
  unable_to_get_user_info: 'auth.security.linkError.unableToGetUserInfo',
  state_not_found: 'auth.security.linkError.stateNotFound',
  no_code: 'auth.security.linkError.stateNotFound'
}

const { t } = useI18n()
const route = useRoute()
const { create, reduceMotion } = useGsap()

const rootRef = ref<HTMLElement | null>(null)

const errorMessage = computed(() => {
  const code = typeof route.query.error === 'string' ? route.query.error : ''
  const key = ERROR_KEYS[code] ?? 'auth.security.linkError.unknown'
  // 品牌 key 带 { provider } 插值，其余 key 保持原样
  const providerAware =
    key === 'auth.security.linkError.accountAlreadyLinked' ||
    key === 'auth.security.linkError.invalidCode' ||
    key === 'auth.security.linkError.providerNotFound'
  return providerAware ? t(key, { provider: providerLabel.value }) : t(key)
})

// 一次性消费 sessionStorage 中的 provider 标记（发起关联前写入，落地后读取并清除）
const providerLabel = ref('')
let storedProvider: string | null = null
try {
  storedProvider = sessionStorage.getItem(OAUTH_PROVIDER_KEY)
} catch {
  /* ignore */
}
try {
  sessionStorage.removeItem(OAUTH_PROVIDER_KEY)
} catch {
  /* ignore */
}
providerLabel.value = storedProvider ?? t('auth.security.linkError.providerGeneric')

onMounted(() => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.link-error > *', {
      autoAlpha: 0,
      y: 22,
      duration: 0.65,
      ease: 'power3.out',
      stagger: 0.08,
      delay: 0.15,
      // 入场结束后清除内联样式，避免残留 transform 影响布局
      clearProps: 'all',
    })
  })
})
</script>

<style scoped>
.link-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.link-error-overline {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--primary-color);
  margin: 0 0 1.1rem;
}

.link-error-title {
  font-size: clamp(2.2rem, 4.8vw, 3rem);
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1.05;
  color: var(--text-color);
  margin: 0 0 1.4rem;
}

/* ---------- 错误区（沿用 Login.vue 左边条范式） ---------- */
.link-error-alert {
  padding: 0.85rem 1rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  max-width: 26rem;
}
.link-error-text {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.7;
  color: var(--error-color, #e5484d);
}

/* ---------- 返回按钮（outline 风格，与 auth 页一致） ---------- */
.link-error-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 26rem;
  margin-top: 1.4rem;
  padding: 13px 28px;
  background: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  text-align: center;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}
.link-error-back:hover {
  border-color: var(--text-secondary);
}
.link-error-back:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 3px;
}

/* ---------- 移动端：压缩纵向间距 ---------- */
@media (max-width: 896px) {
  .link-error-overline {
    margin-bottom: 0.8rem;
  }
  .link-error-title {
    font-size: clamp(1.9rem, 8.5vw, 2.4rem);
    margin-bottom: 1rem;
  }
  .link-error-back {
    margin-top: 1.1rem;
  }
}
</style>
