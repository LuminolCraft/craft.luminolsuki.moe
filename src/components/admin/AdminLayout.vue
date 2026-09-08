<template>
  <div class="admin-shell">
    <aside class="admin-sidebar" :class="{ open: sidebarOpen }" aria-label="管理后台导航">
      <div class="admin-side-head">
        <p class="admin-overline">{{ auth.me?.username }}</p>
        <p class="admin-shell-title">{{ t('admin.shellTitle') }}</p>
      </div>
      <nav class="admin-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="admin-nav-item"
          :class="{ active: isActive(item.to) }"
          @click="sidebarOpen = false"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="admin-side-foot">
        <RouterLink to="/" class="admin-back">{{ t('admin.nav.backToSite') }}</RouterLink>
      </div>
    </aside>

    <div v-if="sidebarOpen" class="admin-scrim" @click="sidebarOpen = false" />

    <main class="admin-main">
      <header class="admin-topbar">
        <button
          type="button"
          class="admin-burger"
          :aria-expanded="sidebarOpen"
          aria-label="menu"
          @click="sidebarOpen = !sidebarOpen"
        >
          <span /><span /><span />
        </button>
        <p class="admin-topbar-title">{{ t('admin.shellTitle') }}</p>
        <RouterLink to="/" class="admin-back-top">{{ t('admin.nav.backToSite') }}</RouterLink>
      </header>
      <div class="admin-content">
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
 * 管理后台布局壳：左侧边栏（用户/封禁/审计）+ 顶栏（返回前台）。
 * ≤896px 侧边栏折叠为汉堡抽屉。
 * 访问保证：/admin 父级路由守卫已用 hasPermission('admin:access') 拦截，壳内不做二次权限判断。
 */
const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const { create, reduceMotion } = useGsap()

const sidebarOpen = ref(false)

const navItems = computed(() => [
  { to: '/admin/users', label: t('admin.nav.users') },
  { to: '/admin/bans', label: t('admin.nav.bans') },
  { to: '/admin/audit', label: t('admin.nav.audit') },
])

function isActive(to: string) {
  // 用户详情页归属"用户"高亮
  if (to === '/admin/users' && route.name === 'AdminUserDetail') return true
  return route.path === to
}

create((g) => {
  if (reduceMotion()) return
  g.from('.admin-sidebar', { autoAlpha: 0, x: -16, duration: 0.5, ease: 'power3.out' })
  g.from('.admin-content', { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power3.out', delay: 0.08 })
})
</script>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 14rem minmax(0, 1fr);
  min-height: 100dvh;
  background: var(--background-color);
}

/* ---------- 侧边栏 ---------- */
.admin-sidebar {
  position: sticky;
  top: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  padding: 1.6rem 1.1rem;
  border-right: 1px solid var(--border-color);
  background: var(--background-color);
  z-index: 30;
}

.admin-overline {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 0.3rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-shell-title {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--text-color);
  margin: 0;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-nav-item {
  display: block;
  padding: 0.55rem 0.8rem;
  border-radius: 6px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.admin-nav-item:hover {
  color: var(--text-color);
  background: color-mix(in srgb, var(--text-color) 5%, transparent);
}

.admin-nav-item.active {
  color: var(--text-color);
  font-weight: 600;
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.admin-nav-item:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

.admin-side-foot {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.admin-back {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.admin-back:hover {
  color: var(--link-color);
}

/* ---------- 主区 ---------- */
.admin-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: none;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1.2rem;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--background-color) 88%, transparent);
  backdrop-filter: blur(10px);
}

.admin-topbar-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  flex: 1;
}

.admin-back-top {
  font-size: 0.82rem;
  color: var(--link-color);
  text-decoration: none;
}

.admin-burger {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0.45rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
}

.admin-burger span {
  width: 16px;
  height: 1.5px;
  background: var(--text-color);
}

.admin-burger:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: 2px;
}

.admin-content {
  flex: 1;
  padding: clamp(1.5rem, 4vw, 2.6rem);
  min-width: 0;
}

.admin-scrim {
  display: none;
}

/* ---------- 移动端：汉堡抽屉 ---------- */
@media (max-width: 896px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(16rem, 78vw);
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    box-shadow: 0 0 40px rgb(0 0 0 / 0.25);
  }

  .admin-sidebar.open {
    transform: translateX(0);
  }

  .admin-scrim {
    display: block;
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.45);
    z-index: 25;
  }

  .admin-topbar {
    display: flex;
  }

  .admin-content {
    padding: 1.2rem;
  }
}
</style>
