<script setup lang="ts">
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconArray } from '@hugeicons/vue'
import { animate, motionValue, useReducedMotion } from 'motion-v'
import { onMounted, onUnmounted, ref, useSlots, watch, type CSSProperties } from 'vue'

/**
 * SwipeToast（Vue Bits 移植，scoped CSS 重写）。
 *
 * 原版依赖 Tailwind arbitrary 变体（`data-[phase=closing]:...`），本仓无 Tailwind，
 * 故把状态变体全部展开为「data 属性 + scoped 选择器」，动画曲线、时长、拖拽物理、
 * fuse 计时逻辑保持原样。
 *
 * 关闭原因：timeout / swipe / action / close / escape / programmatic。
 */
type SwipeToastCloseReason =
  | 'timeout'
  | 'swipe'
  | 'action'
  | 'close'
  | 'escape'
  | 'programmatic'
type SwipeToastFuse = 'bottom' | 'top' | 'none'
type SwipeToastPhase = 'open' | 'closing' | 'gone'

interface SwipeToastProps {
  title?: string
  description?: string
  actionLabel?: string
  open?: boolean
  background?: string
  color?: string
  fuseColor?: string
  width?: number
  radius?: number
  slideMs?: number
  settleBounce?: number
  swipeDistance?: number
  duration?: number
  fuse?: SwipeToastFuse
  pauseOnHover?: boolean
  closeButton?: boolean
  inline?: boolean
  dismissible?: boolean
  className?: string
}

type Sample = [number, number]

interface Drag {
  id: number
  startY: number
  grab: number | null
  moved: boolean
  hist: Sample[]
}

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
const FLICK = 0.11
const DEAD_ZONE = 3
const RESIST_PX = 24
const COLLAPSE_MS = 200
const EXIT = 0.7
const BURN = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }]
const HAS_STARTING_STYLE = typeof window !== 'undefined' && 'CSSStartingStyleRule' in window

const rubberband = (over: number, dim: number, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))
const velocityOf = (hist: Sample[]) => {
  if (hist.length < 2) return 0
  const [t0, y0] = hist[0] as Sample
  const [t1, y1] = hist[hist.length - 1] as Sample
  return performance.now() - t1 > 100 ? 0 : (y1 - y0) / Math.max(1, t1 - t0)
}

const props = withDefaults(defineProps<SwipeToastProps>(), {
  title: 'File archived',
  description: '',
  actionLabel: '',
  open: true,
  background: '#27272a',
  color: '#f5f5f5',
  fuseColor: '#f5a524',
  width: 356,
  radius: 12,
  slideMs: 400,
  settleBounce: 0.2,
  swipeDistance: 40,
  duration: 4000,
  fuse: 'bottom',
  pauseOnHover: true,
  closeButton: false,
  inline: false,
  dismissible: true,
  className: '',
})

const emit = defineEmits<{ action: []; close: [reason: SwipeToastCloseReason] }>()

const slots = useSlots()
const reduce = useReducedMotion()
const phase = ref<SwipeToastPhase>('open')
const instant = ref(false)
const mounted = ref(HAS_STARTING_STYLE)
const cardRef = ref<HTMLDivElement | null>(null)
const fuseRef = ref<HTMLElement | null>(null)

let anim: Animation | null = null
let drag: Drag | null = null
const flags = { hover: false, interacting: false, focus: false, hidden: false }
let lastInput: 'pointer' | 'keyboard' = 'pointer'
let pendingClose: SwipeToastCloseReason | null = null
let closeTimer: ReturnType<typeof setTimeout> | undefined
let leaving = false
let frame = 0
const offs: (() => void)[] = []

// fuse 的 post watcher 要拿到 ref，用这个标志延后而不是立即跑
const refsReady = ref(false)
const y = motionValue(0)
const fade = motionValue(1)

const syncFuse = () => {
  const a = anim
  if (!a) return
  if (flags.hover || flags.interacting || flags.focus || flags.hidden) a.pause()
  else if (a.playState === 'paused') a.play()
}
const finish = (why: SwipeToastCloseReason) => {
  phase.value = 'gone'
  leaving = false
  if (props.inline) closeTimer = setTimeout(() => emit('close', why), COLLAPSE_MS)
  else emit('close', why)
}
const close = (why: SwipeToastCloseReason) => {
  if (phase.value !== 'open' || leaving) return
  if (drag) {
    pendingClose = why
    return
  }
  anim?.pause()
  const now = why === 'escape' || ((why === 'action' || why === 'close') && lastInput === 'keyboard')
  instant.value = now
  phase.value = 'closing'
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => finish(why), now ? 0 : props.slideMs * EXIT + 60)
}
const rescue = () => {
  clearTimeout(closeTimer)
  instant.value = false
  y.set(0)
  fade.set(1)
  phase.value = 'open'
}

watch(
  () => props.open,
  (open) => {
    if (!open) close('programmatic')
    else if (phase.value !== 'open') rescue()
  },
  { immediate: true },
)
watch(
  [phase, () => props.duration, refsReady],
  (_v, _o, onCleanup) => {
    if (phase.value !== 'open' || props.duration <= 0 || !fuseRef.value) return
    anim?.cancel()
    const a = fuseRef.value.animate(BURN, {
      duration: props.duration,
      easing: 'linear',
      fill: 'forwards',
    })
    a.onfinish = () => close('timeout')
    anim = a
    syncFuse()
    onCleanup(() => {
      a.onfinish = null
      a.pause()
    })
  },
  { flush: 'post' },
)
watch(
  () => props.pauseOnHover,
  (on) => {
    if (!on) {
      flags.hover = false
      syncFuse()
    }
  },
)

onMounted(() => {
  refsReady.value = true
  if (!HAS_STARTING_STYLE) frame = requestAnimationFrame(() => (mounted.value = true))
  // transform / opacity 直写 style，拖拽期间不触发 Vue 渲染
  offs.push(
    y.on('change', (v: number) => {
      if (cardRef.value) cardRef.value.style.transform = `translateY(${v}px)`
    }),
    fade.on('change', (v: number) => {
      if (cardRef.value) cardRef.value.style.opacity = String(v)
    }),
  )
  const onVisibility = () => {
    flags.hidden = document.hidden
    syncFuse()
  }
  document.addEventListener('visibilitychange', onVisibility)
  offs.push(() => document.removeEventListener('visibilitychange', onVisibility))
})
onUnmounted(() => {
  cancelAnimationFrame(frame)
  clearTimeout(closeTimer)
  anim?.cancel()
  offs.forEach((off) => off())
  y.stop()
  fade.stop()
})

const swipeOut = (dy: number, v: number) => {
  anim?.pause()
  leaving = true
  pendingClose = null
  if (!reduce.value && cardRef.value) {
    animate(y, dy + cardRef.value.offsetHeight, {
      type: 'spring',
      duration: 0.3,
      bounce: 0,
      velocity: v * 1000,
    })
  }
  animate(fade, 0, { duration: 0.2, ease: EASE_OUT }).then(() => finish('swipe'))
}
const onPointerDown = (e: PointerEvent) => {
  lastInput = 'pointer'
  if (
    e.button !== 0 ||
    !props.dismissible ||
    drag ||
    leaving ||
    (e.target as HTMLElement).closest('button')
  )
    return
  if (phase.value === 'closing') rescue()
  try {
    cardRef.value?.setPointerCapture(e.pointerId)
  } catch {
    // capture unavailable
  }
  y.stop()
  drag = {
    id: e.pointerId,
    startY: e.clientY,
    grab: null,
    moved: false,
    hist: [[performance.now(), y.get()]],
  }
  flags.interacting = true
  syncFuse()
}
const onPointerMove = (e: PointerEvent) => {
  const d = drag
  if (!d || d.id !== e.pointerId) return
  if (d.grab === null) {
    if (Math.abs(e.clientY - d.startY) < DEAD_ZONE) return
    d.grab = e.clientY - y.get()
    if (cardRef.value) cardRef.value.dataset.swiping = ''
  }
  const raw = e.clientY - d.grab
  const next = raw >= 0 ? raw : rubberband(raw, RESIST_PX)
  y.set(next)
  d.moved = true
  d.hist.push([performance.now(), next])
  if (d.hist.length > 4) d.hist.shift()
}
const onPointerUp = (e: PointerEvent) => {
  const d = drag
  if (!d || d.id !== e.pointerId) return
  drag = null
  if (cardRef.value) delete cardRef.value.dataset.swiping
  try {
    cardRef.value?.releasePointerCapture(e.pointerId)
  } catch {
    // already released
  }
  flags.interacting = false
  const dy = y.get()
  const v = velocityOf(d.hist)
  if (dy > 0 && (v > FLICK || (dy >= props.swipeDistance && v >= 0))) {
    swipeOut(dy, v)
    return
  }
  if (d.moved) {
    animate(
      y,
      0,
      reduce.value
        ? { duration: 0.2, ease: EASE_OUT }
        : { type: 'spring', duration: 0.5, bounce: props.settleBounce, velocity: v * 1000 },
    )
  }
  const queued = pendingClose
  pendingClose = null
  if (queued) close(queued)
  else syncFuse()
}
const onPointerEnter = (e: PointerEvent) => {
  if (props.pauseOnHover && e.pointerType === 'mouse') {
    flags.hover = true
    syncFuse()
  }
}
const onPointerLeave = (e: PointerEvent) => {
  if (e.pointerType === 'mouse') {
    flags.hover = false
    syncFuse()
  }
}
const onFocusIn = () => {
  flags.focus = true
  syncFuse()
}
const onFocusOut = (e: FocusEvent) => {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) {
    flags.focus = false
    syncFuse()
  }
}
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') lastInput = 'keyboard'
  if (e.key === 'Escape' && props.dismissible) {
    e.stopPropagation()
    close('escape')
  }
}
const onAction = () => {
  emit('action')
  close('action')
}

const cancelIcon = Cancel01Icon as unknown as IconArray

const rootStyle = () =>
  ({
    '--st-bg': props.background,
    '--st-ink': props.color,
    '--st-fuse': props.fuseColor,
    '--st-w': `${props.width}px`,
    '--st-radius': `${props.radius}px`,
    '--st-slide': `${props.slideMs}ms`,
    '--st-gap': '10px',
  }) as CSSProperties
</script>

<template>
  <div
    class="st-root"
    :class="className"
    :data-phase="phase"
    :data-inline="inline ? 'true' : 'false'"
    :data-fuse="duration > 0 ? fuse : 'none'"
    :data-dismissible="dismissible ? 'true' : 'false'"
    :data-instant="instant ? '' : undefined"
    :data-mounted="mounted ? 'true' : 'false'"
    :style="rootStyle()"
  >
    <div class="st-collapse">
      <div class="st-anim">
        <div
          ref="cardRef"
          class="st-card"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          tabindex="0"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @pointerenter="onPointerEnter"
          @pointerleave="onPointerLeave"
          @focusin="onFocusIn"
          @focusout="onFocusOut"
          @keydown="onKeyDown"
        >
          <span v-if="slots.icon" class="st-icon" aria-hidden="true">
            <slot name="icon" />
          </span>
          <span class="st-body">
            <span class="st-title">{{ title }}</span>
            <span v-if="description" class="st-desc">{{ description }}</span>
          </span>
          <button v-if="actionLabel" type="button" class="st-action" @click="onAction">
            {{ actionLabel }}
          </button>
          <button v-if="closeButton" type="button" class="st-close" aria-label="Close" @click="close('close')">
            <HugeiconsIcon :icon="cancelIcon" :size="12" :stroke-width="2.5" />
          </button>
          <i ref="fuseRef" class="st-fuse" aria-hidden="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.st-root {
  display: grid;
  grid-template-rows: 1fr;
  width: min(var(--st-w), 100%);
  color: var(--st-ink);
  font-size: 13px;
  line-height: normal;
}

/* 非 inline：固定到视口右下，让出安全区 */
.st-root[data-inline='false'] {
  position: fixed;
  right: 32px;
  bottom: calc(32px + env(safe-area-inset-bottom, 0px));
  z-index: 999999999;
  width: min(var(--st-w), calc(100vw - 64px));
}
@media (max-width: 600px) {
  .st-root[data-inline='false'] {
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    width: min(var(--st-w), calc(100vw - 32px));
  }
}

/* inline：高度折叠进父流 */
.st-root[data-inline='true'] {
  transition: grid-template-rows var(--st-slide) cubic-bezier(0.23, 1, 0.32, 1);
}
.st-root[data-inline='true'][data-mounted='false'],
.st-root[data-inline='true'][data-phase='closing'],
.st-root[data-inline='true'][data-phase='gone'] {
  grid-template-rows: 0fr;
}
.st-root[data-inline='true'][data-phase='closing'] {
  transition-duration: calc(var(--st-slide) * 0.7);
}
.st-root[data-inline='true'][data-phase='gone'] {
  transition-duration: 200ms;
}
.st-collapse {
  min-height: 0;
}

/* 卡片升降 */
.st-anim {
  opacity: 1;
  transform: translateY(0);
  transition:
    transform var(--st-slide) cubic-bezier(0.23, 1, 0.32, 1),
    opacity calc(var(--st-slide) * 0.6) ease;
}
.st-root[data-inline='true'] .st-anim {
  margin-top: var(--st-gap);
}
.st-root[data-mounted='false'] .st-anim,
.st-root[data-phase='closing'] .st-anim,
.st-root[data-phase='gone'] .st-anim {
  opacity: 0;
  transform: translateY(100%);
}
.st-root[data-phase='gone'] .st-anim {
  visibility: hidden;
}
.st-root[data-phase='closing'] .st-anim {
  transition:
    transform calc(var(--st-slide) * 0.7) cubic-bezier(0.23, 1, 0.32, 1),
    opacity calc(var(--st-slide) * 0.5) ease;
}
.st-root[data-instant] .st-anim {
  transition-duration: 0s;
}
@starting-style {
  .st-anim {
    opacity: 0;
    transform: translateY(100%);
  }
}

/* 卡片本体 */
.st-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  overflow: hidden;
  border-radius: var(--st-radius);
  background: var(--st-bg);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 4px 12px rgba(0, 0, 0, 0.1);
  outline: none;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
.st-root[data-dismissible='false'] .st-card {
  cursor: default;
  touch-action: auto;
}
.st-card[data-swiping] {
  cursor: grabbing;
}

.st-icon {
  display: inline-flex;
  flex: none;
  width: 18px;
  height: 18px;
}
.st-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.st-body {
  display: flex;
  flex: auto;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.st-title {
  font-weight: 500;
  line-height: normal;
}
.st-desc {
  font-weight: 400;
  line-height: 1.4;
  color: color-mix(in srgb, var(--st-ink) 66%, transparent);
}

.st-action {
  flex: none;
  height: 24px;
  padding: 0 8px;
  border: 0;
  border-radius: 5px;
  background: var(--st-ink);
  color: var(--st-bg);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 160ms ease;
}
.st-action:active {
  transform: scale(0.97);
}
@media (hover: hover) and (pointer: fine) {
  .st-action:hover {
    opacity: 0.88;
  }
}

.st-close {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font-family: inherit;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 160ms ease;
}
.st-close::before {
  content: '';
  position: absolute;
  inset: -8px;
}
.st-close:active {
  transform: scale(0.97);
}
@media (hover: hover) and (pointer: fine) {
  .st-close:hover {
    background: color-mix(in srgb, var(--st-ink) 10%, transparent);
  }
}

/* fuse：烧完即关闭的进度线 */
.st-fuse {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  transform-origin: left;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--st-fuse) 18%, transparent) 9%,
    color-mix(in srgb, var(--st-fuse) 50%, transparent) 18%,
    color-mix(in srgb, var(--st-fuse) 84%, transparent) 28%,
    var(--st-fuse) 38%,
    var(--st-fuse) 62%,
    color-mix(in srgb, var(--st-fuse) 84%, transparent) 72%,
    color-mix(in srgb, var(--st-fuse) 50%, transparent) 82%,
    color-mix(in srgb, var(--st-fuse) 18%, transparent) 91%,
    transparent 100%
  );
}
.st-root[data-fuse='top'] .st-fuse {
  top: 0;
  bottom: auto;
}
.st-root[data-fuse='none'] .st-fuse {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .st-anim {
    transform: none !important;
    transition: opacity 200ms ease;
  }
  .st-action:active,
  .st-close:active {
    transform: none;
  }
}
</style>
