<!--
  SlingButton —— 弹弓按钮：按住拖拽拉弓、越过 armAt 阈值后松手发射（带粒子飞出）

  移植自 Vue Bits「SlingButton」
  (https://github.com/DavidHDev/vue-bits/blob/main/src/content/Micro/SlingButton/SlingButton.vue)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点（相对上游源码）：
  - 去 Tailwind：root / SVG / 弹带 / 粒子点 / 按钮的全部原子类（含大量
    group-data-[xxx] 任意属性选择器）改为 scoped CSS：
      group-data-[armed]/root:*  → .sling-btn[data-armed] .sling-btn__xxx
      group-data-[sent]/root:*   → .sling-btn[data-sent] .sling-btn__well
      group/pad 的 hover/held/armed 链 → 后代 + :not() 选择器
    `after:` 伪元素（扩大命中区的 -6px 外圈）翻成 ::after 真实规则
  - `.sr-only` 本项目无 Tailwind，在 scoped CSS 补齐；无障碍提示文案本地化为中文
    （上游硬编码英文 "Press Enter to send..."）
  - prefers-reduced-motion：沿用上游 useReducedMotion 处理（拉弓位移即时归零、
    发射不做粒子飞出、pad 缩放过渡禁用），另在 CSS 层给 face 补 transform: none
  - 无常驻 rAF：paint 经 schedulePaint 按需排队，粒子飞出走 WAAPI，不占 rAF 池
-->
<template>
  <span
    ref="rootRef"
    class="sling-btn"
    :class="[className, shape === 'pill' ? 'is-pill' : '']"
    :data-armed="armed ? '' : undefined"
    :data-sent="sent ? '' : undefined"
    :style="rootStyle"
  >
    <svg
      class="sling-btn__fx"
      :viewBox="`${-H} ${-H} ${2 * H} ${2 * H}`"
      aria-hidden="true"
    >
      <g ref="fxRef" style="opacity: 0">
        <path ref="bandRef" class="sling-btn__band" />
        <path ref="hotRef" class="sling-btn__hot" />
      </g>
      <circle v-if="props.shape === 'circle'" class="sling-btn__well" :r="wellR" />
      <circle
        v-if="props.shape === 'circle'"
        ref="arcRef"
        class="sling-btn__arc"
        :r="wellR"
        pathLength="1"
        stroke-dasharray="0 1"
        style="opacity: 0"
      />
    </svg>
    <span
      v-for="i in count"
      :key="i"
      :ref="el => (dotEls[i - 1] = el as HTMLSpanElement | null)"
      class="sling-btn__dot"
      aria-hidden="true"
    />
    <span ref="padWrapRef" class="sling-btn__padwrap">
      <button
        ref="padRef"
        type="button"
        class="sling-btn__pad"
        :aria-label="ariaLabel"
        :aria-describedby="hintId"
        :aria-disabled="disabled || undefined"
        :data-held="held ? '' : undefined"
        :data-armed="armed ? '' : undefined"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="release($event.pointerId, false)"
        @pointercancel="release($event.pointerId, true)"
        @lostpointercapture="release($event.pointerId, true)"
        @keydown="onKeyDown"
        @click="onClick"
      >
        <span class="sling-btn__face">
          <span ref="iconRef" class="sling-btn__icon">
            <slot>
              <HugeiconsIcon :icon="ArrowUp02Icon as IconArray" :size="Math.round(size * 0.4)" :stroke-width="2.2" />
            </slot>
          </span>
        </span>
      </button>
    </span>
    <span :id="hintId" class="sr-only">按 Enter 发送，或拖拽后松开发射。</span>
  </span>
</template>

<script setup lang="ts">
import { ArrowUp02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import type { IconArray } from '@hugeicons/vue'
import { motionValue, useReducedMotion } from 'motion-v'
import { gsap } from 'gsap'
import { computed, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import type { CSSProperties } from 'vue'

export type SlingAxis = 'any' | 'horizontal' | 'vertical'

interface SlingButtonProps {
  padColor?: string
  iconColor?: string
  accentColor?: string
  wellColor?: string
  bandColor?: string
  size?: number
  strokeWidth?: number
  armAt?: number
  maxPull?: number
  launchSpeed?: number
  recoil?: number
  flight?: number
  particles?: number
  spread?: number
  axis?: SlingAxis
  tapSends?: boolean
  disabled?: boolean
  ariaLabel?: string
  className?: string
  /** circle：圆形弹弓（上游默认）；pill：内容撑宽的圆角按钮（保留拖拽发射） */
  shape?: 'circle' | 'pill'
}

interface Sample {
  x: number
  y: number
  t: number
}

interface Grip {
  id: number
  startX: number
  startY: number
  scale: number
  moved: boolean
  hist: Sample[]
  rawOrigin: { x: number; y: number }
  slop: number
}

const GAP = 4
const SLOP = { fine: 4, coarse: 8 }
const FINGER_MAX = 3000
const HAND_MAX = 6000
const CANCEL = 0.5
const POWER_CAP = 1.5
const DOT_MS = 300
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const rubberband = (o: number, dim: number, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o))

const props = withDefaults(defineProps<SlingButtonProps>(), {
  padColor: '#f5f5f5',
  iconColor: '#18181b',
  accentColor: '#f5f5f5',
  wellColor: '#27272a',
  bandColor: '#52525b',
  size: 56,
  strokeWidth: 3,
  armAt: 48,
  maxPull: 160,
  launchSpeed: 2600,
  recoil: 0.2,
  flight: 120,
  particles: 14,
  spread: 60,
  axis: 'any',
  tapSends: true,
  disabled: false,
  ariaLabel: 'Send',
  className: '',
  shape: 'circle'
})

const emit = defineEmits<{ send: [] }>()

const reduce = useReducedMotion()
const R = computed(() => props.maxPull)
const ARM = computed(() => Math.min(props.armAt, 0.8 * R.value))
const wellR = computed(() => props.size / 2 + GAP + props.strokeWidth)
const padR = computed(() => props.size / 2 - props.strokeWidth / 2)
const H = computed(() => wellR.value + props.strokeWidth + 2)
const DOT = computed(() => Math.max(6, Math.round(props.size / 7)))
const count = computed(() => Math.max(0, Math.round(props.particles)))

const held = ref(false)
const armed = ref(false)
const sent = ref(false)
const rootRef = ref<HTMLSpanElement | null>(null)
const padRef = ref<HTMLButtonElement | null>(null)
const padWrapRef = ref<HTMLSpanElement | null>(null)
const fxRef = ref<SVGGElement | null>(null)
const bandRef = ref<SVGPathElement | null>(null)
const hotRef = ref<SVGPathElement | null>(null)
const arcRef = ref<SVGCircleElement | null>(null)
const iconRef = ref<HTMLSpanElement | null>(null)
const dotEls: (HTMLSpanElement | null)[] = []

let power = 0
let grip: Grip | null = null
let dir = { ux: 0, uy: -1 }
let settleTween: gsap.core.Tween | null = null
let armedNow = false
let dotPending = false
let dotTimer: ReturnType<typeof setTimeout> | undefined
let paintQueued = false
let skipClick = false
let sentTimer: ReturnType<typeof setTimeout> | undefined
let settleTimer: ReturnType<typeof setTimeout> | undefined
const offs: (() => void)[] = []
const hintId = useId()

const px = motionValue(0)
const py = motionValue(0)

const relaxIcon = () => {
  const icon = iconRef.value
  if (!icon) return
  icon.style.transition = reduce.value ? 'none' : 'transform 360ms cubic-bezier(0.23, 1, 0.32, 1)'
  icon.style.transform = 'rotate(0deg)'
}
const aimIcon = (ux: number, uy: number, dist: number) => {
  const icon = iconRef.value
  if (!icon) return
  const angle = (Math.atan2(-uy, -ux) * 180) / Math.PI + 90
  icon.style.transition = 'none'
  icon.style.transform = `rotate(${angle * clamp(dist / 12, 0, 1)}deg)`
}

const launchDot = () => {
  dotPending = false
  clearTimeout(dotTimer)
  const { ux, uy } = dir
  relaxIcon()
  const base = Math.atan2(-uy, -ux)
  const cone = (props.spread * Math.PI) / 180
  const push = 0.85 + 0.35 * power
  const well = wellR.value
  dotEls.slice(0, count.value).forEach((dot, i) => {
    if (!dot) return
    const lead = i === 0
    const angle = base + (lead ? 0 : (Math.random() + Math.random() - 1) * (cone / 2))
    const cx = Math.cos(angle)
    const cy = Math.sin(angle)
    const reach = (lead ? props.flight : props.flight * (0.3 + Math.random())) * push
    const drift = lead ? 0 : (Math.random() - 0.5) * props.flight * 0.4
    const scale = lead ? 1 : 0.3 + Math.random() * 0.6
    const shrink = lead ? 0.6 : scale * (0.2 + Math.random() * 0.4)
    const duration = lead ? DOT_MS : DOT_MS * (0.7 + Math.random())
    const delay = lead ? 0 : Math.random() * 70
    const to = well + reach
    dot.animate(
      [
        { transform: `translate(${cx * well}px, ${cy * well}px) scale(${scale})` },
        { transform: `translate(${cx * to - cy * drift}px, ${cy * to + cx * drift}px) scale(${shrink})` }
      ],
      { duration, delay, easing: EASE_OUT, fill: 'none' }
    )
    dot.animate(
      [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.55 },
        { opacity: 0, offset: 1 }
      ],
      { duration, delay, easing: 'linear', fill: 'none' }
    )
  })
}

// band, arc and pad follow the motion values by hand so a pull never waits on a render
const paint = () => {
  paintQueued = false
  const band = bandRef.value
  const hot = hotRef.value
  const arc = arcRef.value
  const fx = fxRef.value
  if (!band || !hot || !arc || !fx) return
  const x = px.get()
  const y = py.get()
  const { ux, uy } = dir
  const proj = x * ux + y * uy
  const p = clamp(proj / ARM.value, 0, 1)
  const dist = Math.hypot(x, y)
  let d = ''
  if (dist > 0.5) {
    const a = Math.atan2(y, x)
    const b = Math.acos(clamp((wellR.value - padR.value) / dist, -1, 1))
    d = [a + b, a - b]
      .map(t => {
        const cx = Math.cos(t)
        const cy = Math.sin(t)
        return `M${(wellR.value * cx).toFixed(2)},${(wellR.value * cy).toFixed(2)}L${(x + padR.value * cx).toFixed(2)},${(y + padR.value * cy).toFixed(2)}`
      })
      .join('')
  }
  band.setAttribute('d', d)
  hot.setAttribute('d', d)
  hot.style.opacity = String(p)
  fx.style.opacity = String(clamp(proj / 6, 0, 1))
  arc.setAttribute('stroke-dasharray', `${p} ${1 - p}`)
  arc.setAttribute('stroke-dashoffset', String(p / 2))
  arc.style.opacity = p > 0.01 ? '1' : '0'
  if (grip) aimIcon(ux, uy, dist)
  arc.setAttribute('transform', `rotate(${(Math.atan2(-uy, -ux) * 180) / Math.PI})`)
  if (dotPending && proj <= props.size / 4) launchDot()
}
const schedulePaint = () => {
  if (paintQueued) return
  paintQueued = true
  requestAnimationFrame(paint)
}
const movePad = () => {
  if (padWrapRef.value) padWrapRef.value.style.transform = `translate(${px.get()}px, ${py.get()}px)`
  schedulePaint()
}

onMounted(() => {
  offs.push(px.on('change', movePad), py.on('change', movePad))
  paint()
})
watch(
  () => [props.size, props.strokeWidth, props.armAt, props.maxPull, props.axis],
  () => {
    stopSettle()
    px.jump(0)
    py.jump(0)
    movePad()
    paint()
  },
  { flush: 'post' }
)

/**
 * 松手回弹：gsap elastic 弹回原位（拖得越远回弹越猛，观感即"弹射"）。
 * 不用 motion-v 的 animate(MotionValue, spring) —— 实测 2.8.0 该路径
 * 不驱动 MotionValue（600ms 后数值纹丝不动），弹弓会卡在拖拽位置不回弹。
 * MotionValue 经代理对象交给 gsap 驱动，onUpdate 写回 px/py。
 */
const settle = (v0: { x: number; y: number }) => {
  if (reduce.value) {
    const fx = fxRef.value
    if (fx) {
      fx.style.transition = 'opacity 200ms ease'
      fx.style.opacity = '0'
    }
    settleTimer = setTimeout(() => {
      px.jump(0)
      py.jump(0)
      if (fx) fx.style.transition = ''
    }, 200)
    return
  }
  stopSettle()
  const proxy = { x: px.get(), y: py.get() }
  const fling = Math.min(Math.hypot(v0.x, v0.y) / 4000, 1)
  settleTween = gsap.to(proxy, {
    x: 0,
    y: 0,
    duration: 0.55 + 0.25 * fling,
    ease: 'elastic.out(1, 0.42)',
    onUpdate: () => {
      px.set(proxy.x)
      py.set(proxy.y)
    },
    onComplete: () => {
      px.set(0)
      py.set(0)
      settleTween = null
    },
  })
}

const stopSettle = () => {
  settleTween?.kill()
  settleTween = null
}

const onPointerDown = (e: PointerEvent) => {
  if (props.disabled || grip || e.button !== 0) return
  const el = rootRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const scale = rect.width / (el.offsetWidth || rect.width) || 1
  stopSettle()
  const x = px.get()
  const y = py.get()
  const dNow = Math.hypot(x, y)
  const dClamped = Math.min(dNow, 0.95 * R.value)
  const rawNow = dNow > 0.5 ? (R.value * dClamped) / (R.value - dClamped) : 0
  grip = {
    id: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    scale,
    moved: false,
    hist: [],
    rawOrigin: dNow > 0.5 ? { x: (rawNow * x) / dNow, y: (rawNow * y) / dNow } : { x: 0, y: 0 },
    slop: e.pointerType === 'touch' ? SLOP.coarse : SLOP.fine
  }
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    // capture unavailable
  }
  held.value = true
}

const onPointerMove = (e: PointerEvent) => {
  const g = grip
  if (!g || g.id !== e.pointerId) return
  const dx = (e.clientX - g.startX) / g.scale
  const dy = (e.clientY - g.startY) / g.scale
  let rx = g.rawOrigin.x + dx
  let ry = g.rawOrigin.y + dy
  if (props.axis === 'horizontal') ry = rubberband(ry, props.size / 4)
  else if (props.axis === 'vertical') rx = rubberband(rx, props.size / 4)
  if (!g.moved && Math.hypot(dx, dy) > g.slop) g.moved = true
  const raw = Math.hypot(rx, ry)
  if (raw < 0.01) return
  const d = (R.value * raw) / (R.value + raw)
  const ux = rx / raw
  const uy = ry / raw
  dir = { ux, uy }
  px.set(d * ux)
  py.set(d * uy)
  const t = performance.now()
  g.hist.push({ x: d * ux, y: d * uy, t })
  while (g.hist.length > 4 || t - (g.hist[0]?.t ?? t) > 80) g.hist.shift()
  const isArmed = d >= ARM.value
  if (isArmed !== armedNow) {
    armedNow = isArmed
    armed.value = isArmed
  }
}

const release = (pointerId: number, cancelled: boolean) => {
  const g = grip
  if (!g || g.id !== pointerId) return
  grip = null
  skipClick = true
  try {
    padRef.value?.releasePointerCapture(pointerId)
  } catch {
    // already released
  }
  const d = Math.hypot(px.get(), py.get())
  const p = d / ARM.value
  const { ux, uy } = dir
  let vx = 0
  let vy = 0
  if (!cancelled && g.hist.length > 1) {
    const a = g.hist[0]
    const b = g.hist[g.hist.length - 1]
    if (a && b) {
      const dt = b.t - a.t
      if (dt > 0 && performance.now() - b.t < 50) {
        vx = ((b.x - a.x) / dt) * 1000
        vy = ((b.y - a.y) / dt) * 1000
      }
    }
  }
  const fm = Math.hypot(vx, vy)
  if (fm > FINGER_MAX) {
    vx *= FINGER_MAX / fm
    vy *= FINGER_MAX / fm
  }
  if (!g.moved) {
    relaxIcon()
    if (props.tapSends && !cancelled) emit('send')
  } else {
    const fire = armedNow && !cancelled
    const launch = fire ? props.launchSpeed * Math.min(p, POWER_CAP) : CANCEL * props.launchSpeed * Math.min(p, 1)
    let v0x = vx - ux * launch
    let v0y = vy - uy * launch
    const m = Math.hypot(v0x, v0y)
    if (m > HAND_MAX) {
      v0x *= HAND_MAX / m
      v0y *= HAND_MAX / m
    }
    if (!fire) relaxIcon()
    if (fire) {
      emit('send')
      if (reduce.value) {
        sent.value = true
        sentTimer = setTimeout(() => (sent.value = false), 200)
      } else {
        power = clamp((Math.min(p, POWER_CAP) - 1) / (POWER_CAP - 1), 0, 1)
        dotPending = true
        dotTimer = setTimeout(launchDot, 150)
      }
    }
    settle({ x: v0x, y: v0y })
  }
  armedNow = false
  held.value = false
  armed.value = false
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && grip) release(grip.id, true)
}
const onClick = () => {
  if (skipClick) {
    skipClick = false
    return
  }
  if (!props.disabled) emit('send')
}

onUnmounted(() => {
  stopSettle()
  clearTimeout(dotTimer)
  clearTimeout(sentTimer)
  clearTimeout(settleTimer)
  offs.forEach(off => off())
})

const rootStyle = computed(
  () =>
    ({
      '--sl-size': `${props.size}px`,
      '--sl-radius': props.shape === 'pill' ? '14px' : '9999px',
      '--sl-svg': `${2 * H.value}px`,
      '--sl-pad': props.padColor,
      '--sl-icon': props.iconColor,
      '--sl-accent': props.accentColor,
      '--sl-well': props.wellColor,
      '--sl-band': props.bandColor,
      '--sl-stroke': `${props.strokeWidth}px`,
      '--sl-dot': `${DOT.value}px`
    }) as CSSProperties
)
</script>

<style scoped>
.sling-btn {
  display: inline-block;
  position: relative;
  width: var(--sl-size);
  height: var(--sl-size);
}

/* pill：宽度由内容撑开，pad 成圆角按钮；拖拽几何仍按 --sl-size（高度）计算 */
.sling-btn.is-pill {
  width: auto;
}

.sling-btn__fx {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--sl-svg);
  height: var(--sl-svg);
  margin: calc(var(--sl-svg) / -2) 0 0 calc(var(--sl-svg) / -2);
  overflow: visible;
  pointer-events: none;
  shape-rendering: geometricPrecision;
}

.sling-btn__band,
.sling-btn__hot,
.sling-btn__arc {
  fill: none;
  stroke-linecap: round;
  stroke-width: var(--sl-stroke);
  transition: stroke-width 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.sling-btn__band {
  stroke: var(--sl-band);
}

.sling-btn__hot {
  stroke: var(--sl-accent);
}

.sling-btn__arc {
  stroke: var(--sl-accent);
  stroke-linecap: butt;
}

.sling-btn[data-armed] .sling-btn__band,
.sling-btn[data-armed] .sling-btn__hot,
.sling-btn[data-armed] .sling-btn__arc {
  stroke-width: calc(var(--sl-stroke) * 1.5);
}

.sling-btn__well {
  fill: var(--sl-well);
  transition: fill 200ms ease;
}

.sling-btn[data-sent] .sling-btn__well {
  fill: var(--sl-accent);
}

.sling-btn__dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--sl-dot);
  height: var(--sl-dot);
  margin: calc(var(--sl-dot) / -2) 0 0 calc(var(--sl-dot) / -2);
  border-radius: 9999px;
  opacity: 0;
  pointer-events: none;
  background: var(--sl-accent);
}

.sling-btn__padwrap {
  position: absolute;
  inset: 0;
}

.sling-btn.is-pill .sling-btn__padwrap {
  position: relative;
  inset: auto;
  height: var(--sl-size);
}

.sling-btn__pad {
  display: block;
  position: relative;
  margin: 0;
  padding: 0;
  border: 0;
  width: 100%;
  height: 100%;
  border-radius: var(--sl-radius);
  background: transparent;
  outline: none;
  cursor: grab;
  user-select: none;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

/* 扩大命中区的外圈（上游 after:-inset-1.5） */
.sling-btn__pad::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: inherit;
}

.sling-btn__pad[data-held] {
  cursor: grabbing;
}

.sling-btn__pad[aria-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.sling-btn__face {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: var(--sl-radius);
  background: var(--sl-pad);
  color: var(--sl-icon);
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.sling-btn.is-pill .sling-btn__face {
  padding: 0 30px;
  font-size: 0.9375rem;
  font-weight: 500;
  letter-spacing: 0;
  white-space: nowrap;
}

.sling-btn__pad[data-held] .sling-btn__face {
  transform: scale(0.97);
}

.sling-btn__pad[data-armed] .sling-btn__face {
  transform: scale(1.04);
}

@media (hover: hover) and (pointer: fine) {
  .sling-btn__pad:hover:not([data-held]):not([aria-disabled]) .sling-btn__face {
    transform: scale(1.02);
  }
}

.sling-btn__icon {
  display: inline-flex;
  will-change: transform;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sling-btn__face {
    transform: none !important;
    transition: none;
  }
}
</style>
