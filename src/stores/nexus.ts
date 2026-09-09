import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import type { User } from '@/types/auth'
import type {
  AccountLink,
  Ban,
  BindMinecraftInput,
  CreateAccountLinkInput,
  MinecraftAccount,
  MinecraftBindPending,
  MinecraftBindResult,
} from '@/types/nexus'

/**
 * Nexus 用户域数据 store —— 「前端减负约束①：会话级缓存」的载体。
 *
 * 规则：
 * - /me/minecraft、/me/ban、关联列表在登录会话内只拉取一次，存内存
 * - 仅当对应变更操作成功后失效重拉（局部更新 + 标记重取）
 * - 禁止路由切换重拉、轮询、focus 刷新
 * - 未登录/401 时清空（交由调用方处理，本 store 不做认证判断）
 */

export const useNexusStore = defineStore('nexus', () => {
  // ---------- Minecraft 账号 ----------
  const minecraftAccounts = ref<MinecraftAccount[]>([])
  const minecraftLoaded = ref(false)

  async function fetchMyMinecraft(force = false): Promise<MinecraftAccount[]> {
    if (minecraftLoaded.value && !force) return minecraftAccounts.value
    minecraftAccounts.value = await api.get<MinecraftAccount[]>('/me/minecraft')
    minecraftLoaded.value = true
    return minecraftAccounts.value
  }

  /**
   * 查询当前用户未过期的 pending 预绑定（无则 null）。手册 §5（2026-09-08）：
   * 跨浏览器/跨设备恢复引导态的真相源，仅在绑定页挂载与重提后调用，勿轮询。
   */
  async function fetchMinecraftPending(): Promise<MinecraftBindPending | null> {
    return await api.get<MinecraftBindPending | null>('/me/minecraft/pending')
  }

  /**
   * 绑定 MC 账号（POST /me/minecraft）。两步流程：201 一律返回 pending
   * （验证码引导态，无 id 字段；只输名字，uuid 由插件核验时上报）。
   * 本方法不做缓存写入/刷新，由视图层依据结果处理。
   * 409 MINECRAFT_BIND_PENDING = 已有进行中的绑定（单 pending 强制）。
   */
  async function bindMinecraft(input: BindMinecraftInput): Promise<MinecraftBindResult> {
    return api.post<MinecraftBindResult>('/me/minecraft', input)
  }

  /**
   * 手动取消进行中的绑定（DELETE /me/minecraft/pending，幂等）。
   * 取消后可立即重新发起；过期的 pending 由后端自愈清理，无需先查。
   */
  async function cancelMinecraftPending(): Promise<void> {
    await api.delete('/me/minecraft/pending')
  }

  async function unbindMinecraft(id: string) {
    await api.delete<unknown>(`/me/minecraft/${id}`)
    minecraftAccounts.value = minecraftAccounts.value.filter((a) => a.id !== id)
    // 解绑会影响关联与封禁记录 → 失效缓存
    linksByAccount.value = {}
    bansLoaded.value = false
  }

  // ---------- 主号↔小号关联（按账号 id 缓存） ----------
  const linksByAccount = ref<Record<string, AccountLink[]>>({})

  async function fetchLinksForAccount(accountId: string, force = false): Promise<AccountLink[]> {
    const cached = linksByAccount.value[accountId]
    if (cached && !force) return cached
    const links = await api.get<AccountLink[]>(`/me/minecraft/${accountId}/links`)
    linksByAccount.value = { ...linksByAccount.value, [accountId]: links }
    return links
  }

  async function createAccountLink(input: CreateAccountLinkInput) {
    await api.post<AccountLink>('/account-links', input)
    // 双向失效
    delete linksByAccount.value[input.ownerId]
    delete linksByAccount.value[input.linkedId]
    linksByAccount.value = { ...linksByAccount.value }
  }

  async function removeAccountLink(link: AccountLink) {
    await api.delete<unknown>(`/account-links/${link.id}`)
    delete linksByAccount.value[link.ownerMinecraftAccountId]
    delete linksByAccount.value[link.linkedMinecraftAccountId]
    linksByAccount.value = { ...linksByAccount.value }
  }

  // ---------- 本人有效封禁 ----------
  const myBans = ref<Ban[]>([])
  const bansLoaded = ref(false)

  async function fetchMyBans(force = false): Promise<Ban[]> {
    if (bansLoaded.value && !force) return myBans.value
    myBans.value = await api.get<Ban[]>('/me/ban')
    bansLoaded.value = true
    return myBans.value
  }

  // ---------- 资料更新（PATCH /me） ----------
  async function updateMe(input: { username?: string; email?: string }): Promise<User> {
    const updated = await api.patch<User>('/me', input)
    // 同步 auth store 的 me（避免多页面读到旧资料；不减负额外交互）
    const { useAuthStore } = await import('@/stores/auth')
    useAuthStore().me = updated
    return updated
  }

  /** 登出/清态时由 auth store 调用 */
  function reset() {
    minecraftAccounts.value = []
    minecraftLoaded.value = false
    linksByAccount.value = {}
    myBans.value = []
    bansLoaded.value = false
  }

  /**
   * 管理员强制解绑某用户的 MC 账号（DELETE /admin/users/:userId/minecraft/:accountId）。
   * 手册 §6：404 USER_NOT_FOUND / MINECRAFT_ACCOUNT_NOT_FOUND，权限 admin/owner。
   */
  async function adminForceUnbindMinecraft(userId: string, accountId: string) {
    await api.delete<unknown>(`/admin/users/${userId}/minecraft/${accountId}`)
  }

  return {
    minecraftAccounts,
    minecraftLoaded,
    linksByAccount,
    myBans,
    bansLoaded,
    fetchMyMinecraft,
    fetchMinecraftPending,
    bindMinecraft,
    cancelMinecraftPending,
    unbindMinecraft,
    fetchLinksForAccount,
    createAccountLink,
    removeAccountLink,
    fetchMyBans,
    updateMe,
    adminForceUnbindMinecraft,
    reset,
  }
})
