import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { authClient, toAppError } from '@/lib/auth-client'
import { resolveInternalPath } from '@/utils/internalPath'
import { useAuthorizationStore } from '@/stores/authorization'
import { useNexusStore } from '@/stores/nexus'
import type { AppError, SessionInfo, SessionRevokeResult, User } from '@/types/auth'

/** 这些 401 code 一律视为"未登录"并清空本地用户态（v1 文档 §19/§20） */
export const UNAUTH_CODES: ReadonlySet<string> = new Set([
  'AUTH_REQUIRED',
  'UNAUTHORIZED',
  'AUTH_SESSION_EXPIRED',
  'AUTH_SESSION_REVOKED',
])

/** 跨标签页登录态同步：登录/登出时写入，其他标签页监听 storage 事件后重新校验会话 */
export const AUTH_SYNC_KEY = 'nexus-auth-event'

function broadcastAuthChange() {
  try {
    localStorage.setItem(AUTH_SYNC_KEY, String(Date.now()))
  } catch {
    /* storage 不可用（隐私模式等）忽略——仅影响跨标签页实时同步 */
  }
}

/** sessionStorage key：记录最近一次 OAuth 登录/绑定的 provider 标签（QQ/GitHub） */
export const OAUTH_PROVIDER_KEY = 'oauth-provider-label'

/**
 * 认证 store = UI 缓存（v1 文档 §7/§8）。
 *
 * 正确模型：Better Auth Session（/api/auth/get-session）→ GET /api/v1/me → Store → UI。
 * - `me` 是 Nexus 业务用户（/api/v1/me，统一 Envelope）
 * - 登录态 Source of Truth 是服务端 Better Auth Session，store 不持有任何 Token
 * - 页面刷新后必须重新向服务端确认，不依赖本地持久化
 */
/** Better Auth account 行（GET /api/auth/list-accounts 元素） */
export interface LinkedAccount {
  id: string
  providerId: string
  accountId: string
  createdAt?: number
  updatedAt?: number
  scopes?: string[] | null
  [key: string]: unknown
}

export const useAuthStore = defineStore('auth', () => {
  const me = ref<User | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const sessions = ref<SessionInfo[]>([])
  const linkedAccounts = ref<LinkedAccount[]>([])

  const isAuthenticated = computed(() => me.value !== null)

  /** 记录本次发起的 OAuth provider 标签，供回调页识别登录方式（storage 不可用忽略） */
  function setOAuthProviderLabel(label: 'QQ' | 'GitHub') {
    try {
      sessionStorage.setItem(OAUTH_PROVIDER_KEY, label)
    } catch {
      /* storage 不可用忽略 */
    }
  }

  function clearAuthState() {
    me.value = null
    sessions.value = []
    linkedAccounts.value = []
    // 授权态与业务数据缓存随登录态一并清空（均为仅内存缓存）
    useAuthorizationStore().reset()
    useNexusStore().reset()
  }

  /**
   * GET /api/v1/me —— 业务登录态判断依据。
   * 401 系 code → 清态视为未登录；网络等其它错误 → 上抛且不清态（避免离线误显示"未登录"）。
   */
  async function fetchCurrentUser() {
    try {
      me.value = await api.get<User>('/me')
    } catch (e) {
      if (UNAUTH_CODES.has((e as AppError).code)) {
        clearAuthState()
      } else {
        throw e
      }
    }
  }

  /**
   * 应用启动初始化（v1 文档 §8）：
   * Better Auth Session 存在 → 拉取 /api/v1/me 建立业务登录态；无 Session → 未登录。
   */
  async function initialize() {
    if (initialized.value) return
    loading.value = true
    try {
      const { data } = await authClient.getSession()
      if (data?.session && data?.user) {
        try {
          await fetchCurrentUser()
          // 登录态建立后拉取授权信息（失败不影响导航，守卫会兜底重试）
          await useAuthorizationStore().fetchAuthorization()
        } catch {
          /* /me 网络异常：不清 Session 态，由页面内部自行处理 */
        }
      } else {
        clearAuthState()
      }
    } catch {
      /* get-session 网络异常：不清态、不阻塞导航 */
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  /** 邮箱密码登录（Better Auth /api/auth/sign-in/email）。成功后建立 HttpOnly Session 并拉取 /me */
  async function signIn(email: string, password: string, rememberMe: boolean, redirect?: unknown) {
    const { error } = await authClient.signIn.email({
      email,
      password,
      rememberMe,
      // 配合 emailVerification.autoSignInAfterVerification：验证成功后自动登录并 302 回站内地址（指南 §4）
      callbackURL: window.location.origin + resolveInternalPath(redirect, '/'),
    })
    if (error) throw toAppError(error)
    await fetchCurrentUser()
    await useAuthorizationStore().fetchAuthorization()
    broadcastAuthChange()
  }

  /**
   * 注册（Better Auth /api/auth/sign-up/email）。
   * 返回是否已自动进入登录态：后端若要求邮箱验证则不会建立 Session。
   */
  async function signUp(name: string, email: string, password: string): Promise<boolean> {
    const { error } = await authClient.signUp.email({ name, email, password })
    if (error) throw toAppError(error)
    try {
      await fetchCurrentUser()
    } catch {
      /* 无 Session（待邮箱验证）时 /me 401 → 已清态，属正常路径 */
    }
    return isAuthenticated.value
  }

  /** 登出当前设备（Better Auth /api/auth/sign-out），并清理本地态 */
  async function signOut() {
    try {
      await authClient.signOut()
    } finally {
      clearAuthState()
      broadcastAuthChange()
    }
  }

  /**
   * 跨标签页同步：强制重新校验服务端会话并刷新本地登录态（绕过 initialize 的
   * initialized 短路）。由 App.vue 的 storage 事件监听在其他标签页登录/登出时调用。
   */
  let resyncing = false
  async function resyncSession() {
    if (resyncing) return
    resyncing = true
    try {
      const { data } = await authClient.getSession()
      if (data?.session && data?.user) {
        try {
          await fetchCurrentUser()
          await useAuthorizationStore().fetchAuthorization()
        } catch {
          /* /me 网络异常：保留 Session 态 */
        }
      } else {
        clearAuthState()
      }
    } catch {
      /* get-session 网络异常：保持现状，下次事件再试 */
    } finally {
      resyncing = false
    }
  }

  /** 请求密码重置邮件。redirectTo 为重置落地页（v1 文档 §13） */
  async function requestPasswordReset(email: string) {
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await authClient.requestPasswordReset({ email, redirectTo })
    if (error) throw toAppError(error)
  }

  /** 使用邮件链接中的 token 重置密码（v1 文档 §13，token 不落地存储） */
  async function resetPassword(newPassword: string, token: string) {
    const { error } = await authClient.resetPassword({ newPassword, token })
    if (error) throw toAppError(error)
  }

  /**
   * 重发邮箱验证邮件（Better Auth /api/auth/send-verification-email）。
   * 未登录可凭 { email } 调用：用于「未验证 + 找回密码被门禁拦截」的自愈
   * 路径——先完成验证，再登录 / 重置密码。防枚举：无论邮箱是否存在恒 200。
   */
  async function sendVerificationEmail(email: string) {
    const fn = authClient.sendVerificationEmail as unknown as (opts: unknown) => Promise<{
      error?: unknown
    }>
    const { error } = await fn({ email, callbackURL: `${window.location.origin}/` })
    if (error) throw toAppError(error)
  }

  /** 使用验证 token 完成邮箱验证，成功后刷新业务登录态（v1 文档 §14） */
  async function verifyEmail(token: string) {
    const { error } = await authClient.verifyEmail({ query: { token } })
    if (error) throw toAppError(error)
    try {
      await fetchCurrentUser()
    } catch {
      /* 未登录状态下验证成功（邮件链接新开浏览器）→ 忽略 /me 401 */
    }
  }

  /**
   * QQ 登录（Better Auth genericOAuth，走整页跳转授权）。
   * 客户端动态代理 signIn.social，provider 'qq' 非内置联合类型，沿用 cast。
   * 返回 { url } 时手动跳转；若客户端已自动跳转则无需处理。
   *
   * callbackURL 必须传绝对地址：OAuth 回调发生在 API 域名上（302 Location
   * 相对路径按 API origin 解析），相对路径会让登录成功后落到 API 的 404 JSON 页。
   */
  async function signInWithQQ(redirect?: unknown) {
    setOAuthProviderLabel('QQ')
    const origin = window.location.origin
    const result = await (authClient.signIn.social as unknown as (opts: unknown) => Promise<{
      data?: { url?: string } | null
      error?: unknown
    }>)({
      provider: 'qq',
      callbackURL: origin + resolveInternalPath(redirect, '/settings'),
      errorCallbackURL: `${origin}/login`,
    })
    if (result.error) throw toAppError(result.error)
    const url = result.data?.url
    if (url) window.location.href = url
  }

  /**
   * GitHub 登录（Better Auth genericOAuth，走整页跳转授权）。
   * 客户端动态代理 signIn.social，沿用 cast，结构与 signInWithQQ 一致。
   * 返回 { url } 时手动跳转；若客户端已自动跳转则无需处理。
   * callbackURL 绝对地址理由同 signInWithQQ。
   */
  async function signInWithGitHub(redirect?: unknown) {
    setOAuthProviderLabel('GitHub')
    const origin = window.location.origin
    const result = await (authClient.signIn.social as unknown as (opts: unknown) => Promise<{
      data?: { url?: string } | null
      error?: unknown
    }>)({
      provider: 'github',
      callbackURL: origin + resolveInternalPath(redirect, '/'),
      errorCallbackURL: `${origin}/login`,
    })
    if (result.error) throw toAppError(result.error)
    const url = result.data?.url
    if (url) window.location.href = url
  }

  /**
   * 获取当前账号绑定的登录方式列表（GET /api/auth/list-accounts）。
   * better-auth 客户端动态代理方法 listAccounts。
   */
  async function fetchLinkedAccounts(): Promise<LinkedAccount[]> {
    const fn = authClient.listAccounts as unknown as () => Promise<{ data?: LinkedAccount[] | null }>
    const { data } = await fn()
    linkedAccounts.value = Array.isArray(data) ? data : []
    return linkedAccounts.value
  }

  /**
   * 关联 QQ 登录方式（POST /api/auth/link-social）。
   * 发起恒 200，冲突在 QQ 回调后由服务端判定并 302 到 errorCallbackURL。
   * 返回 { url } 时手动跳转到 QQ 授权页。
   */
  async function linkQQ() {
    setOAuthProviderLabel('QQ')
    const fn = authClient.linkSocial as unknown as (opts: unknown) => Promise<{
      data?: { url?: string } | null
      error?: unknown
    }>
    const origin = window.location.origin
    const { data, error } = await fn({
      provider: 'qq',
      callbackURL: `${origin}/settings/security`,
      errorCallbackURL: `${origin}/auth/link-error`,
    })
    if (error) throw toAppError(error)
    const url = data?.url
    if (url) window.location.href = url
  }

  /**
   * 关联 GitHub 登录方式（POST /api/auth/link-social）。
   * 发起恒 200，冲突在 GitHub 回调后由服务端判定并 302 到 errorCallbackURL。
   * 返回 { url } 时手动跳转到 GitHub 授权页。
   */
  async function linkGitHub() {
    setOAuthProviderLabel('GitHub')
    const fn = authClient.linkSocial as unknown as (opts: unknown) => Promise<{
      data?: { url?: string } | null
      error?: unknown
    }>
    const origin = window.location.origin
    const { data, error } = await fn({
      provider: 'github',
      callbackURL: `${origin}/settings/security`,
      errorCallbackURL: `${origin}/auth/link-error`,
    })
    if (error) throw toAppError(error)
    const url = data?.url
    if (url) window.location.href = url
  }

  /**
   * 解绑登录方式（POST /api/auth/unlink-account）。
   * 入参为 account 行 id（非 providerId）。
   */
  async function unlinkLinkedAccount(accountId: string) {
    const fn = authClient.unlinkAccount as unknown as (opts: unknown) => Promise<{ error?: unknown }>
    const { error } = await fn({ accountId })
    if (error) throw toAppError(error)
    await fetchLinkedAccounts()
  }

  /**
   * 修改邮箱（POST /api/auth/change-email）。
   * QQ 空壳账号（邮箱未验证）可直接改邮箱并收验证邮件。
   */
  async function changeEmail(newEmail: string) {
    const fn = authClient.changeEmail as unknown as (opts: unknown) => Promise<{ error?: unknown }>
    const { error } = await fn({
      newEmail,
      callbackURL: `${window.location.origin}/settings/security`,
    })
    if (error) throw toAppError(error)
  }

  /**
   * 设置登录密码（POST /api/v1/me/set-password，后端自定义接口）。
   * 仅允许无 credential 的 QQ 空壳账号调用；成功后刷新登录方式与 /me。
   */
  async function setPassword(newPassword: string) {
    await api.post('/me/set-password', { newPassword })
    await fetchLinkedAccounts()
    await fetchCurrentUser()
  }

  /**
   * 注销账号（DELETE /api/v1/me，不可逆自服务）。
   * 服务端按登录方式强制二选一：有 credential → 必须传 password（BA 验密）；
   * 纯 OAuth → 必须传 confirm: true。成功后旧会话立即失效——清本地态并广播
   * 其他标签页同步（它们下次请求会 401 / 收到广播自动清态）。
   */
  async function deleteMyAccount(opts: { password?: string; confirm?: boolean }) {
    await api.delete('/me', { data: opts })
    clearAuthState()
    broadcastAuthChange()
  }

  /** GET /api/v1/me/sessions —— 会话/设备列表 */
  async function fetchSessions() {
    sessions.value = await api.get<SessionInfo[]>('/me/sessions')
    return sessions.value
  }

  /** DELETE /api/v1/me/sessions/:id —— 撤销单个会话；若是当前会话则本地登录态同步失效 */
  async function revokeSession(id: string) {
    await api.delete<SessionRevokeResult>(`/me/sessions/${id}`)
    const target = sessions.value.find((s) => s.id === id)
    sessions.value = sessions.value.filter((s) => s.id !== id)
    if (target?.current) clearAuthState()
  }

  /** DELETE /api/v1/me/sessions —— 退出所有设备（含当前），本地登录态随之失效 */
  async function revokeAllSessions() {
    await api.delete<SessionRevokeResult>('/me/sessions')
    clearAuthState()
  }

  return {
    me,
    initialized,
    loading,
    sessions,
    linkedAccounts,
    isAuthenticated,
    initialize,
    resyncSession,
    fetchCurrentUser,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    resetPassword,
    sendVerificationEmail,
    verifyEmail,
    signInWithQQ,
    signInWithGitHub,
    fetchLinkedAccounts,
    linkQQ,
    linkGitHub,
    unlinkLinkedAccount,
    changeEmail,
    setPassword,
    deleteMyAccount,
    fetchSessions,
    revokeSession,
    revokeAllSessions,
  }
})
