/**
 * 用户名规则（前端镜像；唯一事实源是后端 luminol-nexus 的 src/lib/username.ts）。
 *
 * 逻辑必须与后端逐字一致（仅代码风格不同：前端 prettier「无分号 + 单引号」）：
 * RFC 8265 UsernameCasePreserved 口径——宽度折叠 + trim + NFC，不改大小写；
 * 再用 NFKC 差异检测拒绝兼容等价码点；字符集收窄为「ASCII 拉丁字母 + 汉字 + 数字 + _ -」。
 *
 * 前端校验只做即时反馈，不是安全边界；后端仍执行最终校验。
 */

/** 用户名长度下限（Unicode 码点，不是 UTF-16 单元）。 */
export const USERNAME_MIN = 3

/** 用户名长度上限（Unicode 码点）。 */
export const USERNAME_MAX = 32

/** 面向用户的规则文案（与后端错误消息同一句话）。 */
export const USERNAME_RULE_MESSAGE = '用户名需为 3-32 个字符，仅限中文、字母、数字、下划线或连字符'

/** 允许的字符集：ASCII 字母数字下划线连字符，或任意汉字（Script=Han）。 */
const USERNAME_CHARSET = /^[A-Za-z0-9_\p{Script=Han}-]+$/u

/** 宽度折叠：全角 ASCII（U+FF01–U+FF5E）折为半角，表意空格折为普通空格。 */
function foldWidth(value: string): string {
  return value
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
}

/**
 * 归一化：宽度折叠 → 首尾空白移除 → NFC。
 *
 * 幂等；对纯 ASCII 输入是恒等变换。
 * 注意：首尾空白是**归一化移除**，内部空白仍按字符集拒绝。
 */
export function prepareUsername(raw: string): string {
  return foldWidth(raw).trim().normalize('NFC')
}

/** 码点安全截断：禁止在代理对（astral 汉字 / emoji）中间切断。 */
export function sliceCodePoints(value: string, max: number): string {
  const points = Array.from(value)
  return points.length <= max ? value : points.slice(0, max).join('')
}

/** 单码点是否可用于用户名（白名单 + 兼容性）。 */
export function isAllowedUsernameCodePoint(codePoint: string): boolean {
  return USERNAME_CHARSET.test(codePoint) && codePoint.normalize('NFKC') === codePoint
}

/** 校验失败原因（供前端出差异化文案）。 */
export type UsernameInvalidReason = 'too_short' | 'too_long' | 'charset' | 'compatibility'

/** 校验结果：ok 时带回归一化后的值。 */
export type UsernameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: UsernameInvalidReason }

/**
 * 校验用户名：先 prepare，再按 长度 → 字符集 → 兼容性 依次判定。
 *
 * 例：prepareUsername('e\u0301') === 'é'（NFC 生效）；但 'é' 只有 1 码点，会先撞
 * too_short——白名单只有 ASCII 拉丁字母，带音标拉丁（'ééé'）一律以 charset 拒绝。
 */
export function validateUsername(raw: string): UsernameValidation {
  const value = prepareUsername(raw)
  const length = Array.from(value).length
  if (length < USERNAME_MIN) return { ok: false, reason: 'too_short' }
  if (length > USERNAME_MAX) return { ok: false, reason: 'too_long' }
  if (!USERNAME_CHARSET.test(value)) return { ok: false, reason: 'charset' }
  // 兼容等价码点（全角残留、康熙部首、连字…）直接拒绝，不静默替换成别的字
  if (value.normalize('NFKC') !== value) return { ok: false, reason: 'compatibility' }
  return { ok: true, value }
}

/**
 * 保留词比对键（**仅用于保留词检测**）。
 *
 * 不用于 username 唯一性比较——唯一性由后端按 prepare 后的精确匹配决定，保留大小写。
 */
export function canonicalUsername(raw: string): string {
  return prepareUsername(raw)
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/l/g, 'i')
}

/** 追加去重后缀，并保证含后缀的总长度不超上限（与后端派生规则一致）。 */
export function withUsernameSuffix(base: string, suffix: string): string {
  return `${sliceCodePoints(base, USERNAME_MAX - suffix.length)}${suffix}`
}

/**
 * 粘贴清洗（前端输入卫生，不是校验规则）：移除零宽与双向控制字符，再走 prepareUsername。
 *
 * 后端不做这一步——后端直接拒绝含不可见字符的输入（defense in depth）。
 * 前端做这一步，是为了「从用户 ID、聊天记录、网页复制」带来的粘贴残留
 * 不会让用户陷入恒 400 的死循环；存储值永远是清洗后的结果。
 */
export function cleanUsernameInput(raw: string): string {
  return prepareUsername(raw.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, ''))
}
