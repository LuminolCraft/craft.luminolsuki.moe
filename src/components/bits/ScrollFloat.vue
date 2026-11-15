<template>
  <!-- 滚动逐字浮现：字符从下方翻起并压扁回正，随滚动位置 scrub。
       原版 Tailwind 类改为 scoped 类，字号/字重由 props 控制，避免写死 clamp(…10rem)。 -->
  <component :is="as" ref="containerRef" class="scroll-float" :style="style" v-bind="$attrs">
    <span class="scroll-float__line">
      <span v-for="(char, index) in splitText" :key="index" class="scroll-float__char">
        {{ char }}
      </span>
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useSlots, watch } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

defineOptions({ inheritAttrs: false })

/**
 * ScrollFloat：标题随滚动逐字翻起。
 *
 * 依赖 gsap + ScrollTrigger（src/gsap/plugin-setup.ts 已全局注册，此处不重复注册）。
 * 组件销毁时主动 kill，避免路由切换后 ScrollTrigger 残留。
 */
const props = withDefaults(
  defineProps<{
    as?: string
    /** 字号（任意 CSS 长度）；不传则继承父级 */
    fontSize?: string
    fontWeight?: number | string
    /** 行高 */
    lineHeight?: number | string
    duration?: number
    ease?: string
    scrollStart?: string
    scrollEnd?: string
    stagger?: number
  }>(),
  {
    as: 'h2',
    fontSize: '',
    fontWeight: 800,
    lineHeight: 1.25,
    duration: 1,
    ease: 'back.inOut(2)',
    scrollStart: 'center bottom+=50%',
    scrollEnd: 'bottom bottom-=40%',
    stagger: 0.03,
  },
)

const slots = useSlots()
const containerRef = ref<HTMLElement | null>(null)

const text = computed(() => {
  const nodes = slots.default?.() ?? []
  return nodes.map((node) => (typeof node.children === 'string' ? node.children : '')).join('')
})

const splitText = computed(() => text.value.split('').map((c) => (c === ' ' ? '\u00A0' : c)))

const style = computed(() => ({
  ...(props.fontSize ? { fontSize: props.fontSize } : {}),
  fontWeight: String(props.fontWeight),
  lineHeight: String(props.lineHeight),
}))

let tween: gsap.core.Tween | null = null
let ctx: gsap.Context | null = null

function cleanup() {
  tween?.scrollTrigger?.kill()
  tween?.kill()
  tween = null
  ctx?.revert()
  ctx = null
}

async function createAnimation() {
  await nextTick()
  const el = containerRef.value
  if (!el) return
  const chars = el.querySelectorAll('.scroll-float__char')
  cleanup()
  ctx = gsap.context(() => {
    tween = gsap.fromTo(
      chars,
      {
        willChange: 'opacity, transform',
        opacity: 0,
        yPercent: 120,
        scaleY: 2.3,
        scaleX: 0.7,
        transformOrigin: '50% 0%',
      },
      {
        duration: props.duration,
        ease: props.ease,
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        scaleX: 1,
        stagger: props.stagger,
        scrollTrigger: {
          trigger: el,
          start: props.scrollStart,
          end: props.scrollEnd,
          scrub: true,
        },
      },
    )
  }, el)
  requestAnimationFrame(() => ScrollTrigger.refresh())
}

onMounted(createAnimation)

watch(
  () => [props.duration, props.ease, props.scrollStart, props.scrollEnd, props.stagger, text.value],
  createAnimation,
)

onUnmounted(cleanup)
</script>

<style scoped>
.scroll-float {
  margin: 0;
  overflow: hidden;
  color: inherit;
}

.scroll-float__line {
  /* inline-flex 让源码里的换行空白不参与排版（inline-block 之间会多出空格） */
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: inherit;
  text-align: inherit;
}

.scroll-float__char {
  display: inline-block;
  /* 逐字拆分后保留原有空格宽度 */
  white-space: pre;
  will-change: opacity, transform;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-float__char {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
