/**
 * 等高线路径生成。
 *
 * 首页小图和全屏地图用的是同一套算法与同一组种子 —— 点开的图就是那张图放大，
 * 不是另画一张，所以抽到这里共用。
 */

export interface ContourLayer {
  d: string
  /** 视差权重：外圈位移多，内圈几乎不动 */
  weight: number
  opacity: number
  width: number
}

/** 椭圆 + 多频正弦扰动，生成闭合等高线 */
export function contourPath(seed: number, rx: number, ry: number, wobble: number, steps = 96): string {
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const r =
      1 +
      wobble * Math.sin(3 * t + seed) +
      wobble * 0.55 * Math.sin(5 * t - seed * 1.7) +
      wobble * 0.3 * Math.sin(7 * t + seed * 0.6)
    const x = 500 + Math.cos(t) * rx * r
    const y = 240 + Math.sin(t) * ry * r
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
  }
  return d + 'Z'
}

/** 7 层同心等高线，k=0 为最外圈 */
export function contourLayers(count = 7): ContourLayer[] {
  return Array.from({ length: count }, (_, i) => {
    const k = i / (count - 1)
    const seed = i * 0.7 + 0.4
    return {
      d: contourPath(seed, 400 - k * 240, 200 - k * 118, 0.11 - k * 0.03),
      weight: 26 - i * 3,
      opacity: 0.16 + k * 0.5,
      width: 0.8 + k * 0.7,
    }
  })
}
