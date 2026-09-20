<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <!-- 1A 生日祝福：客户端判定（浏览器本地日期 + MM-DD 比对），命中当天弹一次 -->
  <Teleport to="body">
    <div
      v-if="visible"
      ref="rootRef"
      class="bday-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="t('birthday.title')"
    >
      <div class="bday-backdrop" aria-hidden="true"></div>

      <div class="bday-confetti" aria-hidden="true">
        <span
          v-for="i in CONFETTI_COUNT"
          :key="i"
          class="bday-confetti-piece"
          :class="{ 'is-narrow': i % 2 === 0 }"
        ></span>
      </div>

      <div class="bday-card">
        <div class="bday-candle" aria-hidden="true">
          <span class="bday-flame"></span>
        </div>

        <h2 class="bday-title">
          <span v-for="(char, i) in titleChars" :key="i" class="bday-char">{{ char }}</span>
        </h2>

        <p class="bday-text">{{ t('birthday.body', { name: displayName }) }}</p>

        <button ref="closeRef" type="button" class="bday-close" @click="close">
          {{ t('birthday.close') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { DURATIONS, EASINGS, STAGGERS } from '@/gsap'
import { useGsap } from '@/composables/useGsap'
import { birthdayGreetingKey, isBirthdayToday, localYear } from '@/lib/birthday'
import { useAuthStore } from '@/stores/auth'

/** 彩带片数：偶数片窄条、奇数片方块（纯装饰，aria-hidden） */
const CONFETTI_COUNT = 32

const auth = useAuthStore()
const route = useRoute()
const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const closeRef = ref<HTMLButtonElement | null>(null)
const visible = ref(false)
const { create } = useGsap({ scope: rootRef })

/** 标题逐字拆分：Array.from 按码点切，中文/emoji 都不会拆坏 */
const titleChars = computed(() => Array.from(t('birthday.title')))

const displayName = computed(() => auth.me?.username ?? '')

/**
 * 是否命中「今天生日」：
 * - 未登录 / 未填生日 / 认证页（hideChrome：登录、注册等）不弹；
 * - 比较只取 MM-DD 且按**浏览器本地日期**（`isBirthdayToday` 内部只用字符串比较，
 *   绝不把生日解析成时间点）。
 */
const eligible = computed(() => {
  const me = auth.me
  if (!me?.id || !me.birthday) return false
  if (route.meta.hideChrome === true) return false
  return isBirthdayToday(me.birthday, new Date())
})

/**
 * 首次展示时就把「今年已弹过」写进 localStorage（按用户 + 本地年份隔离）：
 * 刷新 / 重新进入不再弹；storage 不可用（隐私模式）时仍然展示，只是无法去重。
 */
function maybeShow() {
  if (visible.value) return
  const me = auth.me
  if (!me?.id) return
  const key = birthdayGreetingKey(me.id, localYear())
  try {
    if (localStorage.getItem(key) === '1') return
    localStorage.setItem(key, '1')
  } catch {
    /* 忽略：仅失去去重能力 */
  }
  visible.value = true
  void nextTick(() => {
    playIntro()
    closeRef.value?.focus()
  })
}

// me 就绪 / 路由离开认证页 / 跨天重新进入：任一时刻变为命中即弹（跨标签页同步同样是 me 变化）
watch(
  eligible,
  (ok) => {
    if (ok) maybeShow()
  },
  { immediate: true },
)

let mm: ReturnType<typeof gsap.matchMedia> | null = null

/**
 * 入场动效（transform / opacity 为主，避免布局抖动）：
 * 背景淡入 → 卡片回弹 → 标题逐字 → 彩带随机飞散 → 烛火常亮呼吸。
 * `gsap.matchMedia` 同时处理 prefers-reduced-motion（静态卡片）与窄屏位移量。
 */
function playIntro() {
  const root = rootRef.value
  if (!root) return
  mm?.kill()
  mm = gsap.matchMedia()
  create((g) => {
    mm?.add(
      {
        reduce: '(prefers-reduced-motion: reduce)',
        narrow: '(max-width: 640px)',
      },
      (self) => {
        const conditions = self.conditions as { reduce: boolean; narrow: boolean }
        // 减少动效：保留卡片与文案，不加任何补间
        if (conditions.reduce) return
        const lift = conditions.narrow ? 24 : 44

        const tl = g.timeline({
          defaults: { duration: DURATIONS.entrance, ease: EASINGS.entrance },
        })

        tl.addLabel('backdrop')
          .from('.bday-backdrop', { autoAlpha: 0, duration: DURATIONS.standard }, 'backdrop')
          .from(
            '.bday-card',
            {
              autoAlpha: 0,
              y: lift,
              scale: 0.94,
              duration: DURATIONS.slow,
              ease: EASINGS.bounce,
            },
            'backdrop+=0.1',
          )
          .from(
            '.bday-char',
            {
              autoAlpha: 0,
              y: 16,
              rotate: 6,
              duration: DURATIONS.standard,
              stagger: STAGGERS.characters,
            },
            'backdrop+=0.3',
          )
          .from(
            '.bday-text',
            { autoAlpha: 0, y: 12, duration: DURATIONS.standard },
            'backdrop+=0.42',
          )
          .from('.bday-close', { autoAlpha: 0, y: 10, duration: DURATIONS.fast }, 'backdrop+=0.5')
          .from(
            '.bday-confetti-piece',
            {
              autoAlpha: 0,
              y: -40,
              scale: 0.6,
              duration: DURATIONS.slow,
              ease: EASINGS.snappy,
              stagger: { each: 0.015, from: 'random' },
            },
            'backdrop+=0.15',
          )
          .to(
            '.bday-confetti-piece',
            {
              y: () => g.utils.random(-30, 120),
              x: () => g.utils.random(-60, 60),
              rotate: () => g.utils.random(-220, 220),
              autoAlpha: 0,
              duration: DURATIONS.slow * 1.6,
              ease: 'power1.in',
              stagger: { each: 0.02, from: 'random' },
            },
            'backdrop+=0.5',
          )
          // 烛火呼吸：常驻环境动效，靠 useGsap 的 ctx.revert 在卸载/关闭时清理
          .to(
            '.bday-flame',
            {
              scaleY: 1.18,
              scaleX: 0.94,
              opacity: 0.86,
              duration: 0.7,
              ease: EASINGS.smooth,
              repeat: -1,
              yoyo: true,
            },
            'backdrop+=0.4',
          )
      },
    )
  })
}

/** 关掉祝福：停掉环境动效（烛火 yoyo）并复位，避免后台常驻补间 */
function close() {
  mm?.kill()
  mm = null
  visible.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(visible, (open) => {
  if (open) {
    window.addEventListener('keydown', onKeydown)
    // 模态期间锁滚动，避免焦点可及内容在遮罩下方继续滚动
    document.body.style.overflow = 'hidden'
  } else {
    window.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
  mm?.kill()
  mm = null
})
</script>

<style scoped>
.bday-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.bday-backdrop {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--background-color, #000) 62%, transparent);
  backdrop-filter: blur(6px);
}

.bday-confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.bday-confetti-piece {
  position: absolute;
  top: 12%;
  left: 50%;
  width: 10px;
  height: 10px;
  margin-left: calc(var(--bday-spread, 0) * 1px);
  border-radius: 2px;
  background: var(--primary-color);
  opacity: 0.9;
}

.bday-confetti-piece.is-narrow {
  width: 5px;
  height: 14px;
}

/* 32 片沿水平方向铺开（用 nth-child 铺开位置，动画只改 transform/opacity） */
.bday-confetti-piece:nth-child(8n + 1) {
  --bday-spread: -320;
}
.bday-confetti-piece:nth-child(8n + 2) {
  --bday-spread: -240;
  background: var(--accent-color, #f59e0b);
}
.bday-confetti-piece:nth-child(8n + 3) {
  --bday-spread: -160;
}
.bday-confetti-piece:nth-child(8n + 4) {
  --bday-spread: -80;
  background: var(--accent-color, #f59e0b);
}
.bday-confetti-piece:nth-child(8n + 5) {
  --bday-spread: 80;
}
.bday-confetti-piece:nth-child(8n + 6) {
  --bday-spread: 160;
  background: var(--accent-color, #f59e0b);
}
.bday-confetti-piece:nth-child(8n + 7) {
  --bday-spread: 240;
}
.bday-confetti-piece:nth-child(8n + 8) {
  --bday-spread: 320;
  background: var(--accent-color, #f59e0b);
}
.bday-confetti-piece:nth-child(n + 17) {
  top: 22%;
  opacity: 0.7;
}

.bday-card {
  position: relative;
  width: 100%;
  max-width: 26rem;
  padding: 2.4rem 1.8rem 1.9rem;
  border: 1px solid color-mix(in srgb, var(--primary-color) 26%, var(--border-color));
  border-radius: 14px;
  background: var(--background-color);
  box-shadow: 0 24px 60px -24px color-mix(in srgb, var(--primary-color) 45%, transparent);
  text-align: center;
}

.bday-candle {
  width: 10px;
  height: 46px;
  margin: -3.4rem auto 0.8rem;
  border-radius: 4px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--primary-color) 85%, #fff) 0%,
    var(--primary-color) 100%
  );
  transform-origin: 50% 100%;
}

.bday-flame {
  display: block;
  width: 14px;
  height: 20px;
  margin: -14px auto 0;
  border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
  background: radial-gradient(
    circle at 50% 68%,
    #fff8d6 0%,
    var(--accent-color, #f59e0b) 55%,
    transparent 72%
  );
  transform-origin: 50% 100%;
}

.bday-title {
  margin: 0 0 0.75rem;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  letter-spacing: -1px;
  color: var(--text-color);
}

.bday-char {
  display: inline-block;
  will-change: transform, opacity;
}

.bday-text {
  margin: 0 0 1.4rem;
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--text-secondary);
}

.bday-close {
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 999px;
  background: var(--primary-color);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: translate 0.15s ease;
}

.bday-close:hover {
  translate: 0 -1px;
}

.bday-close:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 3px;
}

@media (max-width: 640px) {
  .bday-card {
    padding: 2.2rem 1.25rem 1.6rem;
  }

  .bday-confetti-piece {
    transform: scale(0.85);
  }
}
</style>
