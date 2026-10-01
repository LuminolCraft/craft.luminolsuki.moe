<!--
  HomeCountUp — 数字翻牌计数（进入视口触发）
  移植自 Vue Bits「CountUp」(https://vue-bits.dev/components/count-up)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点：
  - 上游用自定义弹簧积分，这里改用仓库既有的 GSAP 令牌（DURATIONS / EASINGS）统一节奏
  - 尊重 prefers-reduced-motion：reduce 时直接落终值
  - 只操作 textContent，不产生额外布局跳动（父级需自行固定最小宽度或用 tabular-nums）
-->
<template>
  <span ref="rootRef" class="count-up">{{ display }}</span>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'
import { DURATIONS } from '@/gsap/config/durations'
import { EASINGS } from '@/gsap/config/easings'

const props = withDefaults(
  defineProps<{
    to: number
    from?: number
    duration?: number
    /** 千分位分隔符，留空则不分组 */
    separator?: string
    /** 补齐小数位 */
    decimals?: number
    prefix?: string
    suffix?: string
  }>(),
  {
    from: 0,
    duration: DURATIONS.slow,
    separator: '',
    decimals: 0,
    prefix: '',
    suffix: '',
  },
)

const rootRef = ref<HTMLElement | null>(null)
const display = ref('')

let tween: gsap.core.Tween | null = null
let observer: IntersectionObserver | null = null

function format(value: number): string {
  const fixed = Number(value.toFixed(props.decimals))
  let text = props.decimals > 0 ? fixed.toFixed(props.decimals) : String(Math.round(fixed))
  if (props.separator) {
    const [intPart = '', decPart] = text.split('.')
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, props.separator)
    text = decPart ? `${grouped}.${decPart}` : grouped
  }
  return `${props.prefix}${text}${props.suffix}`
}

function run(): void {
  const counter = { value: props.from }
  display.value = format(props.from)

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    display.value = format(props.to)
    return
  }

  tween = gsap.to(counter, {
    value: props.to,
    duration: props.duration,
    ease: EASINGS.entrance,
    onUpdate: () => {
      display.value = format(counter.value)
    },
  })
}

onMounted(() => {
  const el = rootRef.value
  if (!el) return

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        observer?.disconnect()
        observer = null
        run()
      }
    },
    { threshold: 0.2 },
  )
  observer.observe(el)
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
  tween?.kill()
  tween = null
})
</script>

<style scoped>
.count-up {
  font-variant-numeric: tabular-nums;
}
</style>
