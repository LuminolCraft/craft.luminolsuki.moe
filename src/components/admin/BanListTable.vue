<script setup lang="ts">
/**
 * 封禁列表组件（筛选 Tab + 状态/类型过滤 + 表格）。
 *
 * mode：
 * - `admin`  —— 管理后台：完整字段（uuid / 到期 / 创建者 / 操作），事件回抛给父页面；
 * - `public` —— 对外公示：**只显示 玩家（头像+用户名）/ 类型 / 理由 / 状态**，
 *   uuid、到期、创建者、内部操作一律不渲染。安全口径见 nexus `listPublicBans`。
 */
import { computed, ref } from 'vue'
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
  }>(),
  { mode: 'admin', loading: false },
)

const emit = defineEmits<{
  edit: [ban: Ban]
  revoke: [ban: Ban]
  evidence: [ban: Ban]
}>()

const { t } = useI18n()

const filter = ref<FilterKey>('all')

const TABS: { key: FilterKey; label: () => string }[] = [
  { key: 'all', label: () => t('admin.bans.filterAll') },
  { key: 'active', label: () => t('admin.bans.statusActive') },
  { key: 'revoked', label: () => t('admin.bans.statusRevoked') },
  { key: 'permanent', label: () => t('admin.bans.permanent') },
  { key: 'temporary', label: () => t('admin.bans.filterTemporary') },
]

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
  if (s === 'expired') return t('admin.bans.statusExpired')
  return t('admin.bans.statusRevoked')
}

function typeLabel(type: string): string {
  return type === 'minecraft' ? 'Minecraft' : type === 'website' ? 'Website' : type === 'chat' ? 'Chat' : type
}

function initialsOf(name: string | null | undefined): string {
  const n = (name || '?').trim()
  return n.slice(0, 1).toUpperCase() || '?'
}

function formatDate(ms: number | null | undefined): string {
  if (ms == null) return t('admin.bans.permanent')
  return new Date(ms).toLocaleString('zh-CN', { hour12: false })
}

/** 公示用的到期文案：只到日，永久封禁显示「永久」 */
function formatExpires(ban: Ban): string {
  if (ban.expiresAt == null) return t('admin.bans.permanent')
  return new Date(ban.expiresAt).toLocaleDateString('zh-CN')
}

function creatorLabel(ban: Ban): string {
  return ban.createdByName || ban.createdBy || '—'
}
</script>

<template>
  <div class="ban-list">
    <div class="tabs" role="tablist" :aria-label="t('admin.bans.title')">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        type="button"
        class="tab"
        role="tab"
        :aria-selected="filter === tab.key"
        @click="filter = tab.key"
      >
        {{ tab.label() }}
        <span class="tab-count">{{ counts[tab.key] }}</span>
      </button>
    </div>

    <p v-if="loading" class="ban-loading">{{ t('admin.common.loading') }}</p>

    <p v-else-if="!rows.length" class="ban-empty">
      {{ filter === 'all' ? t('admin.common.empty') : t('admin.bans.filteredEmpty') }}
    </p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <!-- 公开视图：玩家 / 类型 / 理由 / 到期 / 状态（脱敏口径：不含 uuid 与内部操作） -->
        <thead v-if="mode === 'public'">
          <tr>
            <th>{{ t('admin.bans.target') }}</th>
            <th>{{ t('admin.bans.type') }}</th>
            <th>{{ t('admin.bans.reason') }}</th>
            <th>{{ t('admin.bans.expires') }}</th>
            <th>{{ t('admin.bans.status') }}</th>
          </tr>
        </thead>
        <!-- 管理视图：完整字段 -->
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
          <tr v-for="ban in rows" :key="ban.id">
            <td class="td-player">
              <span class="avatar">{{ initialsOf(ban.minecraftUsername) }}</span>
              <span class="player-name">{{ ban.minecraftUsername || t('admin.bans.targetUnknown') }}</span>
            </td>
            <td><span class="type-badge" :data-type="ban.type">{{ typeLabel(ban.type) }}</span></td>
            <td class="td-reason">{{ ban.reason }}</td>
            <td class="td-expires">{{ formatExpires(ban) }}</td>
            <td>
              <span class="status-badge" :data-status="statusOf(ban)">{{ statusLabel(ban) }}</span>
            </td>
          </tr>
        </tbody>

        <tbody v-else>
          <tr v-for="ban in rows" :key="ban.id" :class="{ 'row-revoked': ban.revokedAt }">
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
  </div>
</template>

<style scoped>
.ban-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* —— 筛选 Tab：chip 组（抄自 lophine 的方块筛选，不做下拉）—— */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-family: var(--font-mono);
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background-color 0.15s;
}
.tab[aria-selected='true'] {
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  border-color: var(--primary-color);
  color: var(--primary-color);
  font-weight: 550;
}
.tab-count {
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

/* —— 表格行 hover：3px 内阴影左条，不推布局 —— */
.table-wrap {
  overflow-x: auto;
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

/* —— 公开视图的玩家列：头像 + 用户名（无 uuid）—— */
.td-player {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  flex: 0 0 auto;
  background: linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 60%, #000));
}
.player-name {
  color: var(--text-color);
  font-weight: 550;
}

/* 表格基线样式自包含：本组件在 admin 页与对外公示页都要能独立工作，
   不依赖 admin-shared.css；与 admin-shared.css 同名类同值，视觉一致。 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.data-table th {
  text-align: left;
  font-size: 11px;
  font-family: var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}
.data-table td {
  padding: 13px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  vertical-align: middle;
}
.data-table tbody tr:last-child td {
  border-bottom: 0;
}
.td-reason {
  max-width: 34ch;
}
.td-expires {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  opacity: 0.8;
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
  font-size: 12px;
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
.type-badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid var(--border-color);
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
.status-badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid var(--border-color);
}
.status-badge[data-status='active'] {
  color: var(--bases-success, #00bfa6);
  border-color: color-mix(in srgb, var(--bases-success, #00bfa6) 35%, transparent);
  background: color-mix(in srgb, var(--bases-success, #00bfa6) 9%, transparent);
}
.status-badge[data-status='expired'],
.status-badge[data-status='revoked'] {
  color: var(--text-secondary);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
