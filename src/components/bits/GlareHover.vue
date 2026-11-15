<template>
  <!-- 眩光悬停：一道斜向光带从左上扫到右下（纯 background-position 过渡，无依赖）。
       原版无 Tailwind 类，仅补主题默认值与 reduced-motion。 -->
  <div
    class="glare-hover"
    :class="{ 'glare-hover--bare': bare }"
    :style="shellStyle"
    @mouseenter="animateIn"
    @mouseleave="animateOut"
    @focusin="animateIn"
    @focusout="animateOut"
  >
    <div ref="overlayRef" class="glare-hover__overlay" :style="overlayStyle" />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * GlareHover：鼠标进入时一道斜向光带扫过卡片。
 *
 * @param glareColor 光带颜色（默认品牌紫）
 * @param glareOpacity 光带不透明度
 * @param glareAngle 光带角度
 * @param glareSize 光带宽度（百分比）
 * @param transitionDuration 扫过耗时（ms）
 * @param playOnce 只扫一次（移出即复位，不反向扫回）
 */
const props = withDefaults(
  defineProps<{
    width?: string
    height?: string
    background?: string
    borderRadius?: string
    borderColor?: string
    glareColor?: string
    glareOpacity?: number
    glareAngle?: number
    glareSize?: number
    transitionDuration?: number
    playOnce?: boolean
    /** 只叠光层：不设边框/底色/圆角，用于包裹已有样式的卡片 */
    bare?: boolean
  }>(),
  {
    width: '100%',
    height: 'auto',
    background: 'var(--card-bg, #000)',
    borderRadius: '10px',
    borderColor: 'var(--border-color, #333)',
    glareColor: '#a78bfa',
    glareOpacity: 0.45,
    glareAngle: -45,
    glareSize: 250,
    transitionDuration: 650,
    playOnce: false,
    bare: false,
  },
)

const overlayRef = ref<HTMLDivElement | null>(null)

/** #rgb / #rrggbb → rgba；其它形式（var()、rgb()）原样透传 */
const rgba = computed(() => {
  const raw = props.glareColor.replace('#', '')
  if (/^[\dA-Fa-f]{6}$/.test(raw)) {
    const r = parseInt(raw.slice(0, 2), 16)
    const g = parseInt(raw.slice(2, 4), 16)
    const b = parseInt(raw.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${props.glareOpacity})`
  }
  if (/^[\dA-Fa-f]{3}$/.test(raw)) {
    const r = parseInt(raw[0]! + raw[0]!, 16)
    const g = parseInt(raw[1]! + raw[1]!, 16)
    const b = parseInt(raw[2]! + raw[2]!, 16)
    return `rgba(${r}, ${g}, ${b}, ${props.glareOpacity})`
  }
  return props.glareColor
})

const shellStyle = computed(() =>
  props.bare
    ? { width: props.width, height: props.height }
    : {
        width: props.width,
        height: props.height,
        background: props.background,
        borderRadius: props.borderRadius,
        borderColor: props.borderColor,
      },
)

const overlayStyle = computed(() => ({
  background: `linear-gradient(${props.glareAngle}deg, hsla(0,0%,0%,0) 60%, ${rgba.value} 70%, hsla(0,0%,0%,0) 100%)`,
  backgroundSize: `${props.glareSize}% ${props.glareSize}%, 100% 100%`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: '-100% -100%, 0 0',
}))

function animateIn() {
  const el = overlayRef.value
  if (!el) return
  el.style.transition = 'none'
  el.style.backgroundPosition = '-100% -100%, 0 0'
  void el.offsetHeight
  el.style.transition = `${props.transitionDuration}ms ease`
  el.style.backgroundPosition = '100% 100%, 0 0'
}

function animateOut() {
  const el = overlayRef.value
  if (!el) return
  el.style.transition = props.playOnce ? 'none' : `${props.transitionDuration}ms ease`
  el.style.backgroundPosition = '-100% -100%, 0 0'
}
</script>

<style scoped>
.glare-hover {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid;
  cursor: pointer;
}

.glare-hover--bare {
  display: block;
  border: none;
  background: none;
  border-radius: inherit;
  cursor: inherit;
}

.glare-hover__overlay {
  position: absolute;
  border-radius: inherit;
  inset: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .glare-hover__overlay {
    transition: none !important;
  }
}
</style>
