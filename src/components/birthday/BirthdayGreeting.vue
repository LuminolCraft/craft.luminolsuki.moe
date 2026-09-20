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
      <!-- 场景一：夜色（星云、月、星野、浮尘、暗角） -->
      <div class="bday-sky" aria-hidden="true">
        <span class="bday-nebula bday-nebula--one"></span>
        <span class="bday-nebula bday-nebula--two"></span>
        <span class="bday-moon"></span>
        <span class="bday-aurora"></span>
        <span v-for="i in STAR_COUNT" :key="i" class="bday-star" :style="starStyle(i)"></span>
        <span
          v-for="i in MOTE_COUNT"
          :key="`mote-${i}`"
          class="bday-mote"
          :style="moteStyle(i)"
        ></span>
        <span class="bday-vignette"></span>
      </div>

      <!-- 场景二：蛋糕 + 祝福文案 + 交互 -->
      <div class="bday-scene">
        <BirthdayCake ref="cakeRef" :candle-count="CANDLE_COUNT" @all-blown="onAllBlown" />

        <div class="bday-copy">
          <h2 class="bday-title">
            <span v-for="(char, i) in titleChars" :key="i" class="bday-char">{{ char }}</span>
          </h2>
          <p class="bday-sub">{{ t('birthday.body', { name: displayName }) }}</p>
          <p v-if="daysTogether > 0" class="bday-days">
            {{ t('birthday.days', { days: daysTogether }) }}
          </p>
          <p class="bday-wish">{{ t('birthday.wish') }}</p>
        </div>

        <div class="bday-actions">
          <button v-if="!blown" ref="blowRef" type="button" class="bday-btn" @click="blowCandles">
            {{ t('birthday.blow') }}
          </button>
          <button v-else ref="closeRef" type="button" class="bday-btn bday-close" @click="close">
            {{ t('birthday.close') }}
          </button>
          <p class="bday-hint">{{ blown ? t('birthday.wishHint') : t('birthday.blowHint') }}</p>
        </div>
      </div>

      <!-- 场景三：心愿星（彩带由 canvas-confetti 自己的画布绘制，见 lib/confetti.ts） -->
      <span class="bday-wish-star" aria-hidden="true"></span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import BirthdayCake from './BirthdayCake.vue'
import { DURATIONS, EASINGS, STAGGERS } from '@/gsap'
import { useGsap } from '@/composables/useGsap'
import { birthdayGreetingKey, isBirthdayToday, localYear } from '@/lib/birthday'
import { celebrateBirthday, resetCelebration } from '@/lib/confetti'
import { useAuthStore } from '@/stores/auth'

/** 星野星点数与浮尘数（装饰层，纯 transform/opacity 动效） */
const STAR_COUNT = 52
const MOTE_COUNT = 16
/** 蜡烛根数：固定 3 根，不暴露年龄 */
const CANDLE_COUNT = 3
/**
 * 自动吹灭延迟（毫秒）：入场编排结束后留一段许愿时间。
 * 烛火不接受单根点击（移动端触摸目标太小、误触多），到点自动逐根熄灭；
 * 「吹蜡烛」按钮仍可提前吹灭。
 */
const AUTO_BLOW_DELAY_MS = 4600

const auth = useAuthStore()
const route = useRoute()
const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const cakeRef = ref<InstanceType<typeof BirthdayCake> | null>(null)
const blowRef = ref<HTMLButtonElement | null>(null)
const closeRef = ref<HTMLButtonElement | null>(null)
const visible = ref(false)
const blown = ref(false)
const { create, reduceMotion } = useGsap({ scope: rootRef })

/**
 * 确定性伪随机（同一 index 恒得同一值）：星点分布与彩带起点不随重渲染跳动，
 * 同一场祝福每次长得一致——「随机感」交给 GSAP 的 `from: 'random'` 错峰。 */
function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function starStyle(index: number) {
  const size = 1 + seeded(index, 3) * 2.2
  return {
    left: `${(seeded(index, 1) * 100).toFixed(2)}%`,
    top: `${(seeded(index, 2) * 72).toFixed(2)}%`,
    width: `${size.toFixed(2)}px`,
    height: `${size.toFixed(2)}px`,
  }
}

/** 浮尘：靠近烛光的暖色微粒，位置/尺寸由确定性伪随机铺开 */
function moteStyle(index: number) {
  const size = 1.5 + seeded(index, 8) * 2.5
  return {
    left: `${(seeded(index, 6) * 96).toFixed(2)}%`,
    top: `${(28 + seeded(index, 7) * 62).toFixed(2)}%`,
    width: `${size.toFixed(2)}px`,
    height: `${size.toFixed(2)}px`,
    animationDelay: `-${(seeded(index, 9) * 9).toFixed(2)}s`,
  }
}
/** 标题逐字拆分：Array.from 按码点切，中文/emoji 都不会拆坏 */
const titleChars = computed(() => Array.from(t('birthday.title')))

const displayName = computed(() => auth.me?.username ?? '')

/** 一起走过多少天（注册日算第 1 天）；时间戳缺失或异常时返回 0，该行不显示 */
const daysTogether = computed(() => {
  const registeredAt = auth.me?.createdAt
  if (!registeredAt || registeredAt <= 0) return 0
  const start = new Date(registeredAt)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const days = Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1
  return days > 0 ? days : 0
})

/**
 * 预览 / 重放：URL 带 `?birthday=1`（也接受 `preview` / `true`）时强制展示一次，
 * 忽略「今天是否生日」与「今年已弹过」两个判定，并**不写**去重 key——供自测与验收。
 */
const previewMode = computed(() => {
  const raw = route.query.birthday
  const value = Array.isArray(raw) ? raw[0] : raw
  return value === '1' || value === 'preview' || value === 'true'
})

/**
 * 是否命中「今天生日」：
 * - 未登录 / 未填生日 / 认证页（hideChrome：登录、注册等）不弹；
 * - 比较只取 MM-DD 且按**浏览器本地日期**（`isBirthdayToday` 内部只用字符串比较，
 *   绝不把生日解析成时间点）；
 * - 预览模式（`?birthday=1`）只看登录态，日期与去重都不拦。
 */
const eligible = computed(() => {
  const me = auth.me
  if (!me?.id) return false
  if (route.meta.hideChrome === true) return false
  if (previewMode.value) return true
  if (!me.birthday) return false
  return isBirthdayToday(me.birthday, new Date())
})

/**
 * 展示判定：命中且「今年未弹过」才弹。
 *
 * 注意这里**不写**去重 key——标记改由 `markSeen()` 在用户真正收下祝福
 * （吹完蜡烛或点关闭）时写入，避免「弹了但用户没看见/被导航吞掉也烧掉
 * 一整年机会」；代价是未收下就刷新会再弹一次。
 * storage 不可用（隐私模式）时仍然展示，只是无法去重。
 */
function maybeShow() {
  if (visible.value) return
  const me = auth.me
  if (!me?.id) return
  if (!previewMode.value) {
    const key = birthdayGreetingKey(me.id, localYear())
    try {
      if (localStorage.getItem(key) === '1') return
    } catch {
      /* 忽略：仅失去去重能力 */
    }
  }
  visible.value = true
  void nextTick(() => {
    playIntro()
    scheduleAutoBlow()
    blowRef.value?.focus()
  })
}

/**
 * 记账「今年已弹过」：仅在用户真正收下祝福时调用（见 `onAllBlown` / `close`）。
 * 预览模式不记账，否则自测会把真实那次祝福吞掉。
 */
function markSeen() {
  if (previewMode.value) return
  const me = auth.me
  if (!me?.id) return
  try {
    localStorage.setItem(birthdayGreetingKey(me.id, localYear()), '1')
  } catch {
    /* 忽略：仅失去去重能力 */
  }
}

// me 就绪 / 路由离开认证页 / 跨标签页同步：任一时刻变为命中即弹
watch(
  eligible,
  (ok) => {
    if (ok) maybeShow()
  },
  { immediate: true },
)

let mm: ReturnType<typeof gsap.matchMedia> | null = null
let wishTl: gsap.core.Timeline | null = null

/**
 * 入场编排（transform / opacity 为主）：
 * 月与星野 → 蛋糕回弹上升 → 标题逐字 → 文案与按钮 → 星野呼吸常亮。
 * `gsap.matchMedia` 处理 reduced-motion（场景静止呈现）与窄屏位移量。
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
        // 减少动效：场景直接静止呈现（CSS 默认即最终态），不建任何补间
        if (conditions.reduce) return
        const lift = conditions.narrow ? 28 : 48

        const tl = g.timeline({
          defaults: { duration: DURATIONS.entrance, ease: EASINGS.entrance },
        })
        tl.addLabel('night')
          .from('.bday-moon', { autoAlpha: 0, scale: 0.82, duration: DURATIONS.slow }, 'night')
          .from(
            '.bday-star',
            {
              autoAlpha: 0,
              scale: 0.4,
              duration: DURATIONS.standard,
              stagger: { each: 0.012, from: 'random' },
            },
            'night+=0.1',
          )
          .from('.bday-aurora', { autoAlpha: 0, duration: DURATIONS.slow * 1.3 }, 'night+=0.2')
          .addLabel('cake', 'night+=0.5')
          .from(
            '.cake',
            {
              autoAlpha: 0,
              y: lift,
              scale: 0.9,
              duration: DURATIONS.slow,
              ease: EASINGS.bounce,
            },
            'cake',
          )
          .addLabel('copy', 'cake+=0.4')
          .from(
            '.bday-char',
            {
              autoAlpha: 0,
              y: 16,
              rotate: 5,
              duration: DURATIONS.standard,
              stagger: STAGGERS.characters,
            },
            'copy',
          )
          .from(
            ['.bday-sub', '.bday-days'],
            { autoAlpha: 0, y: 12, duration: DURATIONS.standard, stagger: 0.09 },
            'copy+=0.28',
          )
          .from('.bday-actions', { autoAlpha: 0, y: 10, duration: DURATIONS.fast }, 'copy+=0.45')
          // 星野呼吸 + 蛋糕暖光：常驻环境动效（repeat -1），随 ctx.revert 清理
          .to(
            '.bday-star',
            {
              autoAlpha: 0.35,
              duration: 1.4,
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
              stagger: { each: 0.05, from: 'random' },
            },
            'copy',
          )
          .to(
            '.cake-glow',
            {
              opacity: 0.82,
              scale: 1.07,
              duration: 1.8,
              ease: EASINGS.smooth,
              repeat: -1,
              yoyo: true,
            },
            'cake',
          )
      },
    )
  })
}

/** 吹灭全部蜡烛 → 进入「愿望已送达」阶段（状态同步置位，视觉随后展开） */
function onAllBlown() {
  if (blown.value) return
  // 吹完即视为已收下祝福：此刻才记账「今年已弹过」
  markSeen()
  blown.value = true
  void nextTick(() => {
    playWish()
    closeRef.value?.focus()
  })
}

/** 自动吹灭定时器（弹窗关闭 / 手动吹灭 / 组件卸载时必须清掉） */
let autoBlowTimer: ReturnType<typeof setTimeout> | null = null

function clearAutoBlow() {
  if (autoBlowTimer !== null) {
    clearTimeout(autoBlowTimer)
    autoBlowTimer = null
  }
}

/** 到点自动吹灭：蜡烛只是装饰，用户不需要点任何烛火 */
function scheduleAutoBlow() {
  clearAutoBlow()
  autoBlowTimer = setTimeout(() => {
    autoBlowTimer = null
    blowCandles()
  }, AUTO_BLOW_DELAY_MS)
}

function blowCandles() {
  clearAutoBlow()
  cakeRef.value?.blowAll()
}

/**
 * 收尾编排：彩带（canvas-confetti 官方用法，见 lib/confetti.ts）、心愿星升空、
 * 心愿文案浮现、暖光回弹。与入场分开建 timeline：它要在用户吹蜡烛的任意时刻插入。
 */
function playWish() {
  const root = rootRef.value
  if (!root) return
  wishTl?.kill()
  const short = reduceMotion()
  const tl = gsap.timeline()
  wishTl = tl

  // 彩带交给 canvas-confetti（业界标准库，粒子物理/形状/性能都不用自己写）
  if (!short) celebrateBirthday()

  if (short) {
    tl.to('.bday-wish', { autoAlpha: 1, duration: 0.01 })
    return
  }

  tl.addLabel('wish')
    .fromTo(
      '.bday-wish-star',
      { autoAlpha: 0, y: 0, scale: 0.5 },
      { autoAlpha: 1, y: -150, scale: 1.35, duration: DURATIONS.slow, ease: 'power2.out' },
      'wish+=0.1',
    )
    .to(
      '.bday-wish-star',
      { autoAlpha: 0, y: -250, scale: 0.7, duration: DURATIONS.slow * 0.9, ease: 'power2.in' },
      'wish+=0.8',
    )
    .to('.bday-wish', { autoAlpha: 1, y: 0, duration: DURATIONS.standard }, 'wish+=0.35')
    .to(
      '.cake-glow',
      { scale: 1.16, opacity: 0.5, duration: DURATIONS.slow, ease: EASINGS.elastic },
      'wish+=0.2',
    )
}

/** 关掉祝福：停掉补间与环境动效、清掉画布上残留的彩带 */
function close() {
  // 主动关闭同样算收下祝福（未吹蜡烛直接关闭也要记账，否则年年重复弹）
  markSeen()
  clearAutoBlow()
  mm?.kill()
  mm = null
  wishTl?.kill()
  wishTl = null
  resetCelebration()
  visible.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(visible, (open) => {
  if (open) {
    window.addEventListener('keydown', onKeydown)
    // 模态期间锁滚动，避免遮罩下方的页面继续滚动
    document.body.style.overflow = 'hidden'
  } else {
    window.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
  clearAutoBlow()
  mm?.kill()
  mm = null
  wishTl?.kill()
  wishTl = null
  resetCelebration()
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
  overflow: hidden;
  background:
    radial-gradient(
      120% 80% at 50% 108%,
      color-mix(in srgb, var(--primary-color) 26%, transparent) 0%,
      transparent 62%
    ),
    linear-gradient(180deg, #06080f 0%, #0b1020 48%, #141a2e 100%);
}

/* ---------- 夜色 ---------- */
.bday-sky {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bday-moon {
  position: absolute;
  top: 12%;
  right: 16%;
  width: 4.6rem;
  height: 4.6rem;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 34%, #fffdf4 0%, #ffeec4 58%, #f4d79a 100%);
  box-shadow:
    0 0 40px 12px rgb(255 238 196 / 22%),
    0 0 120px 40px rgb(255 238 196 / 10%);
  will-change: transform, opacity;
}

.bday-aurora {
  position: absolute;
  inset: -10% -20% auto -20%;
  height: 62%;
  background:
    radial-gradient(
      50% 60% at 22% 40%,
      color-mix(in srgb, var(--primary-color) 22%, transparent) 0%,
      transparent 70%
    ),
    radial-gradient(
      45% 55% at 74% 30%,
      color-mix(in srgb, var(--accent-color, #f59e0b) 14%, transparent) 0%,
      transparent 72%
    );
  filter: blur(22px);
  will-change: opacity;
}

.bday-star {
  position: absolute;
  border-radius: 50%;
  background: #fffdf4;
  box-shadow: 0 0 6px 1px rgb(255 253 244 / 45%);
  will-change: transform, opacity;
}

/* 两层星云：只做极慢漂移，给夜空纵深 */
.bday-nebula {
  position: absolute;
  border-radius: 50%;
  filter: blur(46px);
  opacity: 0.55;
  will-change: transform;
}

.bday-nebula--one {
  top: -12%;
  left: -8%;
  width: 46rem;
  height: 26rem;
  background: radial-gradient(
    circle at 40% 45%,
    color-mix(in srgb, var(--primary-color) 30%, transparent) 0%,
    transparent 68%
  );
}

.bday-nebula--two {
  bottom: -22%;
  right: -12%;
  width: 40rem;
  height: 24rem;
  background: radial-gradient(
    circle at 55% 50%,
    color-mix(in srgb, var(--accent-color, #f59e0b) 18%, transparent) 0%,
    transparent 70%
  );
}

/* 浮尘：烛光里飘的暖色微粒（CSS 常驻动画，避免再多一条 GSAP 时间轴） */
.bday-mote {
  position: absolute;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-color, #f59e0b) 72%, #fff);
  box-shadow: 0 0 8px 2px color-mix(in srgb, var(--accent-color, #f59e0b) 32%, transparent);
  opacity: 0;
  animation: bday-mote-drift 9s linear infinite;
  will-change: transform, opacity;
}

@keyframes bday-mote-drift {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0);
  }
  12% {
    opacity: 0.85;
  }
  85% {
    opacity: 0.5;
  }
  100% {
    opacity: 0;
    transform: translate3d(1.4rem, -9rem, 0);
  }
}

/* 暗角：把视线收到画面中心的蛋糕上 */
.bday-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(110% 78% at 50% 48%, transparent 42%, rgb(0 0 0 / 42%) 100%);
  pointer-events: none;
}

/* ---------- 场景主体 ---------- */
.bday-scene {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: min(30rem, 100%);
  text-align: center;
}

.bday-copy {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.bday-title {
  margin: 0;
  font-size: clamp(1.7rem, 5vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -1px;
  color: #fffdf7;
  text-shadow: 0 0.35rem 1.4rem color-mix(in srgb, var(--primary-color) 45%, transparent);
}

.bday-char {
  display: inline-block;
  will-change: transform, opacity;
}

.bday-sub {
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.75;
  color: rgb(255 253 247 / 82%);
}

.bday-days {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  color: color-mix(in srgb, var(--accent-color, #f59e0b) 78%, #fff);
}

.bday-wish {
  margin: 0.15rem 0 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: rgb(255 253 247 / 72%);
  opacity: 0;
  visibility: hidden;
}

/* ---------- 交互 ---------- */
.bday-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.bday-btn {
  padding: 0.65rem 1.7rem;
  border: none;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--primary-color) 88%, #fff) 0%,
    var(--primary-color) 100%
  );
  color: #fff;
  font-size: 0.92rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 0.6rem 1.6rem -0.6rem color-mix(in srgb, var(--primary-color) 80%, transparent);
  transition: translate 0.15s ease;
}

.bday-btn:hover {
  translate: 0 -1px;
}

.bday-btn:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 3px;
}

.bday-hint {
  margin: 0;
  font-size: 0.76rem;
  color: rgb(255 253 247 / 48%);
}

/* ---------- 心愿星 ---------- */
.bday-wish-star {
  position: absolute;
  top: 46%;
  left: 50%;
  width: 0.55rem;
  height: 0.55rem;
  margin-left: -0.27rem;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #fffdf4 0%,
    color-mix(in srgb, var(--accent-color, #f59e0b) 80%, #fff) 45%,
    transparent 72%
  );
  box-shadow: 0 0 16px 6px color-mix(in srgb, var(--accent-color, #f59e0b) 42%, transparent);
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 640px) {
  .bday-scene {
    gap: 0.9rem;
  }

  .bday-moon {
    top: 9%;
    right: 10%;
    width: 3.2rem;
    height: 3.2rem;
  }

  /* 窄屏省电：去掉约 1/3 星点与一半浮尘 */
  .bday-star:nth-child(3n) {
    display: none;
  }

  .bday-mote:nth-child(2n) {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* 浮尘是 CSS 常驻动画，需单独关掉（GSAP 侧由 matchMedia 分支处理） */
  .bday-mote {
    animation: none;
  }
}
</style>
