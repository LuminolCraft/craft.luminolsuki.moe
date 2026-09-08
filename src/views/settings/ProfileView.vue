<template>
  <div class="profile-page">
    <header class="profile-header">
      <h1 class="profile-title">{{ t('settings.profile.title') }}</h1>
      <p class="profile-subtitle">{{ t('settings.profile.subtitle') }}</p>
    </header>

    <!-- 封禁记录区：仅个人用户页展示（spec：全站其它页面无封禁横幅） -->
    <section v-if="myBans.length > 0" class="profile-bans" role="alert">
      <h2 class="profile-bans-title">{{ t('settings.profile.banTitle') }}</h2>
      <article v-for="ban in myBans" :key="ban.id" class="profile-ban">
        <span class="profile-ban-type" :data-type="ban.type">{{ banTypeLabel(ban.type) }}</span>
        <div class="profile-ban-body">
          <p class="profile-ban-reason">{{ ban.reason }}</p>
          <p class="profile-ban-meta">
            <span>{{ t('settings.profile.banIssued') }}: {{ formatDate(ban.createdAt) }}</span>
            <span v-if="ban.expiresAt">· {{ t('settings.profile.banExpiresOn', { date: formatDate(ban.expiresAt) }) }}</span>
            <span v-else>· {{ t('settings.profile.banPermanent') }}</span>
          </p>
        </div>
      </article>
    </section>

    <!-- 头像（只读，MC 皮肤头像由后端插件提供） -->
    <section class="profile-section">
      <h2 class="profile-section-title">{{ t('settings.profile.avatarTitle') }}</h2>
      <div class="profile-avatar-row">
        <UserAvatar :user-id="auth.me?.id" :name="auth.me?.username" :size="72" />
        <p class="profile-avatar-hint">{{ t('settings.profile.avatarHint') }}</p>
      </div>
    </section>

    <!-- 资料表单 -->
    <section class="profile-section">
      <form class="profile-form" novalidate @submit.prevent="onSave">
        <div class="profile-field">
          <label class="profile-label" for="profile-username">{{ t('settings.profile.usernameLabel') }}</label>
          <input
            id="profile-username"
            v-model.trim="username"
            class="profile-input"
            type="text"
            autocomplete="username"
            spellcheck="false"
          />
          <p class="profile-hint">{{ t('settings.profile.usernameHint') }}</p>
        </div>

        <div class="profile-field">
          <label class="profile-label" for="profile-email">{{ t('settings.profile.emailLabel') }}</label>
          <div class="profile-email-row">
            <input
              id="profile-email"
              v-model.trim="email"
              class="profile-input"
              type="email"
              autocomplete="email"
              spellcheck="false"
            />
            <span
              class="profile-email-badge"
              :class="{ verified: auth.me?.emailVerified }"
            >
              {{ auth.me?.emailVerified ? t('settings.profile.emailVerified') : t('settings.profile.emailUnverified') }}
            </span>
          </div>
        </div>

        <div class="profile-actions">
          <button type="submit" class="profile-save" :disabled="saving || !dirty">
            {{ saving ? t('settings.profile.saving') : t('settings.profile.save') }}
          </button>
          <span v-if="savedMessage" class="profile-saved" role="status">{{ savedMessage }}</span>
        </div>
        <p v-if="formError" class="profile-error" role="alert">{{ formError }}</p>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UserAvatar from '@/components/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useNexusStore } from '@/stores/nexus'
import { useGsap } from '@/composables/useGsap'
import { isAppError } from '@/lib/api'

const { t, te } = useI18n()
const auth = useAuthStore()
const nexus = useNexusStore()
const { create, reduceMotion } = useGsap()

// ---------- 封禁记录（会话级缓存，变更后才会重拉） ----------
const myBans = computed(() => nexus.myBans)

// ---------- 表单 ----------
const username = ref(auth.me?.username ?? '')
const email = ref(auth.me?.email ?? '')
const saving = ref(false)
const formError = ref('')
const savedMessage = ref('')

const dirty = computed(
  () => username.value !== (auth.me?.username ?? '') || email.value !== (auth.me?.email ?? ''),
)

const USERNAME_RE = /^[A-Za-z0-9_-]{3,32}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function errorText(code: string): string {
  const map: Record<string, string> = {
    USER_ALREADY_EXISTS: 'settings.profile.errUsernameExists',
    USERNAME_INVALID: 'settings.profile.errUsernameInvalid',
    EMAIL_ALREADY_USED: 'settings.profile.errEmailUsed',
    EMAIL_INVALID: 'settings.profile.errEmailInvalid',
    VALIDATION_ERROR: 'settings.profile.errValidation',
    RATE_LIMITED: 'settings.profile.errRateLimited',
    NETWORK_ERROR: 'settings.profile.errNetwork',
  }
  const key = map[code]
  if (key && te(key)) return t(key)
  return t('settings.profile.errGeneric')
}

async function onSave() {
  formError.value = ''
  savedMessage.value = ''

  const nextUsername = username.value
  const nextEmail = email.value
  if (!USERNAME_RE.test(nextUsername)) {
    formError.value = t('settings.profile.errUsernameInvalid')
    return
  }
  if (!EMAIL_RE.test(nextEmail)) {
    formError.value = t('settings.profile.errEmailInvalid')
    return
  }

  const payload: { username?: string; email?: string } = {}
  if (nextUsername !== auth.me?.username) payload.username = nextUsername
  if (nextEmail !== auth.me?.email) payload.email = nextEmail
  if (Object.keys(payload).length === 0) return

  saving.value = true
  try {
    const updated = await nexus.updateMe(payload)
    const emailChanged = payload.email !== undefined
    savedMessage.value = emailChanged
      ? t('settings.profile.savedReverify')
      : t('settings.profile.saved')
    // 邮箱变更后端会重置验证状态
    if (emailChanged) auth.me = updated
  } catch (e) {
    if (isAppError(e)) formError.value = errorText(e.code)
    else formError.value = t('settings.profile.errGeneric')
  } finally {
    saving.value = false
  }
}

// ---------- 工具 ----------
function banTypeLabel(type: string): string {
  const key = `settings.ban.type${type.charAt(0).toUpperCase()}${type.slice(1)}`
  return te(key) ? t(key) : type
}

function formatDate(ts?: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString()
}

onMounted(async () => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.profile-page > *', {
      autoAlpha: 0,
      y: 20,
      duration: 0.55,
      ease: 'power3.out',
      stagger: 0.08,
      clearProps: 'all',
    })
  })

  // 会话级缓存：仅首次进入拉取；失败静默降级（封禁区不渲染，不阻塞资料功能）
  nexus.fetchMyBans().catch(() => {})
})
</script>

<style scoped>
.profile-page {
  max-width: 34rem;
}

.profile-header {
  margin-bottom: 2rem;
}

.profile-title {
  font-size: clamp(1.5rem, 3.5vw, 1.9rem);
  font-weight: 700;
  letter-spacing: -1px;
  color: var(--text-color);
  margin: 0 0 0.5rem;
}

.profile-subtitle {
  font-size: 0.92rem;
  line-height: 1.65;
  color: var(--text-secondary);
  margin: 0;
}

/* ---------- 封禁记录区 ---------- */
.profile-bans {
  border: 1px solid color-mix(in srgb, var(--error-color, #e5484d) 35%, transparent);
  border-radius: 8px;
  padding: 1rem 1.1rem;
  margin-bottom: 1.8rem;
  background: color-mix(in srgb, var(--error-color, #e5484d) 5%, transparent);
}

.profile-bans-title {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--error-color, #e5484d);
  margin: 0 0 0.8rem;
}

.profile-ban {
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
}

.profile-ban + .profile-ban {
  margin-top: 0.9rem;
  padding-top: 0.9rem;
  border-top: 1px dashed color-mix(in srgb, var(--error-color, #e5484d) 25%, transparent);
}

.profile-ban-type {
  flex-shrink: 0;
  padding: 0.2rem 0.55rem;
  border-radius: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 12%, transparent);
}

.profile-ban-reason {
  font-size: 0.9rem;
  color: var(--text-color);
  margin: 0 0 0.25rem;
  line-height: 1.5;
}

.profile-ban-meta {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 0;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* ---------- 区块通用 ---------- */
.profile-section {
  margin-bottom: 2rem;
}

.profile-section-title {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 0.8rem;
}

.profile-avatar-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.profile-avatar-hint {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}

/* ---------- 表单 ---------- */
.profile-field {
  margin-bottom: 1.2rem;
}

.profile-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 0.4rem;
}

.profile-input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-color);
  font-size: 0.92rem;
  transition: border-color 0.15s ease;
}

.profile-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.profile-input:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

.profile-hint {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 0.35rem 0 0;
}

.profile-email-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.profile-email-badge {
  flex-shrink: 0;
  padding: 0.25rem 0.6rem;
  border-radius: 99px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.profile-email-badge.verified {
  color: var(--primary-color);
  border-color: color-mix(in srgb, var(--primary-color) 40%, transparent);
  background: color-mix(in srgb, var(--primary-color) 8%, transparent);
}

.profile-actions {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-top: 1.4rem;
}

.profile-save {
  padding: 0.6rem 1.4rem;
  background: var(--primary-color);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    translate 0.15s ease,
    opacity 0.15s ease;
}

.profile-save:hover:not(:disabled) {
  translate: 0 -1px;
}

.profile-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.profile-save:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

.profile-saved {
  font-size: 0.85rem;
  color: var(--primary-color);
}

.profile-error {
  margin-top: 1rem;
  padding: 0.75rem 0.9rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}
</style>
