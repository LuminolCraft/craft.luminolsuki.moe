<template>
  <div class="linked-accounts">
    <!-- 区块 A：登录方式 -->
    <section class="security-section">
      <h2 class="security-section-title">{{ t('auth.security.linked.sectionTitle') }}</h2>
      <p class="la-desc">{{ t('auth.security.linked.sectionDesc') }}</p>

      <p v-if="loading" class="la-muted">{{ t('auth.security.linked.loading') }}</p>

      <template v-else>
        <p v-if="loadError" class="la-error" role="alert">{{ t('auth.security.linked.loadFailed') }}</p>

        <template v-else>
          <p v-if="accounts.length === 0" class="la-muted">{{ t('auth.security.linked.empty') }}</p>
          <ul v-else class="la-list">
            <li v-for="account in accounts" :key="account.id" class="la-item">
              <span class="la-badge" aria-hidden="true">
                <svg v-if="account.providerId === 'qq'" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673"
                  />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
              </span>
              <span class="la-info">
                <span class="la-name">
                  {{
                    account.providerId === 'qq'
                      ? t('auth.security.linked.qq')
                      : account.providerId === 'github'
                        ? t('auth.security.linked.github')
                        : t('auth.security.linked.credential')
                  }}
                </span>
                <span class="la-hint">
                  {{
                    account.providerId === 'qq'
                      ? t('auth.security.linked.qqHint')
                      : account.providerId === 'github'
                        ? t('auth.security.linked.githubHint')
                        : t('auth.security.linked.credentialHint')
                  }}
                </span>
              </span>
              <button
                v-if="account.providerId === 'qq' || account.providerId === 'github'"
                type="button"
                class="la-unlink"
                :disabled="unlinkingId === account.id"
                @click="openUnlinkDialog(account)"
              >
                {{ unlinkingId === account.id ? t('auth.security.linked.unlinking') : t('auth.security.linked.unlink') }}
              </button>
            </li>
          </ul>

          <button v-if="!hasQQ" type="button" class="la-link-qq" :disabled="linkingQQ" @click="onLinkQQ">
            <span class="la-link-qq-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673"
                />
              </svg>
            </span>
            {{ linkingQQ ? t('auth.security.linked.linkingQQ') : t('auth.security.linked.linkQQ') }}
          </button>

          <button v-if="!hasGithub" type="button" class="la-link-github" :disabled="linkingGithub" @click="onLinkGithub">
            <span class="la-link-github-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                />
              </svg>
            </span>
            {{ linkingGithub ? t('auth.security.linked.linkingGithub') : t('auth.security.linked.linkGithub') }}
          </button>
        </template>
      </template>

      <p v-if="unlinkError" class="la-error" role="alert">{{ unlinkError }}</p>
      <p v-if="linkQQFailed" class="la-error" role="alert">{{ t('auth.security.linked.linkQQFailed') }}</p>
      <p v-if="unlinked" class="la-success" role="status">{{ t('auth.security.linked.unlinked') }}</p>
    </section>

    <!-- 区块 B：关联邮箱并设置密码（仅 QQ 空壳账号：已加载且无 credential 登录方式） -->
    <section v-if="showEmailLinking" class="security-section">
      <h2 class="security-section-title">{{ emailLinkingIsGithub ? t('auth.security.emailLinking.sectionTitleGithub') : t('auth.security.emailLinking.sectionTitle') }}</h2>
      <p class="la-desc">{{ emailLinkingIsGithub ? t('auth.security.emailLinking.sectionDescGithub') : t('auth.security.emailLinking.sectionDesc') }}</p>

      <!-- 步骤一：邮箱未验证 → 关联邮箱 -->
      <form v-if="!emailVerified" class="la-form" novalidate @submit.prevent="onChangeEmail">
        <div class="la-field">
          <label class="la-label" for="la-email">{{ t('auth.security.emailLinking.emailLabel') }}</label>
          <input
            id="la-email"
            v-model.trim="email"
            class="la-input"
            type="email"
            autocomplete="email"
            spellcheck="false"
            :placeholder="t('auth.security.emailLinking.emailPlaceholder')"
          />
        </div>
        <button type="submit" class="la-submit" :disabled="emailSubmitting">
          {{ emailSubmitting ? t('auth.security.emailLinking.emailSubmitting') : t('auth.security.emailLinking.emailSubmit') }}
        </button>
        <p v-if="emailError" class="la-error" role="alert">{{ emailError }}</p>
        <p v-if="emailSent" class="la-success" role="status">{{ t('auth.security.emailLinking.emailSent') }}</p>
      </form>

      <!-- 步骤二：邮箱已验证 → 设置密码 -->
      <form v-else class="la-form" novalidate @submit.prevent="onSetPassword">
        <div class="la-field">
          <label class="la-label" for="la-password">{{ t('auth.security.emailLinking.passwordLabel') }}</label>
          <input
            id="la-password"
            v-model="password"
            class="la-input"
            type="password"
            autocomplete="new-password"
            :placeholder="t('auth.security.emailLinking.passwordPlaceholder')"
          />
        </div>
        <div class="la-field">
          <label class="la-label" for="la-password-confirm">{{ t('auth.security.emailLinking.passwordConfirmLabel') }}</label>
          <input
            id="la-password-confirm"
            v-model="passwordConfirm"
            class="la-input"
            type="password"
            autocomplete="new-password"
            :placeholder="t('auth.security.emailLinking.passwordPlaceholder')"
          />
        </div>
        <button type="submit" class="la-submit" :disabled="passwordSubmitting">
          {{ passwordSubmitting ? t('auth.security.emailLinking.passwordSubmitting') : t('auth.security.emailLinking.passwordSubmit') }}
        </button>
        <p v-if="passwordError" class="la-error" role="alert">{{ passwordError }}</p>
        <p v-if="passwordDone" class="la-success" role="status">{{ t('auth.security.emailLinking.passwordDone') }}</p>
      </form>
    </section>

    <!-- 解绑两步确认弹窗：后果说明 → 确认执行 -->
    <Teleport to="body">
      <div v-if="unlinkTarget" class="la-overlay" @click.self="closeUnlinkDialog">
        <div class="la-dialog" role="dialog" aria-modal="true" :aria-label="t('auth.security.linked.unlinkDialogTitle', { provider: unlinkProviderLabel })">
          <div class="la-dialog-header">
            <span class="la-dialog-title">{{ t('auth.security.linked.unlinkDialogTitle', { provider: unlinkProviderLabel }) }}</span>
            <button type="button" class="la-dialog-close" :aria-label="t('auth.security.linked.unlinkClose')" @click="closeUnlinkDialog">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>

          <!-- Step 1：后果说明 -->
          <div v-if="unlinkStep === 1" class="la-dialog-body">
            <div class="la-dialog-warning" role="alert">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
              </svg>
              <span>{{ t('auth.security.linked.unlinkNoticeTitle') }}</span>
            </div>
            <ul class="la-dialog-effects">
              <li>{{ t('auth.security.linked.unlinkEffect1', { provider: unlinkProviderLabel }) }}</li>
              <li>{{ t('auth.security.linked.unlinkEffect2') }}</li>
              <li>{{ t('auth.security.linked.unlinkEffect3', { provider: unlinkProviderLabel }) }}</li>
            </ul>
            <div class="la-dialog-actions">
              <button type="button" class="la-dialog-btn" @click="closeUnlinkDialog">
                {{ t('auth.security.linked.unlinkCancel') }}
              </button>
              <button type="button" class="la-dialog-btn la-dialog-btn-primary" @click="unlinkStep = 2">
                {{ t('auth.security.linked.unlinkContinue') }}
              </button>
            </div>
          </div>

          <!-- Step 2：确认执行 -->
          <div v-else class="la-dialog-body">
            <p class="la-dialog-hint">
              {{ t('auth.security.linked.unlinkConfirmHint', { provider: unlinkProviderLabel }) }}
            </p>
            <p v-if="unlinkError" class="la-error" role="alert">{{ unlinkError }}</p>
            <div class="la-dialog-actions">
              <button type="button" class="la-dialog-btn" @click="closeUnlinkDialog">
                {{ t('auth.security.linked.unlinkCancel') }}
              </button>
              <button
                type="button"
                class="la-dialog-btn la-dialog-btn-danger"
                :disabled="unlinkingId === unlinkTarget.id"
                @click="confirmUnlink"
              >
                {{ unlinkingId === unlinkTarget.id ? t('auth.security.linked.unlinking') : t('auth.security.linked.unlinkConfirmButton') }}
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
import { isAppError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { LinkedAccount } from '@/stores/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const { t } = useI18n()
const auth = useAuthStore()

// ---------- 区块 A：登录方式 ----------
const loading = ref(true)
const loadError = ref(false)
const unlinkingId = ref('')
const unlinkError = ref('')
const unlinked = ref(false)
const linkingQQ = ref(false)
const linkQQFailed = ref(false)
const linkingGithub = ref(false)
const linkGithubFailed = ref(false)

const accounts = computed(() => auth.linkedAccounts)
const hasQQ = computed(() => accounts.value.some((a) => a.providerId === 'qq'))
const hasGithub = computed(() => accounts.value.some((a) => a.providerId === 'github'))
// GitHub 注册账号（无 QQ 合成邮箱）：邮箱由 GitHub 带入且已验证，区块 B 直接进设密码步骤
const emailLinkingIsGithub = computed(() => hasGithub.value && !hasQQ.value)
const hasCredential = computed(() => accounts.value.some((a) => a.providerId === 'credential'))

/** 解绑成功提示 1.5s 后清除 */
let unlinkTimer: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => clearTimeout(unlinkTimer))

// ---------- 解绑两步弹窗（后果说明 → 确认执行），替代原生 confirm ----------
const unlinkTarget = ref<LinkedAccount | null>(null)
const unlinkStep = ref(1)

const unlinkProviderLabel = computed(() => {
  if (!unlinkTarget.value) return ''
  return unlinkTarget.value.providerId === 'github'
    ? t('auth.security.linked.github')
    : t('auth.security.linked.qq')
})

function openUnlinkDialog(account: LinkedAccount) {
  clearTimeout(unlinkTimer)
  unlinkError.value = ''
  unlinked.value = false
  unlinkTarget.value = account
  unlinkStep.value = 1
}

function closeUnlinkDialog() {
  unlinkTarget.value = null
  unlinkStep.value = 1
}

async function confirmUnlink() {
  const target = unlinkTarget.value
  if (!target || unlinkingId.value) return
  unlinkError.value = ''
  unlinked.value = false
  unlinkingId.value = target.id
  try {
    // 入参为 account 行 id（store 内部成功后自动刷新列表）
    await auth.unlinkLinkedAccount(target.id)
    unlinked.value = true
    closeUnlinkDialog()
    unlinkTimer = setTimeout(() => {
      unlinked.value = false
    }, 1500)
  } catch (e) {
    const code = isAppError(e) ? e.code : ''
    if (code === 'FAILED_TO_UNLINK_LAST_ACCOUNT') unlinkError.value = t('auth.security.linked.lastAccountError')
    else if (code === 'ACCOUNT_NOT_FOUND') unlinkError.value = t('auth.security.linked.accountNotFound')
    else unlinkError.value = t('auth.security.linked.unlinkFailed')
  } finally {
    unlinkingId.value = ''
  }
}

async function onLinkQQ() {
  linkQQFailed.value = false
  linkingQQ.value = true
  try {
    // 成功路径：linkQQ 内部整页跳转离开本页，无需处理返回
    await auth.linkQQ()
  } catch {
    linkQQFailed.value = true
  } finally {
    linkingQQ.value = false
  }
}

async function onLinkGithub() {
  linkGithubFailed.value = false
  linkingGithub.value = true
  try {
    // 成功路径：linkGitHub 内部整页跳转离开本页，无需处理返回
    await auth.linkGitHub()
  } catch {
    linkGithubFailed.value = true
  } finally {
    linkingGithub.value = false
  }
}

// ---------- 区块 B：关联邮箱并设置密码 ----------
const showEmailLinking = computed(() => !loading.value && !loadError.value && !hasCredential.value)
const emailVerified = computed(() => auth.me?.emailVerified === true)

const email = ref('')
const emailSubmitting = ref(false)
const emailError = ref('')
const emailSent = ref(false)

async function onChangeEmail() {
  emailError.value = ''
  emailSent.value = false
  if (!EMAIL_RE.test(email.value)) {
    emailError.value = t('auth.security.emailLinking.emailInvalid')
    return
  }
  emailSubmitting.value = true
  try {
    await auth.changeEmail(email.value)
    emailSent.value = true
    // 刷新 emailVerified（验证邮件点击前仍为 false，刷新失败不影响提示）
    try {
      await auth.fetchCurrentUser()
    } catch {
      /* 忽略刷新失败 */
    }
  } catch (e) {
    emailError.value = isAppError(e) && e.code === 'USER_ALREADY_EXISTS'
      ? t('auth.security.emailLinking.emailTaken')
      : t('auth.security.emailLinking.emailFailed')
  } finally {
    emailSubmitting.value = false
  }
}

const password = ref('')
const passwordConfirm = ref('')
const passwordSubmitting = ref(false)
const passwordError = ref('')
const passwordDone = ref(false)

async function onSetPassword() {
  passwordError.value = ''
  passwordDone.value = false
  if (password.value.length < 8) {
    passwordError.value = t('auth.security.emailLinking.passwordWeak')
    return
  }
  if (password.value !== passwordConfirm.value) {
    passwordError.value = t('auth.security.emailLinking.passwordMismatch')
    return
  }
  passwordSubmitting.value = true
  try {
    // store 内部成功后自动刷新登录方式列表与 /me → credential 出现 → 本区块随之隐藏
    await auth.setPassword(password.value)
    passwordDone.value = true
  } catch (e) {
    const code = isAppError(e) ? e.code : ''
    if (code === 'PASSWORD_ALREADY_SET') passwordError.value = t('auth.security.emailLinking.passwordAlreadySet')
    // 后端自定义接口 404（未部署/未开放）归一化为 NOT_FOUND / AUTH_ERROR
    else if (code === 'NOT_FOUND' || code === 'AUTH_ERROR') passwordError.value = t('auth.security.emailLinking.notAvailable')
    else passwordError.value = t('auth.security.emailLinking.passwordFailed')
  } finally {
    passwordSubmitting.value = false
  }
}

onMounted(async () => {
  try {
    await auth.fetchLinkedAccounts()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* 与 AccountSecurity.vue .security-section 同名同类结构：父页 GSAP 入场选择器（无 scope，文档级）依赖该类名覆盖本组件 */
.security-section {
  margin-bottom: 2.2rem;
}
.security-section-title {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 0.4rem;
}

.la-desc {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0 0 1rem;
}

.la-muted {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: 1.1rem 0.25rem;
}

/* ---------- 登录方式列表 ---------- */
.la-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.la-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
}

.la-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--vercel-white);
}
.la-badge svg {
  width: 18px;
  height: 18px;
}

.la-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.la-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-color);
}
.la-hint {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.la-unlink {
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
.la-unlink:hover:not(:disabled) {
  background: color-mix(in srgb, var(--error-color, #e5484d) 8%, transparent);
}
.la-unlink:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- 关联 QQ（参考 Login.vue .login-qq / .login-qq-badge） ---------- */
.la-link-qq {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    opacity 0.2s ease;
}
.la-link-qq:hover:not(:disabled) {
  border-color: var(--text-secondary);
}
.la-link-qq:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.la-link-qq-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--primary-color);
  color: var(--vercel-white);
}
.la-link-qq-badge svg {
  width: 13px;
  height: 13px;
}

/* ---------- 关联 GitHub（与 .la-link-qq 同构） ---------- */
.la-link-github {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    opacity 0.2s ease;
}
.la-link-github:hover:not(:disabled) {
  border-color: var(--text-secondary);
}
.la-link-github:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.la-link-github-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--primary-color);
  color: var(--vercel-white);
}
.la-link-github-badge svg {
  width: 13px;
  height: 13px;
}

/* ---------- 表单（复用 MinecraftView mc-field/mc-label/mc-input/mc-submit 范式） ---------- */
.la-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 26rem;
}

.la-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.la-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-color);
}

.la-input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-color);
  font-size: 0.92rem;
  transition: border-color 0.15s ease;
}
.la-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.la-submit {
  align-self: flex-start;
  padding: 0.6rem 1.4rem;
  background: var(--primary-color);
  border: none;
  border-radius: 6px;
  color: var(--vercel-white);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    translate 0.15s ease,
    opacity 0.15s ease;
}
.la-submit:hover:not(:disabled) {
  translate: 0 -1px;
}
.la-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- 错误/成功提示（左边条范式） ---------- */
.la-error {
  margin: 0.8rem 0 0;
  padding: 0.75rem 0.9rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}

.la-success {
  margin: 0.8rem 0 0;
  font-size: 0.85rem;
  color: var(--primary-color);
}

/* 键盘可达性 */
.la-unlink:focus-visible,
.la-link-qq:focus-visible,
.la-link-github:focus-visible,
.la-submit:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

/* ---------- 解绑两步确认弹窗（风格对齐 DangerZone） ---------- */
.la-overlay {
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
.la-dialog {
  width: 100%;
  max-width: 26rem;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}
.la-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--border-color);
}
.la-dialog-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-color);
}
.la-dialog-close {
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
.la-dialog-close:hover {
  color: var(--text-color);
}
.la-dialog-close svg {
  width: 16px;
  height: 16px;
}
.la-dialog-close:focus-visible,
.la-dialog-btn:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}
.la-dialog-body {
  padding: 1.25rem 1.1rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.la-dialog-warning {
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
.la-dialog-warning svg {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 0.15rem;
  color: #d4a72c;
}
.la-dialog-effects {
  margin: 0;
  padding: 0 0 0 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
}
.la-dialog-hint {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-color);
}
.la-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
.la-dialog-btn {
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
.la-dialog-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--text-secondary) 8%, transparent);
}
.la-dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.la-dialog-btn-primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}
.la-dialog-btn-danger {
  background: var(--error-color, #e5484d);
  border-color: var(--error-color, #e5484d);
  color: #fff;
}
.la-dialog-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--error-color, #e5484d) 88%, #000);
}

@media (max-width: 896px) {
  .la-overlay {
    padding: 6vh 0.9rem 2rem;
  }
  .la-dialog-actions {
    flex-direction: column-reverse;
  }
  .la-dialog-actions .la-dialog-btn {
    width: 100%;
  }
}</style>
