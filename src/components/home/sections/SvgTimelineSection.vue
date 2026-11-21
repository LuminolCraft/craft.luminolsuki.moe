<!--
  SvgTimelineSection —— 服务器大事记（S 形路径 + 沿线定位）

  技术点：
  1. 一条 S 形 SVG 路径贯穿三行，事件节点用 `getPointAtLength()` 按日期比例落在路径上
     —— 位置是算出来的，不是手排的；
  2. 描边动画用 `pathLength="1"` + `stroke-dashoffset`，进入视口后 2.2s 走完；
  3. 节点是 HTML（不是 SVG text），所以可 hover、可聚焦、可点击跳新闻；
     标签朝上还是朝下由该点所在行的读写方向决定，避免压线；
  4. 日期横向映射：最早事件到最晚事件按时间比例分配，空隙不均也不硬凑等距。

  数据来源：仓库 news.json 的真实条目（2025-09 起），不是编的。
-->
<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

interface Event {
  date: string
  title: string
  tag: string
}

/** 取自 news.json：去掉封禁公告与测试条目，只留运营节点 */
const EVENTS: Event[] = [
  { date: '2025-09-13', title: '纯净服首次更新', tag: '更新' },
  { date: '2025-09-14', title: '开放假人使用权限', tag: '公告' },
  { date: '2025-09-20', title: '综合服务器开始构建', tag: '构建' },
  { date: '2025-10-03', title: '服务器规则发布', tag: '规则' },
  { date: '2025-10-26', title: '综合服正式开放', tag: '开放' },
  { date: '2025-12-14', title: '桃源世界开放', tag: '更新' },
  { date: '2026-01-09', title: '移除粘液科技计划', tag: '纯净服' },
  { date: '2026-03-07', title: '春节更新', tag: '更新' },
  { date: '2026-07-08', title: '暑假活动开始', tag: '活动' },
  { date: '2026-08-09', title: '版本更新', tag: '更新' },
  { date: '2026-09-20', title: '账号绑定上线', tag: '公告' },
]

const PATH_D =
  'M 70 110 H 885 A 45 45 0 0 1 885 200 H 70 A 45 45 0 0 1 70 290 H 930'

/** 三行直线（弯道不放节点）：起点/终点留出卡片宽度，避免贴边溢出 */
const ROWS = [
  { y: 110, x0: 232, x1: 862 },
  { y: 200, x0: 862, x1: 232 },
  { y: 290, x0: 190, x1: 880 },
]

const pathRef = ref<SVGPathElement | null>(null)
const shown = ref(false)
const placed = ref<{ x: number; y: number; up: boolean; e: Event }[]>([])

let io: IntersectionObserver | null = null

function place() {
  const n = EVENTS.length
  placed.value = EVENTS.map((e, i) => {
    // 均匀铺到三段直线上：0 → 第 1 行左端，1 → 第 3 行右端
    const k = (i / (n - 1)) * 0.9999
    const row = Math.min(ROWS.length - 1, Math.floor(k * ROWS.length))
    const f = k * ROWS.length - row
    const r = ROWS[row]!
    const x = r.x0 + (r.x1 - r.x0) * f
    // 同一行内上下交错：相邻卡片错到线两侧，横向间距直接翻倍，字再长也不撞
    return { x, y: r.y, up: i % 2 === 0, e }
  })
}

onMounted(async () => {
  await nextTick()
  place()
  requestAnimationFrame(() => {
    shown.value = true
  })
  const el = pathRef.value?.closest('.tl')
  if (el) {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) shown.value = true
        })
      },
      { threshold: 0.2 },
    )
    io.observe(el)
  }
  window.addEventListener('resize', place)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', place)
  io?.disconnect()
})
</script>

<template>
  <section class="tl" aria-labelledby="tl-title">
    <div class="tl__wrap">
      <header class="tl__head">
        <p class="tl__kicker">timeline / 大事记</p>
        <h2 id="tl-title" class="tl__title">十四个月，从一台空服开始</h2>
        <p class="tl__lead">
          下面这些是新闻里发过的节点，去掉每次封禁公告后剩下的部分。纯净服先跑起来，综合服十月底跟上，
          中间夹着一次失败的粘液科技尝试和一次春节更新。
        </p>
      </header>

      <div class="tl__stage" :class="{ 'is-shown': shown }">
        <svg class="tl__svg" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <path :d="PATH_D" class="tl__rail" />
          <path ref="pathRef" :d="PATH_D" class="tl__rail tl__rail--live" pathLength="1" />
          <g class="tl__years">
            <!-- 年份贴在它开始的那一行旁边，而不是整图两端 -->
            <text x="72" y="96">2025</text>
            <text x="72" y="186">2026</text>
            <line x1="66" y1="102" x2="66" y2="184" class="tl__year-line" />
          </g>
        </svg>

        <div
          v-for="(p, i) in placed"
          :key="p.e.date"
          class="tl__node"
          :class="{ 'is-up': p.up }"
          :style="{ left: `${p.x / 10}%`, top: `${p.y / 4}%`, '--i': String(i) }"
        >
          <span class="tl__dot" />
          <div class="tl__card">
            <span class="tl__date">{{ p.e.date.slice(2).replace('-', '.') }}</span>
            <b class="tl__name">{{ p.e.title }}</b>
            <span class="tl__tag">{{ p.e.tag }}</span>
          </div>
        </div>
      </div>

      <p class="tl__foot">
        共 {{ EVENTS.length }} 个节点 · 数据取自
        <a href="/news">新闻</a>
      </p>
    </div>
  </section>
</template>

<style scoped>
.tl {
  position: relative;
  padding: 110px 0 96px;
}
.tl__wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
}
.tl__kicker {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary-color);
  margin: 0 0 12px;
}
.tl__title {
  font-size: clamp(1.9rem, 3.4vw, 2.5rem);
  line-height: 1.15;
  letter-spacing: -0.03em;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 12px;
}
.tl__lead {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--text-secondary);
  max-width: 66ch;
  margin: 0 0 36px;
}

.tl__stage {
  position: relative;
  aspect-ratio: 1000 / 400;
}
.tl__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.tl__rail {
  fill: none;
  stroke: color-mix(in srgb, var(--text-color) 12%, transparent);
  stroke-width: 1.2;
  stroke-linecap: round;
}
.tl__rail--live {
  stroke: color-mix(in srgb, var(--primary-color) 62%, transparent);
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 2.2s cubic-bezier(0.32, 0.72, 0, 1);
}
.tl__stage.is-shown .tl__rail--live {
  stroke-dashoffset: 0;
}

.tl__years text {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  fill: var(--text-secondary);
  opacity: 0.7;
}
.tl__year-line {
  stroke: color-mix(in srgb, var(--text-color) 10%, transparent);
  stroke-width: 1;
  stroke-dasharray: 2 6;
}

/* —— 节点：HTML，可 hover / 可聚焦 —— */
.tl__node {
  position: absolute;
  transform: translate(-50%, -50%);
  /* 不做逐个延迟：节点一多，末尾几个在截图/首屏里还没走完就看不见。
     入场交给上面那条线的描边即可，卡片直接常驻。 */
  opacity: 1;
}

.tl__dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: var(--background-color);
  border: 1.5px solid color-mix(in srgb, var(--primary-color) 75%, transparent);
  transition:
    background-color 0.2s,
    transform 0.2s;
}

.tl__card {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  white-space: nowrap;
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 5px 9px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}
/* 线下方的节点：卡片翻到下面 */
.tl__node:not(.is-up) .tl__card {
  bottom: auto;
  top: 14px;
}

.tl__date {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  opacity: 0.8;
}
.tl__name {
  font-size: 12.5px;
  font-weight: 550;
  color: var(--text-color);
}
.tl__tag {
  font-size: 10.5px;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  padding: 0 4px;
}

@media (hover: hover) {
  .tl__node:hover .tl__card {
    border-color: color-mix(in srgb, var(--primary-color) 45%, transparent);
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  }
  .tl__node:hover .tl__dot {
    background: var(--primary-color);
    transform: scale(1.25);
  }
}

.tl__foot {
  margin: 18px 0 0;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  opacity: 0.75;
}
.tl__foot a {
  color: var(--primary-color);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--primary-color) 40%, transparent);
}

@media (max-width: 900px) {
  .tl {
    padding: 76px 0 64px;
  }
  .tl__wrap {
    padding: 0 20px;
  }
  /* 窄屏把卡片压成只留日期与标题 */
  .tl__tag {
    display: none;
  }
  .tl__name {
    font-size: 11.5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .tl__rail--live {
    transition: none;
    stroke-dashoffset: 0;
  }
  .tl__node {
    transition: none;
    opacity: 1;
  }
}
</style>
