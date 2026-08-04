<template>
    <!--
        TeamArtistic — Z 形对角流 + 有机旋转卡片 + Pin-Scrub 滚动叙事
        从 LayoutASections.vue 提取，contributors 数据来自 @/config/team-members
        微调点索引见 <script setup> 顶部注释
    -->
    <section ref="sectionRef" class="team-section">
        <div class="team-container">
            <div class="section-header">
                <h2 class="section-title">{{ t('home.team.title') }}</h2>
                <p class="section-subtitle">{{ t('home.team.subtitle') }}</p>
            </div>

            <!-- 服务器管理组（唯一分组） -->
            <div class="team-subsection">
                <div class="subsection-header">
                    <h3 class="subsection-title">{{ t('home.team.management.title') }}</h3>
                    <p class="subsection-description">{{ t('home.team.management.subtitle') }}</p>
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
            </div>
        </div>
    </section>
</template>

<style scoped>
@import '../../../styles/theme-colors.css';

/* ===== 团队区域 - Kinetic Typography + Spotlight + Bento + Inertia Parallax ===== */
.team-section {
    --cursor-x: 50%;
    --cursor-y: 50%;
    position: relative;
    padding: 100px 0;
    background: var(--background-color);
    overflow: hidden;
}

/* 斜向视觉轴（section 背景交界处） */
.team-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
    transform: skewY(-2deg);
    transform-origin: left center;
    opacity: 0.25;
    pointer-events: none;
    z-index: 0;
}

/* Section-level spotlight cursor 高光层 */
.team-section::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    background: radial-gradient(
        circle 300px at var(--cursor-x) var(--cursor-y),
        rgba(99, 102, 241, 0.12),
        transparent 70%
    );
    opacity: 0;
    transition: opacity 0.4s ease;
}

.team-section:hover::after { opacity: 1; }

@media (pointer: coarse) {
    .team-section::after { display: none; }
}

.team-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
    position: relative;
    z-index: 2;
    transform: translateX(-3%); /* 微调点：team 容器左偏 -3%，与 features 同侧形成 Z 形 */
}

/* section-header 左对齐（杂志式贴边标题） */
.section-header {
    margin-bottom: 60px;
    text-align: left;
    will-change: transform, opacity;
}

/* Kinetic Typography 超大杂志式标题 */
.section-title {
    font-size: clamp(3rem, 7vw, 6rem); /* 微调点：标题字号 */
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, var(--text-color) 0%, var(--primary-color) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    contain: layout style paint;
}

/* View Transitions 期间纯色兜底（避免 background-clip:text 闪烁） */
:root[data-vt] .section-title {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.section-subtitle {
    font-size: 1.2rem;
    color: var(--text-secondary);
    max-width: 480px;
    margin-right: auto;
    margin-left: 0;
}

.team-subsection {
    margin-bottom: 3rem;
}

.subsection-header {
    margin-bottom: 2rem;
    text-align: center;
}

.subsection-title {
    font-size: 1.5em;
    font-weight: 600;
    color: var(--primary-color);
    margin: 0 0 0.5rem 0;
}

.subsection-description {
    font-size: 1em;
    color: var(--text-secondary);
    margin: 0;
}

/* Asymmetric Bento Grid + 3D Tilt 支撑 */
.team-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(3, minmax(160px, auto));
    grid-template-areas:
        "owner owner nat   klop"
        "owner owner nat   ingil"
        "xiaomu xiaomu nar  nar";
    gap: 1.5rem;
    margin-top: 2rem;
    perspective: 1000px;
}

.contributor-card:nth-child(1) { grid-area: owner; }
.contributor-card:nth-child(2) { grid-area: nat; }
.contributor-card:nth-child(3) { grid-area: klop; }
.contributor-card:nth-child(4) { grid-area: ingil; }
.contributor-card:nth-child(5) { grid-area: xiaomu; }
.contributor-card:nth-child(6) { grid-area: nar; }

.contributor-card {
    --card-x: 50%;
    --card-y: 50%;
    --border-angle: 0deg;
    --avatar-glow-x: 50%;
    --avatar-glow-y: 50%;
    position: relative;
    border: 2px solid transparent;
    border-radius: 16px;
    background:
        linear-gradient(var(--card-bg), var(--card-bg)) padding-box,
        conic-gradient(from var(--border-angle), var(--primary-color), transparent 30%, var(--primary-color)) border-box;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    will-change: transform;
    transform-style: preserve-3d;
    transition: border-color 0.3s ease;
}

/* 有机轻微旋转（owner 0°，其他 ±2° 交替；CSS rotate 设基础，GSAP tilt 用 rotationX/Y 不冲突） */
.contributor-card:nth-child(1) { transform: rotate(0deg); }
.contributor-card:nth-child(2) { transform: rotate(2deg); }
.contributor-card:nth-child(3) { transform: rotate(-2deg); }
.contributor-card:nth-child(4) { transform: rotate(2deg); }
.contributor-card:nth-child(5) { transform: rotate(-2deg); }
.contributor-card:nth-child(6) { transform: rotate(2deg); }

/* 卡片局部 spotlight 高光层 */
.contributor-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
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

.contributor-card:hover::before { opacity: 1; }

@media (pointer: coarse) {
    .contributor-card::before { display: none; }
}

/* 卡片布局 */
.contributor-avatar-container {
    position: relative;
    flex-shrink: 0;
    padding: 4px;
}

/* 头像光晕层 */
.contributor-avatar-container::after {
    content: '';
    position: absolute;
    inset: -20px;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(
        circle 60px at var(--avatar-glow-x) var(--avatar-glow-y),
        rgba(99, 102, 241, 0.3),
        transparent 70%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
}

.contributor-card:hover .contributor-avatar-container::after { opacity: 1; }

@media (pointer: coarse) {
    .contributor-avatar-container::after { display: none; }
}

.contributor-avatar {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    object-fit: cover;
    border: 2px solid var(--glass-border);
    display: block;
    position: relative;
    z-index: 2;
}

.contributor-card--owner .contributor-avatar {
    width: 80px;
    height: 80px;
    border-radius: 16px;
}

.contributor-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    position: relative;
    z-index: 2;
}

.contributor-links-wrapper {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-top: 0.5rem;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.3s ease, transform 0.3s ease;
}

/* Owner 卡片链接默认可见 */
.contributor-card--owner .contributor-links-wrapper {
    opacity: 1;
    transform: translateY(0);
}

/* 非 Owner 卡片 hover 时显示链接 */
.contributor-card:not(.contributor-card--owner):hover .contributor-links-wrapper {
    opacity: 1;
    transform: translateY(0);
}

/* Kinetic Typography */
.contributor-name {
    font-size: clamp(1.5rem, 3vw, 2.5rem); /* 微调点：普通成员名字字号 */
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

/* View Transitions 期间纯色兜底（避免 background-clip:text 闪烁） */
:root[data-vt] .contributor-name {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.contributor-card--owner .contributor-name {
    font-size: clamp(2.5rem, 5vw, 4rem); /* 微调点：owner 名字字号 */
}

.contributor-role {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-style: italic;
    margin: 0;
    line-height: 1.4;
}

.contributor-github-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--online-color);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 500;
    transition: color 0.3s ease;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    will-change: transform;
}

.contributor-github-link:hover {
    color: var(--online-color);
    text-decoration: none;
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
    margin-left: 0.8rem;
    vertical-align: middle;
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
    will-change: transform;
}

.contributor-links a:hover {
    background: var(--primary-color);
    color: white;
    transform: scale(1.1);
}

/* ===== 响应式：移动端切换布局 ===== */
@media (max-width: 1024px) {
    .team-grid {
        grid-template-columns: repeat(2, 1fr);
        grid-template-areas:
            "owner owner"
            "nat klop"
            "ingil nar"
            "xiaomu xiaomu";
    }
}

/* 1023px / 触屏 / reduceMotion：去除对角偏移与旋转，退化为单列堆叠 */
@media (max-width: 1023px), (pointer: coarse), (prefers-reduced-motion: reduce) {
    .team-container {
        transform: none;
    }

    .contributor-card,
    .contributor-card:nth-child(n) {
        transform: none;
        margin-left: 0;
        margin-right: 0;
    }
}

@media (max-width: 768px) {
    /* 团队退化为单列 */
    .team-grid {
        grid-template-columns: 1fr;
        grid-template-areas: none;
    }

    .contributor-card,
    .contributor-card:nth-child(n) {
        grid-area: auto;
    }

    .section-title {
        font-size: 2rem;
    }
}

@media (max-width: 480px) {
    .section-title {
        font-size: 1.8rem;
    }
}
</style>

<script setup lang="ts">
/* ============================================================
   微调点索引 — TeamArtistic
   CSS（<style scoped> 内）：
   - team 容器左偏：.team-container transform: translateX(-3%)
   - 标题字号：.section-title clamp(3rem, 7vw, 6rem)
   - 名字字号：.contributor-name clamp(1.5rem, 3vw, 2.5rem) / owner clamp(2.5rem, 5vw, 4rem)
   - 卡片旋转：.contributor-card:nth-child(N) rotate(±2deg)
   - grid 布局：.team-grid grid-template-areas

   GSAP（onMounted 内）：
   - pin 滚动距离：end: '+=120%'（team 略长以容纳 6 张卡片）
   - scrub 缓冲：scrub: 1
   - 卡片入场偏移：x ±60 / y 30 / scale 0.95
   - 卡片入场时长：duration 0.12~0.15
   - stagger 间隔：0.06
   - 3D Tilt 最大角度：±8°
   - magnetic links 吸引范围：80px
   - matchMedia 断点：(min-width: 1024px) and (pointer: fine)
   ============================================================ */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DURATIONS } from '@/gsap/config/durations'
import { EASINGS } from '@/gsap/config/easings'
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

onMounted(async () => {
    await nextTick()

    ctx = gsap.context(() => {
        const g = gsap
        const mm = g.matchMedia()

        // 延迟刷新确保 DOM 就绪
        requestAnimationFrame(() => ScrollTrigger.refresh())

        // ============ reduceMotion: 仅设置终态，不播放动画 ============
        mm.add('(prefers-reduced-motion: reduce)', () => {
            g.set('.contributor-card, .section-header', { autoAlpha: 1, y: 0, scale: 1 })
        })

        // ============ no-preference: 全部动画 ============
        mm.add('(prefers-reduced-motion: no-preference)', () => {
            // 初始隐藏，防止 FOUC
            g.set('.contributor-card', { autoAlpha: 0, y: 40 })
            g.set('.section-header', { autoAlpha: 0, y: 30 })

            // Section-level spotlight cursor 跟随（gsap-utils: quickTo 避免高频 mousemove 创建新 tween）
            const teamSection = sectionRef.value
            const setCursorX = teamSection ? (g.quickTo(teamSection, '--cursor-x', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)) : null
            const setCursorY = teamSection ? (g.quickTo(teamSection, '--cursor-y', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)) : null
            const onTeamMove = (e: MouseEvent) => {
                if (!teamSection) return
                const rect = teamSection.getBoundingClientRect()
                setCursorX?.(`${e.clientX - rect.left}px`)
                setCursorY?.(`${e.clientY - rect.top}px`)
            }
            if (teamSection) {
                teamSection.addEventListener('mousemove', onTeamMove)
            }

            // ★team-section pin-scrub 过渡（gsap 官网风格）+ 触屏/窄屏/reduceMotion 降级★
            const pinMm = g.matchMedia()
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
                    const teamTl = g.timeline({
                        scrollTrigger: {
                            trigger: sectionRef.value,
                            start: 'top top',
                            end: '+=120%', // 微调点：pin 略长以容纳 6 张卡片
                            pin: true,
                            scrub: 1, // 微调点：scrub 缓冲秒数
                        },
                        defaults: { ease: EASINGS.smooth },
                    })
                    // 0~25%：section-header + subsection-header 从左飞入归位
                    teamTl.fromTo('.section-header, .subsection-header',
                        { autoAlpha: 0, x: -80, y: 0 },
                        { autoAlpha: 1, x: 0, y: 0, duration: 0.25 }
                    )
                    // 25~80%：contributor-card 依次错位归位（owner 先，其他 stagger 跟进）
                    teamTl.fromTo('.contributor-card--owner',
                        { autoAlpha: 0, x: -60, y: 30, scale: 0.95, rotation: 0 },
                        { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0, duration: 0.15 },
                        0.25
                    )
                    const otherCards = g.utils.toArray<HTMLElement>('.contributor-card:not(.contributor-card--owner)')
                    otherCards.forEach((card, i) => {
                        // CSS 设计值：非 owner 卡片 ±2° 交替（nth-child 2,3,4,5,6 → 2,-2,2,-2,2）
                        const rest = (i % 2 === 0) ? 2 : -2
                        teamTl.fromTo(card,
                            { autoAlpha: 0, x: 60, y: 30, rotation: rest * 2 },
                            { autoAlpha: 1, x: 0, y: 0, rotation: rest, duration: 0.12 },
                            0.35 + i * 0.06
                        )
                    })
                    // 80~100%：头像 + 名字 + 角色依次揭示
                    teamTl.fromTo('.contributor-avatar-container',
                        { autoAlpha: 0 },
                        { autoAlpha: 1, stagger: 0.05, duration: 0.1 },
                        0.80
                    )
                    teamTl.fromTo('.contributor-name',
                        { autoAlpha: 0, y: 10 },
                        { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.1 },
                        0.85
                    )
                    teamTl.fromTo('.contributor-role',
                        { autoAlpha: 0 },
                        { autoAlpha: 1, stagger: 0.05, duration: 0.1 },
                        0.90
                    )
                    return
                }

                // ============ 触屏 / 窄屏降级：常规滚动 + 入场 once（无 pin、无 rotate 动画） ============
                if (fallback) {
                    // contributor-card 入场 once（owner 先，其他 stagger 跟进）
                    const fbTeamTl = g.timeline({
                        scrollTrigger: { trigger: '.team-grid', start: 'top 80%', once: true },
                        defaults: { ease: EASINGS.entrance, duration: DURATIONS.entrance },
                    })
                    fbTeamTl.fromTo('.contributor-card--owner',
                        { autoAlpha: 0, y: 30 },
                        { autoAlpha: 1, y: 0 }
                    ).fromTo('.contributor-card:not(.contributor-card--owner)',
                        { autoAlpha: 0, y: 30 },
                        { autoAlpha: 1, y: 0, stagger: 0.08 },
                        '+=0.1'
                    )
                }
            })

            // 卡片多交互效果（3D Tilt + 局部 spotlight + name 视差 + 头像 glow + border-angle + magnetic links）
            const setupCardInteractions = (card: HTMLElement) => {
                const isOwner = card.classList.contains('contributor-card--owner')
                const nameEl = card.querySelector<HTMLElement>('.contributor-name')
                const links = card.querySelectorAll<HTMLElement>('.contributor-github-link, .contributor-links a')
                const linksWrapper = card.querySelector<HTMLElement>('.contributor-links-wrapper')

                // quickTo setters
                const setRotateX = g.quickTo(card, 'rotationX', { duration: 0.3, ease: 'power2.out' })
                const setRotateY = g.quickTo(card, 'rotationY', { duration: 0.3, ease: 'power2.out' })
                const setCardX = g.quickTo(card, '--card-x', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
                const setCardY = g.quickTo(card, '--card-y', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
                const setBorderAngle = g.quickTo(card, '--border-angle', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
                const setAvatarGlowX = g.quickTo(card, '--avatar-glow-x', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
                const setAvatarGlowY = g.quickTo(card, '--avatar-glow-y', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
                const setNameX = nameEl ? g.quickTo(nameEl, 'x', { duration: 0.3, ease: 'power2.out' }) : null
                const setNameY = nameEl ? g.quickTo(nameEl, 'y', { duration: 0.3, ease: 'power2.out' }) : null
                const linkSetters = Array.from(links).map(link => ({
                    el: link,
                    setX: g.quickTo(link, 'x', { duration: 0.3, ease: 'power2.out' }),
                    setY: g.quickTo(link, 'y', { duration: 0.3, ease: 'power2.out' }),
                }))

                const onCardMove = (e: MouseEvent) => {
                    const rect = card.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const y = e.clientY - rect.top
                    const cx = rect.width / 2
                    const cy = rect.height / 2
                    // 3D Tilt（最大 ±8°）
                    const rotY = ((x - cx) / cx) * 8
                    const rotX = -((y - cy) / cy) * 8
                    setRotateX(rotX)
                    setRotateY(rotY)
                    // 局部 spotlight 变量
                    setCardX(`${x}px`)
                    setCardY(`${y}px`)
                    // border-angle（基于鼠标在卡片内的角度，0-360°）
                    const angle = (Math.atan2(y - cy, x - cx) * 180 / Math.PI + 360) % 360
                    setBorderAngle(`${angle}deg`)
                    // 头像 glow 偏移（最大 ±12px）
                    setAvatarGlowX(`${50 + ((x - cx) / cx) * 25}%`)
                    setAvatarGlowY(`${50 + ((y - cy) / cy) * 25}%`)
                    // kinetic name 反向视差（最大 ±8px）
                    setNameX?.(-((x - cx) / cx) * 8)
                    setNameY?.(-((y - cy) / cy) * 8)
                    // magnetic links（80px 范围内吸引）
                    linkSetters.forEach(({ el, setX, setY }) => {
                        const linkRect = el.getBoundingClientRect()
                        const linkCx = linkRect.left + linkRect.width / 2
                        const linkCy = linkRect.top + linkRect.height / 2
                        const dx = e.clientX - linkCx
                        const dy = e.clientY - linkCy
                        const dist = Math.hypot(dx, dy)
                        if (dist < 80) {
                            const factor = (1 - dist / 80) * 6
                            setX((dx / dist) * factor)
                            setY((dy / dist) * factor)
                        } else {
                            setX(0)
                            setY(0)
                        }
                    })
                }

                const onCardEnter = () => {
                    // 非 Owner 卡片：reveal 社交链接
                    if (!isOwner && linksWrapper) {
                        g.to(linksWrapper, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' })
                    }
                }

                const onCardLeave = () => {
                    setRotateX(0)
                    setRotateY(0)
                    setNameX?.(0)
                    setNameY?.(0)
                    linkSetters.forEach(({ setX, setY }) => { setX(0); setY(0) })
                    if (!isOwner && linksWrapper) {
                        g.to(linksWrapper, { autoAlpha: 0, y: 8, duration: 0.2, ease: 'power2.in' })
                    }
                }

                card.addEventListener('mousemove', onCardMove)
                card.addEventListener('mouseenter', onCardEnter)
                card.addEventListener('mouseleave', onCardLeave)

                return () => {
                    card.removeEventListener('mousemove', onCardMove)
                    card.removeEventListener('mouseenter', onCardEnter)
                    card.removeEventListener('mouseleave', onCardLeave)
                }
            }

            // 用 matchMedia 包裹卡片交互（触屏与 reduce-motion 跳过）
            const cardMm = g.matchMedia()
            const cardCleanups: Array<() => void> = []
            cardMm.add({
                isDesktop: '(min-width: 769px) and (pointer: fine)',
                reduceMotion: '(prefers-reduced-motion: reduce)',
            }, (context) => {
                const { isDesktop, reduceMotion } = context.conditions!
                if (!isDesktop || reduceMotion) return
                g.utils.toArray<HTMLElement>('.contributor-card').forEach((card) => {
                    cardCleanups.push(setupCardInteractions(card))
                })
            })

            // 清理鼠标监听
            return () => {
                if (teamSection) {
                    teamSection.removeEventListener('mousemove', onTeamMove)
                }
                cardCleanups.forEach(cleanup => cleanup())
                cardCleanups.length = 0
            }
        })
    }, sectionRef.value ?? undefined)
})

onUnmounted(() => {
    ctx?.revert()
})
</script>
