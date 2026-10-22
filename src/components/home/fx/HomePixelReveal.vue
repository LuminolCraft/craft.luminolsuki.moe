<!--
  HomePixelReveal — 像素溶解装饰层（通用包装器）
  效果移植自 Vue Bits「PixelTransition」(https://vue-bits.dev/animations/pixel-transition)
  原作者 David Haz · MIT + Commons Clause 许可

  与原版的差异：
  - 原版是 hover 时「A 内容 ↔ B 内容」的像素切换；这里只保留像素层本身，
    作为任意内容的 hover 溶解层，内容始终可见（随时可以整组件换掉换成别的效果）
  - 像素色走 CSS 变量，不用 mix-blend-mode，不写颜色 transition（R1/R3/R6 约定）
  - 粗指针 / reduced-motion 不启用：格子层不渲染、不绑定事件

  用法：<HomePixelReveal :cols="10" :rows="8" radius="22px"><任意内容/></HomePixelReveal>
-->
<template>
  <div ref="rootRef" class="px-reveal" :style="{ borderRadius: radius }" @mouseenter="play">
    <div v-if="enabled" ref="gridRef" class="px-reveal__grid" aria-hidden="true">
      <span v-for="i in cellCount" :key="i" class="px-reveal__cell" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import gsap from 'gsap'
import { shouldUsePointerFx } from './home-fx-env'

// 微调点：FILL_SPAN / CLEAR_SPAN 铺满与溶解两个阶段的总跨度（秒）·
// CELL_IN / CELL_OUT 单格缩放时长（秒）· HOLD 铺满后的停留（秒）
const FILL_SPAN = 0.45
const CLEAR_SPAN = 0.4
const CELL_IN = 0.16
const CELL_OUT = 0.22
const HOLD = 0.1

const props = withDefaults(
  defineProps<{
    /** 网格列数 */
    cols?: number
    /** 网格行数 */
    rows?: number
    /** 像素颜色（任意 CSS 颜色值，默认跟主题主色走） */
    color?: string
    /** 裁切圆角：要与被包裹内容的圆角一致，像素层才不会露出方角 */
    radius?: string
  }>(),
  {
    cols: 10,
    rows: 8,
    color: 'var(--primary-color)',
    radius: '0px',
  },
)

const rootRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)
/** shouldUsePointerFx 只能在客户端跑，挂载后才置真，SSR 渲染不出格子层 */
const enabled = ref(false)

const cellCount = computed(() => props.cols * props.rows)

/** 播放中忽略重复触发，让上一轮完整走完 */
let playing = false

function play(): void {
  if (!enabled.value || playing) return
  const grid = gridRef.value
  if (!grid) return
  const cells = grid.children
  const count = cells.length
  if (count === 0) return
  playing = true
  gsap
    .timeline({ onComplete: () => (playing = false) })
    .fromTo(
      cells,
      { opacity: 0, scale: 0.4 },
      {
        opacity: 1,
        scale: 1,
        duration: CELL_IN,
        ease: 'power2.out',
        stagger: { each: FILL_SPAN / count, from: 'random' },
      },
    )
    .to(
      cells,
      {
        opacity: 0,
        scale: 0.85,
        duration: CELL_OUT,
        ease: 'power2.in',
        stagger: { each: CLEAR_SPAN / count, from: 'random' },
      },
      FILL_SPAN + CELL_IN + HOLD,
    )
}

defineExpose({ play })

onMounted(() => {
  enabled.value = shouldUsePointerFx()
})
</script>

<style scoped>
.px-reveal {
  position: relative;
}

/* 像素层盖在内容上（含卡片的 tilt/涟漪），pointer-events 放行所有交互 */
.px-reveal__grid {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(v-bind(cols), 1fr);
  grid-template-rows: repeat(v-bind(rows), 1fr);
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.px-reveal__cell {
  opacity: 0;
  background: v-bind(color);
  will-change: opacity, transform;
}
</style>
