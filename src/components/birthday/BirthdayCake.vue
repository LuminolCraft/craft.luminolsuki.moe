<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <!-- 生日蛋糕：纯 CSS 分层绘制（奶油垂边 / 侧面高光 / 烛光池）；烛火可点可统一吹灭 -->
  <div ref="rootRef" class="cake" :class="{ 'is-all-out': allOut }">
    <div class="cake-glow" aria-hidden="true"></div>

    <!-- 蜡烛是纯装饰：不接受点击（单根烛火的触摸目标太小、误触多），
         熄灭由父组件驱动（自动依次吹灭，或点「吹蜡烛」立即吹灭） -->
    <div class="cake-candles" aria-hidden="true">
      <span
        v-for="(candle, i) in candles"
        :key="i"
        class="cake-candle"
        :class="{ 'is-out': candle.out }"
      >
        <span class="cake-wick"></span>
        <span class="cake-flame"></span>
        <span class="cake-smoke">
          <span v-for="puff in 3" :key="puff" class="cake-puff"></span>
        </span>
        <span class="cake-stick"></span>
      </span>
    </div>

    <div class="cake-body" aria-hidden="true">
      <!-- 顶层：奶油垂边 + 糖针 + 莓果；奶油上的暖光来自蜡烛 -->
      <div class="cake-tier cake-tier--top">
        <div class="cake-cream"></div>
        <div class="cake-drip"></div>
        <span
          v-for="sprinkle in 6"
          :key="`top-${sprinkle}`"
          class="cake-sprinkle"
          :class="`is-${(sprinkle % 3) + 1}`"
          :style="{ left: `${10 + sprinkle * 13}%`, top: `${-2 + (sprinkle % 2) * 22}%` }"
        ></span>
        <span class="cake-light"></span>
      </div>

      <!-- 底层：奶油垂边 + 糖针 -->
      <div class="cake-tier cake-tier--bottom">
        <div class="cake-cream"></div>
        <div class="cake-drip"></div>
        <span
          v-for="sprinkle in 8"
          :key="`bottom-${sprinkle}`"
          class="cake-sprinkle"
          :class="`is-${((sprinkle + 1) % 3) + 1}`"
          :style="{ left: `${7 + sprinkle * 11}%`, top: `${-2 + (sprinkle % 2) * 24}%` }"
        ></span>
      </div>

      <!-- 莓果与樱桃摆在顶层奶油上 -->
      <div class="cake-topping">
        <span class="cake-berry"></span>
        <span class="cake-cherry"><span class="cake-stem"></span></span>
        <span class="cake-berry"></span>
      </div>

      <div class="cake-shadow"></div>
      <div class="cake-plate"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import gsap from 'gsap'
import { useGsap } from '@/composables/useGsap'

const props = withDefaults(defineProps<{ candleCount?: number }>(), { candleCount: 3 })
const emit = defineEmits<{ (e: 'allBlown'): void }>()

const rootRef = ref<HTMLElement | null>(null)
const { create, reduceMotion } = useGsap({ scope: rootRef })

/** 每根蜡烛只有「灭 / 未灭」一个状态；视觉补间与状态解耦，交互反馈是同步的 */
const candles = ref(Array.from({ length: props.candleCount }, () => ({ out: false })))
const allOut = computed(() => candles.value.every((candle) => candle.out))

function candleEl(index: number): HTMLElement | null {
  return rootRef.value?.querySelectorAll<HTMLElement>('.cake-candle')[index] ?? null
}

/** 单根蜡烛的吹灭动效：火焰压扁消失 → 三缕青烟上升淡出 */
function playBlow(index: number, delay = 0) {
  const el = candleEl(index)
  if (!el) return
  const flame = el.querySelector('.cake-flame')
  const smoke = el.querySelector('.cake-smoke')
  const puffs = el.querySelectorAll('.cake-puff')
  gsap.killTweensOf([flame, smoke, ...puffs])

  const short = reduceMotion()
  // reduce-motion：直接落终态，不再播放熄灭动画（呼吸补间同理不建）
  if (short) {
    gsap.set(flame, { scaleY: 0.15, scaleX: 1.7, autoAlpha: 0 })
    return
  }

  const tl = gsap.timeline({ delay })
  tl.to(flame, {
    scaleY: 0.15,
    scaleX: 1.7,
    autoAlpha: 0,
    duration: 0.26,
    ease: 'power2.in',
  })
  tl.fromTo(smoke, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: 'none' }, '-=0.04').to(
    puffs,
    {
      y: -38,
      x: (i: number) => (i - 1) * 7,
      scale: 1.7,
      autoAlpha: 0,
      duration: 1.2,
      ease: 'power1.out',
      stagger: 0.09,
    },
    '<',
  )
}

/** 统一吹灭（父组件自动调用 / 用户点「吹蜡烛」加速）：蜡烛只做视觉，不接受单根点击 */
function blowAll() {
  const pending = candles.value
    .map((candle, index) => ({ candle, index }))
    .filter((item) => !item.candle.out)
  if (pending.length === 0) return
  pending.forEach((item, order) => {
    item.candle.out = true
    playBlow(item.index, order * 0.14)
  })
  emit('allBlown')
}

defineExpose({ blowAll, allOut })

onMounted(() => {
  create((g) => {
    if (reduceMotion()) return
    // 烛火呼吸 + 奶油上的烛光池同步脉动：错开相位，避免整齐划一
    g.to('.cake-flame', {
      scaleY: 1.18,
      scaleX: 0.93,
      autoAlpha: 0.9,
      duration: () => g.utils.random(0.45, 0.8),
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      stagger: { each: 0.12, from: 'random' },
    })
    g.to('.cake-light', {
      opacity: 0.75,
      scale: 1.06,
      duration: 1.1,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    })
  })
})
</script>

<style scoped>
.cake {
  position: relative;
  width: 17rem;
  height: 16rem;
  transform-origin: 50% 100%;
}

/* 蛋糕整体暖光（蜡烛照亮周围的空气） */
.cake-glow {
  position: absolute;
  left: 50%;
  bottom: 1rem;
  width: 17rem;
  height: 13rem;
  translate: -50% 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 58%,
    color-mix(in srgb, var(--accent-color, #f59e0b) 38%, transparent) 0%,
    transparent 66%
  );
  filter: blur(10px);
  opacity: 0.55;
  pointer-events: none;
}

/* ---------- 蜡烛 ---------- */
.cake-candles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 2.4rem;
  z-index: 4;
}

.cake-candle {
  position: relative;
  display: block;
  width: 0.58rem;
  height: 3.3rem;
  pointer-events: none;
}

.cake-stick {
  position: absolute;
  inset: auto 0 0 0;
  height: 2.5rem;
  border-radius: 4px 4px 2px 2px;
  background:
    linear-gradient(90deg, rgb(255 255 255 / 55%) 0%, transparent 38%),
    repeating-linear-gradient(
      -18deg,
      color-mix(in srgb, var(--primary-color) 72%, #fff) 0 6px,
      #fff 6px 12px
    );
  box-shadow: 0 0.2rem 0.35rem -0.2rem rgb(0 0 0 / 45%);
}

.cake-wick {
  position: absolute;
  top: 0.42rem;
  left: 50%;
  width: 0.1rem;
  height: 0.34rem;
  translate: -50% 0;
  background: #4a3a2c;
  border-radius: 1px;
}

.cake-flame {
  position: absolute;
  top: -0.5rem;
  left: 50%;
  width: 0.9rem;
  height: 1.45rem;
  translate: -50% 0;
  border-radius: 50% 50% 46% 46% / 68% 68% 32% 32%;
  background: radial-gradient(
    circle at 50% 72%,
    #fffef6 0%,
    #ffe9a8 38%,
    color-mix(in srgb, var(--accent-color, #f59e0b) 92%, #fff) 68%,
    color-mix(in srgb, #ff7a18 70%, transparent) 88%,
    transparent 100%
  );
  box-shadow:
    0 0 10px 3px color-mix(in srgb, var(--accent-color, #f59e0b) 55%, transparent),
    0 0 26px 8px color-mix(in srgb, var(--accent-color, #f59e0b) 26%, transparent);
  transform-origin: 50% 100%;
  will-change: transform, opacity;
}

/* 焰心：让火焰有层次，而不是一团黄光 */
.cake-flame::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0.18rem;
  width: 0.3rem;
  height: 0.5rem;
  translate: -50% 0;
  border-radius: 50% 50% 45% 45% / 62% 62% 38% 38%;
  background: #fff9e6;
  filter: blur(0.6px);
}

/* 青烟：默认不可见，吹灭时才由 GSAP 拉起 */
.cake-smoke {
  position: absolute;
  top: -0.35rem;
  left: 50%;
  translate: -50% 0;
  opacity: 0;
  pointer-events: none;
}

.cake-puff {
  position: absolute;
  top: 0;
  left: -0.2rem;
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--text-secondary) 60%, transparent);
  filter: blur(1.6px);
}

/* ---------- 蛋糕体 ---------- */
.cake-body {
  position: absolute;
  inset: auto 0 0 0;
  height: 11.6rem;
}

.cake-tier {
  position: absolute;
  left: 50%;
  translate: -50% 0;
  border-radius: 0.7rem 0.7rem 0.45rem 0.45rem;
  background: linear-gradient(180deg, #ffd7ac 0%, #f2b478 50%, #d99a5f 100%);
  box-shadow:
    inset 0 -0.55rem 1rem -0.4rem rgb(120 60 20 / 34%),
    inset 0 0.4rem 0.65rem -0.35rem rgb(255 255 255 / 34%);
}

/* 饼底：一圈焦糖色蛋糕胚，给平涂的侧面制造层次 */
.cake-tier::before {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 0.55rem;
  border-radius: 0 0 0.45rem 0.45rem;
  background: linear-gradient(180deg, #c9853f 0%, #9d5f28 100%);
}

/* 侧面高光：给圆柱体一点体积感 */
.cake-tier::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 0.55rem;
  width: 1.4rem;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(255 255 255 / 28%) 0%, transparent 100%);
}

.cake-tier--bottom {
  bottom: 1.6rem;
  width: 12.6rem;
  height: 5.6rem;
  z-index: 2;
}

.cake-tier--top {
  bottom: 7.2rem;
  width: 8.8rem;
  height: 4.6rem;
  z-index: 3;
}

/* 奶油：圆润的顶 + 沿边缘垂下来的波浪（垂边单独一层，方便做扇形） */
.cake-cream {
  position: absolute;
  inset: -0.45rem 0 auto 0;
  height: 1.45rem;
  border-radius: 0.55rem 0.55rem 40% 40% / 0.55rem 0.55rem 1.2rem 1.2rem;
  background: linear-gradient(180deg, #fffdf8 0%, #ffe9cf 100%);
  box-shadow: 0 0.3rem 0.55rem -0.3rem rgb(90 50 20 / 38%);
}

.cake-tier--top .cake-cream {
  background: linear-gradient(180deg, #fffaf4 0%, #ffdcc9 100%);
}

.cake-drip {
  position: absolute;
  top: 0.9rem;
  left: 0.15rem;
  right: 0.15rem;
  height: 1rem;
  background-image: radial-gradient(
    circle at 0.6rem 0,
    #ffe9cf 0.56rem,
    color-mix(in srgb, #ffe9cf 65%, transparent) 0.6rem,
    transparent 0.63rem
  );
  background-size: 1.2rem 1rem;
  background-repeat: repeat-x;
}

.cake-tier--top .cake-drip {
  background-image: radial-gradient(
    circle at 0.6rem 0,
    #ffdcc9 0.56rem,
    color-mix(in srgb, #ffdcc9 65%, transparent) 0.6rem,
    transparent 0.63rem
  );
}

.cake-sprinkle {
  position: absolute;
  width: 0.2rem;
  height: 0.46rem;
  border-radius: 99px;
  rotate: 26deg;
  z-index: 2;
}

.cake-sprinkle.is-1 {
  background: var(--primary-color);
}

.cake-sprinkle.is-2 {
  background: var(--accent-color, #f59e0b);
}

.cake-sprinkle.is-3 {
  background: #e05a7a;
}

/* 奶油上的烛光池：与烛火同步脉动 */
.cake-light {
  position: absolute;
  top: -0.5rem;
  left: 50%;
  width: 9rem;
  height: 2.6rem;
  translate: -50% 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 40%,
    color-mix(in srgb, var(--accent-color, #f59e0b) 42%, transparent) 0%,
    transparent 70%
  );
  filter: blur(4px);
  opacity: 0.55;
  pointer-events: none;
}

.cake-topping {
  position: absolute;
  bottom: 11.7rem;
  left: 50%;
  translate: -50% 0;
  display: flex;
  align-items: flex-end;
  gap: 2.2rem;
  z-index: 4;
}

.cake-berry {
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 28%, #ff9db0 0%, #d8385c 72%);
  box-shadow: 0 0.12rem 0.28rem -0.1rem rgb(0 0 0 / 45%);
}

.cake-cherry {
  position: relative;
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 26%, #ff8b8b 0%, #b81f38 74%);
  box-shadow: 0 0.14rem 0.3rem -0.1rem rgb(0 0 0 / 48%);
}

.cake-stem {
  position: absolute;
  left: 55%;
  bottom: 0.72rem;
  width: 0.42rem;
  height: 0.42rem;
  border-top: 1.5px solid #4e7a3a;
  border-right: 1.5px solid #4e7a3a;
  border-radius: 0 60% 0 0;
  rotate: -12deg;
}

/* 盘子与投影：蛋糕「落在」地面上，而不是浮着 */
.cake-shadow {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  translate: -50% 0;
  width: 12rem;
  height: 1.5rem;
  border-radius: 50%;
  background: rgb(0 0 0 / 42%);
  filter: blur(9px);
  z-index: 1;
}

.cake-plate {
  position: absolute;
  bottom: 0.85rem;
  left: 50%;
  translate: -50% 0;
  width: 16rem;
  height: 1.15rem;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffffff3d 0%, #ffffff12 55%, #ffffff05 100%);
  border: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
  box-shadow: inset 0 0.2rem 0.4rem -0.2rem rgb(255 255 255 / 35%);
  z-index: 2;
}

/* 全部吹灭：暖光收敛，突出青烟与彩带 */
.cake.is-all-out .cake-glow {
  opacity: 0.28;
}

.cake.is-all-out .cake-light {
  opacity: 0.18;
}

@media (max-width: 640px) {
  .cake {
    width: 14rem;
    height: 12.4rem;
    scale: 0.94;
  }

  .cake-candles {
    gap: 1.7rem;
  }

  .cake-tier--bottom {
    width: 11.8rem;
    height: 4rem;
  }

  .cake-tier--top {
    width: 8.4rem;
    height: 3.3rem;
    bottom: 5.3rem;
  }

  .cake-topping {
    bottom: 7.85rem;
    gap: 2rem;
  }

  .cake-plate {
    width: 13.4rem;
  }
}
</style>
