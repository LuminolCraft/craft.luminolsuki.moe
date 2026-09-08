/**
 * 校验 redirect 是否为站内相对路径（防开放重定向）。
 * 仅接受：以单个 `/` 开头、无协议、无反斜杠、无空白、长度 ≤ 256 的路径。
 * 拒绝：`https://evil`、`//evil`、`javascript:` 等。
 */
export function isInternalPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256) return false
  if (!value.startsWith('/')) return false
  if (value.startsWith('//') || value.startsWith('/\\')) return false
  if (value.includes('\\')) return false
  if (/\s/.test(value)) return false
  return true
}

/** 解析 redirect：非法值一律回退 fallback（默认 `/`） */
export function resolveInternalPath(value: unknown, fallback = '/'): string {
  return isInternalPath(value) ? value : fallback
}
