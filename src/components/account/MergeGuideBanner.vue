<template>
  <div v-if="visible" class="merge-banner" role="status">
    <div class="merge-banner-inner">
      <div class="merge-banner-copy">
        <p class="merge-banner-title">{{ t('auth.security.mergeBanner.title') }}</p>
        <p class="merge-banner-desc">{{ t('auth.security.mergeBanner.desc') }}</p>
      </div>
      <div class="merge-banner-actions">
        <button
          type="button"
          class="merge-banner-btn"
          :disabled="signOutPending"
          @click="onSignOut"
        >
          {{ t('auth.security.mergeBanner.signOut') }}
        </button>
        <button type="button" class="merge-banner-dismiss" @click="onDismiss">
          {{ t('auth.security.mergeBanner.dismiss') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

/** QQ 首登占位邮箱域名（后端生成的空壳账号标识，大小写不敏感） */
const QQ_PLACEHOLDER_DOMAIN = '@qq.oauth.local'
/** 关闭标记 localStorage key 前缀（按用户 id 隔离） */
const DISMISS_KEY_PREFIX = 'qq-merge-hint-dismissed:'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const dismissed = ref(false)
const signOutPending = ref(false)

/** 当前用户的关闭标记 key；me 为 null（未登录）时返回 null，不读写也不显示 */
const dismissKey = computed(() => (auth.me?.id ? `${DISMISS_KEY_PREFIX}${auth.me.id}` : null))

// 登录/登出/换号时重读关闭标记（key 变化即重查 localStorage）
watch(
  dismissKey,
  (key) => {
    dismissed.value = key !== null && localStorage.getItem(key) === '1'
  },
  { immediate: true }
)

const visible = computed(() => {
  // route.meta 随每次导航更新（useRoute 各字段均为派生响应），
  // hideChrome 页面（登录/注册等认证页）隐藏，普通页面恢复
  return (
    auth.isAuthenticated &&
    !!auth.me?.email?.toLowerCase().endsWith(QQ_PLACEHOLDER_DOMAIN) &&
    route.meta.hideChrome !== true &&
    !dismissed.value
  )
})

function onDismiss() {
  const key = dismissKey.value
  if (key) localStorage.setItem(key, '1')
  dismissed.value = true
}

async function onSignOut() {
  if (signOutPending.value) return
  signOutPending.value = true
  try {
    await auth.signOut()
    await router.push('/login')
  } finally {
    signOutPending.value = false
  }
}
</script>

<style scoped>
.merge-banner {
  width: 100%;
  border-bottom: 1px solid var(--border-color, var(--vercel-gray-100));
  background: color-mix(in srgb, var(--accent-color, #f59e0b) 6%, transparent);
  animation: merge-banner-in 0.3s ease-out both;
}

/* 内部 max-width 与站点 .container 一致（App.vue） */
.merge-banner-inner {
  max-width: var(--vercel-container-max-width);
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.6rem 1.2rem;
  padding: 0.85rem var(--spacing-4);
  border-left: 2px solid var(--accent-color, #f59e0b);
}

.merge-banner-copy {
  min-width: 0;
  flex: 1 1 24rem;
}

.merge-banner-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-color);
}

.merge-banner-desc {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.merge-banner-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.6rem;
}

.merge-banner-btn {
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--accent-color, #f59e0b);
  border-radius: 6px;
  background: transparent;
  color: var(--text-color);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background var(--vercel-duration-fast, 0.15s) var(--vercel-ease-out, ease);
}

.merge-banner-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent-color, #f59e0b) 15%, transparent);
}

.merge-banner-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.merge-banner-dismiss {
  padding: 0.4rem 0.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.82rem;
  cursor: pointer;
  transition: color var(--vercel-duration-fast, 0.15s) var(--vercel-ease-out, ease);
}

.merge-banner-dismiss:hover {
  color: var(--text-color);
}

@keyframes merge-banner-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .merge-banner {
    animation: none;
  }
}
</style>
