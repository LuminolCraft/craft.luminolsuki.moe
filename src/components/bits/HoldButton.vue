<!--
  HoldButton —— 长按确认按钮

  移植自 Vue Bits「Hold Button」(https://vue-bits.dev/components/hold-button)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点（相对上游 React 源码）：
  - 去 Tailwind：SIZES / LABEL_IDLE / LABEL_DONE 里的原子类串落成 scoped CSS，
    `group-data-[phase=x]:*` 变体改成真实选择器 `.hb-root[data-phase='x'] .hb-*`
  - 进度不走响应式：rAF 里直接写 `--hb-progress`（CSS 变量），避免每帧重渲染
  - 补键盘：Space / Enter 按住同样能走完，keyup / blur / 移出边界即取消
  - reduced-motion 下去掉 crest 的脉冲与呼吸，只保留线性推进（这是确认手势，
    不能因为关动画就瞬间完成）
  - 完成态改成**受控可选**：给了 `done` 就走完全程后等外部置真（失败时不置真，
    组件在 `holdTimeout` 后自己退回 idle）；不给就自管，走完即亮 doneLabel
    并在 `resetDelay` 后自动复位
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef, ref, watch } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

type HoldButtonSize = 'sm' | 'md' | 'lg'
type HoldButtonPhase = 'idle' | 'holding' | 'done'

interface HoldButtonProps {
  /** 常态文案 */
  label: string
  /** 完成后文案 */
  doneLabel?: string
  /** 走满进度所需毫秒 */
  duration?: number
  size?: HoldButtonSize
  /** 受控完成态：undefined = 自管；true = 已确认；false = 等待中 */
  done?: boolean
  disabled?: boolean
  /** 自管模式下 done 态保持时长 */
  resetDelay?: number
  /** 受控模式下等外部 done 的上限，超时退回 idle */
  holdTimeout?: number
  /** 进度填充色 */
  fillColor?: string
  /** 边框 / crest 强调色 */
  accentColor?: string
  /** 完成态填充色 */
  doneColor?: string
}

const props = withDefaults(defineProps<HoldButtonProps>(), {
  doneLabel: '',
  duration: 1100,
  size: 'md',
  resetDelay: 1600,
  holdTimeout: 1500,
})

const emit = defineEmits<{
  (e: 'hold'): void
  (e: 'cancel'): void
}>()

const rootRef = useTemplateRef<HTMLButtonElement>('root')
const reduced = usePreferredReducedMotion()
const isReduced = computed(() => reduced.value === 'reduce')

const phase = ref<HoldButtonPhase>('idle')
/** 是否已走完（走完后 pointerup 不能再当成取消） */
let completed = false
/** 非响应式：进度只写 CSS 变量 */
let progress = 0
let raf = 0
let startedAt = 0
let resetTimer = 0
let holdTimer = 0

const rootStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  if (props.fillColor) style['--hb-fill'] = props.fillColor
  if (props.accentColor) style['--hb-accent'] = props.accentColor
  if (props.doneColor) style['--hb-done'] = props.doneColor
  return style
})

function writeProgress(v: number): void {
  progress = v
  rootRef.value?.style.setProperty('--hb-progress', v.toFixed(4))
}

function cancelRaf(): void {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

function clearTimers(): void {
  window.clearTimeout(resetTimer)
  window.clearTimeout(holdTimer)
  resetTimer = 0
  holdTimer = 0
}

function tick(now: number): void {
  const span = Math.max(props.duration, 120)
  const v = Math.min((now - startedAt) / span, 1)
  writeProgress(v)
  if (v >= 1) {
    complete()
    return
  }
  raf = requestAnimationFrame(tick)
}

function begin(): void {
  if (props.disabled || completed || phase.value === 'holding' || phase.value === 'done') return
  clearTimers()
  phase.value = 'holding'
  startedAt = performance.now()
  writeProgress(0)
  cancelRaf()
  raf = requestAnimationFrame(tick)
}

/** 取消：进度快速回落（惯性收缩，不做硬断） */
function decay(): void {
  cancelRaf()
  const from = progress
  if (from <= 0) {
    phase.value = 'idle'
    return
  }
  const t0 = performance.now()
  const step = (now: number): void => {
    const k = Math.min((now - t0) / 200, 1)
    writeProgress(from * (1 - k * k))
    if (k < 1) {
      raf = requestAnimationFrame(step)
    } else {
      writeProgress(0)
      phase.value = 'idle'
    }
  }
  raf = requestAnimationFrame(step)
}

function abort(): void {
  if (completed || phase.value !== 'holding') return
  emit('cancel')
  decay()
}

function complete(): void {
  cancelRaf()
  completed = true
  writeProgress(1)
  emit('hold')
  if (props.done === undefined) {
    phase.value = 'done'
    resetTimer = window.setTimeout(reset, props.resetDelay)
    return
  }
  // 受控：等外部把 done 置真；等不到就自己退回
  holdTimer = window.setTimeout(() => {
    if (props.done !== true) reset()
  }, props.holdTimeout)
}

function reset(): void {
  clearTimers()
  completed = false
  const from = progress
  phase.value = 'idle'
  if (from <= 0) return
  cancelRaf()
  const t0 = performance.now()
  const step = (now: number): void => {
    const k = Math.min((now - t0) / 240, 1)
    writeProgress(from * (1 - k))
    if (k < 1) raf = requestAnimationFrame(step)
    else writeProgress(0)
  }
  raf = requestAnimationFrame(step)
}

watch(
  () => props.done,
  (v) => {
    if (v !== true || !completed) return
    window.clearTimeout(holdTimer)
    holdTimer = 0
    phase.value = 'done'
    window.clearTimeout(resetTimer)
    resetTimer = window.setTimeout(reset, props.resetDelay)
  },
)

// ---------- 指针 ----------
function onPointerDown(e: PointerEvent): void {
  if (props.disabled) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  begin()
  // 捕获指针：按住后移到按钮外也能收到 pointerup；指针已失效时浏览器会抛，忽略即可
  try {
    ;(e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId)
  } catch {
    /* 合成事件 / 已释放的指针 */
  }
}

function onPointerMove(e: PointerEvent): void {
  if (phase.value !== 'holding' || completed) return
  const el = rootRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const pad = 6
  const outside =
    e.clientX < r.left - pad || e.clientX > r.right + pad || e.clientY < r.top - pad || e.clientY > r.bottom + pad
  if (outside) abort()
}

function onPointerUp(): void {
  abort()
}

// ---------- 键盘 ----------
function onKeyDown(e: KeyboardEvent): void {
  if (e.repeat) return
  if (e.key !== ' ' && e.key !== 'Enter') return
  e.preventDefault()
  begin()
}

function onKeyUp(e: KeyboardEvent): void {
  if (e.key !== ' ' && e.key !== 'Enter') return
  e.preventDefault()
  abort()
}

onBeforeUnmount(() => {
  clearTimers()
  cancelRaf()
})
</script>

<template>
  <button
    ref="root"
    type="button"
    class="hb-root"
    :class="[`hb-root--${size}`, { 'is-reduced': isReduced }]"
    :data-phase="phase"
    :style="rootStyle"
    :aria-label="label"
    :disabled="disabled"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKeyDown"
    @keyup="onKeyUp"
    @blur="abort"
  >
    <span class="hb-fill" aria-hidden="true">
      <span class="hb-crest" />
    </span>
    <span class="hb-label">
      <span class="hb-label__idle">{{ label }}</span>
      <span v-if="doneLabel" class="hb-label__done" aria-hidden="true">{{ doneLabel }}</span>
    </span>
  </button>
</template>

<style scoped>
.hb-root {
  --hb-progress: 0;
  --hb-fill: color-mix(in srgb, var(--primary-color, #a78bfa) 20%, transparent);
  --hb-done: color-mix(in srgb, var(--primary-color, #a78bfa) 30%, transparent);
  --hb-accent: var(--primary-color, #a78bfa);
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.28));
  background: transparent;
  color: var(--text-color, inherit);
  font: inherit;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.hb-root--sm {
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  font-size: 0.78rem;
}

.hb-root--md {
  padding: 0.5rem 1.05rem;
  border-radius: 8px;
  font-size: 0.86rem;
}

.hb-root--lg {
  padding: 0.68rem 1.35rem;
  border-radius: 10px;
  font-size: 0.95rem;
}

.hb-root:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--hb-accent) 45%, transparent);
}

.hb-root:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--hb-accent) 55%, transparent);
  outline-offset: 2px;
}

.hb-root:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hb-root[data-phase='holding'] {
  border-color: color-mix(in srgb, var(--hb-accent) 70%, transparent);
}

.hb-root[data-phase='done'] {
  border-color: color-mix(in srgb, var(--hb-accent) 70%, transparent);
  color: color-mix(in srgb, var(--hb-accent) 88%, var(--text-color, currentColor));
}

/* ---------- 进度填充 ---------- */
.hb-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: calc(var(--hb-progress) * 100%);
  background: var(--hb-fill);
  pointer-events: none;
  z-index: -1;
}

.hb-root[data-phase='done'] .hb-fill {
  width: 100%;
  background: var(--hb-done);
}

.hb-crest {
  position: absolute;
  top: -1px;
  right: 0;
  bottom: -1px;
  width: 2px;
  background: color-mix(in srgb, var(--hb-accent) 85%, transparent);
  box-shadow: 0 0 10px 1px color-mix(in srgb, var(--hb-accent) 45%, transparent);
  opacity: 0;
  transition: opacity 0.12s ease;
}

.hb-root[data-phase='holding'] .hb-crest {
  opacity: 1;
  animation: hb-pulse 0.9s ease-in-out infinite;
}

.hb-root[data-phase='done'] .hb-crest {
  opacity: 0;
}

/* ---------- 文案（双层堆叠，宽度取两者较大值，切字不跳动） ---------- */
.hb-label {
  position: relative;
  display: grid;
  grid-template-areas: 'stack';
  place-items: center;
}

.hb-label > * {
  grid-area: stack;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.hb-label__done {
  opacity: 0;
  transform: translateY(0.35em);
}

.hb-root[data-phase='done'] .hb-label__idle {
  opacity: 0;
  transform: translateY(-0.35em);
}

.hb-root[data-phase='done'] .hb-label__done {
  opacity: 1;
  transform: translateY(0);
}

@keyframes hb-pulse {
  0%,
  100% {
    opacity: 0.85;
    transform: scaleY(1);
  }
  50% {
    opacity: 0.45;
    transform: scaleY(0.82);
  }
}

.is-reduced .hb-crest {
  animation: none;
  opacity: 0.7;
}

.is-reduced .hb-label > * {
  transition: none;
}
</style>
