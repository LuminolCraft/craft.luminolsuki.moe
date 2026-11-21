/**
 * MC 头像解析：只认后端下发的 skin 串（角色名 / UUID / 图片 URL）。
 *
 * - 角色名 / UUID → 套 mc-heads.net 生成头部图
 * - 图片 URL → 皮肤纹理，需抠「头部正面 + 第二层帽檐」合成 2D 头像（见 skinHeadStyle）
 * - 空值 / 纯空白 / 未知来源分类 → null，由调用方出首字母占位
 */
export type SkinType = 'name' | 'uuid' | 'url'

const HTTP_URL_RE = /^https?:\/\//i
const UUID_HYPHEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID_HEX_RE = /^[0-9a-f]{32}$/i

/**
 * 后端未下发 `type` 时的本地兜底（当前只有管理端用户详情走这条）。
 * 判定顺序与后端一致：URL 先判，避免内嵌 UUID 的 URL 被误判；再 36 位带连字符 / 32 位 hex UUID。
 */
export function inferSkinType(skin: string): SkinType {
  if (HTTP_URL_RE.test(skin)) return 'url'
  if (UUID_HYPHEN_RE.test(skin) || UUID_HEX_RE.test(skin)) return 'uuid'
  return 'name'
}

export interface SkinAvatar {
  /** mc-heads 头部图，或皮肤纹理直链 */
  url: string
  /** true = url 是整张皮肤纹理，需用 skinHeadStyle 裁切展示 */
  texture: boolean
}

/**
 * skin 串 → 头像描述。
 *
 * - `type` 由后端 `GET /skin/:name` 的顶层字段给出；传 `undefined` 表示后端没给（旧部署），
 *   按值本地推断；传 `null` 表示后端给了未知分类 —— 不猜，直接不出图。
 * - `url` 类型必须是 http(s) 且可解析，挡掉 `javascript:` / `data:` / `file:` 等协议。
 */
export function skinAvatar(
  skin: string | null | undefined,
  type: SkinType | null | undefined,
  size: number,
): SkinAvatar | null {
  const value = skin?.trim()
  if (!value || type === null) return null

  const kind = type ?? inferSkinType(value)
  if (kind === 'url') {
    if (!HTTP_URL_RE.test(value)) return null
    try {
      // 只接受能解析成绝对地址的 http(s) URL
      new URL(value)
    } catch {
      return null
    }
    return { url: value, texture: true }
  }

  return {
    url: `https://mc-heads.net/avatar/${encodeURIComponent(value)}/${size}`,
    texture: false,
  }
}

/**
 * CSS `url("...")` 取值转义：只转义会截断字符串或换行的字符（双引号、反斜杠、CR、LF）。
 * 不用整体 encodeURI —— 那会把 URL 里已有的 `%20` 二次编码成 `%2520`。
 */
function cssUrlValue(url: string): string {
  return url.replace(
    /["\\\r\n]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`,
  )
}

/**
 * 皮肤纹理 → 2D 头像内联样式：头部正面 (8,8) 8×8 + 第二层帽檐 (40,8) 8×8 叠加。
 *
 * 两张同图背景层，**第一层是帽檐**（必须盖在脸上），第二层是脸。整张纹理按宽度
 * 缩到 8s，每纹理像素 = s/8 屏幕像素：脸偏移 (8·s/8, 8·s/8) = (s, s) → 位置 -s -s；
 * 帽檐偏移 (40·s/8, 8·s/8) = (5s, s) → 位置 -5s -s。
 *
 * 基准是 64×64 与同布局的 HD 皮肤（128/256）：脸总在宽度 1/8、帽檐总在 5/8。
 * image-rendering: pixelated 关闭抗锯齿，保持像素风。
 */
export function skinHeadStyle(url: string, size: number): Record<string, string> {
  const value = cssUrlValue(url)
  return {
    backgroundImage: `url("${value}"), url("${value}")`,
    backgroundSize: `${size * 8}px auto, ${size * 8}px auto`,
    backgroundPosition: `${-size * 5}px ${-size}px, ${-size}px ${-size}px`,
    backgroundRepeat: 'no-repeat, no-repeat',
    imageRendering: 'pixelated',
  }
}
