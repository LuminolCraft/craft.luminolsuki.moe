<!--
  AftermathBridge —— 封禁公示 → 世界展示 之间的过渡

  语义：上一段讲「谁被处理了」，下一段讲「大多数人在干什么」。
  这个过渡件把两件事放在同一张图里：左边一小簇密集的红点（处理记录），
  向右逐渐散成稀落的紫点（正常玩家）。读者一眼看到比例，再读下一段。

  技术点：
  1. 点的位置按指数分布算（密 → 疏），不是手排；
  2. 颜色在「警示红」与「主色紫」之间按位置插值（H 通道线性插值）；
  3. 进入视口后点从左侧依次摊开 —— 用 transform + transition-delay，只动合成层；
  4. 5 个点的半径略大，代表永久封禁；其余为临时记录。

  为什么不用 Canvas：这里点少、要可缩放、要能被 CSS 过渡驱动，SVG 更合适。
  如果要换成 HTML-in-Canvas 版本，把中间的 <p> 换成 canvas + drawElementImage 即可。
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Dot {
  x: number
  r: number
  fill: string
  delay: number
}

/** 在红 → 紫之间插值（用 oklch 会跳，直接按 RGB 混合更稳） */
function mix(t: number): string {
  const a = [229, 72, 77] // #e5484d
  const b = [167, 139, 250] // #a78bfa
  const c = a.map((v, i) => Math.round(v + (b[i]! - v) * t))
  return `rgb(${c[0]} ${c[1]} ${c[2]})`
}

const TOTAL = 34
const PERMANENT = 7

const DOTS: Dot[] = Array.from({ length: TOTAL }, (_, i) => {
  const t = i / (TOTAL - 1)
  // 指数分布：前 1/3 挤在左侧，越往右越稀
  const x = 26 + (940 - 26) * Math.pow(t, 2.1)
  return {
    x,
    r: i < PERMANENT ? 3.4 : 2.2,
    fill: mix(Math.min(1, t * 1.5)),
    delay: i * 0.035,
  }
})

const shown = ref(false)
let io: IntersectionObserver | null = null

onMounted(() => {
  requestAnimationFrame(() => {
    shown.value = true
  })
  const el = document.querySelector('.af')
  if (el) {
    io = new IntersectionObserver(
      (e) => e.forEach((en) => en.isIntersecting && (shown.value = true)),
      { threshold: 0.2 },
    )
    io.observe(el)
  }
})

onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <div class="af">
    <div class="af__rule" aria-hidden="true" />

    <p class="af__kicker">between / 处理与被处理</p>
    <p class="af__text">
      三年里一共 34 条处理记录，其中 7 个是永久封禁。剩下的人，都还在里面盖房子。
    </p>

    <svg class="af__svg" viewBox="0 0 1000 84" :class="{ 'is-shown': shown }" aria-hidden="true">
      <line x1="26" y1="46" x2="974" y2="46" class="af__line" />
      <circle
        v-for="(d, i) in DOTS"
        :key="i"
        :cx="d.x"
        cy="46"
        :r="d.r"
        :fill="d.fill"
        class="af__dot"
        :style="{ transitionDelay: `${d.delay}s` }"
      />
      <text x="26" y="76" class="af__label">永久 · {{ PERMANENT }}</text>
      <text x="974" y="76" class="af__label af__label--end">其余 {{ TOTAL - PERMANENT }} 条 · 已到期解除</text>
    </svg>

    <div class="af__rule" aria-hidden="true" />
  </div>
</template>

<style scoped>
.af {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 56px 32px 40px;
  max-width: 1000px;
  margin: 0 auto;
  text-align: center;
}

.af__rule {
  width: 1px;
  height: 44px;
  background: linear-gradient(
    to bottom,
    transparent,
    color-mix(in srgb, var(--primary-color) 40%, transparent)
  );
}
.af::after {
  content: '';
  width: 1px;
  height: 44px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--primary-color) 40%, transparent),
    transparent
  );
}

.af__kicker {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--primary-color);
  opacity: 0.85;
  margin: 0;
}

.af__text {
  font-size: 1.05rem;
  line-height: 1.85;
  color: var(--text-color);
  margin: 0;
  max-width: 46ch;
  text-wrap: balance;
}

.af__svg {
  width: 100%;
  max-width: 1000px;
  height: auto;
  margin-top: 6px;
  overflow: visible;
}

.af__line {
  stroke: color-mix(in srgb, var(--text-color) 10%, transparent);
  stroke-width: 1;
  stroke-dasharray: 2 6;
}

.af__dot {
  opacity: 0;
  transform: translateX(-70px) scale(0.6);
  transform-box: fill-box;
  transform-origin: center;
  transition:
    opacity 0.7s ease,
    transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}
.af__svg.is-shown .af__dot {
  opacity: 1;
  transform: translateX(0) scale(1);
}

.af__label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  fill: var(--text-secondary);
  opacity: 0.7;
}
.af__label--end {
  text-anchor: end;
}

@media (max-width: 900px) {
  .af {
    padding: 40px 20px 28px;
  }
  .af__text {
    font-size: 0.98rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .af__dot {
    transition: none;
    opacity: 1;
    transform: none;
  }
}
</style>
