<template>
    <div ref="rootRef" class="home-root">
        <!-- 噪点叠加层 -->
        <div class="noise-overlay" aria-hidden="true"></div>

        <!-- 顶部区域 -->
        <header class="hero-section">
            <div class="header-background" :class="{ 'fade-in': activeLayer === 1 }" :style="{ backgroundImage: `url(${currentImage1})`, opacity: activeLayer === 1 ? '1' : '0' }"></div>
            <div class="header-background" :style="{ backgroundImage: `url(${currentImage2})`, opacity: activeLayer === 2 ? '1' : '0' }"></div>
            <div class="hero-overlay" id="heroBg"></div>

            <div class="hero-content">
                <div class="hero-text">
                    <h1 class="hero-title">Luminol<br>Craft</h1>
                    <p class="hero-subtitle">{{ t('hero.subtitle') }}</p>
                    <p class="hero-description">{{ t('home.hero.description') }}</p>
                    <div class="hero-actions">
                        <a href="https://qm.qq.com/q/M29Eyniu8S" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                            <i class="fas fa-users"></i>
                            {{ t('common.joinGroup') }}
                        </a>
                    </div>
                </div>
                <div class="status-card status-card--float" id="statusCard">
                    <div class="status-header">
                        <div class="status-dot" :class="{ online: serverOnline, offline: !serverOnline }"></div>
                        <span class="status-label" :class="{ offline: !serverOnline }">{{ serverOnline ? '在线' : '离线' }}</span>
                    </div>
                    <div class="status-grid">
                        <div class="status-item"><div class="status-item-label">{{ t('home.serverStatus.playersLabel') }}</div><div class="status-item-value">{{ onlinePlayers }}</div></div>
                        <div class="status-item"><div class="status-item-label">{{ t('home.serverStatus.versionLabel') }}</div><div class="status-item-value">1.21.11</div></div>
                        <div class="status-item"><div class="status-item-label">{{ t('home.serverStatus.typeLabel') }}</div><div class="status-item-value">{{ t('home.serverStatus.typeValue') }}</div></div>
                        <div class="status-item"><div class="status-item-label">{{ t('home.serverStatus.statusLabel') }}</div><div class="status-item-value">{{ serverStatus }}</div></div>
                    </div>
                </div>
            </div>

            <!-- 滚动指示器 -->
            <div class="scroll-indicator">SCROLL ↓</div>
        </header>

        <!-- 首页布局区域（按配置渲染 LayoutA / LayoutB / LayoutC） -->
        <component
            :is="layoutComponent"
            :server-online="serverOnline"
            :online-players="onlinePlayers"
        />
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

.noise-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    mix-blend-mode: overlay;
    opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* ===== Hero 区域 ===== */
.hero-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
    background-color: transparent;
    background: linear-gradient(180deg,
        rgba(0, 0, 0, 0.3) 0%,
        rgba(0, 0, 0, 0.2) 70%,
        rgba(0, 0, 0, 0.1) 90%,
        transparent 100%);
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
    z-index: -2;
    will-change: transform, opacity;
}

.header-background.fade-in {
    opacity: 1;
}

.hero-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, rgba(11, 14, 23, 0.55) 0%, rgba(11, 14, 23, 0.7) 50%, rgba(11, 14, 23, 0.95) 100%), linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, transparent 50%);
    z-index: -1;
    pointer-events: none;
}

/* hero → features 渐变混合过渡层（ScrollTrigger 驱动 --reveal-size 0 → 120px） */
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

.hero-title {
    font-size: clamp(3rem, 10vw, 8rem);
    font-weight: 800;
    line-height: 0.95;
    letter-spacing: -0.04em;
    text-align: left;
    margin-bottom: 24px;
    background: linear-gradient(135deg, #f1f5f9 0%, #818cf8 50%, #22d3ee 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    will-change: transform, opacity;
}

.hero-subtitle {
    font-size: clamp(1.1rem, 2vw, 1.4rem);
    color: #aac2da;
    font-weight: 500;
    margin-bottom: 20px;
    max-width: 640px;
    will-change: transform, opacity;
}

.hero-description {
    font-size: 0.95rem;
    color: var(--text-primary);
    line-height: 1.8;
    max-width: 560px;
    margin-bottom: 32px;
    will-change: transform, opacity;
}

.hero-actions {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    will-change: transform, opacity;
}

.btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 28px;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    transition: transform 0.25s, box-shadow 0.25s, background 0.25s;
    cursor: pointer;
    border: none;
    font-family: var(--font-main);
    will-change: transform;
}

.btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
    color: white;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
}

.btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(158, 148, 216, 0.4);
}

/* 漂浮状态卡 */
.status-card {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 20px;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    position: relative;
    overflow: hidden;
    will-change: transform, opacity;
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
    position: absolute;
    right: 40px;
    bottom: 80px;
    width: 320px;
    transform: rotate(-2deg);
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
    bottom: 24px;
    z-index: 3;
    font-size: 0.8rem;
    letter-spacing: 0.2em;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 600;
    will-change: transform, opacity;
}

/* ===== 响应式：移动端 hero 相关 ===== */
@media (max-width: 1024px) {
    .hero-title {
        font-size: clamp(2.5rem, 9vw, 5rem);
    }

    .status-card--float {
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

    .status-card--float {
        position: relative;
        right: auto;
        bottom: auto;
        width: 100%;
        margin-top: 32px;
        transform: rotate(-2deg);
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
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import LastViewedPopup from '../components/LastViewedPopup.vue'
import CookieConsentBanner from '../components/CookieConsentBanner.vue'
import { useGsap } from '@/composables/useGsap'
import { EASINGS, STAGGERS, DURATIONS } from '@/gsap'
import { CURRENT_LAYOUT } from '../config/home-layout'
import LayoutASections from '../components/home/sections/LayoutASections.vue'
import LayoutBSections from '../components/home/sections/LayoutBSections.vue'
import LayoutCSections from '../components/home/sections/LayoutCSections.vue'

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)

const layoutComponent = computed(() => {
    switch (CURRENT_LAYOUT) {
        case 'cinema':
            return LayoutBSections
        case 'bento':
            return LayoutCSections
        case 'artistic':
        default:
            return LayoutASections
    }
})

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
const currentImage1 = ref(backgroundImages[0])
const currentImage2 = ref(backgroundImages[0])
const activeLayer = ref(1)

const nextRandomImage = () => {
  if (backgroundImages.length <= 1) return
  let newIndex: number
  do {
    newIndex = Math.floor(Math.random() * backgroundImages.length)
  } while (newIndex === currentIndex.value)
  currentIndex.value = newIndex
  if (activeLayer.value === 1) {
    currentImage2.value = backgroundImages[newIndex]
    activeLayer.value = 2
  } else {
    currentImage1.value = backgroundImages[newIndex]
    activeLayer.value = 1
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null

const serverOnline = ref(true)
const onlinePlayers = ref('加载中...')
const serverStatus = ref('服务器在线')

const fetchServerStatus = async () => {
  try {
    const response = await fetch('https://api.mcsrvstat.us/3/craft.luminolsuki.moe')
    if (response.ok) {
      const data = await response.json()
      serverOnline.value = data.online || false
      onlinePlayers.value = data.online ? `${data.players?.online || 0}/${data.players?.max || 0}` : '0/0'
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

  await fetchServerStatus()
  setInterval(fetchServerStatus, 30000)

  await nextTick()

  create((g) => {
    const mm = g.matchMedia()

    // 延迟刷新确保 DOM 就绪
    requestAnimationFrame(() => ScrollTrigger.refresh())

    // ============ reduceMotion: 仅设置终态，不播放动画 ============
    mm.add('(prefers-reduced-motion: reduce)', () => {
      g.set('.hero-title, .hero-subtitle, .hero-description, .hero-actions', { autoAlpha: 1, y: 0 })
      g.set('.status-card--float', { autoAlpha: 1, y: 0, rotation: -2 })
      g.set('.scroll-indicator', { autoAlpha: 0 })
    })

    // ============ no-preference: hero 相关动画 ============
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // 1. Hero 标题 SplitText (chars + words)
      const titleSplit = new SplitText('.hero-title', { type: 'chars,words' })

      // 2. Hero 副标题 SplitText (lines)
      const subtitleSplit = new SplitText('.hero-subtitle', { type: 'lines' })

      // 初始隐藏，防止 FOUC
      g.set('.hero-description', { autoAlpha: 0, y: 20 })
      g.set('.hero-actions', { autoAlpha: 0, y: 20 })
      g.set('.status-card--float', { autoAlpha: 0, y: 40, rotation: -8 })
      g.set('.scroll-indicator', { autoAlpha: 1 })

      const heroTl = g.timeline()

      heroTl
        .from(titleSplit.chars, {
          yPercent: 120,
          autoAlpha: 0,
          rotateZ: 8,
          stagger: g.utils.distribute({ from: 'center', amount: 0.6 }),
          duration: DURATIONS.slow,
          ease: EASINGS.heroReveal,
        })
        .from(subtitleSplit.lines, {
          yPercent: 100,
          autoAlpha: 0,
          duration: DURATIONS.standard,
          ease: EASINGS.entrance,
          stagger: 0.1,
        }, '-=0.4')
        .to('.hero-description', {
          autoAlpha: 1,
          y: 0,
          duration: DURATIONS.entrance,
          ease: EASINGS.entrance,
        }, '-=0.3')
        .to('.hero-actions', {
          autoAlpha: 1,
          y: 0,
          duration: DURATIONS.entrance,
          ease: EASINGS.entrance,
        }, '-=0.3')
        // 5. 状态卡入场
        .to('.status-card--float', {
          autoAlpha: 1,
          y: 0,
          rotation: -2,
          duration: DURATIONS.slow,
          ease: EASINGS.heroReveal,
        }, '-=0.4')

      // 3. 背景视差滚动
      g.to('.header-background', {
        yPercent: 30,
        scale: 1.1,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // 4. SCROLL ↓ 指示器：持续浮动 + 滚动淡出
      g.to('.scroll-indicator', {
        y: 8,
        duration: 1.4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      })
      g.to('.scroll-indicator', {
        autoAlpha: 0,
        duration: 0.4,
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: '+=200',
          scrub: true,
        },
      })

      // 6. hero → features 渐变混合过渡层（::after height 通过 --reveal-size 驱动）
      g.fromTo('.hero-section', { '--reveal-size': '0px' } as gsap.TweenVars, {
        '--reveal-size': '120px',
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'bottom 80%',
          end: 'bottom 20%',
          scrub: true,
        },
      } as gsap.TweenVars)
    })
  })
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>
