<template>
  <div class="auth-field" :class="{ 'auth-field-invalid': invalid }">
    <span class="auth-field-label">{{ label }}</span>
    <div class="auth-field-box">
      <input
        class="auth-field-input"
        :class="{ 'has-reveal': type === 'password' }"
        :type="revealed ? 'text' : (type ?? 'text')"
        :value="modelValue"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :disabled="disabled"
        spellcheck="false"
        @input="onInput"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="auth-field-reveal"
        :aria-label="t('auth.field.holdToReveal')"
        @pointerdown="revealed = true"
        @pointerup="revealed = false"
        @pointerleave="revealed = false"
        @pointercancel="revealed = false"
        @mousedown.prevent
        @keydown.space.prevent="revealed = true"
        @keydown.enter.prevent="revealed = true"
        @keyup.space="revealed = false"
        @keyup.enter="revealed = false"
        @blur="revealed = false"
      >
        <template v-if="revealed">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        </template>
        <template v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.8 10.8 0 0 1-1.444 2.49" />
          <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
          <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
          <path d="m2 2 20 20" />
        </svg>
        </template>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  label: string
  modelValue: string
  type?: 'text' | 'email' | 'password'
  autocomplete?: string
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()
const revealed = ref(false)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<style scoped>
.auth-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
}
.auth-field-label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.auth-field-box {
  position: relative;
  width: 100%;
  max-width: 26rem;
}
.auth-field-input {
  width: 100%;
  padding: 12px 14px;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.95rem;
  font-family: inherit;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.auth-field-input.has-reveal {
  padding-right: 42px;
}
.auth-field-reveal {
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
  transition: color 0.2s ease;
}
.auth-field-reveal svg {
  width: 18px;
  height: 18px;
}
.auth-field-reveal:hover {
  color: var(--text-color);
  background: color-mix(in srgb, var(--text-color) 8%, transparent);
}
/* 按住显示期间图标亮成品牌色 */
.auth-field-reveal:active {
  color: var(--primary-color);
}
.auth-field-reveal:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}
.auth-field-input::placeholder {
  color: color-mix(in srgb, var(--text-secondary) 60%, transparent);
}
.auth-field-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 18%, transparent);
}
.auth-field-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.auth-field-invalid .auth-field-input {
  border-color: var(--error-color, #e5484d);
}
.auth-field-invalid .auth-field-input:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--error-color, #e5484d) 16%, transparent);
}

@media (max-width: 896px) {
  .auth-field-box {
    max-width: none;
  }
}
</style>
