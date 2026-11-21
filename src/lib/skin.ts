import { apiGetEnvelope } from '@/lib/api'
import { inferSkinType, type SkinType } from '@/lib/minecraft'

export type { SkinType }

/** 一次按名查询的结果；`type: null` = 后端给了未知来源分类（渲染端不出图，不猜）。 */
export interface SkinLookup {
  skin: string
  type: SkinType | null
}

/** 成功结果缓存多久：换肤最迟 10 分钟生效，避免会话内永不刷新。 */
const CACHE_TTL_MS = 10 * 60 * 1000

/**
 * 会话内缓存：角色名 → 查询结果。
 * **只记录成功结果**：401 / 404 / 5xx / 网络抖动不落表，下一次仍会重试。
 */
const skinCache = new Map<string, { lookup: SkinLookup; expiresAt: number }>()

/** 清空皮肤缓存（登出 / 会话失效时调用，避免残留上一个账号的数据）。 */
export function clearSkinCache(): void {
  skinCache.clear()
}

/** 后端 `type` 归一：合法值直接用；缺失（旧部署）按值推断；未知分类返回 null。 */
function normalizeType(raw: unknown, skin: string): SkinType | null {
  if (raw === 'name' || raw === 'uuid' || raw === 'url') return raw
  if (raw === undefined || raw === null) return inferSkinType(skin)
  return null
}

/**
 * 按角色名查皮肤（`GET /api/v1/skin/:name`，需登录）。
 *
 * 返回后端 `skin` 列原值 + 信封顶层 `type`。失败（401 / 404 / 5xx / 网络异常）
 * 返回 null 且**不写缓存**——一次抖动不该让该玩家整个会话都显示首字母。
 */
export async function fetchSkinByName(name: string): Promise<SkinLookup | null> {
  const key = name.trim()
  if (!key) return null

  const hit = skinCache.get(key)
  if (hit) {
    if (hit.expiresAt > Date.now()) return hit.lookup
    skinCache.delete(key)
  }

  try {
    const { data, meta } = await apiGetEnvelope<string>(`/skin/${encodeURIComponent(key)}`)
    const skin = typeof data === 'string' ? data.trim() : ''
    if (!skin) return null
    const lookup: SkinLookup = { skin, type: normalizeType(meta.type, skin) }
    skinCache.set(key, { lookup, expiresAt: Date.now() + CACHE_TTL_MS })
    return lookup
  } catch {
    return null
  }
}
