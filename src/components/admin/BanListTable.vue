<script setup lang="ts">
/**
 * 封禁列表组件（筛选 Tab + 表格）。
 *
 * mode：
 * - `admin`  —— 管理后台：类型（Minecraft/Website/Chat）/ 目标（名 + uuid）/ 理由 / 状态 / 到期 / 创建者 / 操作；
 * - `public` —— 对外公示：玩家（头像 + 名）/ 封禁类型（永久 · 临时）/ 理由 / 到期 / 状态。
 *   uuid、账号 id、处罚人、内部操作一律不渲染（安全口径同 nexus `listPublicBans`）。
 *
 * 字体：正文与徽标统一走 MiSans（--font-primary），只有筛选 Tab 的计数与
 * kicker 用等宽（--font-mono）——避免表格里混进第三种字形。
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HoldButton from '@/components/bits/HoldButton.vue'
import type { Ban } from '@/types/nexus'

type Mode = 'admin' | 'public'
type BanStatus = 'active' | 'expired' | 'revoked'
type FilterKey = 'all' | 'active' | 'revoked' | 'permanent' | 'temporary'

const props = withDefaults(
  defineProps<{
    bans: Ban[]
    mode?: Mode
    loading?: boolean
    /** 每页条数；0 = 不分页（管理后台整表滚动）。公示页固定 6 条并翻页。 */
    pageSize?: number
  }>(),
  { mode: 'admin', loading: false, pageSize: 0 },
)

const emit = defineEmits<{
  edit: [ban: Ban]
  revoke: [ban: Ban]
  evidence: [ban: Ban]
}>()

const { t } = useI18n()

const filter = ref<FilterKey>('all')

/** 用 computed 而不是静态数组：语言切换时会跟着重算，label 也直接是字符串 */
const tabs = computed<{ key: FilterKey; label: string }[]>(() => [
  { key: 'all', label: t('admin.bans.filterAll') },
  { key: 'active', label: t('admin.bans.statusActive') },
  { key: 'revoked', label: t('admin.bans.statusRevoked') },
  { key: 'permanent', label: t('admin.bans.permanent') },
  { key: 'temporary', label: t('admin.bans.filterTemporary') },
])

function statusOf(ban: Ban): BanStatus {
  if (ban.revokedAt) return 'revoked'
  if (ban.expiresAt != null && ban.expiresAt <= Date.now()) return 'expired'
  return 'active'
}

function isPermanent(ban: Ban): boolean {
  return ban.expiresAt == null
}

function matchesFilter(ban: Ban, key: FilterKey): boolean {
  switch (key) {
    case 'all':
      return true
    case 'active':
      return statusOf(ban) === 'active'
    case 'revoked':
      return statusOf(ban) === 'revoked'
    case 'permanent':
      return isPermanent(ban)
    case 'temporary':
      return !isPermanent(ban)
  }
}

const rows = computed(() => props.bans.filter((b) => matchesFilter(b, filter.value)))

/** 分页：pageSize > 0 时只渲染当前页，切筛选回到第 1 页 */
const page = ref(1)

watch(
  () => filter.value,
  () => {
    page.value = 1
  },
)

const totalPages = computed(() =>
  props.pageSize > 0 ? Math.max(1, Math.ceil(rows.value.length / props.pageSize)) : 1,
)

const pagedRows = computed(() => {
  if (props.pageSize <= 0) return rows.value
  const start = (page.value - 1) * props.pageSize
  return rows.value.slice(start, start + props.pageSize)
})

const counts = computed<Record<FilterKey, number>>(() => ({
  all: props.bans.length,
  active: props.bans.filter((b) => matchesFilter(b, 'active')).length,
  revoked: props.bans.filter((b) => matchesFilter(b, 'revoked')).length,
  permanent: props.bans.filter((b) => matchesFilter(b, 'permanent')).length,
  temporary: props.bans.filter((b) => matchesFilter(b, 'temporary')).length,
}))

function statusLabel(ban: Ban): string {
  const s = statusOf(ban)
  if (s === 'active') return t('admin.bans.statusActive')
  return t('admin.bans.statusRevoked')
}

/** 公开视图的「封禁类型」：只看永久 / 临时，与原公告口径一致 */
function banKindLabel(ban: Ban): string {
  return isPermanent(ban) ? t('admin.bans.permanentBan') : t('admin.bans.temporaryBan')
}

/** 管理视图的类型：Minecraft / Website / Chat */
function typeLabel(type: string): string {
  return type === 'minecraft' ? 'Minecraft' : type === 'website' ? 'Website' : type === 'chat' ? 'Chat' : type
}

function initialsOf(name: string | null | undefined): string {
  const n = (name || '?').trim()
  return n.slice(0, 1).toUpperCase() || '?'
}

/**
 * 有效时间戳判定。接口没给到期时间时，数据侧会用 `1` 作「已过期」哨兵
 * （让状态判断正确），但渲染时必须当无效处理，否则列表里全是 1970/1/1。
 * 阈值取 2000-01-01：真实封禁不可能早于这个时间。
 */
const MIN_VALID_TS = 946684800000

function validTs(ms: number | null | undefined): number | null {
  return typeof ms === 'number' && Number.isFinite(ms) && ms > MIN_VALID_TS ? ms : null
}

function formatExpires(ban: Ban): string {
  if (isPermanent(ban)) return t('admin.bans.permanent')
  const ts = validTs(ban.expiresAt)
  if (ts === null) return '—'
  return new Date(ts).toLocaleDateString('zh-CN')
}

function formatDate(ms: number | null | undefined): string {
  if (ms == null) return t('admin.bans.permanent')
  const ts = validTs(ms)
  if (ts === null) return '—'
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

function creatorLabel(ban: Ban): string {
  return ban.createdByName || ban.createdBy || '—'
}
</script>

<template>
  <div class="ban-list">
    <div class="tabs" role="tablist" :aria-label="t('admin.bans.title')">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="tab"
        role="tab"
        :aria-selected="filter === tab.key"
        @click="filter = tab.key"
      >
        {{ tab.label }}
        <span class="tab-count">{{ counts[tab.key] }}</span>
      </button>
    </div>

    <p v-if="loading" class="ban-loading">{{ t('admin.common.loading') }}</p>

    <p v-else-if="!rows.length" class="ban-empty">
      {{ filter === 'all' ? t('admin.common.empty') : t('admin.bans.filteredEmpty') }}
    </p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <!-- 公开视图：玩家 / 封禁类型 / 理由 / 到期 / 状态 -->
        <thead v-if="mode === 'public'">
          <tr>
            <th>{{ t('admin.bans.target') }}</th>
            <th>{{ t('admin.bans.type') }}</th>
            <th>{{ t('admin.bans.reason') }}</th>
            <th>{{ t('admin.bans.expires') }}</th>
            <th>{{ t('admin.bans.status') }}</th>
          </tr>
        </thead>
        <thead v-else>
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

        <tbody v-if="mode === 'public'">
          <tr v-for="ban in pagedRows" :key="ban.id">
            <td class="td-player">
              <span class="avatar">{{ initialsOf(ban.minecraftUsername) }}</span>
              <span class="player-name">{{ ban.minecraftUsername || t('admin.bans.targetUnknown') }}</span>
            </td>
            <td>
              <span class="kind-badge" :data-kind="isPermanent(ban) ? 'permanent' : 'temporary'">
                {{ banKindLabel(ban) }}
              </span>
            </td>
            <td class="td-reason">{{ ban.reason }}</td>
            <td class="td-expires">{{ formatExpires(ban) }}</td>
            <td>
              <span class="status-badge" :data-status="statusOf(ban)">{{ statusLabel(ban) }}</span>
            </td>
          </tr>
        </tbody>

        <tbody v-else>
          <tr v-for="ban in pagedRows" :key="ban.id" :class="{ 'row-revoked': ban.revokedAt }">
            <td><span class="type-badge" :data-type="ban.type">{{ typeLabel(ban.type) }}</span></td>
            <td class="td-target">
              <template v-if="ban.minecraftUsername || ban.minecraftUuid">
                <span class="target-name">{{ ban.minecraftUsername || ban.minecraftUuid }}</span>
                <span v-if="ban.minecraftUsername && ban.minecraftUuid" class="target-uuid">{{ ban.minecraftUuid }}</span>
              </template>
              <span v-else class="td-dim">{{ ban.minecraftAccountId || t('admin.bans.targetUnknown') }}</span>
            </td>
            <td class="td-reason">{{ ban.reason }}</td>
            <td>
              <span class="status-badge" :data-status="statusOf(ban)">{{ statusLabel(ban) }}</span>
            </td>
            <td class="td-dim">{{ formatDate(ban.expiresAt) }}</td>
            <td class="td-dim" :title="ban.createdBy || ''">{{ creatorLabel(ban) }}</td>
            <td class="td-actions">
              <template v-if="statusOf(ban) === 'active'">
                <button type="button" class="row-btn" @click="emit('edit', ban)">{{ t('admin.bans.edit') }}</button>
                <HoldButton
                  class="hb-revoke"
                  size="sm"
                  :label="t('admin.bans.revoke')"
                  :done-label="t('admin.bans.revoked')"
                  :duration="1000"
                  @hold="emit('revoke', ban)"
                />
              </template>
              <button type="button" class="row-btn" @click="emit('evidence', ban)">{{ t('admin.bans.evidence') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pageSize > 0 && totalPages > 1" class="pager">
      <button type="button" class="pager-btn" :disabled="page <= 1" @click="page -= 1">
        {{ t('admin.common.prev') }}
      </button>
      <span class="pager-label">{{ page }} / {{ totalPages }}</span>
      <button type="button" class="pager-btn" :disabled="page >= totalPages" @click="page += 1">
        {{ t('admin.common.next') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.ban-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* —— 筛选 Tab —— */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-primary);
  font-size: 12.5px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  /* 硬写两套色值：--text-secondary / --text-color 在首页作用域曾解析成深色，
     深底上直接看不见，不赌变量 */
  color: #3c3c43;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background-color 0.15s;
}

[data-theme='dark'] .tab {
  color: #ddd8ef;
}

.tab[aria-selected='true'] {
  background: color-mix(in srgb, var(--primary-color) 16%, transparent);
  border-color: var(--primary-color);
  color: var(--primary-color);
  font-weight: 550;
}
.tab-count {
  font-family: var(--font-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}
@media (hover: hover) {
  .tab:hover {
    border-color: var(--primary-color);
    color: var(--text-color);
  }
}

.ban-loading,
.ban-empty {
  color: var(--text-secondary);
  font-size: 14px;
  padding: 18px 0;
}

.table-wrap {
  overflow-x: auto;
}

/* —— 表格（正文全部 MiSans） —— */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-primary);
  font-size: 14px;
}
.data-table th {
  text-align: left;
  font-family: var(--font-primary);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 13px 18px;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}
.data-table td {
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  vertical-align: middle;
}
.data-table tbody tr:last-child td {
  border-bottom: 0;
}
.data-table tbody tr {
  transition:
    background-color 0.15s,
    box-shadow 0.15s;
}
@media (hover: hover) {
  .data-table tbody tr:hover {
    background-color: color-mix(in srgb, var(--primary-color) 7%, transparent);
    box-shadow: inset 3px 0 0 var(--primary-color);
  }
}

.td-reason {
  max-width: 34ch;
}
.td-expires {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  opacity: 0.85;
}
.td-dim {
  color: var(--text-secondary);
  opacity: 0.75;
}
.target-name {
  color: var(--text-color);
  font-weight: 550;
}
.target-uuid {
  display: block;
  font-family: var(--font-mono);
  font-size: 11px;
  opacity: 0.65;
  margin-top: 2px;
}
.th-actions,
.td-actions {
  width: 1%;
  white-space: nowrap;
  text-align: right;
}
.td-actions > * {
  margin-left: 6px;
  vertical-align: middle;
}
.row-btn {
  font-family: var(--font-primary);
  font-size: 12.5px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}
@media (hover: hover) {
  .row-btn:hover:not(:disabled) {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
}
.row-revoked {
  opacity: 0.65;
}

/* —— 玩家列 —— */
.td-player {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-family: var(--font-primary);
  font-size: 12px;
  font-weight: 600;
  flex: 0 0 auto;
  background: linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 55%, #2a1b4d));
}
.player-name {
  color: var(--text-color);
  font-weight: 550;
  font-size: 14.5px;
}

/* —— 徽标：统一 MiSans，颜色对齐公示口径 —— */
.kind-badge,
.type-badge,
.status-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-primary);
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.4;
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  white-space: nowrap;
}

/* 封禁类型：永久=红，临时=琥珀 */
.kind-badge[data-kind='permanent'] {
  color: #e5484d;
  border-color: color-mix(in srgb, #e5484d 35%, transparent);
  background: color-mix(in srgb, #e5484d 12%, transparent);
}
.kind-badge[data-kind='temporary'] {
  color: #d97706;
  border-color: color-mix(in srgb, #d97706 35%, transparent);
  background: color-mix(in srgb, #d97706 12%, transparent);
}

/* 管理视图的类型徽标 */
.type-badge {
  color: var(--text-secondary);
}
.type-badge[data-type='minecraft'] {
  color: var(--primary-color);
  border-color: color-mix(in srgb, var(--primary-color) 35%, transparent);
  background: color-mix(in srgb, var(--primary-color) 9%, transparent);
}
.type-badge[data-type='website'] {
  color: var(--link-color);
  border-color: color-mix(in srgb, var(--link-color) 35%, transparent);
  background: color-mix(in srgb, var(--link-color) 9%, transparent);
}

/* 状态：生效中=红，已解除=绿（与公示口径一致） */
.status-badge[data-status='active'] {
  color: #e5484d;
  border-color: color-mix(in srgb, #e5484d 35%, transparent);
  background: color-mix(in srgb, #e5484d 12%, transparent);
}
.status-badge[data-status='expired'],
.status-badge[data-status='revoked'] {
  color: #12a150;
  border-color: color-mix(in srgb, #12a150 35%, transparent);
  background: color-mix(in srgb, #12a150 10%, transparent);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* —— 分页（公示页每页 6 条，避免一次把整表倒出来）—— */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-top: 14px;
}
.pager-btn {
  font-family: var(--font-primary);
  font-size: 12.5px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}
.pager-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
@media (hover: hover) {
  .pager-btn:hover:not(:disabled) {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
}
.pager-label {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
