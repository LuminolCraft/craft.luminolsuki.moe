<!--
  CursorLayer — 全站自绘光标层（Technical HUD 风格）

  它不属于任何一个页面：由 useUiFx 在 app 启动时挂到 body 上，全站可用。
  想关掉就改 src/config/ui-fx.ts 里的 cursor.enabled。

  两层：
  - 中心点：1:1 跟手，标出真实点击位置。
  - 追踪环：轻微延迟制造跟随惯性。

  三种状态（由 useCustomCursor 写到根节点的 data-state）：
  - idle  指针在普通区域：点小、环细，取页面文字色（--ink），浅色深色都清楚。
  - hover 指针在链接 / 按钮 / [data-cursor-hover] 上：换成强调色并放大。
  - drag  指针在 [data-drag] 区域上：放大更多，环变方角虚线，提示可拖动。

  刻意没有「跟随元素四角的框」：那种框挂在 fixed 层上，页面一滚动就与元素脱开。
  元素的定格框由 MagneticCornerFrame / useUiFx 长在元素自己身上，天然随滚动。

  实现见 @/composables/useCustomCursor；本文件只负责渲染两层 DOM 与状态样式。
-->
<template>
  <div v-if="enabled" ref="rootRef" class="cursor-layer" :data-state="state" aria-hidden="true">
    <span ref="ringRef" class="cursor-layer__ring" />
    <span ref="dotRef" class="cursor-layer__dot" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { supportsCustomCursor, useCustomCursor } from '@/composables/useCustomCursor'
import { UI_FX } from '@/config/ui-fx'

const enabled = ref(false)

const rootRef = ref<HTMLElement | null>(null)
const dotRef = ref<HTMLElement | null>(null)
const ringRef = ref<HTMLElement | null>(null)

const { hovering, dragging, bind } = useCustomCursor()

/** 状态交给 CSS：尺寸与配色都在样式里，JS 只报告「指针压在哪类东西上」 */
const state = computed(() => (dragging.value ? 'drag' : hovering.value ? 'hover' : 'idle'))

onMounted(() => {
  if (!UI_FX.enabled || !UI_FX.cursor.enabled) return
  if (!supportsCustomCursor()) return

  enabled.value = true

  // enabled 切换后 DOM 才存在，等一帧再绑定
  requestAnimationFrame(() => {
    const root = rootRef.value
    if (!root) return
    bind(root, {
      dot: UI_FX.cursor.dot ? dotRef.value : null,
      ring: UI_FX.cursor.ring ? ringRef.value : null,
    })
  })
})
</script>

<style scoped>
.cursor-layer {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  contain: layout style;
  /* idle 取页面文字色：浅色模式下是深色点、深色模式下是浅色点，两种主题都清楚 */
  --cursor-mark: var(--ink, #171717);
  --cursor-size: 5px;
  --cursor-ring-size: 26px;
  --cursor-ring-opacity: 0.5;
  --cursor-ring-scale: 1;
}

.cursor-layer[data-state='hover'] {
  --cursor-mark: var(--accent, #a78bfa);
  --cursor-size: 9px;
  --cursor-ring-size: 34px;
  --cursor-ring-opacity: 0.9;
  --cursor-ring-scale: 1.06;
}

.cursor-layer[data-state='drag'] {
  --cursor-mark: var(--accent, #a78bfa);
  --cursor-size: 9px;
  --cursor-ring-size: 34px;
  --cursor-ring-opacity: 0.9;
  --cursor-ring-scale: 1.12;
}

.cursor-layer__dot {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--cursor-size);
  height: var(--cursor-size);
  /* 直角小方块：与角标的 L 形同一种语言 */
  border-radius: 1px;
  background: var(--cursor-mark);
  transition:
    width 0.18s ease,
    height 0.18s ease,
    background-color 0.18s ease;
  will-change: transform, opacity;
}

.cursor-layer__ring {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--cursor-ring-size);
  height: var(--cursor-ring-size);
  border: 1px solid color-mix(in srgb, var(--cursor-mark) 55%, transparent);
  border-radius: 50%;
  opacity: var(--cursor-ring-opacity);
  /* 用独立的 scale 属性，与 GSAP 写的 transform: translate 互不干扰 */
  scale: var(--cursor-ring-scale);
  transition:
    width 0.18s ease,
    height 0.18s ease,
    border-color 0.18s ease,
    border-radius 0.18s ease,
    opacity 0.18s ease,
    scale 0.18s ease;
  will-change: transform, opacity;
}

/* 拖动区：方角虚线环，与圆形追踪环明确区分 */
.cursor-layer[data-state='drag'] .cursor-layer__ring {
  border-radius: 4px;
  border-style: dashed;
}

/*
  主题切换的像素快照帧（[data-vt] 只在那一帧存在）禁止过渡：
  否则光标会在快照里留下旧配色，翻页动画出现色差。
*/
:global(:root[data-vt]) .cursor-layer__dot,
:global(:root[data-vt]) .cursor-layer__ring {
  transition: none;
}

/* 触摸设备 / 减少动效：整个光标层不显示 */
@media (pointer: coarse), (hover: none), (prefers-reduced-motion: reduce) {
  .cursor-layer {
    display: none;
  }
}
</style>

<!--
  系统光标的隐藏写在这里、而不是每个页面各写一遍：
  自绘光标是全站的，只要它挂上了，全站就该用同一个指针。
  用 data 属性做门禁（由 useCustomCursor 在 bind 成功后写到 <html>），
  这样「光标层没起来」时系统光标不会被提前藏掉。

  !important 是必要的：页面与组件里的 `.some-button[data-v-xxx] { cursor: pointer }`
  这类规则权重高于本规则，不加就压不住「小手指」。
-->
<style>
html[data-custom-cursor='on'],
html[data-custom-cursor='on'] body,
html[data-custom-cursor='on'] body * {
  cursor: none !important;
}

/* 输入类控件保留原生光标，否则没法精确放置插入符 */
html[data-custom-cursor='on'] body :is(input, textarea, select, [contenteditable='true']) {
  cursor: auto !important;
}
</style>
