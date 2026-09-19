<template>
  <div class="settings-shell" ref="shellRef">
    <aside class="settings-sidebar" aria-label="设置导航">
      <div class="settings-side-head">
        <p class="settings-overline">{{ t('settings.nav.profile') }}</p>
        <p class="settings-side-user">{{ auth.me?.username }}</p>
      </div>
      <nav class="settings-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="settings-nav-item"
          :class="{ active: isActive(item.to) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>

    <main class="settings-main">
      <div class="settings-content">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGsap } from '@/composables/useGsap'

/**
 * 用户中心布局壳：桌面左侧边栏（资料/Minecraft/安全）+ 内容区。
 * ≤896px 侧边栏变顶部横向标签条（见样式底部）。
 * 减负约束：本壳不发起任何数据请求，数据由子页面经 store 会话级缓存管理。
 */
const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const { create, reduceMotion } = useGsap()

const shellRef = ref<HTMLElement | null>(null)

const navItems = computed(() => [
  { to: '/settings/profile', label: t('settings.nav.profile') },
  { to: '/settings/minecraft', label: t('settings.nav.minecraft') },
  { to: '/settings/security', label: t('settings.nav.security') },
])

function isActive(to: string) {
  return route.path === to
}

create((g) => {
  if (reduceMotion()) return
  g.from('.settings-sidebar', { autoAlpha: 0, x: -16, duration: 0.5, ease: 'power3.out' })
  g.from('.settings-content', { autoAlpha: 0, y: 18, duration: 0.55, ease: 'power3.out', delay: 0.1 })
})
</script>

<style scoped>
.settings-shell {
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr);
  gap: 2.5rem;
  max-width: 66rem;
  margin: 0 auto;
  padding: clamp(2rem, 6vh, 4rem) 1.5rem 4rem;
  align-items: start;
  min-height: 60vh;
}

/* ---------- 侧边栏 ---------- */
.settings-sidebar {
  position: sticky;
  top: calc(var(--nav-height, 4rem) + 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

.settings-overline {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--primary-color);
  margin: 0 0 0.35rem;
}

.settings-side-user {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-left: 1px solid var(--border-color);
}

.settings-nav-item {
  display: block;
  padding: 0.55rem 0 0.55rem 1rem;
  margin-left: -1px;
  border-left: 2px solid transparent;
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.settings-nav-item:hover {
  color: var(--text-color);
}

.settings-nav-item.active {
  color: var(--text-color);
  font-weight: 600;
  border-left-color: var(--primary-color);
}

.settings-nav-item:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
  border-radius: 4px;
}

/* ---------- 内容区 ---------- */
.settings-main {
  min-width: 0;
}

.settings-content {
  min-width: 0;
}

/* ---------- 移动端：顶部横向标签 ---------- */
@media (max-width: 896px) {
  .settings-shell {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    /* 64px 固定导航 + 呼吸：原先 1.5rem 会让标签条与每个 h1 压在导航下面 */
    padding-top: calc(4rem + 1.25rem);
  }

  .settings-sidebar {
    position: static;
  }

  .settings-side-head {
    display: none;
  }

  .settings-nav {
    flex-direction: row;
    gap: 0.25rem;
    border-left: none;
    border-bottom: 1px solid var(--border-color);
    overflow-x: auto;
    /* 保留细滚动条作为可横向滚动的可见提示（原先隐藏滚动条，英文文案被裁时看不出能滚） */
    scrollbar-width: thin;
  }

  .settings-nav::-webkit-scrollbar {
    height: 4px;
  }

  .settings-nav::-webkit-scrollbar-thumb {
    background: var(--primary-color);
    border-radius: 2px;
  }

  .settings-nav-item {
    margin-left: 0;
    padding: 0.6rem 0.9rem;
    border-left: none;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    font-size: 0.88rem;
  }

  .settings-nav-item.active {
    border-bottom-color: var(--primary-color);
  }
}

/* 超窄屏：标签内边距再收一档，中文三标签无需横向滚动 */
@media (max-width: 480px) {
  .settings-nav-item {
    padding: 0.6rem 0.7rem;
    font-size: 0.84rem;
  }
}
</style>
