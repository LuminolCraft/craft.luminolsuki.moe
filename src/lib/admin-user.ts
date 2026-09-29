import type { AdminUserDetail, AdminUserListItem } from '@/types/nexus'

/**
 * 管理端用户视图归一化。
 *
 * 后端 `/admin/users`、`/admin/users/:id` 目前直接下发 users 表原始行（snake_case：
 * `created_at` / `email_verified` / `birthday_self_edited`），与前端 `AdminUserListItem`
 * 的 camelCase 字段不一致——曾导致列表「注册时间」恒显示 `—`、详情页邮箱验证徽标与
 * 生日锁定标记不出现。
 *
 * 这里对两种拼写都做兼容：后端改口径后无需再改前端。
 */
interface RawAdminUser {
  id?: unknown
  username?: unknown
  email?: unknown
  emailVerified?: boolean
  email_verified?: boolean
  avatarKey?: string | null
  avatar_key?: string | null
  birthday?: string | null
  birthdaySelfEdited?: boolean
  birthday_self_edited?: boolean | null
  createdAt?: number
  created_at?: number
  updatedAt?: number
  updated_at?: number
  roles?: string[]
  minecraftAccounts?: AdminUserDetail['minecraftAccounts']
}

function asRecord(raw: unknown): RawAdminUser {
  return typeof raw === 'object' && raw !== null ? (raw as RawAdminUser) : {}
}

/** 列表项归一：snake_case 与 camelCase 都能读，缺失字段保持 undefined（不做假值补零）。 */
export function normalizeAdminUser(raw: unknown): AdminUserListItem {
  const r = asRecord(raw)
  return {
    id: String(r.id ?? ''),
    username: String(r.username ?? ''),
    email: typeof r.email === 'string' ? r.email : undefined,
    emailVerified: r.emailVerified ?? r.email_verified,
    avatarKey: r.avatarKey ?? r.avatar_key ?? null,
    birthday: r.birthday ?? null,
    birthdaySelfEdited: r.birthdaySelfEdited ?? r.birthday_self_edited ?? false,
    createdAt: r.createdAt ?? r.created_at,
    roles: r.roles ?? [],
  }
}

/** 详情归一：列表项字段 + `updatedAt` + MC 账号（后端已按 `MinecraftAccount` 下发）。 */
export function normalizeAdminUserDetail(raw: unknown): AdminUserDetail {
  const r = asRecord(raw)
  return {
    ...normalizeAdminUser(r),
    updatedAt: r.updatedAt ?? r.updated_at,
    minecraftAccounts: r.minecraftAccounts ?? [],
  }
}
