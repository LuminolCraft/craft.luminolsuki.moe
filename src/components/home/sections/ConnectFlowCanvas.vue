<!--
  ConnectFlowCanvas —— 进服方式（分叉图）

  三层技术叠在一起：
  1. Canvas 2D：贝塞尔采样后的路径 + 沿路径流动的粒子（拖尾、指针加速）
  2. SVG：分叉处的脉冲环与箭头，用 pathLength + stroke-dashoffset 做描边动画
  3. HTML-in-Canvas：节点卡片是**真实 DOM**（`layoutsubtree` + `drawElementImage`），
     被浏览器画进 canvas —— 文字仍是 MiSans、可选中、可点击、可被读屏读到

  降级：`drawElementImage` 不存在时（Firefox / Safari / 旧 Chrome），卡片 DOM 会被移到
  canvas 外的覆盖层，canvas 只负责线和粒子，视觉基本一致。
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const W = 1040
const H = 400

type Tone = 'trunk' | 'pure' | 'mod'

interface FlowNode {
  id: string
  x: number
  y: number
  w: number
  step: string
  title: string
  desc: string
  tone: Tone
}

const NODES: FlowNode[] = [
  { id: 'n1', x: 136, y: 200, w: 152, step: '01', title: '进 QQ 群', desc: '993953379', tone: 'trunk' },
  { id: 'n2', x: 318, y: 200, w: 152, step: '02', title: '拿服务器地址', desc: '群公告自取', tone: 'trunk' },
  { id: 'p1', x: 606, y: 110, w: 178, step: '03 · 纯净', title: '注册网站账号', desc: '绑定与查询都靠它', tone: 'pure' },
  { id: 'p2', x: 806, y: 110, w: 186, step: '04 · 纯净', title: '进服绑定游戏账号', desc: '绑定后自动加白', tone: 'pure' },
  { id: 'm1', x: 606, y: 290, w: 178, step: '03 · 综合', title: '直接进入', desc: '免注册 · 免绑定', tone: 'mod' },
]

const stageRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const overlayRef = ref<HTMLDivElement | null>(null)
const nodeEls = ref<HTMLElement[]>([])
const supported = ref(false)
const noApi = ref(false)

function setNodeEl(el: Element | null, i: number) {
  if (el) nodeEls.value[i] = el as HTMLElement
}

/* ---------------- 路径 ---------------- */
type Seg =
  | { t: 'line'; p: [number, number, number, number] }
  | { t: 'curve'; p: [number, number, number, number, number, number, number, number] }

const SEGS = {
  trunk: [{ t: 'line', p: [60, 200, 380, 200] }] as Seg[],
  pure: [
    { t: 'curve', p: [380, 200, 452, 200, 452, 110, 524, 110] },
    { t: 'line', p: [524, 110, 900, 110] },
  ] as Seg[],
  mod: [
    { t: 'curve', p: [380, 200, 452, 200, 452, 290, 524, 290] },
    { t: 'line', p: [524, 290, 900, 290] },
  ] as Seg[],
}

function sample(segs: Seg[], step = 4) {
  const pts: { x: number; y: number }[] = []
  for (const s of segs) {
    if (s.t === 'line') {
      const [x1, y1, x2, y2] = s.p
      const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / step))
      for (let i = 0; i <= n; i++) {
        const kk = i / n
        pts.push({ x: x1 + (x2 - x1) * kk, y: y1 + (y2 - y1) * kk })
      }
    } else {
      const [x1, y1, c1x, c1y, c2x, c2y, x2, y2] = s.p
      const rough =
        Math.hypot(c1x - x1, c1y - y1) + Math.hypot(c2x - c1x, c2y - c1y) + Math.hypot(x2 - c2x, y2 - c2y)
      const n = Math.max(10, Math.round(rough / step))
      for (let i = 0; i <= n; i++) {
        const kk = i / n
        const u = 1 - kk
        pts.push({
          x: u * u * u * x1 + 3 * u * u * kk * c1x + 3 * u * kk * kk * c2x + kk * kk * kk * x2,
          y: u * u * u * y1 + 3 * u * u * kk * c1y + 3 * u * kk * kk * c2y + kk * kk * kk * y2,
        })
      }
    }
  }
  return pts
}

const PATHS = {
  trunk: sample(SEGS.trunk),
  pure: sample(SEGS.pure),
  mod: sample(SEGS.mod),
}
const ROUTES = {
  pure: [...PATHS.trunk, ...PATHS.pure.slice(1)],
  mod: [...PATHS.trunk, ...PATHS.mod.slice(1)],
}

interface Particle {
  path: 'pure' | 'mod'
  s: number
  base: number
  boost: number
}

const particles: Particle[] = []
const pointer = { x: -999, y: -999 }

let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let last = 0
let elapsed = 0
let scale = 1
let dpr = 1
let ro: ResizeObserver | null = null

const lit = reactive(new Set<string>())
const badgeOn = reactive(new Set<string>())

function seedParticles() {
  particles.length = 0
  ;(['pure', 'mod'] as const).forEach((key) => {
    const pts = ROUTES[key]
    for (let i = 0; i < 10; i++) {
      particles.push({
        path: key,
        s: (i / 10) * (pts.length - 1),
        base: key === 'pure' ? 1.1 : 1.5,
        boost: 0,
      })
    }
  })
}

function strokePart(
  pts: { x: number; y: number }[],
  progress: number,
  color: string,
  width: number,
  glow = 0,
) {
  if (!ctx) return
  const n = Math.floor((pts.length - 1) * progress)
  if (n < 1) return
  ctx.beginPath()
  ctx.moveTo(pts[0]!.x, pts[0]!.y)
  for (let i = 1; i <= n; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (glow) {
    ctx.shadowBlur = glow
    ctx.shadowColor = color
  }
  ctx.stroke()
  ctx.shadowBlur = 0
}

function drawParticles(dt: number) {
  if (!ctx) return
  for (const p of particles) {
    const pts = ROUTES[p.path]
    const cur = pts[Math.floor(p.s) % pts.length]!
    let boost = 0
    if (pointer.x > -500) {
      const d = Math.hypot(cur.x - pointer.x, cur.y - pointer.y)
      boost = d < 90 ? (90 - d) / 90 : 0
    }
    p.boost += (boost - p.boost) * 0.12
    p.s += p.base * (dt / 16.67) * (1 + p.boost * 1.8)
    if (p.s > pts.length - 1) p.s -= pts.length - 1

    const isPure = p.path === 'pure'
    for (let t = 8; t >= 0; t--) {
      const idx = Math.floor(p.s - t * 2.4)
      if (idx < 0) continue
      const q = pts[idx % pts.length]!
      const a = (1 - t / 8) * 0.5
      ctx.beginPath()
      ctx.arc(q.x, q.y, t === 0 ? 2 : 1.4, 0, Math.PI * 2)
      ctx.fillStyle = isPure ? `rgba(190,165,255,${a})` : `rgba(120,235,195,${a})`
      if (t === 0) {
        ctx.shadowBlur = 9
        ctx.shadowColor = isPure ? '#a78bfa' : '#38d6a8'
      }
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }
}

function render(dt: number) {
  const cv = canvasRef.value
  if (!ctx || !cv) return

  const trunk = Math.min(1, elapsed / 700)
  const pure = Math.min(1, Math.max(0, (elapsed - 550) / 1100))
  const mod = Math.min(1, Math.max(0, (elapsed - 550) / 800))

  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, W, H)

  strokePart(PATHS.trunk, 1, 'rgba(140,138,155,.14)', 2)
  strokePart(PATHS.pure, 1, 'rgba(167,139,250,.12)', 2)
  strokePart(PATHS.mod, 1, 'rgba(56,214,168,.12)', 2)

  strokePart(PATHS.trunk, trunk, 'rgba(160,156,180,.55)', 2)
  strokePart(PATHS.pure, pure, 'rgba(167,139,250,.95)', 2.2, 10)
  strokePart(PATHS.mod, mod, 'rgba(56,214,168,.95)', 2.2, 10)

  drawParticles(dt)

  // 点亮状态：只在值变化时增删，避免每帧触发重渲染
  const want = new Set<string>()
  if (elapsed > 200) want.add('n1')
  if (elapsed > 440) want.add('n2')
  if (pure > 0.5) want.add('p1')
  if (pure > 0.95) want.add('p2')
  if (mod > 0.5) want.add('m1')
  for (const id of [...lit]) if (!want.has(id)) lit.delete(id)
  for (const id of want) if (!lit.has(id)) lit.add(id)

  const wantBadge = new Set<string>()
  if (pure > 0.97) wantBadge.add('pb')
  if (mod > 0.97) wantBadge.add('mb')
  for (const id of [...badgeOn]) if (!wantBadge.has(id)) badgeOn.delete(id)
  for (const id of wantBadge) if (!badgeOn.has(id)) badgeOn.add(id)

  // —— HTML-in-Canvas：把真实 DOM 卡片画进来 ——
  if (supported.value && !noApi.value) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const k = cv.width / W
    nodeEls.value.forEach((el, i) => {
      if (!el) return
      const n = NODES[i]!
      const r = el.getBoundingClientRect()
      if (!r.width) return
      const api = ctx as CanvasRenderingContext2D & {
        drawElementImage?: (el: Element, dx: number, dy: number, dw: number, dh: number) => void
      }
      try {
        api.drawElementImage?.(el, (n.x - n.w / 2) * k, (n.y - 40) * k, r.width * dpr, r.height * dpr)
      } catch {
        noApi.value = true
      }
    })
  }

  // 徽标
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.textAlign = 'center'
  ctx.font = '600 12px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
  if (badgeOn.has('pb')) {
    ctx.fillStyle = '#a78bfa'
    ctx.fillText('可以玩了', 948, 114)
  }
  if (badgeOn.has('mb')) {
    ctx.fillStyle = '#38d6a8'
    ctx.fillText('可以玩了', 948, 294)
  }
  ctx.textAlign = 'left'
}

function loop(now: number) {
  const dt = Math.min(now - (last || now - 16.67), 40)
  last = now
  elapsed += dt
  render(dt)
  raf = requestAnimationFrame(loop)
}

function resize() {
  const stage = stageRef.value
  const cv = canvasRef.value
  if (!stage || !cv) return
  const rect = stage.getBoundingClientRect()
  if (rect.width < 2) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  cv.width = Math.round(rect.width * dpr)
  cv.height = Math.round((rect.width * H) / W) * dpr
  scale = (rect.width / W) * dpr
  stage.style.setProperty('--k', String(rect.width / W))
}

onMounted(() => {
  const cv = canvasRef.value
  if (!cv) return
  ctx = cv.getContext('2d')
  // HTML-in-Canvas 是实验 API：drawElementImage 在部分环境（无 GPU 合成）会静默画不出来，
  // 而 layoutsubtree 一旦生效 DOM 视觉就被浏览器抑制 —— 赌错就是白板。
  // 所以默认走普通覆盖层，只有显式 ?hic=1 才启用实验路径。
  const wantsHic = new URLSearchParams(location.search).has('hic')
  supported.value = wantsHic && 'drawElementImage' in CanvasRenderingContext2D.prototype
  if (supported.value && overlayRef.value) {
    cv.setAttribute('layoutsubtree', '')
    cv.appendChild(overlayRef.value)
  }

  resize()
  seedParticles()
  ro = new ResizeObserver(resize)
  if (stageRef.value) ro.observe(stageRef.value)

  last = 0
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
})
</script>

<template>
  <section class="cf" aria-labelledby="cf-title">
    <div class="cf__wrap">
      <header class="cf__head">
        <p class="cf__kicker">onboarding / 两条路线</p>
        <h2 id="cf-title" class="cf__title">怎么进来</h2>
        <p class="cf__lead">
          纯净生存和综合生存前两步一样：进群、拿地址。第三步开始分道 —— 纯净服要注册并绑定游戏账号才会加白，
          综合服拿到地址直接进。
        </p>
      </header>

      <div ref="stageRef" class="cf__stage">
        <!-- 不支持 HTML-in-Canvas 时的覆盖层容器 -->
        <div ref="overlayRef" class="cf__overlay" />

        <canvas ref="canvasRef" class="cf__canvas" />

        <!-- SVG 层：分叉脉冲（circle + CSS 关键帧）与末端箭头（marker） -->
        <svg class="cf__svg" viewBox="0 0 1040 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <marker id="cfArrowPure" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" />
            </marker>
            <marker id="cfArrowMod" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38d6a8" />
            </marker>
          </defs>
          <circle class="cf__pulse" cx="380" cy="200" r="5" />
          <circle class="cf__pulse cf__pulse--delay" cx="380" cy="200" r="5" />
          <path class="cf__arrow" d="M 892 110 L 908 110" marker-end="url(#cfArrowPure)" />
          <path class="cf__arrow" d="M 892 290 L 908 290" marker-end="url(#cfArrowMod)" />
        </svg>

        <!-- 默认这种：正常 DOM 覆盖层，稳定可读。?hic=1 时整块会被移进 canvas -->
        <div ref="overlayRef" class="cf__overlay">
          <div
            v-for="(n, i) in NODES"
            :key="n.id"
            :ref="(el) => setNodeEl(el as Element | null, i)"
            class="cf__node"
            :class="[`is-${n.tone}`, { 'is-lit': lit.has(n.id) }]"
            :style="{
              '--nx': String(n.x),
              '--ny': String(n.y),
              '--nw': String(n.w),
            }"
          >
            <span class="cf__no">{{ n.step }}</span>
            <b class="cf__ti">{{ n.title }}</b>
            <span class="cf__ds">{{ n.desc }}</span>
          </div>
        </div>
      </div>

      <p class="cf__note">
        路径与粒子走 canvas 2D，两张卡的 DOM 就在上面（可选中、可被读屏读到）。加 <code>?hic=1</code> 打开
        HTML-in-Canvas 实验路径：卡片会被 <code>drawElementImage()</code> 画进 canvas 本体（需 Chrome 157+）。
      </p>
    </div>
  </section>
</template>

<style scoped>
.cf {
  position: relative;
  padding: 110px 0 96px;
}
.cf__wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
}
.cf__kicker {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary-color);
  margin: 0 0 12px;
}
.cf__title {
  font-size: clamp(1.9rem, 3.4vw, 2.5rem);
  line-height: 1.15;
  letter-spacing: -0.03em;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 12px;
}
.cf__lead {
  font-size: 1.05rem;
  line-height: 1.75;
  color: var(--text-secondary);
  max-width: 62ch;
  margin: 0 0 34px;
}

.cf__stage {
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent);
  overflow: hidden;
  aspect-ratio: 1040 / 400;
}
.cf__canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.cf__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}
.cf__pulse {
  fill: none;
  stroke: color-mix(in srgb, var(--primary-color) 70%, transparent);
  stroke-width: 1.2;
  transform-box: fill-box;
  transform-origin: center;
  animation: cf-pulse 2.6s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
.cf__pulse--delay {
  animation-delay: 1.3s;
}
@keyframes cf-pulse {
  0% {
    transform: scale(0.6);
    opacity: 0.9;
  }
  70% {
    opacity: 0;
  }
  100% {
    transform: scale(5.5);
    opacity: 0;
  }
}
.cf__arrow {
  fill: none;
  stroke-width: 1.4;
  stroke-linecap: round;
}
.cf__arrow:nth-of-type(1) {
  stroke: #a78bfa;
}
.cf__arrow:nth-of-type(2) {
  stroke: #38d6a8;
}

@media (prefers-reduced-motion: reduce) {
  .cf__pulse {
    animation: none;
    opacity: 0.35;
  }
}

.cf__overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* 节点卡片：尺寸用 --k（容器宽 / 1040）缩放，保证与 canvas 逻辑坐标一致 */
.cf__node {
  position: absolute;
  left: calc(var(--nx) * var(--k, 1) * 1px);
  top: calc(var(--ny) * var(--k, 1) * 1px);
  width: calc(var(--nw) * var(--k, 1) * 1px);
  transform: translate(-50%, -50%);
  padding: calc(12px * var(--k, 1)) calc(14px * var(--k, 1));
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
  gap: calc(4px * var(--k, 1));
  pointer-events: auto;
  transition:
    border-color 0.3s,
    background-color 0.3s;
}
.cf__no {
  font-family: var(--font-mono);
  font-size: calc(10px * var(--k, 1));
  letter-spacing: 0.1em;
  color: var(--text-secondary);
}
.cf__ti {
  font-size: calc(13.5px * var(--k, 1));
  font-weight: 600;
  line-height: 1.35;
  color: var(--text-color);
}
.cf__ds {
  font-size: calc(11px * var(--k, 1));
  line-height: 1.4;
  color: var(--text-secondary);
}

[data-theme='dark'] .cf__node {
  background: #13131a;
}

.cf__node.is-pure.is-lit {
  border-color: color-mix(in srgb, var(--primary-color) 70%, transparent);
}
.cf__node.is-pure.is-lit .cf__no {
  color: var(--primary-color);
}
.cf__node.is-mod.is-lit {
  border-color: rgba(56, 214, 168, 0.7);
}
.cf__node.is-mod.is-lit .cf__no {
  color: #38d6a8;
}
.cf__node.is-trunk.is-lit {
  border-color: color-mix(in srgb, var(--text-color) 30%, transparent);
}

.cf__note {
  margin: 16px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
  padding-left: 10px;
  border-left: 2px solid color-mix(in srgb, var(--primary-color) 35%, transparent);
}
.cf__note code {
  font-family: var(--font-mono);
  font-size: 11.5px;
  padding: 1px 5px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--text-color) 6%, transparent);
}

@media (max-width: 900px) {
  .cf {
    padding: 76px 0 64px;
  }
  .cf__wrap {
    padding: 0 20px;
  }
  .cf__stage {
    aspect-ratio: 1040 / 620;
  }
}
</style>
