<!--
  HomeGlowCard — 光标跟随 spotight / 描边光 / 3D 倾斜卡片
  移植并改写自 Vue Bits「MagicBento」(https://vue-bits.dev/components/magic-bento)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点：
  - 去掉全部 Tailwind 工具类，改为 scoped CSS + 项目主题令牌（--card-bg / --glass-border / --primary-color）
  - 视觉状态全部用 CSS 变量传递（--glow-x / --glow-y / --glow-intensity / --glow-radius），
    由所属区块的 `.features-grid` 统一设置，卡片只负责读取，避免每张卡片各自算布局
  - 曲面上游把 spotlight 节点 appendChild 到 document.body，会污染全站；这里改为区块内定位
  - 主题切换兼容：不使用 mix-blend-mode，不用 :root[data-vt] 兜底（颜色全部来自 CSS 变量）
  - 倾角用 gsap.quickTo 平滑，比上游的 tween-per-mousemove 少一半开销
-->
<template>
  <div
    ref="cardRef"
    class="glow-card"
    :class="[`glow-card--${accent}`, { 'glow-card--interactive': interactive }]"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @mousemove="onMove"
    @click="onClick"
  >
    <div class="glow-card__spotlight" aria-hidden="true" />
    <div class="glow-card__ring" aria-hidden="true" />
    <div class="glow-card__glare" aria-hidden="true" />
    <div class="glow-card__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'
import { DURATIONS } from '@/gsap/config/durations'
import { EASINGS } from '@/gsap/config/easings'

// 微调点：TILT_MAX 最大倾角（度）· MAGNET 磁吸系数（1/系数的位移）· CLICK_RIPPLE 点击涟漪时长
const TILT_MAX = 6
const MAGNET = 0.035
const CLICK_RIPPLE = 0.7

const props = withDefaults(
  defineProps<{
    /** 强调色（决定卡片底色渐变与描边高光） */
    accent?: 'indigo' | 'cyan' | 'violet' | 'amber'
    /** 桌面端 3D 倾斜 + 磁吸 */
    interactive?: boolean
    /** 卡片内边距（CSS 长度） */
    padding?: string
  }>(),
  {
    accent: 'indigo',
    interactive: true,
    padding: '32px',
  },
)

const cardRef = ref<HTMLElement | null>(null)
const isCoarse = ref(false)
const canInteract = computed(() => props.interactive && !isCoarse.value)

let setRotateX: ((v: number) => void) | null = null
let setRotateY: ((v: number) => void) | null = null
let setX: ((v: number) => void) | null = null
let setY: ((v: number) => void) | null = null
let ctx: gsap.Context | null = null
let detach: (() => void) | null = null

function onEnter(): void {
  if (!canInteract.value) return
  gsap.to(cardRef.value, {
    y: -4,
    duration: DURATIONS.hover,
    ease: EASINGS.hover,
    overwrite: 'auto',
  })
}

function onLeave(): void {
  if (!cardRef.value) return
  if (canInteract.value) {
    setRotateX?.(0)
    setRotateY?.(0)
    setX?.(0)
    setY?.(0)
  }
  gsap.to(cardRef.value, {
    y: 0,
    duration: DURATIONS.hover,
    ease: EASINGS.hover,
    overwrite: 'auto',
  })
}

function onMove(e: MouseEvent): void {
  if (!canInteract.value || !cardRef.value) return
  const rect = cardRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const cx = rect.width / 2
  const cy = rect.height / 2

  setRotateX?.(-((y - cy) / cy) * TILT_MAX)
  setRotateY?.(((x - cx) / cx) * TILT_MAX)
  setX?.((x - cx) * MAGNET)
  setY?.((y - cy) * MAGNET)
}

function onClick(e: MouseEvent): void {
  const card = cardRef.value
  if (!card || isCoarse.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const maxDistance = Math.max(
    Math.hypot(x, y),
    Math.hypot(x - rect.width, y),
    Math.hypot(x, y - rect.height),
    Math.hypot(x - rect.width, y - rect.height),
  )

  const ripple = document.createElement('span')
  ripple.className = 'glow-card__ripple'
  ripple.style.width = `${maxDistance * 2}px`
  ripple.style.height = `${maxDistance * 2}px`
  ripple.style.left = `${x - maxDistance}px`
  ripple.style.top = `${y - maxDistance}px`
  card.appendChild(ripple)

  gsap.fromTo(
    ripple,
    { scale: 0, opacity: 0.55 },
    {
      scale: 1,
      opacity: 0,
      duration: CLICK_RIPPLE,
      ease: 'power2.out',
      onComplete: () => ripple.remove(),
    },
  )
}

onMounted(() => {
  isCoarse.value = window.matchMedia('(pointer: coarse)').matches
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    isCoarse.value = true
  }

  const card = cardRef.value
  if (!card || !canInteract.value) return

  ctx = gsap.context(() => {
    setRotateX = gsap.quickTo(card, 'rotationX', { duration: 0.3, ease: EASINGS.hover })
    setRotateY = gsap.quickTo(card, 'rotationY', { duration: 0.3, ease: EASINGS.hover })
    setX = gsap.quickTo(card, 'x', { duration: 0.3, ease: EASINGS.hover })
    setY = gsap.quickTo(card, 'y', { duration: 0.3, ease: EASINGS.hover })
  }, card)

  detach = () => {
    ctx?.revert()
    ctx = null
    setRotateX = null
    setRotateY = null
    setX = null
    setY = null
  }
})

onUnmounted(() => {
  detach?.()
  detach = null
  cardRef.value?.querySelectorAll('.glow-card__ripple').forEach((node) => node.remove())
})
</script>

<style scoped>
.glow-card {
  --glow-x: 50%;
  --glow-y: 50%;
  --glow-intensity: 0;
  --glow-radius: 240px;
  --glow-rgb: 99 102 241;

  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  border-radius: 22px;
  padding: v-bind(padding);
  border: 1px solid var(--glass-border);
  background: var(--card-bg);
  box-shadow: 0 10px 30px var(--shadow-color);
  transform-style: preserve-3d;
  transition:
    box-shadow 0.35s ease,
    border-color 0.35s ease;
}

:root[data-theme='dark'] .glow-card {
  --glow-rgb: 147 112 219;
}

.glow-card--indigo {
  --glow-rgb: 99 102 241;
  background: linear-gradient(150deg, rgb(99 102 241 / 14%), var(--card-bg) 62%);
}

.glow-card--cyan {
  --glow-rgb: 34 211 238;
  background: linear-gradient(150deg, rgb(34 211 238 / 12%), var(--card-bg) 62%);
}

.glow-card--violet {
  --glow-rgb: 168 85 247;
  background: linear-gradient(150deg, rgb(168 85 247 / 12%), var(--card-bg) 62%);
}

.glow-card--amber {
  --glow-rgb: 245 158 11;
  background: linear-gradient(150deg, rgb(245 158 11 / 12%), var(--card-bg) 62%);
}

/* 卡片内光标光斑：颜色随 --glow-rgb 变化，强度由区块统一写入 */
.glow-card__spotlight {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  opacity: calc(var(--glow-intensity) * 0.9);
  background: radial-gradient(
    var(--glow-radius) circle at var(--glow-x) var(--glow-y),
    rgb(var(--glow-rgb) / 0.16) 0%,
    rgb(var(--glow-rgb) / 0.06) 40%,
    transparent 72%
  );
}

/* 描边光：mask-composite 打洞成 1px 环，只在近处发亮 */
.glow-card__ring {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  border-radius: inherit;
  padding: 1.5px;
  opacity: calc(var(--glow-intensity) * 0.85);
  background: radial-gradient(
    var(--glow-radius) circle at var(--glow-x) var(--glow-y),
    rgb(var(--glow-rgb) / 0.85) 0%,
    rgb(var(--glow-rgb) / 0.3) 45%,
    transparent 72%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

/* 顶部高光扫描：仅在卡片 hover 时跑一次 */
.glow-card__glare {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  border-radius: inherit;
  opacity: 0;
  background: linear-gradient(
    115deg,
    transparent 42%,
    rgb(255 255 255 / 0.14) 50%,
    transparent 58%
  );
  background-size: 260% 260%;
  background-position: 120% 0;
  transition: opacity 0.4s ease;
}

.glow-card--interactive:hover .glow-card__glare {
  opacity: 1;
  background-position: -30% 0;
  transition:
    opacity 0.2s ease,
    background-position 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.glow-card__body {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.glow-card__ripple {
  position: absolute;
  z-index: 4;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle, rgb(var(--glow-rgb) / 0.28) 0%, transparent 70%);
}

@media (pointer: coarse) {
  .glow-card__glare {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .glow-card__spotlight,
  .glow-card__ring {
    opacity: 0;
  }

  .glow-card__glare {
    display: none;
  }
}
</style>
