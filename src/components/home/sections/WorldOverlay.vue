<!--
  WorldOverlay —— 全屏世界地图

  从首页「世界轮廓」那张等高线点开：不是整屏淡入，而是从指针落点用 clip-path
  圆形扩散长出整层，读者能感到「图被放大了」而不是「跳页了」。

  技术点：
  1. 扩散半径按落点到最远角的距离实时算（circle() 的百分比半径跨分辨率不可靠）；
  2. 等高线与首页共用 lib/contour —— 同一组种子，所以点开就是原图放大；
  3. 地标用 SVG <g> + tabindex，键盘 Tab 也能选中；地名标签带描边，压在等高线上仍可读；
  4. Lenis 全局实例在打开期间 stop()，关闭恢复 —— 否则滚轮会滚到背后的首页。
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { contourLayers } from '@/lib/contour'
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
const activeId = ref<string | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)

const rootRef = ref<HTMLDivElement | null>(null)
let hideTimer = 0
let prevOverflow = ''

const active = computed(() => LANDMARKS.find((l) => l.id === activeId.value) ?? null)

/** 卡片贴在地标旁；靠右的地标把卡片翻到左侧，避免出界 */
const cardStyle = computed(() => {
  const p = active.value
  if (!p) return {}
  return { left: `${(p.x / 1000) * 100}%`, top: `${(p.y / 480) * 100}%` }
})

function road(p: Landmark): string {
  const mx = (500 + p.x) / 2
  const my = (232 + p.y) / 2 - 26
  return `M 500 232 Q ${mx.toFixed(1)} ${my.toFixed(1)} ${p.x} ${p.y}`
}

const RIVER = 'M 158 192 C 300 240 332 360 462 388 S 644 426 704 458'
const RAIL = 'M 300 168 C 384 238 432 318 480 350'

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
      activeId.value = null
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
          <p class="wo__hint">点击地标查看来历 · Esc 关闭</p>
          <button ref="closeBtn" type="button" class="wo__close" aria-label="关闭地图" @click="emit('close')">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>
      </header>

      <div class="wo__body">
        <div class="wo__map">
          <svg viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid meet" role="img" aria-label="世界地图">
            <g class="wo__iso">
              <path
                v-for="(l, i) in LAYERS"
                :key="i"
                :d="l.d"
                pathLength="1"
                fill="none"
                :stroke="`color-mix(in srgb, var(--primary-color) ${Math.round(l.opacity * 100)}%, transparent)`"
                :stroke-width="l.width"
                stroke-linejoin="round"
                :style="{ '--d': `${i * 0.09}s` }"
              />
            </g>

            <!-- 水系与轨交：手写贝塞尔，不随视口重算 -->
            <path :d="RIVER" class="wo__river" />
            <path :d="RAIL" class="wo__rail" />

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
              @click="activeId = activeId === p.id ? null : p.id"
              @pointerenter="activeId = p.id"
              @focus="activeId = p.id"
              @keydown.enter.prevent="activeId = p.id"
              @keydown.space.prevent="activeId = p.id"
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
              :class="{ 'is-flip': active.x > 720 }"
              :style="cardStyle"
              aria-live="polite"
            >
              <span class="wo__card-tag">{{ active.tag }}</span>
              <b class="wo__card-name">{{ active.name }}</b>
              <p class="wo__card-note">{{ active.note }}</p>
            </div>
          </Transition>
        </div>

        <div class="wo__legend" aria-hidden="true">
          <span><i class="is-water" />水系</span>
          <span><i class="is-rail" />轨交</span>
          <span><i class="is-road" />出生点辐射的路径</span>
        </div>

        <ul class="wo__list">
          <li v-for="p in LANDMARKS" :key="p.id">
            <button
              type="button"
              :class="{ 'is-active': activeId === p.id }"
              @click="activeId = p.id"
              @pointerenter="activeId = p.id"
            >
              <i aria-hidden="true" />
              {{ p.name }}
            </button>
          </li>
        </ul>

        <p class="wo__foot">坐标为示意，实际位置以游戏内为准；地标清单仍在补充。</p>
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

/* —— 主体 —— */
.wo__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.wo__map {
  position: relative;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  aspect-ratio: 1000 / 480;
}
.wo__map > svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
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
  stroke: color-mix(in srgb, #5ab4ff 42%, transparent);
  stroke-width: 2.2;
  stroke-linecap: round;
}
.wo__rail {
  fill: none;
  stroke: color-mix(in srgb, #f0b45a 48%, transparent);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-dasharray: 8 6;
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
  box-shadow:/n    0 18px 40px -22px color-mix(in srgb, #000 78%, transparent),
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

/* —— 图例 —— */
.wo__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
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
.wo__legend i.is-water {
  color: color-mix(in srgb, #5ab4ff 60%, transparent);
}
.wo__legend i.is-rail {
  color: color-mix(in srgb, #f0b45a 60%, transparent);
  border-top-style: dashed;
}
.wo__legend i.is-road {
  color: color-mix(in srgb, var(--text-color) 30%, transparent);
  border-top-style: dotted;
}

/* —— 索引 —— */
.wo__list {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 0 auto;
  padding: 0;
  width: 100%;
  max-width: 1180px;
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
.wo__list button.is-active {
  border-color: color-mix(in srgb, var(--primary-color) 55%, transparent);
  color: var(--primary-color);
}
@media (hover: hover) {
  .wo__list button:hover {
    border-color: color-mix(in srgb, var(--primary-color) 45%, transparent);
    color: var(--primary-color);
  }
}

.wo__foot {
  max-width: 1180px;
  margin: 0 auto;
  font-size: 11.5px;
  color: var(--text-secondary);
  opacity: 0.8;
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
    aspect-ratio: 1000 / 700;
  }
  /* 地图整体缩到三分之一，地标文字跟着缩会看不清 —— 按 user unit 放大字号与圆点 */
  .wo__poi text {
    font-size: 26px;
    stroke-width: 6px;
  }
  .wo__poi-core {
    r: 7px;
  }
  .wo__poi-hit {
    r: 22px;
  }
  .wo__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  /* 窄屏放不下浮动卡：压到地图底部，卡片不挡地标 */
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
