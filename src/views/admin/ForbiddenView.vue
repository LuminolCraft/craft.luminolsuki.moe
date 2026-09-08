<template>
  <div class="forbidden-page">
    <div class="forbidden-card">
      <p class="forbidden-code">403</p>
      <h1 class="forbidden-title">{{ t('settings.forbidden.title') }}</h1>
      <p class="forbidden-desc">{{ t('settings.forbidden.description') }}</p>
      <div class="forbidden-actions">
        <RouterLink to="/" class="forbidden-link primary">{{ t('settings.forbidden.backHome') }}</RouterLink>
        <RouterLink to="/settings/profile" class="forbidden-link">{{ t('settings.forbidden.backSettings') }}</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * /admin/forbidden —— 无权限 403 视图。
 * 独立于 /admin 布局（守卫对无权限用户返回本页，故本路由不得带 requiresPermission，避免循环）。
 */
const { t } = useI18n()
</script>

<style scoped>
.forbidden-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--background-color);
}

.forbidden-card {
  max-width: 26rem;
  text-align: center;
}

.forbidden-code {
  font-size: clamp(3rem, 10vw, 4.5rem);
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1;
  margin: 0 0 1rem;
  color: color-mix(in srgb, var(--text-color) 18%, transparent);
  font-variant-numeric: tabular-nums;
}

.forbidden-title {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: var(--text-color);
  margin: 0 0 0.7rem;
}

.forbidden-desc {
  font-size: 0.92rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 1.8rem;
}

.forbidden-actions {
  display: flex;
  justify-content: center;
  gap: 0.9rem;
  flex-wrap: wrap;
}

.forbidden-link {
  padding: 0.55rem 1.2rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-color);
  text-decoration: none;
  transition:
    background-color 0.15s ease,
    translate 0.15s ease;
}

.forbidden-link.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

.forbidden-link:hover {
  translate: 0 -1px;
}

.forbidden-link:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}
</style>
