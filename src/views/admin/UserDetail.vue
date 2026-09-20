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
          <!-- 生日：仅本人与管理端可见；已用掉自助修改机会时标注（管理员仍可改） -->
          <p class="detail-birthday">
            {{ t('admin.userDetail.birthdayLabel') }}：{{ user.birthday || '—' }}
            <span v-if="user.birthday && user.birthdaySelfEdited" class="birthday-locked-tag">
              {{ t('admin.userDetail.birthdaySelfEdited') }}
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

      <!-- 用户名治理：修改用户名 / 发送邮件 / 站内提醒 / 删除账号 -->
      <section class="detail-section">
        <h2 class="section-title">{{ t('admin.userDetail.governanceTitle') }}</h2>
        <div class="gov-actions">
          <button type="button" class="btn" :disabled="changingUsername" @click="openUsernameModal">
            {{ t('admin.userDetail.changeUsernameTitle') }}
          </button>
          <button type="button" class="btn" :disabled="sendingEmail" @click="openEmailModal">
            {{ t('admin.userDetail.emailTitle') }}
          </button>
          <!-- 站内提醒：POST /admin/notifications {target: userId, type: 'warning'}，title/body 预填违规提醒模板可改 -->
          <button type="button" class="btn" :disabled="sendingInAppWarning" @click="openInAppWarningModal">
            {{ t('admin.userDetail.inAppWarning') }}
          </button>
          <!-- 修改生日：PATCH /admin/users/:id/birthday，可改可清空，不消耗用户自改机会 -->
          <button type="button" class="btn" :disabled="savingBirthday" @click="openBirthdayModal">
            {{ t('admin.userDetail.birthdayTitle') }}
          </button>
          <!-- 契约：删除仅 owner 可用（后端对非 owner 403），镜像上方 owner-only 角色判断 -->
          <button
            v-if="authz.hasRole('owner')"
            type="button"
            class="btn danger"
            :disabled="deleting"
            @click="openDeleteModal"
          >
            {{ t('admin.userDetail.deleteAccount') }}
          </button>
        </div>
        <p v-if="usernameSuccess" class="form-success" role="status">{{ t('admin.userDetail.usernameSent') }}</p>
        <p v-if="emailSuccess" class="form-success" role="status">{{ t('admin.userDetail.emailSent') }}</p>
        <p v-if="inAppWarningSuccess" class="form-success" role="status">{{ t('admin.userDetail.inAppWarningSent') }}</p>
        <p v-if="birthdaySuccess" class="form-success" role="status">{{ t('admin.userDetail.birthdaySaved') }}</p>
      </section>
    </template>

    <p v-else class="page-error" role="alert">{{ loadError }}</p>

    <!-- 修改用户名弹窗：前端先拦格式与保留词（后端 USERNAME_RESERVED / USER_ALREADY_EXISTS 兜底），成功后刷新用户数据 -->
    <div v-if="usernameModalOpen" class="modal-scrim" @click.self="closeUsernameModal">
      <div class="modal" role="dialog" aria-modal="true">
        <h2 class="modal-title">{{ t('admin.userDetail.changeUsernameTitle') }}</h2>
        <p class="modal-body">{{ t('admin.userDetail.changeUsernameBody') }}</p>
        <label class="field">
          <span class="label">{{ t('admin.userDetail.newUsernameLabel') }}</span>
          <input
            v-model.trim="newUsername"
            class="input"
            type="text"
            maxlength="32"
            :disabled="changingUsername"
            @input="onUsernameInput"
          />
        </label>
        <p v-if="usernameFieldError" class="form-error" role="alert">{{ usernameFieldError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn ghost" :disabled="changingUsername" @click="closeUsernameModal">
            {{ t('admin.common.cancel') }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="changingUsername || !newUsername || !!usernameFieldError"
            @click="onChangeUsername"
          >
            {{ changingUsername ? t('admin.common.saving') : t('admin.common.confirm') }}
          </button>
        </div>
        <p v-if="usernameError" class="form-error" role="alert">{{ usernameError }}</p>
      </div>
    </div>

    <!-- 修改生日弹窗：admin/owner 可改可清空，**不消耗也不重置**用户那一次自改机会 -->
    <div v-if="birthdayModalOpen" class="modal-scrim" @click.self="closeBirthdayModal">
      <div class="modal" role="dialog" aria-modal="true">
        <h2 class="modal-title">{{ t('admin.userDetail.birthdayTitle') }}</h2>
        <p class="modal-body">{{ t('admin.userDetail.birthdayBody') }}</p>
        <label class="field">
          <span class="label">{{ t('admin.userDetail.birthdayFieldLabel') }}</span>
          <input v-model="birthdayInput" class="input" type="date" :disabled="savingBirthday" />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn ghost" :disabled="savingBirthday" @click="closeBirthdayModal">
            {{ t('admin.common.cancel') }}
          </button>
          <button
            type="button"
            class="btn danger"
            :disabled="savingBirthday || !user?.birthday"
            @click="onClearBirthday"
          >
            {{ t('admin.userDetail.birthdayClear') }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="savingBirthday || !birthdayInput"
            @click="onSaveBirthday"
          >
            {{ savingBirthday ? t('admin.common.saving') : t('admin.common.confirm') }}
          </button>
        </div>
        <p v-if="birthdayError" class="form-error" role="alert">{{ birthdayError }}</p>
      </div>
    </div>

    <!-- 发送邮件弹窗：邮件发至该用户注册邮箱，主题 1-120 字、正文 1-2000 字 -->
    <div v-if="emailModalOpen" class="modal-scrim" @click.self="closeEmailModal">
      <div class="modal" role="dialog" aria-modal="true">
        <h2 class="modal-title">{{ t('admin.userDetail.emailTitle') }}</h2>
        <p class="modal-body">{{ t('admin.userDetail.emailBody') }}</p>
        <label class="field">
          <span class="label">{{ t('admin.userDetail.subjectLabel') }}</span>
          <input
            v-model.trim="emailSubject"
            class="input"
            type="text"
            maxlength="120"
            :disabled="sendingEmail"
          />
        </label>
        <label class="field">
          <span class="label">{{ t('admin.userDetail.bodyLabel') }}</span>
          <textarea
            v-model.trim="emailBody"
            class="input textarea"
            rows="5"
            maxlength="2000"
            :disabled="sendingEmail"
          />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn ghost" :disabled="sendingEmail" @click="closeEmailModal">
            {{ t('admin.common.cancel') }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="sendingEmail || !emailSubject || !emailBody"
            @click="onSendEmail"
          >
            {{ sendingEmail ? t('admin.notificationCompose.sending') : t('admin.notificationCompose.send') }}
          </button>
        </div>
        <p v-if="emailError" class="form-error" role="alert">{{ emailError }}</p>
      </div>
    </div>

    <!-- 站内提醒弹窗：title/body 预填 i18n 违规提醒模板，可编辑；POST /admin/notifications -->
    <div v-if="inAppWarningModalOpen" class="modal-scrim" @click.self="closeInAppWarningModal">
      <div class="modal" role="dialog" aria-modal="true">
        <h2 class="modal-title">{{ t('admin.userDetail.inAppWarningTitle') }}</h2>
        <p class="modal-body">{{ t('admin.userDetail.inAppWarningBody', { name: user?.username }) }}</p>
        <label class="field">
          <span class="label">{{ t('admin.notificationCompose.titleLabel') }}</span>
          <input
            v-model.trim="inAppWarningTitle"
            class="input"
            type="text"
            maxlength="120"
            :disabled="sendingInAppWarning"
          />
        </label>
        <label class="field">
          <span class="label">{{ t('admin.notificationCompose.bodyLabel') }}</span>
          <textarea
            v-model.trim="inAppWarningBody"
            class="input textarea"
            rows="4"
            maxlength="2000"
            :disabled="sendingInAppWarning"
          />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn ghost" :disabled="sendingInAppWarning" @click="closeInAppWarningModal">
            {{ t('admin.common.cancel') }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="sendingInAppWarning || !inAppWarningTitle || inAppWarningTitle.length > 120"
            @click="onSendInAppWarning"
          >
            {{ sendingInAppWarning ? t('admin.notificationCompose.sending') : t('admin.notificationCompose.send') }}
          </button>
        </div>
        <p v-if="inAppWarningError" class="form-error" role="alert">{{ inAppWarningError }}</p>
      </div>
    </div>

    <!-- 删除账号两步弹窗：处置原因（必填 1-2000 字）→ 强二次确认；成功后跳回用户列表 -->
    <div v-if="deleteModalOpen" class="modal-scrim" @click.self="closeDeleteModal">
      <div class="modal" role="dialog" aria-modal="true">
        <h2 class="modal-title">{{ t('admin.userDetail.deleteConfirmTitle') }}</h2>

        <!-- Step 1：不可逆说明 + 处置原因 -->
        <div v-if="deleteStep === 1">
          <p class="modal-body">{{ t('admin.userDetail.deleteConfirmBody', { name: user?.username }) }}</p>
          <label class="field">
            <span class="label">{{ t('admin.userDetail.deleteReasonLabel') }}</span>
            <textarea
              v-model.trim="deleteReason"
              class="input textarea"
              rows="3"
              maxlength="2000"
              :disabled="deleting"
            />
          </label>
          <div class="modal-actions">
            <button type="button" class="btn ghost" :disabled="deleting" @click="closeDeleteModal">
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="btn danger"
              :disabled="deleting || !deleteReason"
              @click="deleteStep = 2"
            >
              {{ t('admin.common.confirm') }}
            </button>
          </div>
        </div>

        <!-- Step 2：强二次确认 -->
        <div v-else>
          <p class="modal-body">{{ t('admin.userDetail.deleteConfirmBody', { name: user?.username }) }}</p>
          <p v-if="deleteError" class="form-error" role="alert">{{ deleteError }}</p>
          <div class="modal-actions">
            <button type="button" class="btn ghost" :disabled="deleting" @click="deleteStep = 1">
              {{ t('admin.common.cancel') }}
            </button>
            <button type="button" class="btn danger" :disabled="deleting" @click="onDeleteAccount">
              {{ deleting ? t('admin.common.saving') : t('admin.userDetail.deleteAccount') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import UserAvatar from '@/components/UserAvatar.vue'
import { api, isAppError } from '@/lib/api'
import { normalizeBirthday, toDateInputValue } from '@/lib/birthday'
import { checkUsernameReserved } from '@/lib/reserved-username'
import { cleanUsernameInput, validateUsername as checkUsernameFormat } from '@/lib/username'
import { mcAvatarUrl } from '@/lib/minecraft'
import { useAuthorizationStore } from '@/stores/authorization'
import { useNexusStore } from '@/stores/nexus'
import { useNotificationsStore } from '@/stores/notifications'
import type { AdminUserDetail, BanType, MinecraftAccount, NexusRoleName } from '@/types/nexus'
import { useGsap } from '@/composables/useGsap'

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const authz = useAuthorizationStore()
const nexus = useNexusStore()
const notifications = useNotificationsStore()
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
      USERNAME_RESERVED: 'admin.userDetail.errUsernameReserved',
      USER_ALREADY_EXISTS: 'admin.userDetail.errUsernameTaken',
      USER_NOT_FOUND: 'admin.userDetail.errNotFound',
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

// ---------- 用户名治理：修改用户名 / 发送邮件 / 删除账号 ----------
// 可见性：本页已由路由守卫要求 admin:access，动作不再重复角色判断（后端 403 兜底）；
// 删除按契约仅 owner 可用，见模板中的 owner-only 判断。
const DELETE_REASON_MAX = 2000

// ---------- 修改用户名（PATCH /admin/users/:id/username，规则见 @/lib/username） ----------

const usernameModalOpen = ref(false)
const changingUsername = ref(false)
const usernameSuccess = ref(false)
const newUsername = ref('')
const usernameError = ref('')
const usernameFieldError = ref('')

function openUsernameModal() {
  usernameSuccess.value = false
  usernameError.value = ''
  usernameFieldError.value = ''
  newUsername.value = ''
  usernameModalOpen.value = true
}

function closeUsernameModal() {
  if (changingUsername.value) return
  usernameModalOpen.value = false
  usernameError.value = ''
}

// 前端先拦格式与保留词（形近变体由 checkUsernameReserved 归一化拦截）；后端仍做最终校验
function validateUsername(): boolean {
  const name = newUsername.value
  if (!checkUsernameFormat(name).ok) {
    usernameFieldError.value = t('admin.userDetail.errUsernameFormat')
    return false
  }
  if (checkUsernameReserved(name)) {
    usernameFieldError.value = t('admin.userDetail.errUsernameReserved')
    return false
  }
  usernameFieldError.value = ''
  return true
}

function onUsernameInput() {
  // 粘贴残留防御：清走零宽/双向控制字符（复制自用户 ID、聊天记录等场景的残留）后回写。
  // 清洗规则统一来自 @/lib/username，避免这里再养一套私有正则
  const cleaned = cleanUsernameInput(newUsername.value)
  if (cleaned !== newUsername.value) newUsername.value = cleaned
  // 空输入清提示，非空即时校验（保留词/非法格式即时反馈）
  if (!newUsername.value) {
    usernameFieldError.value = ''
    return
  }
  validateUsername()
}

async function onChangeUsername() {
  if (!user.value) return
  // 提交前再清洗一次（零宽/双向控制字符 + 首尾空白 + 宽度折叠/NFC）
  newUsername.value = cleanUsernameInput(newUsername.value)
  if (!validateUsername()) return
  usernameError.value = ''
  changingUsername.value = true
  try {
    await api.patch<{ ok: boolean; username: string }>(`/admin/users/${user.value.id}/username`, {
      username: newUsername.value,
    })
    // 成功后刷新用户数据，页面标题/头像等同步更新
    await refreshUser()
    usernameSuccess.value = true
    usernameModalOpen.value = false
  } catch (e) {
    usernameError.value = errorText(e)
  } finally {
    changingUsername.value = false
  }
}

// ---------- 修改生日（PATCH /admin/users/:id/birthday，规则见 @/lib/birthday） ----------
const birthdayModalOpen = ref(false)
const savingBirthday = ref(false)
const birthdaySuccess = ref(false)
const birthdayInput = ref('')
const birthdayError = ref('')

function openBirthdayModal() {
  birthdaySuccess.value = false
  birthdayError.value = ''
  birthdayInput.value = toDateInputValue(user.value?.birthday)
  birthdayModalOpen.value = true
}

function closeBirthdayModal() {
  birthdayModalOpen.value = false
  birthdayError.value = ''
}

/** 提交生日：`null` = 清空；非法格式前端先拦（站点时区上界仍由后端判） */
async function submitBirthday(birthday: string | null) {
  if (!user.value) return
  birthdayError.value = ''
  savingBirthday.value = true
  try {
    await nexus.adminChangeBirthday(user.value.id, birthday)
    birthdaySuccess.value = true
    birthdayModalOpen.value = false
    await refreshUser()
  } catch (e) {
    birthdayError.value = errorText(e)
  } finally {
    savingBirthday.value = false
  }
}

async function onSaveBirthday() {
  const normalized = normalizeBirthday(birthdayInput.value)
  if (!normalized) {
    birthdayError.value = t('admin.userDetail.errBirthdayFormat')
    return
  }
  await submitBirthday(normalized)
}

async function onClearBirthday() {
  await submitBirthday(null)
}

// ---------- 发送邮件（POST /admin/users/:id/email，主题 1-120 字、正文 1-2000 字） ----------
const EMAIL_SUBJECT_MAX = 120
const EMAIL_BODY_MAX = 2000

const emailModalOpen = ref(false)
const sendingEmail = ref(false)
const emailSuccess = ref(false)
const emailSubject = ref('')
const emailBody = ref('')
const emailError = ref('')

function openEmailModal() {
  emailSuccess.value = false
  emailError.value = ''
  emailSubject.value = ''
  emailBody.value = ''
  emailModalOpen.value = true
}

function closeEmailModal() {
  if (sendingEmail.value) return
  emailModalOpen.value = false
  emailError.value = ''
}

async function onSendEmail() {
  if (!user.value) return
  const subject = emailSubject.value
  const body = emailBody.value
  // 必填 1-120 / 1-2000：maxlength 拦超长、按钮 disabled 拦空，此处兜底
  if (!subject || subject.length > EMAIL_SUBJECT_MAX || !body || body.length > EMAIL_BODY_MAX) return
  emailError.value = ''
  sendingEmail.value = true
  try {
    await api.post<{ ok: boolean }>(`/admin/users/${user.value.id}/email`, { subject, body })
    emailSuccess.value = true
    emailModalOpen.value = false
  } catch (e) {
    emailError.value = errorText(e)
  } finally {
    sendingEmail.value = false
  }
}

// ---------- 站内提醒（POST /admin/notifications，type: warning） ----------
// title/body 预填 i18n 违规提醒模板，可编辑；交互 mirror 上方发送邮件弹窗。
const inAppWarningModalOpen = ref(false)
const sendingInAppWarning = ref(false)
const inAppWarningSuccess = ref(false)
const inAppWarningError = ref('')
const inAppWarningTitle = ref('')
const inAppWarningBody = ref('')

function openInAppWarningModal() {
  inAppWarningSuccess.value = false
  inAppWarningError.value = ''
  inAppWarningTitle.value = t('admin.userDetail.inAppWarningTitlePreset')
  inAppWarningBody.value = t('admin.userDetail.inAppWarningBodyPreset')
  inAppWarningModalOpen.value = true
}

function closeInAppWarningModal() {
  if (sendingInAppWarning.value) return
  inAppWarningModalOpen.value = false
  inAppWarningError.value = ''
}

async function onSendInAppWarning() {
  if (!user.value) return
  const titleText = inAppWarningTitle.value
  if (!titleText || titleText.length > 120) return
  inAppWarningError.value = ''
  sendingInAppWarning.value = true
  try {
    await notifications.adminSend({
      target: user.value.id,
      type: 'warning',
      title: titleText,
      ...(inAppWarningBody.value ? { body: inAppWarningBody.value } : {}),
    })
    inAppWarningSuccess.value = true
    inAppWarningModalOpen.value = false
  } catch (e) {
    inAppWarningError.value = errorText(e)
  } finally {
    sendingInAppWarning.value = false
  }
}

const deleteModalOpen = ref(false)
const deleteStep = ref(1)
const deleteReason = ref('')
const deleting = ref(false)
const deleteError = ref('')

function openDeleteModal() {
  deleteStep.value = 1
  deleteReason.value = ''
  deleteError.value = ''
  deleteModalOpen.value = true
}

function closeDeleteModal() {
  if (deleting.value) return
  deleteModalOpen.value = false
  deleteError.value = ''
}

async function onDeleteAccount() {
  if (!user.value) return
  const reason = deleteReason.value
  // 必填 1-2000 字：textarea maxlength 拦超长、按钮 disabled 拦空，此处兜底
  if (!reason || reason.length > DELETE_REASON_MAX) return
  deleteError.value = ''
  deleting.value = true
  try {
    await api.delete<unknown>(`/admin/users/${user.value.id}`, { data: { reason } })
    // 成功后跳回用户列表（mirror 返回链接目标）
    await router.push('/admin/users')
  } catch (e) {
    deleteError.value = errorText(e)
  } finally {
    deleting.value = false
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

/* 生日行：纯日期展示 + 自改机会已用标记（管理员仍可改） */
.detail-birthday {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0.35rem 0 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.birthday-locked-tag {
  padding: 0.1rem 0.45rem;
  border-radius: 99px;
  border: 1px solid var(--border-color);
  font-size: 0.7rem;
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

.btn.ghost {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

/* ---------- 用户名治理 ---------- */
.gov-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-bottom: 0.9rem;
}

/* 弹层（UserDetail 未 @import admin-shared.css，此处按其样式内联 mirror） */
.modal-scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.2rem;
  background: rgb(0 0 0 / 0.5);
}

.modal {
  width: min(30rem, 100%);
  max-height: 86dvh;
  overflow-y: auto;
  padding: 1.4rem 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--background-color);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.3);
}

.modal-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 1.1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-body {
  font-size: 0.9rem;
  line-height: 1.65;
  color: var(--text-secondary);
  margin: 0 0 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1.2rem;
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
