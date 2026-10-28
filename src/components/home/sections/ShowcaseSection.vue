<!--
  ShowcaseSection —— 滚动展示区（四段）

  左侧四张文案卡 + 右侧叠图：整段被钉住，滚动进度驱动图片交叉淡入与缩放，
  同时把左侧文案的当前段点亮。

  历史：
  - 原名 DemoSection / .demo__*，类名已整体更名 showcase（用户要求，"demo" 语义不明）；
    数据源 config/home-content.ts 的 showcaseStages 同步更名。
  - 曾在叠图上叠 SplitFlapText 阶段番号（HUD 角标），用户实测观感不佳已移除；
    读屏的 sr-only「阶段 N」文本保留。
  - 叠图换成 ImageSkeleton：骨架占位 + 加载完成 blur 渐显。注意外层 gsap 的
    autoAlpha/scale 现在作用于 ImageSkeleton 的根元素（两层 opacity 相乘，视觉正确）。
-->
<script setup lang="ts">
import { computed, onMounted, ref, type ComponentPublicInstance } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import ImageSkeleton from '@/components/common/ImageSkeleton.vue'
import { useGsap } from '@/composables/useGsap'
import { showcaseStages } from '@/config/home-content'
import { DURATIONS } from '@/gsap/config/durations'
import { EASINGS } from '@/gsap/config/easings'

gsap.registerPlugin(ScrollTrigger)

const rootRef = ref<HTMLElement | null>(null)
const itemEls = ref<HTMLElement[]>([])
const layerEls = ref<HTMLElement[]>([])

const activeIdx = ref(0)

const activeStage = computed(() => showcaseStages[activeIdx.value] ?? showcaseStages[0])

const { create, reduceMotion } = useGsap({ scope: rootRef })

function setLayerRef(i: number, el: Element | ComponentPublicInstance | null): void {
  // ImageSkeleton 是组件：根元素经 $el 拿到；gsap 的交叉淡入作用于它
  const root =
    el instanceof HTMLElement ? el : ((el as ComponentPublicInstance | null)?.$el as HTMLElement | undefined) ?? null
  if (root) layerEls.value[i] = root
}

function setActive(index: number): void {
  activeIdx.value = index
  itemEls.value.forEach((el, i) => {
    if (!el) return
    gsap.to(el, {
      autoAlpha: i === index ? 1 : 0.22,
      duration: DURATIONS.standard,
      ease: EASINGS.hover,
      overwrite: 'auto',
    })
  })
}

onMounted(() => {
  create(() => {
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const layers = layerEls.value.filter(Boolean)
      layers.forEach((el, i) => {
        gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, scale: 1.04 })
      })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.value,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          onUpdate: (self) => {
            const idx = Math.min(3, Math.floor(self.progress * 4))
            if (idx !== activeIdx.value) setActive(idx)
          },
        },
      })

      layers.forEach((el, i) => {
        // 钉住时间线里 duration 只是「相对进度份额」，统一取 DURATIONS.slow 保持四段等分
        if (i > 0) tl.to(el, { autoAlpha: 1, duration: DURATIONS.slow, ease: EASINGS.parallax }, i)
        tl.fromTo(el, { scale: 1.06 }, { scale: 1, duration: DURATIONS.slow, ease: EASINGS.parallax }, i)
      })

      setActive(0)
    })

    mm.add('(prefers-reduced-motion: reduce)', () => {
      itemEls.value.forEach((el) => {
        if (el) gsap.set(el, { autoAlpha: 1 })
      })
      layerEls.value.forEach((el, i) => {
        if (el) gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, scale: 1 })
      })
    })
  })

  if (reduceMotion()) activeIdx.value = 0
})
</script>

<template>
  <section ref="rootRef" class="showcase">
    <div class="wrap">
      <div class="showcase__grid">
        <div class="showcase__left">
          <MagneticCornerFrame v-for="(stage, i) in showcaseStages" :key="stage.index">
            <div
              :ref="(el) => { if (el) itemEls[i] = el as HTMLElement }"
              class="showcase__item"
              :class="{ 'is-active': activeIdx === i }"
            >
              <div class="showcase__head">
                <span class="showcase__num">{{ stage.index }}</span>
                <span class="eyebrow">{{ stage.eyebrow }}</span>
              </div>
              <h3 class="showcase__title">{{ stage.title }}</h3>
              <p class="showcase__desc">{{ stage.desc }}</p>
            </div>
          </MagneticCornerFrame>
        </div>

        <div class="showcase__right">
          <MagneticCornerFrame>
            <div class="showcase__media">
              <ImageSkeleton
                v-for="(stage, i) in showcaseStages"
                :key="stage.index"
                :ref="(el) => setLayerRef(i, el)"
                class="showcase__media-img"
                :src="stage.image"
                alt=""
                aria-hidden="true"
                :eager="i === 0"
              />

              <span class="vercel-sr-only">
                阶段 {{ activeStage?.index }} · {{ activeStage?.title }}
              </span>
            </div>
          </MagneticCornerFrame>
        </div>
      </div>
    </div>
  </section>
</template>
