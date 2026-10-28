<!--
  PixelTransition — 像素溶解切换（Team 头像）
  移植自 Vue Bits「PixelTransition」(https://vue-bits.dev/components/pixel-transition)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点：
  - 去 Tailwind：上游根节点是 `bg-[#222] text-white rounded-[15px] border-2 border-white w-[300px]`，
    在 56px 头像上会变成「300px 白边黑方块」，全部删掉，改 scoped CSS（56×56 + 2px 圆角）
  - **补间从 `display` 换成 `opacity`**：`display` 是离散属性，改 duration 只会把硬切推迟，
    根本不会有「溶解」。现在单格 0.06s，填充段 0.28s / 清除段 0.22s
    （并发 ≈ 0.06 / (0.28/36) ≈ 7，远低于同屏预算）
  - **根节点不要 tabindex**（上游硬编码 `:tabindex="0"`，会让每个头像变成无操作的可聚焦元素）；
    播放条件改成 `@mouseenter` + `@focusin`（焦点落在内部的链接/图片上也能触发）
  - 36 个格子**不挂常驻 `will-change`**：贴在 56px 头像上的 36 个合成层纯负收益
  - `buildGrid()` 重建后复位必须**同时带 `display: 'none'`**，否则重建瞬间 36 格是
    `block + opacity:1`，头像会先被一片纯色盖住再消失（首帧白闪）
  - 新增 `enabled` prop：RM / 粗指针 / 低端不需要这层装饰时不渲染网格
  - `pixelColor` 由调用点传 `var(--card-bg)`（DOM 赋值，`var()` 生效）
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, type CSSProperties } from 'vue'
import { gsap } from 'gsap'

interface PixelTransitionProps {
  gridSize?: number
  pixelColor?: string
  /** 填充段总时长（秒） */
  fillSpan?: number
  /** 清除段总时长（秒） */
  clearSpan?: number
  /** 单格补间时长（秒） */
  pixelDuration?: number
  once?: boolean
  /** false 时不渲染网格（RM / 粗指针 / 需要极简时） */
  enabled?: boolean
  borderRadius?: number
  className?: string
  style?: CSSProperties
  /** 上游用它做 padding-top 占位；不传就是正方形 */
  aspectRatio?: string
}

const props = withDefaults(defineProps<PixelTransitionProps>(), {
  gridSize: 6,
  pixelColor: 'var(--card-bg)',
  fillSpan: 0.28,
  clearSpan: 0.22,
  pixelDuration: 0.06,
  once: false,
  enabled: true,
  borderRadius: 2,
  className: '',
  style: () => ({}),
  aspectRatio: '100%',
})

const PIXEL_CLASS = 'pixel-transition__pixel'

const containerRef = ref<HTMLDivElement | null>(null)
const pixelGridRef = ref<HTMLDivElement | null>(null)
const activeRef = ref<HTMLDivElement | null>(null)
const delayedCallRef = ref<gsap.core.Tween | null>(null)

const isActive = ref(false)

const buildGrid = (): void => {
  const grid = pixelGridRef.value
  if (!grid) return

  grid.innerHTML = ''

  for (let row = 0; row < props.gridSize; row += 1) {
    for (let col = 0; col < props.gridSize; col += 1) {
      const pixel = document.createElement('div')
      pixel.classList.add(PIXEL_CLASS)
      pixel.style.backgroundColor = props.pixelColor
      pixel.style.display = 'none'
      pixel.style.opacity = '0'

      const size = 100 / props.gridSize
      pixel.style.width = `${size}%`
      pixel.style.height = `${size}%`
      pixel.style.left = `${col * size}%`
      pixel.style.top = `${row * size}%`

      grid.appendChild(pixel)
    }
  }

  // 重建后复位：只复位 opacity 不复位 display，会露出「一片纯色」
  gsap.set(grid.querySelectorAll<HTMLDivElement>(`.${PIXEL_CLASS}`), {
    opacity: 1,
    display: 'none',
  })
}

const animatePixels = (activate: boolean): void => {
  isActive.value = activate

  const grid = pixelGridRef.value
  const activeEl = activeRef.value
  if (!grid || !activeEl) return

  const pixels = grid.querySelectorAll<HTMLDivElement>(`.${PIXEL_CLASS}`)
  if (!pixels.length) return

  gsap.killTweensOf(pixels)
  delayedCallRef.value?.kill()

  const total = pixels.length
  const fill = Math.max(0.08, props.fillSpan)
  const clear = Math.max(0.08, props.clearSpan)
  const fillEach = fill / total
  const clearEach = clear / total

  gsap.set(pixels, { display: 'block', opacity: 0 })
  gsap.to(pixels, {
    opacity: 1,
    duration: props.pixelDuration,
    stagger: { each: fillEach, from: 'random' },
  })

  // 换层时间点与上游一致（整段填充结束时）
  delayedCallRef.value = gsap.delayedCall(fill, () => {
    activeEl.style.display = activate ? 'block' : 'none'
    activeEl.style.pointerEvents = activate ? 'none' : ''
  })

  gsap.to(pixels, {
    opacity: 0,
    duration: props.pixelDuration,
    delay: fill,
    stagger: { each: clearEach, from: 'random' },
    onComplete: () => {
      gsap.set(pixels, { display: 'none' })
    },
  })
}

const handleEnter = (): void => {
  if (!props.enabled) return
  if (!isActive.value) animatePixels(true)
}

const handleLeave = (): void => {
  if (!props.enabled) return
  if (isActive.value && !props.once) animatePixels(false)
}

function handleFocusIn(): void {
  handleEnter()
}

function handleFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null
  if (next && containerRef.value?.contains(next)) return
  handleLeave()
}

onMounted(() => {
  buildGrid()
})

onUnmounted(() => {
  delayedCallRef.value?.kill()
  const grid = pixelGridRef.value
  if (grid) gsap.killTweensOf(grid.querySelectorAll<HTMLDivElement>(`.${PIXEL_CLASS}`))
})

watch(
  () => [props.gridSize, props.pixelColor],
  () => {
    buildGrid()
  },
)
</script>

<template>
  <div
    ref="containerRef"
    class="pixel-transition"
    :class="props.className"
    :style="{ borderRadius: `${props.borderRadius}px`, ...props.style }"
    @mouseenter="handleEnter"
    @mouseleave="handleLeave"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
  >
    <div :style="{ paddingTop: props.aspectRatio }" aria-hidden="true" />

    <div class="pixel-transition__layer" aria-hidden="true">
      <slot name="first" />
    </div>

    <div
      ref="activeRef"
      class="pixel-transition__layer pixel-transition__layer--active"
      :style="{ display: 'none' }"
      aria-hidden="true"
    >
      <slot name="second" />
    </div>

    <div
      v-if="props.enabled"
      ref="pixelGridRef"
      class="pixel-transition__grid"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
/* 尺寸交给调用方（Team 是 56px / 窄屏 48px）：这里只定形态，避免和
   `.home-page .team-row__avatar` 的 width/height 打特异性官司 */
.pixel-transition {
  position: relative;
  display: block;
  overflow: hidden;
  max-width: 100%;
  background: transparent;
}

.pixel-transition__layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.pixel-transition__layer :deep(img),
.pixel-transition__layer :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pixel-transition__layer--active {
  z-index: 2;
}

.pixel-transition__grid {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.pixel-transition__grid :deep(.pixel-transition__pixel) {
  position: absolute;
}
</style>
