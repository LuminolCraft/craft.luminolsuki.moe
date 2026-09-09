<template>
  <div class="mc-page">
    <header class="mc-header">
      <h1 class="mc-title">{{ t('minecraft.title') }}</h1>
      <p class="mc-subtitle">{{ t('minecraft.subtitle') }}</p>
    </header>

    <!-- 已绑定列表 -->
    <section class="mc-section">
      <h2 class="mc-section-title">{{ t('minecraft.listTitle') }}</h2>

      <div v-if="loading" class="mc-loading">{{ t('admin.common.loading') }}</div>

      <template v-else>
        <div v-if="accounts.length === 0" class="mc-empty">
          <p class="mc-empty-title">{{ t('minecraft.empty') }}</p>
          <p class="mc-empty-hint">{{ t('minecraft.emptyHint') }}</p>
        </div>

        <ul v-else class="mc-list">
          <li
            v-for="acc in accounts"
            :key="acc.id"
            class="mc-item"
            :class="{ selected: acc.id === selectedId }"
          >
            <button type="button" class="mc-item-main" @click="selectAccount(acc.id)">
              <img
                class="mc-skin"
                :src="mcAvatarUrl(acc, 48)"
                :alt="acc.name"
                loading="lazy"
                width="48"
                height="48"
              />
              <span class="mc-item-info">
                <span class="mc-item-name">{{ acc.name }}</span>
                <span class="mc-item-meta">
                  <span class="mc-badge" :class="{ verified: acc.verifiedAt }">
                    {{ acc.verifiedAt ? t('minecraft.verified') : t('minecraft.unverified') }}
                  </span>
                  <span v-if="acc.createdAt">{{ t('minecraft.boundAt', { date: formatDate(acc.createdAt) }) }}</span>
                </span>
              </span>
            </button>
            <button
              type="button"
              class="mc-unbind"
              :disabled="unbindingId === acc.id"
              @click="openUnbindDialog(acc)"
            >
              {{ unbindingId === acc.id ? t('minecraft.unbinding') : t('minecraft.unbind') }}
            </button>
          </li>
        </ul>
      </template>
      <p v-if="listError" class="mc-error" role="alert">{{ listError }}</p>
    </section>

    <!-- 绑定新账号（仅 Java 版：服务器已停用基岩版） -->
    <section class="mc-section">
      <h2 class="mc-section-title">{{ t('minecraft.bindTitle') }}</h2>

      <!-- 两步流程验证引导态：提交成功后前置显示；单 pending 强制（取消后才能重新发起） -->
      <div v-if="pendingCode" class="mc-pending" role="status">
        <span class="mc-pending-code">{{ pendingCode }}</span>
        <p class="mc-pending-desc">{{ t('minecraft.pendingDesc', { name: pendingName }) }}</p>
        <span class="mc-pending-command">{{ t('minecraft.pendingCommand', { code: pendingCode }) }}</span>
        <p v-if="!pollExpired" class="mc-pending-expires">
          {{ t('minecraft.pendingExpires', { n: remainSeconds }) }}
        </p>
        <template v-else>
          <p class="mc-pending-expired" role="alert">{{ t('minecraft.pendingExpired') }}</p>
          <button type="button" class="mc-resolve" @click="onPendingResubmit">
            {{ t('minecraft.pendingResubmit') }}
          </button>
        </template>
        <button
          v-if="!pollExpired"
          type="button"
          class="mc-resolve"
          :disabled="cancelling"
          @click="onCancelPending"
        >
          {{ cancelling ? t('minecraft.cancelling') : t('minecraft.cancelBind') }}
        </button>
      </div>

      <form class="mc-form" novalidate @submit.prevent="onBind">
        <div class="mc-field">
          <label class="mc-label" for="mc-name">{{ t('minecraft.nameLabel') }}</label>
          <input
            id="mc-name"
            v-model="playerName"
            class="mc-input"
            type="text"
            maxlength="16"
            spellcheck="false"
            :placeholder="t('minecraft.namePlaceholder')"
          />
          <p class="mc-hint">{{ t('minecraft.nameHint') }}</p>
        </div>

        <button type="submit" class="mc-submit" :disabled="binding || playerName.length < 3">
          {{ binding ? t('minecraft.binding') : t('minecraft.submitBind') }}
        </button>
        <div v-if="bindPendingConflict" class="mc-error mc-conflict" role="alert">
          <p class="mc-conflict-title">{{ t('minecraft.errBindPending') }}</p>
          <p>{{ t('minecraft.pendingConflictGuide') }}</p>
        </div>
        <p v-else-if="bindError" class="mc-error" role="alert">{{ bindError }}</p>
        <p v-if="bindSuccess" class="mc-success" role="status">{{ t('minecraft.bindSuccess') }}</p>
      </form>
    </section>

    <!-- 主号↔小号关联 -->
    <section v-if="selectedAccount" class="mc-section">
      <h2 class="mc-section-title">
        {{ t('minecraft.linksTitle') }} · {{ selectedAccount.name }}
      </h2>
      <p class="mc-links-hint">{{ t('minecraft.linksHint') }}</p>

      <div v-if="linksLoading" class="mc-loading">{{ t('admin.common.loading') }}</div>
      <template v-else>
        <p v-if="selectedLinks.length === 0" class="mc-empty-inline">{{ t('minecraft.linksEmpty') }}</p>
        <ul v-else class="mc-links">
          <li v-for="link in selectedLinks" :key="link.id" class="mc-link-item">
            <span class="mc-link-relation">
              <span class="mc-role">{{ link.ownerMinecraftAccountId === selectedId ? t('minecraft.linkRoleMain') : t('minecraft.linkRoleAlt') }}</span>
              <span class="mc-arrow">↔</span>
              <span class="mc-role">{{ link.ownerMinecraftAccountId === selectedId ? t('minecraft.linkRoleAlt') : t('minecraft.linkRoleMain') }}</span>
              <span class="mc-link-peer">{{ peerName(link) }}</span>
            </span>
            <button
              type="button"
              class="mc-link-remove"
              :disabled="removingLinkId === link.id"
              @click="onRemoveLink(link)"
            >
              {{ removingLinkId === link.id ? t('minecraft.linkSubmitting') : t('minecraft.linkRemove') }}
            </button>
          </li>
        </ul>

        <form v-if="accounts.length >= 2" class="mc-link-form" @submit.prevent="onCreateLink">
          <div class="mc-link-fields">
            <label class="mc-field-inline">
              <span class="mc-label">{{ t('minecraft.linkMain') }}</span>
              <select v-model="linkMainId" class="mc-input">
                <option v-for="acc in accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
              </select>
            </label>
            <span class="mc-arrow">↔</span>
            <label class="mc-field-inline">
              <span class="mc-label">{{ t('minecraft.linkAlt') }}</span>
              <select v-model="linkAltId" class="mc-input">
                <option v-for="acc in accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
              </select>
            </label>
          </div>
          <button type="submit" class="mc-submit" :disabled="creatingLink || linkMainId === linkAltId">
            {{ creatingLink ? t('minecraft.linkSubmitting') : t('minecraft.linkSubmit') }}
          </button>
          <p v-if="linkError" class="mc-error" role="alert">{{ linkError }}</p>
          <p v-if="linkSuccess" class="mc-success" role="status">{{ t('minecraft.linkCreated') }}</p>
        </form>
      </template>
    </section>

    <!-- 解绑两步确认弹窗：后果说明 → 确认执行 -->
    <Teleport to="body">
      <div v-if="unbindTarget" class="mc-overlay" @click.self="closeUnbindDialog">
        <div class="mc-dialog" role="dialog" aria-modal="true" :aria-label="t('minecraft.unbindDialogTitle')">
          <div class="mc-dialog-header">
            <span class="mc-dialog-title">{{ t('minecraft.unbindDialogTitle') }}</span>
            <button type="button" class="mc-dialog-close" :aria-label="t('minecraft.unbindClose')" @click="closeUnbindDialog">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>

          <!-- Step 1：后果说明 -->
          <div v-if="unbindStep === 1" class="mc-dialog-body">
            <div class="mc-dialog-warning" role="alert">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
              </svg>
              <span>{{ t('minecraft.unbindNoticeTitle') }}</span>
            </div>
            <ul class="mc-dialog-effects">
              <li>{{ t('minecraft.unbindEffect1', { name: unbindTarget.name }) }}</li>
              <li>{{ t('minecraft.unbindEffect2') }}</li>
              <li>{{ t('minecraft.unbindEffect3') }}</li>
            </ul>
            <div class="mc-dialog-actions">
              <button type="button" class="mc-dialog-btn" @click="closeUnbindDialog">
                {{ t('minecraft.unbindCancel') }}
              </button>
              <button type="button" class="mc-dialog-btn mc-dialog-btn-primary" @click="unbindStep = 2">
                {{ t('minecraft.unbindContinue') }}
              </button>
            </div>
          </div>

          <!-- Step 2：确认执行 -->
          <div v-else class="mc-dialog-body">
            <p class="mc-dialog-hint">
              {{ t('minecraft.unbindConfirmHint', { name: unbindTarget.name }) }}
            </p>
            <p v-if="unbindDialogError" class="mc-error" role="alert">{{ unbindDialogError }}</p>
            <div class="mc-dialog-actions">
              <button type="button" class="mc-dialog-btn" @click="closeUnbindDialog">
                {{ t('minecraft.unbindCancel') }}
              </button>
              <button
                type="button"
                class="mc-dialog-btn mc-dialog-btn-danger"
                :disabled="unbindingId === unbindTarget.id"
                @click="confirmUnbind"
              >
                {{ unbindingId === unbindTarget.id ? t('minecraft.unbinding') : t('minecraft.unbindButton') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNexusStore } from '@/stores/nexus'
import { useGsap } from '@/composables/useGsap'
import { errorToResetAt, isAppError } from '@/lib/api'
import { mcAvatarUrl } from '@/lib/minecraft'
import type { AccountLink, MinecraftAccount, MinecraftBindPending } from '@/types/nexus'

const { t } = useI18n()
const nexus = useNexusStore()
const { create, reduceMotion } = useGsap()

// ---------- 列表（会话级缓存） ----------
const loading = ref(true)
const listError = ref('')
const accounts = computed(() => nexus.minecraftAccounts)

// ---------- 绑定（仅 Java；只输名字，uuid 由插件核验时上报） ----------
/** Minecraft 正版玩家名规则：3-16 位字母/数字/下划线（区分大小写原样提交） */
const MC_NAME_RE = /^[A-Za-z0-9_]{3,16}$/
const playerName = ref('')
const binding = ref(false)
const bindError = ref('')
const bindSuccess = ref(false)
// 单 pending 强制：pending 存活时再次提交 → 409 MINECRAFT_BIND_PENDING
const bindPendingConflict = ref(false)

// ---------- 两步绑定引导态（pending：进服 /v <code> 核验后才落库） ----------
const pendingCode = ref('')
const pendingName = ref('')
const expiresTotal = ref(0)
const remainSeconds = ref(0)
const pollExpired = ref(false)
const cancelling = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null
let polling = false

// pending 绑定跨标签页同步：验证码本身就是要展示给玩家输进游戏的，无敏感信息，
// 持久化到 localStorage 让其他标签页/刷新后恢复引导态（后端无"查询 pending 绑定"端点）
const PENDING_BIND_KEY = 'mc-pending-bind'

interface StoredPendingBind {
  code: string
  name: string
  expiresIn: number
  startedAt: number
}

function savePendingBind(pending: MinecraftBindPending) {
  const record: StoredPendingBind = {
    code: pending.code,
    name: pending.name,
    expiresIn: Math.min(Math.max(0, Math.floor(pending.expiresIn)), 600),
    startedAt: Date.now(),
  }
  try {
    localStorage.setItem(PENDING_BIND_KEY, JSON.stringify(record))
  } catch {
    /* storage 不可用忽略：仅影响跨标签页/刷新恢复 */
  }
}

function clearPendingBind() {
  try {
    localStorage.removeItem(PENDING_BIND_KEY)
  } catch {
    /* 同上 */
  }
}

function loadPendingBind(): StoredPendingBind | null {
  try {
    const raw = localStorage.getItem(PENDING_BIND_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPendingBind
    if (typeof parsed?.code !== 'string' || typeof parsed?.name !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

async function onBind() {
  bindError.value = ''
  bindSuccess.value = false
  bindPendingConflict.value = false
  // 名字区分大小写原样提交（核验时与插件上报的游戏内玩家名精确比对）；
  // 不做存在性预校验（用户拍板）——输错名字在核验时必然 player_mismatch
  if (!MC_NAME_RE.test(playerName.value)) {
    bindError.value = t('minecraft.errInvalidName')
    return
  }
  binding.value = true
  try {
    // 单 pending 强制：后端在 pending 存活时返回 409 MINECRAFT_BIND_PENDING
    const result = await nexus.bindMinecraft({ platform: 'java', name: playerName.value })
    enterPending(result)
  } catch (e) {
    if (isAppError(e) && e.code === 'MINECRAFT_BIND_PENDING') {
      // 409：已有进行中的绑定验证 → 展示取消指引面板
      bindPendingConflict.value = true
    } else if (isAppError(e) && e.code === 'RATE_LIMITED') {
      // 429：预绑定限流，后端携带 details.resetAt（epoch 毫秒）→ 展示可重试时间点（手册 §5/§10.7）
      const resetAt = errorToResetAt(e)
      bindError.value = resetAt
        ? t('minecraft.errRateLimitedUntil', { time: new Date(resetAt).toLocaleString() })
        : t('minecraft.errRateLimited')
    } else {
      // VALIDATION_ERROR（名字格式兜底，前端已预校验）与其他错误
      bindError.value = t('minecraft.errInvalidForm')
    }
  } finally {
    binding.value = false
  }
}

/** 手动取消进行中的绑定：清后端 pending + 本地引导态，回到表单态 */
async function onCancelPending() {
  if (cancelling.value) return
  cancelling.value = true
  try {
    await nexus.cancelMinecraftPending()
  } catch {
    /* 取消失败（网络等）：本地仍退出引导态，过期 pending 由后端自愈清理 */
  } finally {
    cancelling.value = false
  }
  stopPendingWatch()
  exitPending()
}

// ---------- 两步流程：引导态轮询与倒计时 ----------
function startPendingWatch() {
  stopPendingWatch()
  pollExpired.value = false
  pollTimer = setInterval(() => {
    void pollPendingBound()
  }, 3500)
  tickTimer = setInterval(() => {
    remainSeconds.value = Math.max(0, remainSeconds.value - 1)
    if (remainSeconds.value <= 0) onPendingExpired()
  }, 1000)
}

function enterPending(pending: MinecraftBindPending) {
  pendingCode.value = pending.code
  pendingName.value = pending.name
  expiresTotal.value = Math.min(Math.max(0, Math.floor(pending.expiresIn)), 600)
  remainSeconds.value = expiresTotal.value
  // 持久化供其他标签页 / 刷新后恢复引导态
  savePendingBind(pending)
  startPendingWatch()
}

/** 挂载 / 其他标签页提交绑定时：从 localStorage 恢复未过期的引导态 */
function restorePendingFromStorage() {
  const saved = loadPendingBind()
  if (!saved) return
  const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000)
  const remain = saved.expiresIn - elapsed
  // 已过期或该名字已绑定成功 → 清理存储，不恢复
  if (remain <= 0 || accounts.value.some((a) => a.name === saved.name)) {
    clearPendingBind()
    return
  }
  pendingCode.value = saved.code
  pendingName.value = saved.name
  expiresTotal.value = saved.expiresIn
  remainSeconds.value = remain
  startPendingWatch()
  // 立即轮询一次：另一浏览器可能已完成核验，尽快退出引导态（正常轮询周期 3.5s）
  void pollPendingBound()
}

async function pollPendingBound() {
  if (polling) return
  polling = true
  try {
    const list = await nexus.fetchMyMinecraft(true)
    // 核验成功后绑定列表出现 pending 名字对应的账号（uuid 由插件上报，前端未知）
    if (list.some((a) => a.name === pendingName.value)) onPendingResolved()
  } catch {
    /* 单轮轮询失败忽略，等待下一轮 */
  } finally {
    polling = false
  }
}

function onPendingResolved() {
  stopPendingWatch()
  exitPending()
  bindSuccess.value = true
  playerName.value = ''
}

function onPendingExpired() {
  stopPendingWatch()
  clearPendingBind()
  pollExpired.value = true
}

/** 「重新提交」：回到普通表单态（pending 已过期，重新发起不受单 pending 限制） */
function onPendingResubmit() {
  stopPendingWatch()
  exitPending()
}

function exitPending() {
  clearPendingBind()
  pendingCode.value = ''
  pendingName.value = ''
  expiresTotal.value = 0
  remainSeconds.value = 0
  pollExpired.value = false
}

function stopPendingWatch() {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (tickTimer !== null) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

onUnmounted(() => {
  stopPendingWatch()
  window.removeEventListener('storage', onStorageSync)
})

// ---------- 解绑 ----------
const unbindingId = ref('')

// ---------- 解绑两步弹窗（后果说明 → 确认执行），替代原生 confirm ----------
const unbindTarget = ref<MinecraftAccount | null>(null)
const unbindStep = ref(1)
const unbindDialogError = ref('')

function openUnbindDialog(acc: MinecraftAccount) {
  unbindTarget.value = acc
  unbindStep.value = 1
  unbindDialogError.value = ''
}

function closeUnbindDialog() {
  unbindTarget.value = null
  unbindStep.value = 1
  unbindDialogError.value = ''
}

async function confirmUnbind() {
  const target = unbindTarget.value
  if (!target || unbindingId.value) return
  listError.value = ''
  unbindDialogError.value = ''
  unbindingId.value = target.id
  try {
    await nexus.unbindMinecraft(target.id)
    if (selectedId.value === target.id) selectedId.value = ''
    closeUnbindDialog()
  } catch {
    unbindDialogError.value = t('minecraft.unbindFailed')
  } finally {
    unbindingId.value = ''
  }
}

// ---------- 关联 ----------
const selectedId = ref('')
const linksLoading = ref(false)
const removingLinkId = ref('')
const creatingLink = ref(false)
const linkMainId = ref('')
const linkAltId = ref('')
const linkError = ref('')
const linkSuccess = ref(false)

const selectedAccount = computed(() => accounts.value.find((a) => a.id === selectedId.value) ?? null)
const selectedLinks = computed(() => nexus.linksByAccount[selectedId.value] ?? [])

async function selectAccount(id: string) {
  if (selectedId.value === id) return
  selectedId.value = id
  linkError.value = ''
  linkSuccess.value = false
  linksLoading.value = true
  try {
    await nexus.fetchLinksForAccount(id)
  } catch {
    /* 关联加载失败：显示空态即可 */
  } finally {
    linksLoading.value = false
  }
}

function peerName(link: AccountLink): string {
  const peerId = link.ownerMinecraftAccountId === selectedId.value
    ? link.linkedMinecraftAccountId
    : link.ownerMinecraftAccountId
  return accounts.value.find((a) => a.id === peerId)?.name ?? peerId
}

async function onCreateLink() {
  linkError.value = ''
  linkSuccess.value = false
  if (!linkMainId.value || !linkAltId.value) return
  if (linkMainId.value === linkAltId.value) {
    linkError.value = t('minecraft.sameAccount')
    return
  }
  creatingLink.value = true
  try {
    await nexus.createAccountLink({ ownerId: linkMainId.value, linkedId: linkAltId.value, relation: 'main_alt' })
    linkSuccess.value = true
    await nexus.fetchLinksForAccount(selectedId.value, true)
  } catch (e) {
    const code = isAppError(e) ? e.code : ''
    if (code === 'ACCOUNT_LINK_DUPLICATE') linkError.value = t('minecraft.errLinkDuplicate')
    else if (code === 'ACCOUNT_LINK_RATE_LIMITED') linkError.value = t('minecraft.errLinkRateLimited')
    else if (code === 'RATE_LIMITED') linkError.value = t('admin.common.errRateLimited')
    else linkError.value = t('admin.common.errGeneric')
  } finally {
    creatingLink.value = false
  }
}

async function onRemoveLink(link: AccountLink) {
  if (!window.confirm(t('minecraft.linkRemoveConfirm'))) return
  linkError.value = ''
  removingLinkId.value = link.id
  try {
    await nexus.removeAccountLink(link)
    await nexus.fetchLinksForAccount(selectedId.value, true)
  } catch {
    linkError.value = t('minecraft.linkRemoveFailed')
  } finally {
    removingLinkId.value = ''
  }
}

// ---------- 工具 ----------
function formatDate(ts?: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString()
}

/** storage 事件：其他标签页提交/更新绑定（写入 pending 存储）时恢复引导态 */
function onStorageSync(e: StorageEvent) {
  if (e.key !== PENDING_BIND_KEY || !e.newValue) return
  restorePendingFromStorage()
}

onMounted(async () => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.mc-page > *', {
      autoAlpha: 0,
      y: 20,
      duration: 0.55,
      ease: 'power3.out',
      stagger: 0.08,
      clearProps: 'all',
    })
  })

  // 跨标签页同步：其他标签页提交绑定（写入 pending 存储）时恢复引导态
  window.addEventListener('storage', onStorageSync)

  // 本标签页刷新：从 localStorage 恢复未过期的 pending 引导态（需先加载列表以判断是否已绑定）
  try {
    await nexus.fetchMyMinecraft()
  } catch (e) {
    listError.value = isAppError(e) && e.code === 'NETWORK_ERROR'
      ? t('admin.common.errNetwork')
      : t('admin.common.errGeneric')
  } finally {
    loading.value = false
  }
  // Pending 真相源：服务端查询优先（跨浏览器/跨设备恢复，手册 §5 2026-09-08）；
  // 端点失败（网络/429）时降级 localStorage（仅同浏览器跨标签页恢复）。
  try {
    const pending = await nexus.fetchMinecraftPending()
    if (pending) {
      // 服务端 pending 仍存活 → 恢复引导态（核验成功后端点归空，无需比对 uuid）
      enterPending(pending)
    } else {
      // 服务端无 pending：本地记录必然已作废/已完成，清理不恢复
      clearPendingBind()
    }
  } catch {
    restorePendingFromStorage()
  }
})
</script>

<style scoped>
.mc-page {
  max-width: 34rem;
}

.mc-header {
  margin-bottom: 2rem;
}

.mc-title {
  font-size: clamp(1.5rem, 3.5vw, 1.9rem);
  font-weight: 700;
  letter-spacing: -1px;
  color: var(--text-color);
  margin: 0 0 0.5rem;
}

.mc-subtitle {
  font-size: 0.92rem;
  line-height: 1.65;
  color: var(--text-secondary);
  margin: 0;
}

.mc-section {
  margin-bottom: 2.2rem;
}

.mc-section-title {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 0.8rem;
}

.mc-loading,
.mc-empty-inline {
  font-size: 0.88rem;
  color: var(--text-secondary);
  padding: 0.6rem 0;
}

.mc-empty {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  padding: 1.4rem 1.2rem;
}

.mc-empty-title {
  font-size: 0.92rem;
  color: var(--text-color);
  margin: 0 0 0.3rem;
}

.mc-empty-hint {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
}

/* ---------- 列表 ---------- */
.mc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mc-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  transition: border-color 0.15s ease;
}

.mc-item.selected {
  border-color: color-mix(in srgb, var(--primary-color) 55%, transparent);
}

.mc-item-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  min-width: 0;
}

.mc-skin {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  image-rendering: pixelated;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.mc-item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.mc-item-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc-item-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.76rem;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.mc-badge {
  padding: 0.12rem 0.45rem;
  border-radius: 99px;
  border: 1px solid var(--border-color);
}

.mc-badge.verified {
  color: var(--primary-color);
  border-color: color-mix(in srgb, var(--primary-color) 40%, transparent);
}

.mc-unbind {
  flex-shrink: 0;
  padding: 0.4rem 0.8rem;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--error-color, #e5484d) 35%, transparent);
  border-radius: 6px;
  color: var(--error-color, #e5484d);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.mc-unbind:hover:not(:disabled) {
  background: color-mix(in srgb, var(--error-color, #e5484d) 8%, transparent);
}

.mc-unbind:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- 表单 ---------- */
.mc-form,
.mc-link-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mc-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.mc-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-color);
}

.mc-input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-color);
  font-size: 0.92rem;
  transition: border-color 0.15s ease;
}

.mc-input.mono {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
}

.mc-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.mc-resolve-row {
  display: flex;
  gap: 0.6rem;
}

.mc-resolve {
  flex-shrink: 0;
  padding: 0.6rem 1rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.mc-resolve:hover:not(:disabled) {
  border-color: var(--primary-color);
}

.mc-resolve:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mc-hint {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 0;
}

.mc-hint.warn {
  color: var(--error-color, #e5484d);
}

.mc-submit {
  align-self: flex-start;
  padding: 0.6rem 1.4rem;
  background: var(--primary-color);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: translate 0.15s ease, opacity 0.15s ease;
}

.mc-submit:hover:not(:disabled) {
  translate: 0 -1px;
}

.mc-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mc-error {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}

.mc-success {
  margin: 0;
  font-size: 0.85rem;
  color: var(--primary-color);
}

/* ---------- 两步绑定引导态 ---------- */
.mc-pending {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-bottom: 1.1rem;
  padding: 1rem 1.1rem;
  border-left: 3px solid var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 6%, transparent);
  border-radius: 0 8px 8px 0;
}

.mc-pending-code {
  font-family: ui-monospace, monospace;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.4em;
  line-height: 1.1;
  color: var(--primary-color);
}

.mc-pending-desc {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.6;
  color: var(--text-color);
}

.mc-pending-command {
  align-self: flex-start;
  padding: 0.25rem 0.7rem;
  border-radius: 5px;
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.mc-pending-expires {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.mc-pending-expired {
  margin: 0;
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}

/* ---------- 409 冲突处置指引 ---------- */
.mc-conflict {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mc-conflict p {
  margin: 0;
}

.mc-conflict-title {
  font-weight: 600;
}

.mc-conflict-link {
  align-self: flex-start;
  margin-top: 0.15rem;
  padding: 0.35rem 0.75rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.8rem;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.mc-conflict-link:hover {
  border-color: var(--primary-color);
}

/* ---------- 关联 ---------- */
.mc-links-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: -0.4rem 0 0.9rem;
}

.mc-links {
  list-style: none;
  margin: 0 0 1.2rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.mc-link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.55rem 0.8rem;
}

.mc-link-relation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.mc-role {
  padding: 0.12rem 0.5rem;
  border-radius: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.mc-arrow {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.mc-link-peer {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc-link-remove {
  flex-shrink: 0;
  padding: 0.35rem 0.7rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.78rem;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.mc-link-remove:hover:not(:disabled) {
  color: var(--error-color, #e5484d);
  border-color: color-mix(in srgb, var(--error-color, #e5484d) 35%, transparent);
}

.mc-link-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mc-link-fields {
  display: flex;
  align-items: flex-end;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.mc-field-inline {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
  min-width: 8rem;
}

/* ---------- 解绑两步确认弹窗（风格对齐 DangerZone / LinkedAccounts） ---------- */
.mc-overlay {
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
.mc-dialog {
  width: 100%;
  max-width: 26rem;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}
.mc-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--border-color);
}
.mc-dialog-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-color);
}
.mc-dialog-close {
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
.mc-dialog-close:hover {
  color: var(--text-color);
}
.mc-dialog-close svg {
  width: 16px;
  height: 16px;
}
.mc-dialog-close:focus-visible,
.mc-dialog-btn:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}
.mc-dialog-body {
  padding: 1.25rem 1.1rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.mc-dialog-warning {
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
.mc-dialog-warning svg {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 0.15rem;
  color: #d4a72c;
}
.mc-dialog-effects {
  margin: 0;
  padding: 0 0 0 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
}
.mc-dialog-hint {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-color);
}
.mc-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
.mc-dialog-btn {
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
.mc-dialog-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--text-secondary) 8%, transparent);
}
.mc-dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mc-dialog-btn-primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}
.mc-dialog-btn-danger {
  background: var(--error-color, #e5484d);
  border-color: var(--error-color, #e5484d);
  color: #fff;
}
.mc-dialog-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--error-color, #e5484d) 88%, #000);
}

@media (max-width: 896px) {
  .mc-overlay {
    padding: 6vh 0.9rem 2rem;
  }
  .mc-dialog-actions {
    flex-direction: column-reverse;
  }
  .mc-dialog-actions .mc-dialog-btn {
    width: 100%;
  }
}
</style>
