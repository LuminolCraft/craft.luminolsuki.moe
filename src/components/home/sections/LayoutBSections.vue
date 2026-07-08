<template>
    <div ref="rootRef" class="layout-b-root">
        <!-- ===================== FEATURES SECTION (影院式冲击) ===================== -->
        <section class="features-section">
            <div class="bg-layer features-bg" aria-hidden="true"></div>
            <span class="section-index-watermark" aria-hidden="true">01</span>

            <div class="section-header">
                <h2 class="section-title">{{ t('home.features.title') }}</h2>
                <p class="section-subtitle">{{ t('home.features.subtitle') }}</p>
            </div>

            <div class="features-grid">
                <article class="feature-card">
                    <div class="feature-icon feature-icon--square">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 448 512"><path fill="white" d="M338.8-9.9c11.9 8.6 16.3 24.2 10.9 37.8L271.3 224 416 224c13.5 0 25.5 8.4 30.1 21.1s.7 26.9-9.6 35.5l-288 240c-11.3 9.4-27.4 9.9-39.3 1.3s-16.3-24.2-10.9-37.8L176.7 288 32 288c-13.5 0-25.5-8.4-30.1-21.1s-.7-26.9 9.6-35.5l288-240c11.3-9.4 27.4-9.9 39.3-1.3z" /></svg>
                    </div>
                    <h3 class="feature-title">{{ t('home.features.responsive.title') }}</h3>
                    <p class="feature-description">{{ t('home.features.responsive.desc') }}</p>
                </article>

                <article class="feature-card">
                    <div class="feature-icon feature-icon--circle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 384 512"><path fill="white" d="M16 64C16 28.7 44.7 0 80 0L304 0c35.3 0 64 28.7 64 64l0 384c0 35.3-28.7 64-64 64L80 512c-35.3 0-64-28.7-64-64L16 64zm64 0l0 304 224 0 0-304-224 0zM192 472c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32z" /></svg>
                    </div>
                    <h3 class="feature-title">{{ t('home.features.multiPlatform.title') }}</h3>
                    <p class="feature-description">{{ t('home.features.multiPlatform.desc') }}</p>
                </article>

                <article class="feature-card">
                    <div class="feature-icon feature-icon--circle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 512 512"><path fill="white" d="M256 0c4.6 0 9.2 1 13.4 2.9L457.8 82.8c22 9.3 38.4 31 38.3 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0-172.4-82.5-213.1-264-213.6-363.2-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.9 1 251.4 0 256 0zm0 66.8l0 378.1c138-66.8 175.1-214.8 176-303.4l-176-74.6 0 0z" /></svg>
                    </div>
                    <h3 class="feature-title">{{ t('home.features.secureReliable.title') }}</h3>
                    <p class="feature-description">{{ t('home.features.secureReliable.desc') }}</p>
                </article>
            </div>
        </section>

        <!-- ===================== SERVERS SECTION (横向溢出条带 + 可扩展) ===================== -->
        <section class="servers-section">
            <div class="bg-layer servers-bg" aria-hidden="true"></div>
            <span class="section-index-watermark servers-watermark" aria-hidden="true">02</span>

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
        </section>

        <!-- ===================== TEAM SECTION（动态组件，由 CURRENT_TEAM_STYLE 控制）===================== -->
        <component :is="teamComponent" :server-online="serverOnline" />
    </div>
</template>

<style scoped>
/* ===================================================================
   LayoutB — Cinema Asymmetric Impact
   移动优先：基础为单列堆叠；@media (min-width:1024px) 启用影院式构图
   =================================================================== */

.layout-b-root {
    position: relative;
}

/* ---------- 通用 section / header / 巨型编号 ---------- */
.features-section,
.servers-section {
    position: relative;
    overflow: hidden;
    background: var(--background-color);
    contain: layout style;
}

.bg-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    will-change: transform;
}

.section-header {
    position: relative;
    z-index: 2;
    margin-bottom: 2.5rem;
    will-change: transform, opacity;
}

.section-title {
    font-size: clamp(2.2rem, 9vw, 4rem);
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 0.95;
    margin: 0 0 0.75rem 0;
    background: linear-gradient(135deg, var(--text-color) 0%, var(--primary-color) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    contain: layout style paint;
}

:root[data-vt] .section-title {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.section-subtitle {
    font-size: 1.1rem;
    color: var(--text-secondary);
    max-width: 30rem;
    margin: 0;
}

/* 巨型编号水印 */
.section-index-watermark {
    position: absolute;
    top: -5vh; /* 微调点：水印垂直偏移，负值上移 */
    right: -2vw; /* 微调点：水印水平偏移，负值右移 */
    z-index: 0; /* 微调点：水印层级，0 = 最底层背景水印，不遮挡卡片 */
    pointer-events: none;
    font-size: clamp(8rem, 25vw, 15rem); /* 微调点：水印字号 */
    font-weight: 900;
    line-height: 1;
    opacity: 0.08;
    background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    will-change: transform, opacity;
    contain: layout style paint;
}

:root[data-vt] .section-index-watermark {
    color: var(--primary-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

/* ===================================================================
   FEATURES SECTION
   =================================================================== */
/* ===== 微调点：features 背景质感（多层径向渐变 + 主色光斑） ===== */
.features-section .bg-layer {
    /* 微调点：多层径向渐变，at X% Y% 控制光斑位置，百分比控制扩散范围 */
    background:
        radial-gradient(at 20% 25%, var(--primary-color) 0%, transparent 45%),
        radial-gradient(at 80% 70%, var(--accent-color) 0%, transparent 50%),
        radial-gradient(at 55% 15%, var(--primary-color) 0%, transparent 35%);
    /* 微调点：背景不透明度，0.35 偏淡 / 0.45 偏浓 */
    opacity: 0.4;
}

.features-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    position: relative;
}

.feature-card {
    position: relative;
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    background: var(--card-bg);
    padding: 1.75rem;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 10px 30px var(--shadow-color);
    will-change: transform, opacity;
    transform-style: preserve-3d;
    contain: layout style paint;
}

.feature-icon {
    width: 72px;
    height: 72px;
    background: var(--primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.25rem;
    color: #fff;
    will-change: transform;
}

.feature-icon--square { border-radius: 16px; }
.feature-icon--circle { border-radius: 50%; }

.feature-title {
    font-size: clamp(1.4rem, 2.4vw, 1.9rem);
    font-weight: 700;
    margin: 0 0 0.75rem 0;
    background: linear-gradient(135deg, var(--text-color) 0%, var(--primary-color) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    line-height: 1.1;
    contain: layout style paint;
}

:root[data-vt] .feature-title {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.feature-description {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
}

/* ===================================================================
   SERVERS SECTION
   =================================================================== */
.servers-section .bg-layer {
    background: linear-gradient(135deg, var(--primary-color), var(--background-color));
    opacity: 0.18;
}

.servers-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    counter-reset: server-counter;
}

.server-panel {
    position: relative;
    counter-increment: server-counter;
    padding: 2.5rem;
    background: var(--card-bg);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    box-shadow: 0 10px 30px var(--shadow-color);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    overflow: hidden;
    will-change: transform, opacity;
    transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    contain: layout style paint;
}

.server-index {
    display: block;
    position: absolute;
    top: -1.5rem;
    right: -0.5rem;
    z-index: 0;
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
    opacity: 0.15;
    background: linear-gradient(135deg, var(--text-color) 0%, var(--primary-color) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    transition: opacity 0.3s ease;
    contain: layout style paint;
}

.server-index::before {
    content: counter(server-counter, decimal-leading-zero);
    font-size: clamp(4rem, 12vw, 10rem);
}

:root[data-vt] .server-index {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.server-type {
    font-size: 0.85rem;
    color: var(--primary-color);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 0.5rem;
    position: relative;
    z-index: 2;
}

.server-name {
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 800;
    color: var(--text-color);
    margin: 0 0 1rem 0;
    letter-spacing: -0.02em;
    position: relative;
    z-index: 2;
}

.server-description {
    color: var(--text-secondary);
    line-height: 1.7;
    font-size: 1rem;
    margin: 0;
    position: relative;
    z-index: 2;
}

.server-panel:hover {
    transform: scale(1.05);
    border-color: var(--primary-color);
    box-shadow: 0 15px 40px var(--shadow-hover);
}

.server-panel:hover .server-index {
    opacity: 0.35;
}

@media (pointer: coarse) {
    .server-panel:hover { transform: none; }
}

/* ===================================================================
   桌面端 ≥ 1024px —— 影院式非对称冲击构图
   =================================================================== */
@media (min-width: 1024px) {
    .features-section,
    .servers-section {
        min-height: 100vh;
    }

    /* header 贴边悬浮（不占 in-flow 高度，保证 section 恰好 100vh 利于 pin） */
    .features-section .section-header {
        position: absolute;
        top: 6vh;
        left: 5vw;
        z-index: 2;
    }

    .servers-section .section-header {
        position: absolute;
        top: 6vh;
        right: 5vw;
        z-index: 2;
        text-align: right;
    }

    .section-title {
        font-size: clamp(5rem, 12vw, 12rem);
    }

    .section-index-watermark {
        font-size: clamp(15rem, 35vw, 30rem);
        top: -5vh;
        right: -2vw;
    }

    /* ---------- FEATURES：clip-path 斜切 + 四角非对称卡片 ---------- */
    .features-section {
        -webkit-clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8vw), 0 100%);
        clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8vw), 0 100%); /* 微调点：斜切量 8vw */
        /* 微调点：section 底色 fallback，.bg-layer 提供径向渐变光斑 */
        background: var(--background-color);

    }

    .features-section .bg-layer {
        opacity: 0.45; /* 微调点：桌面端背景不透明度，略高于移动端增强氛围 */
    }

    .features-grid {
        display: block;
        min-height: 100vh;
        perspective: 1000px; /* 微调点：3D 透视距离 */
    }

    .feature-card {
        position: absolute;
        width: min(30vw, 480px); /* 微调点：卡片宽度上限 */
        z-index: 3; /* 微调点：卡片层级，高于 header(2) 和 watermark(0) */
    }

    /* ===== 微调点：features 四角非对称定位（避开 header 左上角，Z 形对角流） ===== */
    .feature-card:nth-child(1) {
        /* 微调点：responsive 大卡片 → 右上角（与 header 左上角对角） */
        top: 12vh; /* 距顶距离 */
        right: 12vw; /* 距右距离 */
    }

    .feature-card:nth-child(2) {
        /* 微调点：multiplatform → 左中（header 正下方，top 需 > header 高度约 32vh） */
        top: 40vh; /* 距顶距离，确保不与 header 重叠 */
        left: 30vw; /* 距左距离 */
    }

    .feature-card:nth-child(3) {
        /* 微调点：secure → 右下角（与 card2 对角） */
        bottom: 28vh; /* 距底距离 */
        right: 10vw; /* 距右距离 */
    }

    /* ---------- SERVERS：横向溢出条带 ---------- */
    .servers-grid {
        position: relative;
        display: flex;
        flex-wrap: nowrap;
        height: 100vh;
        overflow-x: auto;
        gap: 4vw;
        padding: 0 5vw;
        scroll-snap-type: x mandatory;
        -webkit-mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
        mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
        align-items: center;
    }

    .servers-grid::-webkit-scrollbar {
        height: 8px;
    }

    .servers-grid::-webkit-scrollbar-track {
        background: var(--glass-bg);
        border-radius: 4px;
    }

    .servers-grid::-webkit-scrollbar-thumb {
        background: var(--primary-color);
        border-radius: 4px;
    }

    .server-panel {
        min-width: 420px;
        height: 70vh;
        scroll-snap-align: start;
        perspective: 1000px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
}

/* ---------- 移动端微调 ---------- */
@media (max-width: 1023px) {
    .features-section,
    .servers-section {
        min-height: auto;
        padding: 4rem 1.25rem;
    }

    .section-index-watermark {
        top: -2vh;
        right: -1vw;
    }
}

@media (max-width: 480px) {
    .section-title {
        font-size: 1.9rem;
    }
}
</style>

<script setup lang="ts">
/*
 * ===== 微调点索引（LayoutB — Cinema）=====
 * 搜索「微调点：」可定位全部可改数值，按分类：
 *
 * CSS（<style scoped> 内）：
 *   - features 背景：.features-section .bg-layer（多层径向渐变 at 位置 / 扩散 % / opacity）
 *   - features 四角定位：.feature-card:nth-child(N)（top/right/bottom/left）
 *   - features 卡片尺寸：.feature-card width min(30vw, 480px)
 *   - features 斜切：clip-path polygon calc(100% - 8vw)
 *   - 水印：.section-index-watermark（top/right/font-size/z-index/opacity）
 *   - 标题：.section-title clamp(5rem, 12vw, 12rem)
 *
 * GSAP（onMounted 内）：
 *   - pin 滚动距离：end: () => window.innerHeight * 0.8（features）
 *   - servers pin 距离：panels.length * innerHeight * 0.8（随 server 数自动扩展）
 *   - scrub 缓冲：scrub: 1
 *   - 卡片入场偏移：x ±100 / y ±40（features）
 *   - 卡片入场时长：duration 0.4~0.5
 *   - stagger 间隔：STAGGERS.cards.each（来自 @/gsap/config/staggers）
 *   - matchMedia 断点：(min-width: 1024px) and (pointer: fine)
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
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
let ctx: gsap.Context | undefined

onMounted(() => {
    if (!rootRef.value) return

    // 任务要求在组件内注册插件（与全局注册幂等，多次调用安全）
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)

    // 使用单个 gsap.context 做 selector 作用域 + cleanup；
    // matchMedia 内部本身即 context，不在其 add 回调中再嵌套 gsap.context
    ctx = gsap.context(() => {
        const mm = gsap.matchMedia()

        // ============ reduceMotion：仅设置终态 ============
        mm.add('(prefers-reduced-motion: reduce)', () => {
            gsap.set('.section-header', { autoAlpha: 1, y: 0, x: 0 })
            gsap.set('.feature-card, .server-panel', { autoAlpha: 1, y: 0, x: 0, scale: 1, rotation: 0, rotationY: 0, rotationZ: 0 })
            gsap.set('.section-index-watermark', { autoAlpha: 0.08, scale: 1, yPercent: 0 })
            gsap.set('.bg-layer', { yPercent: 0 })
            gsap.set('.servers-grid', { x: 0 })
        })

        // ============ no-preference：先设初始隐藏态，再按设备分支 ============
        mm.add('(prefers-reduced-motion: no-preference)', () => {
            gsap.set('.section-header', { autoAlpha: 0 })
            gsap.set('.feature-card', { autoAlpha: 0 })
            gsap.set('.server-panel', { autoAlpha: 0 })
            gsap.set('.section-index-watermark', { autoAlpha: 0.08 })

            const pinMm = gsap.matchMedia()
            pinMm.add(
                {
                    isDesktop: '(min-width: 1024px) and (pointer: fine)', // 微调点：桌面端阈值（含鼠标），可调 1024px
                    fallback: '(max-width: 1023px), (pointer: coarse)', // 微调点：降级阈值（触屏/窄屏）
                },
                (context) => {
                    const { isDesktop, fallback } = context.conditions!
                    const root = rootRef.value!

                    // ---------- 桌面：cinematic pin-scrub ----------
                    if (isDesktop) {
                        // ===== features-section =====
                        const featuresTl = gsap.timeline({
                            scrollTrigger: {
                                trigger: '.features-section',
                                start: 'top top',
                                end: () => '+=' + Math.round(window.innerHeight * 0.8), // 微调点：pin 滚动距离 = 0.8 × 视口高度，越大停留越久
                                pin: true,
                                scrub: 1, // 微调点：scrub 缓冲秒数，0 = 1:1 跟手，1 = 平滑缓冲
                            },
                            defaults: { ease: EASINGS.smooth },
                        })
                        featuresTl.fromTo('.features-bg', { yPercent: 0 }, { yPercent: -20, ease: 'none' }, 0)
                        featuresTl.fromTo(
                            '.features-section .section-header',
                            { autoAlpha: 0, y: 30 },
                            { autoAlpha: 1, y: 0, duration: 0.25 },
                            0,
                        )
                        featuresTl.fromTo(
                            '.features-section .section-title',
                            { clipPath: 'inset(0% 100% 0% 0%)' },
                            { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4 },
                            0,
                        )
                        featuresTl.fromTo(
                            '.features-section .section-index-watermark',
                            { scale: 1, autoAlpha: 0.08 },
                            { scale: 1.2, autoAlpha: 0.15, ease: 'none' },
                            0,
                        )
                        // ===== 微调点：features 卡片四角飞入（方向匹配 CSS 定位） =====
                        featuresTl.fromTo(
                            '.feature-card:nth-child(1)',
                            // 微调点：card1 右上角 → 从右上方飞入（x:+100 右移, y:-40 上移）
                            { autoAlpha: 0, x: 100, y: -40, rotationY: -20 },
                            { autoAlpha: 1, x: 0, y: 0, rotationY: 0, duration: 0.5 }, // 微调点：duration 入场时长
                            0.1, // 微调点：timeline 起始偏移（错峰）
                        )
                        featuresTl.fromTo(
                            '.feature-card:nth-child(2)',
                            // 微调点：card2 左中 → 从左下方飞入（x:-100 左移, y:+40 下移）
                            { autoAlpha: 0, x: -100, y: 40, rotationY: -20 },
                            { autoAlpha: 1, x: 0, y: 0, rotationY: 0, duration: 0.5 },
                            0.3,
                        )
                        featuresTl.fromTo(
                            '.feature-card:nth-child(3)',
                            // 微调点：card3 右下角 → 从右下方飞入（x:+100 右移, y:+40 下移）
                            { autoAlpha: 0, x: 100, y: 40, rotationY: -20 },
                            { autoAlpha: 1, x: 0, y: 0, rotationY: 0, duration: 0.5 },
                            0.5,
                        )

                        // ===== servers-section（横向溢出 pin）=====
                        const panels = gsap.utils.toArray<HTMLElement>('.server-panel')
                        const grid = root.querySelector<HTMLElement>('.servers-grid')
                        // 桌面 pin 时：grid 改为 overflow visible，由 section 裁切，translate grid 实现假横向滚动
                        gsap.set('.servers-grid', { overflowX: 'visible' })
                        gsap.set('.servers-section', { overflow: 'hidden' })

                        const getMaxScroll = (): number => {
                            if (!grid || panels.length === 0) return 0
                            const first = panels[0]!
                            const last = panels[panels.length - 1]!
                            const contentWidth = last.offsetLeft + last.offsetWidth - first.offsetLeft
                            return Math.max(0, contentWidth - grid.clientWidth)
                        }

                        const serversTl = gsap.timeline({
                            scrollTrigger: {
                                trigger: '.servers-section',
                                start: 'top top',
                                end: () => '+=' + Math.round(panels.length * window.innerHeight * 0.8), // 微调点：pin 距离 = servers 数 × 0.8 × 视口高，加 server 自动延长
                                pin: true,
                                scrub: 1,
                                invalidateOnRefresh: true,
                            },
                            defaults: { ease: EASINGS.smooth },
                        })
                        serversTl.fromTo('.servers-bg', { yPercent: 0 }, { yPercent: -20, ease: 'none' }, 0)
                        serversTl.fromTo(
                            '.servers-section .section-header',
                            { autoAlpha: 0, y: 30 },
                            { autoAlpha: 1, y: 0, duration: 0.25 },
                            0,
                        )
                        serversTl.fromTo(
                            '.servers-section .section-index-watermark',
                            { scale: 1, autoAlpha: 0.08 },
                            { scale: 1.2, autoAlpha: 0.15, ease: 'none' },
                            0,
                        )
                        // 横向条带位移（ease none 保证滚动↔位移 1:1）
                        serversTl.fromTo(
                            '.servers-grid',
                            { x: 0 },
                            { x: () => -getMaxScroll(), ease: 'none' },
                            0,
                        )
                        // 每个 panel 内部 rotationY 30 → 0（stagger）
                        serversTl.fromTo(
                            panels,
                            { autoAlpha: 0, rotationY: 30 },
                            { autoAlpha: 1, rotationY: 0, stagger: STAGGERS.cards.each, duration: 0.4 },
                            0.1,
                        )

                        // 延迟刷新确保 DOM 就绪
                        requestAnimationFrame(() => ScrollTrigger.refresh())
                        return
                    }

                    // ---------- 触屏 / 窄屏降级：once 入场（无 pin、无大幅变换）----------
                    if (fallback) {
                        // section-header once
                        gsap.utils.toArray<HTMLElement>('.section-header').forEach((header) => {
                            gsap.to(header, {
                                autoAlpha: 1,
                                y: 0,
                                duration: DURATIONS.entrance,
                                ease: EASINGS.entrance,
                                scrollTrigger: { trigger: header, start: 'top %', once: true },
                            })
                        })
                        // feature-card once（stagger）
                        gsap.fromTo(
                            '.feature-card',
                            { autoAlpha: 0, y: 30 },
                            {
                                autoAlpha: 1,
                                y: 0,
                                stagger: STAGGERS.cards.each,
                                duration: DURATIONS.scrollReveal,
                                ease: EASINGS.entrance,
                                scrollTrigger: { trigger: '.features-grid', start: 'top 80%', once: true },
                            },
                        )
                        // server-panel once（stagger，保留 overflow-x: auto 手动滚动）
                        gsap.fromTo(
                            '.server-panel',
                            { autoAlpha: 0, x: 30 },
                            {
                                autoAlpha: 1,
                                x: 0,
                                stagger: STAGGERS.cards.each,
                                duration: DURATIONS.scrollReveal,
                                ease: EASINGS.entrance,
                                scrollTrigger: { trigger: '.servers-grid', start: 'top 80%', once: true },
                            },
                        )
                    }
                },
            )
        })
    }, rootRef.value)
})

onUnmounted(() => {
    ctx?.revert()
})
</script>
