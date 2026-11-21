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
import ConnectFlowCanvas from '@/components/home/sections/ConnectFlowCanvas.vue'
import ShowcaseSection from '@/components/home/sections/ShowcaseSection.vue'
import GallerySection from '@/components/home/sections/GallerySection.vue'
import SvgContourSection from '@/components/home/sections/SvgContourSection.vue'
import SvgTimelineSection from '@/components/home/sections/SvgTimelineSection.vue'
import ChapterBridge from '@/components/home/sections/ChapterBridge.vue'
import CompareSection from '@/components/home/sections/CompareSection.vue'
import BansPublicSection from '@/components/home/sections/BansPublicSection.vue'
import TeamSection from '@/components/home/sections/TeamSection.vue'
import CtaSection from '@/components/home/sections/CtaSection.vue'
import ScrollExpand from '@/components/bits/ScrollExpand.vue'
import { shotAt } from '@/config/home-content'

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
    <!-- 看完在线状态，下一个问题就是「我怎么进」 -->
    <ConnectFlowCanvas />
    <ChapterBridge
      kicker="part two"
      motif="dots"
      text="地址拿到了，先说清楚规矩：进来之后什么会被处理，处理结果又怎么公示。"
    />
    <BansPublicSection />
    <ShowcaseSection />
    <GallerySection />
    <ChapterBridge
      kicker="part three"
      motif="contour"
      text="上面这些截图，都拍自同一张地图 —— 它三年没重置。"
    />
    <SvgContourSection />
    <SvgTimelineSection />
    <ChapterBridge
      kicker="part four"
      motif="wave"
      text="十四个月过去，两张图从同一台机器上分出来。差别不在硬件。"
    />
    <CompareSection />
    <ChapterBridge
      kicker="part five"
      motif="dots"
      text="图上每一处改动，都是人做的。"
    />
    <TeamSection />
    <section class="world-expand" aria-label="我们的世界">
      <ScrollExpand
        :src="shotAt(3)"
        alt="LuminolCraft 服务器世界全景"
        title="我们的世界"
        scroll-hint="继续滚动"
        :start-width="46"
        :start-height="56"
        :media-zoom="1.3"
        :scroll-distance="1.1"
        :hold-distance="0.3"
        :overlay-scrim="0.5"
        use-window-scroll
      >
        <p class="world-expand__line">这个世界，由每一位玩家共同建造。</p>
      </ScrollExpand>
    </section>
    <!-- 决策收尾：直接落到行动（规则目录交给 /rules 页，首页不放） -->
    <CtaSection />
  </div>
</template>

<style>
/* 首页样式：桌面与窄屏分别在两个共享样式文件里（与 News / Support 同一套约定）。
   每个选择器都挂在 .home-page 之下，保证不会外泄到其他页面。 */
@import '@/styles/desktop/home-styles.css';
@import '@/styles/desktop/home-sections.css';
@import '@/styles/mobile/home-mobile.css';
</style>
