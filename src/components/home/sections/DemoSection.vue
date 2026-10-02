<!--
  DemoSection —— 滚动演示区（四段）

  左侧四张文案卡 + 右侧叠图：整段被钉住，滚动进度驱动图片交叉淡入与缩放，
  同时把左侧文案的当前段点亮。
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import { useGsap } from '@/composables/useGsap'
import { demoStages } from '@/config/home-content'

gsap.registerPlugin(ScrollTrigger)

const rootRef = ref<HTMLElement | null>(null)
const itemEls = ref<HTMLElement[]>([])
const imgEls = ref<HTMLElement[]>([])

const activeDemo = ref(0)

const { create, reduceMotion } = useGsap({ scope: rootRef })

function setActive(index: number): void {
  activeDemo.value = index
  itemEls.value.forEach((el, i) => {
    if (!el) return
    gsap.to(el, {
      autoAlpha: i === index ? 1 : 0.22,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  })
}

onMounted(() => {
  create(() => {
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const imgs = imgEls.value.filter(Boolean)
      imgs.forEach((el, i) => {
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
            if (idx !== activeDemo.value) setActive(idx)
          },
        },
      })

      imgs.forEach((el, i) => {
        if (i > 0) tl.to(el, { autoAlpha: 1, duration: 0.9, ease: 'none' }, i)
        tl.fromTo(el, { scale: 1.06 }, { scale: 1, duration: 1, ease: 'none' }, i)
      })

      setActive(0)
    })

    mm.add('(prefers-reduced-motion: reduce)', () => {
      itemEls.value.forEach((el) => {
        if (el) gsap.set(el, { autoAlpha: 1 })
      })
      imgEls.value.forEach((el, i) => {
        if (el) gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, scale: 1 })
      })
    })
  })

  if (reduceMotion()) activeDemo.value = 0
})
</script>

<template>
  <section ref="rootRef" class="demo">
    <div class="wrap">
      <div class="demo__grid">
        <div class="demo__left">
          <MagneticCornerFrame v-for="(stage, i) in demoStages" :key="stage.index">
            <div
              :ref="(el) => { if (el) itemEls[i] = el as HTMLElement }"
              class="demo__item"
              :class="{ 'is-active': activeDemo === i }"
            >
              <div class="demo__head">
                <span class="demo__num">{{ stage.index }}</span>
                <span class="eyebrow">{{ stage.eyebrow }}</span>
              </div>
              <h3 class="demo__title">{{ stage.title }}</h3>
              <p class="demo__desc">{{ stage.desc }}</p>
            </div>
          </MagneticCornerFrame>
        </div>

        <div class="demo__right">
          <MagneticCornerFrame>
            <div class="demo__media">
              <img
                v-for="(stage, i) in demoStages"
                :key="stage.index"
                :ref="(el) => { if (el) imgEls[i] = el as HTMLElement }"
                class="demo__media-img"
                :src="stage.image"
                alt=""
                aria-hidden="true"
                width="1600"
                height="900"
                loading="lazy"
              />
            </div>
          </MagneticCornerFrame>
        </div>
      </div>
    </div>
  </section>
</template>
