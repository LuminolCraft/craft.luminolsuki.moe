/**
 * MC 头像解析：只认后端下发的 skin 串（角色名 / UUID / 图片 URL）。
 *
 * - 角色名 / UUID → 套 mc-heads.net 生成头部图
 * - 图片 URL → 皮肤纹理，需抠「头部正面 + 第二层帽檐」合成 2D 头像（见 skinHeadStyle）
 * - 空值 / 纯空白 → null，由调用方出首字母占位
 */
export interface SkinAvatar {
  /** mc-heads 头部图，或皮肤纹理直链 */
  url: string
  /** true = url 是整张皮肤纹理，需用 skinHeadStyle 裁切展示 */
  texture: boolean
}

export function skinAvatar(skin: string | null | undefined, size: number): SkinAvatar | null {
  const value = skin?.trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return { url: value, texture: true }
  return {
    url: `https://mc-heads.net/avatar/${encodeURIComponent(value)}/${size}`,
    texture: false,
  }
}

/**
 * 皮肤纹理 → 2D 头像内联样式：头部正面 (8,8) 8×8 + 第二层帽檐 (40,8) 8×8 叠加。
 *
 * 两张同图背景层，**第一层是帽檐**（必须盖在脸上），第二层是脸。整张纹理按宽度
 * 缩到 8s，每纹理像素 = s/8 屏幕像素：脸偏移 (8·s/8, 8·s/8) = (s, s) → 位置 -s -s；
 * 帽檐偏移 (40·s/8, 8·s/8) = (5s, s) → 位置 -5s -s。
 *
 * 等比缩放（高度 auto）对 64×64、64×32 旧版、128/256 HD 皮肤都成立——它们的脸总在
 * 宽度 1/8 处、帽檐总在 5/8 处。image-rendering: pixelated 关闭抗锯齿，保持像素风。
 */
export function skinHeadStyle(url: string, size: number): Record<string, string> {
  return {
    backgroundImage: `url("${url}"), url("${url}")`,
    backgroundSize: `${size * 8}px auto, ${size * 8}px auto`,
    backgroundPosition: `${-size * 5}px ${-size}px, ${-size}px ${-size}px`,
    backgroundRepeat: 'no-repeat, no-repeat',
    imageRendering: 'pixelated',
  }
}
