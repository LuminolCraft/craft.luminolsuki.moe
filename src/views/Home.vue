<template>
  <div ref="rootRef" class="home-root">
    <!-- 顶部区域 -->
    <header class="hero-section">
      <div
        class="header-background"
        :class="{ 'fade-in': activeLayer === 1 }"
        :style="{
          backgroundImage: `url(${currentImage1})`,
          opacity: activeLayer === 1 ? '1' : '0',
        }"
      ></div>
      <div
        class="header-background"
        :style="{
          backgroundImage: `url(${currentImage2})`,
          opacity: activeLayer === 2 ? '1' : '0',
        }"
      ></div>

      <!-- 氛围层：静态渐变兜底 + 极光 + 体积光 -->
      <div ref="backdropRef" class="hero-backdrop" aria-hidden="true">
        <div class="hero-backdrop__base" />
        <component
          :is="auroraLayer"
          v-if="auroraLayer"
          :color-stops="auroraStops"
          :speed="0.38"
          :amplitude="1.15"
          :blend="0.6"
          :opacity="0.85"
        />
        <component
          :is="raysLayer"
          v-if="raysLayer"
          rays-origin="top-center"
          :rays-color="raysColor"
          :ray-length="1.7"
          :light-spread="1.1"
          :mouse-influence="0.07"
          :opacity="0.42"
        />
        <div class="hero-backdrop__grain" />
      </div>

      <div class="hero-overlay" id="heroBg"></div>

      <div class="hero-content">
        <div class="hero-text">
          <div class="hero-title-mask">
            <h1 ref="titleRef" class="hero-title">Luminol<br />Craft</h1>
          </div>
          <p ref="subtitleRef" class="hero-subtitle">{{ t('hero.subtitle') }}</p>
          <p ref="descriptionRef" class="hero-description">{{ t('home.hero.description') }}</p>
          <div ref="actionsRef" class="hero-actions">
            <HomeMagnetic :padding="110" :strength="5">
              <a
                href="https://qm.qq.com/q/M29Eyniu8S"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-primary"
              >
                <i class="fas fa-users"></i>
                {{ t('common.joinGroup') }}
              </a>
            </HomeMagnetic>
            <a href="#features" class="btn btn-ghost">
              {{ t('home.features.title') }}
            </a>
          </div>
        </div>

        <HomeMagnetic class="hero-aside" :padding="130" :strength="8">
          <div class="status-card status-card--float" id="statusCard">
            <div class="status-header">
              <div
                class="status-dot"
                :class="{ online: serverOnline, offline: !serverOnline }"
              ></div>
              <span class="status-label" :class="{ offline: !serverOnline }">{{
                serverOnline ? '在线' : '离线'
              }}</span>
            </div>
            <div class="status-grid">
              <div class="status-item">
                <div class="status-item-label">{{ t('home.serverStatus.playersLabel') }}</div>
                <div class="status-item-value">{{ onlinePlayers }}</div>
              </div>
              <div class="status-item">
                <div class="status-item-label">{{ t('home.serverStatus.versionLabel') }}</div>
                <div class="status-item-value">26.2</div>
              </div>
              <div class="status-item">
                <div class="status-item-label">{{ t('home.serverStatus.typeLabel') }}</div>
                <div class="status-item-value">{{ t('home.serverStatus.typeValue') }}</div>
              </div>
              <div class="status-item">
                <div class="status-item-label">{{ t('home.serverStatus.statusLabel') }}</div>
                <div class="status-item-value">{{ serverStatus }}</div>
              </div>
            </div>
          </div>
        </HomeMagnetic>
      </div>

      <!-- 滚动指示器 -->
      <div ref="cueRef" class="scroll-indicator">
        <HeroScrollCue />
      </div>
    </header>

    <!-- 首页布局区域 -->
    <LayoutCSections :server-online="serverOnline" :online-players="onlinePlayers" />
    <LastViewedPopup />
    <CookieConsentBanner />
  </div>
</template>

<style scoped>
@import '../styles/theme-colors.css';
@import '../styles/mobile/home-mobile.css';

/* ===== 根容器 / 噪点叠加 ===== */
.home-root {
  position: relative;
}
/* 新增：排除 hero 背景不参与 View Transitions */

.header-background {
  view-transition-name: none !important;
}

.hero-overlay {
  view-transition-name: none !important;
}

.hero-section {
  view-transition-name: none !important;
}
.hero-section::after {
  view-transition-name: none !important;
}
.hero-section,
.hero-overlay,
.header-background,
.hero-section::after {
  view-transition-name: none !important;
}

/* ===== Hero 区域 ===== */
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  background-color: #0b0e17;
}

.header-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0;
  transition: opacity 2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -3;
  will-change: transform, opacity;
}

.header-background.fade-in {
  opacity: 1;
}

/* 氛围层：位于背景图之上、暗色蒙版之下 */
.hero-backdrop {
  position: absolute;
  inset: 0;
  z-index: -2;
  pointer-events: none;
}

.hero-backdrop__base {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(70% 60% at 18% 22%, rgb(124 92 255 / 34%), transparent 68%),
    radial-gradient(60% 55% at 82% 12%, rgb(34 211 238 / 20%), transparent 70%),
    linear-gradient(
      180deg,
      rgb(11 14 23 / 55%) 0%,
      rgb(11 14 23 / 72%) 60%,
      rgb(11 14 23 / 94%) 100%
    );
}

.hero-backdrop__grain {
  position: absolute;
  inset: 0;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
    linear-gradient(
      180deg,
      rgba(11, 14, 23, 0.15) 0%,
      rgba(11, 14, 23, 0.35) 50%,
      rgba(11, 14, 23, 0.85) 100%
    ),
    linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, transparent 52%);
  z-index: -1;
  pointer-events: none;
}

/* hero → features 渐变混合过渡层（ScrollTrigger 驱动 --reveal-size 0 → 160px） */
.hero-section::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--reveal-size, 0px);
  background: linear-gradient(to bottom, transparent, var(--background-color));
  pointer-events: none;
  z-index: 1;
}

/* 单列左对齐 Hero 内容 */
.hero-content {
  position: relative;
  z-index: 2;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.hero-text {
  max-width: 900px;
}

.hero-title-mask {
  overflow: hidden;
  margin-bottom: 24px;
}

.hero-title {
  font-size: clamp(3rem, 10vw, 8rem);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.02em;
  text-align: left;
  margin: 0;
  background: linear-gradient(135deg, #f8fafc 0%, #c4b5fd 46%, #67e8f9 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-kerning: none;
  text-rendering: optimizeSpeed;
}

/* SplitText 行级揭示：遮罩行 + 逐行渐变（行内的 div 必须自己带 background-clip:text，
   否则嵌套层在某些渲染路径下拿不到父级的渐变，文字会整体不可见） */
.hero-title :deep(.hero-line) {
  display: block;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc 0%, #c4b5fd 46%, #67e8f9 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  will-change: transform, opacity;
}

/* R2：主题切换快照帧内纯色兜底，避免 background-clip:text 透明闪烁 */
:root[data-vt] .hero-title {
  background: none;
  color: #f8fafc;
  -webkit-background-clip: initial;
  background-clip: initial;
}

.hero-subtitle {
  font-size: clamp(1.1rem, 2vw, 1.4rem);
  color: #cbd5e1;
  font-weight: 500;
  margin-bottom: 20px;
  max-width: 640px;
}

.hero-description {
  font-size: 0.95rem;
  color: rgb(226 232 240 / 0.86);
  line-height: 1.85;
  max-width: 560px;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 28px;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition:
    transform 0.25s,
    box-shadow 0.25s,
    background 0.25s;
  cursor: pointer;
  border: none;
  font-family: var(--font-main);
}

.btn-primary {
  background: linear-gradient(135deg, #7c5cff 0%, #a78bfa 100%);
  color: white;
  box-shadow: 0 10px 30px rgb(124 92 255 / 34%);
}

.btn-primary:hover {
  color: #fff;
  box-shadow: 0 14px 40px rgb(124 92 255 / 44%);
}

.btn-ghost {
  color: rgb(241 245 249 / 0.86);
  border: 1px solid rgb(255 255 255 / 0.18);
  background: rgb(255 255 255 / 0.06);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.btn-ghost:hover {
  color: #fff;
  border-color: rgb(167 139 250 / 0.55);
  background: rgb(255 255 255 / 0.1);
}

/* 漂浮状态卡 */
.status-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
}

.status-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--bases-primary-gradient);
}

.status-card--float {
  width: 320px;
  transform: rotate(-2deg);
}

/* 状态卡浮层容器：绝对定位交给外层，卡片本身保持可被 GSAP 变换 */
.hero-aside {
  position: absolute;
  right: 40px;
  bottom: 90px;
  width: 320px;
  z-index: 3;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.status-label {
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.status-label.offline {
  color: var(--bases-error-color);
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.status-item {
  text-align: center;
}

.status-item-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 5px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.status-item-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.status-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: relative;
}

.status-dot::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  z-index: -1;
}

.status-dot.online {
  background-color: var(--bases-online-dot);
}

.status-dot.online::before {
  background-color: var(--bases-online-dot);
}

.status-dot.offline {
  background-color: var(--bases-error-color);
}

.status-dot.offline::before {
  background-color: var(--bases-error-color);
}

/* 滚动指示器 */
.scroll-indicator {
  position: absolute;
  right: 48px;
  bottom: 28px;
  z-index: 3;
}

/* ===== 响应式：移动端 hero 相关 ===== */
@media (max-width: 1024px) {
  .hero-title {
    font-size: clamp(2.5rem, 9vw, 5rem);
  }

  .hero-aside {
    right: 24px;
    bottom: 70px;
    width: 280px;
  }
}

@media (max-width: 768px) {
  .hero-content {
    padding: 0 20px;
  }

  .hero-title {
    font-size: clamp(2.2rem, 12vw, 4rem);
  }

  .hero-aside {
    position: relative;
    right: auto;
    bottom: auto;
    width: 100%;
    margin-top: 32px;
  }

  .status-card--float {
    position: relative;
    right: auto;
    bottom: auto;
    width: 100%;
  }

  .scroll-indicator {
    right: 24px;
    bottom: 16px;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: clamp(2rem, 14vw, 3rem);
  }

  .status-card--float {
    padding: 16px;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import LastViewedPopup from '../components/LastViewedPopup.vue'
import CookieConsentBanner from '../components/CookieConsentBanner.vue'
import HeroScrollCue from '../components/home/HeroScrollCue.vue'
import HomeMagnetic from '../components/home/fx/HomeMagnetic.vue'
import {
  LazyHomeAurora,
  LazyHomeLightRays,
  shouldUseWebGL,
} from '../components/home/fx/home-fx-env'
import { useGsap } from '@/composables/useGsap'
import { EASINGS, DURATIONS } from '@/gsap'
import LayoutCSections from '../components/home/sections/LayoutCSections.vue'

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const subtitleRef = ref<HTMLElement | null>(null)
const descriptionRef = ref<HTMLElement | null>(null)
const actionsRef = ref<HTMLElement | null>(null)
const cueRef = ref<HTMLElement | null>(null)
const backdropRef = ref<HTMLElement | null>(null)

const auroraStops = ['#0b0e17', '#7c5cff', '#0b0e17']
const raysColor = '#c4b5fd'

const auroraLayer = computed<Component | null>(() => (shouldUseWebGL() ? LazyHomeAurora : null))
const raysLayer = computed<Component | null>(() => (shouldUseWebGL() ? LazyHomeLightRays : null))

const backgroundImages = [
  '/images/Image_1764466849.avif',
  '/images/Image_1764467382.avif',
  '/images/Image_1764468583.avif',
  '/images/Image_1764468914.avif',
  '/images/Image_1764392636.avif',
  '/images/Image_1764468731.avif',
  '/images/Image_1764465651.avif',
  '/images/3cda066bccaefea3eb268d4ca10f018a.webp',
  '/images/Image_585018650004905.webp',
  '/images/Image_585012522922876.webp',
  '/images/Image_585000138805953.webp',
  '/images/Image_669234245588716.webp',
  '/images/Image_669226165759604.webp',
  '/images/Image_669218057352159.webp',
  '/images/Image_669214276923463.webp',
  '/images/Image_669203224465863.webp',
  '/images/Image_669202127295447.webp',
  '/images/Image_669192564244096.webp',
  '/images/Image_669027140045097.webp',
  '/images/Image_585061010780930.webp',
  '/images/9ae17d2b-8fb3-4f05-8a75-48c40de55bd0.webp',
  '/images/Image_669276986426772.webp',
]

const currentIndex = ref(0)
const currentImage1 = ref(backgroundImages[0] ?? '')
const currentImage2 = ref(backgroundImages[0] ?? '')
const activeLayer = ref(1)

const nextRandomImage = () => {
  if (backgroundImages.length <= 1) return
  let newIndex: number
  do {
    newIndex = Math.floor(Math.random() * backgroundImages.length)
  } while (newIndex === currentIndex.value)
  currentIndex.value = newIndex
  if (activeLayer.value === 1) {
    currentImage2.value = backgroundImages[newIndex] ?? ''
    activeLayer.value = 2
  } else {
    currentImage1.value = backgroundImages[newIndex] ?? ''
    activeLayer.value = 1
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null
let statusIntervalId: ReturnType<typeof setInterval> | null = null

const serverOnline = ref(true)
const onlinePlayers = ref('加载中...')
const serverStatus = ref('服务器在线')

const fetchServerStatus = async () => {
  try {
    const response = await fetch('https://api.mcstatus.io/v2/status/java/craft.luminolsuki.moe', {
      signal: AbortSignal.timeout(8000),
    })
    if (response.ok) {
      const data = await response.json()
      serverOnline.value = data.online === true
      onlinePlayers.value = data.online
        ? `${data.players?.online || 0}/${data.players?.max || 0}`
        : '0/0'
      serverStatus.value = data.online ? '服务器在线' : '服务器离线'
    } else {
      throw new Error('API 请求失败')
    }
  } catch {
    serverOnline.value = false
    onlinePlayers.value = 'N/A'
    serverStatus.value = '服务器离线'
  }
}

const { create } = useGsap({ scope: rootRef })

onMounted(async () => {
  intervalId = setInterval(nextRandomImage, 3600)

  // 服务器状态是异步补充信息：不阻塞首屏渲染与动效初始化
  fetchServerStatus()
  statusIntervalId = setInterval(fetchServerStatus, 30000)

  await nextTick()

  create((g) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // ============ reduce：只设置终态，不播放任何动画 ============
    if (reduce) {
      g.set(
        [
          '.hero-title',
          '.hero-subtitle',
          '.hero-description',
          '.hero-actions',
          '.status-card--float',
        ],
        { autoAlpha: 1, y: 0, rotation: 0 },
      )
      g.set('.scroll-indicator', { autoAlpha: 0 })
      return
    }

    // ============ 标题行级入场 ============
    // 注意：这里刻意只用 lines（不加 words/chars）——chars 模式会给每个字符套一层 div，
    // 与 h1 上的 background-clip:text 渐变在部分渲染路径下会互相干扰导致文字不可见。
    // 行级 + 遮罩的揭示效果在视觉上等价，且不依赖嵌套包装器。
    let split: SplitText | null = null
    try {
      split = new SplitText(titleRef.value, { type: 'lines', linesClass: 'hero-line' })
    } catch (error) {
      console.warn('[Home] SplitText 初始化失败，退化为整块入场', error)
    }

    g.set(['.hero-subtitle', '.hero-description', '.hero-actions'], { autoAlpha: 0, y: 24 })
    g.set('.status-card--float', { autoAlpha: 0, y: 44, rotation: -8 })
    g.set('.scroll-indicator', { autoAlpha: 0, y: 12 })

    const heroTl = g.timeline({ delay: 0.15 })

    if (split) {
      heroTl.from(split.lines, {
        yPercent: 118,
        autoAlpha: 0,
        stagger: 0.12,
        duration: DURATIONS.slow,
        ease: EASINGS.heroReveal,
      })
    } else {
      heroTl.from('.hero-title', {
        autoAlpha: 0,
        y: 40,
        duration: DURATIONS.slow,
        ease: EASINGS.heroReveal,
      })
    }

    heroTl
      .to(
        '.hero-subtitle',
        { autoAlpha: 1, y: 0, duration: DURATIONS.entrance, ease: EASINGS.entrance },
        '-=0.55',
      )
      .to(
        '.hero-description',
        { autoAlpha: 1, y: 0, duration: DURATIONS.entrance, ease: EASINGS.entrance },
        '-=0.35',
      )
      .to(
        '.hero-actions',
        { autoAlpha: 1, y: 0, duration: DURATIONS.entrance, ease: EASINGS.entrance },
        '-=0.3',
      )
      .to(
        '.status-card--float',
        { autoAlpha: 1, y: 0, rotation: -2, duration: DURATIONS.slow, ease: EASINGS.heroReveal },
        '-=0.5',
      )
      .to(
        '.scroll-indicator',
        { autoAlpha: 1, y: 0, duration: DURATIONS.standard, ease: EASINGS.entrance },
        '-=0.3',
      )

    // ============ 背景视差：三层不同速率 ============
    g.to('.header-background', {
      yPercent: 18,
      scale: 1.12,
      ease: EASINGS.parallax,
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    })

    g.to(backdropRef.value, {
      yPercent: 10,
      ease: EASINGS.parallax,
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    })

    g.to('.hero-text', {
      yPercent: -12,
      autoAlpha: 0.35,
      ease: EASINGS.parallax,
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    })

    // SCROLL 提示：滚动即淡出
    g.to('.scroll-indicator', {
      autoAlpha: 0,
      duration: 0.4,
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: '+=220',
        scrub: true,
      },
    })

    // ============ hero → features 渐变混合过渡层 ============
    g.fromTo(
      '.hero-section',
      { '--reveal-size': '0px' } as gsap.TweenVars,
      {
        '--reveal-size': '180px',
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'bottom 92%',
          end: 'bottom 28%',
          scrub: true,
        },
      } as gsap.TweenVars,
    )

    requestAnimationFrame(() => ScrollTrigger.refresh())

    return () => {
      split?.revert()
      split = null
    }
  })
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  if (statusIntervalId) clearInterval(statusIntervalId)
})
</script>
