/**
 * 前端邮箱域名白名单
 *
 * 用途：
 * - 注册前提供即时的用户反馈
 * - 与后端安全策略保持一致
 *
 * 注意：
 * - 前端校验不是安全边界
 * - 后端必须继续执行最终校验
 */
export const ALLOWED_EMAIL_DOMAINS = [
  'qq.com',
  'outlook.com',
  '163.com',
  '126.com',
  'yeah.net',
  'gmail.com',
  '188.com',
  'foxmail.com',
  'sina.com',
  'sina.cn',
  'sohu.com',
  '139.com',
  '189.cn',
  'wo.cn',
  'aliyun.com',
  'googlemail.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'yahoo.com',
  'zoho.com',
  'gmx.com',
  'gmx.de',
] as const

const ALLOWED_EMAIL_DOMAIN_SET = new Set(ALLOWED_EMAIL_DOMAINS)

/**
 * 检查邮箱域名是否在允许列表中。
 *
 * 注意：
 * 此函数只负责域名白名单检查，
 * 完整邮箱格式由调用方负责。
 */
export function checkEmailDomain(email: string): boolean {
  const normalized = email.trim().toLowerCase()

  const atIndex = normalized.lastIndexOf('@')

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return false
  }

  const domain = normalized.slice(atIndex + 1)

  return ALLOWED_EMAIL_DOMAIN_SET.has(domain)
}