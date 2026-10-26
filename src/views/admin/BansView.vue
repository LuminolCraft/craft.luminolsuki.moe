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
              <th>{{ t('admin.bans.target') }}</th>
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
              <td class="td-target">
                <template v-if="ban.minecraftUsername || ban.minecraftUuid">
                  <span class="target-name">{{ ban.minecraftUsername || ban.minecraftUuid }}</span>
                  <span v-if="ban.minecraftUsername && ban.minecraftUuid" class="target-uuid">{{
                    ban.minecraftUuid
                  }}</span>
                </template>
                <span v-else class="td-dim">{{ ban.minecraftAccountId || t('admin.bans.targetUnknown') }}</span>
              </td>
              <td class="td-reason">{{ ban.reason }}</td>
              <td>
                <span class="status-badge" :data-status="banStatus(ban)">{{ statusLabel(ban) }}</span>
              </td>
              <td class="td-dim">{{ ban.expiresAt ? formatDate(ban.expiresAt) : t('admin.bans.permanent') }}</td>
              <td class="td-dim" :title="ban.createdBy || ''">{{ creatorLabel(ban) }}</td>
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

    <!-- 证据面板：多选/粘贴入队 → 浏览器内重编码（AVIF/WebP、动画 AVIF）→ 逐张上传。
         任何路径不存在原文件直传：产物体积与后端 image/avif|webp 的合规压力都在编码阶段解决。 -->
    <div v-if="evidenceBan" class="modal-scrim" @click.self="closeEvidence">
      <div class="modal evidence-modal" role="dialog" aria-modal="true">
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

        <!-- 环境警告：编码能力缺失全局禁上传；ffmpeg 核心缺失只影响视频/GIF 项，仅提示 -->
        <p v-if="!encodeSupported" class="form-error" role="alert">
          {{ t('admin.bans.evidenceUnsupportedBrowser') }}
        </p>
        <p v-else-if="ffmpegMissing" class="upload-hint">{{ t('admin.bans.evidenceFfmpegMissing') }}</p>

        <div class="upload-row">
          <input class="upload-input" type="file" multiple :accept="ACCEPT_TYPES" @change="onFileChange" />
          <button type="button" class="btn" :disabled="uploading || !hasUploadable" @click="onUpload">
            {{ uploading ? t('admin.bans.evidenceUploading') : t('admin.bans.evidenceUpload') }}
          </button>
        </div>
        <p class="upload-hint">{{ t('admin.bans.evidencePickHint') }}</p>

        <!-- 压缩设置：覆盖值持久化 localStorage；变更后已就绪项标记 stale -->
        <details class="evidence-settings">
          <summary>{{ t('admin.bans.evidenceSettingsTitle') }}</summary>
          <div class="settings-grid">
            <label class="settings-row">
              <span class="settings-label">{{ t('admin.bans.evidenceSettingsAvifQuality') }}</span>
              <input v-model.number="avifQuality" class="settings-range" type="range" min="1" max="100" step="1" />
              <span class="settings-value">{{ avifQuality }}</span>
            </label>
            <label class="settings-row">
              <span class="settings-label">{{ t('admin.bans.evidenceSettingsAvifSpeed') }}</span>
              <input v-model.number="avifSpeed" class="settings-range" type="range" min="0" max="10" step="1" />
              <span class="settings-value">{{ avifSpeed }}</span>
            </label>
            <label class="settings-row">
              <span class="settings-label">{{ t('admin.bans.evidenceSettingsAvifLossless') }}</span>
              <SwitchRoot v-model="avifLossless" class="settings-switch">
                <SwitchThumb class="settings-switch-thumb" />
              </SwitchRoot>
            </label>
            <label class="settings-row">
              <span class="settings-label">{{ t('admin.bans.evidenceSettingsWebpQuality') }}</span>
              <input v-model.number="webpQuality" class="settings-range" type="range" min="1" max="100" step="1" />
              <span class="settings-value">{{ webpQuality }}</span>
            </label>
          </div>
          <button type="button" class="link-btn" @click="resetSettings">
            {{ t('admin.bans.evidenceSettingsReset') }}
          </button>
        </details>

        <div v-if="queue.length" class="queue-toolbar">
          <button v-if="staleCount > 0" type="button" class="row-btn" :disabled="anyProcessing" @click="recompressStale">
            {{ t('admin.bans.evidenceRecompress') }}
          </button>
          <span v-if="uploading && uploadTotal > 0" class="dim">
            {{ t('admin.bans.evidenceOverallProgress', { done: uploadDone, total: uploadTotal }) }}
          </span>
        </div>

        <!-- 待上传队列：转码进度绑 ffmpeg/拆帧百分比，上传进度绑 axios onUploadProgress -->
        <ul v-if="queue.length" class="queue">
          <li v-for="item in queue" :key="item.id" class="queue-item" :data-status="item.status">
            <div class="queue-head">
              <span class="queue-name">{{ item.name || item.file.name }}</span>
              <span v-if="item.setIndex !== null" class="queue-badge">
                {{ t('admin.bans.evidenceFrameIndex', { index: item.setIndex }) }}
              </span>
              <!-- 动画 AVIF 拆帧组的明示提示：每组只在首帧子项上显示一次 -->
              <span v-if="item.setId !== null && item.setIndex === 0" class="queue-badge warn">
                {{ t('admin.bans.evidenceSplitFrames') }}
              </span>
              <span v-if="item.overTarget" class="queue-badge warn">{{ t('admin.bans.evidenceOverTarget') }}</span>
              <span v-if="item.stale && item.status === 'ready'" class="queue-badge warn">
                {{ t('admin.bans.evidenceStale') }}
              </span>
              <button
                type="button"
                class="queue-remove"
                :disabled="queueItemBusy(item)"
                :aria-label="t('admin.bans.evidenceRemove')"
                @click="removeItem(item)"
              >
                ×
              </button>
            </div>
            <div class="queue-meta">
              <template v-if="item.status === 'compressing'">
                <span>
                  {{
                    item.progress > 0
                      ? t('admin.bans.evidenceTranscoding', { percent: Math.round(item.progress) })
                      : t('admin.bans.evidenceCompressing')
                  }}
                </span>
              </template>
              <template v-else-if="item.status === 'ready'">
                <span>
                  {{ formatSize(item.originalSize) }} → {{ formatSize(item.encodedSize) }}（{{ savingLabel(item) }}）
                </span>
              </template>
              <template v-else>
                <span class="queue-error">{{ t(item.errorKey || 'admin.common.errGeneric') }}</span>
              </template>
            </div>
            <ProgressRoot
              v-if="item.status === 'compressing' || uploadingId === item.id"
              :model-value="item.progress"
              class="queue-progress"
            >
              <ProgressIndicator class="queue-progress-bar" :style="{ width: `${Math.round(item.progress)}%` }" />
            </ProgressRoot>
          </li>
        </ul>

        <p v-if="uploadError" class="form-error" role="alert">{{ uploadError }}</p>

        <div class="modal-actions">
          <button type="button" class="btn ghost" @click="closeEvidence">{{ t('admin.common.cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ProgressIndicator, ProgressRoot, SwitchRoot, SwitchThumb } from 'reka-ui'
import { api, isAppError } from '@/lib/api'
import { normalizePaged } from '@/lib/paged'
import { API_BASE_URL } from '@/lib/api-base'
import type { Ban, BanEvidence } from '@/types/nexus'
import { useGsap } from '@/composables/useGsap'
import {
  canEncodeInBrowser,
  evidenceFileName,
  prepareEvidenceFile,
  probeFfmpegCore,
  randomSetId,
  type EvidenceEncodedItem,
  type EvidenceFailureReason,
} from '@/lib/evidence-image'
import {
  EVIDENCE_UPLOAD_CONFIG,
  loadEvidenceOverrides,
  saveEvidenceOverrides,
  type EvidenceUploadOverrides,
} from '@/config/evidence-upload'

const { t, te } = useI18n()
const { create, reduceMotion } = useGsap()

const LIMIT = 20

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

/** 结构化错误 → i18n key；无映射返回 null（调用方兜底通用文案） */
function errorKeyOf(e: unknown): string | null {
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
      FILE_INVALID_IMAGE: 'admin.bans.evidenceInvalidImage',
      FILE_TYPE_NOT_ALLOWED: 'admin.bans.evidenceTypeNotAllowed',
    }
    const key = map[e.code]
    if (key && te(key)) return key
  }
  return null
}

function errorText(e: unknown): string {
  return errorKeyOf(e) ?? t('admin.common.errGeneric')
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

/**
 * 创建者展示：后端把 created_by 里的 user_xxx 解析成用户名（createdByName）。
 * 解析不到（用户已删除）或非用户命名空间（插件侧的 mc:<uuid> / system:*）时
 * 回落原始值，悬停 title 保留原文便于追溯。
 */
function creatorLabel(ban: Ban): string {
  return ban.createdByName || ban.createdBy || '—'
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

// ---------- 证据：上传队列与压缩参数 ----------
const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024
// 与 evidence-image 的 MIME 路由一致（含 GIF：走 ffmpeg 转动画 AVIF）
const ACCEPT_TYPES = 'image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm'

/** 重编码失败原因 → i18n key（UI 直接展示） */
const REASON_KEYS: Record<EvidenceFailureReason, string> = {
  unsupported_type: 'admin.bans.evidenceReasonUnsupportedType',
  too_large: 'admin.bans.evidenceReasonTooLarge',
  environment: 'admin.bans.evidenceReasonEnvironment',
  ffmpeg_missing: 'admin.bans.evidenceFfmpegMissing',
  output_too_large: 'admin.bans.evidenceTooLarge',
  encode_failed: 'admin.bans.evidenceReasonEncodeFailed',
}

interface QueueItem {
  id: number
  file: File
  /** 产物随机文件名（evi_{token}.avif），编码完成前为空串 */
  name: string
  blob: Blob | null
  status: 'compressing' | 'ready' | 'failed'
  /** 转码/上传进度 0-100（两条阶段复用同一进度条） */
  progress: number
  originalSize: number
  encodedSize: number
  /** 失败原因（i18n key） */
  errorKey?: string
  /** 压缩参数变更后产物过期，上传前需按当前参数重编码 */
  stale: boolean
  /** 拆帧序列共用的集合 ID（单产出为 null） */
  setId: string | null
  /** 拆帧序列内序号 0..N-1（单产出为 null） */
  setIndex: number | null
  /** 阶梯降级用尽仍超目标体积（尽力而为的产物） */
  overTarget?: boolean
}

const evidenceBan = ref<Ban | null>(null)
const evidenceList = ref<BanEvidence[]>([])
const uploadError = ref('')
const previewingId = ref('')
const previewUrl = ref('')

const queue = ref<QueueItem[]>([])
let queueSeq = 0
const uploading = ref(false)
const uploadingId = ref(0)
const uploadDone = ref(0)
const uploadTotal = ref(0)

// 编码能力只取决于运行环境，加载期判定一次：缺失时全局警告并禁上传
const encodeSupported = canEncodeInBrowser()
const ffmpegMissing = ref(false)

const hasUploadable = computed(() => queue.value.some((i) => i.status === 'ready'))
const staleCount = computed(() => queue.value.filter((i) => i.status === 'ready' && i.stale).length)
const anyProcessing = computed(() => uploading.value || queue.value.some((i) => i.status === 'compressing'))

// ---------- 压缩设置（覆盖值持久化 localStorage['evidence_upload_overrides']） ----------
const overrides = ref<EvidenceUploadOverrides>(loadEvidenceOverrides())

const avifQuality = computed({
  get: () => overrides.value.avifQuality ?? EVIDENCE_UPLOAD_CONFIG.avif.quality,
  set: (v) => patchOverrides({ avifQuality: v }),
})
const avifSpeed = computed({
  get: () => overrides.value.avifSpeed ?? EVIDENCE_UPLOAD_CONFIG.avif.speed,
  set: (v) => patchOverrides({ avifSpeed: v }),
})
const avifLossless = computed({
  get: () => overrides.value.avifLossless ?? EVIDENCE_UPLOAD_CONFIG.avif.lossless,
  set: (v) => patchOverrides({ avifLossless: v }),
})
const webpQuality = computed({
  get: () => overrides.value.webpQuality ?? EVIDENCE_UPLOAD_CONFIG.webp.quality,
  set: (v) => patchOverrides({ webpQuality: v }),
})

function markStaleReady() {
  // 参数变更后已就绪产物与新参数不一致：仅标记，由用户手动重压或上传时自动重压
  for (const item of queue.value) {
    if (item.status === 'ready') item.stale = true
  }
}

function patchOverrides(patch: EvidenceUploadOverrides) {
  overrides.value = { ...overrides.value, ...patch }
  saveEvidenceOverrides(overrides.value)
  markStaleReady()
}

function resetSettings() {
  overrides.value = {}
  saveEvidenceOverrides(overrides.value)
  markStaleReady()
}

// ---------- 弹窗生命周期 ----------
function openEvidence(ban: Ban) {
  evidenceBan.value = ban
  evidenceList.value = []
  queue.value = []
  previewUrl.value = ''
  uploadError.value = ''
  ffmpegMissing.value = false
  // 核心缺失只影响视频/GIF 项：提前探测给出 dim 提示，不禁用图片上传
  if (encodeSupported) {
    void probeFfmpegCore().then((ok) => {
      if (evidenceBan.value === ban && !ok) ffmpegMissing.value = true
    })
  }
}

function closeEvidence() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  evidenceBan.value = null
}

// 弹窗打开期间监听粘贴截图；关闭/卸载即移除
function onPaste(event: ClipboardEvent) {
  if (!evidenceBan.value) return
  const files: File[] = []
  for (const item of event.clipboardData?.items ?? []) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (files.length) {
    event.preventDefault()
    enqueueFiles(files)
  }
}

watch(evidenceBan, (ban) => {
  if (ban) document.addEventListener('paste', onPaste)
  else document.removeEventListener('paste', onPaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', onPaste)
})

// ---------- 入队与重编码 ----------
function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = '' // 重置以便可重复选择同一文件
  if (files.length) enqueueFiles(files)
}

function enqueueFiles(files: File[]) {
  for (const file of files) {
    const item: QueueItem = {
      id: ++queueSeq,
      file,
      name: '',
      blob: null,
      status: 'compressing',
      progress: 0,
      originalSize: file.size,
      encodedSize: 0,
      stale: false,
      setId: null,
      setIndex: null,
    }
    queue.value.push(item)
    void processItem(item)
  }
}

function readySubItem(
  source: QueueItem,
  encoded: EvidenceEncodedItem,
  name: string,
  setId: string | null,
  setIndex: number | null,
): QueueItem {
  const fits = encoded.encodedSize <= EVIDENCE_MAX_BYTES
  return {
    id: ++queueSeq,
    file: source.file,
    name,
    blob: fits ? encoded.blob : null,
    status: fits ? 'ready' : 'failed',
    progress: 100,
    originalSize: source.originalSize,
    encodedSize: encoded.encodedSize,
    errorKey: fits ? undefined : 'admin.bans.evidenceTooLarge',
    stale: false,
    setId,
    setIndex,
    overTarget: encoded.overTarget,
  }
}

/** 单个入队项的重编码；动画源拆帧多产出时把该项替换为 N 个 ready 子项 */
async function processItem(item: QueueItem) {
  item.status = 'compressing'
  item.progress = 0
  item.stale = false
  item.errorKey = undefined
  const result = await prepareEvidenceFile(item.file, overrides.value, {
    onProgress: (p) => {
      item.progress = p
    },
  })
  if (!result.ok) {
    item.status = 'failed'
    item.errorKey = REASON_KEYS[result.reason]
    if (result.reason === 'ffmpeg_missing') ffmpegMissing.value = true
    return
  }
  const first = result.items[0]
  if (!first) {
    // 防御：ok 却无产物（理论不可达），按编码失败呈现
    item.status = 'failed'
    item.errorKey = REASON_KEYS.encode_failed
    return
  }
  const ext = first.blob.type.endsWith('webp') ? 'webp' : 'avif'
  // 拆帧多产出（选定的呈现方式：直接拆成 N 个队列子项）：复用同一 setId、setIndex 0..N-1
  if (result.items.length > 1) {
    const setId = randomSetId()
    const index = queue.value.indexOf(item)
    if (index === -1) return // 弹窗已重开/队列已清空：丢弃过期结果，避免污染新队列
    const subItems = result.items.map((encoded, i) =>
      // 文件名帧号从 1 起三位补零（f001…）；setIndex 保持 0..N-1 供后端排序
      readySubItem(item, encoded, evidenceFileName(ext, i + 1), setId, i),
    )
    queue.value.splice(index, 1, ...subItems)
    return
  }
  const encoded = first
  if (encoded.encodedSize > EVIDENCE_MAX_BYTES) {
    // 产物仍超 5MiB 上传上限（视频阶梯目标 10MiB 大于上限时的兜底）
    item.status = 'failed'
    item.errorKey = 'admin.bans.evidenceTooLarge'
    return
  }
  item.name = evidenceFileName(ext)
  item.blob = encoded.blob
  item.encodedSize = encoded.encodedSize
  item.overTarget = encoded.overTarget
  item.status = 'ready'
}

function queueItemBusy(item: QueueItem): boolean {
  return item.status === 'compressing' || uploadingId.value === item.id
}

function removeItem(item: QueueItem) {
  if (queueItemBusy(item)) return
  queue.value = queue.value.filter((i) => i !== item)
}

/** 重压缩 stale 项：同源文件收敛为代表项（拆帧会在重编码时重新展开） */
async function recompressStale() {
  const staleItems = queue.value.filter((i) => i.status === 'ready' && i.stale)
  const seen = new Set<File>()
  const reps: QueueItem[] = []
  for (const item of staleItems) {
    if (seen.has(item.file)) continue
    seen.add(item.file)
    reps.push(item)
  }
  queue.value = queue.value.filter((i) => !staleItems.includes(i) || reps.includes(i))
  for (const rep of reps) await processItem(rep)
}

// ---------- 上传 ----------
async function onUpload() {
  if (!evidenceBan.value || uploading.value || !hasUploadable.value) return
  uploading.value = true
  uploadError.value = ''
  try {
    // stale 项自动按当前参数重编码（也可手动点"按当前参数重新压缩"）
    if (staleCount.value > 0) await recompressStale()
    const targets = queue.value.filter((i) => i.status === 'ready' && i.blob)
    if (!targets.length || !evidenceBan.value) return
    uploadDone.value = 0
    uploadTotal.value = targets.length
    const banId = evidenceBan.value.id
    const succeeded: QueueItem[] = []
    for (const item of targets) {
      uploadingId.value = item.id
      item.progress = 0
      try {
        const evidence = await api.upload<BanEvidence>(`/admin/bans/${banId}/evidence`, item.blob!, {
          filename: item.name,
          // 拆帧序列携带 setId + setIndex（multipart 文本字段）；单产出不传 = 单元素集合
          fields: item.setId
            ? {
                setId: item.setId,
                ...(item.setIndex !== null ? { setIndex: String(item.setIndex) } : {}),
              }
            : undefined,
          onProgress: (p) => {
            item.progress = p
          },
        })
        evidenceList.value = [...evidenceList.value, evidence]
        succeeded.push(item)
      } catch (e) {
        // 单张失败标记原因继续其余
        item.status = 'failed'
        item.errorKey = errorKeyOf(e) ?? 'admin.common.errGeneric'
      } finally {
        uploadingId.value = 0
      }
      uploadDone.value++
    }
    // 全部结束：成功项清出队列（已进证据列表），失败项保留供查看/重试
    queue.value = queue.value.filter((i) => !succeeded.includes(i))
  } finally {
    uploading.value = false
    uploadTotal.value = 0
  }
}

/** 压缩收益展示：正数省体积，负数（小图 AVIF 反而变大）如实展示增量 */
function savingLabel(item: QueueItem): string {
  const pct = Math.round((1 - item.encodedSize / Math.max(1, item.originalSize)) * 100)
  return pct >= 0 ? `−${pct}%` : `+${-pct}%`
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

.evidence-modal {
  width: min(34rem, 100%);
}

/* ---------- 证据上传队列 ---------- */
.upload-hint {
  font-size: 0.76rem;
  color: var(--text-secondary);
  margin: 0.4rem 0 0;
}

.evidence-settings {
  margin-top: 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
}

.evidence-settings summary {
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--text-secondary);
  user-select: none;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.7rem;
}

.settings-row {
  display: grid;
  grid-template-columns: 8.5rem 1fr 2.6rem;
  align-items: center;
  gap: 0.6rem;
}

.settings-label {
  font-size: 0.78rem;
  color: var(--text-color);
}

.settings-value {
  font-size: 0.74rem;
  color: var(--text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.settings-range {
  width: 100%;
  accent-color: var(--primary-color);
}

/* reka-ui Switch：轨道 + 滑块，选中态用主色填充 */
.settings-switch {
  position: relative;
  width: 2.2rem;
  height: 1.2rem;
  border-radius: 99px;
  background: color-mix(in srgb, var(--text-color) 18%, transparent);
  transition: background 0.15s ease;
  cursor: pointer;
}

.settings-switch[data-state='checked'] {
  background: var(--primary-color);
}

.settings-switch-thumb {
  display: block;
  width: 0.9rem;
  height: 0.9rem;
  margin: 0.15rem;
  border-radius: 50%;
  background: #fff;
  transition: translate 0.15s ease;
}

.settings-switch[data-state='checked'] .settings-switch-thumb {
  translate: 1rem 0;
}

.queue-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-top: 0.8rem;
}

.queue {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.queue-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem 0.7rem;
}

.queue-item[data-status='failed'] {
  border-color: color-mix(in srgb, var(--error-color, #e5484d) 40%, transparent);
}

.queue-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.queue-name {
  flex: 1;
  min-width: 0;
  font-size: 0.82rem;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-badge {
  flex-shrink: 0;
  padding: 0.05rem 0.4rem;
  border-radius: 99px;
  font-size: 0.68rem;
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.queue-badge.warn {
  color: var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 8%, transparent);
}

.queue-remove {
  flex-shrink: 0;
  width: 1.3rem;
  height: 1.3rem;
  line-height: 1;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.95rem;
  cursor: pointer;
}

.queue-remove:hover:not(:disabled) {
  color: var(--error-color, #e5484d);
}

.queue-remove:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.queue-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.2rem;
  font-size: 0.74rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.queue-error {
  color: var(--error-color, #e5484d);
}

.queue-progress {
  height: 4px;
  margin-top: 0.4rem;
  border-radius: 99px;
  background: color-mix(in srgb, var(--text-color) 10%, transparent);
  overflow: hidden;
}

.queue-progress-bar {
  height: 100%;
  border-radius: 99px;
  background: var(--primary-color);
  transition: width 0.15s ease;
}
</style>
