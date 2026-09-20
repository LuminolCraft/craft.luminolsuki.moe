/**
 * 生日规则（与后端 src/lib/birthday.ts 共享同一份核心算法）。
 *
 * 共享部分：严格 `YYYY-MM-DD` 格式 + 真实日历日（含闰年）+ 下限 1900 年
 * + 2 月 29 日在非闰年按 02-28 判定（`effectiveMonthDay`）。
 *
 * 差异部分（有意为之）：
 * - **上界由后端唯一执行**（站点时区 Asia/Shanghai 的今天）；前端不做上界校验，
 *   避免「浏览器时钟落后站点时区」时把合法生日误判为非法；
 *   不判上界的代价是理论上可填未来日期，后端 400 兜底。
 * - 展示用的「今天」按**浏览器本地日期**取（`isBirthdayToday` 的入参）。
 *
 * 生日是**纯日期**：比较只取 `MM-DD`，年份不参与，且**绝不**把生日交给
 * `new Date()` 解析成时间点——那会把纯日期重新引入时区问题。
 */

/** 严格日期格式：四位年 + 两位月 + 两位日。 */
const BIRTHDAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** 生日下限年份（1899 及更早一律非法，与后端一致）。 */
export const BIRTHDAY_MIN_YEAR = 1900

/** 两位补零。 */
function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * 规范化并校验生日：严格格式 + 真实日历日（含闰年）+ 下限。
 *
 * 合法 → 返回 `YYYY-MM-DD`；非法 → `null`。
 * 不做宽松补齐（`2000-1-1` 判非法），不抛异常，**不判上界**（由后端负责）。
 */
export function normalizeBirthday(raw: unknown): string | null {
  if (typeof raw !== 'string' || !BIRTHDAY_PATTERN.test(raw)) return null
  const year = Number(raw.slice(0, 4))
  const month = Number(raw.slice(5, 7))
  const day = Number(raw.slice(8, 10))
  if (year < BIRTHDAY_MIN_YEAR) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  // 真实日历日：UTC 回代必须完全一致（2 月 30 日、非闰年 2 月 29 日会漂移）
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null
  }
  return raw
}

/** 是否为合法生日（`normalizeBirthday` 的薄封装，无第二套规则）。 */
export function isValidBirthday(raw: unknown): boolean {
  return normalizeBirthday(raw) !== null
}

/** 公历闰年判定。 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * 生效的月日（`MM-DD`）：2 月 29 日在非闰年回落到 **02-28**。
 *
 * 前后端共用本口径（后端 2B 调度同样走这里），保证不会出现
 * 「闰年才出生的人平年收不到祝福」。
 */
export function effectiveMonthDay(birthday: string, year: number): string {
  const month = birthday.slice(5, 7)
  const day = birthday.slice(8, 10)
  if (month === '02' && day === '29' && !isLeapYear(year)) return '02-28'
  return `${month}-${day}`
}

/**
 * 今天是否是该用户的生日（1A 展示判定）。
 *
 * 只做字符串比较；`localDate` 由调用方传入**浏览器本地日期**。
 */
export function isBirthdayToday(birthday: string, localDate: Date): boolean {
  if (!BIRTHDAY_PATTERN.test(birthday)) return false
  const monthDay = `${pad2(localDate.getMonth() + 1)}-${pad2(localDate.getDate())}`
  return effectiveMonthDay(birthday, localDate.getFullYear()) === monthDay
}

/** `<input type="date">` 的展示值：`YYYY-MM-DD`（非法值回退为空串，避免渲染出乱码）。 */
export function toDateInputValue(birthday: string | null | undefined): string {
  return isValidBirthday(birthday) ? (birthday as string) : ''
}
