<!--
  HomeCursorHud — 自定义光标（Technical HUD 风格）

  与 Magnetic Corner Brackets 说同一种语言：细线、直角、克制。
  组成：中心点（1:1 跟手，标出真实点击位置）+ 追踪环（轻微延迟，制造惯性感）
       + 四个小角标（经过可交互元素时展开，经过 [data-drag] 区域时更大）。

  注意：不使用 CSS `cursor: url(...)` 图片方案——那套有 32px 尺寸上限、
  热点坐标、失败时静默失效三个坑；这里改成隐藏系统光标 + pointer-events:none 的定位元素，
  命中点仍然精确。

  仅在精确指针且未开启 reduced-motion 时渲染。
-->
<template>
  <div v-if="enabled" class="cursor-hud" aria-hidden="true">
    <span ref="ringRef" class="cursor-hud__ring" />
    <span ref="bracketsRef" class="cursor-hud__brackets">
      <i class="cursor-hud__corner cursor-hud__corner--tl" />
      <i class="cursor-hud__corner cursor-hud__corner--tr" />
      <i class="cursor-hud__corner cursor-hud__corner--bl" />
      <i class="cursor-hud__corner cursor-hud__corner--br" />
    </span>
    <span ref="dotRef" class="cursor-hud__dot" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supportsCustomCursor, useCustomCursor } from '@/composables/useCustomCursor'

const enabled = ref(false)

const dotRef = ref<HTMLElement | null>(null)
const ringRef = ref<HTMLElement | null>(null)
const bracketsRef = ref<HTMLElement | null>(null)

const { bind } = useCustomCursor()

onMounted(() => {
  if (!supportsCustomCursor()) return
  enabled.value = true

  // enabled 切换后 DOM 才存在，等一帧再绑定
  requestAnimationFrame(() => {
    const root = dotRef.value?.parentElement ?? null
    if (!root) return
    bind(root, {
      dot: dotRef.value,
      ring: ringRef.value,
      brackets: bracketsRef.value,
    })
  })
})
</script>

<style scoped>
.cursor-hud {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  contain: layout style;
}

.cursor-hud__dot {
  position: absolute;
  top: 0;
  left: 0;
  width: 5px;
  height: 5px;
  background: var(--accent, #a78bfa);
  border-radius: 1px;
  will-change: transform, opacity;
}

.cursor-hud__ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 26px;
  height: 26px;
  border: 1px solid color-mix(in srgb, var(--accent, #a78bfa) 55%, transparent);
  border-radius: 50%;
  opacity: 0.55;
  will-change: transform, opacity;
}

.cursor-hud__brackets {
  position: absolute;
  top: 0;
  left: 0;
  width: 34px;
  height: 34px;
  color: var(--ink, #171717);
  will-change: transform, opacity;
}

.cursor-hud__corner {
  position: absolute;
  width: 7px;
  height: 7px;
}

.cursor-hud__corner--tl {
  top: 0;
  left: 0;
  border-top: 1px solid currentColor;
  border-left: 1px solid currentColor;
}

.cursor-hud__corner--tr {
  top: 0;
  right: 0;
  border-top: 1px solid currentColor;
  border-right: 1px solid currentColor;
}

.cursor-hud__corner--bl {
  bottom: 0;
  left: 0;
  border-bottom: 1px solid currentColor;
  border-left: 1px solid currentColor;
}

.cursor-hud__corner--br {
  bottom: 0;
  right: 0;
  border-bottom: 1px solid currentColor;
  border-right: 1px solid currentColor;
}

/* 触摸设备 / 减少动效：整个光标层不显示 */
@media (pointer: coarse), (hover: none), (prefers-reduced-motion: reduce) {
  .cursor-hud {
    display: none;
  }
}
</style>
