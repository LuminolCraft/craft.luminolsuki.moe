<!--
  GallerySection —— 服务器截图带（影院式）

  与首页其他区块不同，这一带刻意 bleed 到视口左右边缘：
  舞台用负 margin 撑满视口，两侧各放一层 Vue Bits「GradualBlur」做渐隐过渡。
  截图渲染两份，滚过一半时把 scrollLeft 拨回原点实现无缝循环自动滚动。
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import HomeGradualBlur from '@/components/home/fx/HomeGradualBlur.vue'
import { SHOTS } from '@/config/home-content'

const rootRef = ref<HTMLElement | null>(null)
const railEl = ref<HTMLElement | null>(null)
const progressBarEl = ref<HTMLElement | null>(null)

/** 微调点：RAIL_SPEED 自动滚动速度（px/s）· RAIL_IDLE_DELAY 用户操作后交还自动滚动的延迟（ms） */
const RAIL_SPEED = 26
const RAIL_IDLE_DELAY = 1600
/** 每帧速度衰减系数：0.94 与 Lenis 的指数缓出手感接近 */
const RAIL_DECAY = 0.94
/** 低于该速度（px/ms）认为惯性结束，交还自动滚动 */
const RAIL_MIN_VELOCITY = 0.02
/** 估速度用的采样窗口（ms） */
const RAIL_SAMPLE_WINDOW = 100
/** 松手速度上限（px/ms），避免甩得太野 */
const RAIL_MAX_VELOCITY = 1.2

const railDragging = ref(false)
const railImages = computed(() => [...SHOTS, ...SHOTS])

const reducedMotion = computed(() => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

let railQueued = false
let railScrollRaf = 0
let railTickRaf = 0
let railResumeAt = 0
let railLastTs = 0
let railAutoLeft: number | null = null
let railPointerId: number | null = null
let railLastX = 0
let railIdleTimer: number | null = null
/** 松手后的惯性速度（px/ms，负值 = 往右推进） */
let railVelocity = 0
/** 拖动中最近的位移样本，用来在松手瞬间估速度 */
let railSamples: Array<{ t: number; left: number }> = []

/** 顶部进度线：读 scrollLeft，用 scaleX 表示，合并到一帧里写 */
function handleRailScroll(): void {
  if (railQueued) return
  railQueued = true
  railScrollRaf = window.requestAnimationFrame(() => {
    railQueued = false
    const rail = railEl.value
    const bar = progressBarEl.value
    if (!rail || !bar) return
    const half = rail.scrollWidth / 2
    const p = half > 0 ? (rail.scrollLeft % half) / half : 0
    gsap.set(bar, { scaleX: Math.min(1, Math.max(0, p)) })
  })
}

/** 自动滚动期间关吸附，用户操作期间开吸附 */
function setRailSnap(enabled: boolean): void {
  const rail = railEl.value
  if (!rail) return
  rail.style.scrollSnapType = enabled ? '' : 'none'
}

/** 用户刚操作过：开吸附，并安排一次「交还自动滚动」 */
function markRailUserActive(): void {
  setRailSnap(true)
  railResumeAt = Number.POSITIVE_INFINITY
  if (railIdleTimer) window.clearTimeout(railIdleTimer)
  railIdleTimer = window.setTimeout(() => {
    railIdleTimer = null
    if (railDragging.value) return
    setRailSnap(false)
    railResumeAt = 0
    railLastTs = 0
  }, RAIL_IDLE_DELAY)
}

/** 无缝循环：滚到边界就把 scrollLeft 拨回另一半 */
function queueWrap(rail: HTMLElement): void {
  const half = rail.scrollWidth / 2
  if (half <= 0) return
  if (rail.scrollLeft >= half * 2) rail.scrollLeft -= half
  else if (rail.scrollLeft < 0) rail.scrollLeft += half
}

function railTick(ts: number): void {
  railTickRaf = window.requestAnimationFrame(railTick)
  const rail = railEl.value
  if (!rail) return

  // 拖动中不推进；惯性阶段 railResumeAt 已归零，会往下走
  if (reducedMotion.value || railDragging.value) {
    railLastTs = ts
    railAutoLeft = null
    return
  }
  if (performance.now() < railResumeAt && Math.abs(railVelocity) < RAIL_MIN_VELOCITY) {
    railLastTs = ts
    railAutoLeft = null
    return
  }
  if (!railLastTs) {
    railLastTs = ts
    return
  }

  const dt = Math.min(64, ts - railLastTs) / 1000
  railLastTs = ts

  // 关键：scrollLeft 会被浏览器量化成整数。每帧只加 0.4px 再读回来会被截断成 0，
  // 位置永远不动。所以自己维护浮点位置，累计够 1px 再写回。
  if (railAutoLeft === null) railAutoLeft = rail.scrollLeft

  if (Math.abs(railVelocity) > RAIL_MIN_VELOCITY) {
    // 惯性阶段：速度按帧指数衰减，归零后交还自动滚动
    railAutoLeft += railVelocity * 1000 * dt
    railVelocity *= RAIL_DECAY
    if (performance.now() >= railResumeAt) railResumeAt = 0
  } else {
    railVelocity = 0
    railAutoLeft += RAIL_SPEED * dt
  }

  const target = Math.floor(railAutoLeft)
  if (target !== rail.scrollLeft) rail.scrollLeft = target
  queueWrap(rail)
}

function onRailPointerDown(event: PointerEvent): void {
  const rail = railEl.value
  if (!rail || event.button !== 0) return
  railDragging.value = true
  railPointerId = event.pointerId
  railLastX = event.clientX
  railVelocity = 0
  railSamples = [{ t: performance.now(), left: rail.scrollLeft }]
  markRailUserActive()
  rail.setPointerCapture(event.pointerId)
}

function onRailPointerMove(event: PointerEvent): void {
  const rail = railEl.value
  if (!rail || !railDragging.value || railPointerId !== event.pointerId) return
  const dx = event.clientX - railLastX
  railLastX = event.clientX
  rail.scrollLeft -= dx
  queueWrap(rail)

  const now = performance.now()
  railSamples.push({ t: now, left: rail.scrollLeft })
  // 只保留采样窗口内的样本
  while (railSamples.length > 2 && now - (railSamples[0]?.t ?? now) > RAIL_SAMPLE_WINDOW) {
    railSamples.shift()
  }
}

function onRailPointerUp(event: PointerEvent): void {
  const rail = railEl.value
  if (!rail || !railDragging.value) return
  railDragging.value = false
  railPointerId = null
  if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId)

  // 用采样窗口估松手速度（px/ms），并夹一个上限避免甩得离谱
  const first = railSamples[0]
  const last = railSamples[railSamples.length - 1]
  railSamples = []
  if (first && last && last.t - first.t > 8) {
    const v = (last.left - first.left) / (last.t - first.t)
    railVelocity = Math.max(-RAIL_MAX_VELOCITY, Math.min(RAIL_MAX_VELOCITY, v))
  } else {
    railVelocity = 0
  }

  railAutoLeft = rail.scrollLeft
  markRailUserActive()
  // 惯性期间不自动推进：等 railTick 里速度衰减到阈值以下再交还
  if (Math.abs(railVelocity) < RAIL_MIN_VELOCITY) railVelocity = 0
}

/** 滚轮 / 触控板横滑也算用户操作：临时打开吸附，之后交还自动滚动 */
function onRailWheel(): void {
  markRailUserActive()
}

onMounted(() => {
  railEl.value?.addEventListener('scroll', handleRailScroll, { passive: true })
  if (!reducedMotion.value) railTickRaf = window.requestAnimationFrame(railTick)
})

onUnmounted(() => {
  if (railTickRaf) cancelAnimationFrame(railTickRaf)
  railTickRaf = 0
  if (railScrollRaf) cancelAnimationFrame(railScrollRaf)
  railScrollRaf = 0
  if (railIdleTimer) window.clearTimeout(railIdleTimer)
  railIdleTimer = null
  railEl.value?.removeEventListener('scroll', handleRailScroll)
})
</script>

<template>
  <section ref="rootRef" class="gallery">
    <div class="wrap">
      <header class="section-head" data-reveal>
        <div class="section-head__text">
          <p class="eyebrow">实机画面</p>
          <h2 class="h2">服务器长什么样</h2>
          <p class="lead">游戏内截图，来自纯净生存、综合生存与活动服。</p>
        </div>
        <MagneticCornerFrame class="mcf-inline" :padding="7" :arm-length="12">
          <div class="progress" aria-hidden="true">
            <span ref="progressBarEl" class="progress__bar" />
          </div>
        </MagneticCornerFrame>
      </header>
    </div>

    <div class="wrap">
      <div class="gallery__stage">
        <!--
          左右两侧的渐隐过渡：移植 Vue Bits「GradualBlur」。
          叠层 backdrop-filter 让截图在接近视口边缘时逐级模糊并收进页面底色，
          避免图片被视口硬切。
        -->
        <HomeGradualBlur position="left" :strength="2" size="11rem" :div-count="6" />
        <HomeGradualBlur position="right" :strength="2" size="11rem" :div-count="6" />
        <div
          ref="railEl"
          class="gallery__rail"
          data-drag
          data-cursor-hover
          :class="{ 'is-dragging': railDragging }"
          @pointerdown="onRailPointerDown"
          @pointermove="onRailPointerMove"
          @pointerup="onRailPointerUp"
          @pointercancel="onRailPointerUp"
          @wheel.passive="onRailWheel"
          @dragstart.prevent
        >
          <img
            v-for="(src, i) in railImages"
            :key="`${src}-${i}`"
            class="gallery__item"
            :src="src"
            :alt="i < SHOTS.length ? `服务器截图 ${i + 1}` : ''"
            width="1600"
            height="1000"
            :loading="i < 4 ? 'eager' : 'lazy'"
            decoding="async"
            draggable="false"
          />
        </div>
      </div>
    </div>
  </section>
</template>
