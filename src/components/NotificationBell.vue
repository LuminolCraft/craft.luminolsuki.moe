<template>
  <div ref="rootRef" class="notif-bell">
    <!-- 铃铛按钮：mirror Navbar 图标风格（描边 SVG），未读数红点 0 无 / 1-99 数字 / 99+ 显示 99+ -->
    <button
      type="button"
      class="bell-btn"
      :aria-label="t('notification.bell.title')"
      :title="t('notification.bell.title')"
      @click="toggle"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
      <span v-if="badgeText" class="bell-badge">{{ badgeText }}</span>
    </button>

    <!-- 下拉面板：简单 transition（仓库 Navbar 无同类既有 GSAP 下拉动效，不造复杂动画） -->
    <Transition name="bell-pop">
      <div v-if="open" class="bell-panel">
        <div class="bell-head">
          <span class="bell-title">{{ t('notification.bell.title') }}</span>
          <button
            type="button"
            class="bell-markall"
            :disabled="markingAll || store.unreadCount === 0"
            @click="onMarkAllRead"
          >
            {{ t('notification.bell.markAllRead') }}
          </button>
        </div>

        <!-- 加载 / 错误 / 空态 -->
        <div v-if="store.listLoading && !recent.length" class="bell-state">{{ t('notification.bell.loading') }}</div>
        <button v-else-if="store.listError && !recent.length" type="button" class="bell-state bell-retry" @click="retry">
          {{ t('notification.bell.error') }}
        </button>
        <div v-else-if="!recent.length" class="bell-state">{{ t('notification.bell.empty') }}</div>

        <!-- 最近 10 条：type 角标 + 时间 + 未读小圆点 -->
        <ul v-else class="bell-list">
          <li v-for="n in recent" :key="n.id" class="bell-row">
            <button type="button" class="bell-item" :class="{ unread: !n.readAt }" @click="onItemClick(n)">
              <span class="bell-item-meta">
                <span class="bell-type" :data-type="n.type">{{ typeLabel(n.type) }}</span>
                <span class="bell-time">{{ formatTime(n.createdAt) }}</span>
                <span v-if="!n.readAt" class="unread-dot" :title="t('notification.center.markRead')" />
              </span>
              <span class="bell-item-title">{{ n.title }}</span>
            </button>
          </li>
        </ul>

        <div class="bell-foot">
          <RouterLink to="/notifications" class="bell-view-all" @click="close">
            {{ t('notification.bell.viewAll') }}
          </RouterLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'
import { isInternalPath } from '@/utils/internalPath'
import type { NotificationItem } from '@/types/notification'

/**
 * 顶栏通知铃铛：未读红点 + 最近 10 条下拉。
 * 网络逻辑全部收敛在 notifications store，本组件只做状态呈现与跳转。
 */
const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const store = useNotificationsStore()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)
const markingAll = ref(false)

/** 下拉仅展示最近 10 条 */
const recent = computed(() => store.list.slice(0, 10))

/** 红点文案：0 无、1-99 数字、99+ 显示 99+ */
const badgeText = computed(() => {
  const n = store.unreadCount
  if (n <= 0) return ''
  return n > 99 ? '99+' : String(n)
})

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

function toggle() {
  open.value = !open.value
  // 打开时若无数据（WS 对账失败或尚未加载），显式补一次 REST 对账
  if (open.value && !recent.value.length && !store.listLoading) {
    void store.reconcile()
  }
}

function close() {
  open.value = false
}

/** WS 对账失败（如短暂离线）后的重试入口 */
function retry() {
  void store.reconcile()
}

/** 点击条目：标记已读（失败不阻塞）→ 有站内 link 则跳转并收起 */
function onItemClick(n: NotificationItem) {
  close()
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
    /* 失败保持未读状态，下次再试 */
  } finally {
    markingAll.value = false
  }
}

const handleClickOutside = (event: MouseEvent) => {
  if (open.value && rootRef.value && !rootRef.value.contains(event.target as Node)) {
    close()
  }
}

// 路由切换（含条目跳转/查看全部）自动收起
watch(() => route.fullPath, close)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.notif-bell {
  position: relative;
  display: inline-flex;
}

.bell-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  background: none;
  border: none;
  color: white;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.3s;
}

.bell-btn:hover {
  color: var(--button-hover);
}

.bell-btn:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
  border-radius: 8px;
}

.bell-btn svg {
  width: 20px;
  height: 20px;
}

/* 未读数红点 */
.bell-badge {
  position: absolute;
  top: -3px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 99px;
  background: var(--error-color, #e5484d);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 2px var(--bases-nav-bg, transparent);
}

/* ---------- 下拉面板 ---------- */
.bell-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: -8px;
  width: min(21rem, calc(100vw - 2.4rem));
  background: var(--background-color, #16181f);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.35);
  overflow: hidden;
  z-index: 1200;
}

.bell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid var(--border-color);
}

.bell-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color);
}

.bell-markall {
  padding: 0.15rem 0.55rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 99px;
  color: var(--text-secondary);
  font-size: 0.72rem;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.bell-markall:hover:not(:disabled) {
  color: var(--primary-color);
  border-color: color-mix(in srgb, var(--primary-color) 40%, transparent);
}

.bell-markall:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.bell-state {
  display: block;
  width: 100%;
  padding: 1.4rem 0.9rem;
  font-size: 0.84rem;
  color: var(--text-secondary);
  text-align: center;
  background: none;
  border: none;
}

.bell-retry {
  cursor: pointer;
}

.bell-retry:hover {
  color: var(--link-color);
}

.bell-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 21rem;
  overflow-y: auto;
}

.bell-row + .bell-row {
  border-top: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
}

.bell-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 100%;
  padding: 0.65rem 0.9rem;
  background: none;
  border: none;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.bell-item:hover {
  background: color-mix(in srgb, var(--text-color) 5%, transparent);
}

.bell-item.unread .bell-item-title {
  font-weight: 600;
  color: var(--text-color);
}

.bell-item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bell-type {
  flex-shrink: 0;
  padding: 0.05rem 0.45rem;
  border-radius: 5px;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--primary-color);
  border: 1px solid color-mix(in srgb, var(--primary-color) 35%, transparent);
}

.bell-type[data-type='warning'] {
  color: var(--error-color, #e5484d);
  border-color: color-mix(in srgb, var(--error-color, #e5484d) 35%, transparent);
}

.bell-time {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.unread-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 99px;
  background: var(--primary-color);
}

.bell-item-title {
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--text-color);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bell-foot {
  padding: 0.55rem 0.9rem;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.bell-view-all {
  font-size: 0.8rem;
  color: var(--link-color);
}

.bell-view-all:hover {
  text-decoration: underline;
}

/* 简单展开动效（fade + 轻微位移，与全局 dropdown 过渡节奏一致） */
.bell-pop-enter-active,
.bell-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.bell-pop-enter-from,
.bell-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---------- 移动端：下拉改为贴视口两侧的固定面板 ---------- */
@media (max-width: 896px) {
  .bell-btn {
    min-width: 44px;
    min-height: 44px;
  }

  /* 铃铛是右侧操作区最左项，桌面 absolute + right:-8px 会让 336px 面板左侧越出视口
     （375px 时约 -96px，且 body{overflow-x:hidden} 无法横向滚到）；改为固定面板整体滚动 */
  .bell-panel {
    position: fixed;
    top: calc(4rem + 0.5rem);
    left: 0.75rem;
    right: 0.75rem;
    width: auto;
    max-height: min(70dvh, 26rem);
    overflow-y: auto;
  }

  .bell-list {
    max-height: none;
  }
}
</style>
