<!--
  HeroSection —— 首页头图区

  包含：背景截图轮播（MorphSlider，GPU 位移变形切换）、标题逐字入场（等 LCP）、
        副标题与按钮入场、「服务器地址」按钮的复制逻辑。

  历史：曾接入 WebThreads 汇聚丝线，因实际观感是「十几条亮线横扫画面、穿过标题」
  已整体移除（连同其静态兜底的紫色光斑 —— 移动端那片大紫渐变就是它）。

  动效分层：h1 逐字最前，副标题紧随，按钮最后；时长/缓动取自 src/gsap/config 令牌。
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import SplitText from '@/components/bits/SplitText.vue'
import MorphSlider from '@/components/bits/MorphSlider.vue'
import SlingButton from '@/components/bits/SlingButton.vue'
import { useBitsTokens } from '@/bits/bits-tokens'
import { useLcpDone } from '@/bits/bits-motion'
import { useGsap } from '@/composables/useGsap'
import { QQ_GROUP, SERVER_ADDRESS, SHOTS, shotAt } from '@/config/home-content'
import { DURATIONS } from '@/gsap/config/durations'
import { EASINGS } from '@/gsap/config/easings'

const HERO_TITLE = '与朋友一起，建造属于我们的世界'

const tokens = useBitsTokens()

/** SlingButton 发射 → 打开 QQ 群（弹一下或直接点按都会触发 send） */
function openQqGroup(): void {
  window.open(QQ_GROUP, '_blank', 'noopener')
}

const rootRef = ref<HTMLElement | null>(null)
const ruleEl = ref<HTMLElement | null>(null)
const subEl = ref<HTMLElement | null>(null)
const actionsEl = ref<HTMLElement | null>(null)

/** 只门控画布淡入，不门控 h1（h1 是纯文本，藏起来只会白等） */
const lcpDone = useLcpDone()

/** MorphSlider 是全站唯一的 WebGL context：等 LCP 落地后再从不透明起，
    避免这块满屏 canvas 自己成为 LCP；首帧前露出容器底色而非深灰 clear color */
const morphStyle = computed(() => ({
  opacity: lcpDone.value ? 1 : 0,
  transition: `opacity ${DURATIONS.slow}s ${EASINGS.smooth}`,
}))

/** 轮播只用 6 张：每张都是 1920×1080 的 GPU 纹理，22 张全上 ≈ 170MB 显存 */
const MORPH_ITEMS = [0, 4, 8, 12, 16, 20]
  .filter(i => i < SHOTS.length)
  .map(i => ({ image: shotAt(i) }))

let entrancePlayed = false

const { create } = useGsap({ scope: rootRef })

/**
 * 入场时序：h1 的逐字动画由 SplitText 组件自己负责（它也等 LCP），
 * 这里只排分隔线 / 副标题 / 按钮，避免「副标题先于标题出现」挤在一起。
 */
function runEntrance(): void {
  if (entrancePlayed) return
  entrancePlayed = true

  create(() => {
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (ruleEl.value) {
        gsap.from(ruleEl.value, {
          scaleX: 0,
          autoAlpha: 0,
          transformOrigin: '50% 50%',
          duration: DURATIONS.entrance,
          ease: EASINGS.entrance,
          delay: DURATIONS.focus,
        })
      }
      if (subEl.value) {
        gsap.from(subEl.value, {
          y: 16,
          autoAlpha: 0,
          duration: DURATIONS.entrance,
          ease: EASINGS.entrance,
          delay: DURATIONS.focus,
        })
      }
      const actions = actionsEl.value
      if (actions) {
        gsap.from(Array.from(actions.children), {
          y: 16,
          autoAlpha: 0,
          duration: DURATIONS.entrance,
          ease: EASINGS.entrance,
          delay: DURATIONS.pageOut,
          stagger: DURATIONS.wordStagger,
        })
      }
    })
  })
}

/* ---------- 复制服务器地址 ---------- */

const copied = ref(false)
let copyTimer: number | null = null

async function copyAddress(): Promise<void> {
  try {
    await navigator.clipboard.writeText(SERVER_ADDRESS)
  } catch {
    // 剪贴板 API 不可用（非安全上下文 / 权限被拒）时的兜底
    const helper = document.createElement('textarea')
    helper.value = SERVER_ADDRESS
    helper.setAttribute('readonly', '')
    helper.style.position = 'fixed'
    helper.style.top = '-1000px'
    helper.style.opacity = '0'
    document.body.appendChild(helper)
    helper.select()
    try {
      document.execCommand('copy')
    } catch {
      /* 复制失败也不打断交互 */
    }
    document.body.removeChild(helper)
  }
  copied.value = true
  if (copyTimer) window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copied.value = false
  }, 2000)
}

onMounted(() => {
  // 入场不等 LCP：h1 首帧就可见，等 LCP 只会让副标题/按钮无谓地晚到
  runEntrance()
})

onUnmounted(() => {
  if (copyTimer) window.clearTimeout(copyTimer)
  copyTimer = null
})
</script>

<template>
  <section ref="rootRef" class="hero">
    <div class="hero__bg" aria-hidden="true">
      <div class="hero__morph" :style="morphStyle">
        <MorphSlider
          :items="MORPH_ITEMS"
          transition="melt"
          :duration="1.2"
          :intensity="0.5"
          :scale="2.2"
          :aberration="0.3"
          :drift="0.35"
          autoplay
          :autoplay-delay="6"
          :radius="0"
          overlay-color="#000000"
          decorative
          :pause-on-hover="false"
        />
      </div>
    </div>
    <div class="hero__scrim" aria-hidden="true" />

    <div class="hero__inner">
      <MagneticCornerFrame>
        <div class="hero__content">
          <p class="eyebrow">MINECRAFT 公益服务器</p>
          <!-- h1 首帧就不透明：逐字只用 transform（y 上推），**不用** opacity / filter。
               实测 LCP 元素就是 h1，一旦用 opacity 0 起手它就不算 LCP 候选，
               会把 LCP 推后整个入场时长。 -->
          <SplitText
            tag="h1"
            class="hero__title"
            :text="HERO_TITLE"
            :from="{ y: 24 }"
            :to="{ y: 0 }"
            :delay="DURATIONS.charStagger * 1000"
            :duration="DURATIONS.entrance"
            :ease="EASINGS.entrance"
            stagger-from="start"
          />
          <div ref="ruleEl" class="hero__rule" aria-hidden="true" />
          <p ref="subEl" class="hero__sub">
            Java 版 · 无需正版账号 · 管理长期活跃，随时可以进来一起玩。
          </p>
          <div ref="actionsEl" class="hero__actions">
            <!-- 加入交流群：SlingButton 弹弓按钮，点按或拖拽发射都打开群链接 -->
            <SlingButton
              shape="pill"
              :size="52"
              aria-label="加入交流群"
              :pad-color="tokens.primary"
              icon-color="#ffffff"
              accent-color="#e9dcff"
              band-color="rgba(0,0,0,0.22)"
              @send="openQqGroup"
            >
              加入交流群
            </SlingButton>
            <MagneticCornerFrame class="mcf-inline" :padding="6" :arm-length="14">
              <button class="btn btn--ghost" type="button" @click="copyAddress">
                {{ copied ? '已复制' : '服务器地址' }}
              </button>
            </MagneticCornerFrame>
          </div>
        </div>
      </MagneticCornerFrame>
    </div>
  </section>
</template>
