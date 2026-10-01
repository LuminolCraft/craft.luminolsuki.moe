<!--
  HomeParticles — 漂浮粒子氛围层（Canvas 2D，随主题换色）
  思路取自 Vue Bits「Particles」(https://vue-bits.dev/backgrounds/particles)，
  为贴合项目「零额外依赖 + 低端设备可退」的约束改为 Canvas 2D 实现。

  与 TocToggles.vue 主题切换的兼容约定：
  - 属氛围层，:root[data-vt] 帧内隐藏，不参与快照
  - 颜色不读 getComputedStyle，用 data-theme 双调色板；属性变更后同步重绘一次（覆盖回退路径）
  - IntersectionObserver 控制启停；页面隐藏时暂停；DPR 上限 2
-->
<template>
  <div ref="rootRef" class="particles-layer">
    <canvas ref="canvasRef" class="particles-canvas" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  alpha: number
  phase: number
}

const props = withDefaults(
  defineProps<{
    count?: number
    speed?: number
    /** 光标排斥半径（px），0 表示不交互 */
    repelRadius?: number
    opacity?: number
  }>(),
  {
    count: 64,
    speed: 0.18,
    repelRadius: 130,
    opacity: 0.75,
  },
)

const LIGHT_PALETTE = ['167 139 250', '94 234 212', '129 140 248'] as const
const DARK_PALETTE = ['147 112 219', '56 189 248', '167 139 250'] as const

const rootRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let width = 0
let height = 0
let dpr = 1
let particles: Particle[] = []
let sprite: HTMLCanvasElement | null = null
let spriteRgb = ''
let isVisible = false
let isPageVisible = true
let themeObserver: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null
let pointer = { x: -9999, y: -9999 }
let reduced = false
const intersections = new WeakMap<Element, IntersectionObserver>()

function palette(): readonly string[] {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
  return dark ? DARK_PALETTE : LIGHT_PALETTE
}

function makeSprite(rgb: string): HTMLCanvasElement {
  const size = 64
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, `rgba(${rgb} / 0.95)`)
    grad.addColorStop(0.35, `rgba(${rgb} / 0.35)`)
    grad.addColorStop(1, `rgba(${rgb} / 0)`)
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
  }
  return c
}

function buildSprites(): void {
  const rgb = palette()[0]!
  if (rgb !== spriteRgb) {
    sprite = makeSprite(rgb)
    spriteRgb = rgb
  }
}

function seed(): void {
  particles = Array.from({ length: props.count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * props.speed,
    vy: (Math.random() - 0.5) * props.speed,
    r: 1.2 + Math.random() * 3.4,
    alpha: 0.25 + Math.random() * 0.55,
    phase: Math.random() * Math.PI * 2,
  }))
}

function resize(): void {
  const canvas = canvasRef.value
  const host = rootRef.value
  if (!canvas || !host) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = host.offsetWidth
  height = host.offsetHeight
  canvas.width = Math.max(1, Math.floor(width * dpr))
  canvas.height = Math.max(1, Math.floor(height * dpr))
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  buildSprites()
  seed()
}

function frame(t: number): void {
  rafId = requestAnimationFrame(frame)
  if (!ctx || !isVisible || !isPageVisible || !sprite) return

  ctx.clearRect(0, 0, width, height)
  ctx.globalCompositeOperation = 'lighter'

  const colors = palette()
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]!
    p.x += p.vx
    p.y += p.vy

    if (pointer.x > -9000) {
      const dx = p.x - pointer.x
      const dy = p.y - pointer.y
      const dist = Math.hypot(dx, dy)
      if (dist < props.repelRadius && dist > 0.001) {
        const force = (1 - dist / props.repelRadius) * 0.55
        p.x += (dx / dist) * force
        p.y += (dy / dist) * force
      }
    }

    if (p.x < -20) p.x = width + 20
    if (p.x > width + 20) p.x = -20
    if (p.y < -20) p.y = height + 20
    if (p.y > height + 20) p.y = -20

    const twinkle = 0.75 + 0.25 * Math.sin(t * 0.0009 + p.phase)
    ctx.globalAlpha = p.alpha * twinkle
    const size = p.r * 8
    ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size)

    // 少量彩色点缀，避免整层过于单调
    if (i % 5 === 0) {
      ctx.globalAlpha = p.alpha * 0.35 * twinkle
      const rgb = colors[1 + (i % 2)]!
      ctx.fillStyle = `rgb(${rgb})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * 0.55, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

function onPointerMove(e: PointerEvent): void {
  const host = rootRef.value
  if (!host) return
  const rect = host.getBoundingClientRect()
  pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function onPointerLeave(): void {
  pointer = { x: -9999, y: -9999 }
}

function onVisibility(): void {
  isPageVisible = document.visibilityState === 'visible'
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return

  const host = rootRef.value
  const canvas = canvasRef.value
  if (!host || !canvas) return
  if (window.matchMedia('(pointer: coarse)').matches) return

  resize()

  resizeObserver = new ResizeObserver(() => resize())
  resizeObserver.observe(host)

  // 主题颜色不读 getComputedStyle：监听 data-theme 属性，变更后重做精灵图
  themeObserver = new MutationObserver(() => {
    buildSprites()
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })

  const io = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0]?.isIntersecting ?? false
    },
    { threshold: 0, rootMargin: '100px' },
  )
  io.observe(host)
  intersections.set(host, io)

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  host.addEventListener('pointerleave', onPointerLeave)

  rafId = requestAnimationFrame(frame)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  rafId = 0
  resizeObserver?.disconnect()
  resizeObserver = null
  themeObserver?.disconnect()
  themeObserver = null
  const host = rootRef.value
  if (host) {
    intersections.get(host)?.disconnect()
    intersections.delete(host)
    host.removeEventListener('pointerleave', onPointerLeave)
  }
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pointermove', onPointerMove)
  particles = []
  ctx = null
  sprite = null
})
</script>

<style scoped>
.particles-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  opacity: v-bind(opacity);
}

.particles-canvas {
  display: block;
}

/* 主题切换快照帧内隐藏：不参与主题扩散快照 */
:root[data-vt] .particles-layer {
  opacity: 0 !important;
}

@media (prefers-reduced-motion: reduce) {
  .particles-layer {
    display: none;
  }
}
</style>
