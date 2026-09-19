<template>
  <div class="audit-page">
    <header class="page-head">
      <h1 class="page-title">{{ t('admin.audit.title') }}</h1>
      <p class="page-subtitle">{{ t('admin.audit.subtitle') }}</p>
    </header>

    <!-- 过滤器：操作者=用户名/邮箱模糊，事件=分类分组下拉，起始日期=当天 00:00 起 -->
    <form class="filter-row" @submit.prevent="onApply">
      <input
        v-model.trim="filterActorQuery"
        class="input filter-input"
        type="text"
        :placeholder="t('admin.audit.filterActorQuery')"
      />
      <select v-model="filterAction" class="input filter-input" :aria-label="t('admin.audit.action')">
        <option value="">{{ t('admin.audit.filterAnyAction') }}</option>
        <optgroup
          v-for="group in actionGroups"
          :key="group.category"
          :label="categoryLabel(group.category)"
        >
          <option v-for="opt in group.options" :key="opt.action" :value="opt.action">
            {{ actionLabel(opt.action) }}
          </option>
        </optgroup>
      </select>
      <input
        v-model="filterFrom"
        class="input filter-input"
        type="date"
        :aria-label="t('admin.audit.filterFrom')"
        :title="t('admin.audit.filterFrom')"
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
              <th class="th-details">{{ t('admin.audit.details') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="log in logs" :key="log.id">
              <tr>
                <td class="td-dim nowrap" :title="fullDateTime(log.createdAt)">
                  {{ formatDateTime(log.createdAt) }}
                </td>
                <td>
                  <!-- 操作者：读取期解析出的用户名；解析不到 = 已注销，仍显示 ID 可追溯 -->
                  <template v-if="log.actorUserId">
                    <router-link
                      v-if="log.actorName"
                      class="actor-link"
                      :to="{ name: 'AdminUserDetail', params: { id: log.actorUserId } }"
                    >
                      {{ log.actorName }}
                    </router-link>
                    <span v-else class="actor-deleted">{{ t('admin.audit.actorDeleted') }}</span>
                    <span class="mono-dim actor-id">{{ log.actorUserId }}</span>
                  </template>
                  <span v-else class="td-dim">{{ t('admin.audit.actorAnonymous') }}</span>
                </td>
                <td>
                  <span class="action-cell">
                    <span
                      v-if="log.actionCategory"
                      class="category-dot"
                      :title="categoryLabel(log.actionCategory)"
                    />
                    {{ actionLabel(log.action) }}
                  </span>
                </td>
                <td class="td-dim">
                  <template v-if="log.targetType || log.targetId">
                    {{ log.targetType ? targetTypeLabel(log.targetType) : '—' }}
                    <template v-if="log.targetId">
                      <router-link
                        v-if="log.targetType === 'user'"
                        class="actor-link"
                        :to="{ name: 'AdminUserDetail', params: { id: log.targetId } }"
                      >
                        {{ log.targetName || log.targetId }}
                      </router-link>
                      <span v-else class="mono-dim">{{ log.targetName || log.targetId }}</span>
                    </template>
                  </template>
                  <template v-else>—</template>
                </td>
                <td class="td-details">
                  <button type="button" class="link-btn" @click="toggleDetails(log.id)">
                    {{ expanded.has(log.id) ? t('admin.audit.hideDetails') : t('admin.audit.details') }}
                  </button>
                </td>
              </tr>
              <!-- 详情面板：metadata（已结构化）+ UA + 原始常量；不展示 ip_hash -->
              <tr v-if="expanded.has(log.id)" class="details-row">
                <td colspan="5">
                  <dl class="details-grid">
                    <dt>{{ t('admin.audit.rawAction') }}</dt>
                    <dd class="mono-dim">{{ log.action }}</dd>
                    <dt>{{ t('admin.audit.actorEmail') }}</dt>
                    <dd class="mono-dim">{{ log.actorEmail || t('admin.audit.none') }}</dd>
                    <dt>{{ t('admin.audit.userAgent') }}</dt>
                    <dd class="mono-dim">{{ log.userAgent || t('admin.audit.none') }}</dd>
                    <dt>{{ t('admin.audit.metadata') }}</dt>
                    <dd>
                      <pre v-if="formatMetadata(log.metadata)" class="metadata-pre">{{
                        formatMetadata(log.metadata)
                      }}</pre>
                      <span v-else class="td-dim">{{ t('admin.audit.noMetadata') }}</span>
                    </dd>
                  </dl>
                </td>
              </tr>
            </template>
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
import {
  auditActionLabelKey,
  auditCategoryLabelKey,
  auditTargetTypeLabelKey,
  formatAuditMetadata,
} from '@/lib/audit'
import { normalizePaged } from '@/lib/paged'
import { useAuthorizationStore } from '@/stores/authorization'
import type { AuditActionOption, AuditArchive, AuditLog } from '@/types/nexus'
import { useGsap } from '@/composables/useGsap'

const { t, te } = useI18n()
const authz = useAuthorizationStore()
const { create, reduceMotion } = useGsap()

const LIMIT = 20
/** 事件下拉里未知分类（后端未来新增分类但前端未加文案）的兜底分组 key。 */
const UNKNOWN_CATEGORY = 'other'

const loading = ref(true)
const loadingPage = ref(false)
const pageError = ref('')
const logs = ref<AuditLog[]>([])
const page = ref(1)
const total = ref<number | undefined>(undefined)
const expanded = ref<Set<string>>(new Set())

const filterActorQuery = ref('')
const filterAction = ref('')
const filterFrom = ref('')
// 已应用的过滤条件（切页时沿用，编辑不过滤）
const appliedActorQuery = ref('')
const appliedAction = ref('')
const appliedFromMs = ref<number | undefined>(undefined)

const actionOptions = ref<AuditActionOption[]>([])

/** 事件下拉分组：按后端分类目录分组，组内按常量名排序。 */
const actionGroups = computed(() => {
  const groups = new Map<string, AuditActionOption[]>()
  for (const opt of actionOptions.value) {
    const category = opt.category || UNKNOWN_CATEGORY
    const list = groups.get(category)
    if (list) list.push(opt)
    else groups.set(category, [opt])
  }
  return [...groups.entries()]
    .map(([category, options]) => ({
      category,
      options: [...options].sort((a, b) => a.action.localeCompare(b.action)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category))
})

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

// ---------- 展示映射（未知值回退原始常量，后端加新事件不崩） ----------

function actionLabel(action: string): string {
  const key = auditActionLabelKey(action)
  return te(key) ? t(key) : action
}

function categoryLabel(category: string): string {
  if (category === UNKNOWN_CATEGORY) return t('admin.audit.categories.other')
  const key = auditCategoryLabelKey(category)
  return te(key) ? t(key) : category
}

function targetTypeLabel(type: string): string {
  const key = auditTargetTypeLabelKey(type)
  return te(key) ? t(key) : type
}

function formatMetadata(metadata: Record<string, unknown> | null | undefined): string {
  return formatAuditMetadata(metadata)
}

function toggleDetails(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

// ---------- 查询 ----------

function fromMsOf(value: string): number | undefined {
  if (!value) return undefined
  const ms = new Date(`${value}T00:00:00`).getTime()
  return Number.isFinite(ms) ? ms : undefined
}

function buildQuery(nextPage: number): string {
  const params = new URLSearchParams()
  params.set('page', String(nextPage))
  params.set('limit', String(LIMIT))
  if (appliedActorQuery.value) params.set('actorQuery', appliedActorQuery.value)
  if (appliedAction.value) params.set('action', appliedAction.value)
  if (appliedFromMs.value !== undefined) params.set('fromMs', String(appliedFromMs.value))
  return params.toString()
}

async function load(nextPage: number) {
  const data = await api.get<unknown>(`/admin/audit?${buildQuery(nextPage)}`)
  const paged = normalizePaged<AuditLog>(data)
  logs.value = paged.items
  total.value = paged.total
  page.value = nextPage
  expanded.value = new Set()
}

async function loadActionOptions() {
  try {
    const data = await api.get<AuditActionOption[]>('/admin/audit/actions')
    actionOptions.value = Array.isArray(data) ? data : []
  } catch {
    /* 目录失败只影响下拉可选项：退回自由输入态的原始常量展示 */
  }
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
  appliedActorQuery.value = filterActorQuery.value
  appliedAction.value = filterAction.value
  appliedFromMs.value = fromMsOf(filterFrom.value)
  go(1)
}

function onReset() {
  filterActorQuery.value = ''
  filterAction.value = ''
  filterFrom.value = ''
  appliedActorQuery.value = ''
  appliedAction.value = ''
  appliedFromMs.value = undefined
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

function fullDateTime(ts?: number | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleString()
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
  loadActionOptions()
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

.actor-link {
  color: var(--primary-color);
  font-weight: 600;
  text-decoration: none;
}

.actor-link:hover {
  text-decoration: underline;
}

.actor-deleted {
  color: var(--text-secondary);
  font-style: italic;
}

.actor-id {
  display: block;
  color: var(--text-secondary);
}

.action-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.category-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--primary-color) 60%, transparent);
  flex-shrink: 0;
}

.th-details,
.td-details {
  width: 5.5rem;
  text-align: right;
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--primary-color);
  font-size: 0.78rem;
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: underline;
}

.details-row td {
  background: color-mix(in srgb, var(--border-color) 25%, transparent);
}

.details-grid {
  display: grid;
  grid-template-columns: minmax(6rem, max-content) 1fr;
  gap: 0.35rem 1rem;
  margin: 0;
  padding: 0.35rem 0;
  font-size: 0.8rem;
}

.details-grid dt {
  color: var(--text-secondary);
  font-weight: 600;
}

.details-grid dd {
  margin: 0;
  word-break: break-all;
}

.metadata-pre {
  margin: 0;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-color, transparent);
  font-family: ui-monospace, monospace;
  font-size: 0.74rem;
  line-height: 1.45;
  white-space: pre-wrap;
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
