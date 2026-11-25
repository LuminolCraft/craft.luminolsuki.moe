import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { ADMIN_ACCESS_PERMISSION, type AuthorizationInfo } from '@/types/nexus'
import { UNAUTH_CODES } from '@/stores/auth'
import type { AppError } from '@/types/auth'

/**
 * 授权 store（独立于认证 store）。
 *
 * 数据源：GET /api/v1/me/authorization —— 后端根据当前 Better Auth 会话 + Nexus RBAC 计算。
 * 合同（用户拍板）：登录即 200 + { roles, permissions }（普通用户 roles=['user']、permissions=[]）；
 * 未登录 401；403 只出现在受保护管理接口，本端点不会对普通用户 403。
 *
 * 安全边界：
 * - 仅内存缓存，禁止 localStorage/sessionStorage 持久化
 * - 前端 hasPermission 仅作 UI 体验（入口显隐/路由守卫），真实裁决永远在后端 API
 * - 禁止基于邮箱/用户名/资料字段猜测管理员身份
 */
/**
 * 管理后台（/admin）可见角色：与后端 `requireAdmin` 的角色语义对齐。
 * 单一来源——Navbar 两处入口与路由守卫都引用它，避免硬编码漂移。
 */
export const ADMIN_CONSOLE_ROLES: readonly string[] = ['admin', 'owner']

/** 社区管理（举报队列）可见角色：staff 及以上（与后端 requireStaff 对齐） */
export const REPORT_STAFF_ROLES: readonly string[] = ['staff', 'moderator', 'admin', 'owner']

/** 举报处置可见角色：moderator 及以上（与后端 requireModerator 对齐） */
export const REPORT_RESOLVE_ROLES: readonly string[] = ['moderator', 'admin', 'owner']

export const useAuthorizationStore = defineStore('authorization', () => {
  const roles = ref<string[]>([])
  const permissions = ref<string[]>([])
  /** 已完成一次成功获取或明确的 401（未登录）；网络错误时保持 false 以便守卫重试 */
  const loaded = ref(false)

  /**
   * 拉取授权信息。
   *
   * 失败语义（修复：切号残留）：
   * - 401 系 → 清空并视为"已加载的未登录"；
   * - 其它错误（网络 / 5xx）→ **清空并置 loaded=false**，让守卫下次重试。
   *   绝不能保留旧值：换账号后若这里失败，旧账号的 roles 会让新账号看到
   *   /admin 入口与后台页面（后端会 403，但界面上是"已确认的错误权限"）。
   */
  async function fetchAuthorization() {
    try {
      const data = await api.get<AuthorizationInfo>('/me/authorization')
      roles.value = Array.isArray(data?.roles) ? data.roles : []
      permissions.value = Array.isArray(data?.permissions) ? data.permissions : []
      loaded.value = true
    } catch (e) {
      reset()
      // 401 说明"确定未登录"，可以标记为已加载；其它错误留给守卫重试
      loaded.value = UNAUTH_CODES.has((e as AppError).code)
    }
  }

  /**
   * 权限判定。owner 超级放行：后端 `requirePermission` 对 owner 恒放行
   * （middleware/authorization.ts 的 isOwner 分支），前端必须同语义，
   * 否则 owner 会被自己的 UI 挡在门外（news.manage 只种给了 role_admin，
   * owner 的 permissions 里并没有这条）。
   */
  function hasPermission(permission: string): boolean {
    return hasRole('owner') || permissions.value.includes(permission)
  }

  function hasRole(role: string): boolean {
    return roles.value.includes(role)
  }

  /** 任一角色命中即 true（管理后台入口/守卫用：与后端 requireAdmin 的角色语义对齐） */
  function hasAnyRole(candidates: string[]): boolean {
    return candidates.some((r) => roles.value.includes(r))
  }

  /** 是否具备社区管理（举报协管）入口：staff 及其以上角色 */
  function canManageReports(): boolean {
    return hasAnyRole(REPORT_STAFF_ROLES)
  }

  /** 是否具备举报处置权（封禁 / 驳回）：moderator 及以上 */
  function canResolveReports(): boolean {
    return hasAnyRole(REPORT_RESOLVE_ROLES)
  }

  /** 清空授权态（登出/会话失效时由 auth store 调用） */
  function reset() {
    roles.value = []
    permissions.value = []
    loaded.value = false
  }

  return {
    roles,
    permissions,
    loaded,
    fetchAuthorization,
    hasPermission,
    hasRole,
    hasAnyRole,
    canManageReports,
    canResolveReports,
    reset,
  }
})

export { ADMIN_ACCESS_PERMISSION }
