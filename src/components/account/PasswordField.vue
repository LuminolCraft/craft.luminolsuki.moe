<template>
  <div class="pw-field">
    <label class="pw-label" :for="id">{{ label }}</label>
    <div class="pw-box">
      <input
        :id="id"
        class="pw-input"
        :class="{ 'has-reveal': revealable }"
        :type="revealed ? 'text' : 'password'"
        :value="modelValue"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :disabled="disabled"
        spellcheck="false"
        @input="onInput"
      />
      <!-- 点击锁定切换（非登录页的按住式）：改密码需对照两个输入框，按住式松手即遮回 -->
      <button
        v-if="revealable"
        type="button"
        class="pw-reveal"
        :aria-label="t(revealed ? 'auth.field.hidePassword' : 'auth.field.showPassword')"
        :title="t(revealed ? 'auth.field.hidePassword' : 'auth.field.showPassword')"
        :aria-pressed="revealed"
        :disabled="disabled"
        @click="revealed = !revealed"
      >
        <svg
          v-if="revealed"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 8 11 8a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * 设置页通用密码输入框：沿用 cp-* / 安全页表单范式（小写 label、0.6rem 内距），
 * 右侧眼睛按钮点击切换明文。AuthField 服务于登录/注册（uppercase label + 按住式），
 * 两者范式不同，不合并。
 *
 * `revealable = false` 用于「当前密码」这类**旧密码**输入：旧密码不允许被明文回看，
 * 该框不渲染眼睛按钮（新密码/确认密码是两个需要互相比对的输入，才给切换）。
 */
withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue: string
    placeholder?: string
    autocomplete?: string
    disabled?: boolean
    revealable?: boolean
  }>(),
  { placeholder: '', autocomplete: 'current-password', disabled: false, revealable: true },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()
const revealed = ref(false)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<style scoped>
.pw-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.pw-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-color);
}

.pw-box {
  position: relative;
  width: 100%;
}

.pw-input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-color);
  font-size: 0.92rem;
  font-family: inherit;
  transition: border-color 0.15s ease;
}
/* 有眼睛按钮时右侧常驻 42px，避免显示/隐藏切换时文字宽度跳动 */
.pw-input.has-reveal {
  padding-right: 2.6rem;
}
.pw-input:focus {
  outline: none;
  border-color: var(--primary-color);
}
.pw-input:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}
.pw-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pw-reveal {
  position: absolute;
  right: 8px;
  top: 50%;
  translate: 0 -50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.15s ease;
}
.pw-reveal svg {
  width: 18px;
  height: 18px;
}
.pw-reveal:hover:not(:disabled) {
  color: var(--text-color);
}
.pw-reveal:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pw-reveal:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}
</style>
