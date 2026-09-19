<template>
  <div class="notif-page">
    <header class="page-head">
      <div class="page-head-row">
        <div>
          <h1 class="page-title">{{ t('notification.center.title') }}</h1>
          <p class="page-subtitle">{{ t('notification.center.subtitle') }}</p>
        </div>
        <button
          type="button"
          class="btn ghost"
          :disabled="markingAll || store.unreadCount === 0"
          @click="onMarkAllRead"
        >
          {{ t('notification.center.markAllRead') }}
        </button>
      </div>
    </header>

    <div v-if="store.listLoading && !store.list.length" class="page-loading">{{ t('notification.center.loading') }}</div>

    <template v-else>
      <p v-if="!store.list.length" class="page-empty">{{ t('notification.center.empty') }}</p>

      <ul v-else class="notif-list">
        <li v-for="n in store.list" :key="n.id" class="notif-row" :class="{ unread: !n.readAt }">
          <button type="button" class="notif-item" @click="onItemClick(n)">
            <span class="notif-meta">
              <span class="notif-type" :data-type="n.type">{{ typeLabel(n.type) }}</span>
              <span class="notif-title">{{ n.title }}</span>
              <span v-if="!n.readAt" class="unread-dot" :title="t('notification.center.markRead')" />
              <span class="notif-time">{{ formatTime(n.createdAt) }}</span>
            </span>
            <span v-if="n.body" class="notif-body">{{ n.body }}</span>
          </button>
        </li>
      </ul>

      <!-- 分页器：mirror 既有列表页（admin/UsersView）prev/next 模式 -->
      <div v-if="hasMore || page > 1" class="pager">
        <button type="button" class="pager-btn" :disabled="page <= 1 || store.listLoading" @click="go(page - 1)">
          {{ t('notification.center.prev') }}
        </button>
        <span class="pager-label">{{ t('notification.center.pageOf', { page }) }}</span>
        <button type="button" class="pager-btn" :disabled="!hasMore || store.listLoading" @click="go(page + 1)">
          {{ t('notification.center.next') }}
        </button>
      </div>
    </template>

    <p v-if="store.listError" class="page-error" role="alert">{{ t('notification.center.error') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'
import { isInternalPath } from '@/utils/internalPath'
import type { NotificationItem } from '@/types/notification'
import { useGsap } from '@/composables/useGsap'

/**
 * 通知中心：分页列表（REST 权威）+ 顶部全部已读。
 * WS 推送由 store 头插 list，本页纯响应式呈现；分页切换经 fetchList 整页替换。
 */
const { t } = useI18n()
const router = useRouter()
const store = useNotificationsStore()
const { create, reduceMotion } = useGsap()

const LIMIT = 20
const page = ref(1)
const markingAll = ref(false)

const hasMore = computed(() => page.value * LIMIT < store.total)

function typeLabel(type: NotificationItem['type']): string {
  return type === 'warning'
    ? t('notification.center.type.warning')
    : t('notification.center.type.announcement')
}

/** 相对时间（刚刚/N 分钟前/N 小时前/N 天前），超过 7 天回退本地日期 */
function formatTime(ts?: number | null): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return t('notification.time.justNow')
  if (diff < hour) return t('notification.time.minutesAgo', { n: Math.floor(diff / minute) })
  if (diff < day) return t('notification.time.hoursAgo', { n: Math.floor(diff / hour) })
  if (diff < 7 * day) return t('notification.time.daysAgo', { n: Math.floor(diff / day) })
  return new Date(ts).toLocaleDateString()
}

async function go(nextPage: number) {
  try {
    await store.fetchList(nextPage, LIMIT)
    page.value = nextPage
  } catch {
    /* 错误态由 store.listError 驱动展示 */
  }
}

/** 点击条目：标记已读（失败不阻塞）→ 有站内 link 则跳转 */
function onItemClick(n: NotificationItem) {
  if (!n.readAt) {
    store.markRead(n.id).catch(() => {})
  }
  if (n.link && isInternalPath(n.link)) {
    void router.push(n.link)
  }
}

async function onMarkAllRead() {
  if (markingAll.value) return
  markingAll.value = true
  try {
    await store.markAllRead()
  } catch {
    /* 保持未读状态，可重试 */
  } finally {
    markingAll.value = false
  }
}

onMounted(() => {
  // 入场动效：mirror 既有 view 模式，只动画页面级子元素（clearProps 清理），
  // 不为列表项创建动画实例，分页切换不会重复建动画
  create((g) => {
    if (reduceMotion()) return
    g.from('.notif-page > *', { autoAlpha: 0, y: 16, duration: 0.5, ease: 'power3.out', stagger: 0.06, clearProps: 'all' })
  })
  void go(1)
})
</script>

<style scoped>
.notif-page {
  max-width: 46rem;
  margin: 0 auto;
  /* 顶部余量覆盖固定导航（64px），mirror Archive 等独立页的大间距习惯 */
  padding: var(--space-24, 6rem) var(--space-4, 1rem) var(--space-20, 5rem);
}

.page-head {
  margin-bottom: 1.6rem;
}

.page-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: clamp(1.4rem, 3vw, 1.8rem);
  font-weight: 700;
  letter-spacing: -0.8px;
  color: var(--text-color);
  margin: 0 0 0.4rem;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

.page-loading,
.page-empty {
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: 1.2rem 0;
}

.page-error {
  margin-top: 1.2rem;
  padding: 0.75rem 0.9rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}

/* ---------- 列表 ---------- */
.notif-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}

.notif-row + .notif-row {
  border-top: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
}

.notif-row.unread {
  background: color-mix(in srgb, var(--primary-color) 4%, transparent);
}

.notif-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
  padding: 0.9rem 1.1rem;
  background: none;
  border: none;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.notif-item:hover {
  background: color-mix(in srgb, var(--text-color) 5%, transparent);
}

.notif-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.notif-type {
  flex-shrink: 0;
  padding: 0.08rem 0.55rem;
  border-radius: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--primary-color);
  border: 1px solid color-mix(in srgb, var(--primary-color) 35%, transparent);
}

.notif-type[data-type='warning'] {
  color: var(--error-color, #e5484d);
  border-color: color-mix(in srgb, var(--error-color, #e5484d) 35%, transparent);
}

.notif-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-color);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notif-row.unread .notif-title {
  font-weight: 700;
}

.unread-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: var(--primary-color);
}

.notif-time {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 0.76rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.notif-body {
  font-size: 0.86rem;
  line-height: 1.6;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---------- 分页（mirror admin-shared.css） ---------- */
.pager {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.2rem;
}

.pager-btn {
  padding: 0.45rem 1rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.pager-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
}

.pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pager-label {
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

/* ---------- 按钮（mirror admin-shared.css .btn） ---------- */
.btn {
  padding: 0.5rem 1.1rem;
  background: var(--primary-color);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: translate 0.15s ease, opacity 0.15s ease;
}

.btn:hover:not(:disabled) {
  translate: 0 -1px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.ghost {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
}
</style>
