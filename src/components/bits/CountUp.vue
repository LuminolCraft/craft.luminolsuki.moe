<!--
  CountUp — 数字滚动（状态带在线人数）
  移植自 Vue Bits「CountUp」(https://vue-bits.dev/components/count-up)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点：
  - 模板本身没有原子类，只需保留 `className` 透传签名
  - 时长由调用点传 `DURATIONS.slow`（gsap/config 的令牌），组件内不写死
  - reduced-motion 下直接落最终值，不做弹簧动画
  - 只写 textContent、不加 aria-live：外层由业务侧用独立的 sr-only 区域播报，
    否则每帧改写 textContent 会让读屏连续念数字
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { prefersReducedMotion } from '@/components/home/fx/home-fx-env'
import { DURATIONS } from '@/gsap/config/durations'

interface Props {
  to: number
  from?: number
  direction?: 'up' | 'down'
  delay?: number
  duration?: number
  className?: string
  startWhen?: boolean
  separator?: string
  onStart?: () => void
  onEnd?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  from: 0,
  direction: 'up',
  delay: 0,
  duration: DURATIONS.slow,
  className: '',
  startWhen: true,
  separator: '',
})

const elementRef = useTemplateRef<HTMLSpanElement>('elementRef')
const currentValue = ref(props.direction === 'down' ? props.to : props.from)
const isInView = ref(false)
const animationId = ref<number | null>(null)
const hasStarted = ref(false)

let intersectionObserver: IntersectionObserver | null = null

const damping = computed(() => 20 + 40 * (1 / props.duration))
const stiffness = computed(() => 100 * (1 / props.duration))

let velocity = 0

const formatNumber = (value: number): string => {
  const options = {
    useGrouping: Boolean(props.separator),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }

  const formattedNumber = Intl.NumberFormat('en-US', options).format(Number(value.toFixed(0)))

  return props.separator ? formattedNumber.replace(/,/g, props.separator) : formattedNumber
}

const updateDisplay = (): void => {
  if (elementRef.value) {
    elementRef.value.textContent = formatNumber(currentValue.value)
  }
}

const springAnimation = (timestamp: number): void => {
  void timestamp

  const target = props.direction === 'down' ? props.from : props.to
  const current = currentValue.value

  const displacement = target - current
  const springForce = displacement * stiffness.value
  const dampingForce = velocity * damping.value
  const acceleration = springForce - dampingForce

  velocity += acceleration * 0.016 // 按 60fps 定步长
  currentValue.value += velocity * 0.016

  updateDisplay()

  if (Math.abs(displacement) > 0.01 || Math.abs(velocity) > 0.01) {
    animationId.value = requestAnimationFrame(springAnimation)
  } else {
    currentValue.value = target
    updateDisplay()
    animationId.value = null
    props.onEnd?.()
  }
}

const startAnimation = (): void => {
  if (hasStarted.value || !isInView.value || !props.startWhen) return

  hasStarted.value = true
  props.onStart?.()

  // reduced-motion：跳过弹簧，直接落到最终值
  if (prefersReducedMotion()) {
    currentValue.value = props.direction === 'down' ? props.from : props.to
    updateDisplay()
    props.onEnd?.()
    return
  }

  window.setTimeout(() => {
    velocity = 0
    animationId.value = requestAnimationFrame(springAnimation)
  }, props.delay * 1000)
}

const setupIntersectionObserver = (): void => {
  if (!elementRef.value) return

  if (typeof IntersectionObserver === 'undefined') {
    isInView.value = true
    startAnimation()
    return
  }

  intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting && !isInView.value) {
        isInView.value = true
        startAnimation()
      }
    },
    { threshold: 0, rootMargin: '0px' },
  )

  intersectionObserver.observe(elementRef.value)
}

const cleanup = (): void => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
    animationId.value = null
  }

  if (intersectionObserver) {
    intersectionObserver.disconnect()
    intersectionObserver = null
  }
}

watch(
  [() => props.from, () => props.to, () => props.direction],
  () => {
    currentValue.value = props.direction === 'down' ? props.to : props.from
    updateDisplay()
    hasStarted.value = false
  },
  { immediate: true },
)

watch(
  () => props.startWhen,
  () => {
    if (props.startWhen && isInView.value && !hasStarted.value) {
      startAnimation()
    }
  },
)

onMounted(() => {
  updateDisplay()
  setupIntersectionObserver()
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <span ref="elementRef" :class="className" />
</template>
