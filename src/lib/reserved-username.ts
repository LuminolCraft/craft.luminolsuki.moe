/**
 * 前端用户名保留词黑名单
 *
 * 词表来源：
 * - GitHub Enterprise 保留词（admin/root/support 等系统与运维角色）
 * - RFC 2142 角色邮箱名（abuse/hostmaster/postmaster/webmaster/noc/uucp 等）
 * - 站点路由（login/register/settings/profile/dashboard/docs 等）
 * - 平台自有词（luminol/luminolcraft/nexus/minecraft）
 *
 * 用途：
 * - 注册/改名前提供即时的用户反馈
 * - 与后端安全策略保持一致（后端错误码 USERNAME_RESERVED）
 *
 * 注意：
 * - 前端校验不是安全边界
 * - 后端必须继续执行最终校验
 * - 词表与归一化规则与后端 src/lib/reserved-username.ts 保持逐字一致
 */
export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'adm',
  'root',
  'superuser',
  'supervisor',
  'sysadmin',
  'moderator',
  'staff',
  'owner',
  'official',
  'system',
  'support',
  'help',
  'helpdesk',
  'security',
  'abuse',
  'hostmaster',
  'postmaster',
  'webmaster',
  'noc',
  'uucp',
  'operator',
  'manager',
  'ceo',
  'cto',
  'cfo',
  'founder',
  'bot',
  'api',
  'app',
  'auth',
  'oauth',
  'callback',
  'login',
  'logout',
  'signin',
  'signup',
  'signout',
  'register',
  'settings',
  'profile',
  'account',
  'accounts',
  'dashboard',
  'verify',
  'verified',
  'reset',
  'password',
  'me',
  'user',
  'users',
  'username',
  'email',
  'mail',
  'billing',
  'docs',
  'about',
  'contact',
  'terms',
  'privacy',
  'status',
  'www',
  'ftp',
  'null',
  'undefined',
  'anonymous',
  'luminol',
  'luminolcraft',
  'nexus',
  'minecraft',
] as const

/**
 * 归一化：小写 → leet 映射（0→o、1→i、3→e、4→a、5→s、7→t、8→b、$→s、@→a）
 * → 形近合一（l→i）。与后端逐字一致，表词入表与查表同走此函数。
 */
function normalizeReservedUsername(name: string): string {
  const lower = name.toLowerCase()
  const deLeet = lower
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
  return deLeet.replace(/l/g, 'i')
}

const RESERVED_USERNAME_SET: Set<string> = new Set(
  RESERVED_USERNAMES.map((word) => normalizeReservedUsername(word)),
)

/**
 * 检查用户名是否命中保留词（拦 admln/adm1n/r00t 等形近变体）。
 *
 * 注意：
 * 输入与表词同走归一化后再查表，
 * 完整用户名格式由调用方负责。
 */
export function checkUsernameReserved(name: string): boolean {
  return RESERVED_USERNAME_SET.has(normalizeReservedUsername(name))
}
