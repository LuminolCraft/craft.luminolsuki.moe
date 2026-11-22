<template>
  <div class="bans-page">
    <header class="page-head">
      <h1 class="page-title">{{ t('admin.bans.title') }}</h1>
      <p class="page-subtitle">{{ t('admin.bans.subtitle') }}</p>
    </header>

    <!-- 目标搜索：输入角色名同时过滤下方列表并列出可封禁账号；选中后右侧抽屉确认。
         完整 UUID 不搜名字，改走「按该 UUID 封禁」（未绑定玩家也能封，但不连坐）。 -->
    <div ref="searchShell" class="search-shell">
      <div class="search-bar">
        <svg
          class="search-icon"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.6" />
          <path d="M10.6 10.6 14 14" />
        </svg>
        <input
          ref="searchInputEl"
          v-model="query"
          type="search"
          class="search-input"
          :placeholder="t('admin.bans.searchPlaceholder')"
          :aria-label="t('admin.bans.searchPlaceholder')"
          autocomplete="off"
          @focus="dropOpen = true"
        />
        <span v-if="searching" class="search-state">{{ t('admin.bans.searching') }}</span>
        <kbd v-else class="search-kbd">Ctrl K</kbd>
      </div>

      <div v-if="dropOpen" class="search-drop">
        <button
          v-for="row in candRows"
          :key="row.key"
          type="button"
          class="candidate"
          @click="selectCandidate(row.c)"
        >
          <span class="cand-avatar">
            <img
              v-if="row.url && !row.texture && !candAvatarFailed[row.key]"
              :src="row.url"
              :alt="row.c.name"
              loading="lazy"
              @error="candAvatarFailed[row.key] = true"
            />
            <span
              v-else-if="row.url"
              class="cand-avatar-head"
              :style="skinHeadStyle(row.url, 27)"
            />
            <template v-else>{{ initialsOf(row.c.name) }}</template>
          </span>
          <span class="cand-main">
            <span class="cand-name">{{ row.c.name }}</span>
            <span class="cand-uuid">{{ row.c.uuid }}</span>
          </span>
          <span class="cand-owner">{{ row.c.username || t('admin.bans.searchUnbound') }}</span>
          <span v-if="row.c.activeBan" class="status-badge" data-status="active">
            {{ t('admin.bans.searchBanned') }}
          </span>
        </button>

        <button v-if="uuidInput" type="button" class="candidate" @click="selectDirectUuid">
          <span class="cand-avatar dim">
            <img
              v-if="uuidAvatarUrl && !uuidAvatarTexture && !uuidAvatarFailed"
              :src="uuidAvatarUrl"
              alt=""
              loading="lazy"
              @error="uuidAvatarFailed = true"
            />
            <span
              v-else-if="uuidAvatarUrl && uuidAvatarTexture"
              class="cand-avatar-head"
              :style="skinHeadStyle(uuidAvatarUrl, 27)"
            />
            <template v-else>#</template>
          </span>
          <span class="cand-main">
            <span class="cand-name">{{ t('admin.bans.directUuid') }}</span>
            <span class="cand-uuid">{{ uuidInput }}</span>
          </span>
        </button>

        <p v-if="!candidates.length && !uuidInput && !searching" class="drop-empty">
          {{ t('admin.bans.searchEmpty') }}
        </p>
      </div>
    </div>

    <p v-if="notice" class="page-note" role="status">{{ notice }}</p>

    <div v-if="loading" class="page-loading">{{ t('admin.common.loading') }}</div>

    <template v-else>
      <p v-if="bans.length === 0" class="page-empty">
        {{ filtered ? t('admin.bans.filteredEmpty') : t('admin.common.empty') }}
      </p>

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
                  <HoldButton
                    class="hb-revoke"
                    size="sm"
                    :label="t('admin.bans.revoke')"
                    :done-label="t('admin.bans.revoked')"
                    :duration="1000"
                    :done="revokeDone && revokingId === ban.id"
                    :disabled="!!revokingId && revokingId !== ban.id"
                    :fill-color="REVOKE_FILL"
                    :accent-color="REVOKE_ACCENT"
                    :done-color="REVOKE_DONE"
                    @hold="onRevoke(ban)"
                  />
                </template>
                <button type="button" class="row-btn" @click="openEvidence(ban)">{{ t('admin.bans.evidence') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!filtered && (hasMore || page > 1)" class="pager">
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

    <!-- 新建封禁抽屉：先摆连带范围再填表，提交按钮直接写明会封几个号 -->
    <div v-if="drawerOpen" class="drawer-scrim" @click.self="closeDrawer">
      <aside class="ban-drawer" role="dialog" aria-modal="true">
        <header class="drawer-head">
          <div>
            <h2 class="drawer-title">{{ t('admin.bans.drawerTitle', { name: targetName }) }}</h2>
            <p class="drawer-sub">{{ targetSub }}</p>
          </div>
          <button type="button" class="drawer-close" @click="closeDrawer">×</button>
        </header>

        <p class="drawer-label">{{ t('admin.bans.scopeLabel') }}</p>
        <p v-if="previewing" class="dim">{{ t('admin.bans.scopeLoading') }}</p>
        <div v-else class="scope-box">
          <div v-if="!scopeRows.length" class="scope-line">
            <span class="scope-name">{{ targetName }}</span>
            <span class="scope-note">{{ t('admin.bans.scopeSolo') }}</span>
          </div>
          <div
            v-for="row in scopeRows"
            :key="row.id"
            class="scope-line"
            :class="{ skipped: row.skipped }"
          >
            <span class="scope-name">{{ row.name }}</span>
            <span class="scope-note" :class="{ warn: row.skipped }">{{ row.note }}</span>
          </div>
        </div>

        <label class="field">
          <span class="label">{{ t('admin.bans.typeLabel') }}</span>
          <select v-model="newType" class="input" :disabled="submitting">
            <option value="minecraft">Minecraft</option>
            <option value="website">Website</option>
            <option value="chat">Chat</option>
          </select>
        </label>

        <label class="field">
          <span class="label">{{ t('admin.bans.reasonLabel') }}</span>
          <textarea
            v-model.trim="newReason"
            class="input textarea"
            rows="3"
            :placeholder="t('admin.bans.reasonPlaceholder')"
            :disabled="submitting"
          />
        </label>

        <label class="field">
          <span class="label">{{ t('admin.bans.expiresLabel') }}</span>
          <input v-model="newExpiresLocal" class="input" type="datetime-local" :disabled="submitting" />
          <span class="hint">{{ t('admin.bans.expiresHint') }}</span>
        </label>

        <p v-if="createError" class="form-error" role="alert">{{ createError }}</p>

        <div class="drawer-actions">
          <button type="button" class="btn ghost" :disabled="submitting" @click="closeDrawer">
            {{ t('admin.common.cancel') }}
          </button>
          <button type="button" class="btn" :disabled="!canSubmit || submitting" @click="onCreate">
            {{ submitting ? t('admin.bans.submitting') : submitLabel }}
          </button>
        </div>
      </aside>
    </div>

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
import HoldButton from '@/components/bits/HoldButton.vue'
import { api, isAppError } from '@/lib/api'
import { normalizePaged } from '@/lib/paged'
import { skinAvatar, skinHeadStyle } from '@/lib/minecraft'
import type { SkinAvatar } from '@/lib/minecraft'
import { fetchSkinByName, type SkinLookup } from '@/lib/skin'
import { API_BASE_URL } from '@/lib/api-base'
import type {
  Ban,
  BanEvidence,
  BanScopePreview,
  BanTargetCandidate,
  BanType,
  CreateBanInput,
} from '@/types/nexus'
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
/** 搜索框有内容时列表由后端按 q 过滤（不是前端过滤当前页） */
const filtered = computed(() => query.value.trim() !== '')

async function load(nextPage: number) {
  const q = query.value.trim()
  const suffix = q ? `&q=${encodeURIComponent(q)}` : ''
  const data = await api.get<unknown>(`/admin/bans?page=${nextPage}&limit=${LIMIT}${suffix}`)
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

// ---------- 目标搜索与新建封禁 ----------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SEARCH_DEBOUNCE_MS = 300

const query = ref('')
const searchShell = ref<HTMLElement | null>(null)
const searchInputEl = ref<HTMLInputElement | null>(null)
const dropOpen = ref(false)
const searching = ref(false)
const candidates = ref<BanTargetCandidate[]>([])
/** 候选角色名 → 查询结果；只存成功，失败不落表（再次搜索会重试） */
const candSkins = ref<Record<string, SkinLookup>>({})
const candAvatarFailed = ref<Record<string, boolean>>({})
/** 直接按 UUID 封时的解析名（用于按名查皮肤；查不到为空） */
const uuidName = ref('')
const uuidAvatarFailed = ref(false)

const selected = ref<BanTargetCandidate | null>(null)
const directUuid = ref('')
/** 按 uuid 封时的展示名：Mojang 兜底候选带官方大小写玩家名，手输 uuid 时为空 */
const directName = ref('')
const preview = ref<BanScopePreview | null>(null)
const previewing = ref(false)
const drawerOpen = ref(false)

const newType = ref<BanType>('minecraft')
const newReason = ref('')
const newExpiresLocal = ref('')
const submitting = ref(false)
const createError = ref('')
const notice = ref('')

/** 输入是完整 UUID 时走「按 uuid 封」，不拿 uuid 去做角色名模糊搜索 */
const uuidInput = computed(() => {
  const q = query.value.trim()
  return UUID_RE.test(q) ? q.toLowerCase() : ''
})

const targetName = computed(() => (selected.value?.name ?? directName.value) || directUuid.value)

const targetSub = computed(() => {
  if (!selected.value) return t('admin.bans.drawerSubUnbound')
  return selected.value.username
    ? t('admin.bans.drawerSubBound', { name: selected.value.username })
    : t('admin.bans.drawerSubUnbound')
})

/** 连带清单：已封的项提交时幂等跳过，单独标出避免管理员以为会重复建行 */
const scopeRows = computed(() =>
  (preview.value?.items ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    skipped: i.alreadyBanned,
    note: i.alreadyBanned ? t('admin.bans.scopeAlreadyBanned') : t('admin.bans.scopeAlt'),
  })),
)

/** 本次真正会新建封禁的账号数（按 uuid 封单个未绑定玩家时恒为 1） */
const submitCount = computed(() => {
  if (!preview.value) return directUuid.value ? 1 : 0
  const fresh = preview.value.items.filter((i) => !i.alreadyBanned).length
  return fresh > 0 ? fresh : directUuid.value ? 1 : 0
})

const submitLabel = computed(() =>
  submitCount.value > 1
    ? t('admin.bans.submit', { count: submitCount.value })
    : t('admin.bans.submitSolo'),
)

const canSubmit = computed(
  () => !!preview.value && submitCount.value > 0 && newReason.value.trim() !== '',
)

function initialsOf(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

/** 候选行头像描述（按名查到的 skin 再套三态规则；查不到则为 null） */
const candAvatars = computed(() => {
  const map: Record<string, SkinAvatar> = {}
  for (const c of candidates.value) {
    const entry = candSkins.value[c.name]
    // 显示尺寸 27px（.cand-avatar 1.7rem），mc-heads 取 2 倍即 54
    const avatar = entry ? skinAvatar(entry.skin, entry.type, 54) : null
    if (avatar) map[c.id ?? c.uuid] = avatar
  }
  return map
})

/** 候选行：拍平成模板直接可用的原始值 */
const candRows = computed(() =>
  candidates.value.map((c) => {
    const key = c.id ?? c.uuid
    const avatar = candAvatars.value[key] ?? null
    return { c, key, url: avatar?.url ?? '', texture: avatar?.texture ?? false }
  }),
)

/** 「直接按 UUID」行头像：先按 uuid 解析出角色名，再按名查皮肤 */
const uuidAvatar = computed(() => {
  const entry = candSkins.value[uuidName.value]
  return entry ? skinAvatar(entry.skin, entry.type, 54) : null
})
const uuidAvatarUrl = computed(() => uuidAvatar.value?.url ?? '')
const uuidAvatarTexture = computed(() => uuidAvatar.value?.texture ?? false)

/** 并发按名查皮肤并写入本地映射（已成功的跳过；失败不落表，下次搜索重试） */
async function loadSkins(names: string[]) {
  await Promise.all(
    names.map(async (name) => {
      if (name in candSkins.value) return
      const lookup = await fetchSkinByName(name)
      if (!lookup) return
      candSkins.value = { ...candSkins.value, [name]: lookup }
    }),
  )
}

let searchTimer: number | undefined

// 输入即搜（防抖）：同时刷新「候选账号浮层」与「下方封禁列表」
watch(query, () => {
  if (searchTimer) window.clearTimeout(searchTimer)
  selected.value = null
  directUuid.value = ''
  directName.value = ''
  preview.value = null
  notice.value = ''
  createError.value = ''
  dropOpen.value = true

  const q = query.value.trim()
  const isUuid = UUID_RE.test(q)
  if (q === '' || isUuid) {
    candidates.value = []
    uuidName.value = ''
    uuidAvatarFailed.value = false
    searching.value = false
    if (isUuid) {
      // 后端对 uuid 精确命中（且 uuid 不触发 Mojang 兜底）：拿到角色名才能按名查皮肤。
      // 快速连续输入时先发后到会覆盖新结果，故响应回来先比对当前输入。
      const requested = q
      void api
        .get<{ items: BanTargetCandidate[] }>(`/admin/minecraft?q=${encodeURIComponent(q)}`)
        .then((data) => {
          if (query.value.trim() !== requested) return
          const hit = (data.items ?? []).find(
            (item) => item.uuid.toLowerCase() === q.toLowerCase(),
          )
          uuidName.value = hit?.name ?? ''
          if (hit?.name) void loadSkins([hit.name])
        })
        .catch(() => {
          if (query.value.trim() === requested) uuidName.value = ''
        })
    }
    void go(1)
    return
  }
  searching.value = true
  searchTimer = window.setTimeout(() => {
    void runSearch(q)
    void go(1)
  }, SEARCH_DEBOUNCE_MS)
})

async function runSearch(q: string) {
  try {
    const data = await api.get<{ items: BanTargetCandidate[] }>(
      `/admin/minecraft?q=${encodeURIComponent(q)}`,
    )
    // 过期响应：输入已变，丢弃（防先发后到覆盖新候选）
    if (query.value.trim() !== q) return
    candidates.value = data.items ?? []
    void loadSkins(candidates.value.map((item) => item.name))
  } catch (e) {
    if (query.value.trim() !== q) return
    candidates.value = []
    pageError.value = errorText(e)
  } finally {
    if (query.value.trim() === q) searching.value = false
  }
}

/** 拉影响面（同账号全部 MC 号 + 建链闭包），提交前必须看清 */
async function loadPreview(params: string) {
  previewing.value = true
  preview.value = null
  createError.value = ''
  try {
    preview.value = await api.get<BanScopePreview>(`/admin/bans/preview?${params}`)
  } catch (e) {
    createError.value = errorText(e)
  } finally {
    previewing.value = false
  }
}

function resetForm() {
  newType.value = 'minecraft'
  newReason.value = ''
  newExpiresLocal.value = ''
  createError.value = ''
}

function selectCandidate(c: BanTargetCandidate) {
  dropOpen.value = false
  drawerOpen.value = true
  resetForm()
  if (c.id) {
    // 本库账号：连带范围按账号算
    selected.value = c
    directUuid.value = ''
    directName.value = ''
    void loadPreview(`minecraftAccountId=${encodeURIComponent(c.id)}`)
  } else {
    // 未绑定玩家（Mojang 代查兜底）：没有账号 id，走「按 uuid 封」，无法连坐
    selected.value = null
    directUuid.value = c.uuid
    directName.value = c.name
    void loadPreview(`minecraftUuid=${encodeURIComponent(c.uuid)}`)
  }
}

function selectDirectUuid() {
  if (!uuidInput.value) return
  selected.value = null
  directUuid.value = uuidInput.value
  dropOpen.value = false
  drawerOpen.value = true
  resetForm()
  void loadPreview(`minecraftUuid=${encodeURIComponent(uuidInput.value)}`)
}

function closeDrawer() {
  if (submitting.value) return
  drawerOpen.value = false
  selected.value = null
  directUuid.value = ''
  directName.value = ''
  preview.value = null
  createError.value = ''
}

async function onCreate() {
  if (!canSubmit.value || submitting.value) return
  createError.value = ''
  submitting.value = true
  try {
    const payload: CreateBanInput = {
      type: newType.value,
      reason: newReason.value.trim(),
      expiresAt: newExpiresLocal.value ? new Date(newExpiresLocal.value).getTime() : null,
    }
    // 目标二选一：已绑定账号优先，否则按 uuid 封未绑定玩家
    if (selected.value?.id) payload.minecraftAccountId = selected.value.id
    else payload.minecraftUuid = selected.value?.uuid ?? directUuid.value

    const created = await api.post<Ban & { deduped?: boolean }>('/admin/bans', payload)
    notice.value = created.deduped ? t('admin.bans.createdDeduped') : t('admin.bans.created')
    drawerOpen.value = false
    selected.value = null
    directUuid.value = ''
    directName.value = ''
    preview.value = null
    resetForm()
    await go(1)
  } catch (e) {
    createError.value = errorText(e)
  } finally {
    submitting.value = false
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    dropOpen.value = true
    searchInputEl.value?.focus()
    searchInputEl.value?.select()
    return
  }
  if (e.key === 'Escape') {
    if (drawerOpen.value) closeDrawer()
    else dropOpen.value = false
  }
}

function onDocMousedown(e: MouseEvent) {
  if (searchShell.value?.contains(e.target as Node)) return
  dropOpen.value = false
}

// ---------- 撤销 ----------
const revokingId = ref('')
const revokeDone = ref(false)

/** 撤销是危险动作，进度条走错误色而不是主色 */
const REVOKE_FILL = 'color-mix(in srgb, var(--error-color, #e5484d) 18%, transparent)'
const REVOKE_ACCENT = 'var(--error-color, #e5484d)'
const REVOKE_DONE = 'color-mix(in srgb, var(--error-color, #e5484d) 26%, transparent)'

async function onRevoke(ban: Ban) {
  if (revokingId.value) return
  pageError.value = ''
  revokeDone.value = false
  revokingId.value = ban.id
  try {
    await api.post<unknown>(`/admin/bans/${ban.id}/revoke`)
    revokeDone.value = true
    // 让按钮里的「已撤销」亮一下，再把整行翻成已撤销状态
    await new Promise((resolve) => window.setTimeout(resolve, 760))
    ban.revokedAt = Date.now()
  } catch (e) {
    pageError.value = errorText(e)
  } finally {
    revokingId.value = ''
    revokeDone.value = false
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
  document.removeEventListener('keydown', onGlobalKeydown)
  document.removeEventListener('mousedown', onDocMousedown)
  if (searchTimer) window.clearTimeout(searchTimer)
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
  document.addEventListener('keydown', onGlobalKeydown)
  document.addEventListener('mousedown', onDocMousedown)
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

/* ---------- 目标搜索 ---------- */
.search-shell {
  position: relative;
  margin-bottom: 1.2rem;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.search-bar:focus-within {
  border-color: color-mix(in srgb, var(--primary-color) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 14%, transparent);
}

.search-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.search-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--text-color);
  font: inherit;
  font-size: 0.88rem;
}

.search-input::placeholder {
  color: color-mix(in srgb, var(--text-secondary) 75%, transparent);
}

.search-kbd {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  padding: 0.05rem 0.4rem;
  font-family: var(--font-primary);
}

.search-state {
  flex-shrink: 0;
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.search-drop {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  max-height: 20rem;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg, #18181e);
  box-shadow: 0 18px 40px color-mix(in srgb, #000 45%, transparent);
}

.candidate {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.55rem 0.8rem;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--border-color) 60%, transparent);
  background: transparent;
  color: var(--text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.candidate:first-child {
  border-top: 0;
}

.candidate:hover {
  background: color-mix(in srgb, var(--text-color) 6%, transparent);
}

.cand-avatar {
  flex-shrink: 0;
  width: 1.7rem;
  height: 1.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 16%, transparent);
}

.cand-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  object-fit: cover;
  image-rendering: pixelated;
}

/* 皮肤纹理裁出的 2D 头像（帽檐 + 脸两层背景，样式由 skinHeadStyle 内联给出） */
.cand-avatar-head {
  width: 100%;
  height: 100%;
  border-radius: 6px;
}

.cand-avatar.dim {
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--text-color) 8%, transparent);
}

.cand-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.cand-name {
  font-size: 0.85rem;
  font-weight: 600;
}

.cand-uuid {
  font-family: var(--font-primary);
  font-size: 0.7rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cand-owner {
  flex-shrink: 0;
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.drop-empty {
  margin: 0;
  padding: 0.85rem 0.8rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.page-note {
  margin: -0.4rem 0 1rem;
  font-size: 0.82rem;
  color: var(--success-color, #009688);
}

/* ---------- 新建封禁抽屉 ---------- */
.drawer-scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  background: color-mix(in srgb, #000 55%, transparent);
}

/* 贴右边缘会显得像被裁掉：四周留 1rem 让它成为一张浮起的卡片 */
.ban-drawer {
  width: min(26rem, 100%);
  height: 100%;
  overflow-y: auto;
  padding: 1.2rem 1.25rem;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg, #18181e);
  box-shadow: -12px 0 40px color-mix(in srgb, #000 40%, transparent);
  animation: drawer-in 0.2s ease;
}

@keyframes drawer-in {
  from {
    transform: translateX(14px);
    opacity: 0.7;
  }
  to {
    transform: none;
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ban-drawer {
    animation: none;
  }
}

.drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 1.1rem;
}

.drawer-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
}

.drawer-sub {
  margin: 0.2rem 0 0;
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.drawer-close {
  padding: 0 0.2rem;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}

.drawer-close:hover {
  color: var(--text-color);
}

.drawer-label {
  margin: 0 0 0.5rem;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.scope-box {
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: color-mix(in srgb, var(--text-color) 3%, transparent);
}

.scope-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.28rem 0;
  font-size: 0.82rem;
}

.scope-line.skipped {
  color: var(--text-secondary);
}

.scope-note {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.scope-note.warn {
  color: var(--warning-color, #f57c00);
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.evidence-modal {
  width: min(34rem, 100%);
}

/* HoldButton 与同排 .row-btn 保持同样的间距节奏；idle 态沿用 .row-btn.warn 的危险样式 */
.hb-revoke {
  margin-left: 0.35rem;
  vertical-align: middle;
}

.hb-revoke:not([data-phase='holding']):not([data-phase='done']) {
  color: var(--error-color, #e5484d);
  border-color: color-mix(in srgb, var(--error-color, #e5484d) 35%, transparent);
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
