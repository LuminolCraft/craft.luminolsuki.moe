<template>
  <div class="bans-page">
    <header class="page-head">
      <h1 class="page-title">{{ t('admin.bans.title') }}</h1>
      <p class="page-subtitle">{{ t('admin.bans.subtitle') }}</p>
    </header>

    <div v-if="loading" class="page-loading">{{ t('admin.common.loading') }}</div>

    <template v-else>
      <p v-if="bans.length === 0" class="page-empty">{{ t('admin.common.empty') }}</p>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('admin.bans.type') }}</th>
              <th>{{ t('admin.bans.reason') }}</th>
              <th>{{ t('admin.bans.status') }}</th>
              <th>{{ t('admin.bans.expires') }}</th>
              <th>{{ t('admin.bans.createdBy') }}</th>
              <th class="th-actions"><span class="sr-only">{{ t('admin.common.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ban in bans" :key="ban.id" :class="{ 'row-revoked': ban.revokedAt }">
              <td><span class="type-badge" :data-type="ban.type">{{ typeLabel(ban.type) }}</span></td>
              <td class="td-reason">{{ ban.reason }}</td>
              <td>
                <span class="status-badge" :data-status="banStatus(ban)">{{ statusLabel(ban) }}</span>
              </td>
              <td class="td-dim">{{ ban.expiresAt ? formatDate(ban.expiresAt) : t('admin.bans.permanent') }}</td>
              <td class="td-dim">{{ ban.createdBy || '—' }}</td>
              <td class="td-actions">
                <template v-if="banStatus(ban) === 'active'">
                  <button type="button" class="row-btn" @click="openEdit(ban)">{{ t('admin.bans.edit') }}</button>
                  <button type="button" class="row-btn warn" :disabled="revokingId === ban.id" @click="onRevoke(ban)">
                    {{ revokingId === ban.id ? t('admin.bans.revoked') : t('admin.bans.revoke') }}
                  </button>
                </template>
                <button type="button" class="row-btn" @click="openEvidence(ban)">{{ t('admin.bans.evidence') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="hasMore" class="pager">
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

    <!-- 行内编辑：原因 / 到期时间（PATCH） -->
    <div v-if="editingBan" class="modal-scrim" @click.self="editingBan = null">
      <div class="modal" role="dialog" aria-modal="true">
        <h2 class="modal-title">{{ t('admin.bans.editTitle') }}</h2>
        <label class="field">
          <span class="label">{{ t('admin.bans.editReason') }}</span>
          <textarea v-model.trim="editReason" class="input textarea" rows="3" />
        </label>
        <label class="field">
          <span class="label">{{ t('admin.bans.editExpires') }}</span>
          <input v-model="editExpiresLocal" class="input" type="datetime-local" />
          <button type="button" class="link-btn" @click="editExpiresLocal = ''">
            {{ t('admin.bans.clearExpires') }}
          </button>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn ghost" @click="editingBan = null">{{ t('admin.common.cancel') }}</button>
          <button type="button" class="btn" :disabled="savingEdit" @click="onSaveEdit">
            {{ savingEdit ? t('admin.common.saving') : t('admin.common.save') }}
          </button>
        </div>
        <p v-if="editError" class="form-error" role="alert">{{ editError }}</p>
      </div>
    </div>

    <!-- 证据面板：上传（≤5MiB 预检）+ 本会话上传记录预览/下载 -->
    <div v-if="evidenceBan" class="modal-scrim" @click.self="evidenceBan = null">
      <div class="modal" role="dialog" aria-modal="true">
        <h2 class="modal-title">{{ t('admin.bans.evidence') }} · {{ evidenceBan.reason }}</h2>

        <p v-if="evidenceList.length === 0" class="dim">{{ t('admin.bans.evidenceEmpty') }}</p>
        <ul v-else class="evidence-list">
          <li v-for="ev in evidenceList" :key="ev.id" class="evidence-item">
            <span class="evidence-name">{{ ev.filename }}</span>
            <span class="evidence-size">{{ formatSize(ev.size) }}</span>
            <button type="button" class="row-btn" @click="onPreview(ev.id)">
              {{ previewingId === ev.id ? '…' : t('admin.bans.evidencePreview') }}
            </button>
            <button type="button" class="row-btn" @click="onDownload(ev.id, ev.filename)">
              {{ t('admin.bans.evidenceDownload') }}
            </button>
          </li>
        </ul>
        <img v-if="previewUrl" :src="previewUrl" class="evidence-preview" alt="evidence preview" />

        <label class="upload-row">
          <input ref="fileInputRef" class="upload-input" type="file" @change="onFileChange" />
          <button type="button" class="btn" :disabled="uploading || !pickedFile" @click="onUpload">
            {{ uploading ? t('admin.bans.evidenceUploading') : t('admin.bans.evidenceUpload') }}
          </button>
        </label>
        <p v-if="uploadError" class="form-error" role="alert">{{ uploadError }}</p>

        <div class="modal-actions">
          <button type="button" class="btn ghost" @click="closeEvidence">{{ t('admin.common.cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isAppError } from '@/lib/api'
import { normalizePaged } from '@/lib/paged'
import { API_BASE_URL } from '@/lib/api-base'
import type { Ban, BanEvidence } from '@/types/nexus'
import { useGsap } from '@/composables/useGsap'

const { t, te } = useI18n()
const { create, reduceMotion } = useGsap()

const LIMIT = 20
const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024

const loading = ref(true)
const loadingPage = ref(false)
const pageError = ref('')
const bans = ref<Ban[]>([])
const page = ref(1)
const total = ref<number | undefined>(undefined)

const hasMore = computed(() => {
  if (typeof total.value === 'number') return page.value * LIMIT < total.value
  return bans.value.length === LIMIT
})

function errorText(e: unknown): string {
  if (isAppError(e)) {
    const map: Record<string, string> = {
      FORBIDDEN: 'admin.common.errForbidden',
      PERMISSION_DENIED: 'admin.common.errForbidden',
      NETWORK_ERROR: 'admin.common.errNetwork',
      RATE_LIMITED: 'admin.common.errRateLimited',
      VALIDATION_ERROR: 'admin.common.errValidation',
      BAN_ALREADY_REVOKED: 'admin.bans.errAlreadyRevoked',
      BAN_NOT_FOUND: 'admin.bans.errNotFound',
      FILE_TOO_LARGE: 'admin.bans.evidenceTooLarge',
      FILE_TYPE_NOT_ALLOWED: 'admin.bans.evidenceTypeNotAllowed',
    }
    const key = map[e.code]
    if (key && te(key)) return t(key)
  }
  return t('admin.common.errGeneric')
}

// ---------- 列表 ----------
async function load(nextPage: number) {
  const data = await api.get<unknown>(`/admin/bans?page=${nextPage}&limit=${LIMIT}`)
  const paged = normalizePaged<Ban>(data)
  bans.value = paged.items
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

/** 有效性后端动态计算；前端仅复刻同一规则用于展示（真实裁决仍以服务端为准） */
function banStatus(ban: Ban): 'active' | 'expired' | 'revoked' {
  if (ban.revokedAt) return 'revoked'
  if (ban.expiresAt && ban.expiresAt <= Date.now()) return 'expired'
  return 'active'
}

function statusLabel(ban: Ban): string {
  const s = banStatus(ban)
  return s === 'active' ? t('admin.bans.statusActive') : s === 'expired' ? t('admin.bans.statusExpired') : t('admin.bans.statusRevoked')
}

function typeLabel(type: string): string {
  const key = `settings.ban.type${type.charAt(0).toUpperCase()}${type.slice(1)}`
  return te(key) ? t(key) : type
}

function formatDate(ts?: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// ---------- 撤销 ----------
const revokingId = ref('')

async function onRevoke(ban: Ban) {
  if (!window.confirm(t('admin.bans.revokeConfirm'))) return
  pageError.value = ''
  revokingId.value = ban.id
  try {
    await api.post<unknown>(`/admin/bans/${ban.id}/revoke`)
    ban.revokedAt = Date.now()
  } catch (e) {
    pageError.value = errorText(e)
  } finally {
    revokingId.value = ''
  }
}

// ---------- 编辑 ----------
const editingBan = ref<Ban | null>(null)
const editReason = ref('')
const editExpiresLocal = ref('')
const savingEdit = ref(false)
const editError = ref('')

function openEdit(ban: Ban) {
  editingBan.value = ban
  editError.value = ''
  editReason.value = ban.reason
  editExpiresLocal.value = ban.expiresAt ? toLocalInput(ban.expiresAt) : ''
}

function toLocalInput(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function onSaveEdit() {
  if (!editingBan.value) return
  editError.value = ''
  savingEdit.value = true
  try {
    const payload: { reason?: string; expiresAt?: number | null } = { reason: editReason.value }
    // 留空 = 显式改永久（PATCH 语义：null → 永久）
    payload.expiresAt = editExpiresLocal.value
      ? new Date(editExpiresLocal.value).getTime()
      : null
    await api.patch<unknown>(`/admin/bans/${editingBan.value.id}`, payload)
    editingBan.value.reason = editReason.value
    editingBan.value.expiresAt = payload.expiresAt
    editingBan.value = null
  } catch (e) {
    editError.value = errorText(e)
  } finally {
    savingEdit.value = false
  }
}

// ---------- 证据 ----------
const evidenceBan = ref<Ban | null>(null)
const evidenceList = ref<BanEvidence[]>([])
const pickedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadError = ref('')
const previewingId = ref('')
const previewUrl = ref('')

function openEvidence(ban: Ban) {
  evidenceBan.value = ban
  evidenceList.value = []
  pickedFile.value = null
  previewUrl.value = ''
  uploadError.value = ''
}

function closeEvidence() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  evidenceBan.value = null
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  pickedFile.value = input.files?.[0] ?? null
  uploadError.value = ''
}

async function onUpload() {
  if (!evidenceBan.value || !pickedFile.value) return
  uploadError.value = ''
  const file = pickedFile.value
  // 减负⑤：前端预检，不合格不发请求（避免无效 R2 写）
  if (file.size > EVIDENCE_MAX_BYTES) {
    uploadError.value = t('admin.bans.evidenceTooLarge')
    return
  }
  uploading.value = true
  try {
    const evidence = await api.upload<BanEvidence>(`/admin/bans/${evidenceBan.value.id}/evidence`, file)
    evidenceList.value = [...evidenceList.value, evidence]
    pickedFile.value = null
  } catch (e) {
    uploadError.value = errorText(e)
  } finally {
    uploading.value = false
  }
}

/** 证据为私有资源：跨站 <img> 不带 Cookie，必须 fetch credentials 后走 blob URL */
async function fetchEvidenceBlob(id: string): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/api/v1/media/evidence/${id}`, {
    credentials: 'include',
  })
  if (!res.ok) throw Object.assign(new Error('evidence fetch failed'), { code: 'FILE_NOT_FOUND' })
  return res.blob()
}

async function onPreview(id: string) {
  previewingId.value = id
  uploadError.value = ''
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  try {
    const blob = await fetchEvidenceBlob(id)
    if (blob.type.startsWith('image/')) {
      previewUrl.value = URL.createObjectURL(blob)
    } else {
      uploadError.value = t('admin.bans.evidenceDownload')
    }
  } catch {
    uploadError.value = t('admin.common.errGeneric')
  } finally {
    previewingId.value = ''
  }
}

async function onDownload(id: string, filename: string) {
  try {
    const blob = await fetchEvidenceBlob(id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `evidence-${id}`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    uploadError.value = t('admin.common.errGeneric')
  }
}

onMounted(async () => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.bans-page > *', { autoAlpha: 0, y: 16, duration: 0.5, ease: 'power3.out', stagger: 0.06, clearProps: 'all' })
  })
  try {
    await load(1)
  } catch (e) {
    pageError.value = errorText(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
@import './admin-shared.css';
</style>
