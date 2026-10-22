/**
 * AI 输出里的链接白名单。
 *
 * 这是防钓鱼的核心，不是格式校验。AI 输出属不可信内容：注入一个
 * `[点此登录](https://fake-luminol.com/login)` 配合话术，用户就会点。
 *
 * 只放行站内相对路径与自有域名，其余一律渲染成不可点的纯文本——
 * 内容还在（用户能看到「这里」两个字），只是跳不过去。
 */

const ALLOWED_HOSTS = ['luminolsuki.moe', 'narcssu.top']

/**
 * 判断链接是否可点。
 *
 * @param href AI 输出的原始链接
 * @returns true = 可点；false = 调用方应降级为纯文本
 */
export function isAllowedAiUrl(href: string | undefined): boolean {
  if (!href) return false
  const value = href.trim()
  if (value.length === 0) return false

  // 相对路径：必须以单个 / 开头。`//evil.com` 是协议相对 URL，会跳出站外
  if (value.startsWith('/')) return !value.startsWith('//')

  // 锚点与查询串，仍在当前页内
  if (value.startsWith('#') || value.startsWith('?')) return true

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  // http 明文可被中间人替换内容，一律不放行
  if (url.protocol !== 'https:') return false

  const host = url.hostname.toLowerCase()
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}
