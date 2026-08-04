<template>
    <!--
        TeamCinema — 影院式非对称四角构图 + bg-layer 视差 + Pin-Scrub
        从 LayoutBSections.vue 提取，contributors 数据来自 @/config/team-members
        微调点索引见 <script setup> 顶部注释
    -->
    <section ref="sectionRef" class="team-section">
        <div class="bg-layer team-bg" aria-hidden="true"></div>
        <span class="section-index-watermark team-watermark" aria-hidden="true">03</span>

        <div class="section-header">
            <h2 class="section-title">{{ t('home.team.title') }}</h2>
            <p class="section-subtitle">{{ t('home.team.subtitle') }}</p>
        </div>

        <div class="team-grid">
            <article
                v-for="c in contributors"
                :key="c.name"
                class="contributor-card"
                :class="{ 'contributor-card--owner': c.isOwner }"
            >
                <div class="contributor-avatar-container">
                    <img :src="c.avatar" :alt="c.name" class="contributor-avatar" loading="lazy" />
                </div>
                <div class="contributor-info">
                    <div class="contributor-name">{{ c.name }}</div>
                    <div class="contributor-role">{{ t(`home.team.roles.${c.roleKey}`) }}</div>
                    <div class="contributor-links-wrapper">
                        <a :href="c.githubHref" target="_blank" rel="noopener noreferrer" class="contributor-github-link">
                            <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            {{ c.githubLabel }}
                        </a>
                        <div v-if="c.extraLinks && c.extraLinks.length" class="contributor-links">
                            <a
                                v-for="(link, i) in c.extraLinks"
                                :key="i"
                                :href="link.href"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <i :class="iconClass[link.type]"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </article>
        </div>
    </section>
</template>

<style scoped>
@import '../../../styles/theme-colors.css';

/* ===================================================================
   TeamCinema — Cinema Asymmetric Impact（移动优先：单列堆叠；@media (min-width:1024px) 启用影院式构图）
   =================================================================== */
.team-section {
    position: relative;
    overflow: hidden;
    background: var(--background-color);
    contain: layout style;
}

/* ---------- bg-layer / 巨型编号水印 / section-header / 标题 ---------- */
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
   TEAM SECTION
   =================================================================== */
.team-section .bg-layer {
    background: linear-gradient(135deg, var(--glass-bg), var(--background-color));
    opacity: 0.5;
}

.team-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    position: relative;
}

.contributor-card {
    --card-x: 50%;
    --card-y: 50%;
    position: relative;
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    background: var(--card-bg);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    will-change: transform, opacity;
    transform-style: preserve-3d;
    contain: layout style paint;
}

.contributor-avatar-container {
    position: relative;
    flex-shrink: 0;
}

.contributor-avatar {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    object-fit: cover;
    border: 2px solid var(--glass-border);
    display: block;
}

.contributor-card--owner .contributor-avatar {
    width: 88px;
    height: 88px;
    border-radius: 16px;
}

.contributor-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.contributor-name {
    font-size: clamp(1.4rem, 3vw, 2rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, var(--text-color) 0%, var(--primary-color) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    line-height: 1;
    word-break: break-word;
    contain: layout style paint;
}

:root[data-vt] .contributor-name {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.contributor-card--owner .contributor-name {
    font-size: clamp(2.2rem, 4.5vw, 3.4rem);
}

.contributor-role {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-style: italic;
    margin: 0;
    line-height: 1.4;
}

.contributor-links-wrapper {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
}

.contributor-github-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--online-color);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 500;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.github-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.contributor-links {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
}

.contributor-links a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 50%;
    color: var(--text-color);
    text-decoration: none;
    transition: all 0.3s ease;
    font-size: 1em;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
}

.contributor-links a:hover {
    background: var(--primary-color);
    color: #fff;
}

/* ===================================================================
   桌面端 ≥ 1024px —— 影院式非对称冲击构图
   =================================================================== */
@media (min-width: 1024px) {
    .team-section {
        min-height: 100vh;
    }

    /* header 贴边悬浮（不占 in-flow 高度，保证 section 恰好 100vh 利于 pin） */
    .team-section .section-header {
        position: absolute;
        top: 6vh;
        left: 5vw;
        z-index: 2;
    }

    .section-title {
        font-size: clamp(5rem, 12vw, 12rem);
    }

    .section-index-watermark {
        font-size: clamp(15rem, 35vw, 30rem);
        top: -5vh;
        right: -2vw;
    }

    /* ---------- TEAM：非对称四角构图 ---------- */
    .team-grid {
        display: block;
        position: relative;
        width: 100%;
        height: 100vh;
        perspective: 1000px;
    }

    .contributor-card {
        position: absolute;
        z-index: 3;
    }

    /* ===== 微调点：team 六人非对称四角定位（gap ≥ 4vw，无重叠） ===== */
    .contributor-card--owner {
        /* 微调点：owner 左中大卡（MrHua269） */
        top: 18vh; /* 距顶距离 */
        left: 4vw; /* 距左距离 */
        width: 38vw; /* 宽度 */
        height: 64vh; /* 高度 */
    }

    .contributor-card:nth-child(2) {
        /* 微调点：NaT_Jerry 右上 */
        top: 7vh;
        right: 5vw;
        width: 24vw;
        height: 28vh;
    }

    .contributor-card:nth-child(3) {
        /* 微调点：Klop233 右中（与 n2 v-gap 3vh） */
        top: 38vh;
        right: 5vw;
        width: 24vw;
        height: 28vh;
    }

    .contributor-card:nth-child(4) {
        /* 微调点：IngilYing 右下（与 n3 v-gap 3vh） */
        top: 69vh;
        right: 5vw;
        width: 24vw;
        height: 25vh;
    }

    .contributor-card:nth-child(5) {
        /* 微调点：xiaomu18 底部居中（owner 右侧 h-gap 4vw，IngilYing 左侧 h-gap 5vw） */
        bottom: 6vh;
        left: 46vw;
        width: 20vw;
        height: 30vh;
    }

    .contributor-card:nth-child(6) {
        /* 微调点：Narcssu 顶部居中（owner 右侧 h-gap 4vw，NaT_Jerry 左侧 h-gap 5vw） */
        top: 10vh;
        left: 46vw;
        width: 20vw;
        height: 28vh;
    }
}

/* ---------- 移动端微调 ---------- */
@media (max-width: 1023px) {
    .team-section {
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
/* ============================================================
   微调点索引 — TeamCinema
   搜索「微调点：」可定位全部可改数值，按分类：

   CSS（<style scoped> 内）：
   - team 六人定位：.contributor-card--owner + :nth-child(2~6)（top/right/bottom/left/width/height）
   - 水印：.section-index-watermark（top/right/font-size/z-index/opacity）
   - 标题：.section-title clamp(5rem, 12vw, 12rem)
   - team 背景：.team-section .bg-layer linear-gradient + opacity

   GSAP（onMounted 内）：
   - pin 滚动距离：end: () => window.innerHeight * 0.8
   - scrub 缓冲：scrub: 1
   - 卡片入场偏移：x ±80 / y 60
   - 卡片入场时长：duration 0.4
   - owner 初始缩放：scale 0.5
   - rotationZ：±5°
   - stagger 间隔：STAGGERS.cards.each / STAGGERS.list.each
   - matchMedia 断点：(min-width: 1024px) and (pointer: fine)
   ============================================================ */
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DURATIONS } from '@/gsap/config/durations'
import { EASINGS } from '@/gsap/config/easings'
import { STAGGERS } from '@/gsap/config/staggers'
import { contributors } from '@/config/team-members'

defineProps<{ serverOnline?: boolean }>()

const { t } = useI18n()

// extraLinks type → FontAwesome 图标类映射
const iconClass: Record<'qq' | 'email', string> = {
    qq: 'fa-brands fa-qq',
    email: 'fas fa-envelope',
}

const sectionRef = ref<HTMLElement | null>(null)
let ctx: gsap.Context | null = null

onMounted(() => {
    ctx = gsap.context(() => {
        const mm = gsap.matchMedia()

        // 延迟刷新确保 DOM 就绪
        requestAnimationFrame(() => ScrollTrigger.refresh())

        // ============ reduceMotion: 仅设置终态，不播放动画 ============
        mm.add('(prefers-reduced-motion: reduce)', () => {
            gsap.set('.contributor-card, .section-header, .team-bg, .section-index-watermark', {
                autoAlpha: 1,
                y: 0,
                yPercent: 0,
                scale: 1,
                rotationZ: 0,
            })
        })

        // ============ no-preference: 全部动画 ============
        mm.add('(prefers-reduced-motion: no-preference)', () => {
            // 初始隐藏，防止 FOUC
            gsap.set('.contributor-card', { autoAlpha: 0 })
            gsap.set('.section-header', { autoAlpha: 0, y: 30 })

            // ★team-section pin-scrub 过渡（gsap 官网风格）+ 触屏/窄屏/reduceMotion 降级★
            const pinMm = gsap.matchMedia()
            pinMm.add({
                isDesktop: '(min-width: 1024px) and (pointer: fine)', // 微调点：桌面端阈值
                fallback: '(max-width: 1023px), (pointer: coarse)', // 微调点：降级阈值
                reduceMotion: '(prefers-reduced-motion: reduce)',
            }, (context) => {
                const { isDesktop, fallback, reduceMotion } = context.conditions!
                // reduceMotion：终态已由上方 mm.reduceMotion 块设置，此处直接跳过
                if (reduceMotion) return

                if (isDesktop) {
                    // ============ 桌面：team-section pin-scrub timeline ============
                    const teamTl = gsap.timeline({
                        scrollTrigger: {
                            trigger: sectionRef.value,
                            start: 'top top',
                            end: () => '+=' + Math.round(window.innerHeight * 0.8), // 微调点：pin 滚动距离 = 0.8 × 视口高度
                            pin: true,
                            scrub: 1,
                        },
                        defaults: { ease: EASINGS.smooth },
                    })
                    teamTl.fromTo('.team-bg', { yPercent: 0 }, { yPercent: -20, ease: 'none' }, 0)
                    teamTl.fromTo(
                        '.section-header',
                        { autoAlpha: 0, y: 30 },
                        { autoAlpha: 1, y: 0, duration: 0.25 },
                        0,
                    )
                    teamTl.fromTo(
                        '.section-index-watermark',
                        { yPercent: 0, autoAlpha: 0.08 },
                        { yPercent: -10, autoAlpha: 0.15, ease: 'none' },
                        0,
                    )
                    // ===== 微调点：team 卡片入场（owner 缩放，其余 x/y 偏移 + rotationZ） =====
                    // owner scale 0.5 → 1 + autoAlpha 0 → 1
                    teamTl.fromTo(
                        '.contributor-card--owner',
                        { autoAlpha: 0, scale: 0.5 }, // 微调点：owner 初始缩放 0.5
                        { autoAlpha: 1, scale: 1, duration: 0.4 }, // 微调点：duration 入场时长
                        0.1,
                    )
                    // 其他卡片按位置 x/y 偏移 + rotationZ ±5 + autoAlpha 0 → 1（stagger）
                    const otherCards = gsap.utils.toArray<HTMLElement>(
                        '.contributor-card:not(.contributor-card--owner)',
                    )
                    teamTl.fromTo(
                        otherCards,
                        {
                            autoAlpha: 0,
                            x: (i: number) => (i % 2 === 0 ? 80 : -80), // 微调点：横向偏移 ±80px，偶数右移/奇数左移
                            y: 60, // 微调点：纵向偏移 60px（从下方滑入）
                            rotationZ: (i: number) => (i % 2 === 0 ? 5 : -5), // 微调点：旋转 ±5°
                        },
                        {
                            autoAlpha: 1,
                            x: 0, // 终态回到 CSS absolute 坐标
                            y: 0,
                            rotationZ: 0,
                            stagger: STAGGERS.cards.each, // 微调点：stagger 间隔
                            duration: 0.4,
                        },
                        0.3,
                    )

                    // 延迟刷新确保 DOM 就绪
                    requestAnimationFrame(() => ScrollTrigger.refresh())
                    return
                }

                // ---------- 触屏 / 窄屏降级：once 入场（无 pin、无大幅变换）----------
                if (fallback) {
                    // section-header once
                    gsap.to('.section-header', {
                        autoAlpha: 1,
                        y: 0,
                        duration: DURATIONS.entrance,
                        ease: EASINGS.entrance,
                        scrollTrigger: { trigger: '.section-header', start: 'top 80%', once: true },
                    })
                    // contributor-card once（owner 先，其他 stagger）
                    const fbTeamTl = gsap.timeline({
                        scrollTrigger: { trigger: '.team-grid', start: 'top 80%', once: true },
                        defaults: { ease: EASINGS.entrance, duration: DURATIONS.entrance },
                    })
                    fbTeamTl
                        .fromTo('.contributor-card--owner', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0 })
                        .fromTo(
                            '.contributor-card:not(.contributor-card--owner)',
                            { autoAlpha: 0, y: 30 },
                            { autoAlpha: 1, y: 0, stagger: STAGGERS.list.each },
                            '+=0.1',
                        )
                }
            })
        })
    }, sectionRef.value ?? undefined)
})

onUnmounted(() => {
    ctx?.revert()
})
</script>
