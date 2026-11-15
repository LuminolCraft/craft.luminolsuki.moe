<template>
  <!-- 星轨包边：两道径向光斑沿上下边缘反向扫过，内容层压在上方。
       原版为 Tailwind 类，本仓无 Tailwind，改为 scoped 类 + 主题变量。 -->
  <component :is="as" class="star-border" :style="shellStyle" v-bind="$attrs">
    <span class="star-beam star-beam--bottom" :style="beamStyle" aria-hidden="true" />
    <span class="star-beam star-beam--top" :style="beamStyle" aria-hidden="true" />
    <span class="star-content"><slot /></span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

/**
 * StarBorder：内容卡片外沿跑动的光斑描边。
 *
 * @param as 渲染标签（button / a / div）
 * @param color 光斑颜色（默认品牌紫）
 * @param speed 单程耗时
 * @param thickness 外沿厚度（光斑露出宽度）
 * @param radius 圆角
 * @param background 内容层底色（默认卡片色）
 */
const props = withDefaults(
  defineProps<{
    as?: string
    color?: string
    speed?: string
    thickness?: number
    radius?: string
    background?: string
    borderColor?: string
  }>(),
  {
    as: 'button',
    color: 'var(--primary-color, #8b5cf6)',
    speed: '6s',
    thickness: 1,
    radius: '14px',
    background: 'var(--card-bg, #0b0b0b)',
    borderColor: 'var(--border-color, #333)',
  },
)

const beamStyle = computed(() => ({
  background: `radial-gradient(circle, ${props.color}, transparent 10%)`,
  animationDuration: props.speed,
}))

const shellStyle = computed(() => ({
  '--star-radius': props.radius,
  '--star-bg': props.background,
  '--star-border-color': props.borderColor,
  paddingBlock: `${props.thickness}px`,
}))
</script>

<style scoped>
.star-border {
  position: relative;
  display: inline-block;
  padding-block: 1px;
  overflow: hidden;
  border: none;
  border-radius: var(--star-radius, 14px);
  background: transparent;
  cursor: pointer;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
}

.star-beam {
  position: absolute;
  z-index: 0;
  width: 300%;
  height: 50%;
  border-radius: 999px;
  opacity: 0.7;
  pointer-events: none;
}
.star-beam--bottom {
  right: -250%;
  bottom: -11px;
  animation: star-move-bottom var(--star-speed, 6s) linear infinite alternate;
}
.star-beam--top {
  top: -10px;
  left: -250%;
  animation: star-move-top var(--star-speed, 6s) linear infinite alternate;
}

.star-content {
  position: relative;
  z-index: 1;
  display: block;
  padding: var(--star-pad, 14px 30px);
  border: 1px solid var(--star-border-color);
  border-radius: inherit;
  background: var(--star-bg);
  color: var(--star-ink, var(--text-color, #fff));
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  white-space: nowrap;
}

:deep(a).star-border,
a.star-border {
  text-decoration: none;
}

.star-border:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 3px;
}

@keyframes star-move-bottom {
  0% {
    transform: translate(0%, 0%);
    opacity: 1;
  }
  100% {
    transform: translate(-100%, 0%);
    opacity: 0;
  }
}

@keyframes star-move-top {
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
  .star-beam {
    animation: none;
    opacity: 0.35;
  }
}
</style>
