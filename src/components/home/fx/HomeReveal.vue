<!--
  HomeReveal — 滚动入场编排容器
  移植自 Vue Bits「AnimatedContent」(https://vue-bits.dev/animations/animated-content)
  原作者 David Haz · MIT + Commons Clause 许可，本文件为本地改写版

  相对上游的关键修正（上游存在会把全站 ScrollTrigger 一起 kill 的严重问题）：
  - 上游 watch/onUnmounted 里调用 ScrollTrigger.getAll().forEach(t => t.kill())，会连带杀掉
    导航栏、页脚、其他区块的 ScrollTrigger。这里改为只回收自己创建的 tween / ScrollTrigger。
  - 使用仓库既有 useGsap()（gsap.context + onUnmounted 自动 revert），与其他首页区块一致。
  - 尊重 prefers-reduced-motion：reduce 分支直接给出终态，不播放动画。
  - direction 扩展支持 up / down / left / right，便于各区块反向编排。
-->
<template>
  <div ref="rootRef" class="home-reveal">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGsap } from '@/composables/useGsap'
import { EASINGS } from '@/gsap/config/easings'
import { DURATIONS } from '@/gsap/config/durations'

// 微调点：distance 位移量、threshold 触发线（0.1 = 元素顶部进入视口 90% 处触发）、stagger 子项错峰
const props = withDefaults(
  defineProps<{
    /** 入场方向 */
    direction?: 'up' | 'down' | 'left' | 'right'
    /** 位移距离（px） */
    distance?: number
    /** 时长（秒） */
    duration?: number
    /** 延迟（秒） */
    delay?: number
    /** 缓动 */
    ease?: string
    /** 起始透明度 */
    fromOpacity?: number
    /** 起始缩放 */
    fromScale?: number
    /** 触发线，元素顶部到达视口该比例时开始 */
    threshold?: number
    /** 是否对内部直接子元素做错峰（0 = 整体入场） */
    stagger?: number
    /** ScrollTrigger 起点偏移，例如 '-=15%' 让入场更早 */
    startOffset?: string
  }>(),
  {
    direction: 'up',
    distance: 48,
    duration: DURATIONS.scrollReveal,
    delay: 0,
    ease: EASINGS.entrance,
    fromOpacity: 0,
    fromScale: 1,
    threshold: 0.1,
    stagger: 0,
    startOffset: '0%',
  },
)

const rootRef = ref<HTMLElement | null>(null)
const { create } = useGsap({ scope: rootRef })

function axisOffset(): { x: number; y: number } {
  switch (props.direction) {
    case 'down':
      return { x: 0, y: -props.distance }
    case 'left':
      return { x: props.distance, y: 0 }
    case 'right':
      return { x: -props.distance, y: 0 }
    default:
      return { x: 0, y: props.distance }
  }
}

onMounted(async () => {
  await nextTick()

  create((g) => {
    const root = rootRef.value
    if (!root) return

    const { x, y } = axisOffset()
    const startPct = Math.max(0, Math.min(100, (1 - props.threshold) * 100))

    // 无障碍：reduce 时直接落终态，不创建 ScrollTrigger
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      g.set(root, { autoAlpha: 1, x: 0, y: 0, scale: 1 })
      g.set(Array.from(root.children), { autoAlpha: 1, x: 0, y: 0, scale: 1 })
      return
    }

    const targets: gsap.TweenTarget =
      props.stagger > 0 && root.children.length > 1 ? Array.from(root.children) : root

    g.set(targets, { autoAlpha: props.fromOpacity, x, y, scale: props.fromScale })

    g.to(targets, {
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: props.duration,
      delay: props.delay,
      ease: props.ease,
      stagger: props.stagger,
      overwrite: 'auto',
      scrollTrigger: {
        trigger: root,
        start: `top ${startPct}%${props.startOffset === '0%' ? '' : ' ' + props.startOffset}`,
        toggleActions: 'play none none none',
        once: true,
      },
    })
  })

  // 首页首屏图片/字体就位后校正一次，避免 pin 距离算错
  requestAnimationFrame(() => ScrollTrigger.refresh())
})
</script>

<style scoped>
.home-reveal {
  /* GSAP 负责全部 transform / opacity */
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .home-reveal {
    will-change: auto;
  }
}
</style>
