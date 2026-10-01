<!--
  HomeStarBorder — 流动星光描边容器
  移植自 Vue Bits「StarBorder」(https://vue-bits.dev/components/star-border)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点：
  - 去 Tailwind，改为 scoped CSS；底色 = var(--card-bg)，边框 = var(--glass-border)，高光 = 传入的 color
  - 上游默认深色底 #0b0b0b，这里跟随主题，避免明色主题下出现黑块
  - reduced-motion 下停掉循环动画，只保留静态描边
-->
<template>
  <div
    class="star-border"
    :style="{ '--star-color': color, '--star-speed': speed, '--star-thickness': `${thickness}px` }"
  >
    <span class="star-border__streak star-border__streak--bottom" aria-hidden="true" />
    <span class="star-border__streak star-border__streak--top" aria-hidden="true" />
    <div class="star-border__inner">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 高光颜色 */
    color?: string
    /** 一次横扫时长 */
    speed?: string
    /** 描边厚度（px） */
    thickness?: number
  }>(),
  {
    color: 'rgb(167 139 250 / 0.9)',
    speed: '7s',
    thickness: 1,
  },
)
</script>

<style scoped>
.star-border {
  position: relative;
  display: inline-block;
  overflow: hidden;
  border-radius: 999px;
  padding: var(--star-thickness) 0;
  border: 1px solid var(--glass-border);
  background: var(--card-bg);
}

.star-border__streak {
  position: absolute;
  z-index: 0;
  height: 55%;
  width: 300%;
  border-radius: 999px;
  opacity: 0.75;
  background: radial-gradient(circle, var(--star-color), transparent 12%);
  pointer-events: none;
}

.star-border__streak--bottom {
  right: -250%;
  bottom: -8px;
  animation: star-bottom var(--star-speed) linear infinite alternate;
}

.star-border__streak--top {
  left: -250%;
  top: -8px;
  animation: star-top var(--star-speed) linear infinite alternate;
}

.star-border__inner {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--card-bg);
  color: var(--text-color);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

@keyframes star-bottom {
  0% {
    transform: translate(0%, 0%);
    opacity: 1;
  }
  100% {
    transform: translate(-100%, 0%);
    opacity: 0;
  }
}

@keyframes star-top {
  0% {
    transform: translate(0%, 0%);
    opacity: 1;
  }
  100% {
    transform: translate(100%, 0%);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .star-border__streak {
    animation: none;
    opacity: 0.3;
  }
}
</style>
