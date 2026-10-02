<!--
  HeroSection —— 首页头图区

  包含：背景截图轮播（两张叠图交叉淡入）、标题拆字入场、副标题与按钮入场、
        「服务器地址」按钮的复制逻辑。
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, type ComponentPublicInstance } from 'vue'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import { useGsap } from '@/composables/useGsap'
import { QQ_GROUP, SERVER_ADDRESS, SHOTS, shotAt } from '@/config/home-content'

gsap.registerPlugin(SplitText)

const rootRef = ref<HTMLElement | null>(null)
const titleEl = ref<HTMLElement | null>(null)
const subEl = ref<HTMLElement | null>(null)
const actionsEl = ref<HTMLElement | null>(null)

const heroImages = ref<string[]>([shotAt(0), shotAt(1)])
const layerEls: Array<HTMLElement | null> = [null, null]
const preloaded = new Set<string>()

let front = 0
let currentIndex = 0
let timer: number | null = null

const { create, reduceMotion } = useGsap({ scope: rootRef })

function assignLayer(i: number, el: Element | ComponentPublicInstance | null): void {
  layerEls[i] = (el as HTMLElement | null) ?? null
}

function preload(src: string): void {
  if (preloaded.has(src)) return
  preloaded.add(src)
  const img = new Image()
  img.src = src
}

function pickNextIndex(current: number): number {
  if (SHOTS.length <= 1) return current
  let next = current
  while (next === current) next = Math.floor(Math.random() * SHOTS.length)
  return next
}

function startRotation(): void {
  if (reduceMotion()) return
  preload(shotAt(0))
  preload(shotAt(1))

  timer = window.setInterval(() => {
    const next = pickNextIndex(currentIndex)
    currentIndex = next
    preload(shotAt(next))

    const back = 1 - front
    const frontEl = layerEls[front]
    const backEl = layerEls[back]

    heroImages.value[back] = shotAt(next)

    window.requestAnimationFrame(() => {
      if (backEl) gsap.to(backEl, { autoAlpha: 1, duration: 2, ease: 'power2.inOut' })
      if (frontEl) gsap.to(frontEl, { autoAlpha: 0, duration: 2, ease: 'power2.inOut' })
      front = back
    })
  }, 3600)
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
  const layers = layerEls.filter((el): el is HTMLElement => el !== null)
  if (layers.length) {
    gsap.set(layers[1] ?? layers[0]!, { autoAlpha: 0 })
    gsap.set(layers[0]!, { autoAlpha: 1 })
  }

  create(() => {
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      let split: SplitText | null = null
      if (titleEl.value) {
        split = new SplitText(titleEl.value, { type: 'chars' })
        gsap.from(split.chars, {
          y: 24,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.03,
        })
      }
      gsap.from([subEl.value, actionsEl.value].filter(Boolean), {
        y: 16,
        autoAlpha: 0,
        duration: 0.6,
        ease: 'power3.out',
        delay: 0.15,
        stagger: 0.15,
      })

      return () => split?.revert()
    })
  })

  startRotation()
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
  timer = null
  if (copyTimer) window.clearTimeout(copyTimer)
  copyTimer = null
})
</script>

<template>
  <section ref="rootRef" class="hero">
    <div class="hero__bg" aria-hidden="true">
      <img
        v-for="(src, i) in heroImages"
        :key="i"
        :ref="(el) => assignLayer(i, el)"
        class="hero__img"
        :src="src"
        alt=""
        width="1920"
        height="1080"
        decoding="async"
      />
    </div>
    <div class="hero__scrim" aria-hidden="true" />

    <div class="hero__inner">
      <MagneticCornerFrame>
        <div class="hero__content">
          <p class="eyebrow">MINECRAFT 公益服务器</p>
          <h1 ref="titleEl" class="hero__title">与朋友一起，建造属于我们的世界</h1>
          <div class="hero__rule" aria-hidden="true" />
          <p ref="subEl" class="hero__sub">
            Java 版 · 无需正版账号 · 管理长期活跃，随时可以进来一起玩。
          </p>
          <div ref="actionsEl" class="hero__actions">
            <MagneticCornerFrame class="mcf-inline" :padding="6" :arm-length="14">
              <a class="btn btn--primary" :href="QQ_GROUP" target="_blank" rel="noopener">
                加入交流群
              </a>
            </MagneticCornerFrame>
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
