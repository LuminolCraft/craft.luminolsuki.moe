<script setup lang="ts">
/**
 * 社区管理 · 举报队列（`/community/reports`，staff 及以上）。
 *
 * 两条硬规则：
 * 1. **字段分层由后端决定**，这里只按响应里有没有字段来渲染。staff 拿到的
 *    详情没有 uuid / 内部备注 / 逐票明细，`votes` 为空数组即视为无权限视图；
 * 2. **处置只对 moderator+ 开放**（`canResolveReports`）。staff 能投票、能看
 *    证据，但封禁 / 驳回按钮不出现——后端也会 403，这里只是别给假入口。
 *
 * 投票**无约束力**：只是给处置人看的参考，够票不会自动封号。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, apiClient, isAppError } from '@/lib/api'
import { useAuthorizationStore } from '@/stores/authorization'
import { useToastStore } from '@/stores/toast'
import type {
  ModeratorReport,
  ReportEvidence,
  ReportStatus,
  ReportVerdict,
  ResolveReportInput,
  StaffReport,
} from '@/types/nexus'

const { t } = useI18n()
const authz = useAuthorizationStore()
const toast = useToastStore()

const canResolve = computed(() => authz.canResolveReports())

const items = ref<StaffReport[]>([])
const status = ref<ReportStatus | ''>('pending')
const query = ref('')
const page = ref(1)
const total = ref(0)
const limit = 20
const loading = ref(false)
const errorText = ref('')

const detail = ref<ModeratorReport | StaffReport | null>(null)
const detailOpen = ref(false)
const detailLoading = ref(false)
const previewUrls = ref<Record<string, string>>({})

const voteNote = ref('')
const voting = ref(false)

const resolveAction = ref<'ban' | 'reject'>('reject')
const resolveType = ref<'minecraft' | 'website' | 'chat'>('minecraft')
const resolveReason = ref('')
const resolveExpiresDays = ref<number>(0)
const resolveNote = ref('')
const resolveMessage = ref('')
const resolveTargetUuid = ref('')
const resolving = ref(false)

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(limit) })
    if (status.value) params.set('status', status.value)
    if (query.value.trim()) params.set('q', query.value.trim())
    const data = await api.get<{ items: StaffReport[]; total: number }>(
      `/reports?${params.toString()}`,
    )
    items.value = data.items ?? []
    total.value = data.total ?? 0
  } catch (e) {
    errorText.value = isAppError(e) ? (e.message || t('reports.errors.generic')) : t('reports.errors.generic')
  } finally {
    loading.value = false
  }
}

function releasePreviews() {
  for (const url of Object.values(previewUrls.value)) URL.revokeObjectURL(url)
  previewUrls.value = {}
}

async function openDetail(id: string) {
  detailOpen.value = true
  detailLoading.value = true
  releasePreviews()
  try {
    detail.value = await api.get<ModeratorReport | StaffReport>(`/reports/${id}`)
    await loadPreviews(detail.value?.evidence ?? [])
  } catch (e) {
    toast.error(isAppError(e) ? (e.message || t('reports.errors.generic')) : t('reports.errors.generic'))
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

/**
 * 附件预览：附件是私有资源，必须带 Cookie 请求后转 blob URL。
 * 只取本人可见范围内的附件（后端授权：举报人本人或 staff+）。
 */
async function loadPreviews(evidence: ReportEvidence[]) {
  for (const ev of evidence) {
    try {
      const blob = await apiClient.get(`/media/report-evidence/${ev.id}`, {
        responseType: 'blob',
      })
      previewUrls.value[ev.id] = URL.createObjectURL(blob as unknown as Blob)
    } catch {
      /* 单张失败不影响其余预览 */
    }
  }
}

function closeDetail() {
  detailOpen.value = false
  detail.value = null
  releasePreviews()
}

async function vote(verdict: ReportVerdict) {
  if (!detail.value) return
  voting.value = true
  try {
    await api.post<{ voteTally: { violation: number; noViolation: number } }>(
      `/reports/${detail.value.id}/vote`,
      { verdict, ...(voteNote.value.trim() ? { note: voteNote.value.trim() } : {}) },
    )
    await openDetail(detail.value.id)
    await load()
    voteNote.value = ''
    toast.success(t('community.reports.voted'))
  } catch (e) {
    toast.error(isAppError(e) ? (e.message || t('reports.errors.generic')) : t('reports.errors.generic'))
  } finally {
    voting.value = false
  }
}

async function resolve() {
  if (!detail.value) return
  const payload: ResolveReportInput = { action: resolveAction.value }
  if (resolveNote.value.trim()) payload.note = resolveNote.value.trim()
  if (resolveMessage.value.trim()) payload.message = resolveMessage.value.trim()

  if (resolveAction.value === 'ban') {
    payload.type = resolveType.value
    payload.reason = resolveReason.value.trim()
    if (resolveExpiresDays.value > 0) {
      payload.expiresAt = Date.now() + resolveExpiresDays.value * 86400 * 1000
    }
    // 举报单已快照到账号时不必指定目标；未快照才由处置人手填 uuid
    const uuid = resolveTargetUuid.value.trim()
    if (uuid) payload.minecraftUuid = uuid
  }

  resolving.value = true
  try {
    const result = await api.post<{ status: string; deduped: boolean }>(
      `/admin/reports/${detail.value.id}/resolve`,
      payload,
    )
    toast.success(
      result.deduped
        ? t('community.reports.resolvedDeduped')
        : t('community.reports.resolved'),
    )
    closeDetail()
    await load()
  } catch (e) {
    if (isAppError(e) && e.code === 'REPORT_TARGET_UNRESOLVED') {
      toast.error(t('community.reports.targetUnresolved'))
    } else {
      toast.error(isAppError(e) ? (e.message || t('reports.errors.generic')) : t('reports.errors.generic'))
    }
  } finally {
    resolving.value = false
  }
}

function formatTime(ms: number | null): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleString()
}

watch([status], () => {
  page.value = 1
  void load()
})

onMounted(load)
onBeforeUnmount(releasePreviews)
</script>

<template>
  <section class="community-page">
    <header class="page-head">
      <h1 class="page-title">{{ t('community.reports.title') }}</h1>
      <p class="page-subtitle">{{ t('community.reports.subtitle') }}</p>
    </header>

    <div class="filters">
      <select v-model="status" class="input">
        <option value="">{{ t('community.reports.allStatus') }}</option>
        <option value="pending">{{ t('reports.status.pending') }}</option>
        <option value="banned">{{ t('reports.status.banned') }}</option>
        <option value="rejected">{{ t('reports.status.rejected') }}</option>
      </select>
      <input
        v-model="query"
        class="input"
        type="search"
        maxlength="16"
        :placeholder="t('community.reports.searchPlaceholder')"
        @keyup.enter="(page = 1), load()"
      />
      <button class="btn" @click="(page = 1), load()">{{ t('reports.common.refresh') }}</button>
    </div>

    <p v-if="errorText" class="form-error">{{ errorText }}</p>
    <p v-else-if="loading" class="hint">{{ t('reports.common.loading') }}</p>
    <p v-else-if="items.length === 0" class="hint">{{ t('community.reports.empty') }}</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t('community.reports.colTarget') }}</th>
            <th>{{ t('community.reports.colCategory') }}</th>
            <th>{{ t('community.reports.colReporter') }}</th>
            <th>{{ t('community.reports.colVotes') }}</th>
            <th>{{ t('community.reports.colStatus') }}</th>
            <th>{{ t('community.reports.colTime') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" class="row" @click="openDetail(item.id)">
            <td class="mono">{{ item.targetPlayerName }}</td>
            <td>{{ t(`reports.category.${item.category}`) }}</td>
            <td>
              {{ item.reporterUsername }}
              <span v-if="item.reporterAccountDeleted" class="dim">
                ({{ t('community.reports.deletedAccount') }})
              </span>
            </td>
            <td class="mono">
              {{ item.voteTally.violation }} / {{ item.voteTally.noViolation }}
            </td>
            <td>
              <span class="status-badge" :data-status="item.status">
                {{ t(`reports.status.${item.status}`) }}
              </span>
            </td>
            <td class="dim">{{ formatTime(item.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="total > limit" class="pager">
      <button class="btn ghost" :disabled="page <= 1" @click="(page -= 1), load()">
        {{ t('reports.common.prev') }}
      </button>
      <span class="dim">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button class="btn ghost" :disabled="page * limit >= total" @click="(page += 1), load()">
        {{ t('reports.common.next') }}
      </button>
    </div>

    <!-- 详情抽屉 -->
    <div v-if="detailOpen" class="modal-scrim" @click.self="closeDetail">
      <aside class="modal drawer">
        <div class="drawer__head">
          <h2 class="modal-title">
            {{ detail?.targetPlayerName ?? t('reports.common.loading') }}
          </h2>
          <button class="link-btn" @click="closeDetail">{{ t('reports.common.close') }}</button>
        </div>

        <p v-if="detailLoading" class="hint">{{ t('reports.common.loading') }}</p>

        <template v-else-if="detail">
          <dl class="drawer__meta">
            <dt>{{ t('community.reports.colCategory') }}</dt>
            <dd>{{ t(`reports.category.${detail.category}`) }}</dd>
            <dt>{{ t('community.reports.colReporter') }}</dt>
            <dd>{{ detail.reporterUsername }}</dd>
            <dt>{{ t('community.reports.colStatus') }}</dt>
            <dd>{{ t(`reports.status.${detail.status}`) }}</dd>
            <dt>{{ t('community.reports.colVotes') }}</dt>
            <dd class="mono">
              {{ t('community.reports.violation') }} {{ detail.voteTally.violation }} ·
              {{ t('community.reports.noViolation') }} {{ detail.voteTally.noViolation }}
            </dd>
          </dl>

          <h3 class="drawer__section">{{ t('community.reports.description') }}</h3>
          <!-- 举报正文是 UGC：只做文本插值，禁止 v-html -->
          <p class="drawer__text">{{ detail.description }}</p>

          <p v-if="detail.linkUrl" class="drawer__link">
            <a :href="detail.linkUrl" target="_blank" rel="noopener noreferrer nofollow">
              {{ t('community.reports.externalLink') }}
            </a>
          </p>

          <h3 class="drawer__section">
            {{ t('community.reports.evidence', { n: detail.evidence.length }) }}
          </h3>
          <p v-if="detail.evidence.length === 0" class="dim">
            {{ t('community.reports.noEvidence') }}
          </p>
          <div v-else class="evidence-grid">
            <a
              v-for="ev in detail.evidence"
              :key="ev.id"
              :href="previewUrls[ev.id]"
              class="evidence-thumb"
              target="_blank"
              rel="noopener noreferrer"
              :title="ev.filename"
            >
              <img v-if="previewUrls[ev.id]" :src="previewUrls[ev.id]" :alt="ev.filename" />
              <span v-else class="dim">{{ ev.filename }}</span>
            </a>
          </div>

          <!-- 投票：staff 及以上都可投，可改票，无约束力 -->
          <template v-if="detail.status === 'pending'">
            <h3 class="drawer__section">{{ t('community.reports.vote') }}</h3>
            <input
              v-model="voteNote"
              class="input"
              maxlength="200"
              :placeholder="t('community.reports.voteNotePlaceholder')"
            />
            <div class="drawer__actions">
              <button class="btn" :disabled="voting" @click="vote('violation')">
                {{ t('community.reports.voteViolation') }}
              </button>
              <button class="btn ghost" :disabled="voting" @click="vote('no_violation')">
                {{ t('community.reports.voteNoViolation') }}
              </button>
            </div>
            <p class="hint">{{ t('community.reports.voteAdvisory') }}</p>
          </template>

          <!-- 逐票明细：只有 moderator+ 的响应里才有 votes 字段 -->
          <template v-if="'votes' in detail && detail.votes.length > 0">
            <h3 class="drawer__section">{{ t('community.reports.voteDetails') }}</h3>
            <ul class="vote-list">
              <li v-for="v in detail.votes" :key="`${v.voterUsername}-${v.updatedAt}`">
                <span class="mono">{{ v.voterUsername }}</span>
                <span :class="v.verdict === 'violation' ? 'err' : 'ok'">
                  {{ t(`community.reports.verdict.${v.verdict}`) }}
                </span>
                <span v-if="v.note" class="dim">— {{ v.note }}</span>
              </li>
            </ul>
          </template>

          <p
            v-if="'resolutionNote' in detail && detail.resolutionNote"
            class="drawer__internal"
          >
            {{ t('community.reports.internalNote') }}：{{ detail.resolutionNote }}
          </p>

          <!-- 处置：仅 moderator+ -->
          <template v-if="canResolve && detail.status === 'pending'">
            <h3 class="drawer__section">{{ t('community.reports.resolve') }}</h3>
            <div class="drawer__actions">
              <label class="radio">
                <input v-model="resolveAction" type="radio" value="reject" />
                {{ t('community.reports.actionReject') }}
              </label>
              <label class="radio">
                <input v-model="resolveAction" type="radio" value="ban" />
                {{ t('community.reports.actionBan') }}
              </label>
            </div>

            <template v-if="resolveAction === 'ban'">
              <label class="field">
                <span class="label">{{ t('community.reports.banType') }}</span>
                <select v-model="resolveType" class="input">
                  <option value="minecraft">Minecraft</option>
                  <option value="website">{{ t('community.reports.banSite') }}</option>
                  <option value="chat">{{ t('community.reports.banChat') }}</option>
                </select>
              </label>
              <label class="field">
                <span class="label">{{ t('community.reports.banReason') }}</span>
                <textarea v-model="resolveReason" class="input textarea" rows="3" maxlength="2000" />
              </label>
              <label class="field">
                <span class="label">{{ t('community.reports.banDays') }}</span>
                <input v-model.number="resolveExpiresDays" class="input" type="number" min="0" />
                <span class="hint">{{ t('community.reports.banDaysHint') }}</span>
              </label>
              <label class="field">
                <span class="label">{{ t('community.reports.targetUuid') }}</span>
                <input v-model="resolveTargetUuid" class="input" type="text" />
                <span class="hint">{{ t('community.reports.targetUuidHint') }}</span>
              </label>
            </template>

            <label class="field">
              <span class="label">{{ t('community.reports.resolveNote') }}</span>
              <input v-model="resolveNote" class="input" maxlength="1000" />
            </label>
            <label class="field">
              <span class="label">{{ t('community.reports.resolveMessage') }}</span>
              <input v-model="resolveMessage" class="input" maxlength="1000" />
              <span class="hint">{{ t('community.reports.resolveMessageHint') }}</span>
            </label>

            <div class="drawer__actions">
              <button class="btn" :disabled="resolving" @click="resolve">
                {{ resolving ? t('reports.common.loading') : t('community.reports.confirm') }}
              </button>
            </div>
          </template>
        </template>
      </aside>
    </div>
  </section>
</template>

<style scoped>
@import '../admin/admin-shared.css';

.community-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}
.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 20px 0 16px;
}
.row {
  cursor: pointer;
}
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: min(560px, 100vw);
  overflow-y: auto;
  border-radius: 0;
}
.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.drawer__meta {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 12px;
  font-size: 13px;
  margin: 0 0 12px;
}
.drawer__meta dt {
  color: var(--text-secondary);
}
.drawer__meta dd {
  margin: 0;
}
.drawer__section {
  font-size: 13px;
  margin: 18px 0 8px;
  color: var(--text-secondary);
}
.drawer__text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  margin: 0;
}
.drawer__link a {
  color: var(--primary-color);
  font-size: 13px;
}
.drawer__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.drawer__internal {
  margin-top: 16px;
  padding: 10px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  font-size: 13px;
}
.evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
}
.evidence-thumb {
  display: block;
  aspect-ratio: 1;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}
.evidence-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.vote-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.dim {
  color: var(--text-secondary);
}
.ok {
  color: var(--success-color, #16a34a);
}
.err {
  color: var(--error-color);
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}
</style>
