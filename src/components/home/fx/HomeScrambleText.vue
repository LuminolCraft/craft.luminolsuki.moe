<!--
  HomeScrambleText — 字符解码入场文字
  思路取自 Vue Bits「DecryptedText」(https://vue-bits.dev/text-animations/decrypted-text)
  与「ScrambleText」(https://vue-bits.dev/text-animations/scramble-text)，
  按项目既有 GSAP 令牌改写为轻量实现（不额外引入打包器插件）。

  用途：Hero 的滚动提示、区块编号等小体量文字。
  兼容约定：只操作 textContent，颜色由 CSS 继承；reduce 时直接展示终态。
-->
<template>
  <span ref="rootRef" class="scramble-text">{{ current }}</span>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>*#@%$'

const props = withDefaults(
  defineProps<{
    text: string
    /** 单轮总时长（秒） */
    duration?: number
    /** 是否循环播放（用于滚动提示这类常驻元素） */
    loop?: boolean
    /** 循环间隔（秒） */
    interval?: number
    /** 循环之间是否保持终态文本 */
    holdText?: boolean
  }>(),
  {
    duration: 1.6,
    loop: false,
    interval: 4.5,
    holdText: true,
  },
)

const rootRef = ref<HTMLElement | null>(null)
const current = ref(props.text)

let rafId = 0
let loopTimer: ReturnType<typeof setTimeout> | null = null
let observer: IntersectionObserver | null = null

function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? 'X'
}

function play(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    current.value = props.text
    return
  }

  const target = props.text
  const totalFrames = Math.max(12, Math.round(props.duration * 60))
  let frame = 0

  const step = () => {
    frame += 1
    const progress = Math.min(1, frame / totalFrames)
    // 越接近终点，越多的字符已经锁定
    const locked = Math.floor(target.length * progress * 1.15)

    let out = ''
    for (let i = 0; i < target.length; i++) {
      const ch = target[i]!
      if (i < locked || ch === ' ') out += ch
      else out += randomGlyph()
    }
    current.value = out

    if (progress < 1) {
      rafId = requestAnimationFrame(step)
    } else {
      current.value = target
      if (props.loop) {
        loopTimer = setTimeout(() => play(), props.interval * 1000)
      }
    }
  }

  rafId = requestAnimationFrame(step)
}

onMounted(() => {
  const el = rootRef.value
  if (!el) return
  current.value = props.text

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        observer?.disconnect()
        observer = null
        play()
      }
    },
    { threshold: 0.4 },
  )
  observer.observe(el)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  rafId = 0
  if (loopTimer) clearTimeout(loopTimer)
  loopTimer = null
  observer?.disconnect()
  observer = null
})
</script>

<style scoped>
.scramble-text {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  white-space: pre;
}
</style>
