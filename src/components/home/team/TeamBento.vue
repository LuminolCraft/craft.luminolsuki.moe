<template>
    <!--
        TeamBento — 球状头像散布 + 光标排斥互动 + 安全区保护
        从 LayoutCSections.vue 提取，contributors 数据来自 @/config/team-members
        微调点索引见 <script setup> 顶部注释
    -->
    <section ref="sectionRef" class="team-section">
        <div class="team-container">
            <div class="section-header">
                <h2 class="section-title">{{ t('home.team.title') }}</h2>
                <p class="section-subtitle">{{ t('home.team.subtitle') }}</p>
            </div>
        </div>

        <!-- 球状头像散布层（桌面端随机位置 + 光标排斥；移动端垂直堆叠） -->
        <div class="team-balls">
            <article
                v-for="c in contributors"
                :key="c.name"
                class="team-ball"
                :class="{ 'team-ball--owner': c.isOwner }"
            >
                <div class="team-ball-avatar">
                    <img :src="c.avatar" :alt="c.name" loading="lazy" />
                </div>
                <div class="team-ball-meta">
                    <div class="team-ball-name">{{ c.name }}</div>
                    <div class="team-ball-role">{{ t(`home.team.roles.${c.roleKey}`) }}</div>
                    <a
                        class="team-ball-github"
                        :href="c.githubHref"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <svg class="team-ball-github-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        {{ c.githubLabel }}
                    </a>
                    <div v-if="c.extraLinks && c.extraLinks.length" class="team-ball-links">
                        <a
                            v-for="link in c.extraLinks"
                            :key="link.href"
                            :href="link.href"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <i :class="iconClass[link.type]"></i>
                        </a>
                    </div>
                </div>
            </article>
        </div>
    </section>
</template>

<style scoped>
@import '../../../styles/theme-colors.css';

/* ============================================================
   CSS 微调点索引 — 球状 team 区域
   1. 球体尺寸：.team-ball--owner / .team-ball 的 clamp 值
   2. 边框与发光：.team-ball--owner border+box-shadow / .team-ball border+hover box-shadow
   3. 间距与安全区：SECTION_MARGIN / SAFE_PADDING / GAP（script 常量）
   4. section 布局：.team-section min-height / .team-balls inset / .section-header z-index
   5. 文字样式：.team-ball-name clamp / .team-ball-role font-size
   6. 移动端：@media 球体尺寸 / gap / padding
   ============================================================ */

/* ===== 团队区域 - 球状头像散布 + 光标排斥互动 ===== */
.team-section {
    --cursor-x: 50%;
    --cursor-y: 50%;
    position: relative;
    min-height: 100vh; /* 微调点：桌面端 section 最小高度，容纳球体散布 */
    padding: 100px 0;
    background: var(--background-color);
    overflow: hidden;
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

/* section-header 作为安全区参考，提升 z-index 避免球体覆盖 */
.team-section .section-header {
    position: relative;
    z-index: 5; /* 微调点：section-header 层级，高于球体 */
}

/* 球状头像散布容器：占满 section，pointer-events:none 让球体自己接收事件 */
.team-balls {
    position: absolute;
    inset: 0; /* 微调点：球体散布范围占满 team-section */
    pointer-events: none;
    z-index: 2;
}

/* 单个球体：圆形 + 绝对定位（桌面端由 GSAP 设置 x/y transform） */
.team-ball {
    position: absolute;
    border-radius: 50%; /* 微调点：圆形球体 */
    will-change: transform, opacity;
    contain: layout style; /* 微调点：不用 paint，避免裁剪溢出的 meta 信息 */
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
}

/* 普通球体尺寸 */
.team-ball {
    width: clamp(90px, 14vw, 150px); /* 微调点：普通球体尺寸 */
    height: clamp(90px, 14vw, 150px);
    border: 2px solid var(--glass-border); /* 微调点：普通球体边框 */
    transition: box-shadow 0.3s ease;
}

.team-ball:hover {
    box-shadow: 0 0 30px var(--accent-color); /* 微调点：普通球体 hover 发光 */
}

/* Owner 球体：放大 + 发光 */
.team-ball--owner {
    width: clamp(140px, 20vw, 260px); /* 微调点：owner 球体尺寸 */
    height: clamp(140px, 20vw, 260px);
    border: 3px solid var(--primary-color); /* 微调点：owner 球体边框 */
    box-shadow: 0 0 50px var(--primary-color); /* 微调点：owner 球体发光 */
    z-index: 3; /* 微调点：owner 球体层级，高于普通球 */
}

/* 头像图片：填满球体并裁剪为圆形（球体本身不裁剪，让 meta 能溢出显示） */
.team-ball-avatar {
    width: 100%;
    height: 100%;
    flex-shrink: 0;
    overflow: hidden; /* 微调点：avatar 裁剪 img 为圆形 */
    border-radius: 50%; /* 微调点：与球体 border 贴合的圆形裁剪 */
}

.team-ball-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

/* 球体元信息：定位在球下方 */
.team-ball-meta {
    position: absolute;
    top: 100%; /* 微调点：元信息距球体顶部偏移 */
    left: 0;
    right: 0;
    padding-top: 0.5rem; /* 微调点：元信息与球体间距 */
    text-align: center;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
}

/* 名字：kinetic gradient text */
.team-ball-name {
    font-size: clamp(1rem, 2.5vw, 1.6rem); /* 微调点：名字字号 */
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
    background: linear-gradient(135deg, var(--text-color), var(--primary-color));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    contain: layout style paint;
    word-break: break-word;
}

/* View Transitions 期间纯色兜底（避免 background-clip:text 闪烁） */
:root[data-vt] .team-ball-name {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.team-ball-role {
    font-size: 0.85rem; /* 微调点：role 字号 */
    color: var(--text-secondary);
    font-style: italic;
    line-height: 1.4;
}

.team-ball-github {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 500;
    transition: color 0.3s ease;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.team-ball-github:hover {
    color: var(--primary-color);
}

.team-ball-github-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
}

.team-ball-links {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    margin-top: 0.2rem;
}

.team-ball-links a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 50%;
    color: var(--text-color);
    text-decoration: none;
    transition: all 0.3s ease;
    font-size: 0.85em;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
}

.team-ball-links a:hover {
    background: var(--primary-color);
    color: white;
    transform: scale(1.1);
}

/* ===== 移动端球状 team 区域：垂直堆叠（<1024px 或 pointer:coarse） ===== */
@media (max-width: 1023px), (pointer: coarse) {
    .team-section {
        min-height: auto; /* 微调点：移动端 section 高度自适应 */
        padding: 60px 0;
    }

    .team-container {
        padding: 0 15px;
    }

    .team-balls {
        position: relative;
        inset: auto;
        display: flex;
        flex-direction: column;
        gap: 2rem; /* 微调点：移动端球体垂直间距 */
        align-items: center;
        padding: 2rem 1rem; /* 微调点：移动端球体容器内边距 */
        pointer-events: auto;
    }

    .team-ball {
        position: relative;
        transform: none !important; /* 微调点：移动端禁用 GSAP transform */
        inset: auto;
    }

    .team-ball--owner {
        width: clamp(120px, 30vw, 180px); /* 微调点：移动端 owner 球体尺寸 */
        height: clamp(120px, 30vw, 180px);
    }

    .team-ball-meta {
        position: static; /* 微调点：移动端元信息回归文档流 */
        padding-top: 0.5rem;
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
   微调点索引 — TeamBento（球状 team 区域）
   1. 常量配置：REPEL_RADIUS/MAX_REPEL_FORCE/HIGHLIGHT_RADIUS/HIGHLIGHT_SCALE/MAX_ATTEMPTS/GAP/SAFE_PADDING/SECTION_MARGIN/RESIZE_DEBOUNCE
   2. 球体尺寸（CSS）：.team-ball--owner / .team-ball clamp 值
   3. 边距与安全区：SECTION_MARGIN / SAFE_PADDING / GAP
   4. 入场动画：ENTER_DURATION / ENTER_EASE / STAGGER
   5. 光标互动：QUICKTO_DURATION / QUICKTO_EASE / RESIZE_DURATION / RESIZE_EASE
   ============================================================ */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { contributors } from '@/config/team-members'

defineProps<{ serverOnline?: boolean }>()

const { t } = useI18n()

// extraLinks type → FontAwesome 图标类映射
const iconClass: Record<'qq' | 'email', string> = {
    qq: 'fa-brands fa-qq',
    email: 'fas fa-envelope',
}

// ---------- 球状 team GSAP 微调点常量 ----------
const REPEL_RADIUS = 220      // 微调点：光标排斥生效半径（px）
const MAX_REPEL_FORCE = 120   // 微调点：最大排斥位移（px）
const HIGHLIGHT_RADIUS = 80   // 微调点：球体高亮放大半径（px）
const HIGHLIGHT_SCALE = 1.12  // 微调点：球体高亮放大倍数
const MAX_ATTEMPTS = 60       // 微调点：拒绝采样最大尝试次数
const GAP = 30                // 微调点：球间最小间距（px）
const SAFE_PADDING = 40       // 微调点：安全区扩展 padding（px）
const SECTION_MARGIN = 30     // 微调点：球体距 section 边距（px）
const RESIZE_DEBOUNCE = 300   // 微调点：resize 防抖延迟（ms）
const QUICKTO_DURATION = 0.4  // 微调点：光标排斥过渡时长（s）
const QUICKTO_EASE = 'power3.out' // 微调点：光标排斥缓动
const RESIZE_DURATION = 0.4   // 微调点：resize 重新生成过渡时长（s）
const RESIZE_EASE = 'power2.out' // 微调点：resize 重新生成缓动
const STAGGER_BALL = 0.12     // 微调点：球体入场 stagger 间隔（s）
const ENTER_DURATION = 0.5    // 微调点：球体入场时长（s）
const ENTER_EASE = 'back.out(1.4)' // 微调点：球体入场缓动

// ---------- 安全区类型 ----------
interface SafeZone {
    left: number
    top: number
    right: number
    bottom: number
}

const sectionRef = ref<HTMLElement | null>(null)
let ctx: gsap.Context | null = null

onMounted(async () => {
    await nextTick()

    // 球状 team 共享状态（跨 matchMedia 分支）
    const homeX: number[] = []
    const homeY: number[] = []

    ctx = gsap.context(() => {
        const g = gsap
        const mm = g.matchMedia()

        // 延迟刷新确保 DOM 就绪
        requestAnimationFrame(() => ScrollTrigger.refresh())

        // ============ reduceMotion: 仅设置终态，不播放动画 ============
        mm.add('(prefers-reduced-motion: reduce)', () => {
            g.set('.team-ball', { autoAlpha: 1, scale: 1 })
            g.set('.section-header', { autoAlpha: 1, y: 0 })

            // 桌面端 reduceMotion 仍生成随机位置（无入场动画、无光标互动）
            const reduceDesktopMm = g.matchMedia()
            reduceDesktopMm.add('(min-width: 1024px) and (pointer: fine)', () => {
                const teamSection = sectionRef.value
                const teamHeader = teamSection?.querySelector<HTMLElement>('.section-header')
                const balls = g.utils.toArray<HTMLElement>('.team-ball')
                if (!teamSection || !teamHeader || balls.length === 0) return

                const safeZone = getSafeZoneRect(teamSection, teamHeader)
                const sectionRect = teamSection.getBoundingClientRect()
                generateAllPositions(balls, sectionRect, safeZone, homeX, homeY)
                balls.forEach((ball, i) => {
                    g.set(ball, { x: homeX[i]!, y: homeY[i]! })
                })
            })
        })

        // ============ no-preference: 全部动效 ============
        mm.add('(prefers-reduced-motion: no-preference)', () => {
            // 初始隐藏，防止 FOUC
            g.set('.team-ball', { autoAlpha: 0, scale: 0 })
            g.set('.section-header', { autoAlpha: 0, y: 30 })

            // Section-level spotlight cursor 跟随（team-section）
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

            // ===== section-header 入场动画 =====
            const teamHeaderEl = g.utils.toArray<HTMLElement>('.section-header')[0]
            g.to(teamHeaderEl || '.section-header', {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: teamHeaderEl || sectionRef.value,
                    start: 'top 75%',
                    once: true,
                },
            })

            // ===== 球状 team matchMedia：桌面随机+光标 / 触屏堆叠（reduceMotion 由顶层处理） =====
            const teamMm = g.matchMedia()

            // 桌面分支：随机位置 + 光标排斥 + 入场动画
            teamMm.add('(min-width: 1024px) and (pointer: fine)', () => {
                const teamSec = sectionRef.value
                const teamHeader = teamSec?.querySelector<HTMLElement>('.section-header')
                const balls = g.utils.toArray<HTMLElement>('.team-ball')
                if (!teamSec || !teamHeader || balls.length === 0) return

                let sectionRect = teamSec.getBoundingClientRect()
                let safeZone = getSafeZoneRect(teamSec, teamHeader)
                generateAllPositions(balls, sectionRect, safeZone, homeX, homeY)

                // 初始位置 + 入场偏移（y +40 作为入场起点）
                balls.forEach((ball, i) => {
                    g.set(ball, { x: homeX[i]!, y: homeY[i]! + 40, autoAlpha: 0, scale: 0 })
                })

                // 光标排斥 quickTo setters（高频更新性能好）
                const setters = balls.map((ball) => ({
                    x: g.quickTo(ball, 'x', { duration: QUICKTO_DURATION, ease: QUICKTO_EASE }),
                    y: g.quickTo(ball, 'y', { duration: QUICKTO_DURATION, ease: QUICKTO_EASE }),
                    scale: g.quickTo(ball, 'scale', { duration: QUICKTO_DURATION, ease: QUICKTO_EASE }),
                }))

                let mouseX = 0
                let mouseY = 0
                let needsUpdate = false

                const updateBalls = () => {
                    needsUpdate = false
                    const secRect = teamSec.getBoundingClientRect()
                    for (let i = 0; i < balls.length; i++) {
                        const ball = balls[i]!
                        const ballW = ball.offsetWidth
                        const ballH = ball.offsetHeight
                        const ballRadius = ballW / 2
                        const homeXi = homeX[i]!
                        const homeYi = homeY[i]!
                        const ballCenterX = homeXi + ballRadius
                        const ballCenterY = homeYi + ballRadius
                        const dx = ballCenterX - mouseX
                        const dy = ballCenterY - mouseY
                        const distance = Math.sqrt(dx * dx + dy * dy)
                        const setter = setters[i]!

                        if (distance < REPEL_RADIUS) {
                            // 排斥力：距离越近力越大
                            const force = g.utils.mapRange(0, REPEL_RADIUS, MAX_REPEL_FORCE, 0, distance)
                            const dirX = distance > 0 ? dx / distance : 0
                            const dirY = distance > 0 ? dy / distance : 0
                            let targetX = homeXi + dirX * force
                            let targetY = homeYi + dirY * force
                            // clamp 边界 + 安全区
                            targetX = g.utils.clamp(SECTION_MARGIN, secRect.width - ballW - SECTION_MARGIN, targetX)
                            targetY = g.utils.clamp(safeZone.bottom + SECTION_MARGIN, secRect.height - ballH - SECTION_MARGIN, targetY)
                            setter.x(targetX)
                            setter.y(targetY)
                            setter.scale(distance < HIGHLIGHT_RADIUS ? HIGHLIGHT_SCALE : 1)
                        } else {
                            // 回到 home 位置
                            setter.x(homeXi)
                            setter.y(homeYi)
                            setter.scale(1)
                        }
                    }
                }

                const onMouseMove = (e: MouseEvent) => {
                    const secRect = teamSec.getBoundingClientRect()
                    mouseX = e.clientX - secRect.left
                    mouseY = e.clientY - secRect.top
                    if (!needsUpdate) {
                        needsUpdate = true
                        requestAnimationFrame(updateBalls)
                    }
                }

                const onMouseLeave = () => {
                    for (let i = 0; i < balls.length; i++) {
                        const setter = setters[i]!
                        setter.x(homeX[i]!)
                        setter.y(homeY[i]!)
                        setter.scale(1)
                    }
                }

                teamSec.addEventListener('mousemove', onMouseMove)
                teamSec.addEventListener('mouseleave', onMouseLeave)

                // resize 重新生成（debounce）
                let resizeTimer: number | undefined
                const onResize = () => {
                    if (resizeTimer) clearTimeout(resizeTimer)
                    resizeTimer = window.setTimeout(() => {
                        sectionRect = teamSec.getBoundingClientRect()
                        safeZone = getSafeZoneRect(teamSec, teamHeader)
                        generateAllPositions(balls, sectionRect, safeZone, homeX, homeY)
                        balls.forEach((ball, i) => {
                            g.to(ball, { x: homeX[i]!, y: homeY[i]!, duration: RESIZE_DURATION, ease: RESIZE_EASE })
                        })
                        ScrollTrigger.refresh()
                    }, RESIZE_DEBOUNCE)
                }
                window.addEventListener('resize', onResize)

                // 入场动画：owner 先入场，其余 stagger 跟进
                const enterTl = g.timeline({
                    scrollTrigger: {
                        trigger: sectionRef.value,
                        start: 'top 80%',
                        once: true,
                    },
                })
                const ownerBall = balls.find((b) => b.classList.contains('team-ball--owner'))
                const otherBalls = balls.filter((b) => !b.classList.contains('team-ball--owner'))
                if (ownerBall) {
                    enterTl.to(ownerBall, {
                        autoAlpha: 1,
                        scale: 1,
                        y: '-=40',
                        duration: ENTER_DURATION,
                        ease: ENTER_EASE,
                    })
                }
                if (otherBalls.length > 0) {
                    enterTl.to(otherBalls, {
                        autoAlpha: 1,
                        scale: 1,
                        y: '-=40',
                        duration: ENTER_DURATION,
                        ease: ENTER_EASE,
                        stagger: STAGGER_BALL,
                    }, ownerBall ? '-=0.2' : '0')
                }

                return () => {
                    teamSec.removeEventListener('mousemove', onMouseMove)
                    teamSec.removeEventListener('mouseleave', onMouseLeave)
                    window.removeEventListener('resize', onResize)
                    if (resizeTimer) clearTimeout(resizeTimer)
                }
            })

            // 触屏 / 小屏分支：垂直堆叠，无随机位置，无光标互动
            teamMm.add('(max-width: 1023px), (pointer: coarse)', () => {
                // CSS 已处理垂直堆叠；只播 autoAlpha 入场（scale/x/y 由 CSS transform:none! 覆盖）
                g.to('.team-ball', {
                    autoAlpha: 1,
                    duration: ENTER_DURATION,
                    ease: ENTER_EASE,
                    stagger: STAGGER_BALL,
                    scrollTrigger: {
                        trigger: sectionRef.value,
                        start: 'top 80%',
                        once: true,
                    },
                })
            })

            // 清理：移除 team-section spotlight 监听
            return () => {
                if (teamSection) {
                    teamSection.removeEventListener('mousemove', onTeamMove)
                }
            }
        })
    }, sectionRef.value ?? undefined)
})

// ---------- 球状 team 辅助函数（function 声明被 hoisting，可在 onMounted 内引用） ----------

function getSafeZoneRect(teamSection: HTMLElement, teamHeader: HTMLElement): SafeZone {
    const sectionRect = teamSection.getBoundingClientRect()
    const headerRect = teamHeader.getBoundingClientRect()
    return {
        left: headerRect.left - sectionRect.left - SAFE_PADDING,
        top: headerRect.top - sectionRect.top - SAFE_PADDING,
        right: headerRect.right - sectionRect.left + SAFE_PADDING,
        bottom: headerRect.bottom - sectionRect.top + SAFE_PADDING,
    }
}

function isInSafeZone(centerX: number, centerY: number, radius: number, zone: SafeZone): boolean {
    // 找矩形上离圆心最近的点，距离 < 半径则相交
    const closestX = Math.max(zone.left, Math.min(centerX, zone.right))
    const closestY = Math.max(zone.top, Math.min(centerY, zone.bottom))
    const dx = centerX - closestX
    const dy = centerY - closestY
    return (dx * dx + dy * dy) < (radius * radius)
}

function generateBallPosition(
    ballRadius: number,
    existingCenters: Array<{ x: number; y: number; r: number }>,
    sectionWidth: number,
    sectionHeight: number,
    safeZone: SafeZone
): { x: number; y: number } {
    const ballDiameter = ballRadius * 2
    const minX = SECTION_MARGIN
    const maxX = Math.max(minX, sectionWidth - ballDiameter - SECTION_MARGIN)
    const minY = safeZone.bottom + SECTION_MARGIN
    const maxY = Math.max(minY, sectionHeight - ballDiameter - SECTION_MARGIN)

    let lastValid = { x: gsap.utils.random(minX, maxX), y: gsap.utils.random(minY, maxY) }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const x = gsap.utils.random(minX, maxX)
        const y = gsap.utils.random(minY, maxY)
        const centerX = x + ballRadius
        const centerY = y + ballRadius

        // 安全区检查
        if (isInSafeZone(centerX, centerY, ballRadius, safeZone)) continue

        // 球间距检查
        let tooClose = false
        for (const pos of existingCenters) {
            const dx = centerX - pos.x
            const dy = centerY - pos.y
            const minDist = ballRadius + pos.r + GAP
            if (dx * dx + dy * dy < minDist * minDist) {
                tooClose = true
                break
            }
        }
        if (tooClose) continue

        return { x, y }
    }

    return lastValid
}

function generateAllPositions(
    balls: HTMLElement[],
    sectionRect: { width: number; height: number },
    safeZone: SafeZone,
    homeX: number[],
    homeY: number[]
): void {
    homeX.length = 0
    homeY.length = 0
    const existingCenters: Array<{ x: number; y: number; r: number }> = []

    for (const ball of balls) {
        const ballRadius = ball.offsetWidth / 2
        const pos = generateBallPosition(
            ballRadius,
            existingCenters,
            sectionRect.width,
            sectionRect.height,
            safeZone
        )
        homeX.push(pos.x)
        homeY.push(pos.y)
        existingCenters.push({ x: pos.x + ballRadius, y: pos.y + ballRadius, r: ballRadius })
    }
}

onUnmounted(() => {
    ctx?.revert()
})
</script>
