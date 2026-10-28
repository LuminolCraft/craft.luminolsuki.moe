<!--
  BorderGlow — 跟随边缘的描边辉光卡片（Compare 双栏）
  移植自 Vue Bits「BorderGlow」(https://vue-bits.dev/components/border-glow)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点：
  - 去 Tailwind：`relative grid isolate` / `-z-[1] absolute inset-0 rounded-[inherit]` 等
    全部翻成 scoped CSS；`border border-white/15` **删掉**（会和 MagneticCornerFrame 的直角变成双边框）
  - `glowColor` 是 **HSL 三元组字符串**（`"H S L"`，源码 parseHSL），传 hex 会 fallback 成黄绿色 `40 80 80`
  - 光只在 `hover` / `focus-within` 出现：并列结构里常驻色彩差会被读成「右栏推荐」
    （这两栏是两个并列的服务器选项，不是主次）
  - 焦点进入时把 edgeProximity 拉满（键盘用户没有 pointermove，否则永远是 0 → 完全不发光）
  - 底色由调用点传主题变量，不写死 `#060010`
-->
<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'

interface BorderGlowProps {
  className?: string
  edgeSensitivity?: number
  /** HSL 三元组，例如 '260 60 65'（不是 hex！） */
  glowColor?: string
  backgroundColor?: string
  borderRadius?: number
  glowRadius?: number
  glowIntensity?: number
  coneSpread?: number
  animated?: boolean
  colors?: string[]
  fillOpacity?: number
}

function parseHSL(hslStr: string): { h: number; s: number; l: number } {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/)
  if (!match) return { h: 40, s: 80, l: 80 }
  return { h: parseFloat(match[1] ?? '40'), s: parseFloat(match[2] ?? '80'), l: parseFloat(match[3] ?? '80') }
}

function buildBoxShadow(glowColor: string, intensity: number): string {
  const { h, s, l } = parseHSL(glowColor)
  const base = `${h}deg ${s}% ${l}%`
  const layers: [number, number, number, number, number, boolean][] = [
    [0, 0, 0, 1, 100, true],
    [0, 0, 1, 0, 60, true],
    [0, 0, 3, 0, 50, true],
    [0, 0, 6, 0, 40, true],
    [0, 0, 15, 0, 30, true],
    [0, 0, 25, 2, 20, true],
    [0, 0, 50, 2, 10, true],
    [0, 0, 1, 0, 60, false],
    [0, 0, 3, 0, 50, false],
    [0, 0, 6, 0, 40, false],
    [0, 0, 15, 0, 30, false],
    [0, 0, 25, 2, 20, false],
    [0, 0, 50, 2, 10, false],
  ]
  return layers
    .map(([x, y, blur, spread, alpha, inset]) => {
      const a = Math.min(alpha * intensity, 100)
      return `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px hsl(${base} / ${a}%)`
    })
    .join(', ')
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3)
}
function easeInCubic(x: number): number {
  return x * x * x
}

interface AnimateOpts {
  start?: number
  end?: number
  duration?: number
  delay?: number
  ease?: (t: number) => number
  onUpdate: (v: number) => void
  onEnd?: () => void
}

function animateValue({
  start = 0,
  end = 100,
  duration = 1000,
  delay = 0,
  ease = easeOutCubic,
  onUpdate,
  onEnd,
}: AnimateOpts): void {
  const t0 = performance.now() + delay
  function tick(): void {
    const elapsed = performance.now() - t0
    const t = Math.min(elapsed / duration, 1)
    onUpdate(start + (end - start) * ease(t))
    if (t < 1) requestAnimationFrame(tick)
    else onEnd?.()
  }
  setTimeout(() => requestAnimationFrame(tick), delay)
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%']
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1]

function buildMeshGradients(colors: string[]): string[] {
  const gradients: string[] = []
  for (let i = 0; i < 7; i += 1) {
    const c = colors[Math.min(COLOR_MAP[i] ?? 0, colors.length - 1)] ?? colors[0] ?? '#a78bfa'
    gradients.push(`radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`)
  }
  gradients.push(`linear-gradient(${colors[0] ?? '#a78bfa'} 0 100%)`)
  return gradients
}

const props = withDefaults(defineProps<BorderGlowProps>(), {
  className: '',
  edgeSensitivity: 30,
  glowColor: '0 0 55',
  backgroundColor: 'var(--card-bg)',
  borderRadius: 16,
  glowRadius: 40,
  glowIntensity: 1.0,
  coneSpread: 25,
  animated: false,
  colors: () => ['#c084fc', '#f472b6', '#38bdf8'],
  fillOpacity: 0.5,
})

const cardRef = useTemplateRef<HTMLDivElement>('cardRef')
const isHovered = ref(false)
const cursorAngle = ref(45)
const edgeProximity = ref(0)
const sweepActive = ref(false)

const getCenterOfElement = (el: HTMLElement): [number, number] => {
  const { width, height } = el.getBoundingClientRect()
  return [width / 2, height / 2]
}

const getEdgeProximity = (el: HTMLElement, x: number, y: number): number => {
  const [cx, cy] = getCenterOfElement(el)
  const dx = x - cx
  const dy = y - cy
  let kx = Infinity
  let ky = Infinity
  if (dx !== 0) kx = cx / Math.abs(dx)
  if (dy !== 0) ky = cy / Math.abs(dy)
  return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1)
}

const getCursorAngle = (el: HTMLElement, x: number, y: number): number => {
  const [cx, cy] = getCenterOfElement(el)
  const dx = x - cx
  const dy = y - cy
  if (dx === 0 && dy === 0) return 0
  const radians = Math.atan2(dy, dx)
  let degrees = radians * (180 / Math.PI) + 90
  if (degrees < 0) degrees += 360
  return degrees
}

const handlePointerMove = (e: PointerEvent): void => {
  const card = cardRef.value
  if (!card) return
  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  edgeProximity.value = getEdgeProximity(card, x, y)
  cursorAngle.value = getCursorAngle(card, x, y)
}

/** 键盘用户没有 pointermove：焦点进入直接把辉光拉满，否则永远不发光 */
function handleFocusIn(): void {
  isHovered.value = true
  if (edgeProximity.value === 0) edgeProximity.value = 1
}

function handleFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null
  if (next && cardRef.value?.contains(next)) return
  isHovered.value = false
  edgeProximity.value = 0
}

function handlePointerEnter(): void {
  isHovered.value = true
}

function handlePointerLeave(): void {
  isHovered.value = false
  edgeProximity.value = 0
}

watch(
  () => props.animated,
  () => {
    if (!props.animated) return
    const angleStart = 110
    const angleEnd = 465
    sweepActive.value = true
    cursorAngle.value = angleStart

    animateValue({ duration: 500, onUpdate: (v) => (edgeProximity.value = v / 100) })
    animateValue({
      ease: easeInCubic,
      duration: 1500,
      end: 50,
      onUpdate: (v) => {
        cursorAngle.value = (angleEnd - angleStart) * (v / 100) + angleStart
      },
    })
    animateValue({
      ease: easeOutCubic,
      delay: 1500,
      duration: 2250,
      start: 50,
      end: 100,
      onUpdate: (v) => {
        cursorAngle.value = (angleEnd - angleStart) * (v / 100) + angleStart
      },
    })
    animateValue({
      ease: easeInCubic,
      delay: 2500,
      duration: 1500,
      start: 100,
      end: 0,
      onUpdate: (v) => (edgeProximity.value = v / 100),
      onEnd: () => (sweepActive.value = false),
    })
  },
  { deep: true, immediate: true },
)

const colorSensitivity = computed(() => props.edgeSensitivity + 20)
const isVisible = computed(() => isHovered.value || sweepActive.value)

/**
 * `edgeSensitivity <= 0` 时视为「hover 整卡即亮」：上游只在指针贴近边缘时才亮，
 * 而鼠标停在卡片中央是常见行为 —— 那时不亮会被当成「没有效果」。
 * 用一个下限 0.8 的 proximity 兜底，指针继续移动时仍按真实距离微调方向/强度。
 */
const effectiveProximity = computed(() => {
  if (props.edgeSensitivity > 0 || !isVisible.value) return edgeProximity.value
  return Math.max(edgeProximity.value, 0.8)
})
const borderOpacity = computed(() =>
  isVisible.value
    ? Math.max(
        0,
        (effectiveProximity.value * 100 - colorSensitivity.value) /
          (100 - colorSensitivity.value),
      )
    : 0,
)
const glowOpacity = computed(() =>
  isVisible.value
    ? Math.max(
        0,
        (effectiveProximity.value * 100 - props.edgeSensitivity) /
          (100 - props.edgeSensitivity || 1),
      )
    : 0,
)

const meshGradients = computed(() => buildMeshGradients(props.colors))
const borderBg = computed(() => meshGradients.value.map((g) => `${g} border-box`))
const fillBg = computed(() => meshGradients.value.map((g) => `${g} padding-box`))
const angleDeg = computed(() => `${cursorAngle.value.toFixed(3)}deg`)
const ringMask = computed(
  () =>
    `conic-gradient(from ${angleDeg.value} at center, black ${props.coneSpread}%, transparent ${
      props.coneSpread + 15
    }%, transparent ${100 - props.coneSpread - 15}%, black ${100 - props.coneSpread}%)`,
)
const fillMask = computed(() =>
  [
    'linear-gradient(to bottom, black, black)',
    'radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)',
    'radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)',
    'radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)',
    'radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)',
    'radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)',
    `conic-gradient(from ${angleDeg.value} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
  ].join(', '),
)
</script>

<template>
  <div
    ref="cardRef"
    class="border-glow"
    :class="props.className"
    :style="{
      background: props.backgroundColor,
      borderRadius: props.borderRadius + 'px',
    }"
    @pointermove="handlePointerMove"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
  >
    <!-- 网格渐变描边 -->
    <div
      class="border-glow__ring"
      :style="{
        background: [
          `linear-gradient(${props.backgroundColor} 0 100%) padding-box`,
          'linear-gradient(rgb(255 255 255 / 0%) 0% 100%) border-box',
          ...borderBg,
        ].join(', '),
        opacity: borderOpacity,
        maskImage: ringMask,
        WebkitMaskImage: ringMask,
        transition: isVisible ? 'opacity 0.25s ease-out' : 'opacity 0.75s ease-in-out',
      }"
    />

    <!-- 网格渐变填充（soft-light 叠在底色上） -->
    <div
      class="border-glow__fill"
      :style="{
        background: fillBg.join(', '),
        maskImage: fillMask,
        WebkitMaskImage: fillMask,
        maskComposite: 'subtract, add, add, add, add, add',
        WebkitMaskComposite: 'source-out, source-over, source-over, source-over, source-over, source-over',
        opacity: borderOpacity * props.fillOpacity,
        transition: isVisible ? 'opacity 0.25s ease-out' : 'opacity 0.75s ease-in-out',
      }"
    />

    <!-- 外发光 -->
    <span
      class="border-glow__halo"
      :style="{
        inset: `-${props.glowRadius}px`,
        maskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
        WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
        opacity: glowOpacity,
        transition: isVisible ? 'opacity 0.25s ease-out' : 'opacity 0.75s ease-in-out',
      }"
    >
      <span
        class="border-glow__halo-inner"
        :style="{
          inset: `${props.glowRadius}px`,
          boxShadow: buildBoxShadow(props.glowColor, props.glowIntensity),
        }"
      />
    </span>

    <div class="border-glow__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.border-glow {
  position: relative;
  display: grid;
  isolation: isolate;
  /* 自己的层，避免 halo 跑到后面元素下面 */
  transform: translate3d(0, 0, 0.01px);
  box-shadow:
    rgba(0, 0, 0, 0.06) 0 1px 2px,
    rgba(0, 0, 0, 0.05) 0 4px 8px,
    rgba(0, 0, 0, 0.04) 0 12px 24px;
}

.border-glow__ring,
.border-glow__fill {
  position: absolute;
  inset: 0;
  z-index: -1;
  border: 1px solid transparent;
  border-radius: inherit;
  pointer-events: none;
}

.border-glow__fill {
  mix-blend-mode: soft-light;
}

.border-glow__halo {
  position: absolute;
  z-index: 1;
  border-radius: inherit;
  pointer-events: none;
  mix-blend-mode: plus-lighter;
}

.border-glow__halo-inner {
  position: absolute;
  border-radius: inherit;
}

.border-glow__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
}
</style>
