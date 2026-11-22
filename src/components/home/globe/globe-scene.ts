/**
 * 世界球示例的公共场景层。
 *
 * 三个示例（昼夜地形球 / 扫描建造球 / 星尘球）共用这里的：主题取色、渲染器与相机、
 * 尺寸同步、指针阻尼、可见性暂停、dispose。避免每个组件各写一套 WebGL 样板。
 *
 * 约定：
 * 1. 背景透明（alpha），页面那层网格渐变能透过来，组件不自己铺底色；
 * 2. 只渲染「进入视口 + 页面可见」的帧，离开就停 —— 首页同时挂三个也不会一直烧 GPU；
 * 3. `prefers-reduced-motion` 下只出静帧，不跑循环。
 */
import * as THREE from 'three'

export interface Palette {
  primary: THREE.Color
  text: THREE.Color
  secondary: THREE.Color
  background: THREE.Color
}

/** 从 CSS 变量取当前主题色（深/浅色切换后重新调用即可） */
export function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement)
  const pick = (name: string, fallback: string) => {
    const raw = cs.getPropertyValue(name).trim() || fallback
    try {
      return new THREE.Color().setStyle(raw)
    } catch {
      return new THREE.Color(fallback)
    }
  }
  return {
    primary: pick('--primary-color', '#8b7cf6'),
    text: pick('--text-color', '#f2eefc'),
    secondary: pick('--text-secondary', '#b9b2cc'),
    background: pick('--background-color', '#010102'),
  }
}

/** 3D 值噪声：够用即可，比 simplex 短，拼地形不会露馅 */
function hash(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123
  return s - Math.floor(s)
}

const smooth = (t: number) => t * t * (3 - 2 * t)

export function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = smooth(x - ix)
  const fy = smooth(y - iy)
  const fz = smooth(z - iz)
  let v = 0
  for (let i = 0; i < 8; i++) {
    const dx = i & 1
    const dy = (i >> 1) & 1
    const dz = (i >> 2) & 1
    const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz)
    v += hash(ix + dx, iy + dy, iz + dz) * w
  }
  return v * 2 - 1
}

/** 分形叠加：控制地形起伏的粗细 */
export function fbm3(x: number, y: number, z: number, octaves = 4): number {
  let sum = 0
  let amp = 0.5
  let norm = 0
  let f = 1
  for (let i = 0; i < octaves; i++) {
    sum += noise3(x * f, y * f, z * f) * amp
    norm += amp
    amp *= 0.5
    f *= 2.07
  }
  return sum / norm
}

export interface Pointer {
  /** 目标位置，-1 ~ 1 */
  x: number
  y: number
  /** 阻尼后的位置，直接喂给相机/旋转 */
  sx: number
  sy: number
  /** 是否在组件上悬浮 */
  inside: boolean
}

export interface Stage {
  host: HTMLElement
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  pointer: Pointer
  /** 每帧回调，dt 单位秒 */
  onFrame: (cb: (time: number, dt: number) => void) => void
  /** 手动渲染一帧（静帧 / 截图用） */
  renderOnce: () => void
  dispose: () => void
  /** 是否支持 HTML-in-Canvas 的 WebGL 纹理通道 */
  htmlTexture: boolean
}

export function createStage(host: HTMLElement): Stage | null {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  // 胶片曲线：平光区不至于一片死白，高光有回落的层次
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setClearAlpha(0)
  renderer.domElement.classList.add('globe-canvas')
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0.12, 3.1)

  const pointer: Pointer = { x: 0, y: 0, sx: 0, sy: 0, inside: false }
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  const syncSize = () => {
    const w = host.clientWidth || 1
    const h = host.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  syncSize()
  const ro = new ResizeObserver(syncSize)
  ro.observe(host)

  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect()
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1
    pointer.inside = true
  }
  const onLeave = () => {
    pointer.x = 0
    pointer.y = 0
    pointer.inside = false
  }
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerleave', onLeave)

  // 进入视口才跑：IntersectionObserver 在部分无头环境下不回调，所以另外放宽成「先跑 90 帧」
  let visible = true
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting)
    },
    { threshold: 0.05 },
  )
  io.observe(host)

  const callbacks: ((time: number, dt: number) => void)[] = []
  let raf = 0
  let last = 0
  let frames = 0
  let disposed = false

  const tick = (now: number) => {
    if (disposed) return
    raf = requestAnimationFrame(tick)
    const time = now * 0.001
    const dt = last ? Math.min(time - last, 0.05) : 0.016
    last = time
    frames++

    // 阻尼跟随
    pointer.sx += (pointer.x - pointer.sx) * 0.06
    pointer.sy += (pointer.y - pointer.sy) * 0.06

    if (!visible && frames > 90) return
    for (const cb of callbacks) cb(time, dt)
    renderer.render(scene, camera)
  }

  const renderOnce = () => {
    for (const cb of callbacks) cb(0, 0.016)
    renderer.render(scene, camera)
  }

  if (reduce) {
    renderOnce()
  } else {
    raf = requestAnimationFrame(tick)
  }

  return {
    host,
    renderer,
    scene,
    camera,
    pointer,
    onFrame: (cb) => callbacks.push(cb),
    renderOnce,
    htmlTexture: 'texElementImage2D' in renderer.getContext(),
    dispose: () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        mesh.geometry?.dispose?.()
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose?.()
      })
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}

/** 把 SVG 字符串栅格化成纹理（球面贴图用） */
export function svgToTexture(svg: string, width = 2048, height = 1024): Promise<THREE.CanvasTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('2d context unavailable'))
        return
      }
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.wrapS = THREE.RepeatWrapping
      tex.anisotropy = 4
      resolve(tex)
    }
    img.onerror = () => reject(new Error('svg rasterize failed'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}
