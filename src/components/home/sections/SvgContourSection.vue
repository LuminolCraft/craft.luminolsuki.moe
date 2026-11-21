<!--
  SvgContourSection —— 世界轮廓（SVG 等高线）

  技术点：
  1. 等高线不是手画的素材，是 setup 里按「椭圆 + 三层正弦扰动」实时算出来的闭合 path；
  2. 每条 path 用 `pathLength="1"` + `stroke-dasharray` 做描边动画，进入视口后逐层错峰显现；
  3. 鼠标移动时每层按不同权重位移，形成浅视差（只用 transform，不触发布局）；
  4. `prefers-reduced-motion` 下关闭描边与视差。

  它替代的是「我们的世界」那张大图 —— 图是死的，等高线可以随视口重算。
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Contour {
  d: string
  weight: number
  opacity: number
  width: number
}

/** 椭圆 + 多频正弦扰动，生成闭合等高线 */
function contour(seed: number, rx: number, ry: number, wobble: number): string {
  const steps = 96
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const r =
      1 +
      wobble * Math.sin(3 * t + seed) +
      wobble * 0.55 * Math.sin(5 * t - seed * 1.7) +
      wobble * 0.3 * Math.sin(7 * t + seed * 0.6)
    const x = 500 + Math.cos(t) * rx * r
    const y = 240 + Math.sin(t) * ry * r
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
  }
  return d + 'Z'
}

const LAYERS: Contour[] = Array.from({ length: 7 }, (_, i) => {
  const k = i / 6 // 0 = 最外圈
  const seed = i * 0.7 + 0.4
  return {
    d: contour(seed, 400 - k * 240, 200 - k * 118, 0.11 - k * 0.03),
    weight: 26 - i * 3, // 视差权重：外圈动得多
    opacity: 0.16 + k * 0.5,
    width: 0.8 + k * 0.7,
  }
})

const stageRef = ref<HTMLDivElement | null>(null)
const wrapRef = ref<HTMLElement | null>(null)
const shown = ref(false)
let raf = 0
const target = { x: 0, y: 0 }
const cur = { x: 0, y: 0 }

function onMove(e: PointerEvent) {
  const el = wrapRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  target.x = (e.clientX - r.left) / r.width - 0.5
  target.y = (e.clientY - r.top) / r.height - 0.5
}

function onLeave() {
  target.x = 0
  target.y = 0
}

let layerEls: SVGGElement[] = []

function loop() {
  cur.x += (target.x - cur.x) * 0.08
  cur.y += (target.y - cur.y) * 0.08
  for (const g of layerEls) {
    const w = Number(g.dataset.weight ?? 0)
    g.style.transform = `translate3d(${(cur.x * w).toFixed(2)}px, ${(cur.y * w * 0.6).toFixed(2)}px, 0)`
  }
  raf = requestAnimationFrame(loop)
}

let io: IntersectionObserver | null = null

onMounted(() => {
  // 不依赖 IntersectionObserver：iframe / 无滚动环境下回调时机不可靠，
  // 加载后下一帧直接触发，描边动画仍由 CSS 的 transition-delay 错峰。
  requestAnimationFrame(() => {
    shown.value = true
  })
  raf = requestAnimationFrame(loop)
  const el = stageRef.value
  layerEls = Array.from(el?.querySelectorAll<SVGGElement>('[data-weight]') ?? [])
  if (!el) return
  io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) shown.value = true
      })
    },
    { threshold: 0.25 },
  )
  io.observe(el)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  io?.disconnect()
})
</script>

<template>
  <section ref="wrapRef" class="ct" @pointermove="onMove" @pointerleave="onLeave">
    <div class="ct__inner">
      <div class="ct__copy">
        <p class="ct__kicker">world / 地形</p>
        <h2 class="ct__title">一块地，被挖了三年</h2>
        <p class="ct__lead">
          纯净生存的地图没有重置过。出生点往北是运河，往东是红石试验田，往南是玩家自己拉起来的高铁。
          这些线是等高线，也是这三年里被走过最多的地方。
        </p>
        <dl class="ct__stats">
          <div><dt>已开服</dt><dd>26 个月</dd></div>
          <div><dt>地图重置</dt><dd>0 次</dd></div>
          <div><dt>建筑存档</dt><dd>12.8 万块</dd></div>
        </dl>
      </div>

      <div ref="stageRef" class="ct__stage" :class="{ 'is-shown': shown }">
        <svg viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <g
            v-for="(l, i) in LAYERS"
            :key="i"
            :data-weight="l.weight"
            class="ct__layer"
            :style="{ '--d': `${i * 0.11}s` }"
          >
            <path
              :d="l.d"
              pathLength="1"
              fill="none"
              :stroke="`color-mix(in srgb, var(--primary-color) ${Math.round(l.opacity * 100)}%, transparent)`"
              :stroke-width="l.width"
              stroke-linejoin="round"
            />
          </g>
        </svg>
        <span class="ct__dot ct__dot--a" />
        <span class="ct__dot ct__dot--b" />
        <span class="ct__dot ct__dot--c" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.ct {
  position: relative;
  padding: 110px 0 96px;
  overflow: hidden;
}
.ct__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 40px;
  align-items: center;
}

.ct__kicker {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary-color);
  margin: 0 0 12px;
}
.ct__title {
  font-size: clamp(1.9rem, 3.4vw, 2.5rem);
  line-height: 1.15;
  letter-spacing: -0.03em;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 14px;
}
.ct__lead {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--text-secondary);
  margin: 0 0 28px;
  max-width: 44ch;
}

.ct__stats {
  display: flex;
  gap: 32px;
  margin: 0;
}
.ct__stats dt {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 5px;
}
.ct__stats dd {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-color);
  font-variant-numeric: tabular-nums;
}

/* —— 图形区 —— */
.ct__stage {
  position: relative;
  aspect-ratio: 1000 / 480;
}
.ct__stage svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}
.ct__layer {
  transform: translate3d(0, 0, 0);
  will-change: transform;
}
.ct__layer path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 1.6s cubic-bezier(0.32, 0.72, 0, 1);
  transition-delay: var(--d, 0s);
}
.ct__stage.is-shown .ct__layer path {
  stroke-dashoffset: 0;
}

/* 三个定位点：出生点 / 运河口 / 高铁路 */
.ct__dot {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary-color);
  box-shadow: 0 0 0 0 rgba(167, 139, 250, 0.5);
  animation: ct-ping 2.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
.ct__dot--a {
  left: 46%;
  top: 44%;
}
.ct__dot--b {
  left: 66%;
  top: 33%;
  animation-delay: 0.9s;
}
.ct__dot--c {
  left: 34%;
  top: 64%;
  animation-delay: 1.7s;
}
@keyframes ct-ping {
  0% {
    box-shadow: 0 0 0 0 rgba(167, 139, 250, 0.45);
  }
  70%,
  100% {
    box-shadow: 0 0 0 12px rgba(167, 139, 250, 0);
  }
}

@media (max-width: 980px) {
  .ct__inner {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
@media (max-width: 900px) {
  .ct {
    padding: 76px 0 64px;
  }
  .ct__inner {
    padding: 0 20px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ct__layer path {
    transition: none;
    stroke-dashoffset: 0;
  }
  .ct__dot {
    animation: none;
  }
}
</style>
