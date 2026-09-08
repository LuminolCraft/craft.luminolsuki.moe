/**
 * MC 头像地址解析。
 * 服务器设置皮肤两种情况：玩家名字或图片 URL，后端 skin 字段均为 string，由前端判断。
 * skin 为空时默认按**玩家名字**解析（mc-heads.net 按 name 取该名字当前的皮肤头图），
 * 无名字兜底按 uuid。
 */
export function mcAvatarUrl(
  acc: { uuid: string; name: string; skin?: string | null },
  size: number,
): string {
  const skin = acc.skin?.trim()
  if (skin) {
    if (/^https?:\/\//i.test(skin)) return skin
    return `https://mc-heads.net/avatar/${encodeURIComponent(skin)}/${size}`
  }
  if (acc.name) return `https://mc-heads.net/avatar/${encodeURIComponent(acc.name)}/${size}`
  return `https://mc-heads.net/avatar/${acc.uuid}/${size}`
}
