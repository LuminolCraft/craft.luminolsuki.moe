import { computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNexusStore } from '@/stores/nexus'

/**
 * 当前登录用户的主账号 MC 角色名（头像取皮用）。
 *
 * 主账号口径 = `isMain`（最早绑定的账号，与后端头像/皮肤口径一致）；
 * 账号列表走 nexus store 的会话级缓存，登录后拉一次，路由切换不重复请求。
 * 站点用户名允许中文，不能当 MC 名用，所以头像必须由这里提供的名字去查皮肤。
 */
export function useSelfMinecraftName() {
  const auth = useAuthStore()
  const nexus = useNexusStore()

  watch(
    () => auth.isAuthenticated,
    (authenticated) => {
      if (!authenticated) return
      void nexus.fetchMyMinecraft().catch(() => {})
    },
    { immediate: true },
  )

  return computed(
    () =>
      nexus.minecraftAccounts.find((acc) => acc.isMain)?.name ??
      nexus.minecraftAccounts[0]?.name ??
      '',
  )
}
