<template>
  <span class="user-avatar" :style="{ width: sizePx, height: sizePx }">
    <img
      v-if="avatarUrl && !isTexture && !failed"
      :src="avatarUrl"
      :alt="alt"
      loading="lazy"
      @error="failed = true"
    />
    <span
      v-else-if="avatarUrl && isTexture"
      class="user-avatar-head"
      :style="skinHeadStyle(avatarUrl, props.size)"
    />
    <span v-else class="user-avatar-fallback" :style="{ fontSize: fallbackFont }">{{ initial }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { fetchSkinByName } from '@/lib/skin'
import { skinAvatar, skinHeadStyle } from '@/lib/minecraft'

/**
 * 用户头像（只读展示）：按 MC 角色名向后端查皮肤（GET /api/v1/skin/:name）。
 *
 * - skin 为角色名 / UUID → mc-heads.net 头部图；
 * - skin 为图片 URL → 皮肤纹理，抠「头正面 + 帽檐」合成 2D 头像；
 * - 查不到（未绑定 / 401 / 网络异常）或图片加载失败 → 站点用户名首字母占位。
 *
 * 站点用户名允许中文，与 MC 角色名不是一回事，所以 MC 名必须由调用方通过
 * `mcName` 传入；拿不到 MC 名时直接出首字母，不猜。
 */
const props = withDefaults(
  defineProps<{
    /** MC 角色名（主账号），空则直接首字母占位 */
    mcName?: string | null
    /** 站点用户名，仅用于首字母与 alt */
    name?: string
    size?: number
    alt?: string
  }>(),
  { size: 40, alt: '' },
)

const skin = ref<string | null>(null)
const failed = ref(false)

watch(
  () => props.mcName,
  async (mcName) => {
    failed.value = false
    skin.value = null
    if (!mcName) return
    const value = await fetchSkinByName(mcName)
    // 竞态防护：await 期间 mcName 可能已切换
    if (props.mcName === mcName) skin.value = value
  },
  { immediate: true },
)

// 2 倍尺寸交给 mc-heads 生成，CSS 再缩到 size，避免高分屏发虚
const avatar = computed(() => skinAvatar(skin.value, props.size * 2))
const avatarUrl = computed(() => avatar.value?.url ?? '')
const isTexture = computed(() => avatar.value?.texture ?? false)
const sizePx = computed(() => `${props.size}px`)
const fallbackFont = computed(() => `${Math.max(10, Math.round(props.size * 0.42))}px`)
const initial = computed(() =>
  (props.name?.trim()?.[0] ?? props.mcName?.trim()?.[0] ?? '?').toUpperCase(),
)
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

/* 皮肤纹理裁出的 2D 头像：背景两层（帽檐 + 脸），铺满容器 */
.user-avatar-head {
  width: 100%;
  height: 100%;
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
