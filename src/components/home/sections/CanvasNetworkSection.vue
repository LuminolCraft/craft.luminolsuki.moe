<!--
  CanvasNetworkSection —— 这套系统怎么跑的（Canvas 拓扑图）

  技术点：
  1. 节点与连线全部在 Canvas 里画，坐标用 0–1 归一化，resize 时只换算不重建；
  2. 每条连线跑 1–2 个「数据包」光点，速度与相位各不相同，看起来像真实流量；
  3. 指针靠近节点时该节点放大、其相邻连线加亮（邻接表预计算）；
  4. 文字标签用 canvas 画，另附一份 sr-only 列表给读屏；
  5. 页面隐藏时停止 rAF，回来续上。

  为什么用 Canvas 而不是 SVG：连线和光点每帧都在动，节点与边的数量上去后
  SVG 会产生大量合成层；Canvas 只重绘一帧位图。
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Node {
  id: string
  label: string
  sub: string
  x: number
  y: number
}

const NODES: Node[] = [
  { id: 'web', label: '网站', sub: 'Vue · CF Pages', x: 0.5, y: 0.12 },
  { id: 'auth', label: '登录', sub: 'Better Auth', x: 0.2, y: 0.34 },
  { id: 'mc', label: '游戏服', sub: 'Folia 插件', x: 0.8, y: 0.34 },
  { id: 'db', label: '数据库', sub: 'D1', x: 0.5, y: 0.44 },
  { id: 'cache', label: '缓存', sub: 'KV', x: 0.18, y: 0.68 },
  { id: 'ai', label: 'AI 网关', sub: 'Workers', x: 0.5, y: 0.72 },
  { id: 'store', label: '对象存储', sub: 'R2', x: 0.82, y: 0.68 },
  { id: 'obs', label: '监控', sub: '日志', x: 0.5, y: 0.93 },
]

const EDGES: [string, string][] = [
  ['web', 'auth'],
  ['web', 'mc'],
  ['web', 'db'],
  ['auth', 'db'],
  ['mc', 'db'],
  ['db', 'cache'],
  ['db', 'ai'],
  ['mc', 'store'],
  ['cache', 'obs'],
  ['ai', 'obs'],
  ['store', 'obs'],
  ['cache', 'ai'],
]

const canvasRef = ref<HTMLCanvasElement | null>(null)
const wrapRef = ref<HTMLElement | null>(null)
const hoverId = ref<string | null>(null)

let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let w = 1000
let h = 520
let dpr = 1
let scale = 1
const pointer = { x: -999, y: -999 }
const packets: { edge: number; t: number; speed: number }[] = []

const nodeMap = new Map(NODES.map((n) => [n.id, n]))
const adj = new Map<string, Set<string>>()
for (const n of NODES) adj.set(n.id, new Set())
for (const [a, b] of EDGES) {
  adj.get(a)?.add(b)
  adj.get(b)?.add(a)
}

function seedPackets() {
  packets.length = 0
  EDGES.forEach((_, i) => {
    packets.push({ edge: i, t: Math.random(), speed: 0.0016 + Math.random() * 0.0022 })
    if (i % 3 === 0) packets.push({ edge: i, t: Math.random(), speed: 0.0012 + Math.random() * 0.0018 })
  })
}

function nodeXY(n: Node) {
  return { x: n.x * w, y: n.y * h }
}

function hitTest(): string | null {
  for (const n of NODES) {
    const p = nodeXY(n)
    if (Math.hypot(p.x - pointer.x, p.y - pointer.y) < 46) return n.id
  }
  return null
}

function resize() {
  const cv = canvasRef.value
  const wrap = wrapRef.value
  if (!cv || !wrap) return
  const rect = wrap.getBoundingClientRect()
  if (rect.width < 2) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = rect.width
  h = rect.width * (520 / 1000)
  cv.width = Math.round(w * dpr)
  cv.height = Math.round(h * dpr)
  scale = dpr
}

function draw() {
  if (!ctx) return
  const c = ctx
  const hot = hitTest()
  // 只在变化时写响应式状态：每帧赋值会让 Vue 每帧重渲染，进而触发 resize 循环
  if (hoverId.value !== hot) hoverId.value = hot
  const hotNeighbors = hot ? adj.get(hot) : null

  c.setTransform(scale, 0, 0, scale, 0, 0)
  c.clearRect(0, 0, w, h)

  // 连线
  EDGES.forEach(([a, b]) => {
    const na = nodeMap.get(a)!
    const nb = nodeMap.get(b)!
    const pa = nodeXY(na)
    const pb = nodeXY(nb)
    const active = !hot || a === hot || b === hot
    c.beginPath()
    c.moveTo(pa.x, pa.y)
    c.lineTo(pb.x, pb.y)
    // canvas 不认 CSS 变量与 color-mix，必须写死 rgba
    c.strokeStyle = active ? 'rgba(167,139,250,.34)' : 'rgba(255,255,255,.07)'
    c.lineWidth = active ? 1.1 : 0.8
    c.setLineDash(active ? [] : [3, 4])
    c.stroke()
    c.setLineDash([])
  })

  // 数据包
  for (const p of packets) {
    const [a, b] = EDGES[p.edge]!
    const na = nodeMap.get(a)!
    const nb = nodeMap.get(b)!
    const pa = nodeXY(na)
    const pb = nodeXY(nb)
    const x = pa.x + (pb.x - pa.x) * p.t
    const y = pa.y + (pb.y - pa.y) * p.t
    const dim = hot && a !== hot && b !== hot
    c.beginPath()
    c.arc(x, y, 1.8, 0, Math.PI * 2)
    c.fillStyle = dim ? 'rgba(167,139,250,.28)' : 'rgba(190,165,255,.95)'
    c.shadowBlur = dim ? 0 : 8
    c.shadowColor = '#a78bfa'
    c.fill()
    c.shadowBlur = 0
    p.t += p.speed * (hot && (a === hot || b === hot) ? 2.4 : 1)
    if (p.t > 1) p.t -= 1
  }

  // 节点
  for (const n of NODES) {
    const p = nodeXY(n)
    const isHot = hot === n.id
    const isNear = hotNeighbors?.has(n.id)
    const r = isHot ? 7 : 4.5

    if (isHot || isNear) {
      c.beginPath()
      c.arc(p.x, p.y, isHot ? 18 : 11, 0, Math.PI * 2)
      c.fillStyle = 'rgba(167,139,250,.10)'
      c.fill()
    }

    c.beginPath()
    c.arc(p.x, p.y, r, 0, Math.PI * 2)
    c.fillStyle = isHot ? '#c7b3ff' : 'rgba(167,139,250,.85)'
    c.fill()

    c.textAlign = 'center'
    c.fillStyle = isHot ? '#f2eefc' : 'rgba(226,222,240,.9)'
    c.font = `600 ${isHot ? 13 : 12}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`
    c.fillText(n.label, p.x, p.y - 16)
    c.fillStyle = 'rgba(140,136,155,.75)'
    c.font = '10px ui-monospace, Menlo, monospace'
    c.fillText(n.sub, p.x, p.y + 22)
    c.textAlign = 'left'
  }
}

function loop() {
  draw()
  raf = requestAnimationFrame(loop)
}

function onMove(e: PointerEvent) {
  const wrap = wrapRef.value
  if (!wrap) return
  const r = wrap.getBoundingClientRect()
  pointer.x = e.clientX - r.left
  pointer.y = e.clientY - r.top
}
function onLeave() {
  pointer.x = -999
  pointer.y = -999
}

let ro: ResizeObserver | null = null

onMounted(() => {
  const cv = canvasRef.value
  if (!cv) return
  ctx = cv.getContext('2d')
  resize()
  seedPackets()
  ro = new ResizeObserver(resize)
  if (wrapRef.value) ro.observe(wrapRef.value)
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
})
</script>

<template>
  <section ref="wrapRef" class="nx" @pointermove="onMove" @pointerleave="onLeave">
    <div class="nx__inner">
      <header class="nx__head">
        <p class="nx__kicker">infra / 架构</p>
        <h2 class="nx__title">这套系统怎么跑的</h2>
        <p class="nx__lead">
          网站、游戏服、数据库、对象存储分在四个地方，中间靠一层 Worker 串起来。
          把指针移到节点上，能看到它直接连的是谁。
        </p>
      </header>

      <div class="nx__stage">
        <canvas ref="canvasRef" class="nx__canvas" />
        <p class="nx__hint">{{ hoverId ? `当前：${NODES.find((n) => n.id === hoverId)?.label}` : '把指针移到节点上' }}</p>
      </div>

      <!-- 给读屏用的等价描述：Canvas 里的文字对辅助技术不可见 -->
      <ul class="sr-only">
        <li v-for="n in NODES" :key="n.id">{{ n.label }}（{{ n.sub }}），连接：{{ [...(adj.get(n.id) ?? [])].map((id) => nodeMap.get(id)?.label).join('、') }}</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.nx {
  position: relative;
  padding: 110px 0 96px;
}
.nx__inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px;
}
.nx__kicker {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary-color);
  margin: 0 0 12px;
}
.nx__title {
  font-size: clamp(1.9rem, 3.4vw, 2.5rem);
  line-height: 1.15;
  letter-spacing: -0.03em;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 12px;
}
.nx__lead {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--text-secondary);
  max-width: 58ch;
  margin: 0 0 30px;
}

.nx__stage {
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent);
  overflow: hidden;
  aspect-ratio: 1000 / 520;
}
.nx__canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.nx__hint {
  position: absolute;
  left: 14px;
  bottom: 10px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  opacity: 0.8;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 900px) {
  .nx {
    padding: 76px 0 64px;
  }
  .nx__inner {
    padding: 0 20px;
  }
}
</style>
