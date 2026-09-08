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
  MinecraftNameResolve,
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
   * 绑定 MC 账号（POST /me/minecraft）。BREAKING 两步流程：
   * 201 返回 pending（验证码引导态，无 id 字段）或已落库的 MinecraftAccount。
   * 本方法不做缓存写入/刷新，由视图层依据结果处理。
   */
  async function bindMinecraft(input: BindMinecraftInput): Promise<MinecraftBindResult> {
    return api.post<MinecraftBindResult>('/me/minecraft', input)
  }

  /**
   * 玩家名解析代查（GET /mc/resolve，后端 Worker 出网查 Mojang）。
   * 浏览器直连 api.mojang.com 被 CORS 拦截（必失败），一律走本端点。
   * 404 PLAYER_NOT_FOUND = 玩家不存在；502 = 上游故障；429 = 触发限流（带 resetAt）。
   */
  async function resolveMinecraftName(name: string): Promise<MinecraftNameResolve> {
    return api.get<MinecraftNameResolve>(`/mc/resolve?name=${encodeURIComponent(name)}`)
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
    resolveMinecraftName,
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
