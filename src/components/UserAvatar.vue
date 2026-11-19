<template>
  <span class="user-avatar" :style="{ width: sizePx, height: sizePx }">
    <img
      v-if="!failed && userId"
      :src="displayUrl"
      :alt="alt"
      loading="lazy"
      @error="onImgError"
    />
    <span v-else class="user-avatar-fallback" :style="{ fontSize: fallbackFont }">{{ initial }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { API_BASE_URL } from '@/lib/api-base'
import { mcAvatarUrl } from '@/lib/minecraft'

/**
 * 用户头像（只读展示），两段式取图：
 *
 * 1. 首选 GET /api/v1/media/avatar/:userId —— MC 插件推送的真实游戏内皮肤
 *    （主账号口径，KV 瞬时缓存）。命中直接显示。
 * 2. 该接口无头像时返回 204 → `<img>` error → 取 GET /api/v1/media/avatar-source/:userId
 *    返回的主账号 { uuid, name, skin } 走 mc-heads 兜底：`skin` 本身是 http(s)
 *    图片地址就直接用，否则当 uuid / 皮肤名套 `mc-heads.net/avatar/<id>/<size>`。
 *    这样没进过服、插件还没推过头像的玩家也能看到近似头像。
 * 3. 兜底也失败 → 用户名首字母占位。
 *
 * 约束（spec 减负②）：media 接口 URL 绝不附加时间戳等缓存穿透参数，
 * 让后端 s-maxage 边缘缓存生效。
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
/** 兜底地址（皮肤直链或 mc-heads）：只有 media 接口无头像后才会填上。 */
const fallbackUrl = ref<string | null>(null)

// userId 变化时重置失败态与兜底地址（切换用户场景）
watch(
  () => props.userId,
  () => {
    failed.value = false
    fallbackUrl.value = null
  },
)

/** 稳定 URL：仅由 userId 决定，保证 CDN 命中 */
const avatarUrl = computed(() => `${API_BASE_URL}/api/v1/media/avatar/${props.userId}`)
const displayUrl = computed(() => fallbackUrl.value ?? avatarUrl.value)

const sizePx = computed(() => `${props.size}px`)
const fallbackFont = computed(() => `${Math.max(10, Math.round(props.size * 0.42))}px`)
const initial = computed(() => (props.name?.trim()?.[0] ?? '?').toUpperCase())
const alt = computed(() => props.alt || props.name || 'avatar')

async function onImgError(): Promise<void> {
  // 兜底地址也加载失败 → 直接首字母，不再发请求
  if (fallbackUrl.value) {
    failed.value = true
    return
  }
  const url = await resolveFallback(props.userId)
  if (url) fallbackUrl.value = url
  else failed.value = true
}

/** 向后端要主账号的皮肤身份，再拼第三方头像地址；任何异常都视为「无兜底」。 */
async function resolveFallback(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/media/avatar-source/${userId}`)
    if (!res.ok || res.status === 204) return null
    const body = (await res.json()) as {
      data?: { uuid?: string | null; name?: string | null; skin?: string | null }
    }
    const d = body?.data
    if (!d || (!d.skin && !d.name && !d.uuid)) return null
    // 2 倍尺寸交给 mc-heads 生成，CSS 再缩到 size，避免高分屏发虚
    return mcAvatarUrl(
      { uuid: d.uuid ?? '', name: d.name ?? '', skin: d.skin ?? null },
      props.size * 2,
    )
  } catch {
    return null
  }
}
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
