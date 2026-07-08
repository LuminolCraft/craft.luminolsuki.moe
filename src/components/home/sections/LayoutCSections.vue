<template>
    <div ref="rootRef" class="layout-c-root">
        <!-- 隐藏的 MotionPath 路径，供 .feature-icon 浮动使用 -->
        <svg class="icon-float-svg" width="0" height="0" aria-hidden="true">
            <path id="icon-float-path" d="M0,0 Q8,-10 16,0 T32,0" fill="none" />
        </svg>

        <!-- 特色区域 - Bento Grid -->
        <section class="features-section">
            <div class="features-container">
                <div class="section-header">
                    <h2 class="section-title">{{ t('home.features.title') }}</h2>
                    <p class="section-subtitle">{{ t('home.features.subtitle') }}</p>
                </div>

                <div class="features-grid">
                    <div class="feature-card feature-card--lg">
                        <div class="feature-icon feature-icon--square">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 448 512"><path fill="white" d="M338.8-9.9c11.9 8.6 16.3 24.2 10.9 37.8L271.3 224 416 224c13.5 0 25.5 8.4 30.1 21.1s.7 26.9-9.6 35.5l-288 240c-11.3 9.4-27.4 9.9-39.3 1.3s-16.3-24.2-10.9-37.8L176.7 288 32 288c-13.5 0-25.5-8.4-30.1-21.1s-.7-26.9 9.6-35.5l288-240c11.3-9.4 27.4-9.9 39.3-1.3z"/></svg>
                        </div>
                        <h3 class="feature-title">{{ t('home.features.responsive.title') }}</h3>
                        <p class="feature-description">{{ t('home.features.responsive.desc') }}</p>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon feature-icon--circle">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 384 512"><path fill="white" d="M16 64C16 28.7 44.7 0 80 0L304 0c35.3 0 64 28.7 64 64l0 384c0 35.3-28.7 64-64 64L80 512c-35.3 0-64-28.7-64-64L16 64zm64 0l0 304 224 0 0-304-224 0zM192 472c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32z"/></svg>
                        </div>
                        <h3 class="feature-title">{{ t('home.features.multiPlatform.title') }}</h3>
                        <p class="feature-description">{{ t('home.features.multiPlatform.desc') }}</p>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon feature-icon--circle">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 512 512"><path fill="white" d="M256 0c4.6 0 9.2 1 13.4 2.9L457.8 82.8c22 9.3 38.4 31 38.3 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0-172.4-82.5-213.1-264-213.6-363.2-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.9 1 251.4 0 256 0zm0 66.8l0 378.1c138-66.8 175.1-214.8 176-303.4l-176-74.6 0 0z"/></svg>
                        </div>
                        <h3 class="feature-title">{{ t('home.features.secureReliable.title') }}</h3>
                        <p class="feature-description">{{ t('home.features.secureReliable.desc') }}</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 服务器类型区域 - 对角分割 + Scroll-Pinned 切换 -->
        <section class="servers-section">
            <div class="servers-container">
                <div class="section-header">
                    <h2 class="section-title">{{ t('home.serverTypes.title') }}</h2>
                    <p class="section-subtitle">{{ t('home.serverTypes.subtitle') }}</p>
                </div>

                <div class="servers-grid">
                    <div class="server-panel">
                        <span class="server-index"></span>
                        <div class="server-type">{{ t('home.serverTypes.survival.type') }}</div>
                        <h3 class="server-name">{{ t('home.serverTypes.survival.name') }}</h3>
                        <p class="server-description">{{ t('home.serverTypes.survival.desc') }}</p>
                    </div>

                    <div class="server-panel">
                        <span class="server-index"></span>
                        <div class="server-type">{{ t('home.serverTypes.creative.type') }}</div>
                        <h3 class="server-name">{{ t('home.serverTypes.creative.name') }}</h3>
                        <p class="server-description">{{ t('home.serverTypes.creative.desc') }}</p>
                    </div>
                    <!-- 可扩展：复制下方 server-panel 节点即可加入新服务器，编号由 CSS counter 自动生成 -->
                </div>
            </div>
        </section>

        <!-- 团队区域（动态组件，由 CURRENT_TEAM_STYLE 控制） -->
        <component :is="teamComponent" :server-online="serverOnline" />
    </div>
</template>

<style scoped>
@import '../../../styles/theme-colors.css';
@import '../../../styles/mobile/home-mobile.css';

/* ===== 根容器 ===== */
.layout-c-root {
    position: relative;
}

.icon-float-svg {
    position: absolute;
    width: 0;
    height: 0;
    pointer-events: none;
}

/* ===== 特色区域 - 不规则 Bento + Spotlight + 3D Tilt ===== */
.features-section {
    padding: 100px 0;
    background-color: var(--background-color);
    position: relative;
    --cursor-x: 50%;
    --cursor-y: 50%;
    contain: layout style;
}

/* Section-level spotlight cursor */
.features-section::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background: radial-gradient(
        circle 300px at var(--cursor-x) var(--cursor-y),
        rgba(99, 102, 241, 0.08),
        transparent 70%
    );
}

.features-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    position: relative;
    z-index: 1;
}

.section-header {
    text-align: center;
    margin-bottom: 60px;
    will-change: transform, opacity;
}

.section-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 1rem;
}

.section-subtitle {
    font-size: 1.2rem;
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
}

/* 不规则 Bento Grid */
.features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, minmax(200px, auto));
    grid-template-areas:
        "responsive responsive multiplatform"
        "responsive responsive secure";
    gap: 1.5rem;
    perspective: 1000px;
}

.feature-card:nth-child(1) { grid-area: responsive; }
.feature-card:nth-child(2) { grid-area: multiplatform; }
.feature-card:nth-child(3) { grid-area: secure; }

.feature-card {
    --card-x: 50%;
    --card-y: 50%;
    position: relative;
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    background: var(--card-bg);
    padding: 32px;
    overflow: hidden;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 10px 30px var(--shadow-color);
    transform-style: preserve-3d;
    will-change: transform, opacity;
    contain: layout style paint;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:nth-child(1) {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), var(--card-bg));
}

.feature-card:nth-child(2) {
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.1), var(--card-bg));
}

.feature-card:nth-child(3) {
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), var(--card-bg));
}

/* 局部 spotlight 高光层 */
.feature-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    pointer-events: none;
    z-index: 1;
    background: radial-gradient(
        circle 200px at var(--card-x) var(--card-y),
        rgba(99, 102, 241, 0.15),
        transparent 70%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
}

.feature-card:hover::before { opacity: 1; }

@media (pointer: coarse) {
    .feature-card::before { display: none; }
}

/* 大卡片特殊样式（保留 .feature-card--lg 用于 flex 布局与图标尺寸） */
.feature-card--lg {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.feature-icon {
    width: 80px;
    height: 80px;
    background: var(--bases-primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 2rem;
    color: white;
    will-change: transform;
    transform-style: preserve-3d;
    position: relative;
    z-index: 2;
}

.feature-card--lg .feature-icon {
    width: 96px;
    height: 96px;
}

.feature-icon--square {
    border-radius: 16px;
}

.feature-icon--circle {
    border-radius: 50%;
}

/* Kinetic Typography */
.feature-title {
    font-size: clamp(1.5rem, 2.5vw, 2rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--text-color) 0%, var(--primary-color) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 15px;
    line-height: 1.1;
    contain: layout style paint;
    position: relative;
    z-index: 2;
}

/* View Transitions 期间纯色兜底（避免 background-clip:text 闪烁） */
:root[data-vt] .feature-title {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.feature-card--lg .feature-title {
    font-size: clamp(2rem, 4vw, 2.8rem);
}

.feature-description {
    color: var(--text-secondary);
    line-height: 1.6;
    position: relative;
    z-index: 2;
}

/* ===== 服务器类型区域 - 可扩展 Bento ===== */
.servers-section {
    padding: 100px 0;
    background: var(--background-color);
    position: relative;
}

.servers-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
}

.servers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 60px;
    counter-reset: server-counter;
}

.server-panel {
    position: relative;
    padding: 40px;
    background: var(--card-bg);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    box-shadow: 0 10px 30px var(--shadow-color);
    overflow: hidden;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    will-change: transform, opacity;
    transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    counter-increment: server-counter;
}

/* 第一张卡片渐变背景（保留原设计语言） */
.server-panel:nth-child(1) {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), var(--card-bg) 60%);
}

.server-panel:nth-child(2) {
    background: linear-gradient(225deg, rgba(168, 85, 247, 0.12), var(--card-bg) 60%);
}

/* 第三张及以后（未来扩展用） */
.server-panel:nth-child(3) {
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.12), var(--card-bg) 60%);
}

.server-panel:nth-child(4) {
    background: linear-gradient(225deg, rgba(245, 158, 11, 0.12), var(--card-bg) 60%);
}

/* hover：scale + border 高亮 + box-shadow 增强 */
.server-panel:hover {
    transform: scale(1.03);
    border-color: var(--primary-color);
    box-shadow: 0 15px 40px var(--shadow-hover);
}

/* hover 时编号变亮 */
.server-panel:hover .server-index {
    opacity: 0.35;
}

@media (pointer: coarse) {
    .server-panel:hover {
        transform: none;
    }
}

/* Kinetic Typography 大号编号 */
.server-index {
    display: block;
    font-size: clamp(4rem, 12vw, 10rem);
    font-weight: 900;
    line-height: 1;
    margin-bottom: -0.2em;
    pointer-events: none;
    background: linear-gradient(135deg, var(--text-color) 0%, var(--primary-color) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    opacity: 0.15;
    transition: opacity 0.3s ease;
    contain: layout style paint;
}

/* View Transitions 期间纯色兜底（避免 background-clip:text 闪烁） */
:root[data-vt] .server-index {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

/* CSS counter 自动生成编号（继承 .server-index 的 font-size/font-weight/line-height/opacity） */
.server-index::before {
    content: counter(server-counter, decimal-leading-zero);
    background: linear-gradient(135deg, var(--text-color) 0%, var(--primary-color) 100%);
    -webkit-background-clip: text;
    background-clip: text;
}

/* View Transitions 期间 ::before 纯色兜底 */
:root[data-vt] .server-index::before {
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.server-type {
    font-size: 0.9rem;
    color: var(--bases-primary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
    position: relative;
    z-index: 2;
}

.server-name {
    font-size: clamp(1.8rem, 3vw, 2.5rem);
    font-weight: 800;
    color: var(--text-color);
    margin-bottom: 20px;
    letter-spacing: -0.02em;
    position: relative;
    z-index: 2;
}

.server-description {
    color: var(--text-secondary);
    line-height: 1.7;
    font-size: 1.1rem;
    position: relative;
    z-index: 2;
}

/* ===== 响应式：移动端切换布局 ===== */
@media (max-width: 768px) {
    /* Bento 退化为单列 */
    .features-grid {
        grid-template-columns: 1fr;
        grid-template-rows: auto;
        grid-template-areas: none;
    }

    .feature-card,
    .feature-card:nth-child(n) {
        grid-area: auto;
    }

    /* 服务器网格退化为单列 */
    .servers-grid {
        grid-template-columns: 1fr;
    }

    .server-panel {
        padding: 40px 30px;
    }

    .server-description {
        max-width: 100%;
    }

    .section-title {
        font-size: 2rem;
    }
}

@media (max-width: 480px) {
    .feature-card,
    .server-panel {
        padding: 30px 20px;
    }

    .section-title {
        font-size: 1.8rem;
    }
}
</style>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DURATIONS } from '../../../gsap/config/durations'
import { EASINGS } from '../../../gsap/config/easings'
import { STAGGERS } from '../../../gsap/config/staggers'
import { CURRENT_TEAM_STYLE } from '@/config/home-layout'
import TeamArtistic from '../team/TeamArtistic.vue'
import TeamCinema from '../team/TeamCinema.vue'
import TeamBento from '../team/TeamBento.vue'

defineProps<{ serverOnline: boolean; onlinePlayers: string }>()

const { t } = useI18n()

const teamComponent = computed(() => {
    switch (CURRENT_TEAM_STYLE) {
        case 'cinema':
            return TeamCinema
        case 'bento':
            return TeamBento
        case 'artistic':
        default:
            return TeamArtistic
    }
})

const rootRef = ref<HTMLElement | null>(null)
let ctx: gsap.Context | null = null

onMounted(async () => {
  await nextTick()

  ctx = gsap.context(() => {
    const g = gsap
    const mm = g.matchMedia()

    // 延迟刷新确保 DOM 就绪
    requestAnimationFrame(() => ScrollTrigger.refresh())

    // ============ reduceMotion: 仅设置终态，不播放动画 ============
    mm.add('(prefers-reduced-motion: reduce)', () => {
      g.set('.feature-card, .server-panel, .section-header', { autoAlpha: 1, y: 0, scale: 1 })
    })

    // ============ no-preference: 全部动效 ============
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // 初始隐藏，防止 FOUC
      g.set('.feature-card', { autoAlpha: 0, y: 60 })
      g.set('.server-panel', { autoAlpha: 0, y: 50 })
      g.set('.section-header', { autoAlpha: 0, y: 30 })

      // 7. Features 入场 timeline：大卡片先入场 + 小卡片 stagger 跟进 + 入场后启动图标浮动
      const iconFloat = g.to('.feature-icon', {
        motionPath: {
          path: '#icon-float-path',
          align: 'self',
          alignOrigin: [0.5, 0.5],
        },
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        paused: true,
      })

      const featuresTl = g.timeline({
        scrollTrigger: {
          trigger: '.features-grid',
          start: 'top 75%',
          once: true,
        },
        defaults: { ease: EASINGS.entrance, duration: DURATIONS.scrollReveal },
      })
      featuresTl
        .to('.feature-card:nth-child(1)', { autoAlpha: 1, y: 0 })
        .to('.feature-card:not(:nth-child(1))', { autoAlpha: 1, y: 0, stagger: STAGGERS.cards }, '-=0.2')
        .add(() => { iconFloat.play() })

      // 8. 服务器面板入场
      g.to('.server-panel', {
        autoAlpha: 1,
        y: 0,
        stagger: 0.15,
        duration: DURATIONS.scrollReveal,
        ease: EASINGS.entrance,
        scrollTrigger: {
          trigger: '.servers-grid',
          start: 'top 85%',
          once: true,
        },
      })

      // 9. servers-section Scroll-Pinned 切换 + features spotlight + features 3D tilt（matchMedia: 桌面 + 非 reduceMotion）
      const interactionMm = g.matchMedia()
      interactionMm.add({
        isDesktop: '(min-width: 769px) and (pointer: fine)',
        reduceMotion: '(prefers-reduced-motion: reduce)',
      }, (context) => {
        const { isDesktop, reduceMotion } = context.conditions!
        if (!isDesktop || reduceMotion) return

        // 9.2 features-section spotlight cursor 跟随
        const featuresSection = g.utils.toArray<HTMLElement>('.features-section')[0]
        const setFeatureCursorX = featuresSection ? (g.quickTo(featuresSection, '--cursor-x', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)) : null
        const setFeatureCursorY = featuresSection ? (g.quickTo(featuresSection, '--cursor-y', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)) : null
        const onFeaturesMove = (e: MouseEvent) => {
          if (!featuresSection) return
          const rect = featuresSection.getBoundingClientRect()
          setFeatureCursorX?.(`${e.clientX - rect.left}px`)
          setFeatureCursorY?.(`${e.clientY - rect.top}px`)
        }
        if (featuresSection) {
          featuresSection.addEventListener('mousemove', onFeaturesMove)
        }

        // 9.3 feature-card 3D tilt + 局部 spotlight 变量（tilt ±6°）
        const featureCleanups: Array<() => void> = []
        const setupFeatureCardInteractions = (card: HTMLElement) => {
          const setRotateX = g.quickTo(card, 'rotationX', { duration: 0.3, ease: 'power2.out' })
          const setRotateY = g.quickTo(card, 'rotationY', { duration: 0.3, ease: 'power2.out' })
          const setCardX = g.quickTo(card, '--card-x', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
          const setCardY = g.quickTo(card, '--card-y', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)

          const onCardMove = (e: MouseEvent) => {
            const rect = card.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            const cx = rect.width / 2
            const cy = rect.height / 2
            const rotY = ((x - cx) / cx) * 6
            const rotX = -((y - cy) / cy) * 6
            setRotateX(rotX)
            setRotateY(rotY)
            setCardX(`${x}px`)
            setCardY(`${y}px`)
          }
          const onCardLeave = () => {
            setRotateX(0)
            setRotateY(0)
          }
          card.addEventListener('mousemove', onCardMove)
          card.addEventListener('mouseleave', onCardLeave)
          return () => {
            card.removeEventListener('mousemove', onCardMove)
            card.removeEventListener('mouseleave', onCardLeave)
          }
        }
        g.utils.toArray<HTMLElement>('.feature-card').forEach((card) => {
          featureCleanups.push(setupFeatureCardInteractions(card))
        })

        return () => {
          if (featuresSection) {
            featuresSection.removeEventListener('mousemove', onFeaturesMove)
          }
          featureCleanups.forEach(cleanup => cleanup())
          featureCleanups.length = 0
          iconFloat.pause()
        }
      })

      // ===== section-header 入场动画（features/servers/team 三处） =====
      g.utils.toArray<HTMLElement>('.section-header').forEach((header) => {
        const triggerEl = header.closest('section')
        g.to(header, {
          autoAlpha: 1,
          y: 0,
          duration: DURATIONS.scrollReveal,
          ease: EASINGS.entrance,
          scrollTrigger: {
            trigger: triggerEl || header,
            start: 'top 75%',
            once: true,
          },
        })
      })
    })
  })
})

onUnmounted(() => {
  ctx?.revert()
})
</script>
