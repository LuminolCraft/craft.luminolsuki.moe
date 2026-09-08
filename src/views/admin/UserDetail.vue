<template>
  <div class="detail-page">
    <RouterLink to="/admin/users" class="back-link">{{ t('admin.users.backToList') }}</RouterLink>

    <div v-if="loading" class="page-loading">{{ t('admin.common.loading') }}</div>

    <template v-else-if="user">
      <header class="detail-head">
        <UserAvatar :user-id="user.id" :name="user.username" :size="56" />
        <div class="detail-head-info">
          <h1 class="detail-title">{{ user.username }}</h1>
          <p class="detail-email">
            {{ user.email || '—' }}
            <span v-if="user.emailVerified != null" class="email-badge" :class="{ verified: user.emailVerified }">
              {{ user.emailVerified ? t('settings.profile.emailVerified') : t('settings.profile.emailUnverified') }}
            </span>
          </p>
        </div>
      </header>

      <!-- 角色管理（内嵌，无独立角色页：后端无角色 CRUD，只有分配/撤销） -->
      <section class="detail-section">
        <h2 class="section-title">{{ t('admin.users.roleSectionTitle') }}</h2>
        <div class="role-row">
          <span v-for="r in user.roles ?? []" :key="r" class="role-badge">
            {{ r }}
            <button
              type="button"
              class="role-revoke"
              :disabled="revokingRole === r"
              @click="onRevokeRole(r)"
            >
              {{ revokingRole === r ? t('admin.users.roleRevoking') : t('admin.users.roleRevoke') }}
            </button>
          </span>
          <span v-if="!user.roles?.length" class="dim">—</span>
        </div>
        <form class="role-assign" @submit.prevent="onAssignRole">
          <select v-model="selectedRole" class="input select" :disabled="assigning">
            <option v-for="r in assignableRoles" :key="r" :value="r">{{ r }}</option>
          </select>
          <button type="submit" class="btn" :disabled="assigning || !selectedRole">
            {{ assigning ? t('admin.users.roleAssigning') : t('admin.users.roleAssign') }}
          </button>
        </form>
        <p v-if="roleError" class="form-error" role="alert">{{ roleError }}</p>
      </section>

      <!-- MC 账号 -->
      <section class="detail-section">
        <h2 class="section-title">{{ t('admin.users.mcAccountsTitle') }}</h2>
        <p v-if="!user.minecraftAccounts?.length" class="dim">{{ t('admin.users.mcAccountsEmpty') }}</p>
        <ul v-else class="mc-mini-list">
          <li v-for="acc in user.minecraftAccounts" :key="acc.id" class="mc-mini">
            <img
              class="mc-mini-skin"
              :src="mcAvatarUrl(acc, 32)"
              :alt="acc.name"
              loading="lazy"
              width="32"
              height="32"
            />
            <span class="mc-mini-name">{{ acc.name }}</span>
            <span class="mc-mini-uuid">{{ acc.uuid }}</span>
            <button
              type="button"
              class="mc-mini-unbind"
              :disabled="forceUnbindingId === acc.id"
              @click="onForceUnbind(acc)"
            >
              {{ t('admin.userDetail.forceUnbind') }}
            </button>
          </li>
        </ul>
        <p v-if="mcUnbindError" class="form-error" role="alert">{{ mcUnbindError }}</p>
      </section>

      <!-- 创建封禁（仅从用户详情发起） -->
      <section class="detail-section">
        <h2 class="section-title">{{ t('admin.users.banSectionTitle') }}</h2>
        <p v-if="!user.minecraftAccounts?.length" class="dim">{{ t('admin.users.mcAccountsEmpty') }}</p>
        <form v-else class="ban-form" @submit.prevent="onCreateBan">
          <label class="field">
            <span class="label">{{ t('admin.users.banTarget') }}</span>
            <select v-model="banAccountId" class="input" :disabled="creatingBan">
              <option v-for="acc in user.minecraftAccounts" :key="acc.id" :value="acc.id">
                {{ acc.name }} ({{ acc.uuid }})
              </option>
            </select>
          </label>

          <label class="field">
            <span class="label">{{ t('admin.users.banType') }}</span>
            <select v-model="banType" class="input" :disabled="creatingBan">
              <option value="minecraft">Minecraft</option>
              <option value="website">Website</option>
              <option value="chat">Chat</option>
            </select>
          </label>

          <label class="field">
            <span class="label">{{ t('admin.users.banReason') }}</span>
            <textarea
              v-model.trim="banReason"
              class="input textarea"
              rows="3"
              :placeholder="t('admin.users.banReasonPlaceholder')"
              :disabled="creatingBan"
            />
          </label>

          <label class="field">
            <span class="label">{{ t('admin.users.banExpires') }}</span>
            <input v-model="banExpiresLocal" class="input" type="datetime-local" :disabled="creatingBan" />
            <span class="hint">{{ t('admin.users.banExpiresHint') }}</span>
          </label>

          <button type="submit" class="btn danger" :disabled="creatingBan || !banReason">
            {{ creatingBan ? t('admin.users.banSubmitting') : t('admin.users.banSubmit') }}
          </button>
          <p v-if="banSuccess" class="form-success" role="status">{{ t('admin.users.banCreated') }}</p>
          <p v-if="banError" class="form-error" role="alert">{{ banError }}</p>
        </form>
      </section>
    </template>

    <p v-else class="page-error" role="alert">{{ loadError }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import UserAvatar from '@/components/UserAvatar.vue'
import { api, isAppError } from '@/lib/api'
import { mcAvatarUrl } from '@/lib/minecraft'
import { useAuthorizationStore } from '@/stores/authorization'
import { useNexusStore } from '@/stores/nexus'
import type { AdminUserDetail, BanType, MinecraftAccount, NexusRoleName } from '@/types/nexus'
import { useGsap } from '@/composables/useGsap'

const { t, te } = useI18n()
const route = useRoute()
const authz = useAuthorizationStore()
const nexus = useNexusStore()
const { create, reduceMotion } = useGsap()

const loading = ref(true)
const loadError = ref('')
const user = ref<AdminUserDetail | null>(null)

// ---------- 角色管理 ----------
const ALL_ROLES: NexusRoleName[] = ['user', 'moderator', 'admin', 'owner']
const selectedRole = ref<NexusRoleName>('moderator')
const assigning = ref(false)
const revokingRole = ref('')
const roleError = ref('')

/** owner 仅 owner 可授予（后端裁决，前端隐藏选项 + 403 兜底） */
const assignableRoles = computed(() =>
  ALL_ROLES.filter((r) => r !== 'owner' || authz.hasRole('owner')),
)

function errorText(e: unknown): string {
  if (isAppError(e)) {
    const map: Record<string, string> = {
      FORBIDDEN: 'admin.common.errForbidden',
      PERMISSION_DENIED: 'admin.common.errForbidden',
      NETWORK_ERROR: 'admin.common.errNetwork',
      RATE_LIMITED: 'admin.common.errRateLimited',
      VALIDATION_ERROR: 'admin.common.errValidation',
      BAN_ALREADY_REVOKED: 'admin.bans.errAlreadyRevoked',
      BAN_NOT_FOUND: 'admin.bans.errNotFound',
    }
    const key = map[e.code]
    if (key && te(key)) return t(key)
    if (e.code === 'FORBIDDEN') return t('admin.users.errRoleOwnerOnly')
  }
  return t('admin.common.errGeneric')
}

async function refreshUser() {
  const id = String(route.params.id)
  user.value = await api.get<AdminUserDetail>(`/admin/users/${id}`)
}

async function onAssignRole() {
  if (!user.value) return
  roleError.value = ''
  assigning.value = true
  try {
    await api.post<unknown>(`/admin/users/${user.value.id}/roles`, { role: selectedRole.value })
    await refreshUser()
  } catch (e) {
    roleError.value = errorText(e)
  } finally {
    assigning.value = false
  }
}

async function onRevokeRole(role: string) {
  if (!user.value) return
  if (!window.confirm(t('admin.users.roleRevokeConfirm', { role }))) return
  roleError.value = ''
  revokingRole.value = role
  try {
    await api.delete<unknown>(`/admin/users/${user.value.id}/roles`, { data: { role } })
    await refreshUser()
  } catch (e) {
    roleError.value = errorText(e)
  } finally {
    revokingRole.value = ''
  }
}

// ---------- 强制解绑 MC 绑定 ----------
const forceUnbindingId = ref('')
const mcUnbindError = ref('')

async function onForceUnbind(acc: MinecraftAccount) {
  if (!user.value) return
  if (!window.confirm(t('admin.userDetail.forceUnbindConfirm', { name: acc.name }))) return
  mcUnbindError.value = ''
  forceUnbindingId.value = acc.id
  try {
    await nexus.adminForceUnbindMinecraft(user.value.id, acc.id)
    await refreshUser()
  } catch (e) {
    const code = isAppError(e) ? e.code : ''
    if (code === 'USER_NOT_FOUND' || code === 'MINECRAFT_ACCOUNT_NOT_FOUND' || code === 'NOT_FOUND') {
      mcUnbindError.value = t('admin.userDetail.forceUnbindNotFound')
    } else if (code === 'FORBIDDEN') {
      mcUnbindError.value = te('admin.common.errForbidden')
        ? t('admin.common.errForbidden')
        : t('admin.common.errGeneric')
    } else if (code === 'RATE_LIMITED') {
      mcUnbindError.value = t('admin.common.errRateLimited')
    } else {
      mcUnbindError.value = t('admin.common.errGeneric')
    }
  } finally {
    forceUnbindingId.value = ''
  }
}

// ---------- 创建封禁 ----------
const banAccountId = ref('')
const banType = ref<BanType>('minecraft')
const banReason = ref('')
const banExpiresLocal = ref('')
const creatingBan = ref(false)
const banSuccess = ref(false)
const banError = ref('')

async function onCreateBan() {
  if (!user.value) return
  banError.value = ''
  banSuccess.value = false
  const expiresMs = banExpiresLocal.value ? new Date(banExpiresLocal.value).getTime() : undefined
  creatingBan.value = true
  try {
    await api.post<unknown>('/admin/bans', {
      minecraftAccountId: banAccountId.value,
      type: banType.value,
      reason: banReason.value,
      ...(expiresMs != null && Number.isFinite(expiresMs) ? { expiresAt: expiresMs } : {}),
    })
    banSuccess.value = true
    banReason.value = ''
    banExpiresLocal.value = ''
  } catch (e) {
    banError.value = errorText(e)
  } finally {
    creatingBan.value = false
  }
}

onMounted(async () => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.detail-page > *', { autoAlpha: 0, y: 16, duration: 0.5, ease: 'power3.out', stagger: 0.06, clearProps: 'all' })
  })
  try {
    await refreshUser()
    const firstAccount = user.value?.minecraftAccounts?.[0]
    if (firstAccount) {
      banAccountId.value = firstAccount.id
    }
  } catch (e) {
    loadError.value = errorText(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 1.4rem;
  font-size: 0.85rem;
  color: var(--link-color);
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.page-loading {
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: 1.2rem 0;
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.8rem;
}

.detail-title {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.6px;
  color: var(--text-color);
  margin: 0 0 0.25rem;
}

.detail-email {
  font-size: 0.86rem;
  color: var(--text-secondary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.email-badge {
  padding: 0.1rem 0.45rem;
  border-radius: 99px;
  border: 1px solid var(--border-color);
  font-size: 0.7rem;
}

.email-badge.verified {
  color: var(--primary-color);
  border-color: color-mix(in srgb, var(--primary-color) 40%, transparent);
}

.detail-section {
  margin-bottom: 2rem;
  padding-top: 1.4rem;
  border-top: 1px solid var(--border-color);
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 0.9rem;
}

.role-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.4rem 0.2rem 0.7rem;
  border-radius: 99px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.role-revoke {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  padding: 0.1rem 0.45rem;
  border-radius: 99px;
}

.role-revoke:hover:not(:disabled) {
  background: color-mix(in srgb, var(--error-color, #e5484d) 15%, transparent);
  color: var(--error-color, #e5484d);
}

.role-revoke:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.role-assign {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.input {
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-color);
  font-size: 0.88rem;
}

.input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.select {
  min-width: 10rem;
}

.textarea {
  resize: vertical;
  font-family: inherit;
}

.btn {
  padding: 0.55rem 1.2rem;
  background: var(--primary-color);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.86rem;
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

.btn.danger {
  background: var(--error-color, #e5484d);
}

.dim {
  font-size: 0.86rem;
  color: var(--text-secondary);
}

.mc-mini-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.mc-mini {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem 0.8rem;
}

.mc-mini-skin {
  width: 32px;
  height: 32px;
  border-radius: 5px;
  image-rendering: pixelated;
}

.mc-mini-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-color);
}

.mc-mini-uuid {
  font-size: 0.74rem;
  color: var(--text-secondary);
  font-family: ui-monospace, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc-mini-unbind {
  flex-shrink: 0;
  margin-left: auto;
  padding: 0.3rem 0.65rem;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--error-color, #e5484d) 35%, transparent);
  border-radius: 6px;
  color: var(--error-color, #e5484d);
  font-size: 0.78rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.mc-mini-unbind:hover:not(:disabled) {
  background: color-mix(in srgb, var(--error-color, #e5484d) 8%, transparent);
}

.mc-mini-unbind:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ban-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 30rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-color);
}

.hint {
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.form-error {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}

.form-success {
  margin: 0;
  font-size: 0.85rem;
  color: var(--primary-color);
}

.page-error {
  margin-top: 1rem;
  padding: 0.75rem 0.9rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}
</style>
