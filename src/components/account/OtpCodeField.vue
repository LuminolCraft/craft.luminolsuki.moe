<template>
  <!-- 6 格验证码输入：单字符输入框串联，支持整串粘贴 / 退格回退 / 左右方向键。
       仅暴露一个 6 位数字字符串的 v-model，方便直接替换为第三方 OTP 组件
       （替换时保持 modelValue / disabled / complete 三个契约即可）。 -->
  <div class="otp-field" :class="{ 'is-disabled': disabled }">
    <input
      v-for="(_, index) in length"
      :key="index"
      :ref="(el) => setInputRef(el as HTMLInputElement | null, index)"
      class="otp-cell"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      :aria-label="`${label} ${index + 1}`"
      :value="digits[index] ?? ''"
      :disabled="disabled"
      @input="onInput(index, $event)"
      @keydown="onKeydown(index, $event)"
      @paste="onPaste($event)"
      @focus="onFocus($event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    /** 位数（与后端 SECURITY_POLICY.passwordChangeOtpLength 一致） */
    length?: number
    disabled?: boolean
    label?: string
  }>(),
  { length: 6, disabled: false, label: '验证码' },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  complete: [value: string]
}>()

const inputs = ref<(HTMLInputElement | null)[]>([])

function setInputRef(el: HTMLInputElement | null, index: number) {
  inputs.value[index] = el
}

/** 当前值按位切分（外部写入整串时应逐格回填） */
const digits = computed(() => props.modelValue.split('').slice(0, props.length))

function emitValue(next: string[]) {
  const value = next.join('').slice(0, props.length)
  emit('update:modelValue', value)
  if (value.length === props.length) emit('complete', value)
}

function focusAt(index: number) {
  const target = inputs.value[Math.min(Math.max(index, 0), props.length - 1)]
  target?.focus()
  target?.select()
}

function onInput(index: number, event: Event) {
  const el = event.target as HTMLInputElement
  const raw = el.value.replace(/\D/g, '')
  const next = digits.value.slice()
  if (raw === '') {
    next[index] = ''
    emitValue(next.map((d) => d ?? ''))
    return
  }
  // 输入多个字符（移动端输入法一次上屏）时按位铺开
  for (let i = 0; i < raw.length && index + i < props.length; i += 1) {
    next[index + i] = raw[i] as string
  }
  emitValue(next.map((d) => d ?? ''))
  focusAt(index + raw.length)
}

function onKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace') {
    event.preventDefault()
    const next = digits.value.slice()
    if (next[index]) {
      next[index] = ''
      emitValue(next.map((d) => d ?? ''))
      return
    }
    focusAt(index - 1)
    return
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    focusAt(index - 1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    focusAt(index + 1)
  }
}

/** 整串粘贴：过滤非数字后从第一格铺开 */
function onPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text') ?? ''
  const cleaned = text.replace(/\D/g, '').slice(0, props.length)
  if (!cleaned) return
  event.preventDefault()
  const next: string[] = []
  for (let i = 0; i < props.length; i += 1) next[i] = cleaned[i] ?? ''
  emitValue(next)
  focusAt(cleaned.length)
}

/** 聚焦时全选，便于直接覆写该格 */
function onFocus(event: FocusEvent) {
  ;(event.target as HTMLInputElement).select()
}

// 外部重置（如改密成功后清空）时把焦点退回第一格
watch(
  () => props.modelValue,
  (value) => {
    if (value === '') inputs.value[0]?.focus()
  },
)
</script>

<style scoped>
.otp-field {
  display: flex;
  gap: 0.5rem;
}

.otp-cell {
  width: 2.6rem;
  height: 3rem;
  padding: 0;
  border: 1px solid var(--border-color, #e4e4e7);
  border-radius: 6px;
  background: var(--surface-color, transparent);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.otp-cell:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 18%, transparent);
}

.otp-field.is-disabled .otp-cell {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
