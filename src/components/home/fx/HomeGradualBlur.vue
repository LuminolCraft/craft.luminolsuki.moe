<!--
  移植自 Vue Bits「GradualBlur」(https://vue-bits.dev/animations/gradual-blur)。

  改动：
  - 去掉 Tailwind 类，改为组件内的原生 CSS（本项目不使用 Tailwind）。
  - 缩到横向轮播真正需要的参数：position / strength / size / divCount / curve / tint。
  - 叠层渐变用 CSS 变量驱动，颜色跟随主题（tint 走 --canvas），避免浅色模式下出现灰带。

  原理：叠 N 层 backdrop-filter: blur()，每层用 mask 渐变只露出自己那一段，
  越靠边的一层模糊越强，于是形成从清晰到模糊的连续过渡。

  注意：容器默认 pointer-events: none，不会抢轮播的拖动与滚轮事件。
-->
<template>
  <div class="gradual-blur" :class="`gradual-blur--${position}`" :style="containerStyle">
    <div
      v-for="(layer, index) in layers"
      :key="index"
      class="gradual-blur__layer"
      :style="layer"
    />
    <div v-if="tint" class="gradual-blur__tint" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 过渡贴在哪条边 */
    position?: 'top' | 'bottom' | 'left' | 'right'
    /** 整体模糊强度倍数 */
    strength?: number
    /** 过渡带尺寸（CSS 长度） */
    size?: string
    /** 叠层数量：越多过渡越细腻，GPU 开销也越高 */
    divCount?: number
    /** 强度曲线 */
    curve?: 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out'
    /** 是否再叠一层到页面底色的渐变，让边缘收得更干净 */
    tint?: boolean
    /** 叠层透明度 */
    opacity?: number
  }>(),
  {
    position: 'bottom',
    strength: 2,
    size: '9rem',
    divCount: 6,
    curve: 'bezier',
    tint: true,
    opacity: 1,
  },
)

const CURVES: Record<string, (p: number) => number> = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  'ease-in': (p) => p * p,
  'ease-out': (p) => 1 - (1 - p) ** 2,
  'ease-in-out': (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2),
}

/** 渐变方向：过渡从「贴边一侧」向外散开 */
const DIRECTION: Record<string, string> = {
  top: 'to bottom',
  bottom: 'to top',
  left: 'to right',
  right: 'to left',
}

const containerStyle = computed<CSSProperties>(() => {
  const vertical = props.position === 'top' || props.position === 'bottom'
  const style: CSSProperties = {}
  style[props.position] = '0'

  /*
    尺寸上限跟着视口走：窄屏上两条固定 11rem 的过渡带会把整条轮播糊掉，
    所以用 min(配置尺寸, 24vw/24vh) 让它随视口收缩。
  */
  if (vertical) {
    style.height = `min(${props.size}, 24vh)`
    style.left = '0'
    style.right = '0'
  } else {
    style.width = `min(${props.size}, 24vw)`
    style.top = '0'
    style.bottom = '0'
  }
  return style
})

const layers = computed<CSSProperties[]>(() => {
  const curve = CURVES[props.curve] ?? CURVES.bezier!
  const direction = DIRECTION[props.position] ?? DIRECTION.bottom!
  const step = 100 / props.divCount
  const out: CSSProperties[] = []

  for (let i = 1; i <= props.divCount; i += 1) {
    const progress = curve(i / props.divCount)
    const blur = 0.0625 * (progress * props.divCount + 1) * props.strength

    const p1 = Math.round((step * i - step) * 10) / 10
    const p2 = Math.round(step * i * 10) / 10
    const p3 = Math.round((step * i + step) * 10) / 10
    const p4 = Math.round((step * i + step * 2) * 10) / 10

    let gradient = `transparent ${p1}%, black ${p2}%`
    if (p3 <= 100) gradient += `, black ${p3}%`
    if (p4 <= 100) gradient += `, transparent ${p4}%`

    const mask = `linear-gradient(${direction}, ${gradient})`
    out.push({
      maskImage: mask,
      WebkitMaskImage: mask,
      backdropFilter: `blur(${blur.toFixed(3)}rem)`,
      opacity: props.opacity,
    })
  }

  return out
})
</script>

<style scoped>
.gradual-blur {
  position: absolute;
  z-index: 5;
  /* 不抢轮播的拖动、滚轮与点击 */
  pointer-events: none;
  /* 叠层里每层都有 backdrop-filter，隔离成独立层避免与滚动互相影响 */
  isolation: isolate;
}

.gradual-blur__layer,
.gradual-blur__tint {
  position: absolute;
  inset: 0;
}

/* 边缘再压一层到页面底色的渐变：只让最外侧完全落到底色，向内迅速透明 */
.gradual-blur__tint {
  background: linear-gradient(to right, var(--canvas) 0%, transparent 100%);
}

.gradual-blur--right .gradual-blur__tint {
  background: linear-gradient(to left, var(--canvas) 0%, transparent 100%);
}

.gradual-blur--top .gradual-blur__tint {
  background: linear-gradient(to bottom, var(--canvas) 0%, transparent 100%);
}

.gradual-blur--bottom .gradual-blur__tint {
  background: linear-gradient(to top, var(--canvas) 0%, transparent 100%);
}

@media (prefers-reduced-motion: reduce) {
  /* 减少动效时去掉叠层模糊，只留底色渐变，避免大面积 GPU 合成 */
  .gradual-blur__layer {
    display: none;
  }
}
</style>
