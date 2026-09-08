<template>
  <!-- submit 按钮：不要 @click.prevent —— 阻止默认行为会连表单提交一起拦掉（@submit 永远不触发） -->
  <button type="submit" class="auth-btn" :disabled="disabled || loading">
    <span v-if="loading" class="auth-btn-spinner" aria-hidden="true"></span>
    <span class="auth-btn-label"><slot /></span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  loading?: boolean
  disabled?: boolean
}>()
</script>

<style scoped>
.auth-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 15px 28px;
  background: var(--vercel-black);
  color: var(--vercel-white);
  border: none;
  border-radius: 6px;
  font-size: var(--vercel-font-size-button, 0.875rem);
  font-weight: 500;
  line-height: 1.43;
  letter-spacing: 0;
  cursor: pointer;
  overflow: hidden;
  box-shadow: var(--shadow-border);
  /* 注意：不要对 transform/opacity 加 CSS transition —— 会与 GSAP 入场动画冲突，
     导致按钮卡在动画初始态（opacity: 0 / visibility: hidden）。hover 位移用独立 translate 属性。 */
  transition:
    translate 0.2s ease-out,
    box-shadow 0.15s ease-out;
}
.auth-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.16), transparent);
  transition: left 0.45s ease;
}
.auth-btn:hover:not(:disabled) {
  translate: 0 -1px;
  box-shadow: var(--shadow-hover);
}
.auth-btn:hover:not(:disabled)::before {
  left: 100%;
}
.auth-btn:active:not(:disabled) {
  translate: 0 0;
}
.auth-btn:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}
.auth-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.auth-btn-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--vercel-white) 30%, transparent);
  border-top-color: var(--vercel-white);
  animation: auth-btn-spin 0.7s linear infinite;
}
@keyframes auth-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
