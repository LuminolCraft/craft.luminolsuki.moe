<!--
  CursorLayer — 全站自绘光标层（Technical HUD 风格）

  它不属于任何一个页面：由 useUiFx 在 app 启动时挂到 body 上，全站可用。
  想关掉就改 src/config/ui-fx.ts 里的 cursor.enabled。

  只有两层：
  - 中心点：1:1 跟手，标出真实点击位置。
  - 追踪环：轻微延迟制造跟随惯性；指针压在链接 / 按钮 / 拖拽区上时放大。

  刻意没有「跟随元素四角的框」：那种框挂在 fixed 层上，页面一滚动就与元素脱开。
  元素的定格框由 MagneticCornerFrame / useUiFx 长在元素自己身上，天然随滚动。

  实现见 @/composables/useCustomCursor；本文件只负责渲染两层 DOM。
  只用 pointer-events: none 的定位元素，命中点仍然精确。
  仅在精确指针且未开启 reduced-motion 时渲染；系统光标的隐藏由页面侧 cursor: none 完成。
-->
<template>
  <div v-if="enabled" ref="rootRef" class="cursor-layer" aria-hidden="true">
    <span ref="ringRef" class="cursor-layer__ring" />
    <span ref="dotRef" class="cursor-layer__dot" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supportsCustomCursor, useCustomCursor } from '@/composables/useCustomCursor'
import { UI_FX } from '@/config/ui-fx'

const enabled = ref(false)

const rootRef = ref<HTMLElement | null>(null)
const dotRef = ref<HTMLElement | null>(null)
const ringRef = ref<HTMLElement | null>(null)

const { bind } = useCustomCursor()

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
}

.cursor-layer__dot {
  position: absolute;
  top: 0;
  left: 0;
  width: 5px;
  height: 5px;
  /* 直角小方块：与角标的 L 形说是同一种语言 */
  border-radius: 1px;
  background: var(--fx-accent, #a78bfa);
  will-change: transform, opacity;
}

.cursor-layer__ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 26px;
  height: 26px;
  border: 1px solid color-mix(in srgb, var(--fx-accent, #a78bfa) 55%, transparent);
  border-radius: 50%;
  opacity: 0.55;
  will-change: transform, opacity;
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
-->
<style>
html[data-custom-cursor='on'],
html[data-custom-cursor='on'] body,
html[data-custom-cursor='on'] body * {
  cursor: none;
}

/* 输入类控件保留原生光标，否则没法精确放置插入符 */
html[data-custom-cursor='on'] body :is(input, textarea, select, [contenteditable='true']) {
  cursor: auto;
}
</style>
