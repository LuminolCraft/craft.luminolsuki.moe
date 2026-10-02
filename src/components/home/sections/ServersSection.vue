<!--
  ServersSection — 首页「服务器类型」区块
  桌面端：ScrollTrigger pin + 横向 scrub 轨道（DESIGN.md §6「pin 是舞台，不是停车位」的完整落地）
  移动端 / 粗指针 / reduced-motion：退化为纵向卡片栈 + 一次性入场

  与 TocToggles.vue 主题切换的兼容约定：
  R1 环境层（LightRays / 粒子）在 :root[data-vt] 帧内隐藏，由各 fx 组件自行处理
  R2 渐变裁剪文字（.servers-title / .panel-index）补 :root[data-vt] 纯色兜底
  R7 pin 不在 [data-vt] 帧内触发 refresh，也不在主题切换期间改 pin 距离
-->
<template>
  <section ref="rootRef" class="servers-section" :class="{ 'servers-section--rail': isRailMode }">
    <div class="servers-section__backdrop" aria-hidden="true">
      <div class="servers-section__base-glow" />
      <component
        :is="raysLayer"
        v-if="raysLayer"
        :rays-color="raysColor"
        :ray-length="1.5"
        :light-spread="1.15"
        :mouse-influence="0.06"
        :opacity="0.34"
      />
      <component
        :is="particlesLayer"
        v-if="particlesLayer"
        :count="58"
        :speed="0.16"
        :repel-radius="140"
        :opacity="0.6"
      />
    </div>

    <div class="servers-container">
      <HomeReveal class="section-header" :distance="30" :threshold="0.15">
        <div class="section-eyebrow">
          <HomeStarBorder color="rgb(94 234 212 / 0.85)">
            <span class="eyebrow-dot eyebrow-dot--cyan" />
            SERVERS
          </HomeStarBorder>
        </div>
        <h2 class="servers-title">{{ t('home.serverTypes.title') }}</h2>
        <p class="section-subtitle">{{ t('home.serverTypes.subtitle') }}</p>
      </HomeReveal>

      <div ref="viewportRef" class="servers-viewport">
        <div ref="trackRef" class="servers-track">
          <article
            v-for="(panel, index) in panels"
            :key="panel.key"
            class="server-panel"
            :class="`server-panel--${panel.accent}`"
          >
            <span class="panel-index" aria-hidden="true">{{
              String(index + 1).padStart(2, '0')
            }}</span>

            <div class="panel-body">
              <span class="panel-type">{{ panel.type }}</span>
              <h3 class="panel-name">{{ panel.name }}</h3>
              <p class="panel-desc">{{ panel.desc }}</p>

              <ul class="panel-metrics">
                <li v-for="metric in panel.metrics" :key="metric.label">
                  <span class="metric-value">{{ metric.value }}</span>
                  <span class="metric-label">{{ metric.label }}</span>
                </li>
              </ul>

              <a
                v-if="panel.cta"
                class="panel-cta"
                :href="panel.cta.href"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ panel.cta.label }}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </div>
          </article>
        </div>
      </div>

      <div v-if="isRailMode" class="servers-progress" aria-hidden="true">
        <span ref="progressRef" class="servers-progress__bar" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGsap } from '@/composables/useGsap'
import HomeReveal from '../fx/HomeReveal.vue'
import HomeStarBorder from '../fx/HomeStarBorder.vue'
import {
  LazyHomeLightRays,
  LazyHomeParticles,
  shouldUsePointerFx,
  shouldUseWebGL,
} from '../fx/home-fx-env'

const props = defineProps<{
  serverOnline: boolean
  onlinePlayers: string
}>()

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const viewportRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const progressRef = ref<HTMLElement | null>(null)
const isRailMode = ref<boolean>(
  typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
)

const raysColor = '#7c5cff'
const raysLayer = computed<Component | null>(() => (shouldUseWebGL() ? LazyHomeLightRays : null))
const particlesLayer = computed<Component | null>(() =>
  shouldUseWebGL() && shouldUsePointerFx() ? LazyHomeParticles : null,
)

interface PanelMetric {
  value: string
  label: string
}

interface Panel {
  key: string
  accent: 'indigo' | 'cyan' | 'amber'
  type: string
  name: string
  desc: string
  metrics: PanelMetric[]
  cta?: { label: string; href: string }
}

const JOIN_LINK = 'https://qm.qq.com/q/M29Eyniu8S'

const playersLabel = computed(() => {
  const value = props.onlinePlayers?.trim()
  return value && value !== '加载中...' && value !== 'N/A' ? value : '--'
})

const panels = computed<Panel[]>(() => [
  {
    key: 'survival',
    accent: 'indigo',
    type: t('home.serverTypes.survival.type'),
    name: t('home.serverTypes.survival.name'),
    desc: t('home.serverTypes.survival.desc'),
    metrics: [
      { value: '原版', label: '仅基础指令' },
      { value: '/tpa', label: '带冷却传送' },
      { value: '开启', label: '下界 · 末地掉落保护' },
    ],
  },
  {
    key: 'creative',
    accent: 'cyan',
    type: t('home.serverTypes.creative.type'),
    name: t('home.serverTypes.creative.name'),
    desc: t('home.serverTypes.creative.desc'),
    metrics: [
      { value: 'RPG', label: '副本与神器' },
      { value: '粘液', label: '自动化科技' },
      { value: '领地', label: '建造保护' },
    ],
  },
  {
    key: 'join',
    accent: 'amber',
    type: 'JOIN',
    name: '现在就能进来',
    desc: 'Java 版直接连接 craft.luminolsuki.moe 即可，无需正版账号。想先找人一起玩，加群拿新手引导与临时物资。',
    metrics: [
      { value: props.serverOnline ? '在线' : '离线', label: t('home.serverStatus.statusLabel') },
      { value: playersLabel.value, label: t('home.serverStatus.playersLabel') },
      { value: '26.2', label: t('home.serverStatus.versionLabel') },
    ],
    cta: { label: t('common.joinGroup'), href: JOIN_LINK },
  },
])

const { create } = useGsap({ scope: rootRef })

let cleanupQueries: (() => void) | null = null
let detachRail: (() => void) | undefined

function setupRail(): (() => void) | undefined {
  const viewport = viewportRef.value
  const track = trackRef.value
  if (!viewport || !track) return undefined

  const railPanels = gsap.utils.toArray<HTMLElement>('.server-panel', track)
  if (railPanels.length < 2) return undefined

  const distance = () => Math.max(0, track.scrollWidth - viewport.offsetWidth)
  // 微调点：PIN_FACTOR 决定 pin 期间的「叙事长度」——越大，横向推进越慢、停留越久
  const PIN_FACTOR = 2.6
  const pinEnd = () => `+=${Math.max(260, distance() * PIN_FACTOR)}`

  // 进度条用原生滚动计算驱动。
  // 不用第二个 ScrollTrigger：section 已被 railTween pin 住，再对同一元素建 trigger 会互相冲突。
  const progress = progressRef.value
  let syncProgress: (() => void) | null = null
  if (progress) {
    let queued = false
    const update = () => {
      queued = false
      const section = rootRef.value
      const st = railTween.scrollTrigger
      if (!section || !st) return
      // pin 生效时 section 是 position:fixed，getBoundingClientRect().top 恒为 0，
      // 所以用 ScrollTrigger 的 start/end 与当前滚动位置算进度
      const pinDistance = Math.max(1, Number(st.end) - Number(st.start))
      const scrolled = Math.min(pinDistance, Math.max(0, window.scrollY - Number(st.start)))
      progress.style.transform = `scaleX(${(scrolled / pinDistance).toFixed(4)})`
    }
    syncProgress = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(update)
    }
    syncProgress()
    window.addEventListener('scroll', syncProgress, { passive: true })
    window.addEventListener('resize', syncProgress, { passive: true })
  }

  const railTween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: rootRef.value,
      start: 'top top',
      end: pinEnd,
      pin: true,
      scrub: 1.4,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    },
  })

  // 面板内部反向视差 + 编号位移，让 pin 期间画面一直在动
  const innerTweens: gsap.core.Tween[] = []
  railPanels.forEach((panel, index) => {
    const indexEl = panel.querySelector<HTMLElement>('.panel-index')
    const bodyEl = panel.querySelector<HTMLElement>('.panel-body')

    if (bodyEl) {
      innerTweens.push(
        gsap.fromTo(
          bodyEl,
          { yPercent: 6 },
          {
            yPercent: -6,
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              containerAnimation: railTween,
              start: 'left right',
              end: 'right left',
              scrub: true,
            },
          },
        ),
      )
    }

    if (indexEl) {
      innerTweens.push(
        gsap.fromTo(
          indexEl,
          { xPercent: index % 2 === 0 ? 12 : -12, opacity: 0.55 },
          {
            xPercent: index % 2 === 0 ? -6 : 6,
            opacity: 0.9,
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              containerAnimation: railTween,
              start: 'left right',
              end: 'right left',
              scrub: true,
            },
          },
        ),
      )
    }
  })

  return () => {
    railTween.scrollTrigger?.kill()
    railTween.kill()
    innerTweens.forEach((tween) => {
      tween.scrollTrigger?.kill()
      tween.kill()
    })
    if (syncProgress) {
      window.removeEventListener('scroll', syncProgress)
      window.removeEventListener('resize', syncProgress)
    }
    syncProgress = null
  }
}

onMounted(() => {
  const railQuery = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

  // 注意：isRailMode 已在 setup 阶段同步初始化（见文件上方），不能等到 onMounted 才赋值——
  // 那样 v-if="isRailMode" 的进度条会在首帧被跳过，之后即使置 true 也拿不到 DOM 引用。
  const applyMode = () => {
    isRailMode.value = railQuery.matches && !reduceQuery.matches
  }
  applyMode()

  const onModeChange = () => {
    applyMode()
    // 模式切换后重算 pin 距离与新布局
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }

  railQuery.addEventListener('change', onModeChange)
  reduceQuery.addEventListener('change', onModeChange)
  cleanupQueries = () => {
    railQuery.removeEventListener('change', onModeChange)
    reduceQuery.removeEventListener('change', onModeChange)
  }

  create(() => {
    // isRailMode 已确定，滚动编排与 DOM 结构一致
    if (!isRailMode.value) return
    detachRail = setupRail()
  })

  requestAnimationFrame(() => ScrollTrigger.refresh())
})

onUnmounted(() => {
  cleanupQueries?.()
  cleanupQueries = null
  detachRail?.()
  detachRail = undefined
})
</script>

<style scoped>
@import '../../../styles/theme-colors.css';

/* ===== 区块容器 ===== */
.servers-section {
  position: relative;
  padding: 120px 0;
  background: var(--background-color);
  overflow: clip;
}

/* pin 模式：区块撑满视口，内容垂直居中 */
.servers-section--rail {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 0;
}

.servers-section__backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.servers-section__base-glow {
  position: absolute;
  inset: 20% -10% -20%;
  background:
    radial-gradient(58% 52% at 78% 24%, rgb(124 92 255 / 14%), transparent 70%),
    radial-gradient(46% 42% at 12% 78%, rgb(94 234 212 / 8%), transparent 70%);
}

.servers-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1400px;
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
  margin-bottom: 48px;
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

.eyebrow-dot--cyan {
  background: rgb(94 234 212);
  box-shadow: 0 0 10px rgb(94 234 212);
}

.servers-title {
  font-size: clamp(2.1rem, 4.4vw, 3.4rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.06;
  margin: 0;
  background: linear-gradient(120deg, var(--text-color) 12%, rgb(94 234 212) 82%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* R2：主题切换快照帧内纯色兜底 */
:root[data-vt] .servers-title {
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

/* ===== 轨道 / 面板 ===== */
.servers-viewport {
  position: relative;
  overflow: visible;
}

.servers-track {
  display: flex;
  gap: 32px;
  align-items: stretch;
}

.server-panel {
  position: relative;
  flex: 0 0 min(640px, 50vw);
  min-height: 440px;
  display: flex;
  align-items: flex-end;
  padding: 40px;
  border-radius: 26px;
  border: 1px solid var(--glass-border);
  background: var(--card-bg);
  box-shadow: 0 16px 46px var(--shadow-color);
  overflow: hidden;
}

.server-panel--indigo {
  background: linear-gradient(150deg, rgb(99 102 241 / 14%), var(--card-bg) 58%);
}

.server-panel--cyan {
  background: linear-gradient(150deg, rgb(34 211 238 / 13%), var(--card-bg) 58%);
}

.server-panel--amber {
  background: linear-gradient(150deg, rgb(245 158 11 / 13%), var(--card-bg) 58%);
}

.panel-index {
  position: absolute;
  top: -0.18em;
  right: 18px;
  font-size: clamp(6rem, 14vw, 12rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
  pointer-events: none;
  background: linear-gradient(150deg, var(--text-color) 0%, var(--primary-color) 90%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: 0.16;
}

/* R2：主题切换快照帧内纯色兜底 */
:root[data-vt] .panel-index {
  background: none;
  color: var(--text-color);
  -webkit-background-clip: initial;
  background-clip: initial;
}

.panel-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 52ch;
}

.panel-type {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--primary-color);
}

.panel-name {
  margin: 0;
  font-size: clamp(1.7rem, 2.8vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.08;
  color: var(--text-color);
}

.panel-desc {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.76;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 7;
  line-clamp: 7;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.panel-metrics {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.panel-metrics li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
}

.metric-value {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--text-color);
}

.metric-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.panel-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  margin-top: 6px;
  padding: 11px 20px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  background: var(--primary-gradient);
  box-shadow: 0 8px 24px rgb(124 92 255 / 26%);
}

.panel-cta:hover {
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgb(124 92 255 / 34%);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

/* ===== 进度条（仅轨道模式） ===== */
.servers-progress {
  margin-top: 34px;
  height: 2px;
  border-radius: 999px;
  background: var(--divider-color);
  overflow: hidden;
}

.servers-progress__bar {
  display: block;
  height: 100%;
  transform-origin: left center;
  transform: scaleX(0);
  background: linear-gradient(90deg, var(--primary-color), rgb(94 234 212));
}

/* ===== 窄屏：纵向卡片栈 ===== */
@media (max-width: 1023px) {
  .servers-section {
    padding: 88px 0 80px;
  }

  .servers-track {
    flex-direction: column;
    gap: 18px;
  }

  .server-panel {
    flex: 1 1 auto;
    min-height: 0;
    padding: 30px 24px;
  }

  .panel-desc {
    -webkit-line-clamp: unset;
    line-clamp: unset;
  }

  .panel-index {
    font-size: clamp(4.5rem, 26vw, 8rem);
  }
}
</style>
