<!--
  ChapterBridge —— 章节之间的过渡件

  作用：在两段内容之间放一句话，把读者的注意力从上一段带到下一段。
  它不是区块，不抢戏：居中、窄、大量留白，左右一条细线收边。

  用法：
    <ChapterBridge kicker="01 → 02" text="这台服务器没有重置过地图。" />

  视觉：细线 + 等宽 kicker + 一句衬线感的话（用 1.15rem/1.8 行高，不用大标题）。
-->
<script setup lang="ts">
defineProps<{
  kicker?: string
  text: string
  /** 装饰：三条极简弧线，暗示下一段是「地形 / 时间 / 人」 */
  motif?: 'wave' | 'contour' | 'dots'
}>()
</script>

<template>
  <div class="br">
    <div class="br__rule" aria-hidden="true" />

    <svg v-if="motif" class="br__motif" viewBox="0 0 120 26" aria-hidden="true">
      <template v-if="motif === 'wave'">
        <path d="M 4 16 Q 22 6 40 16 T 76 16 T 112 16" />
        <path d="M 4 21 Q 22 13 40 21 T 76 21 T 112 21" class="br__motif--dim" />
      </template>
      <template v-else-if="motif === 'contour'">
        <ellipse cx="60" cy="13" rx="42" ry="9" />
        <ellipse cx="60" cy="13" rx="28" ry="6" class="br__motif--dim" />
        <ellipse cx="60" cy="13" rx="14" ry="3" class="br__motif--dim" />
      </template>
      <template v-else>
        <circle cx="26" cy="13" r="3" />
        <circle cx="60" cy="13" r="2.4" class="br__motif--dim" />
        <circle cx="94" cy="13" r="2.4" class="br__motif--dim" />
      </template>
    </svg>

    <p v-if="kicker" class="br__kicker">{{ kicker }}</p>
    <p class="br__text">{{ text }}</p>
    <div class="br__rule" aria-hidden="true" />
  </div>
</template>

<style scoped>
.br {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 12px 32px 4px;
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}

.br__rule {
  width: 1px;
  height: 52px;
  background: linear-gradient(
    to bottom,
    transparent,
    color-mix(in srgb, var(--primary-color) 45%, transparent) 45%,
    color-mix(in srgb, var(--text-color) 26%, transparent)
  );
}
.br::after {
  content: '';
  width: 1px;
  height: 52px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--text-color) 26%, transparent),
    color-mix(in srgb, var(--primary-color) 45%, transparent) 55%,
    transparent
  );
}

.br__motif {
  width: 132px;
  height: 30px;
  fill: none;
  stroke: color-mix(in srgb, var(--primary-color) 55%, transparent);
  stroke-width: 1.2;
  opacity: 0.95;
}
.br__motif--dim {
  opacity: 0.55;
}
.br__motif circle {
  fill: color-mix(in srgb, var(--primary-color) 60%, transparent);
  stroke: none;
}

.br__kicker {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--primary-color);
  opacity: 0.85;
  margin: 0;
}

.br__text {
  font-size: 1.12rem;
  line-height: 1.85;
  color: var(--text-color);
  margin: 0;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

@media (max-width: 900px) {
  .br {
    padding: 16px 20px 4px;
  }
  .br__text {
    font-size: 1.02rem;
  }
}
</style>
