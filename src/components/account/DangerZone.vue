<template>
  <!-- 危险区：账号注销（不可逆自服务，GitHub 式多步确认） -->
  <section class="danger-zone">
    <h2 class="security-section-title">{{ t('auth.security.danger.sectionTitle') }}</h2>
    <div class="dz-card">
      <p class="dz-desc">{{ t('auth.security.danger.sectionDesc') }}</p>
      <button type="button" class="dz-open" @click="openDialog">
        {{ t('auth.security.danger.deleteTitle') }}
      </button>
    </div>

    <Teleport to="body">
      <div v-if="show" class="dz-overlay" @click.self="closeDialog">
        <div class="dz-dialog" role="dialog" aria-modal="true" :aria-label="t('auth.security.danger.deleteTitle')">
          <!-- 头部 -->
          <div class="dz-header">
            <span class="dz-header-title">{{ t('auth.security.danger.dialogTitle', { name: username }) }}</span>
            <button type="button" class="dz-close" :aria-label="t('auth.security.danger.close')" @click="closeDialog">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>

          <!-- Step 1（OAuth 账号）：账号标识 + 我要注销 -->
          <div v-if="step === 1 && !hasCredential" class="dz-body dz-center">
            <svg class="dz-lock" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm8.25 3.5h-8.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25ZM10.5 6V4a2.5 2.5 0 1 0-5 0v2Z" />
            </svg>
            <p class="dz-account">{{ username }}</p>
            <p class="dz-account-meta">{{ auth.me?.email }}</p>
            <button type="button" class="dz-btn dz-btn-block" @click="step = 2">
              {{ t('auth.security.danger.wantToDelete') }}
            </button>
          </div>

          <!-- 后果展示（密码账号 Step 1 / OAuth 账号 Step 2）。
               注意条件必须按账号类型区分：密码账号 step=2 是"输入用户名"页，
               若写成 step===1||step===2 会让密码账号点击"我已阅读"后停在当前页（死循环） -->
          <div v-else-if="hasCredential ? step === 1 : step === 2" class="dz-body">
            <p class="dz-account">{{ username }}</p>
            <p class="dz-account-meta">{{ auth.me?.email }}</p>

            <div class="dz-warning" role="alert">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
              </svg>
              <span>{{ t('auth.security.danger.warningTitle') }}</span>
            </div>

            <ul class="dz-effects">
              <li>{{ t('auth.security.danger.effect1') }}</li>
              <li>{{ t('auth.security.danger.effect2') }}</li>
              <li>{{ t('auth.security.danger.effect3') }}</li>
            </ul>

            <button type="button" class="dz-btn dz-btn-block" @click="step = hasCredential ? 2 : 3">
              {{ t('auth.security.danger.readAndUnderstand') }}
            </button>
          </div>

          <!-- Step 2（密码账号）：输入用户名 -->
          <div v-else-if="step === 2 && hasCredential" class="dz-body">
            <p class="dz-confirm-hint">
              {{ t('auth.security.danger.confirmUsernameHint', { name: username }) }}
            </p>
            <input
              v-model.trim="confirmUsername"
              class="dz-input"
              type="text"
              :placeholder="username"
              autocomplete="off"
              spellcheck="false"
            />
            <button
              type="button"
              class="dz-btn dz-btn-block"
              :disabled="!usernameMatches"
              @click="step = 3"
            >
              {{ t('auth.security.danger.continueLabel') }}
            </button>
          </div>

          <!-- 最后一步：密码账号输密码 → { password }；OAuth 账号输用户名 → { confirm: true } -->
          <div v-else class="dz-body">
            <template v-if="hasCredential">
              <p class="dz-confirm-hint">{{ t('auth.security.danger.passwordHint') }}</p>
              <input
                v-model="confirmPassword"
                class="dz-input"
                type="password"
                autocomplete="current-password"
                :placeholder="t('auth.security.danger.passwordPlaceholder')"
              />
            </template>
            <template v-else>
              <p class="dz-confirm-hint">
                {{ t('auth.security.danger.confirmUsernameHint', { name: username }) }}
              </p>
              <input
                v-model.trim="confirmUsername"
                class="dz-input"
                type="text"
                :placeholder="username"
                autocomplete="off"
                spellcheck="false"
              />
            </template>

            <p v-if="deleteError" class="dz-error" role="alert">{{ deleteError }}</p>

            <button
              type="button"
              class="dz-btn dz-btn-danger dz-btn-block"
              :disabled="!canDelete || deleting"
              @click="onDelete"
            >
              {{ deleting ? t('auth.security.danger.deleting') : t('auth.security.danger.deleteButton') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { isAppError } from '@/lib/api'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const hasCredential = computed(() =>
  auth.linkedAccounts.some((a) => a.providerId === 'credential'),
)
const username = computed(() => auth.me?.username ?? '')

const show = ref(false)
const step = ref(1)
const confirmUsername = ref('')
const confirmPassword = ref('')
const deleting = ref(false)
const deleteError = ref('')

const usernameMatches = computed(
  () => confirmUsername.value.toLowerCase() === username.value.toLowerCase(),
)
const canDelete = computed(() =>
  hasCredential.value
    ? usernameMatches.value && confirmPassword.value.length > 0
    : usernameMatches.value,
)

function openDialog() {
  // 每次打开重置流程：密码账号从后果展示进入，纯 OAuth 账号从"我要注销"进入
  step.value = 1
  confirmUsername.value = ''
  confirmPassword.value = ''
  deleteError.value = ''
  show.value = true
}

function closeDialog() {
  show.value = false
  step.value = 1
  confirmUsername.value = ''
  confirmPassword.value = ''
  deleteError.value = ''
}

async function onDelete() {
  if (!canDelete.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await auth.deleteMyAccount(
      hasCredential.value ? { password: confirmPassword.value } : { confirm: true },
    )
    // store 内已清登录态并广播其他标签页；跳首页
    void router.replace('/')
  } catch (e) {
    deleteError.value = isAppError(e) && e.code === 'AUTH_INVALID_CREDENTIALS'
      ? t('auth.security.danger.invalidPassword')
      : t('auth.security.danger.deleteFailed')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.danger-zone {
  margin-top: 2.2rem;
}
.dz-card {
  border: 1px solid color-mix(in srgb, var(--error-color, #e5484d) 35%, transparent);
  border-radius: 8px;
  padding: 1rem 1.1rem;
}
.dz-desc {
  margin: 0 0 0.8rem;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
}
.dz-open {
  padding: 0.5rem 0.9rem;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--error-color, #e5484d) 45%, transparent);
  border-radius: 6px;
  color: var(--error-color, #e5484d);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.dz-open:hover {
  background: color-mix(in srgb, var(--error-color, #e5484d) 8%, transparent);
}
.dz-open:focus-visible,
.dz-close:focus-visible,
.dz-btn:focus-visible,
.dz-input:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

/* ---------- 弹窗 ---------- */
.dz-overlay {
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
.dz-dialog {
  width: 100%;
  max-width: 28rem;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}
.dz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--border-color);
}
.dz-header-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dz-close {
  flex-shrink: 0;
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
.dz-close:hover {
  color: var(--text-color);
}
.dz-close svg {
  width: 16px;
  height: 16px;
}

.dz-body {
  padding: 1.25rem 1.1rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.dz-center {
  align-items: center;
  text-align: center;
}
.dz-lock {
  width: 28px;
  height: 28px;
  color: var(--text-secondary);
  margin-top: 0.3rem;
}
.dz-account {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-color);
  overflow-wrap: anywhere;
}
.dz-account-meta {
  margin: -0.5rem 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.dz-center .dz-account-meta {
  margin-top: -0.35rem;
}
.dz-warning {
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
.dz-warning svg {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 0.15rem;
  color: #d4a72c;
}
.dz-effects {
  margin: 0;
  padding: 0 0 0 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
}
.dz-confirm-hint {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-color);
  overflow-wrap: anywhere;
}
.dz-input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.92rem;
  font-family: inherit;
  transition: border-color 0.15s ease;
}
.dz-input:focus {
  outline: none;
  border-color: var(--error-color, #e5484d);
}
.dz-error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--error-color, #e5484d);
}
.dz-btn {
  padding: 0.55rem 1rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}
.dz-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--text-secondary) 8%, transparent);
}
.dz-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dz-btn-block {
  width: 100%;
}
.dz-btn-danger {
  background: var(--error-color, #e5484d);
  border-color: var(--error-color, #e5484d);
  color: #fff;
}
.dz-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--error-color, #e5484d) 88%, #000);
}

@media (max-width: 896px) {
  .dz-overlay {
    padding: 6vh 0.9rem 2rem;
  }
}
</style>
