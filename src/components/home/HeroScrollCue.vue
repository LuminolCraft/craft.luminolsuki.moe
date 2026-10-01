<!--
  HomeScrollCue — 首屏滚动提示
  字符解码 + 纵向脉动，替代原来的静态「SCROLL ↓」文本。

  兼容约定：纯文本 + transform 动画，不涉及颜色与混合模式；reduce 时只显示静态箭头。
-->
<template>
  <div ref="rootRef" class="scroll-cue" aria-hidden="true">
    <span class="scroll-cue__text">
      <HomeScrambleText text="SCROLL" :duration="1.4" loop :interval="5" />
    </span>
    <span class="scroll-cue__arrow">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'
import HomeScrambleText from './fx/HomeScrambleText.vue'

const rootRef = ref<HTMLElement | null>(null)
let tween: gsap.core.Tween | null = null

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const arrow = rootRef.value?.querySelector('.scroll-cue__arrow')
  if (!arrow) return

  tween = gsap.to(arrow, {
    y: 7,
    duration: 1.4,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
  })
})

onUnmounted(() => {
  tween?.kill()
  tween = null
})
</script>

<style scoped>
.scroll-cue {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  color: rgb(255 255 255 / 0.72);
  text-shadow: 0 2px 10px rgb(0 0 0 / 35%);
}

.scroll-cue__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(255 255 255 / 0.8);
  will-change: transform;
}
</style>
