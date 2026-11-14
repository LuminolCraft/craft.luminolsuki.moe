<template>
  <!-- 全局 toast 落点：右下角竖向堆叠，新条目在下方；每条自带滑出/上滑关闭 -->
  <div class="toast-host" aria-live="polite">
    <SwipeToast
      v-for="item in toast.items"
      :key="item.id"
      :title="item.title"
      :description="item.description ?? ''"
      :duration="item.duration"
      :background="THEME.card"
      :color="THEME.ink"
      :fuse-color="fuseOf(item.variant)"
      :width="356"
      :radius="12"
      close-button
      inline
      @close="toast.remove(item.id)"
    />
  </div>
</template>

<script setup lang="ts">
import SwipeToast from '@/components/bits/SwipeToast.vue'
import { useToastStore, type ToastVariant } from '@/stores/toast'

/**
 * 全站消息提示宿主：挂在 App 根部一次即可，业务侧只调 useToastStore()。
 * 颜色全部指向主题变量，深浅主题自动跟随（不写死 hex）。
 */
const toast = useToastStore()

const THEME = {
  card: 'var(--card-bg)',
  ink: 'var(--text-color)',
  info: 'var(--primary-color)',
  success: 'var(--success-color, #30a46c)',
  error: 'var(--error-color, #e5484d)',
} as const

function fuseOf(variant: ToastVariant) {
  return variant === 'success' ? THEME.success : variant === 'error' ? THEME.error : THEME.info
}
</script>

<style scoped>
.toast-host {
  position: fixed;
  right: 32px;
  bottom: calc(32px + env(safe-area-inset-bottom, 0px));
  z-index: 999999999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(356px, calc(100vw - 64px));
  pointer-events: none;
}
.toast-host > * {
  pointer-events: auto;
}

@media (max-width: 600px) {
  .toast-host {
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    width: min(356px, calc(100vw - 32px));
  }
}
</style>
