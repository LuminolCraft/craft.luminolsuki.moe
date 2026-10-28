<!--
  StatusSection —— 实时状态带

  在线人数与运行状态来自 mcstatus.io（见 composables/useServerStatus.ts）。
  在线人数用 Bits 的 CountUp 做计数（进入视口时播放，数值变化时按 key 重播）。

  无障碍：外层**不能**带 aria-live —— CountUp 每帧改写 textContent，
  读屏会把「1…2…3…」连播成噪音。改为一个独立的 sr-only 区域，
  只在数值真正变化时播报一句完整的话。
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import CountUp from '@/components/bits/CountUp.vue'
import { useGsap } from '@/composables/useGsap'
import { useServerStatus } from '@/composables/useServerStatus'
import { DURATIONS } from '@/gsap/config/durations'
import { EASINGS } from '@/gsap/config/easings'

gsap.registerPlugin(ScrollTrigger)

const rootRef = ref<HTMLElement | null>(null)
const fadeEls = ref<HTMLElement[]>([])

const { online, playersOnline, playersMax, playersLabel, statusLabel, start: startPoll } =
  useServerStatus()

/** 与 composable 内部的 hasPlayers 同口径：三个值都到齐才算有数 */
const hasPlayers = computed(
  () => playersOnline.value !== null && playersMax.value !== null && online.value,
)

/** 供读屏播报的一句话（只在数据变化时更新，不跟 CountUp 的帧） */
const srStatus = ref('')
watch(
  [playersOnline, online],
  ([current, isOnline]) => {
    if (!isOnline) {
      srStatus.value = '服务器当前离线'
      return
    }
    srStatus.value =
      typeof current === 'number' ? `当前在线 ${current} 人，服务器运行中` : '服务器运行中，在线人数暂不可用'
  },
  { immediate: true },
)

const { create } = useGsap({ scope: rootRef })

onMounted(() => {
  create(() => {
    const fades = fadeEls.value.filter(Boolean)
    if (fades.length) {
      gsap.from(fades, {
        autoAlpha: 0,
        duration: DURATIONS.pageIn,
        ease: EASINGS.entrance,
        stagger: 0.06,
        scrollTrigger: { trigger: rootRef.value, start: 'top 80%', once: true },
      })
    }
  })

  startPoll()
})

onUnmounted(() => {
  // 卸载时把播报区清空，避免读屏残留上一页的状态
  srStatus.value = ''
})
</script>

<template>
  <section ref="rootRef" class="status">
    <div class="wrap">
      <div class="status__grid">
        <MagneticCornerFrame>
          <div class="status__cell">
            <div class="status__value">
              <!-- 计数与 /max 必须在同一个 .status__num 里：
                   外层是 flex + gap，拆成两个 span 会被 10px 间隙撑开 -->
              <span v-if="hasPlayers" class="status__num">
                <CountUp
                  :key="playersOnline ?? 0"
                  :to="playersOnline ?? 0"
                  separator=""
                  :duration="DURATIONS.slow"
                />/{{ playersMax }}
              </span>
              <span v-else class="status__num">{{ playersLabel }}</span>
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

    <!-- 读屏播报区：与视觉上的计数完全解耦 -->
    <p class="vercel-sr-only" aria-live="polite" aria-atomic="true">{{ srStatus }}</p>
  </section>
</template>
