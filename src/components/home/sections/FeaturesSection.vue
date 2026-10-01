<!--
  FeaturesSection — 首页「服务器特点」区块
  视觉骨架移植自 Vue Bits「MagicBento」，卡片为本地改写版 HomeGlowCard。

  与 TocToggles.vue 主题切换的兼容约定（详见设计方案 R1–R7）：
  R1 环境层（极光/粒子/混合模式层）在 :root[data-vt] 帧内隐藏，由各 fx 组件自行处理
  R2 渐变裁剪文字补 :root[data-vt] 纯色兜底（本文件 .features-title）
  R3 颜色只走 CSS 变量，GSAP 不 tween 颜色
  R6 本区块不写颜色 transition
-->
<template>
  <section id="features" ref="rootRef" class="features-section">
    <!-- 极光氛围层：低端设备 / reduced-motion 时完全不加载 -->
    <div class="features-section__backdrop" aria-hidden="true">
      <div class="features-section__base-glow" />
      <component
        :is="auroraLayer"
        v-if="auroraLayer"
        :color-stops="auroraStops"
        :speed="0.42"
        :amplitude="1.05"
        :opacity="0.55"
      />
    </div>

    <div class="features-container">
      <HomeReveal class="section-header" :distance="30" :threshold="0.15">
        <div class="section-eyebrow">
          <HomeStarBorder :color="eyebrowColor">
            <span class="eyebrow-dot" />
            FEATURES
          </HomeStarBorder>
        </div>
        <h2 class="features-title">{{ t('home.features.title') }}</h2>
        <p class="section-subtitle">{{ t('home.features.subtitle') }}</p>
      </HomeReveal>

      <div ref="gridRef" class="features-grid">
        <div class="features-grid__spotlight" aria-hidden="true" />

        <HomeReveal class="cell cell--lg" direction="up" :distance="64" :threshold="0.12">
          <HomeGlowCard accent="indigo" padding="36px" class="stretch">
            <header class="card-head">
              <span class="card-icon card-icon--square">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="30"
                  height="30"
                  viewBox="0 0 448 512"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M338.8-9.9c11.9 8.6 16.3 24.2 10.9 37.8L271.3 224 416 224c13.5 0 25.5 8.4 30.1 21.1s.7 26.9-9.6 35.5l-288 240c-11.3 9.4-27.4 9.9-39.3 1.3s-16.3-24.2-10.9-37.8L176.7 288 32 288c-13.5 0-25.5-8.4-30.1-21.1s-.7-26.9 9.6-35.5l288-240c11.3-9.4 27.4-9.9 39.3-1.3z"
                  />
                </svg>
              </span>
              <span class="card-meta">01 / 响应</span>
            </header>
            <div class="card-copy">
              <h3 class="card-title">{{ t('home.features.responsive.title') }}</h3>
              <p class="card-desc">{{ t('home.features.responsive.desc') }}</p>
            </div>
          </HomeGlowCard>
        </HomeReveal>

        <HomeReveal
          class="cell cell--sm1"
          direction="up"
          :distance="64"
          :delay="0.08"
          :threshold="0.12"
        >
          <HomeGlowCard accent="cyan" class="stretch">
            <header class="card-head">
              <span class="card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="26"
                  height="26"
                  viewBox="0 0 384 512"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M16 64C16 28.7 44.7 0 80 0L304 0c35.3 0 64 28.7 64 64l0 384c0 35.3-28.7 64-64 64L80 512c-35.3 0-64-28.7-64-64L16 64zm64 0l0 304 224 0 0-304-224 0zM192 472c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32z"
                  />
                </svg>
              </span>
              <span class="card-meta">02 / 平台</span>
            </header>
            <div class="card-copy">
              <h3 class="card-title">{{ t('home.features.multiPlatform.title') }}</h3>
              <p class="card-desc">{{ t('home.features.multiPlatform.desc') }}</p>
            </div>
          </HomeGlowCard>
        </HomeReveal>

        <HomeReveal
          class="cell cell--sm2"
          direction="up"
          :distance="64"
          :delay="0.16"
          :threshold="0.12"
        >
          <HomeGlowCard accent="violet" class="stretch">
            <header class="card-head">
              <span class="card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="26"
                  height="26"
                  viewBox="0 0 512 512"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M256 0c4.6 0 9.2 1 13.4 2.9L457.8 82.8c22 9.3 38.4 31 38.3 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0-172.4-82.5-213.1-264-213.6-363.2-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.9 1 251.4 0 256 0zm0 66.8l0 378.1c138-66.8 175.1-214.8 176-303.4l-176-74.6 0 0z"
                  />
                </svg>
              </span>
              <span class="card-meta">03 / 稳定</span>
            </header>
            <div class="card-copy">
              <h3 class="card-title">{{ t('home.features.secureReliable.title') }}</h3>
              <p class="card-desc">{{ t('home.features.secureReliable.desc') }}</p>
            </div>
          </HomeGlowCard>
        </HomeReveal>

        <HomeReveal
          class="cell cell--stat"
          direction="up"
          :distance="64"
          :delay="0.24"
          :threshold="0.12"
        >
          <HomeGlowCard accent="amber" padding="26px" class="stretch">
            <div class="stat-head">
              <span class="stat-status" :class="serverOnline ? 'is-online' : 'is-offline'">
                <span class="stat-dot" />
                {{
                  serverOnline
                    ? t('home.serverStatus.statusLabel')
                    : t('home.serverStatus.statusChecking')
                }}
              </span>
              <span class="card-meta">LIVE</span>
            </div>
            <div class="stat-grid">
              <div class="stat-item">
                <div class="stat-value">
                  <HomeCountUp :to="playerCount" :duration="1.2" />
                  <span v-if="playerMax > 0" class="stat-suffix">/{{ playerMax }}</span>
                </div>
                <div class="stat-label">{{ t('home.serverStatus.playersLabel') }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">
                  <HomeCountUp :to="uptimePercent" :duration="1.4" :decimals="1" suffix="%" />
                </div>
                <div class="stat-label">24×7 在线</div>
              </div>
              <div class="stat-item">
                <div class="stat-value stat-value--sm">每 4h</div>
                <div class="stat-label">自动备份</div>
              </div>
            </div>
          </HomeGlowCard>
        </HomeReveal>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { useGsap } from '@/composables/useGsap'
import { EASINGS } from '@/gsap/config/easings'
import HomeGlowCard from '../fx/HomeGlowCard.vue'
import HomeReveal from '../fx/HomeReveal.vue'
import HomeStarBorder from '../fx/HomeStarBorder.vue'
import HomeCountUp from '../fx/HomeCountUp.vue'
import { LazyHomeAurora, shouldUsePointerFx, shouldUseWebGL } from '../fx/home-fx-env'

const props = defineProps<{
  serverOnline: boolean
  onlinePlayers: string
}>()

const { t } = useI18n()
const rootRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)

const eyebrowColor = 'rgb(167 139 250 / 0.9)'
// 微调点：极光三段色（暗底 · 主题紫 · 暗底）
const auroraStops = ['#0b0e17', '#7c5cff', '#0b0e17']

const auroraLayer = computed<Component | null>(() => (shouldUseWebGL() ? LazyHomeAurora : null))

/** 从 "12/100" 这样的字符串解析当前/上限人数；异步未就绪时显示 0 */
const parsedPlayers = computed(() => {
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(props.onlinePlayers.trim())
  if (!match) return { current: 0, max: 0, ok: false }
  return { current: Number(match[1]), max: Number(match[2]), ok: true }
})

const playerCount = computed(() => (parsedPlayers.value.ok ? parsedPlayers.value.current : 0))
const playerMax = computed(() => (parsedPlayers.value.ok ? parsedPlayers.value.max : 0))
const uptimePercent = computed(() => (props.serverOnline ? 99.9 : 0))

const { create } = useGsap({ scope: rootRef })

// 微调点：SPOTLIGHT_RADIUS 卡片光斑半径；proximity / fade 决定卡片的明暗过渡带
const SPOTLIGHT_RADIUS = 300

function distanceIntensity(rect: DOMRect, x: number, y: number): number {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const distance = Math.max(0, Math.hypot(x - cx, y - cy) - Math.max(rect.width, rect.height) / 2)
  const proximity = SPOTLIGHT_RADIUS * 0.5
  const fade = SPOTLIGHT_RADIUS * 0.85
  if (distance <= proximity) return 1
  if (distance <= fade) return (fade - distance) / (fade - proximity)
  return 0
}

function setupPointerSpotlight(): (() => void) | undefined {
  if (!shouldUsePointerFx()) return undefined
  const grid = gridRef.value
  if (!grid) return undefined

  const setX = gsap.quickTo(grid, '--glow-x', {
    duration: 0.25,
    ease: EASINGS.hover,
  }) as unknown as (v: string) => void
  const setY = gsap.quickTo(grid, '--glow-y', {
    duration: 0.25,
    ease: EASINGS.hover,
  }) as unknown as (v: string) => void
  const setIntensity = gsap.quickTo(grid, '--glow-intensity', {
    duration: 0.3,
    ease: EASINGS.hover,
  })

  const cards = Array.from(grid.querySelectorAll<HTMLElement>('.glow-card'))
  const cardSetters = cards.map((card) =>
    gsap.quickTo(card, '--glow-intensity', { duration: 0.3, ease: EASINGS.hover }),
  )

  // 卡片位置缓存：滚动/尺寸变化时用 rAF 节流刷新，避免 pointermove 里逐帧强制布局
  let rects: DOMRect[] = []
  let refreshQueued = false
  const refreshRects = () => {
    if (refreshQueued) return
    refreshQueued = true
    requestAnimationFrame(() => {
      refreshQueued = false
      rects = cards.map((card) => card.getBoundingClientRect())
    })
  }
  refreshRects()

  const onMove = (e: PointerEvent) => {
    const rootRect = grid.getBoundingClientRect()
    setX(`${e.clientX - rootRect.left}px`)
    setY(`${e.clientY - rootRect.top}px`)
    setIntensity(1)

    for (let i = 0; i < cards.length; i++) {
      const rect = rects[i]
      cardSetters[i]?.(rect ? distanceIntensity(rect, e.clientX, e.clientY) : 0)
    }
  }

  const onLeave = () => {
    setIntensity(0)
    cardSetters.forEach((setter) => setter(0))
  }

  grid.addEventListener('pointermove', onMove)
  grid.addEventListener('pointerleave', onLeave)
  window.addEventListener('scroll', refreshRects, { passive: true })
  window.addEventListener('resize', refreshRects, { passive: true })

  return () => {
    grid.removeEventListener('pointermove', onMove)
    grid.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('scroll', refreshRects)
    window.removeEventListener('resize', refreshRects)
  }
}

let detachPointer: (() => void) | undefined

onMounted(() => {
  create(() => {
    detachPointer = setupPointerSpotlight()
  })
})

onUnmounted(() => {
  detachPointer?.()
  detachPointer = undefined
})
</script>

<style scoped>
@import '../../../styles/theme-colors.css';

/* ===== 区块容器 ===== */
.features-section {
  position: relative;
  padding: 120px 0 110px;
  background: var(--background-color);
  overflow: clip;
}

.features-section__backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.features-section__base-glow {
  position: absolute;
  inset: -20% -10% 30%;
  background:
    radial-gradient(60% 55% at 20% 20%, rgb(124 92 255 / 12%), transparent 70%),
    radial-gradient(50% 45% at 85% 15%, rgb(34 211 238 / 8%), transparent 70%);
  filter: blur(10px);
}

.features-container {
  position: relative;
  z-index: 1;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ===== 标题 ===== */
.section-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  margin-bottom: 56px;
}

.section-eyebrow {
  display: flex;
  justify-content: center;
}

.eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary-color);
  box-shadow: 0 0 10px var(--primary-color);
}

.features-title {
  font-size: clamp(2.1rem, 4.4vw, 3.4rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.06;
  margin: 0;
  background: linear-gradient(120deg, var(--text-color) 12%, var(--primary-color) 78%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* R2：主题切换快照帧内用纯色兜底，避免 background-clip:text 闪烁 */
:root[data-vt] .features-title {
  background: none;
  color: var(--text-color);
  -webkit-background-clip: initial;
  background-clip: initial;
}

.section-subtitle {
  max-width: 620px;
  margin: 0 auto;
  font-size: 1.05rem;
  line-height: 1.75;
  color: var(--text-secondary);
}

/* ===== 网格 ===== */
.features-grid {
  --glow-x: 50%;
  --glow-y: 50%;
  --glow-intensity: 0;
  --glow-radius: 300px;

  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: minmax(190px, auto);
  grid-template-areas:
    'lg lg sm1 st'
    'lg lg sm2 st';
  gap: 18px;
  isolation: isolate;
}

.features-grid__spotlight {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: 26px;
  opacity: calc(var(--glow-intensity) * 0.5);
  background: radial-gradient(
    var(--glow-radius) circle at var(--glow-x) var(--glow-y),
    rgb(124 92 255 / 0.1),
    transparent 72%
  );
}

.cell {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 0;
}

.cell--lg {
  grid-area: lg;
}
.cell--sm1 {
  grid-area: sm1;
}
.cell--sm2 {
  grid-area: sm2;
}
.cell--stat {
  grid-area: st;
}

:deep(.glow-card.stretch) {
  width: 100%;
  height: 100%;
}

/* 大卡片的中部留白：用同心光环 + 渐变晕染填满，避免出现「空盒子」感 */
.cell--lg :deep(.glow-card)::after {
  content: '';
  position: absolute;
  right: -14%;
  top: 6%;
  width: 62%;
  aspect-ratio: 1;
  pointer-events: none;
  background:
    radial-gradient(closest-side, rgb(124 92 255 / 10%), transparent 72%),
    radial-gradient(closest-side, transparent 58%, rgb(124 92 255 / 16%) 60%, transparent 63%),
    radial-gradient(closest-side, transparent 42%, rgb(34 211 238 / 14%) 44%, transparent 47%),
    radial-gradient(closest-side, transparent 26%, rgb(124 92 255 / 18%) 28%, transparent 31%);
}

/* ===== 卡片内部排版 ===== */
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: auto;
}

.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 8px 24px rgb(124 92 255 / 22%);
}

.card-icon--square {
  width: 62px;
  height: 62px;
  border-radius: 18px;
}

.card-meta {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-secondary);
  opacity: 0.75;
}

.card-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 28px;
}

.card-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-color);
}

.cell--lg .card-title {
  font-size: clamp(1.8rem, 3vw, 2.5rem);
}

.card-desc {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.72;
  font-size: 0.95rem;
}

.cell--lg .card-desc {
  font-size: 1rem;
  max-width: 46ch;
}

/* ===== 实时状态卡 ===== */
.stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.stat-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--online-color);
  box-shadow: 0 0 0 4px rgb(0 191 166 / 14%);
}

.stat-status.is-offline .stat-dot {
  background: var(--error-color);
  box-shadow: 0 0 0 4px rgb(220 53 69 / 14%);
}

.stat-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: auto;
  padding-top: 22px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-color);
  line-height: 1.1;
}

.stat-value--sm {
  font-size: 1.25rem;
}

.stat-suffix {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-left: 2px;
}

.stat-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      'lg lg'
      'sm1 sm2'
      'st st';
  }
}

@media (max-width: 768px) {
  .features-section {
    padding: 88px 0 80px;
  }

  .features-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'lg'
      'sm1'
      'sm2'
      'st';
    gap: 14px;
  }

  :deep(.glow-card) {
    padding: 26px 22px !important;
  }

  .features-grid__spotlight {
    display: none;
  }

  .features-grid__spotlight,
  .features-grid {
    --glow-intensity: 0;
  }

  .card-copy {
    padding-top: 20px;
  }
}
</style>
