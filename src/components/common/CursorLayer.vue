<!--
  CursorLayer — 全站自定义光标层（Technical HUD 风格）

  它不属于任何一个页面：由 useUiFx 在 app 启动时挂到 body 上，全站可用。
  想关掉就改 src/config/ui-fx.ts 里的 cursor.enabled。

  组成：
  - 中心点：1:1 跟手，标出真实点击位置。
  - 追踪环：轻微延迟，制造跟随惯性。
  - 四角：**对齐到目标元素的 rect**，随元素尺寸变化。目标是 `[data-mcf]` 元素角标框
    （此时让位给元素的四角表现「锁定」）或 `[data-drag]` 可拖拽区；两者都没有时四角淡出。

  实现见 @/composables/useCustomCursor；本文件只负责渲染三层 DOM。
  只用 pointer-events: none 的定位元素，不改系统光标，命中点仍然精确。
  仅在精确指针且未开启 reduced-motion 时渲染。
-->
<template>
  <div v-if="enabled" ref="rootRef" class="cursor-layer" aria-hidden="true">
    <span ref="ringRef" class="cursor-layer__ring" />
    <span ref="bracketsRef" class="cursor-layer__brackets">
      <i class="cursor-layer__corner cursor-layer__corner--tl" />
      <i class="cursor-layer__corner cursor-layer__corner--tr" />
      <i class="cursor-layer__corner cursor-layer__corner--bl" />
      <i class="cursor-layer__corner cursor-layer__corner--br" />
    </span>
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
const bracketsRef = ref<HTMLElement | null>(null)

const { bind } = useCustomCursor({
  yieldToFrames: UI_FX.cursor.yieldToFrames,
})

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
      brackets: bracketsRef.value,
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

/* 四角层：位置与尺寸都由 JS 对齐目标 rect（x / y / width / height） */
.cursor-layer__brackets {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  color: var(--fx-ink, #171717);
  will-change: transform, width, height, opacity;
}

.cursor-layer__corner {
  position: absolute;
  pointer-events: none;
  inset: auto;
  flex: 0 0 auto;
  box-sizing: border-box;
  /* 臂长跟随目标元素尺寸（由 JS 写到根节点的 --fx-corner-arm） */
  width: var(--fx-corner-arm, 14px);
  height: var(--fx-corner-arm, 14px);
}

.cursor-layer__corner--tl {
  top: 0;
  left: 0;
  border-top: 1px solid currentColor;
  border-left: 1px solid currentColor;
}

.cursor-layer__corner--tr {
  top: 0;
  right: 0;
  border-top: 1px solid currentColor;
  border-right: 1px solid currentColor;
}

.cursor-layer__corner--bl {
  bottom: 0;
  left: 0;
  border-bottom: 1px solid currentColor;
  border-left: 1px solid currentColor;
}

.cursor-layer__corner--br {
  bottom: 0;
  right: 0;
  border-bottom: 1px solid currentColor;
  border-right: 1px solid currentColor;
}

/* 触摸设备 / 减少动效：整个光标层不显示 */
@media (pointer: coarse), (hover: none), (prefers-reduced-motion: reduce) {
  .cursor-layer {
    display: none;
  }
}
</style>
