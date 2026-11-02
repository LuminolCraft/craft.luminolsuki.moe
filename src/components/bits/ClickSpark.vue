<!--
  ClickSpark —— 点击火花

  移植自 Vue Bits「Click Spark」(https://vue-bits.dev/components/click-spark)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点（相对上游源码）：
  - 去 Tailwind：`relative w-full h-full` / `absolute inset-0 pointer-events-none`
    落成 scoped CSS `.cs-root` / `.cs-canvas`
  - 上游 draw() 无条件 requestAnimationFrame，空转永久占一个 rAF；这里改成
    「有火花才跑，队列空了就 cancel + 清画布」，静止时零开销
  - canvas 按 devicePixelRatio 放大再用 CSS 尺寸压回，上游直接拿 CSS 像素当
    位图尺寸，retina 上线条发虚
  - 补 prefers-reduced-motion：减弱动效时不出火花（纯装饰，不该强行动）
  - 补 fixed 模式：整站点击特效必须盖在页面上且不吃事件，用 display:contents
    的根 + position:fixed 的画布 + window 级 click 监听；默认仍是上游那套
    「包住内容、监听根节点 click」的用法
  - sparkCount 用整数化，避免传小数时 angle 步进错位
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

type SparkEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

interface ClickSparkProps {
  /** 火花线条颜色 */
  sparkColor?: string
  /** 单根火花线长度 */
  sparkSize?: number
  /** 火花从点击点向外扩散的距离 */
  sparkRadius?: number
  /** 每次点击的火花根数 */
  sparkCount?: number
  /** 单次动画时长（毫秒） */
  duration?: number
  easing?: SparkEasing
  /** 扩散距离与线长的整体倍率 */
  extraScale?: number
  /** true = 全屏固定画布 + window 级点击（整站特效）；false = 包住内容、监听根节点 */
  fixed?: boolean
  /** 透传给根节点的类名 */
  className?: string
}

interface Spark {
  x: number
  y: number
  angle: number
  startTime: number
}

const props = withDefaults(defineProps<ClickSparkProps>(), {
  sparkColor: '#fff',
  sparkSize: 10,
  sparkRadius: 15,
  sparkCount: 8,
  duration: 400,
  easing: 'ease-out',
  extraScale: 1,
  fixed: false,
  className: '',
})

const rootRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const reduce = usePreferredReducedMotion()

let sparks: Spark[] = []
let raf = 0
let dpr = 1
let boxW = 0
let boxH = 0
let resizeTimer: ReturnType<typeof setTimeout> | undefined
let observer: ResizeObserver | null = null

const ease = computed<(t: number) => number>(() => {
  switch (props.easing) {
    case 'linear':
      return (t) => t
    case 'ease-in':
      return (t) => t * t
    case 'ease-in-out':
      return (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
    default:
      return (t) => t * (2 - t)
  }
})

/** 画布尺寸跟随容器；DPR 放大保证线条锐利 */
function fit() {
  const canvas = canvasRef.value
  if (!canvas) return
  const host = props.fixed ? null : rootRef.value
  const rect = host ? host.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight }
  const nextDpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.max(1, Math.round(rect.width))
  const h = Math.max(1, Math.round(rect.height))
  if (w === boxW && h === boxH && nextDpr === dpr) return
  boxW = w
  boxH = h
  dpr = nextDpr
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
}

function draw(timestamp: number) {
  raf = 0
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.strokeStyle = resolveColor(props.sparkColor)
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  const alive: Spark[] = []
  for (const spark of sparks) {
    const elapsed = timestamp - spark.startTime
    if (elapsed >= props.duration) continue
    alive.push(spark)
    const t = elapsed / props.duration
    const eased = ease.value(t)
    const distance = eased * props.sparkRadius * props.extraScale
    const line = props.sparkSize * (1 - eased)
    const cos = Math.cos(spark.angle)
    const sin = Math.sin(spark.angle)
    ctx.beginPath()
    ctx.moveTo(spark.x + distance * cos, spark.y + distance * sin)
    ctx.lineTo(spark.x + (distance + line) * cos, spark.y + (distance + line) * sin)
    ctx.stroke()
  }
  sparks = alive
  if (sparks.length) {
    raf = requestAnimationFrame(draw)
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function burst(clientX: number, clientY: number) {
  // usePreferredReducedMotion 返回的是 'reduce' | 'no-preference' 字符串，
  // 不能直接当布尔用（'no-preference' 也是真值）
  if (reduce.value === 'reduce') return
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const now = performance.now()
  const count = Math.max(1, Math.round(props.sparkCount))
  for (let i = 0; i < count; i += 1) {
    sparks.push({ x, y, angle: (2 * Math.PI * i) / count, startTime: now })
  }
  // 上限兜底：连点不停时不让队列无限膨胀
  if (sparks.length > count * 12) sparks = sparks.slice(-count * 12)
  if (!raf) raf = requestAnimationFrame(draw)
}

/** canvas 不认 CSS 变量：sparkColor 传 var(--x) 时先解析成实际颜色 */
function resolveColor(value: string): string {
  const match = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value)
  if (!match) return value
  const canvas = canvasRef.value
  if (!canvas) return value
  const resolved = getComputedStyle(canvas).getPropertyValue(match[1]!).trim()
  return resolved || value
}

function onClick(e: MouseEvent) {
  burst(e.clientX, e.clientY)
}

/** fixed 模式统一走 window 监听，根节点上的冒泡不能再触发一次 */
function onRootClick(e: MouseEvent) {
  if (props.fixed) return
  onClick(e)
}

function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(fit, 100)
}

onMounted(() => {
  fit()
  if (props.fixed) {
    window.addEventListener('click', onClick)
    window.addEventListener('resize', onResize)
  } else {
    observer = new ResizeObserver(onResize)
    if (rootRef.value) observer.observe(rootRef.value)
  }
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  sparks = []
  clearTimeout(resizeTimer)
  observer?.disconnect()
  window.removeEventListener('click', onClick)
  window.removeEventListener('resize', onResize)
})

watch(
  () => [props.sparkColor, props.sparkSize, props.sparkRadius, props.sparkCount, props.duration, props.extraScale],
  () => {
    // 参数变了不影响在跑的火花，下一帧自然用新值
    if (sparks.length && !raf) raf = requestAnimationFrame(draw)
  }
)
</script>

<template>
  <div ref="rootRef" class="cs-root" :class="className" :data-fixed="fixed ? '' : undefined" @click="onRootClick">
    <canvas ref="canvasRef" class="cs-canvas" aria-hidden="true" />
    <slot />
  </div>
</template>

<style scoped>
.cs-root {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 整站模式：根节点不参与布局，画布固定盖满视口且不吃事件 */
.cs-root[data-fixed] {
  display: contents;
}

.cs-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.cs-root[data-fixed] .cs-canvas {
  position: fixed;
  z-index: 2147483000;
}
</style>
