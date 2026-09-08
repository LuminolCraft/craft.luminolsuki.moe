<template>
  <span class="user-avatar" :style="{ width: sizePx, height: sizePx }">
    <img
      v-if="!failed && userId"
      :src="avatarUrl"
      :alt="alt"
      loading="lazy"
      @error="failed = true"
    />
    <span v-else class="user-avatar-fallback" :style="{ fontSize: fallbackFont }">{{ initial }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { API_BASE_URL } from '@/lib/api-base'

/**
 * 用户头像（只读展示）。
 * 数据源：GET /api/v1/media/avatar/:userId —— MC 皮肤头像，由 MC 服务器插件推送到后端。
 * 约束（spec 减负②）：URL 绝不附加时间戳等缓存穿透参数，让后端 s-maxage 边缘缓存生效；
 * 204 / 加载失败 → 用户名首字母占位。
 */
const props = withDefaults(
  defineProps<{
    userId?: string | null
    name?: string
    size?: number
    alt?: string
  }>(),
  { size: 40, alt: '' },
)

const failed = ref(false)

// userId 变化时重置失败态（切换用户场景）
watch(
  () => props.userId,
  () => {
    failed.value = false
  },
)

/** 稳定 URL：仅由 userId 决定，保证 CDN 命中 */
const avatarUrl = computed(() => `${API_BASE_URL}/api/v1/media/avatar/${props.userId}`)

const sizePx = computed(() => `${props.size}px`)
const fallbackFont = computed(() => `${Math.max(10, Math.round(props.size * 0.42))}px`)
const initial = computed(() => (props.name?.trim()?.[0] ?? '?').toUpperCase())
const alt = computed(() => props.alt || props.name || 'avatar')
</script>

<style scoped>
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}

.user-avatar-fallback {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--primary-color);
  user-select: none;
}
</style>
