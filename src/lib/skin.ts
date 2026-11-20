import { api } from '@/lib/api'

/**
 * 会话内皮肤缓存：角色名 → skin 串。
 * `null` 表示「查过、查不到或失败」，同一会话内不重复打请求。
 */
const skinCache = new Map<string, string | null>()

/**
 * 按角色名查皮肤来源串（`GET /api/v1/skin/:name`，需登录）。
 *
 * 返回值是后端 `minecraft_accounts.skin` 列原样内容：角色名 / UUID / 图片 URL，
 * 交给 `skinAvatar` 判定怎么展示。未绑定（404）、会话失效（401）、网络异常
 * 一律返回 `null`，调用方据此出首字母占位。
 */
export async function fetchSkinByName(name: string): Promise<string | null> {
  const key = name.trim()
  if (!key) return null
  if (skinCache.has(key)) return skinCache.get(key) ?? null
  try {
    const skin = await api.get<string>(`/skin/${encodeURIComponent(key)}`)
    const value = typeof skin === 'string' && skin.trim() ? skin.trim() : null
    skinCache.set(key, value)
    return value
  } catch {
    skinCache.set(key, null)
    return null
  }
}
