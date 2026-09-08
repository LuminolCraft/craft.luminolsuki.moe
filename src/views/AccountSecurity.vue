<template>
  <div class="security-page">
    <div v-if="loading" class="security-loading">{{ t('auth.security.loading') }}</div>

    <template v-else>
      <LinkedAccounts />

      <section class="security-section">
        <h2 class="security-section-title">{{ t('auth.security.currentDevice') }}</h2>
        <SessionListItem
          v-for="s in currentSessions"
          :key="s.id"
          :session="s"
          :revoking="revokingId === s.id"
          @revoke="onRevoke"
        />
        <p v-if="currentSessions.length === 0" class="security-empty">{{ t('auth.security.empty') }}</p>
      </section>

      <section v-if="otherSessions.length > 0" class="security-section">
        <h2 class="security-section-title">{{ t('auth.security.otherDevices') }}</h2>
        <SessionListItem
          v-for="s in otherSessions"
          :key="s.id"
          :session="s"
          :revoking="revokingId === s.id"
          @revoke="onRevoke"
        />
        <button type="button" class="security-revoke-all" :disabled="revokingAll" @click="onRevokeAll">
          {{ revokingAll ? t('auth.security.revoking') : t('auth.security.revokeAll') }}
        </button>
      </section>

      <DangerZone />
    </template>

    <div v-if="actionError" class="security-error" role="alert">{{ actionError }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LinkedAccounts from '@/components/auth/LinkedAccounts.vue'
import SessionListItem from '@/components/auth/SessionListItem.vue'
import DangerZone from '@/components/account/DangerZone.vue'
import { useAuthStore } from '@/stores/auth'
import { useGsap } from '@/composables/useGsap'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const { create, reduceMotion } = useGsap()

const loading = ref(true)
const revokingId = ref('')
const revokingAll = ref(false)
const actionError = ref('')

const currentSessions = computed(() => auth.sessions.filter((s) => s.current))
const otherSessions = computed(() => auth.sessions.filter((s) => !s.current))

async function onRevoke(id: string) {
  revokingId.value = id
  actionError.value = ''
  try {
    await auth.revokeSession(id)
    // 撤销的是当前会话 → 登录态已失效，回登录页
    if (!auth.isAuthenticated) router.replace('/login')
  } catch {
    actionError.value = t('auth.security.revokeFailed')
  } finally {
    revokingId.value = ''
  }
}

async function onRevokeAll() {
  revokingAll.value = true
  actionError.value = ''
  try {
    // 退出所有设备（含当前）：登录态随之失效，回登录页
    await auth.revokeAllSessions()
    router.replace('/login')
  } catch {
    actionError.value = t('auth.security.revokeFailed')
  } finally {
    revokingAll.value = false
  }
}

onMounted(async () => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.security-section', {
      autoAlpha: 0,
      y: 24,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.12,
      clearProps: 'all',
    })
  })

  try {
    await auth.fetchSessions()
  } catch {
    actionError.value = t('auth.security.revokeFailed')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* 迁入 /settings 布局壳：去页面级头部，容器由壳提供，仅保留内容间距 */
.security-page {
  max-width: 46rem;
  padding-top: 0.5rem;
}

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

.security-loading,
.security-empty {
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: 1.4rem 0.25rem;
}

.security-revoke-all {
  margin-top: 1.2rem;
  padding: 0.55rem 1.2rem;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--error-color, #e5484d) 40%, transparent);
  border-radius: 6px;
  color: var(--error-color, #e5484d);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.15s ease;
}
.security-revoke-all:hover:not(:disabled) {
  background: color-mix(in srgb, var(--error-color, #e5484d) 8%, transparent);
  transform: translateY(-1px);
}
.security-revoke-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.security-revoke-all:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

.security-error {
  margin-top: 1.6rem;
  padding: 0.85rem 1rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}
</style>
