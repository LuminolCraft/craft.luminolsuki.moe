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
export const useAuthorizationStore = defineStore('authorization', () => {
  const roles = ref<string[]>([])
  const permissions = ref<string[]>([])
  /** 已完成一次成功获取或明确的 401（未登录）；网络错误时保持 false 以便守卫重试 */
  const loaded = ref(false)

  /** 拉取授权信息。401 → 清空视为未登录；其它错误 → 保留已有值不清态 */
  async function fetchAuthorization() {
    try {
      const data = await api.get<AuthorizationInfo>('/me/authorization')
      roles.value = Array.isArray(data?.roles) ? data.roles : []
      permissions.value = Array.isArray(data?.permissions) ? data.permissions : []
      loaded.value = true
    } catch (e) {
      if (UNAUTH_CODES.has((e as AppError).code)) {
        reset()
        loaded.value = true
      }
      // 网络/服务端异常：保留原值且 loaded 不变，允许后续重试
    }
  }

  function hasPermission(permission: string): boolean {
    return permissions.value.includes(permission)
  }

  function hasRole(role: string): boolean {
    return roles.value.includes(role)
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
    reset,
  }
})

export { ADMIN_ACCESS_PERMISSION }
