<template>
  <!-- 区块 C：修改密码 —— 仅已有 credential（邮箱密码）登录方式的账号渲染；
       没有密码的 OAuth 账号走 LinkedAccounts 的「设置密码」区块，两者互补。
       根元素沿用 .security-section（AccountSecurity.vue 的 GSAP 入场选择器
       按该文档级类名覆盖本组件，见 LinkedAccounts.vue 同名注释）。 -->
  <section class="security-section">
    <h2 class="security-section-title">{{ t('auth.security.changePassword.sectionTitle') }}</h2>
    <p class="cp-desc">{{ t('auth.security.changePassword.sectionDesc') }}</p>

    <form class="cp-form" novalidate @submit.prevent="onSubmit">
      <div class="cp-field">
        <label class="cp-label" for="cp-current">{{ t('auth.security.changePassword.currentLabel') }}</label>
        <input
          id="cp-current"
          v-model="currentPassword"
          class="cp-input"
          type="password"
          autocomplete="current-password"
          :placeholder="t('auth.security.changePassword.currentPlaceholder')"
        />
      </div>

      <div class="cp-field">
        <label class="cp-label" for="cp-new">{{ t('auth.security.changePassword.newLabel') }}</label>
        <input
          id="cp-new"
          v-model="newPassword"
          class="cp-input"
          type="password"
          autocomplete="new-password"
          :placeholder="t('auth.security.changePassword.newPlaceholder')"
        />
      </div>

      <div class="cp-field">
        <label class="cp-label" for="cp-confirm">{{ t('auth.security.changePassword.confirmLabel') }}</label>
        <input
          id="cp-confirm"
          v-model="confirmPassword"
          class="cp-input"
          type="password"
          autocomplete="new-password"
          :placeholder="t('auth.security.changePassword.newPlaceholder')"
        />
      </div>

      <button type="submit" class="cp-submit" :disabled="submitting">
        {{ submitting ? t('auth.security.changePassword.submitting') : t('auth.security.changePassword.submit') }}
      </button>

      <p v-if="errorMsg" class="cp-error" role="alert">{{ errorMsg }}</p>
      <template v-if="done">
        <p class="cp-success" role="status">{{ t('auth.security.changePassword.done') }}</p>
        <p class="cp-success-hint">{{ t('auth.security.changePassword.doneHint') }}</p>
      </template>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { errorToResetAt, isAppError } from '@/lib/api'

const { t } = useI18n()
const auth = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const errorMsg = ref('')
const done = ref(false)

/** 密码最小长度与注册 / 设置密码一致（后端 8~128，前端先做一致性校验） */
const MIN_PASSWORD_LENGTH = 8

async function onSubmit() {
  if (submitting.value) return
  errorMsg.value = ''
  done.value = false

  if (newPassword.value.length < MIN_PASSWORD_LENGTH) {
    errorMsg.value = t('auth.security.changePassword.weakPassword')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = t('auth.security.changePassword.passwordMismatch')
    return
  }
  if (currentPassword.value.length === 0) {
    errorMsg.value = t('auth.security.changePassword.currentRequired')
    return
  }

  submitting.value = true
  try {
    // store 内部成功后重拉设备列表（服务端已撤销其他设备会话）
    await auth.changePassword(currentPassword.value, newPassword.value)
    done.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    if (isAppError(e) && e.code === 'INVALID_PASSWORD') {
      errorMsg.value = t('auth.security.changePassword.invalidCurrent')
    } else if (isAppError(e) && e.code === 'CREDENTIAL_ACCOUNT_NOT_FOUND') {
      // 账号没有 credential 登录方式（理论上前端只在本区块可见时提交）
      errorMsg.value = t('auth.security.changePassword.notAvailable')
    } else if (isAppError(e) && e.code === 'RATE_LIMITED') {
      const resetAt = errorToResetAt(e)
      errorMsg.value = resetAt
        ? t('auth.security.changePassword.rateLimitedUntil', {
            time: new Date(resetAt).toLocaleString(),
          })
        : t('auth.security.changePassword.rateLimited')
    } else {
      errorMsg.value = t('auth.security.changePassword.failed')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* 与 LinkedAccounts.vue 的 .security-section / 表单范式同构（父页 GSAP 入场
   选择器依赖 .security-section 这一文档级类名） */
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

.cp-desc {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0 0 1rem;
}

.cp-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 26rem;
}

.cp-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.cp-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-color);
}

.cp-input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-color);
  font-size: 0.92rem;
  transition: border-color 0.15s ease;
}
.cp-input:focus {
  outline: none;
  border-color: var(--primary-color);
}
.cp-input:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

.cp-submit {
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
.cp-submit:hover:not(:disabled) {
  translate: 0 -1px;
}
.cp-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cp-submit:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

.cp-error {
  margin: 0.8rem 0 0;
  padding: 0.75rem 0.9rem;
  border-left: 2px solid var(--error-color, #e5484d);
  background: color-mix(in srgb, var(--error-color, #e5484d) 6%, transparent);
  font-size: 0.85rem;
  color: var(--error-color, #e5484d);
}

.cp-success {
  margin: 0.8rem 0 0;
  font-size: 0.85rem;
  color: var(--primary-color);
}
.cp-success-hint {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
</style>
