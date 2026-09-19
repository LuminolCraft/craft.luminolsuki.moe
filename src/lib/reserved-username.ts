/**
 * 前端用户名保留词黑名单
 *
 * 词表来源：
 * - GitHub Enterprise 保留词（admin/root/support 等系统与运维角色）
 * - RFC 2142 角色邮箱名（abuse/hostmaster/postmaster/webmaster/noc/uucp 等）
 * - 站点路由（login/register/settings/profile/dashboard/docs 等）
 * - 平台自有词（luminol/luminolcraft/nexus/minecraft）
 * - 汉字特权 / 官方 / 运营身份词（用户名开放汉字后增补）
 *
 * 用途：
 * - 注册/改名前提供即时的用户反馈
 * - 与后端安全策略保持一致（后端错误码 USERNAME_RESERVED）
 *
 * 注意：
 * - 前端校验不是安全边界
 * - 后端必须继续执行最终校验
 * - 词表与归一化规则与后端保持逐字一致（归一化实现见 src/lib/username.ts）
 */
import { canonicalUsername } from './username'

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
  // 汉字保留词（与后端 SECURITY_POLICY.reservedUsernames 同步）
  '管理员',
  '管理',
  '官方',
  '客服',
  '系统',
  '站长',
  '版主',
  '超管',
  '机器人',
  '小编',
  '匿名',
  '游客',
  '测试',
  '服主',
  '运维',
  '审计',
  '封禁',
  '公告',
  '助手',
  '支持',
  '帮助',
  '安全',
  '团队',
  '工作人员',
] as const

const RESERVED_USERNAME_SET: Set<string> = new Set(
  RESERVED_USERNAMES.map((word) => canonicalUsername(word)),
)

/**
 * 检查用户名是否命中保留词（拦 admln/adm1n/r00t 等形近变体，含全角/组合形式归一化）。
 *
 * 注意：
 * 输入与表词同走 lib/username.ts 的 canonicalUsername 后再查表，
 * 完整用户名格式由调用方负责。
 */
export function checkUsernameReserved(name: string): boolean {
  return RESERVED_USERNAME_SET.has(canonicalUsername(name))
}
