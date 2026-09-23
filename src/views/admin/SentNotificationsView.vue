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
                  @click="onDelete(batch)"
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

async function onDelete(batch: SentNotificationBatch) {
  if (!window.confirm(t('admin.sentNotifications.deleteConfirm', { count: batch.total ?? 1, title: batch.title }))) return
  deleteError.value = ''
  successText.value = ''
  const key = batchKey(batch)
  deletingId.value = key
  try {
    const deleted = await notifications.adminDeleteSent({
      createdAt: batch.createdAt ?? 0,
      type: batch.type,
      title: batch.title,
      createdBy: batch.createdBy ?? '',
    })
    // 删除成功即从本地列表移除该行；幂等空删 deleted=0（已被删/并发删）也按成功提示
    batches.value = batches.value.filter((b) => batchKey(b) !== key)
    successText.value = t('admin.sentNotifications.deleteSuccess', { count: deleted })
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
</style>
