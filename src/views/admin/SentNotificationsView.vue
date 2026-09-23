<template>
  <div class="sent-page">
    <header class="page-head">
      <h1 class="page-title">{{ t('admin.sentNotifications.title') }}</h1>
      <p class="page-subtitle">{{ t('admin.sentNotifications.subtitle') }}</p>
    </header>

    <div v-if="loading" class="page-loading">{{ t('admin.common.loading') }}</div>

    <template v-else>
      <p v-if="batches.length === 0" class="page-empty">{{ t('admin.sentNotifications.empty') }}</p>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('admin.sentNotifications.time') }}</th>
              <th>{{ t('admin.sentNotifications.typeLabel') }}</th>
              <th>{{ t('admin.sentNotifications.titleLabel') }}</th>
              <th>{{ t('admin.sentNotifications.bodyLabel') }}</th>
              <th>{{ t('admin.sentNotifications.reached') }}</th>
              <th>{{ t('admin.sentNotifications.unread') }}</th>
              <th class="th-actions"><span class="sr-only">{{ t('admin.common.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="batch in batches" :key="batchKey(batch)">
              <td class="td-dim nowrap" :title="formatDateTime(batch.createdAt)">
                {{ formatDateTime(batch.createdAt) }}
              </td>
              <td>
                <span class="sent-type" :data-type="batch.type">{{ typeLabel(batch.type) }}</span>
              </td>
              <td class="td-title" :title="batch.title">{{ batch.title }}</td>
              <td class="td-body">{{ batch.body || '—' }}</td>
              <!-- 单发批次也会出现在列表里（total=1）：它是一次独立发布，与批量批次同一行展示/删除口径 -->
              <td class="td-num">{{ batch.total ?? '—' }}</td>
              <td class="td-num">{{ batch.unread ?? '—' }}</td>
              <td class="td-actions">
                <button
                  type="button"
                  class="btn ghost del-btn"
                  :disabled="deletingId === batchKey(batch)"
                  @click="openDeleteDialog(batch)"
                >
                  {{ deletingId === batchKey(batch) ? '…' : t('admin.sentNotifications.delete') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <p v-if="loadError" class="page-error" role="alert">{{ loadError }}</p>
    <p v-if="successText" class="form-success" role="status">{{ successText }}</p>
    <p v-if="deleteError" class="form-error" role="alert">{{ deleteError }}</p>

    <!-- 删除两步确认弹窗（风格对齐 MinecraftView 解绑 / DangerZone 注销：后果说明 → 确认执行） -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="sn-overlay" @click.self="closeDeleteDialog">
        <div
          class="sn-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="t('admin.sentNotifications.deleteDialogTitle')"
        >
          <div class="sn-dialog-header">
            <span class="sn-dialog-title">{{ t('admin.sentNotifications.deleteDialogTitle') }}</span>
            <button
              type="button"
              class="sn-dialog-close"
              :aria-label="t('admin.sentNotifications.deleteClose')"
              @click="closeDeleteDialog"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>

          <!-- Step 1：后果说明 -->
          <div v-if="deleteStep === 1" class="sn-dialog-body">
            <div class="sn-dialog-warning" role="alert">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
              </svg>
              <span>{{ t('admin.sentNotifications.deleteNoticeTitle') }}</span>
            </div>
            <ul class="sn-dialog-effects">
              <li>{{ t('admin.sentNotifications.deleteEffect1', { count: deleteTarget.total ?? 1 }) }}</li>
              <li>{{ t('admin.sentNotifications.deleteEffect2', { title: deleteTarget.title }) }}</li>
              <li>{{ t('admin.sentNotifications.deleteEffect3') }}</li>
            </ul>
            <div class="sn-dialog-actions">
              <button type="button" class="sn-dialog-btn" @click="closeDeleteDialog">
                {{ t('admin.sentNotifications.deleteCancel') }}
              </button>
              <button type="button" class="sn-dialog-btn sn-dialog-btn-primary" @click="deleteStep = 2">
                {{ t('admin.sentNotifications.deleteContinue') }}
              </button>
            </div>
          </div>

          <!-- Step 2：确认执行 -->
          <div v-else class="sn-dialog-body">
            <p class="sn-dialog-hint">
              {{ t('admin.sentNotifications.deleteConfirmHint', { title: deleteTarget.title }) }}
            </p>
            <p v-if="deleteError" class="form-error" role="alert">{{ deleteError }}</p>
            <div class="sn-dialog-actions">
              <button type="button" class="sn-dialog-btn" @click="closeDeleteDialog">
                {{ t('admin.sentNotifications.deleteCancel') }}
              </button>
              <button
                type="button"
                class="sn-dialog-btn sn-dialog-btn-danger"
                :disabled="deletingId === batchKey(deleteTarget)"
                @click="confirmDelete"
              >
                {{ deletingId === batchKey(deleteTarget) ? t('admin.sentNotifications.deleting') : t('admin.sentNotifications.deleteConfirmButton') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { isAppError } from '@/lib/api'
import { useNotificationsStore } from '@/stores/notifications'
import type { SentNotificationBatch } from '@/types/notification'
import { useGsap } from '@/composables/useGsap'

/**
 * 管理端·已发布公告列表与删除（GET/DELETE /admin/notifications/sent）。
 * 列表为批次聚合：一次发布 = 一个批次（批量发送 total>1，单发 total=1），created_at 倒序；
 * 批次数量级小，一次拉 limit=100 拉满不分页。删除以 createdAt/type/title/createdBy
 * 四字段作选择器，与后端聚合口径一致；幂等空删 deleted=0 时同样按成功处理。
 */
const { t, te } = useI18n()
const notifications = useNotificationsStore()
const { create, reduceMotion } = useGsap()

const loading = ref(true)
const loadError = ref('')
const deleteError = ref('')
const successText = ref('')
const deletingId = ref('')
const batches = ref<SentNotificationBatch[]>([])
/** 两步确认弹窗状态（替代原生 confirm，风格对齐 MinecraftView 解绑 / DangerZone 注销） */
const deleteTarget = ref<SentNotificationBatch | null>(null)
const deleteStep = ref(1)

/** 行唯一键：批次无独立 id，用选择器四字段拼合（与 DELETE 口径一致） */
function batchKey(b: SentNotificationBatch): string {
  return `${b.createdAt ?? ''}|${b.type}|${b.title}|${b.createdBy ?? ''}`
}

/** 未知类型回退原始常量（后端新增类型不崩） */
function typeLabel(type: string): string {
  if (type === 'announcement') return t('admin.sentNotifications.typeAnnouncement')
  if (type === 'warning') return t('admin.sentNotifications.typeWarning')
  return type
}

function formatDateTime(ts?: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function errorText(e: unknown, fallback: 'loadError' | 'deleteError'): string {
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
  return t(`admin.sentNotifications.${fallback}`)
}

async function load() {
  loading.value = true
  loadError.value = ''
  successText.value = ''
  try {
    batches.value = await notifications.adminListSent()
  } catch (e) {
    loadError.value = errorText(e, 'loadError')
  } finally {
    loading.value = false
  }
}

/** 打开删除确认弹窗：每次重置到后果说明页 */
function openDeleteDialog(batch: SentNotificationBatch) {
  deleteTarget.value = batch
  deleteStep.value = 1
  deleteError.value = ''
}

function closeDeleteDialog() {
  deleteTarget.value = null
  deleteStep.value = 1
  deleteError.value = ''
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target || deletingId.value) return
  deleteError.value = ''
  successText.value = ''
  const key = batchKey(target)
  deletingId.value = key
  try {
    const deleted = await notifications.adminDeleteSent({
      createdAt: target.createdAt ?? 0,
      type: target.type,
      title: target.title,
      createdBy: target.createdBy ?? '',
    })
    // 删除成功即从本地列表移除该行；幂等空删 deleted=0（已被删/并发删）也按成功提示
    batches.value = batches.value.filter((b) => batchKey(b) !== key)
    successText.value = t('admin.sentNotifications.deleteSuccess', { count: deleted })
    closeDeleteDialog()
  } catch (e) {
    deleteError.value = errorText(e, 'deleteError')
  } finally {
    deletingId.value = ''
  }
}

onMounted(() => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.sent-page > *', { autoAlpha: 0, y: 16, duration: 0.5, ease: 'power3.out', stagger: 0.06, clearProps: 'all' })
  })
  void load()
})
</script>

<style scoped>
@import './admin-shared.css';

.nowrap {
  white-space: nowrap;
}

/* 长文本列：超宽省略（td max-width + ellipsis），悬停 title 看全量 */
.td-title {
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-color);
  font-weight: 600;
}

.td-body {
  max-width: 20rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
}

.td-num {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

/* 类型徽章：announcement = primary / warning = error（参照 AuditView category-dot 的两色思路） */
.sent-type {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 99px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.sent-type[data-type='announcement'] {
  color: var(--primary-color);
  border-color: color-mix(in srgb, var(--primary-color) 35%, transparent);
  background: color-mix(in srgb, var(--primary-color) 8%, transparent);
}

.sent-type[data-type='warning'] {
  color: var(--error-color, #e5484d);
  border-color: color-mix(in srgb, var(--error-color, #e5484d) 35%, transparent);
  background: color-mix(in srgb, var(--error-color, #e5484d) 8%, transparent);
}

/* 删除：ghost 小按钮，danger 配色（.btn.ghost 基础上缩小并着色） */
.del-btn {
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  color: var(--error-color, #e5484d);
  border-color: color-mix(in srgb, var(--error-color, #e5484d) 35%, transparent);
}

.sent-page .form-success,
.sent-page .form-error {
  margin-top: 0.8rem;
}

/* ---------- 删除两步确认弹窗（风格对齐 MinecraftView 解绑 / DangerZone 注销） ---------- */
.sn-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.55);
  overflow-y: auto;
}

.sn-dialog {
  width: 100%;
  max-width: 26rem;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.sn-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--border-color);
}

.sn-dialog-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sn-dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
}

.sn-dialog-close:hover {
  color: var(--text-color);
}

.sn-dialog-close svg {
  width: 16px;
  height: 16px;
}

.sn-dialog-close:focus-visible,
.sn-dialog-btn:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

.sn-dialog-body {
  padding: 1.25rem 1.1rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.sn-dialog-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid color-mix(in srgb, #d4a72c 45%, transparent);
  background: color-mix(in srgb, #d4a72c 10%, transparent);
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--text-color);
}

.sn-dialog-warning svg {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 0.15rem;
  color: #d4a72c;
}

.sn-dialog-effects {
  margin: 0;
  padding: 0 0 0 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.sn-dialog-hint {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-color);
  overflow-wrap: anywhere;
}

.sn-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.sn-dialog-btn {
  padding: 0.5rem 0.95rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.86rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.sn-dialog-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--text-secondary) 8%, transparent);
}

.sn-dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sn-dialog-btn-primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

.sn-dialog-btn-danger {
  background: var(--error-color, #e5484d);
  border-color: var(--error-color, #e5484d);
  color: #fff;
}

.sn-dialog-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--error-color, #e5484d) 88%, #000);
}

@media (max-width: 896px) {
  .sn-overlay {
    padding: 6vh 0.9rem 2rem;
    /* flex 居中 + overflow-y:auto 会裁掉高于视口的弹层顶部且滚不回去（标题/关闭按钮丢失） */
    align-items: flex-start;
  }
}
</style>
