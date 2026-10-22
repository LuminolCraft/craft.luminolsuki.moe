<!--
  PixelLoadingScreen — 进站加载画面（全站一次性）

  与 index.html 的静态 #boot 配合：JS 解析期间 #boot 先顶住白屏；本组件挂载后
  接管视觉（像素格拼装），应用渲染就绪后按图案旋转缩小解体，揭开网站并卸载自身。

  效果移植自 Vue Bits「PixelSwap」(https://vue-bits.dev/animations/pixel-swap)
  原作者 David Haz · MIT + Commons Clause 许可

  相比纯色像素溶解的升级点：
  - 像素之间留缝隙、带圆角，颜色用主题紫的明度抖动，不再是整块纯色板
  - 解体时每块旋转 + 缩小地飞散，不是生硬淡出
  - 消散顺序按图案走（spiral 螺旋 / center 中心炸开 / diagonal 对角线 / random），
    并可混入随机度
  - 纯 DOM + 原生 Web Animations API，无 GSAP / WebGL 依赖
  - reduced-motion：不做拼装/解体动画，就绪后直接揭幕
-->
<template>
  <div v-if="visible" class="boot-pixel" role="status" aria-label="页面加载中">
    <div ref="gridRef" class="boot-pixel__grid" aria-hidden="true" />
    <div class="boot-pixel__center" aria-hidden="true">
      <img
        src="/images/luminol-avatar-96.avif"
        alt=""
        width="56"
        height="56"
        class="boot-pixel__avatar"
      />
      <span class="boot-pixel__label">LOADING</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

// 微调点：CELL_SIZE 像素边长（px，超出总数上限会自动放大）· GAP 像素缝隙 ·
// MAX_CELLS 像素总数上限 · ASSEMBLE_MS 拼装时长 · HOLD_MS 拼装完的最短停留 ·
// REVEAL_MS 解体总时长 · PIXEL_MS 单格解体时长 · SPIN_MAX 单格最大旋转角（度）
const CELL_SIZE = 96
const GAP = 3
const MAX_CELLS = 240
const ASSEMBLE_MS = 320
const HOLD_MS = 500
const REVEAL_MS = 680
const PIXEL_MS = 460
const SPIN_MAX = 80

interface Props {
  /** 消散/拼装的顺序图案 */
  pattern?: 'spiral' | 'center' | 'diagonal' | 'random'
  /** 图案里混入的随机度（0 = 严格按图案，1 = 完全随机） */
  randomness?: number
}

const props = withDefaults(defineProps<Props>(), {
  pattern: 'spiral',
  randomness: 0.25,
})

const SQRT1_2 = Math.SQRT1_2

type OffsetFn = (x: number, y: number, i: number) => number

type LoadingPattern = NonNullable<Props['pattern']>

/** 各图案的先后次序函数：返回值越小越先动（与 PixelSwap 的 PATTERNS 一致） */
const PATTERNS: Record<LoadingPattern, OffsetFn> = {
  spiral: (x, y) => {
    const angle = (Math.atan2(y - 0.5, x - 0.5) + Math.PI) / (Math.PI * 2)
    const radius = Math.hypot(x - 0.5, y - 0.5) / SQRT1_2
    return (angle + radius) % 1
  },
  center: (x, y) => Math.hypot(x - 0.5, y - 0.5) / SQRT1_2,
  diagonal: (x, y) => (x + y) / 2,
  random: (_x, _y, i) => {
    const value = Math.sin((i + 1) * 127.1 + 311.7) * 43758.5453
    return value - Math.floor(value)
  },
}

/** 主题紫的明度抖动色板（与暗底 #0b0e17 同一套），避免「一整块纯色」的廉价感 */
const SHADES = ['#6d4fe0', '#7c5cff', '#8f74ff', '#4a3894', '#2c2450']

const visible = ref(true)
const gridRef = ref<HTMLElement | null>(null)

let animations: Animation[] = []
let timers: number[] = []

function clearTimers(): void {
  timers.forEach((t) => window.clearTimeout(t))
  timers = []
}

onUnmounted(() => {
  animations.forEach((a) => a.cancel())
  animations = []
  clearTimers()
})

function cellOffsets(cols: number, rows: number): number[] {
  const order = PATTERNS[props.pattern] ?? PATTERNS.spiral
  const mix = Math.min(1, Math.max(0, props.randomness))
  const offsets: number[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const i = row * cols + col
      const x = cols <= 1 ? 0.5 : col / (cols - 1)
      const y = rows <= 1 ? 0.5 : row / (rows - 1)
      const base = order(x, y, i)
      const value = Math.sin((i + 1) * 127.1 + 311.7) * 43758.5453
      const noise = value - Math.floor(value)
      offsets.push(base * (1 - mix) + noise * mix)
    }
  }
  return offsets
}

function buildGrid(): { cols: number; rows: number; cells: HTMLSpanElement[] } | null {
  const grid = gridRef.value
  if (!grid) return null
  const vw = window.innerWidth
  const vh = window.innerHeight
  let size = CELL_SIZE
  let cols = Math.max(1, Math.ceil((vw + GAP) / (size + GAP)))
  let rows = Math.max(1, Math.ceil((vh + GAP) / (size + GAP)))
  // 总数超上限就放大像素（最多收敛 3 轮），解体动画的元素量才有保障
  for (let pass = 0; pass < 3 && cols * rows > MAX_CELLS; pass += 1) {
    size = Math.ceil(size * Math.sqrt((cols * rows) / MAX_CELLS))
    cols = Math.max(1, Math.ceil((vw + GAP) / (size + GAP)))
    rows = Math.max(1, Math.ceil((vh + GAP) / (size + GAP)))
  }

  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`

  const cells: HTMLSpanElement[] = []
  for (let i = 0; i < cols * rows; i += 1) {
    const cell = document.createElement('span')
    cell.className = 'boot-pixel__cell'
    cell.style.background = SHADES[Math.floor(Math.random() * SHADES.length)] ?? '#7c5cff'
    grid.appendChild(cell)
    cells.push(cell)
  }
  return { cols, rows, cells }
}

function runAnimations(
  cells: HTMLSpanElement[],
  offsets: number[],
  from: Keyframe,
  to: Keyframe,
  duration: number,
  spreadMs: number,
  easing: string,
): void {
  cells.forEach((cell, i) => {
    animations.push(
      cell.animate([from, to], {
        duration,
        delay: (offsets[i] ?? 0) * spreadMs,
        easing,
        fill: 'both',
      }),
    )
  })
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // 等 Vue 层真正画出来再撤静态启动画面（双 rAF 保证首帧已提交）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById('boot')?.remove()
      if (reduced) {
        visible.value = false
        return
      }

      const built = buildGrid()
      if (!built) return
      const { cols, rows, cells } = built
      const offsets = cellOffsets(cols, rows)

      // 拼装：像素按同一图案快速长出来，中间内容不受影响
      runAnimations(
        cells,
        offsets,
        { transform: 'scale(0.2)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
        220,
        ASSEMBLE_MS * 0.6,
        'cubic-bezier(0.22, 1, 0.36, 1)',
      )

      // 就绪解体：旋转 + 缩小地飞散，中心文案先淡出
      timers.push(
        window.setTimeout(() => {
          cells.forEach((cell, i) => {
            const spin = (Math.random() * 2 - 1) * SPIN_MAX
            animations.push(
              cell.animate(
                [
                  { transform: 'rotate(0deg) scale(1)', opacity: 1 },
                  { transform: `rotate(${spin}deg) scale(0.12)`, opacity: 0 },
                ],
                {
                  duration: PIXEL_MS,
                  delay: (offsets[i] ?? 0) * (REVEAL_MS - PIXEL_MS),
                  easing: 'cubic-bezier(0.55, 0, 0.55, 0.2)',
                  fill: 'both',
                },
              ),
            )
          })
          document
            .querySelector('.boot-pixel__center')
            ?.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: 300,
              easing: 'ease',
              fill: 'both',
            })
          timers.push(window.setTimeout(() => (visible.value = false), REVEAL_MS + 100))
        }, ASSEMBLE_MS + HOLD_MS),
      )
    })
  })
})
</script>

<style scoped>
.boot-pixel {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #0b0e17;
}

.boot-pixel__grid {
  position: absolute;
  inset: 0;
  display: grid;
  gap: 3px;
  padding: 3px;
}

.boot-pixel__cell {
  border-radius: 6px;
  will-change: transform, opacity;
}

/* 中心内容与 index.html 的 #boot 保持同一套视觉，接管时不跳变 */
.boot-pixel__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.boot-pixel__avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #a98cff, #6d4fe0 70%);
  animation: boot-pixel-pulse 1.6s ease-in-out infinite;
}

.boot-pixel__label {
  color: #b9aaff;
  font: 500 12px/16px ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  letter-spacing: 0.3em;
}

@keyframes boot-pixel-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(124 92 255 / 45%);
  }
  50% {
    box-shadow: 0 0 0 14px rgb(124 92 255 / 0%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .boot-pixel__avatar {
    animation: none;
  }
}
</style>
