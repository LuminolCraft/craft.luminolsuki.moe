<!-- src/views/Home.vue -->
<!--
  首页外壳。

  样式：src/styles/desktop/home-styles.css 与 src/styles/mobile/home-mobile.css，
        每个选择器都挂在 .home-page 之下（与 News / Support 同一套约定）。
  动效：跨区块的进入动画在 composables/useHomeAnimations.ts，
        区块自己的动画（Hero 轮播、状态计数、演示区滚动故事、截图带）在各自组件里。
  内容：文案与素材在 config/home-content.ts，团队成员在 config/team-members.ts。
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHomeReveal } from '@/composables/useHomeAnimations'
import HeroSection from '@/components/home/sections/HeroSection.vue'
import StatusSection from '@/components/home/sections/StatusSection.vue'
import DemoSection from '@/components/home/sections/DemoSection.vue'
import GallerySection from '@/components/home/sections/GallerySection.vue'
import CompareSection from '@/components/home/sections/CompareSection.vue'
import TeamSection from '@/components/home/sections/TeamSection.vue'
import CtaSection from '@/components/home/sections/CtaSection.vue'

const pageEl = ref<HTMLElement | null>(null)

const { start } = useHomeReveal(pageEl)

onMounted(() => {
  // 子组件此时都已挂载，[data-reveal] / [data-compare-img] 能一次扫全
  start()
})
</script>

<template>
  <div ref="pageEl" class="home-page">
    <HeroSection />
    <StatusSection />
    <DemoSection />
    <GallerySection />
    <CompareSection />
    <TeamSection />
    <CtaSection />
  </div>
</template>

<style>
/* 首页样式：桌面与窄屏分别在两个共享样式文件里（与 News / Support 同一套约定）。
   每个选择器都挂在 .home-page 之下，保证不会外泄到其他页面。 */
@import '@/styles/desktop/home-styles.css';
@import '@/styles/mobile/home-mobile.css';
</style>
