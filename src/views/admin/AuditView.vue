<template>
  <div class="audit-page">
    <header class="page-head">
      <h1 class="page-title">{{ t('admin.audit.title') }}</h1>
      <p class="page-subtitle">{{ t('admin.audit.subtitle') }}</p>
    </header>

    <!-- 过滤器 -->
    <form class="filter-row" @submit.prevent="onApply">
      <input
        v-model.trim="filterActorId"
        class="input filter-input"
        type="text"
        :placeholder="t('admin.audit.filterActor')"
      />
      <input
        v-model.trim="filterAction"
        class="input filter-input"
        type="text"
        :placeholder="t('admin.audit.filterAction')"
        spellcheck="false"
      />
      <button type="submit" class="btn" :disabled="loadingPage">{{ t('admin.audit.apply') }}</button>
      <button type="button" class="btn ghost" @click="onReset">{{ t('admin.audit.reset') }}</button>
    </form>

    <div v-if="loading" class="page-loading">{{ t('admin.common.loading') }}</div>

    <template v-else>
      <p v-if="logs.length === 0" class="page-empty">{{ t('admin.common.empty') }}</p>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('admin.audit.time') }}</th>
              <th>{{ t('admin.audit.actor') }}</th>
              <th>{{ t('admin.audit.action') }}</th>
              <th>{{ t('admin.audit.target') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td class="td-dim nowrap">{{ formatDateTime(log.createdAt) }}</td>
              <td class="td-strong mono-dim">{{ log.actorUserId || '—' }}</td>
              <td><span class="action-badge">{{ log.action }}</span></td>
              <td class="td-dim">
                <template v-if="log.targetType || log.targetId">
                  {{ log.targetType || '—' }} / {{ log.targetId || '—' }}
                </template>
                <template v-else>—</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="hasMore || page > 1" class="pager">
        <button type="button" class="pager-btn" :disabled="page <= 1 || loadingPage" @click="go(page - 1)">
          {{ t('admin.common.prev') }}
        </button>
        <span class="pager-label">{{ t('admin.common.pageOf', { page }) }}</span>
        <button type="button" class="pager-btn" :disabled="!hasMore || loadingPage" @click="go(page + 1)">
          {{ t('admin.common.next') }}
        </button>
      </div>
    </template>

    <p v-if="pageError" class="page-error" role="alert">{{ pageError }}</p>

    <!-- 归档区（触发仅 owner；非 owner 403 兜底） -->
    <section class="archive-section">
      <h2 class="section-title">{{ t('admin.audit.archiveTitle') }}</h2>
      <p v-if="archives.length === 0" class="dim">{{ t('admin.audit.archiveEmpty') }}</p>
      <ul v-else class="archive-list">
        <li v-for="a in archives" :key="a.key" class="archive-item">
          <span class="archive-key">{{ a.key }}</span>
          <span v-if="a.size != null" class="archive-size">{{ formatSize(a.size) }}</span>
        </li>
      </ul>
      <button
        v-if="authz.hasRole('owner')"
        type="button"
        class="btn"
        :disabled="archiving"
        @click="onTriggerArchive"
      >
        {{ archiving ? t('admin.audit.archiving') : t('admin.audit.triggerArchive') }}
      </button>
      <p v-if="archiveError" class="form-error" role="alert">{{ archiveError }}</p>
      <p v-if="archiveSuccess" class="form-success" role="status">{{ t('admin.audit.archiveTriggered') }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isAppError } from '@/lib/api'
import { normalizePaged } from '@/lib/paged'
import { useAuthorizationStore } from '@/stores/authorization'
import type { AuditArchive, AuditLog } from '@/types/nexus'
import { useGsap } from '@/composables/useGsap'

const { t, te } = useI18n()
const authz = useAuthorizationStore()
const { create, reduceMotion } = useGsap()

const LIMIT = 20

const loading = ref(true)
const loadingPage = ref(false)
const pageError = ref('')
const logs = ref<AuditLog[]>([])
const page = ref(1)
const total = ref<number | undefined>(undefined)

const filterActorId = ref('')
const filterAction = ref('')
// 已应用的过滤条件（切页时沿用，编辑不过滤）
const appliedActor = ref('')
const appliedAction = ref('')

const hasMore = computed(() => {
  if (typeof total.value === 'number') return page.value * LIMIT < total.value
  return logs.value.length === LIMIT
})

function errorText(e: unknown): string {
  if (isAppError(e)) {
    const map: Record<string, string> = {
      FORBIDDEN: 'admin.common.errForbidden',
      PERMISSION_DENIED: 'admin.common.errForbidden',
      NETWORK_ERROR: 'admin.common.errNetwork',
      RATE_LIMITED: 'admin.common.errRateLimited',
      VALIDATION_ERROR: 'admin.common.errValidation',
    }
    const key = map[e.code]
    if (key && te(key)) return t(key)
  }
  return t('admin.common.errGeneric')
}

function buildQuery(nextPage: number): string {
  const params = new URLSearchParams()
  params.set('page', String(nextPage))
  params.set('limit', String(LIMIT))
  if (appliedActor.value) params.set('actorId', appliedActor.value)
  if (appliedAction.value) params.set('action', appliedAction.value)
  return params.toString()
}

async function load(nextPage: number) {
  const data = await api.get<unknown>(`/admin/audit?${buildQuery(nextPage)}`)
  const paged = normalizePaged<AuditLog>(data)
  logs.value = paged.items
  total.value = paged.total
  page.value = nextPage
}

async function go(nextPage: number) {
  loadingPage.value = true
  pageError.value = ''
  try {
    await load(nextPage)
  } catch (e) {
    pageError.value = errorText(e)
  } finally {
    loadingPage.value = false
  }
}

function onApply() {
  appliedActor.value = filterActorId.value
  appliedAction.value = filterAction.value
  go(1)
}

function onReset() {
  filterActorId.value = ''
  filterAction.value = ''
  appliedActor.value = ''
  appliedAction.value = ''
  go(1)
}

// ---------- 归档 ----------
const archives = ref<AuditArchive[]>([])
const archiving = ref(false)
const archiveError = ref('')
const archiveSuccess = ref(false)

async function loadArchives() {
  try {
    const data = await api.get<AuditArchive[]>('/admin/audit/archive')
    archives.value = Array.isArray(data) ? data : []
  } catch {
    /* 归档列表失败静默（owner 才有核心诉求，且有 403 兜底） */
  }
}

async function onTriggerArchive() {
  archiveError.value = ''
  archiveSuccess.value = false
  archiving.value = true
  try {
    await api.post<unknown>('/admin/audit/archive')
    archiveSuccess.value = true
    await loadArchives()
  } catch (e) {
    archiveError.value = errorText(e)
  } finally {
    archiving.value = false
  }
}

function formatDateTime(ts?: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

onMounted(async () => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.audit-page > *', { autoAlpha: 0, y: 16, duration: 0.5, ease: 'power3.out', stagger: 0.06, clearProps: 'all' })
  })
  try {
    await load(1)
  } catch (e) {
    pageError.value = errorText(e)
  } finally {
    loading.value = false
  }
  loadArchives()
})
</script>

<style scoped>
@import './admin-shared.css';

.filter-row {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  margin-bottom: 1.4rem;
}

.filter-input {
  width: min(16rem, 100%);
}

.nowrap {
  white-space: nowrap;
}

.mono-dim {
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
}

.action-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 5px;
  font-size: 0.74rem;
  font-weight: 600;
  font-family: ui-monospace, monospace;
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.archive-section {
  margin-top: 2.4rem;
  padding-top: 1.4rem;
  border-top: 1px solid var(--border-color);
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 0.9rem;
}

.archive-list {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.archive-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem 0.8rem;
}

.archive-key {
  font-size: 0.8rem;
  font-family: ui-monospace, monospace;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-size {
  flex-shrink: 0;
  font-size: 0.74rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.archive-section .btn {
  margin-top: 0.3rem;
}

.archive-section .form-error,
.archive-section .form-success {
  margin-top: 0.8rem;
}
</style>
