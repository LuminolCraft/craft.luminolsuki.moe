<!--
  DodgeField —— 「逃跑按钮」：鼠标靠近会躲，躲满 patience 次后 relent 停下

  移植自 Vue Bits「DodgeField」
  (https://github.com/DavidHDev/vue-bits/blob/main/src/content/Micro/DodgeField/DodgeField.vue)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点（相对上游源码）：
  - 去 Tailwind：field / mover / 默认按钮 / 提示文案的全部原子类改为 scoped CSS；
    group-data-[xxx] 选择器翻成 `.dodge-field__mover[data-xxx='true']` 后代选择器
  - 默认插槽按钮完整保留（含 taunts 轮换、relent/caught 变色），自定义插槽时
    按钮内容与样式由调用方负责（slot props: dodges / gave / caught / fleeing）
  - 触屏/无悬停环境：沿用上游 matchMedia('(hover: hover) and (pointer: fine)')
    门控，coarse pointer 下不躲不逃、正常可点
  - prefers-reduced-motion：useReducedMotion → still 态（不躲、位移归零），
    active 态的 transform 过渡在 motion-reduce 下禁用
  - 点击语义：click 绑在 mover 上（含键盘 Enter 经内部 button 冒泡），
    caught 态持续 760ms 后自动复位
-->
<template>
  <div
    ref="fieldRef"
    class="dodge-field"
    :class="className"
    :data-coarse="fine ? undefined : ''"
    :data-flat="reduce ? '' : undefined"
    :style="fieldStyle"
  >
    <motion.div
      ref="moverRef"
      class="dodge-field__mover"
      :style="{ transform }"
      :data-fled="state.fleeing ? 'true' : 'false'"
      :data-relented="gave ? 'true' : 'false'"
      :data-caught="caught ? 'true' : 'false'"
      @click="handleClick"
    >
      <slot v-bind="state">
        <button type="button" class="dodge-btn" :aria-label="taunts[0]">
          <span class="dodge-btn__stack">
            <span
              v-for="(taunt, i) in taunts"
              :key="`${taunt}-${i}`"
              class="dodge-btn__taunt"
              :data-active="i === activeTaunt ? 'true' : 'false'"
              aria-hidden="true"
            >
              {{ taunt }}
            </span>
          </span>
        </button>
      </slot>
    </motion.div>
    <p v-if="!fine && notice" class="dodge-field__notice">{{ notice }}</p>
  </div>
</template>

<script setup lang="ts">
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion-v'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ComponentPublicInstance, CSSProperties } from 'vue'

export type DodgeAxis = 'both' | 'x' | 'y'
export type DodgeWall = 'clamp' | 'bounce'
export type DodgeFieldState = { dodges: number; gave: boolean; caught: boolean; fleeing: boolean }

interface DodgeFieldProps {
  taunts?: string[]
  notice?: string
  inkColor?: string
  contrastColor?: string
  fieldHeight?: number
  reach?: number
  radius?: number
  falloff?: number
  fleeDuration?: number
  returnDuration?: number
  returnBounce?: number
  axis?: DodgeAxis
  wall?: DodgeWall
  patience?: number
  disabled?: boolean
  className?: string
}

const COUNT_LINE = 0.55
const DEAD_ZONE = 6
const CAUGHT_HOLD_MS = 760
const INSET = 12

const wallIt = (t: number, room: number, wall: DodgeWall) => {
  if (wall === 'bounce') {
    if (t > room) return Math.max(-room, 2 * room - t)
    if (t < -room) return Math.min(room, -2 * room - t)
    return t
  }
  return Math.min(room, Math.max(-room, t))
}
const bearingOf = (dx: number, dy: number, d: number, axis: DodgeAxis) => {
  if (axis === 'x') return { x: Math.sign(dx) || 1, y: 0 }
  if (axis === 'y') return { x: 0, y: Math.sign(dy) || 1 }
  return { x: dx / d, y: dy / d }
}

const props = withDefaults(defineProps<DodgeFieldProps>(), {
  taunts: () => ['Catch me', 'Nope', 'Too slow', 'Almost', 'Okay, okay'],
  notice: '',
  inkColor: '#f5f5f5',
  contrastColor: '#18181b',
  fieldHeight: 240,
  reach: 72,
  radius: 120,
  falloff: 2,
  fleeDuration: 130,
  returnDuration: 620,
  returnBounce: 0.1,
  axis: 'both',
  wall: 'clamp',
  patience: 4,
  disabled: false,
  className: ''
})

const emit = defineEmits<{ dodge: [count: number]; relent: []; catch: [] }>()

const fieldRef = ref<HTMLDivElement | null>(null)
const moverRef = ref<ComponentPublicInstance | HTMLDivElement | null>(null)
const x = useMotionValue(0)
const y = useMotionValue(0)
const transform = useTransform([x, y], ([tx, ty]: number[]) => `translate(${tx}px, ${ty}px)`)
const reduce = useReducedMotion()
const fine = ref(true)
const inside = ref(false)
const dodges = ref(0)
const caught = ref(false)
const gave = computed(() => dodges.value >= Math.max(1, props.patience))
const still = computed(() => gave.value || caught.value || props.disabled || !!reduce.value)

let pointer: { x: number; y: number } | null = null
let bearing = { x: 1, y: 0 }
let armed = true
const room = { x: 0, y: 0 }
let raf = 0
let hold: ReturnType<typeof setTimeout> | undefined
let observer: ResizeObserver | null = null
let cleanupPointer: (() => void) | null = null

const moverEl = () => {
  const m = moverRef.value as (ComponentPublicInstance & { $el?: HTMLElement }) | HTMLElement | null
  return (m && '$el' in m ? m.$el : m) as HTMLElement | null
}

const measure = () => {
  const field = fieldRef.value
  const mover = moverEl()
  if (!field || !mover) return
  room.x = Math.max(0, (field.clientWidth - mover.offsetWidth) / 2 - INSET)
  room.y = Math.max(0, (field.clientHeight - mover.offsetHeight) / 2 - INSET)
}

const frame = () => {
  raf = 0
  const field = fieldRef.value
  const p = pointer
  if (!field) return
  const rect = field.getBoundingClientRect()
  const zoom = rect.width / (field.offsetWidth || rect.width) || 1
  const dx = p ? (p.x - (rect.left + rect.width / 2)) / zoom : Infinity
  const dy = p ? (p.y - (rect.top + rect.height / 2)) / zoom : Infinity
  const d = Math.hypot(dx, dy)
  const isInside = d <= props.radius
  if (!isInside && !inside.value) return
  if (!still.value) {
    if (d < props.radius * COUNT_LINE) {
      if (armed) {
        armed = false
        dodges.value += 1
      }
    } else if (d > props.radius) {
      armed = true
    }
  }
  if (Number.isFinite(d) && d > DEAD_ZONE) bearing = bearingOf(dx, dy, d, props.axis)
  const flee = isInside && !still.value ? (1 - d / props.radius) ** props.falloff : 0
  const tx = wallIt(-bearing.x * flee * props.reach, room.x, props.wall)
  const ty = wallIt(-bearing.y * flee * props.reach, room.y, props.wall)
  if (reduce.value) {
    x.jump(0)
    y.jump(0)
  } else {
    const cfg =
      flee > 0
        ? { type: 'spring' as const, duration: props.fleeDuration / 1000, bounce: 0 }
        : { type: 'spring' as const, duration: props.returnDuration / 1000, bounce: props.returnBounce }
    animate(x, tx, cfg)
    animate(y, ty, cfg)
  }
  if (isInside !== inside.value) inside.value = isInside
}
const schedule = () => {
  if (!raf) raf = requestAnimationFrame(frame)
}

const bindPointer = () => {
  cleanupPointer?.()
  const query = window.matchMedia('(hover: hover) and (pointer: fine)')
  const sync = () => (fine.value = query.matches)
  sync()
  query.addEventListener('change', sync)
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    pointer = { x: e.clientX, y: e.clientY }
    schedule()
  }
  const onLeave = () => {
    pointer = null
    schedule()
  }
  const listening = query.matches && !props.disabled
  if (listening) {
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
  }
  cleanupPointer = () => {
    query.removeEventListener('change', sync)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('scroll', schedule, { capture: true })
    document.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('blur', onLeave)
    cancelAnimationFrame(raf)
    raf = 0
  }
}

onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (fieldRef.value) observer.observe(fieldRef.value)
  const mover = moverEl()
  if (mover) observer.observe(mover)
  bindPointer()
  schedule()
})
watch(() => props.disabled, bindPointer, { flush: 'post' })
watch(still, schedule, { flush: 'post' })
watch(dodges, n => {
  if (n) emit('dodge', n)
})
watch(gave, g => {
  if (g) emit('relent')
})
onUnmounted(() => {
  observer?.disconnect()
  cleanupPointer?.()
  clearTimeout(hold)
})

const handleClick = () => {
  caught.value = true
  emit('catch')
  clearTimeout(hold)
  hold = setTimeout(() => {
    caught.value = false
    dodges.value = 0
    armed = false
  }, CAUGHT_HOLD_MS)
}

const state = computed<DodgeFieldState>(() => ({
  dodges: dodges.value,
  gave: gave.value,
  caught: caught.value,
  fleeing: inside.value && !still.value
}))
const activeTaunt = computed(() =>
  gave.value || caught.value ? props.taunts.length - 1 : Math.min(dodges.value, Math.max(0, props.taunts.length - 2))
)

const fieldStyle = computed(
  () =>
    ({
      '--df-ink': props.inkColor,
      '--df-contrast': props.contrastColor,
      '--df-height': `${props.fieldHeight}px`,
      '--df-ease-out': 'cubic-bezier(0.23, 1, 0.32, 1)'
    }) as CSSProperties
)
</script>

<style scoped>
.dodge-field {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: var(--df-height);
}

.dodge-field__mover {
  display: inline-grid;
  will-change: transform;
}

/* ---- 默认插槽按钮（自定义插槽时不渲染） ---- */

.dodge-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 28px;
  border: 0;
  border-radius: 9999px;
  height: 52px;
  font-family: inherit;
  font-size: 18px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.012em;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  background: color-mix(in srgb, var(--df-ink) 8%, transparent);
  color: color-mix(in srgb, var(--df-ink) 72%, transparent);
  transition:
    transform 160ms var(--df-ease-out),
    background-color 220ms ease,
    color 220ms ease;
}

.dodge-btn:active {
  transform: scale(0.97);
}

@media (hover: hover) and (pointer: fine) {
  .dodge-btn:hover {
    color: color-mix(in srgb, var(--df-ink) 90%, transparent);
  }
}

.dodge-field__mover[data-relented='true'] .dodge-btn {
  color: var(--df-ink);
}

.dodge-field__mover[data-caught='true'] .dodge-btn {
  background: var(--df-ink);
  color: var(--df-contrast);
}

.dodge-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--df-ink) 60%, transparent);
  outline-offset: 3px;
}

.dodge-btn__stack {
  display: grid;
}

.dodge-btn__taunt {
  grid-area: 1 / 1;
  white-space: nowrap;
  transition:
    opacity 200ms ease,
    filter 200ms ease;
}

.dodge-btn__taunt[data-active='false'] {
  opacity: 0;
  filter: blur(2px);
}

/* ---- coarse pointer 提示 ---- */

.dodge-field__notice {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12px;
  margin: 0;
  font-size: 12px;
  text-align: center;
  pointer-events: none;
  color: color-mix(in srgb, var(--df-ink) 55%, transparent);
}

/* ---- reduced motion ---- */

@media (prefers-reduced-motion: reduce) {
  .dodge-btn {
    transition:
      background-color 220ms ease,
      color 220ms ease;
  }

  .dodge-btn:active {
    transform: none;
  }

  .dodge-btn__taunt {
    transition: opacity 200ms ease;
  }

  .dodge-btn__taunt[data-active='false'] {
    filter: none;
  }
}
</style>
