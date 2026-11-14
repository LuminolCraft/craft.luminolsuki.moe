<script setup lang="ts">
import { Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconArray } from '@hugeicons/vue'
import {
  animate,
  motion,
  motionValue,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion-v'
import {
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
  useId,
  watch,
  type CSSProperties,
  type PropType,
} from 'vue'

/**
 * CodeSlots（Vue Bits 移植，scoped CSS 重写）。
 *
 * 原版 Tailwind arbitrary 变体（`in-data-[status=error]:...`、`data-[active]:...`）
 * 在本仓不可用（无 Tailwind），改为 data 属性 + scoped 选择器；弹簧参数、
 * 逐格级联（cascade）、错误排空（drain）、成功洗白（wash）逻辑保持原样。
 */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
const WASH_IN = 0.3
const WASH_OUT = 0.2
const SINK_DELAY = 0.06
const SINK_STEP = 0.03
const CHECK_DELAY = 0.28
const CHECK_RISE = 8
const SINK_FADE = 0.6

export type CodeSlotsStatus = 'idle' | 'error' | 'success'

interface CodeSlotsProps {
  length?: number
  value?: string
  defaultValue?: string
  status?: CodeSlotsStatus
  mask?: boolean
  caret?: boolean
  disabled?: boolean
  autoFocus?: boolean
  accentColor?: string
  inkColor?: string
  slotColor?: string
  digitColor?: string
  dangerColor?: string
  slotSize?: number
  gap?: number
  radius?: number
  bounce?: number
  settle?: number
  rise?: number
  cascade?: number
  ariaLabel?: string
  className?: string
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const digitsOf = (raw: string | undefined) => String(raw ?? '').replace(/\D/g, '')
const toSlots = (raw: string | undefined, n: number) => {
  const d = digitsOf(raw).slice(0, n)
  return Array.from({ length: n }, (_, i) => d[i] ?? '')
}
const firstEmptyOf = (slots: string[]) => {
  const i = slots.indexOf('')
  return i === -1 ? slots.length - 1 : i
}
const isFull = (slots: string[]) => slots.every(Boolean)

const CodeSlot = defineComponent({
  name: 'CodeSlot',
  props: {
    mv: { type: Object as PropType<MotionValue<number>>, required: true },
    drop: { type: Object as PropType<MotionValue<number>>, required: true },
    char: { type: String, default: '' },
    active: { type: Boolean, default: false },
    rise: { type: Number, default: 8 },
    sink: { type: Number, default: 0 },
  },
  setup(p) {
    const shown = ref(p.char)
    watch(
      () => p.char,
      (c) => {
        if (c && c !== shown.value) shown.value = c
      },
    )
    const fill = useTransform(p.mv, (t: number) => `scale(${Math.max(t, 0)})`)
    const lift = useTransform(
      [p.mv, p.drop] as MotionValue<number>[],
      ([t, d]: number[]) => `translateY(${(1 - (t as number)) * p.rise + Math.max(d as number, 0) * p.sink}px)`,
    )
    const ink = useTransform([p.mv, p.drop] as MotionValue<number>[], ([t, d]: number[]) => {
      return clamp01(t as number) * (1 - clamp01((d as number) / SINK_FADE))
    })
    return () =>
      h(
        'span',
        {
          class: 'cs-slot',
          'data-active': p.active ? '' : undefined,
          'data-filled': p.char ? '' : undefined,
          'aria-hidden': 'true',
        },
        [
          h(motion.span, { class: 'cs-slot-fill', style: { transform: fill } }),
          shown.value
            ? h(
                motion.span,
                { class: 'cs-slot-digit', style: { transform: lift, opacity: ink } },
                () => shown.value,
              )
            : null,
        ],
      )
  },
})

const props = withDefaults(defineProps<CodeSlotsProps>(), {
  length: 6,
  value: undefined,
  defaultValue: '',
  status: 'idle',
  mask: false,
  caret: true,
  disabled: false,
  autoFocus: false,
  accentColor: '#f5f5f5',
  inkColor: '#f5f5f5',
  slotColor: '#27272a',
  digitColor: '#18181b',
  dangerColor: '#ff3b30',
  slotSize: 44,
  gap: 8,
  radius: 12,
  bounce: 0.2,
  settle: 0.3,
  rise: 8,
  cascade: 20,
  ariaLabel: 'One-time code',
  className: '',
})

const emit = defineEmits<{ change: [code: string]; complete: [code: string] }>()

const uid = useId()
const reduce = useReducedMotion()
const inputRef = ref<HTMLInputElement | null>(null)
const rowRef = ref<HTMLDivElement | null>(null)

let cur = toSlots(props.value ?? props.defaultValue, props.length)
const slots = ref<string[]>(cur)
const active = ref(firstEmptyOf(cur))
const focused = ref(false)
const veiled = ref(props.status === 'success')
const activeMv = useMotionValue(active.value)
const openMv = useMotionValue(props.status === 'success' ? 1 : 0)
const checkMv = useMotionValue(props.status === 'success' ? 1 : 0)

const glide = new Set<number>()
let target: number[] = []
let draining = false
let drainTimer: ReturnType<typeof setTimeout> | undefined
let prevStatus = props.status
let emitted = digitsOf(props.value ?? props.defaultValue).slice(0, props.length)

const setSlots = (next: string[]) => {
  cur = next
  slots.value = next
}

const springs = computed(() => ({
  mvs: Array.from({ length: props.length }, (_, i) => motionValue(cur[i] ? 1 : 0)),
  drops: Array.from({ length: props.length }, () => motionValue(prevStatus === 'success' ? 1 : 0)),
}))
const pitch = computed(() => props.slotSize + props.gap)
const height = computed(() => Math.round(props.slotSize * 1.18))
const washRadius = () => Math.min(props.radius, props.slotSize / 2)

const drive = (i: number, to: number, delayMs = 0) => {
  const mv = springs.value.mvs[i]
  if (!mv) return
  target[i] = to
  if (reduce.value) {
    mv.jump(to)
    return
  }
  animate(mv, to, {
    type: 'spring',
    duration: props.settle,
    bounce: props.bounce,
    delay: delayMs / 1000,
  })
}
const land = (i: number, delayMs = 0) => {
  const mv = springs.value.mvs[i]
  if (!mv) return
  if (mv.get() > 0) mv.jump(0)
  drive(i, 1, delayMs)
}
const moveActive = (next: number, crossed: number[]) => {
  crossed.forEach((j) => glide.add(j))
  activeMv.jump(next)
  active.value = next
}
const jumpActive = (next: number) => {
  glide.clear()
  activeMv.jump(next)
  active.value = next
}

const caretX = useTransform(() => {
  const { mvs } = springs.value
  const a = activeMv.get()
  let x = a * pitch.value
  for (let j = 0; j < mvs.length; j++) {
    const hgt = clamp01(mvs[j]!.get())
    if (!glide.has(j)) continue
    const to = target[j]
    if (to === undefined || hgt === clamp01(to)) {
      glide.delete(j)
      continue
    }
    x += j < a ? -(1 - hgt) * pitch.value : hgt * pitch.value
  }
  return Math.min(Math.max(x, 0), (mvs.length - 1) * pitch.value)
})
const caretTransform = useTransform(caretX, (x: number) => `translateX(${x}px)`)
const washClip = useTransform(
  openMv,
  (o: number) => `inset(0 ${(1 - clamp01(o)) * 50}% round ${washRadius()}px)`,
)
const checkTransform = useTransform(
  checkMv,
  (c: number) => `translateY(${(1 - c) * CHECK_RISE}px) scale(${0.85 + 0.15 * Math.max(c, 0)})`,
)
const checkOpacity = useTransform(checkMv, clamp01)

const commit = (next: string[]) => {
  const prev = cur
  setSlots(next)
  const code = next.join('')
  emitted = code
  emit('change', code)
  if (!isFull(prev) && isFull(next)) emit('complete', code)
}

const insert = (raw: string, from = active.value) => {
  const digits = digitsOf(raw)
  if (!digits) return
  const next = [...cur]
  const crossed: number[] = []
  const step = reduce.value ? 0 : props.cascade
  let i = from
  for (const ch of digits) {
    if (i >= props.length) break
    next[i] = ch
    land(i, (i - from) * step)
    crossed.push(i)
    i += 1
  }
  if (!crossed.length) return
  commit(next)
  moveActive(Math.min(i, props.length - 1), crossed)
}
const clearSlot = (i: number, stepBack = false) => {
  if (!cur[i]) {
    if (stepBack) jumpActive(i)
    return
  }
  const next = [...cur]
  next[i] = ''
  drive(i, 0)
  commit(next)
  if (stepBack) moveActive(i, [i])
}

const busy = () => props.disabled || draining || props.status === 'success'
const onKeyDown = (e: KeyboardEvent) => {
  if (busy() || e.metaKey || e.ctrlKey || e.altKey) return
  const k = e.key
  if (/^[0-9]$/.test(k)) {
    e.preventDefault()
    insert(k)
  } else if (k === 'Backspace') {
    e.preventDefault()
    if (slots.value[active.value]) clearSlot(active.value)
    else if (active.value > 0) clearSlot(active.value - 1, true)
  } else if (k === 'Delete') {
    e.preventDefault()
    clearSlot(active.value)
  } else if (k === 'ArrowLeft') {
    e.preventDefault()
    jumpActive(Math.max(active.value - 1, 0))
  } else if (k === 'ArrowRight') {
    e.preventDefault()
    jumpActive(Math.min(active.value + 1, props.length - 1))
  } else if (k === 'Home') {
    e.preventDefault()
    jumpActive(0)
  } else if (k === 'End') {
    e.preventDefault()
    jumpActive(props.length - 1)
  }
}
const onPaste = (e: ClipboardEvent) => {
  if (busy()) return
  e.preventDefault()
  insert(e.clipboardData?.getData('text') ?? '')
}
const onInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const d = digitsOf(input.value)
  input.value = ''
  if (busy() || !d) return
  insert(d, d.length === 1 ? active.value : 0)
}
const onRowMouseDown = (e: MouseEvent) => {
  if (props.disabled) return
  e.preventDefault()
  const row = rowRef.value
  if (row && !draining && props.status !== 'success') {
    const rect = row.getBoundingClientRect()
    const zoom = rect.width / (row.offsetWidth || rect.width) || 1
    const i = Math.floor((e.clientX - rect.left) / zoom / pitch.value)
    jumpActive(Math.max(0, Math.min(i, firstEmptyOf(cur))))
  }
  inputRef.value?.focus()
}

watch(
  () => props.length,
  () => {
    glide.clear()
    target = []
    const next = Array.from({ length: props.length }, (_, i) => cur[i] ?? '')
    setSlots(next)
    jumpActive(firstEmptyOf(next))
    const code = next.join('')
    if (code !== emitted) {
      emitted = code
      emit('change', code)
    }
  },
)

watch(
  () => [props.value, props.length],
  () => {
    if (props.value === undefined) return
    const clean = digitsOf(props.value).slice(0, props.length)
    if (clean === emitted) return
    emitted = clean
    const { mvs, drops } = springs.value
    const prev = cur
    const next = toSlots(clean, props.length)
    const hidden = prevStatus === 'success'
    const landing: number[] = []
    const leaving: number[] = []
    next.forEach((ch, i) => {
      if (ch === prev[i]) return
      ;(ch ? landing : leaving).push(i)
    })
    const step = reduce.value || hidden ? 0 : props.cascade
    landing.forEach((i, k) => land(i, k * step))
    leaving.reverse().forEach((i, k) => {
      if (hidden) {
        target[i] = 0
        mvs[i]!.jump(0)
        drops[i]!.jump(0)
      } else drive(i, 0, k * step)
    })
    setSlots(next)
    moveActive(firstEmptyOf(next), [...landing, ...leaving])
    if (!isFull(prev) && isFull(next)) emit('complete', clean)
  },
)

const syncSuccess = (status: CodeSlotsStatus) => {
  const { drops } = springs.value
  if (status === 'success') {
    veiled.value = true
    if (reduce.value) {
      openMv.jump(1)
      drops.forEach((d) => d.jump(1))
      checkMv.jump(1)
      return
    }
    animate(openMv, 1, { duration: WASH_IN, ease: EASE_OUT })
    drops.forEach((d, k) =>
      animate(d, 1, { type: 'spring', duration: 0.3, bounce: 0, delay: SINK_DELAY + k * SINK_STEP }),
    )
    animate(checkMv, 1, { type: 'spring', duration: 0.35, bounce: props.bounce, delay: CHECK_DELAY })
    return
  }
  if (prevStatus !== 'success') return
  if (reduce.value) {
    openMv.jump(0)
    checkMv.jump(0)
    drops.forEach((d) => d.jump(0))
    veiled.value = false
    return
  }
  animate(checkMv, 0, { duration: 0.15, ease: EASE_OUT })
  animate(openMv, 0, { duration: WASH_OUT, ease: EASE_OUT, delay: 0.06 }).then(() => {
    if (openMv.get() === 0) veiled.value = false
  })
  drops.forEach((d) => animate(d, 0, { type: 'spring', duration: 0.3, bounce: 0, delay: 0.1 }))
}

const syncError = (status: CodeSlotsStatus) => {
  if (status !== 'error') return
  const filled = cur.map((c, i) => (c ? i : -1)).filter((i) => i >= 0)
  if (!filled.length) return
  filled.reverse()
  draining = true
  const step = reduce.value ? 0 : props.cascade
  filled.forEach((i, k) => drive(i, 0, k * step))
  moveActive(
    0,
    cur.map((_, j) => j),
  )
  clearTimeout(drainTimer)
  drainTimer = setTimeout(
    () => {
      draining = false
      commit(Array.from({ length: props.length }, () => ''))
    },
    reduce.value ? 300 : (filled.length - 1) * step + props.settle * 1000,
  )
}

watch(
  () => props.status,
  (status) => {
    syncSuccess(status)
    syncError(status)
    prevStatus = status
  },
  { immediate: true },
)

onUnmounted(() => clearTimeout(drainTimer))
onMounted(() => {
  if (props.autoFocus) inputRef.value?.focus()
})
watch(
  () => props.autoFocus,
  (f) => {
    if (f) inputRef.value?.focus()
  },
)

const view = computed(() =>
  slots.value.length === props.length
    ? slots.value
    : Array.from({ length: props.length }, (_, i) => slots.value[i] ?? ''),
)
const showCaret = computed(
  () =>
    props.caret &&
    focused.value &&
    !props.disabled &&
    !veiled.value &&
    props.status !== 'success' &&
    (props.status === 'error' || !view.value[active.value]),
)

const rootStyle = computed(
  () =>
    ({
      '--cs-accent': props.accentColor,
      '--cs-ink': props.inkColor,
      '--cs-slot': props.slotColor,
      '--cs-digit': props.digitColor,
      '--cs-danger': props.dangerColor,
      '--cs-size': `${props.slotSize}px`,
      '--cs-height': `${height.value}px`,
      '--cs-gap': `${props.gap}px`,
      '--cs-radius': `${Math.min(props.radius, props.slotSize / 2)}px`,
      '--cs-font': `${Math.round(props.slotSize * 0.5)}px`,
    }) as CSSProperties,
)
</script>

<template>
  <div class="cs-root" :class="className" :style="rootStyle">
    <div
      ref="rowRef"
      class="cs-row"
      :data-status="status"
      :data-focused="focused ? '' : undefined"
      :data-disabled="disabled ? '' : undefined"
      @mousedown="onRowMouseDown"
    >
      <input
        ref="inputRef"
        class="cs-input"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        pattern="[0-9]*"
        value=""
        :maxlength="length"
        :aria-label="ariaLabel"
        :aria-invalid="status === 'error'"
        :aria-describedby="`${uid}-count`"
        :disabled="disabled"
        :readonly="status === 'success'"
        @keydown="onKeyDown"
        @paste="onPaste"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      />
      <CodeSlot
        v-for="(ch, i) in view"
        :key="`${length}-${i}`"
        :mv="springs.mvs[i]!"
        :drop="springs.drops[i]!"
        :char="mask && ch ? '•' : ch"
        :active="focused && i === active"
        :rise="rise"
        :sink="Math.round(height * 0.5)"
      />
      <motion.span class="cs-wash" aria-hidden="true" :style="{ clipPath: washClip }">
        <motion.span class="cs-check" :style="{ transform: checkTransform, opacity: checkOpacity }">
          <HugeiconsIcon
            :icon="Tick02Icon as IconArray"
            :size="Math.round(slotSize * 0.6)"
            :stroke-width="2.2"
          />
        </motion.span>
      </motion.span>
      <motion.span
        class="cs-caret"
        aria-hidden="true"
        :data-show="showCaret ? '' : undefined"
        :style="{ transform: caretTransform }"
      >
        <span :key="active" class="cs-caret-bar" />
      </motion.span>
    </div>
    <span :id="`${uid}-count`" class="cs-sr" aria-live="polite">
      {{
        status === 'success'
          ? 'Code accepted'
          : `${view.filter(Boolean).length} of ${length} digits entered`
      }}
    </span>
  </div>
</template>

<style scoped>
.cs-root {
  position: relative;
  display: inline-block;
}

.cs-row {
  position: relative;
  display: inline-flex;
  gap: var(--cs-gap);
  cursor: text;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 200ms ease;
}
.cs-row[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.cs-input {
  position: absolute;
  inset: 0;
  z-index: 4;
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: transparent;
  font-size: 16px;
  opacity: 0;
  appearance: none;
  caret-color: transparent;
  cursor: inherit;
}

/* ---------- 单格 ---------- */
.cs-slot {
  position: relative;
  width: var(--cs-size);
  height: var(--cs-height);
  overflow: hidden;
  border-radius: var(--cs-radius);
  background: var(--cs-slot);
  user-select: none;
  transition: background-color 200ms ease;
}
.cs-slot[data-active] {
  background: color-mix(in srgb, var(--cs-ink) 8%, var(--cs-slot));
}
.cs-row[data-status='error'] .cs-slot,
.cs-row[data-status='error'] .cs-slot[data-active] {
  background: color-mix(in srgb, var(--cs-danger) 20%, var(--cs-slot));
}
@media (hover: hover) and (pointer: fine) {
  .cs-row[data-status='idle']:not([data-disabled]) .cs-slot:not([data-active]):hover {
    background: color-mix(in srgb, var(--cs-ink) 4%, var(--cs-slot));
  }
}

/* CodeSlot 用 h() 渲染：只有子组件根（.cs-slot）会拿到父 scope 标记，
   内部的填充/数字节点拿不到，故这两层必须用 :deep 穿透，否则填充不显示、
   数字退化成文档流文本并掉出格子。 */
.cs-row :deep(.cs-slot-fill) {
  position: absolute;
  inset: 0;
  transform-origin: center;
  border-radius: inherit;
  background: var(--cs-accent);
  transition: background-color 200ms ease;
}
.cs-row[data-status='error'] :deep(.cs-slot-fill) {
  background: var(--cs-danger);
}

.cs-row :deep(.cs-slot-digit) {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  color: var(--cs-digit);
  font-family: inherit;
  font-size: var(--cs-font);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 1;
}

/* ---------- 成功洗白 ---------- */
.cs-wash {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  border-radius: var(--cs-radius);
  background: var(--cs-accent);
  color: var(--cs-digit);
  opacity: 0;
  pointer-events: none;
}
.cs-row[data-status='success'] .cs-wash {
  opacity: 1;
}
.cs-check {
  display: grid;
  place-items: center;
}

/* ---------- 光标 ---------- */
.cs-caret {
  position: absolute;
  top: 25%;
  left: calc(var(--cs-size) / 2 - 0.75px);
  z-index: 3;
  width: 1.5px;
  height: 50%;
  opacity: 0;
  pointer-events: none;
}
.cs-caret[data-show] {
  opacity: 1;
}
.cs-caret-bar {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--cs-ink);
  animation: code-slots-blink 1s linear infinite;
}

.cs-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@keyframes code-slots-blink {
  0%,
  49.9% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cs-root :deep(.cs-slot-digit),
  .cs-check {
    transform: none !important;
    transition: opacity 150ms ease;
  }
  .cs-caret-bar {
    animation: none;
  }
}
</style>
