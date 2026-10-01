<!--
  HomeMagnetic — 磁吸包裹层
  移植自 Vue Bits「Magnet」(https://vue-bits.dev/components/magnet)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点：
  - 上游用 CSS transition 跟随，快速移动时会有拖尾；这里用 GSAP quickTo（power3.out）更跟手
  - 指针离开吸附范围时回落用更长的时长，手感更"弹"
  - coarse pointer / reduced-motion 下完全退化为普通包裹层
-->
<template>
  <div ref="rootRef" class="magnetic" :style="{ display: inlineBlock ? 'inline-block' : 'block' }">
    <div ref="innerRef" class="magnetic__inner">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'
import { EASINGS } from '@/gsap/config/easings'

const props = withDefaults(
  defineProps<{
    /** 吸附半径（px），指针进入该范围即开始吸 */
    padding?: number
    /** 强度：位移 = 距离 / strength */
    strength?: number
    /** 根节点是否 inline-block */
    inlineBlock?: boolean
  }>(),
  {
    padding: 90,
    strength: 4,
    inlineBlock: true,
  },
)

const rootRef = ref<HTMLElement | null>(null)
const innerRef = ref<HTMLElement | null>(null)

let setX: ((v: number) => void) | null = null
let setY: ((v: number) => void) | null = null
let active = false
let enabled = false

function onMove(e: MouseEvent): void {
  const root = rootRef.value
  if (!root || !enabled || !setX || !setY) return

  const { left, top, width, height } = root.getBoundingClientRect()
  const cx = left + width / 2
  const cy = top + height / 2
  const dx = Math.abs(cx - e.clientX)
  const dy = Math.abs(cy - e.clientY)
  const inside = dx < width / 2 + props.padding && dy < height / 2 + props.padding

  if (inside) {
    active = true
    setX((e.clientX - cx) / props.strength)
    setY((e.clientY - cy) / props.strength)
  } else if (active) {
    active = false
    setX(0)
    setY(0)
  }
}

onMounted(() => {
  if (window.matchMedia('(pointer: coarse)').matches) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const inner = innerRef.value
  if (!inner) return

  enabled = true
  setX = gsap.quickTo(inner, 'x', { duration: 0.45, ease: EASINGS.hover })
  setY = gsap.quickTo(inner, 'y', { duration: 0.45, ease: EASINGS.hover })
  window.addEventListener('mousemove', onMove, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMove)
  enabled = false
  setX = null
  setY = null
  gsap.killTweensOf(innerRef.value)
})
</script>

<style scoped>
.magnetic {
  position: relative;
}

.magnetic__inner {
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .magnetic__inner {
    will-change: auto;
    transform: none !important;
  }
}
</style>
