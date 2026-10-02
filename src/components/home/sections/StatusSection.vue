<!--
  StatusSection —— 实时状态带

  在线人数与运行状态来自 mcstatus.io（见 composables/useServerStatus.ts），
  进入视口时做一次计数动画；数据晚到则等数据到了再补跑，不重播。
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import { useGsap } from '@/composables/useGsap'
import { useServerStatus } from '@/composables/useServerStatus'

gsap.registerPlugin(ScrollTrigger)

const rootRef = ref<HTMLElement | null>(null)
const playerNumEl = ref<HTMLElement | null>(null)
const fadeEls = ref<HTMLElement[]>([])

const { online, playersOnline, playersMax, playersLabel, statusLabel, start: startPoll } =
  useServerStatus()

const { create, reduceMotion } = useGsap({ scope: rootRef })

let played = false

/** 计数动画：数据没到不动画，数据到了从 0 计到真实值，之后只写文案 */
function runCounter(target: number, max: number): void {
  if (!playerNumEl.value) return
  if (reduceMotion()) {
    playerNumEl.value.textContent = `${target}/${max}`
    return
  }
  const counter = { v: 0 }
  gsap.to(counter, {
    v: target,
    duration: 1.1,
    ease: 'power2.out',
    onUpdate: () => {
      if (playerNumEl.value) playerNumEl.value.textContent = `${Math.round(counter.v)}/${max}`
    },
    onComplete: () => {
      if (playerNumEl.value) playerNumEl.value.textContent = `${target}/${max}`
    },
  })
}

function setFadeText(): void {
  if (playerNumEl.value) playerNumEl.value.textContent = playersLabel.value
}

const stopWatch = watch([playersOnline, playersMax], ([value, max]) => {
  if (value === null || max === null) return
  if (!played) {
    played = true
    runCounter(value, max)
    return
  }
  setFadeText()
})

onMounted(() => {
  create(() => {
    const fades = fadeEls.value.filter(Boolean)
    if (fades.length) {
      gsap.from(fades, {
        autoAlpha: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.06,
        scrollTrigger: { trigger: rootRef.value, start: 'top 80%', once: true },
      })
    }
  })

  startPoll()
})

onUnmounted(() => {
  stopWatch()
  setFadeText()
})
</script>

<template>
  <section ref="rootRef" class="status" aria-live="polite">
    <div class="wrap">
      <div class="status__grid">
        <MagneticCornerFrame>
          <div class="status__cell">
            <div class="status__value">
              <span ref="playerNumEl" class="status__num">{{ playersLabel }}</span>
            </div>
            <div class="status__label">在线玩家</div>
          </div>
        </MagneticCornerFrame>

        <MagneticCornerFrame>
          <div class="status__cell">
            <div class="status__value">
              <span class="status__num">26.2</span>
            </div>
            <div class="status__label">纯净生存服务器版本</div>
          </div>
        </MagneticCornerFrame>

        <MagneticCornerFrame>
          <div class="status__cell">
            <div class="status__value">
              <span class="status__num">1.21.7/8</span>
            </div>
            <div class="status__label">综合生存服务器版本</div>
          </div>
        </MagneticCornerFrame>

        <MagneticCornerFrame>
          <div class="status__cell">
            <div class="status__value">
              <span class="status__dot" :class="{ 'is-offline': !online }" aria-hidden="true" />
              <span
                :ref="(el) => { if (el) fadeEls.push(el as HTMLElement) }"
                class="status__num"
              >{{ statusLabel }}</span>
            </div>
            <div class="status__label">运行状态</div>
          </div>
        </MagneticCornerFrame>
      </div>
    </div>
  </section>
</template>
