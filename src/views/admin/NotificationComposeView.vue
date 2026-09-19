<template>
  <div class="compose-page">
    <header class="page-head">
      <h1 class="page-title">{{ t('admin.notificationCompose.title') }}</h1>
      <p class="page-subtitle">{{ t('admin.notificationCompose.subtitle') }}</p>
    </header>

    <form class="compose-form" @submit.prevent="onSubmit">
      <!-- 目标：全员 / 指定用户 / 多选用户 -->
      <label class="field">
        <span class="label">{{ t('admin.notificationCompose.targetLabel') }}</span>
        <div class="target-seg" role="radiogroup">
          <button
            v-for="mode in TARGET_MODES"
            :key="mode"
            type="button"
            class="seg-btn"
            :class="{ active: targetMode === mode }"
            :disabled="sending"
            @click="targetMode = mode"
          >
            {{ t(`admin.notificationCompose.target.${mode}`) }}
          </button>
        </div>
      </label>

      <!-- 用户选择（单选/多选共用：加载用户列表 + 客户端按用户名过滤） -->
      <div v-if="targetMode !== 'all'" class="field">
        <span class="label">{{ t('admin.notificationCompose.userPickLabel') }}</span>
        <input
          v-model.trim="userKeyword"
          class="input"
          type="search"
          :placeholder="t('admin.notificationCompose.userSearch')"
          :disabled="sending"
        />
        <p v-if="targetMode === 'multi' && selectedUserIds.length" class="hint">
          {{ t('admin.notificationCompose.selectedCount', { count: selectedUserIds.length }) }}
        </p>
        <div v-if="usersLoading" class="dim">{{ t('admin.common.loading') }}</div>
        <p v-else-if="usersLoadError" class="form-error" role="alert">{{ usersLoadError }}</p>
        <p v-else-if="filteredUsers.length === 0" class="dim">{{ t('admin.notificationCompose.searchEmpty') }}</p>
        <ul v-else class="user-pick-list">
          <li v-for="u in filteredUsers" :key="u.id">
            <label class="user-pick" :class="{ checked: isPicked(u.id) }">
              <input
                v-if="targetMode === 'multi'"
                v-model="selectedUserIds"
                class="pick-check"
                type="checkbox"
                :value="u.id"
                :disabled="sending"
              />
              <input
                v-else
                class="pick-check"
                type="radio"
                name="compose-target-user"
                :value="u.id"
                :checked="selectedUserId === u.id"
                :disabled="sending"
                @change="selectedUserId = u.id"
              />
              <span class="pick-name">{{ u.username }}</span>
              <span class="pick-id">{{ u.id }}</span>
            </label>
          </li>
        </ul>
      </div>

      <!-- 类型 -->
      <label class="field">
        <span class="label">{{ t('admin.notificationCompose.typeLabel') }}</span>
        <select v-model="notifType" class="input select" :disabled="sending">
          <option value="announcement">{{ t('notification.center.type.announcement') }}</option>
          <option value="warning">{{ t('notification.center.type.warning') }}</option>
        </select>
      </label>

      <!-- 标题（1-120） -->
      <label class="field">
        <span class="label">{{ t('admin.notificationCompose.titleLabel') }}</span>
        <input
          v-model.trim="title"
          class="input"
          type="text"
          maxlength="120"
          :placeholder="t('admin.notificationCompose.titlePlaceholder')"
          :disabled="sending"
        />
      </label>

      <!-- 正文（可选 ≤2000） -->
      <label class="field">
        <span class="label">{{ t('admin.notificationCompose.bodyLabel') }}</span>
        <textarea
          v-model.trim="body"
          class="input textarea"
          rows="4"
          maxlength="2000"
          :placeholder="t('admin.notificationCompose.bodyPlaceholder')"
          :disabled="sending"
        />
      </label>

      <!-- 跳转链接（可选，仅站内路径） -->
      <label class="field">
        <span class="label">{{ t('admin.notificationCompose.linkLabel') }}</span>
        <input
          v-model.trim="link"
          class="input"
          type="text"
          :placeholder="t('admin.notificationCompose.linkLabelPlaceholder')"
          :disabled="sending"
        />
        <span class="hint">{{ t('admin.notificationCompose.linkHint') }}</span>
      </label>

      <button type="submit" class="btn" :disabled="!canSubmit">
        {{ sending ? t('admin.notificationCompose.sending') : t('admin.notificationCompose.send') }}
      </button>
      <p v-if="successCount !== null" class="form-success" role="status">
        {{ t('admin.notificationCompose.success', { count: successCount }) }}
      </p>
      <p v-if="sendError" class="form-error" role="alert">{{ sendError }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isAppError } from '@/lib/api'
import { normalizePaged } from '@/lib/paged'
import { useNotificationsStore } from '@/stores/notifications'
import { isInternalPath } from '@/utils/internalPath'
import type { AdminUserListItem } from '@/types/nexus'
import { useGsap } from '@/composables/useGsap'

/**
 * 管理端·发布站内通知（POST /admin/notifications）。
 * 目标：全员 / 指定用户 / 多选用户；用户选择复用既有 GET /admin/users 列表接口
 * （无搜索参数，采用客户端按用户名过滤的最简交互）。校验与后端契约对齐：
 * title 1-120、body ≤2000、link 以 / 开头的站内路径。
 */
const { t, te } = useI18n()
const notifications = useNotificationsStore()
const { create, reduceMotion } = useGsap()

type TargetMode = 'all' | 'user' | 'multi'
const TARGET_MODES: TargetMode[] = ['all', 'user', 'multi']

// ---------- 表单 ----------
const targetMode = ref<TargetMode>('all')
const notifType = ref<'announcement' | 'warning'>('announcement')
const title = ref('')
const body = ref('')
const link = ref('')
const sending = ref(false)
const successCount = ref<number | null>(null)
const sendError = ref('')

// ---------- 用户选择 ----------
const users = ref<AdminUserListItem[]>([])
const usersLoading = ref(false)
const usersLoadError = ref('')
const userKeyword = ref('')
const selectedUserId = ref('')
const selectedUserIds = ref<string[]>([])

/** 客户端按用户名过滤（列表接口无搜索参数） */
const filteredUsers = computed(() => {
  const kw = userKeyword.value.toLowerCase()
  if (!kw) return users.value
  return users.value.filter((u) => u.username.toLowerCase().includes(kw))
})

function isPicked(id: string): boolean {
  return targetMode.value === 'multi'
    ? selectedUserIds.value.includes(id)
    : selectedUserId.value === id
}

async function loadUsers() {
  usersLoading.value = true
  usersLoadError.value = ''
  try {
    // 拉一页较大的列表供选择（limit 由后端裁剪时仍可用，只是候选少一些）
    const data = await api.get<unknown>('/admin/users?page=1&limit=50')
    users.value = normalizePaged<AdminUserListItem>(data).items
  } catch (e) {
    usersLoadError.value = errorText(e)
  } finally {
    usersLoading.value = false
  }
}

// ---------- 前端校验与提交 ----------
/** 与后端契约对齐的前端校验：不合法时禁用提交 */
const canSubmit = computed(() => {
  if (sending.value) return false
  const tLen = title.value.length
  if (tLen < 1 || tLen > 120) return false
  if (body.value.length > 2000) return false
  if (link.value && !isInternalPath(link.value)) return false
  if (targetMode.value === 'user' && !selectedUserId.value) return false
  if (targetMode.value === 'multi' && selectedUserIds.value.length === 0) return false
  return true
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
  return t('admin.notificationCompose.fail')
}

async function onSubmit() {
  if (!canSubmit.value) return
  successCount.value = null
  sendError.value = ''
  sending.value = true
  try {
    const target =
      targetMode.value === 'all'
        ? 'all'
        : targetMode.value === 'user'
          ? selectedUserId.value
          : [...selectedUserIds.value]
    const count = await notifications.adminSend({
      target,
      type: notifType.value,
      title: title.value,
      ...(body.value ? { body: body.value } : {}),
      ...(link.value ? { link: link.value } : {}),
    })
    successCount.value = count
    // 成功后清空内容（保留目标与类型便于连续发布）
    title.value = ''
    body.value = ''
    link.value = ''
  } catch (e) {
    sendError.value = errorText(e)
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.compose-page > *', { autoAlpha: 0, y: 16, duration: 0.5, ease: 'power3.out', stagger: 0.06, clearProps: 'all' })
  })
  void loadUsers()
})
</script>

<style scoped>
@import './admin-shared.css';

.compose-form {
  max-width: 34rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.compose-form .field {
  margin-bottom: 0;
}

/* 目标分段选择（mirror admin-nav-item 的 hover/active 节奏） */
.target-seg {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.seg-btn {
  padding: 0.45rem 0.95rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.84rem;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.seg-btn:hover:not(:disabled) {
  color: var(--text-color);
  border-color: var(--primary-color);
}

.seg-btn.active {
  color: var(--text-color);
  font-weight: 600;
  border-color: color-mix(in srgb, var(--primary-color) 45%, transparent);
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.seg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 用户选择列表 */
.user-pick-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 16rem;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.user-pick {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.8rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.user-pick:hover {
  background: color-mix(in srgb, var(--text-color) 5%, transparent);
}

.user-pick.checked {
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.pick-check {
  flex-shrink: 0;
  accent-color: var(--primary-color);
}

.pick-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-id {
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: ui-monospace, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select {
  min-width: 10rem;
}

.textarea {
  resize: vertical;
  font-family: inherit;
}
</style>
