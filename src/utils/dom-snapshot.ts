/**
 * DOM → PNG dataURL
 *
 * 用途：PaperCrumple 这类只吃图片纹理的组件，需要把真实 DOM（票据、卡片）
 * 先渲染成一张图才能揉。做法与 Vue Bits Shredder 内部 snapshot 一致：
 * 克隆节点 → 逐元素内联 computed style → 序列化成 SVG foreignObject →
 * 画到 canvas → 导出 dataURL。
 *
 * 注意：
 * - 只能拿到「计算后样式」，伪元素（::before/::after）不会被渲染
 * - 外链图片必须允许 CORS，否则会被跳过（保留透明）
 * - 字体走系统字体名，网页自定义字体在同源情况下可用
 */

export interface SnapshotOptions {
  /** 输出宽度（CSS 像素），默认取节点实际宽高 */
  width?: number
  /** 输出高度（CSS 像素），默认取节点实际宽高 */
  height?: number
  /** 位图放大倍数，默认 min(2, devicePixelRatio) */
  scale?: number
  /** 背景色，默认透明 */
  background?: string
}

const imageCache = new Map<string, Promise<string>>()

/** 远程图片转 dataURL，绕过 canvas 跨域污染 */
function toDataUrl(src: string): Promise<string> {
  if (!src || src.startsWith('data:')) return Promise.resolve(src)
  const hit = imageCache.get(src)
  if (hit) return hit
  const job = fetch(src, { mode: 'cors' })
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
    )
  imageCache.set(src, job)
  job.catch(() => imageCache.delete(src))
  return job
}

/** 把节点连同全部后代的计算样式内联成静态快照 */
function inlineStyles(source: HTMLElement, target: HTMLElement) {
  const from = [source, ...source.querySelectorAll<HTMLElement>('*')]
  const to = [target, ...target.querySelectorAll<HTMLElement>('*')]
  const images: [HTMLImageElement, string][] = []
  for (let i = 0; i < from.length; i += 1) {
    const style = getComputedStyle(from[i]!)
    const out = to[i]!.style
    for (let j = 0; j < style.length; j += 1) {
      const name = style[j]!
      out.setProperty(name, style.getPropertyValue(name))
    }
    const a = from[i]
    const b = to[i]
    if (a instanceof HTMLImageElement && b instanceof HTMLImageElement) {
      images.push([b, a.currentSrc || a.src])
    }
  }
  return images
}

export async function snapshotToDataUrl(node: HTMLElement, options: SnapshotOptions = {}): Promise<string> {
  const width = Math.max(1, Math.round(options.width ?? node.offsetWidth))
  const height = Math.max(1, Math.round(options.height ?? node.offsetHeight))
  const scale = Math.min(3, Math.max(1, options.scale ?? (window.devicePixelRatio || 1)))

  const clone = node.cloneNode(true) as HTMLElement
  const images = inlineStyles(node, clone)
  Object.assign(clone.style, {
    position: 'relative',
    inset: 'auto',
    margin: '0',
    transform: 'none',
    filter: 'none',
    transition: 'none',
    animation: 'none',
    width: `${width}px`,
    height: `${height}px`,
  })
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')

  await Promise.all(
    images.map(async ([img, src]) => {
      img.removeAttribute('srcset')
      img.removeAttribute('loading')
      try {
        img.setAttribute('src', await toDataUrl(src))
      } catch {
        img.removeAttribute('src')
        img.style.background = 'rgba(127, 127, 127, 0.25)'
      }
    })
  )

  const markup = new XMLSerializer().serializeToString(clone)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="${width}" height="${height}">${markup}</foreignObject></svg>`

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('快照渲染失败：SVG 内含不支持的节点或样式'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('快照失败：拿不到 2d 上下文')
  if (options.background) {
    ctx.fillStyle = options.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}
