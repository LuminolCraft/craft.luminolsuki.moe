<!--
  WorldOverlay —— 全屏世界地图

  从首页「世界轮廓」那张等高线点开：不是整屏淡入，而是从指针落点用 clip-path
  圆形扩散长出整层，读者能感到「图被放大了」而不是「跳页了」。

  技术点：
  1. 扩散半径按落点到最远角的距离实时算（circle() 的百分比半径跨分辨率不可靠）；
  2. 等高线与首页共用 lib/contour —— 同一组种子，所以点开就是原图放大；
  3. 地标用 SVG <g> + tabindex，键盘 Tab 也能选中；地名标签带描边，压在等高线上仍可读；
  4. Lenis 全局实例在打开期间 stop()，关闭恢复 —— 否则滚轮会滚到背后的首页。
  5. 详情卡两种入口：鼠标悬停地标 → 移开即消；下方索引 → 点击锁定 / 再点收起。
     触屏没有悬停，点击地标直接切换锁定。
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  COAST_D,
  FORESTS_D,
  ISLANDS_D,
  JUNGLE_D,
  RIVERS,
  SAKURA_D,
  SAVANNA_D,
  SEA_CONTOURS,
  SEA_D,
  SHALLOW_D,
  SNOW_D,
  WATERS_D,
  contourLayers,
} from '@/lib/contour'
import { LANDMARKS, type Landmark } from '@/config/world-map'
import { lenisInstances } from '@/utils/lenisInstances'

const props = withDefaults(
  defineProps<{
    open: boolean
    /** 扩散起点（视口坐标）；缺省用屏幕中心 */
    origin?: { x: number; y: number } | null
  }>(),
  { origin: null },
)

const emit = defineEmits<{ close: [] }>()

const LAYERS = contourLayers()

const mounted = ref(false)
const shown = ref(false)
const circle = ref(0)
const ox = ref(0)
const oy = ref(0)
/** 指针悬停的地标（临时）与点击锁定的地标（常驻） */
const hoverId = ref<string | null>(null)
const pinnedId = ref<string | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)

const rootRef = ref<HTMLDivElement | null>(null)
let hideTimer = 0
let prevOverflow = ''

const activeId = computed(() => hoverId.value ?? pinnedId.value)
const active = computed(() => LANDMARKS.find((l) => l.id === activeId.value) ?? null)

/** 用指针类型判断有没有悬停能力：比 matchMedia 可靠，也就能分辨触屏 */
function onPoiEnter(e: PointerEvent, id: string) {
  if (e.pointerType === 'mouse') hoverId.value = id
}

function onPoiLeave(e: PointerEvent, id: string) {
  if (e.pointerType === 'mouse' && hoverId.value === id) hoverId.value = null
}

function togglePin(id: string) {
  pinnedId.value = pinnedId.value === id ? null : id
}

/** 桌面光靠悬停就行，点击留给触屏/笔：点一下锁定，再点收起 */
function onPoiClick(e: PointerEvent, id: string) {
  if (e.pointerType === 'mouse') return
  togglePin(id)
}

/** 卡片贴在地标旁；靠右的地标把卡片翻到左侧，避免出界 */
const cardStyle = computed(() => {
  const p = active.value
  if (!p) return {}
  return { left: `${(p.x / 1000) * 100}%`, top: `${(p.y / 800) * 100}%` }
})

/** 道路由出生点辐射出去：以出生点为锚，不写死坐标 */
const SPAWN = LANDMARKS[0]!

function road(p: Landmark): string {
  const mx = (SPAWN.x + p.x) / 2
  const my = (SPAWN.y + p.y) / 2 - 26
  return `M ${SPAWN.x} ${SPAWN.y} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${p.x} ${p.y}`
}

function lockScroll(lock: boolean) {
  if (lock) {
    prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    lenisInstances.forEach((l) => l.stop())
    return
  }
  document.documentElement.style.overflow = prevOverflow
  lenisInstances.forEach((l) => l.start())
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (open) => {
    window.clearTimeout(hideTimer)
    if (open) {
      const p = props.origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      // 钳到视口内：调用方给的坐标可能来自滚动前/后不一致的 rect，
      // 圆心一旦落到屏幕外，圆形扩散就只剩一条弧扫过，看着像撕裂。
      ox.value = Math.min(Math.max(p.x, 0), window.innerWidth)
      oy.value = Math.min(Math.max(p.y, 0), window.innerHeight)
      // 到最远角的距离：直径覆盖整屏，少一点就会露边
      circle.value = Math.ceil(
        Math.hypot(Math.max(ox.value, window.innerWidth - ox.value), Math.max(oy.value, window.innerHeight - oy.value)),
      )
      hoverId.value = null
      pinnedId.value = null
      mounted.value = true
      lockScroll(true)
      document.addEventListener('keydown', onKey)
      nextTick(() => {
        // 强制一次重排：clip-path 的起始值（radius 0）必须先落到计算样式上，
        // 否则同一帧里直接写 is-open 会被浏览器合并，动画不触发。
        // 不用 rAF —— 后台标签页 / 无头环境里 rAF 可能不调度，扩不出来。
        void rootRef.value?.offsetWidth
        shown.value = true
        closeBtn.value?.focus()
      })
      return
    }
    shown.value = false
    lockScroll(false)
    document.removeEventListener('keydown', onKey)
    // 等圆形收缩动画走完再卸载，否则会直接闪没
    hideTimer = window.setTimeout(() => {
      mounted.value = false
    }, 520)
  },
)

onBeforeUnmount(() => {
  window.clearTimeout(hideTimer)
  document.removeEventListener('keydown', onKey)
  if (mounted.value) lockScroll(false)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="mounted"
      ref="rootRef"
      class="wo"
      :class="{ 'is-open': shown }"
      :style="{ '--ox': `${ox}px`, '--oy': `${oy}px`, '--r': `${circle}px` }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wo-title"
    >
      <header class="wo__bar">
        <div>
          <p class="wo__kicker">world / map</p>
          <h2 id="wo-title" class="wo__title">世界地图</h2>
        </div>
        <div class="wo__tools">
          <p class="wo__hint">悬停地标查看来历 · Esc 关闭</p>
          <button ref="closeBtn" type="button" class="wo__close" aria-label="关闭地图" @click="emit('close')">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>
      </header>

      <div class="wo__body">
        <div class="wo__stagewrap">
          <div class="wo__map">
            <svg viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid meet" role="img" aria-label="世界地图">
              <defs>
                <radialGradient id="wo-sea-grad" cx="48%" cy="44%" r="72%">
                  <stop offset="0" stop-color="#5ab4ff" stop-opacity="0.085" />
                  <stop offset="0.62" stop-color="#5ab4ff" stop-opacity="0.05" />
                  <stop offset="1" stop-color="#5ab4ff" stop-opacity="0" />
                </radialGradient>
                <clipPath id="wo-sea">
                  <path :d="SEA_D" fill-rule="evenodd" />
                </clipPath>
                <clipPath id="wo-land">
                  <path :d="COAST_D" />
                  <path v-for="(d, i) in ISLANDS_D" :key="`clip-${i}`" :d="d" />
                </clipPath>
                <pattern id="wo-dot-forest" width="9" height="9" patternUnits="userSpaceOnUse">
                  <circle cx="2.2" cy="2.2" r="1.05" fill="#4f9d7a" fill-opacity="0.34" />
                  <circle cx="6.6" cy="6.4" r="0.75" fill="#4f9d7a" fill-opacity="0.24" />
                </pattern>
                <pattern id="wo-dot-jungle" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.1" fill="#63b96a" fill-opacity="0.36" />
                  <circle cx="6" cy="5.6" r="0.8" fill="#63b96a" fill-opacity="0.26" />
                </pattern>
                <pattern id="wo-dot-savanna" width="10" height="7" patternUnits="userSpaceOnUse">
                  <path d="M1 3.5h4.5" stroke="#c7a75c" stroke-opacity="0.34" stroke-width="1" stroke-linecap="round" />
                </pattern>
                <pattern id="wo-dot-sakura" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.15" fill="#f2a7c3" fill-opacity="0.5" />
                  <circle cx="6" cy="5.6" r="0.8" fill="#f2a7c3" fill-opacity="0.36" />
                </pattern>
                <pattern id="wo-dot-snow" width="10" height="7" patternUnits="userSpaceOnUse">
                  <path d="M1 3.5h5" stroke="#dfe8f5" stroke-opacity="0.45" stroke-width="1" stroke-linecap="round" />
                </pattern>
              </defs>

              <!-- 海与陆：海面底色 → 近岸浅海带 → 陆地 → 地表类型（统一裁进陆地轮廓） -->
              <path :d="SEA_D" class="wo__sea" fill-rule="evenodd" />
              <path :d="SHALLOW_D" class="wo__shallow" fill-rule="evenodd" />
              <path :d="COAST_D" class="wo__land" />
              <path v-for="(d, i) in ISLANDS_D" :key="`islefill-${i}`" :d="d" class="wo__land is-isle" />

              <g clip-path="url(#wo-land)">
                <!-- 底色层整体轻微模糊：biome 之间过渡自然的边缘，不露拼贴感 -->
                <g class="wo__biome">
                  <path v-for="(d, i) in FORESTS_D" :key="`f-${i}`" :d="d" class="wo__forest" />
                  <path v-for="(d, i) in JUNGLE_D" :key="`j-${i}`" :d="d" class="wo__jungle" />
                  <path v-for="(d, i) in SAVANNA_D" :key="`v-${i}`" :d="d" class="wo__savanna" />
                  <path v-for="(d, i) in SAKURA_D" :key="`s-${i}`" :d="d" class="wo__sakura" />
                  <path v-for="(d, i) in SNOW_D" :key="`n-${i}`" :d="d" class="wo__snow" />
                </g>
                <path v-for="(d, i) in FORESTS_D" :key="`fd-${i}`" :d="d" fill="url(#wo-dot-forest)" stroke="none" />
                <path v-for="(d, i) in JUNGLE_D" :key="`jd-${i}`" :d="d" fill="url(#wo-dot-jungle)" stroke="none" />
                <path
                  v-for="(d, i) in SAVANNA_D"
                  :key="`vd-${i}`"
                  :d="d"
                  fill="url(#wo-dot-savanna)"
                  stroke="none"
                />
                <path v-for="(d, i) in SAKURA_D" :key="`sd-${i}`" :d="d" fill="url(#wo-dot-sakura)" stroke="none" />
                <path v-for="(d, i) in SNOW_D" :key="`nd-${i}`" :d="d" fill="url(#wo-dot-snow)" stroke="none" />
              </g>

              <!-- 等深线：裁到海面，不压陆地 -->
              <g clip-path="url(#wo-sea)">
                <path v-for="(d, i) in SEA_CONTOURS" :key="`sc-${i}`" :d="d" class="wo__sealine" />
              </g>

              <path :d="COAST_D" class="wo__coast" />
              <path v-for="(d, i) in ISLANDS_D" :key="`isle-${i}`" :d="d" class="wo__coast is-isle" />
              <path v-for="(d, i) in WATERS_D" :key="`lake-${i}`" :d="d" class="wo__lake" />

              <g class="wo__iso">
                <path
                  v-for="(l, i) in LAYERS"
                  :key="i"
                  :d="l.d"
                  pathLength="1"
                  fill="none"
                  :stroke="
                    l.tone === 'water'
                      ? `color-mix(in srgb, #5ab4ff ${Math.round(l.opacity * 100)}%, transparent)`
                      : `color-mix(in srgb, var(--primary-color) ${Math.round(l.opacity * 100)}%, transparent)`
                  "
                  :stroke-width="l.width"
                  stroke-linejoin="round"
                  :style="{ '--d': `${i * 0.05}s` }"
                />
              </g>

              <!-- 水系：手写贝塞尔，不随视口重算 -->
              <path v-for="(d, i) in RIVERS" :key="`river-${i}`" :d="d" class="wo__river" />

              <!-- 出生点向各地标的路径 -->
              <path v-for="p in LANDMARKS.slice(1)" :key="`r-${p.id}`" :d="road(p)" class="wo__road" />

              <g
                v-for="(p, i) in LANDMARKS"
                :key="p.id"
                class="wo__poi"
                :class="{ 'is-active': activeId === p.id }"
                :style="{ '--d': `${0.24 + i * 0.05}s` }"
                role="button"
                tabindex="0"
                :aria-label="`${p.name}：${p.note}`"
                @click="onPoiClick($event, p.id)"
                @pointerenter="onPoiEnter($event, p.id)"
                @pointerleave="onPoiLeave($event, p.id)"
                @focus="hoverId = p.id"
                @blur="hoverId = hoverId === p.id ? null : hoverId"
                @keydown.enter.prevent="togglePin(p.id)"
                @keydown.space.prevent="togglePin(p.id)"
              >
                <circle :cx="p.x" :cy="p.y" r="13" class="wo__poi-hit" />
                <circle :cx="p.x" :cy="p.y" r="3.4" class="wo__poi-core" />
                <text
                  :x="p.x + (p.side === 'left' ? -13 : 13)"
                  :y="p.y + 4"
                  :text-anchor="p.side === 'left' ? 'end' : 'start'"
                >
                  {{ p.name }}
                </text>
              </g>
            </svg>

            <Transition name="wo-card">
              <div
                v-if="active"
                class="wo__card"
                :class="{ 'is-flip': active.x > 700 }"
                :style="cardStyle"
                aria-live="polite"
              >
                <span class="wo__card-tag">{{ active.tag }}</span>
                <b class="wo__card-name">{{ active.name }}</b>
                <p class="wo__card-note">{{ active.note }}</p>
              </div>
            </Transition>
          </div>
        </div>

        <aside class="wo__aside">
          <div class="wo__legend" aria-hidden="true">
            <span><i class="is-water" />水系 · 近岸浅海</span>
            <span><i class="is-block is-forest" />林地</span>
            <span><i class="is-block is-jungle" />丛林</span>
            <span><i class="is-block is-savanna" />金合欢</span>
            <span><i class="is-block is-sakura" />樱花林</span>
            <span><i class="is-block is-snow" />雪山</span>
            <span><i class="is-road" />出生点辐射的路径</span>
          </div>

          <ul class="wo__list">
            <li v-for="p in LANDMARKS" :key="p.id">
              <button
                type="button"
                :class="{ 'is-active': activeId === p.id }"
                :aria-expanded="activeId === p.id"
                @click="togglePin(p.id)"
              >
                <i aria-hidden="true" />
                <span class="wo__list-name">{{ p.name }}</span>
                <span class="wo__list-tag">{{ p.tag }}</span>
              </button>
            </li>
          </ul>

          <p class="wo__foot">地形按实际俯视图绘制；标注为社区主要建筑，位置以游戏内为准。</p>
        </aside>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.wo {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  background: var(--background-color);
  /* 圆形扩散：半径由 JS 按落点到最远角算，百分比半径跨分辨率会露边 */
  clip-path: circle(0px at var(--ox) var(--oy));
  transition: clip-path 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}
.wo.is-open {
  clip-path: circle(var(--r) at var(--ox) var(--oy));
}

/* —— 顶栏 —— */
.wo__bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 32px 14px;
  border-bottom: 1px solid var(--border-color);
}
.wo__kicker {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary-color);
  margin: 0 0 6px;
}
.wo__title {
  font-size: clamp(1.35rem, 2.2vw, 1.7rem);
  line-height: 1.2;
  letter-spacing: -0.03em;
  font-weight: 700;
  color: var(--text-color);
  margin: 0;
}
.wo__tools {
  display: flex;
  align-items: center;
  gap: 14px;
}
.wo__hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}
.wo__close {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}
.wo__close svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
}
@media (hover: hover) {
  .wo__close:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
}

/* —— 主体：左侧地图，右侧索引 —— */
.wo__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 32px 22px;
  display: flex;
  align-items: stretch;
  gap: 26px;
}
.wo__stagewrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wo__map {
  position: relative;
  /* 地图是 1000:800 的近方形：宽度由可用高度反推，避免上下空一片。
     宽高比必须与 viewBox 一致，卡片百分比定位才准。 */
  width: min(100%, calc((100dvh - 170px) * 1.25));
  margin: 0 auto;
  aspect-ratio: 1000 / 800;
}
.wo__map > svg {
  width: 100%;
  height: 100%;
  display: block;
  /* 海底等高线向外扩，越界部分裁掉，免得漏到侧栏上 */
  overflow: hidden;
}

/* —— 地形骨架 —— */
.wo__land {
  fill: color-mix(in srgb, var(--primary-color) 9%, transparent);
  stroke: none;
}
.wo__land.is-isle {
  fill: color-mix(in srgb, var(--primary-color) 8%, transparent);
}
.wo__sealine {
  fill: none;
  stroke: color-mix(in srgb, #5ab4ff 16%, transparent);
  stroke-width: 1;
}
.wo__coast {
  fill: none;
  stroke: color-mix(in srgb, var(--primary-color) 62%, transparent);
  stroke-width: 1.5;
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--primary-color) 26%, transparent));
  stroke-linejoin: round;
}
.wo__coast.is-isle {
  stroke: color-mix(in srgb, var(--primary-color) 34%, transparent);
  stroke-width: 1;
}
.wo__lake {
  fill: color-mix(in srgb, #5ab4ff 9%, transparent);
  stroke: color-mix(in srgb, #5ab4ff 34%, transparent);
  stroke-width: 1.1;
}
.wo__sea {
  /* 径向渐变到透明：海有存在感，又不出现贴图方块边 */
  fill: url(#wo-sea-grad);
  stroke: none;
}
.wo__shallow {
  fill: color-mix(in srgb, #5ab4ff 6%, transparent);
  stroke: none;
}
/* 底色整体轻微模糊，biome 交界不露硬边 */
.wo__biome {
  filter: blur(5px);
}
.wo__forest {
  fill: color-mix(in srgb, #4f9d7a 4.5%, transparent);
  stroke: none;
}
.wo__jungle {
  fill: color-mix(in srgb, #63b96a 5%, transparent);
  stroke: none;
}
.wo__savanna {
  fill: color-mix(in srgb, #c7a75c 5%, transparent);
  stroke: none;
}
.wo__sakura {
  fill: color-mix(in srgb, #f2a7c3 6%, transparent);
  stroke: none;
}
.wo__snow {
  fill: color-mix(in srgb, #dfe8f5 6%, transparent);
  stroke: none;
}

.wo__iso path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 1.4s cubic-bezier(0.32, 0.72, 0, 1);
  transition-delay: calc(0.12s + var(--d, 0s));
}
.wo.is-open .wo__iso path {
  stroke-dashoffset: 0;
}

.wo__river {
  fill: none;
  stroke: color-mix(in srgb, #5ab4ff 55%, transparent);
  stroke-width: 2.8;
  stroke-linecap: round;
}
.wo__road {
  fill: none;
  stroke: color-mix(in srgb, var(--text-color) 14%, transparent);
  stroke-width: 1;
  stroke-dasharray: 4 5;
}

/* —— 地标 —— */
.wo__poi {
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.4s ease;
  transition-delay: calc(0.3s + var(--d, 0s));
}
.wo.is-open .wo__poi {
  opacity: 1;
}
.wo__poi-hit {
  fill: transparent;
  stroke: color-mix(in srgb, var(--primary-color) 45%, transparent);
  stroke-width: 1;
  transition:
    fill 0.2s,
    stroke 0.2s,
    r 0.2s;
}
.wo__poi-core {
  fill: var(--primary-color);
  pointer-events: none;
}
.wo__poi text {
  font-family: var(--font-primary);
  font-size: 11.5px;
  font-weight: 550;
  fill: var(--text-color);
  /* 压在等高线上仍可读 */
  paint-order: stroke;
  stroke: var(--background-color);
  stroke-width: 3px;
  stroke-linejoin: round;
  pointer-events: none;
}
.wo__poi.is-active text {
  opacity: 0;
}

.wo__poi.is-active .wo__poi-hit,
.wo__poi:hover .wo__poi-hit {
  fill: color-mix(in srgb, var(--primary-color) 16%, transparent);
  stroke: color-mix(in srgb, var(--primary-color) 85%, transparent);
}
.wo__poi:focus-visible {
  outline: none;
}
.wo__poi:focus-visible .wo__poi-hit {
  stroke: var(--primary-color);
  stroke-width: 2;
}

/* —— 地标卡片 —— */
.wo__card {
  position: absolute;
  width: min(240px, 46vw);
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--primary-color) 32%, var(--border-color));
  background: color-mix(in srgb, var(--background-color) 86%, var(--primary-color));
  box-shadow:
    0 18px 40px -22px color-mix(in srgb, #000 78%, transparent),
    0 0 0 3px color-mix(in srgb, var(--background-color) 70%, transparent);
  transform: translate(24px, -50%);
  pointer-events: none;
  z-index: 2;
}
.wo__card.is-flip {
  transform: translate(calc(-100% - 24px), -50%);
}
.wo__card-tag {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary-color);
}
.wo__card-name {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-color);
  margin: 3px 0 6px;
}
.wo__card-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
  color: color-mix(in srgb, var(--text-color) 76%, transparent);
}
.wo-card-enter-active,
.wo-card-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.wo-card-enter-from,
.wo-card-leave-to {
  opacity: 0;
}

/* —— 右侧栏：图例 + 索引 + 说明 —— */
.wo__aside {
  width: 302px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 2px;
}

/* —— 图例 —— */
.wo__legend {
  display: flex;
  flex-direction: column;
  gap: 9px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}
.wo__legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.wo__legend i {
  width: 22px;
  height: 0;
  border-top: 1.5px solid currentColor;
}
.wo__legend i.is-block {
  width: 10px;
  height: 7px;
  border: 0;
  border-radius: 2px;
}
.wo__legend i.is-forest {
  background: color-mix(in srgb, #4f9d7a 55%, transparent);
}
.wo__legend i.is-jungle {
  background: color-mix(in srgb, #63b96a 58%, transparent);
}
.wo__legend i.is-savanna {
  background: color-mix(in srgb, #c7a75c 58%, transparent);
}
.wo__legend i.is-sakura {
  background: color-mix(in srgb, #f2a7c3 60%, transparent);
}
.wo__legend i.is-snow {
  background: color-mix(in srgb, #dfe8f5 50%, transparent);
}
.wo__legend i.is-water {
  color: color-mix(in srgb, #5ab4ff 60%, transparent);
}
.wo__legend i.is-road {
  color: color-mix(in srgb, var(--text-color) 30%, transparent);
  border-top-style: dotted;
}

/* —— 索引 —— */
.wo__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
}
.wo__list li {
  list-style: none;
}
.wo__list button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-primary);
  font-size: 12.5px;
  text-align: left;
  padding: 9px 11px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}
.wo__list i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--primary-color) 65%, transparent);
  flex: none;
}
.wo__list-name {
  flex: 1;
  min-width: 0;
}
.wo__list-tag {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  opacity: 0.75;
}
.wo__list button.is-active {
  border-color: color-mix(in srgb, var(--primary-color) 55%, transparent);
  color: var(--primary-color);
}
.wo__list button.is-active .wo__list-tag {
  color: var(--primary-color);
  opacity: 0.85;
}
@media (hover: hover) {
  .wo__list button:hover {
    border-color: color-mix(in srgb, var(--primary-color) 45%, transparent);
    color: var(--primary-color);
  }
}

.wo__foot {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--text-secondary);
  opacity: 0.8;
}

@media (max-width: 980px) {
  .wo__body {
    flex-direction: column;
    gap: 16px;
  }
  .wo__stagewrap {
    flex: none;
  }
  .wo__aside {
    width: 100%;
    flex: none;
    overflow: visible;
  }
  .wo__legend {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 16px;
  }
  .wo__list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .wo__bar {
    padding: 16px 18px 12px;
  }
  .wo__hint {
    display: none;
  }
  .wo__body {
    padding: 14px 18px 22px;
  }
  .wo__map {
    width: 100%;
  }
  /* 地图整体缩小，地标文字跟着缩会看不清 —— 按 user unit 放大字号与圆点 */
  .wo__poi text {
    font-size: 24px;
    stroke-width: 6px;
  }
  .wo__poi-core {
    r: 6px;
  }
  .wo__poi-hit {
    r: 20px;
  }
  /* 窄屏放不下浮动卡：贴到地图底部，整宽、不溢出地图框 */
  .wo__card,
  .wo__card.is-flip {
    left: 8px !important;
    right: 8px;
    top: auto !important;
    bottom: 8px;
    width: auto;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wo {
    transition: none;
  }
  .wo__iso path,
  .wo__poi,
  .wo-card-enter-active,
  .wo-card-leave-active {
    transition: none;
  }
  .wo__iso path {
    stroke-dashoffset: 0;
  }
  .wo__poi {
    opacity: 1;
  }
}
</style>
