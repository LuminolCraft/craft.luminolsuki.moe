/**
 * 生日庆祝特效：直接采用 canvas-confetti（业界标准库，10KB，MIT）的官方推荐用法，
 * 不自研粒子系统。源码见 src/vendor/canvas-confetti.esm.js（jsDelivr ESM 构建，1.9.4）。
 *
 * 三段效果均照抄官方 README / 示例：
 * 1. `fireworks()`：官方 Fireworks 示例（5 发不同 spread / velocity / scalar 的爆开）；
 * 2. `sideCannons()`：官方 Realistic Look 示例（左右两侧礼炮持续 3 秒，粒子数随时间衰减）；
 * 3. `cakeEmoji()`：官方 shapeFromText 用法，用 🎂 形状做一次小爆开。
 */
import confetti from '@/vendor/canvas-confetti.esm.js'
import type { ConfettiInstance, ConfettiOptions } from '@/vendor/canvas-confetti.esm.js'

/** 覆盖层 z-index（生日遮罩 3000）——彩带必须画在遮罩之上 */
const CONFETTI_Z_INDEX = 3001

/** 品牌色 + 节日色（取自站内主题色与常见生日配色） */
const BIRTHDAY_COLORS = [
  '#a78bfa',
  '#c084fc',
  '#f472b6',
  '#fbbf24',
  '#67e8f9',
  '#34d399',
  '#ff8fa3',
]

/** 单次调用的公共选项：禁用库自带的 reduced-motion 处理由调用方决定，这里统一抬高层级 */
const BASE: ConfettiOptions = { zIndex: CONFETTI_Z_INDEX, disableForReducedMotion: true }

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

/** 2D 画布是否可用（jsdom / 无 canvas 环境返回 false，避免库内部空指针） */
function canUseCanvas(): boolean {
  if (!hasWindow()) return false
  try {
    return !!document.createElement('canvas').getContext?.('2d')
  } catch {
    return false
  }
}

/** 官方 Fireworks 示例（README「Fireworks」段），粒子总数按站内遮罩尺寸略降 */
function fireworks(instance: ConfettiInstance) {
  const count = 150
  const defaults: ConfettiOptions = { ...BASE, origin: { y: 0.62 }, colors: BIRTHDAY_COLORS }
  const fire = (particleRatio: number, opts: ConfettiOptions) => {
    instance({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }
  fire(0.25, { spread: 26, startVelocity: 55 })
  fire(0.2, { spread: 60 })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
  fire(0.1, { spread: 120, startVelocity: 45 })
}

/** 官方 Realistic Look 示例（README「Realistic Look」段）：左右礼炮 3 秒 */
function sideCannons(instance: ConfettiInstance) {
  const end = Date.now() + 3 * 1000
  const colors = BIRTHDAY_COLORS
  const frame = () => {
    if (Date.now() > end) return
    instance({
      ...BASE,
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    })
    instance({
      ...BASE,
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    })
    requestAnimationFrame(frame)
  }
  frame()
}

/** 官方 shapeFromText 用法：蛋糕 emoji 形状的一次小爆开（需 OffscreenCanvas，缺失则跳过） */
function cakeEmoji(instance: ConfettiInstance) {
  if (typeof OffscreenCanvas === 'undefined') return
  const scalar = 2.4
  const cake = instance.shapeFromText({ text: '🎂', scalar })
  instance({
    ...BASE,
    particleCount: 24,
    spread: 90,
    scalar,
    startVelocity: 32,
    shapes: [cake],
    origin: { y: 0.6 },
  })
}

/** 生日祝福的全部庆祝特效（吹灭蜡烛后调用一次） */
export function celebrateBirthday(): void {
  if (!canUseCanvas()) return
  const instance = confetti as ConfettiInstance
  try {
    fireworks(instance)
    sideCannons(instance)
    cakeEmoji(instance)
  } catch {
    // 特效失败不影响祝福流程（画布不可用 / 被策略拦截等）
  }
}

/** 清掉仍在画布上的彩带（关闭遮罩时调用，避免残留粒子） */
export function resetCelebration(): void {
  if (!canUseCanvas()) return
  try {
    ;(confetti as ConfettiInstance).reset()
  } catch {
    // 画布已被回收 / 不存在时忽略
  }
}
