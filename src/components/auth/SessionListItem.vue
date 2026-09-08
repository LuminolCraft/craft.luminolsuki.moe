<template>
  <div class="session-item">
    <div class="session-main">
      <div class="session-device">
        <span class="session-device-name">{{ deviceLabel }}</span>
        <span v-if="session.current" class="session-badge session-badge-current">
          {{ t('auth.security.currentBadge') }}
        </span>
        <span
          class="session-badge"
          :class="session.kind === 'persistent' ? 'session-badge-persistent' : 'session-badge-ephemeral'"
        >
          {{ session.kind === 'persistent' ? t('auth.security.kindPersistent') : t('auth.security.kindEphemeral') }}
        </span>
      </div>
      <div class="session-meta">
        <span>{{ t('auth.security.lastActive') }} · {{ lastActiveLabel }}</span>
        <span class="session-meta-sep" aria-hidden="true"></span>
        <span>{{ t('auth.security.createdAt') }} · {{ createdLabel }}</span>
      </div>
    </div>
    <button type="button" class="session-revoke" :disabled="revoking" @click="emit('revoke', session.id)">
      {{ revoking ? t('auth.security.revoking') : t('auth.security.revoke') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SessionInfo } from '@/types/auth'

const props = defineProps<{
  session: SessionInfo
  revoking?: boolean
}>()

const emit = defineEmits<{ revoke: [id: string] }>()
const { t } = useI18n()

/** 从 userAgent 简要解析"浏览器 · 系统"，解析失败回退原文截断 */
const deviceLabel = computed(() => {
  const ua = props.session.userAgent
  if (!ua) return t('auth.security.unknownDevice')

  let browser = ''
  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('OPR/')) browser = 'Opera'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Safari/')) browser = 'Safari'

  let os = ''
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Linux')) os = 'Linux'

  const label = [browser, os].filter(Boolean).join(' · ')
  return label || ua.slice(0, 40)
})

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

function formatRelative(ts?: number | null): string {
  if (!ts) return '—'
  const diff = Date.now() - ts
  if (diff < MINUTE) return t('auth.security.justNow')
  if (diff < HOUR) return t('auth.security.minutesAgo', { n: Math.floor(diff / MINUTE) })
  if (diff < DAY) return t('auth.security.hoursAgo', { n: Math.floor(diff / HOUR) })
  if (diff < 7 * DAY) return t('auth.security.daysAgo', { n: Math.floor(diff / DAY) })
  return new Date(ts).toLocaleDateString()
}

const lastActiveLabel = computed(() => formatRelative(props.session.lastUsedAt ?? props.session.createdAt))
const createdLabel = computed(() => formatRelative(props.session.createdAt))
</script>

<style scoped>
.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.1rem 0.25rem;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s ease;
}
.session-item:hover {
  background: color-mix(in srgb, var(--text-color) 3%, transparent);
}

.session-main {
  min-width: 0;
}
.session-device {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.session-device-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
}

.session-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  line-height: 1.5;
  white-space: nowrap;
}
.session-badge-current {
  color: var(--vercel-white);
  background: var(--primary-color);
}
.session-badge-persistent {
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary-color) 35%, transparent);
}
.session-badge-ephemeral {
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.session-meta-sep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text-secondary);
  opacity: 0.6;
}

.session-revoke {
  flex-shrink: 0;
  padding: 0.4rem 0.9rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}
.session-revoke:hover:not(:disabled) {
  color: var(--error-color, #e5484d);
  border-color: color-mix(in srgb, var(--error-color, #e5484d) 45%, transparent);
  background: color-mix(in srgb, var(--error-color, #e5484d) 8%, transparent);
}
.session-revoke:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.session-revoke:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .session-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.65rem;
  }
}
</style>
