<!--
  MorphSlider —— GPU 位移变形轮播（Hero 背景图切换）

  移植自 Vue Bits「MorphSlider」(https://vue-bits.dev/components/morph-slider)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点（相对上游源码）：
  - 去 Tailwind：root 与容器的原子类（relative / absolute inset-0 / select-none /
    cursor-grab / focus-visible:shadow 等）全部改为 scoped CSS 真实规则
  - 上游的 captions / controls / indicators 三块 UI 在本项目未使用，已整体移除
    （需要时从 vue-bits 原版恢复）；对应 props 一并删除
  - 新增 `decorative`：作为纯背景使用时 root 挂 aria-hidden、容器不占焦点、
    不绑定键盘切换 —— 背景轮播不是可操作控件，不该吃一个 Tab 站
  - 新增 `pauseOnHover`：上游 hover 即暂停 autoplay，但整页 hero 都在鼠标下，
    背景轮播会被永久暂停 —— 本项目传 false
  - 新增组件级 IntersectionObserver：滚出视口 cancelAnimationFrame 真停 rAF，
    回屏 resume，不重建 renderer（浏览器只对后台 tab 节流，不管元素是否出屏）
  - 新增 `paused` prop：外部可强制暂停（与 IO 取与）
  - WebGL context 丢失：preventDefault + cancel rAF + emit('lost')，由父组件
    切 <img> 静态兜底（不重试，重试会陷入丢-建循环）
  - `new Renderer` 加 try/catch：不支持 WebGL 的环境直接走 <img> 兜底，不白屏
  - `uResolution` 取 `gl.drawingBufferWidth/Height`（gl_FragCoord 是设备像素，
    不要与 src/components/home/fx/HomeAurora.vue 的 offsetWidth 写法统一）
-->
<script setup lang="ts">
import { gsap } from 'gsap'
import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl'
import { computed, onMounted, onUnmounted, ref, watch, type CSSProperties } from 'vue'

export type MorphTransition = 'melt' | 'ripple' | 'shear' | 'swirl'

export interface MorphItem {
  image: string
  caption?: string
}

interface MorphSliderProps {
  items?: MorphItem[]
  startIndex?: number
  transition?: MorphTransition
  duration?: number
  ease?: string
  intensity?: number
  scale?: number
  aberration?: number
  drift?: number
  autoplay?: boolean
  autoplayDelay?: number
  loop?: boolean
  radius?: number
  overlayColor?: string
  /** 纯背景模式：aria-hidden、不吃焦点、不绑键盘（Hero 用） */
  decorative?: boolean
  /** 悬停时是否暂停自动播放（背景轮播传 false，否则鼠标在页面上永远不动） */
  pauseOnHover?: boolean
  /** 外部强制暂停（与内部可见性取与） */
  paused?: boolean
  /** devicePixelRatio 上限（低端机传 1） */
  dprCap?: number
}

interface EngineOptions {
  transition: MorphTransition
  duration: number
  ease: string
  intensity: number
  scale: number
  aberration: number
  drift: number
  overlayColor: string
  loop: boolean
}

type GL = Renderer['gl']

const TRANSITIONS: Record<MorphTransition, number> = { melt: 0, ripple: 1, shear: 2, swirl: 3 }

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform sampler2D tCurrent;
uniform sampler2D tNext;
uniform vec2 uResolution;
uniform vec2 uCurrentSize;
uniform vec2 uNextSize;
uniform float uProgress;
uniform float uDir;
uniform int uMode;
uniform float uIntensity;
uniform float uScale;
uniform float uAberration;
uniform float uDrift;
uniform float uTime;
uniform float uReduce;
uniform vec2 uPointer;
uniform vec3 uOverlay;

varying vec2 vUv;

const float PI = 3.14159265359;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

vec2 coverUV(vec2 uv, vec2 res, vec2 img) {
  float rA = res.x / max(res.y, 1.0);
  float iA = img.x / max(img.y, 1.0);
  vec2 s = vec2(1.0);
  float ratio = rA / max(iA, 0.0001);
  if (ratio > 1.0) {
    s.y = 1.0 / ratio;
  } else {
    s.x = ratio;
  }
  return (uv - 0.5) * s + 0.5;
}

void main() {
  float p = clamp(uProgress, 0.0, 1.0);
  float env = sin(p * PI);

  vec2 uv = vUv;

  uv += vec2(sin(uTime * 0.25 + uv.y * 4.0), cos(uTime * 0.22 + uv.x * 4.0)) * uDrift * 0.008;
  uv = (uv - 0.5) * (1.0 - uDrift * 0.02 * sin(uTime * 0.4)) + 0.5;

  vec2 uvC = uv;
  vec2 uvN = uv;
  float m = smoothstep(0.0, 1.0, p);

  if (uReduce < 0.5) {
    if (uMode == 3) {
      vec2 c = uv - 0.5;
      float r = length(c);
      float ang = env * uIntensity * 3.5 * (1.0 - r);
      uvC = rot(ang) * c + 0.5;
      uvN = rot(-ang) * c + 0.5;
      m = smoothstep(0.0, 1.0, p);
    } else if (uMode == 1) {
      float d = distance(uv, uPointer);
      float ring = p * 1.6;
      float wave = sin((d - ring) * 30.0) * env;
      vec2 dir = normalize(uv - uPointer + 1e-4);
      vec2 disp = dir * wave * uIntensity * 0.25;
      uvC = uv + disp;
      uvN = uv + disp * 0.6;
      m = 1.0 - smoothstep(ring - 0.03, ring + 0.03, d);
    } else if (uMode == 2) {
      float slices = 14.0;
      float row = floor(uv.y * slices);
      float rnd = hash11(row);
      vec2 disp = vec2((rnd - 0.5) * env * uIntensity * 0.6, 0.0);
      uvC = uv + disp;
      uvN = uv + disp;
      float localX = uDir > 0.0 ? uv.x : 1.0 - uv.x;
      float th = p * 1.5 - 0.25 + (rnd - 0.5) * 0.25;
      m = 1.0 - smoothstep(th - 0.06, th + 0.06, localX);
    } else {
      float nn = fbm(uv * uScale + uTime * 0.03);
      float warp = fbm(uv * uScale * 1.7 - uTime * 0.02);
      vec2 g = vec2(nn, warp) - 0.5;
      uvC = uv + g * uIntensity * 0.5 * p;
      uvN = uv - g * uIntensity * 0.5 * (1.0 - p);
      m = smoothstep(nn - 0.15, nn + 0.15, p);
    }
  }

  vec2 sC = coverUV(uvC, uResolution, uCurrentSize);
  vec2 sN = coverUV(uvN, uResolution, uNextSize);

  float ca = uReduce < 0.5 ? uAberration * env * 0.03 : 0.0;

  vec3 colC = vec3(
    texture2D(tCurrent, sC + vec2(ca, 0.0)).r,
    texture2D(tCurrent, sC).g,
    texture2D(tCurrent, sC - vec2(ca, 0.0)).b
  );
  vec3 colN = vec3(
    texture2D(tNext, sN + vec2(ca, 0.0)).r,
    texture2D(tNext, sN).g,
    texture2D(tNext, sN - vec2(ca, 0.0)).b
  );

  vec3 col = mix(colC, colN, m);

  float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
  col = mix(col, uOverlay, (1.0 - vig) * 0.28);

  gl_FragColor = vec4(col, 1.0);
}
`

function makeFallbackTexture(gl: GL): Texture {
  const size = 4
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i += 1) {
    data[i * 4] = 24
    data[i * 4 + 1] = 24
    data[i * 4 + 2] = 28
    data[i * 4 + 3] = 255
  }
  return new Texture(gl, { image: data, width: size, height: size, generateMipmaps: false })
}

function hexToRgb(hex: string): [number, number, number] {
  let h = (hex || '#000000').replace('#', '')
  if (h.length === 3) {
    h = h
      .split('')
      .map(c => c + c)
      .join('')
  }
  const n = parseInt(h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

interface EngineConfig {
  items: MorphItem[]
  startIndex: number
  reducedMotion: boolean
  dprCap: number
  getOptions: () => EngineOptions
  onIndexChange: (index: number) => void
  onLost: () => void
}

interface ScalarUniform {
  value: number
}
interface Vec2Uniform {
  value: number[]
}
interface Vec3Uniform {
  value: number[]
}
interface TextureUniform {
  value: Texture
}

interface MorphUniforms {
  tCurrent: TextureUniform
  tNext: TextureUniform
  uResolution: Vec2Uniform
  uCurrentSize: Vec2Uniform
  uNextSize: Vec2Uniform
  uProgress: ScalarUniform
  uDir: ScalarUniform
  uMode: ScalarUniform
  uIntensity: ScalarUniform
  uScale: ScalarUniform
  uAberration: ScalarUniform
  uDrift: ScalarUniform
  uTime: ScalarUniform
  uReduce: ScalarUniform
  uPointer: Vec2Uniform
  uOverlay: Vec3Uniform
}

class MorphEngine {
  private container: HTMLElement
  private items: MorphItem[]
  private getOptions: () => EngineOptions
  private onIndexChange: (index: number) => void
  private onLost: () => void
  private reducedMotion: boolean

  private current: number
  private animating = false
  private dragging = false
  private dragDir = 0
  private shownIndex: number
  private tween: gsap.core.Tween | null = null

  private renderer: Renderer
  private gl: GL
  private canvas: HTMLCanvasElement
  private geometry: Triangle
  private program: Program
  private u: MorphUniforms
  private mesh: Mesh
  private textures: Texture[]
  private sizes: [number, number][]
  private resizeObserver: ResizeObserver
  private raf = 0
  private ioVisible = true
  private extPaused = false
  private destroyed = false
  private observer: IntersectionObserver
  private boundLoop: (t: number) => void
  private boundContextLost: (e: Event) => void

  constructor(container: HTMLElement, config: EngineConfig) {
    this.container = container
    this.items = config.items
    this.getOptions = config.getOptions
    this.onIndexChange = config.onIndexChange
    this.onLost = config.onLost
    this.reducedMotion = config.reducedMotion
    this.current = config.startIndex
    this.shownIndex = config.startIndex

    this.renderer = new Renderer({
      alpha: false,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, config.dprCap)
    })
    this.gl = this.renderer.gl
    this.gl.clearColor(0.05, 0.05, 0.06, 1)

    this.canvas = this.gl.canvas as HTMLCanvasElement
    this.canvas.className = 'morph-slider__canvas'
    this.canvas.setAttribute('aria-hidden', 'true')
    this.canvas.setAttribute('tabindex', '-1')
    container.appendChild(this.canvas)

    this.geometry = new Triangle(this.gl)

    this.textures = this.items.map(() => makeFallbackTexture(this.gl))
    this.sizes = this.items.map(() => [1, 1] as [number, number])

    const opts = this.getOptions()
    this.program = new Program(this.gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        tCurrent: { value: this.textures[this.current] },
        tNext: { value: this.textures[this.current] },
        uResolution: { value: [1, 1] },
        uCurrentSize: { value: this.sizes[this.current] },
        uNextSize: { value: this.sizes[this.current] },
        uProgress: { value: 0 },
        uDir: { value: 1 },
        uMode: { value: TRANSITIONS[opts.transition] ?? 0 },
        uIntensity: { value: opts.intensity },
        uScale: { value: opts.scale },
        uAberration: { value: opts.aberration },
        uDrift: { value: opts.drift },
        uTime: { value: 0 },
        uReduce: { value: this.reducedMotion ? 1 : 0 },
        uPointer: { value: [0.5, 0.5] },
        uOverlay: { value: hexToRgb(opts.overlayColor) }
      }
    })
    this.u = this.program.uniforms as unknown as MorphUniforms

    this.mesh = new Mesh(this.gl, { geometry: this.geometry, program: this.program })

    this.boundContextLost = this.onContextLost.bind(this)
    this.canvas.addEventListener('webglcontextlost', this.boundContextLost, false)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()

    this.loadTextures()

    // 离屏真停 rAF：滚出视口 cancel，回屏 resume，不重建 renderer
    this.observer = new IntersectionObserver(
      entries => {
        this.ioVisible = entries.some(e => e.isIntersecting)
        this.ioVisible ? this.startLoop() : this.stopLoop()
      },
      { rootMargin: '160px 0px' }
    )
    this.observer.observe(container)

    this.boundLoop = this.loop.bind(this)
    this.startLoop()
  }

  private startLoop(): void {
    if (this.destroyed || this.extPaused || !this.ioVisible || this.raf !== 0) return
    this.raf = requestAnimationFrame(this.boundLoop)
  }

  private stopLoop(): void {
    if (this.raf !== 0) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    }
  }

  setExtPaused(paused: boolean): void {
    this.extPaused = paused
    paused ? this.stopLoop() : this.startLoop()
  }

  private loadTextures(): void {
    this.items.forEach((item, index) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = item.image
      img.onload = () => {
        if (this.destroyed) return
        const texture = new Texture(this.gl, { generateMipmaps: false })
        texture.image = img
        this.textures[index] = texture
        this.sizes[index] = [img.naturalWidth || 1, img.naturalHeight || 1]
        if (index === this.current) {
          this.u.tCurrent.value = texture
          this.u.uCurrentSize.value = this.sizes[index]
        }
      }
      img.onerror = () => {}
    })
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect()
    const w = Math.max(rect.width, 1)
    const h = Math.max(rect.height, 1)
    this.renderer.setSize(w, h)
    // gl_FragCoord 是设备像素 → 必须配 drawingBuffer 尺寸，不能配 CSS px
    this.u.uResolution.value = [this.gl.canvas.width, this.gl.canvas.height]
  }

  private syncOptions(): void {
    const opts = this.getOptions()
    this.u.uMode.value = TRANSITIONS[opts.transition] ?? 0
    this.u.uIntensity.value = opts.intensity
    this.u.uScale.value = opts.scale
    this.u.uAberration.value = opts.aberration
    this.u.uDrift.value = opts.drift
    this.u.uOverlay.value = hexToRgb(opts.overlayColor)
  }

  private loop(t: number): void {
    this.u.uTime.value = t * 0.001
    if (!this.dragging && !this.animating) this.syncOptions()
    this.renderer.render({ scene: this.mesh })
    this.raf = requestAnimationFrame(this.boundLoop)
  }

  private wrap(i: number): number {
    const n = this.items.length
    return ((i % n) + n) % n
  }

  private prepareNext(dir: number): number {
    const target = this.wrap(this.current + dir)
    this.u.tCurrent.value = this.textures[this.current]!
    this.u.uCurrentSize.value = this.sizes[this.current]!
    this.u.tNext.value = this.textures[target]!
    this.u.uNextSize.value = this.sizes[target]!
    this.u.uDir.value = dir
    return target
  }

  goTo(dir: number): void {
    if (this.animating || this.dragging || this.items.length < 2) return
    const opts = this.getOptions()
    if (!opts.loop) {
      const raw = this.current + dir
      if (raw < 0 || raw > this.items.length - 1) return
    }
    this.syncOptions()
    const target = this.prepareNext(dir)
    this.animating = true
    this.announce(target)
    const duration = this.reducedMotion ? Math.min(opts.duration, 0.4) : opts.duration
    this.tween = gsap.fromTo(
      this.u.uProgress,
      { value: 0 },
      {
        value: 1,
        duration,
        ease: opts.ease,
        onComplete: () => this.commit(target)
      }
    )
  }

  private announce(index: number): void {
    if (index === this.shownIndex) return
    this.shownIndex = index
    this.onIndexChange(index)
  }

  private commit(target: number): void {
    this.current = target
    this.u.tCurrent.value = this.textures[target]!
    this.u.uCurrentSize.value = this.sizes[target]!
    this.u.uProgress.value = 0
    this.animating = false
    this.tween = null
    this.announce(target)
  }

  next(): void {
    this.goTo(1)
  }

  prev(): void {
    this.goTo(-1)
  }

  setPointer(x: number, y: number): void {
    this.u.uPointer.value = [x, y]
  }

  beginDrag(): boolean {
    if (this.animating || this.items.length < 2) return false
    this.dragging = true
    this.dragDir = 0
    this.syncOptions()
    return true
  }

  drag(ndx: number): void {
    if (!this.dragging) return
    const opts = this.getOptions()
    const dir = ndx < 0 ? 1 : -1
    if (!opts.loop) {
      const raw = this.current + dir
      if (raw < 0 || raw > this.items.length - 1) {
        this.u.uProgress.value = 0
        return
      }
    }
    if (dir !== this.dragDir) {
      this.dragDir = dir
      this.prepareNext(dir)
    }
    const progress = Math.min(Math.abs(ndx), 1)
    this.u.uProgress.value = progress
    this.announce(progress > 0.5 ? this.wrap(this.current + dir) : this.current)
  }

  endDrag(): void {
    if (!this.dragging) return
    this.dragging = false
    const p = this.u.uProgress.value
    if (this.dragDir === 0) return
    const target = this.wrap(this.current + this.dragDir)
    const duration = this.reducedMotion ? 0.3 : 0.5
    this.animating = true
    if (p > 0.4) {
      this.announce(target)
      this.tween = gsap.to(this.u.uProgress, {
        value: 1,
        duration,
        ease: 'power2.out',
        onComplete: () => this.commit(target)
      })
    } else {
      this.announce(this.current)
      this.tween = gsap.to(this.u.uProgress, {
        value: 0,
        duration,
        ease: 'power2.out',
        onComplete: () => {
          this.animating = false
          this.tween = null
        }
      })
    }
  }

  private onContextLost(e: Event): void {
    e.preventDefault()
    this.stopLoop()
    this.onLost()
  }

  destroy(): void {
    this.destroyed = true
    // 先摘监听再 loseContext：loseContext 会同步派发 webglcontextlost，
    // 不摘会触发 onLost 让父组件误切兜底
    this.canvas.removeEventListener('webglcontextlost', this.boundContextLost)
    this.observer.disconnect()
    this.stopLoop()
    if (this.tween) this.tween.kill()
    this.resizeObserver.disconnect()
    this.textures.forEach(tex => {
      if (tex && tex.texture) this.gl.deleteTexture(tex.texture)
    })
    // geometry 不显式释放：紧接着 loseContext 会回收整个 context 的资源
    if (this.program && this.program.program) this.gl.deleteProgram(this.program.program)
    const ext = this.gl.getExtension('WEBGL_lose_context')
    if (ext) ext.loseContext()
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas)
  }
}

const props = withDefaults(defineProps<MorphSliderProps>(), {
  items: () => [],
  startIndex: 0,
  transition: 'melt',
  duration: 1.1,
  ease: 'power2.inOut',
  intensity: 0.55,
  scale: 2.4,
  aberration: 0.35,
  drift: 0.4,
  autoplay: false,
  autoplayDelay: 4,
  loop: true,
  radius: 0,
  overlayColor: '#000000',
  decorative: false,
  pauseOnHover: true,
  paused: false,
  dprCap: 2
})

const emit = defineEmits<{ lost: [] }>()

const containerRef = ref<HTMLDivElement | null>(null)
const index = ref(props.startIndex)
const hovering = ref(false)
/** WebGL 不可用 / context 丢失时切 <img> 静态兜底，不白屏 */
const engineFailed = ref(false)

let engine: MorphEngine | null = null

const getOptions = (): EngineOptions => ({
  transition: props.transition,
  duration: props.duration,
  ease: props.ease,
  intensity: props.intensity,
  scale: props.scale,
  aberration: props.aberration,
  drift: props.drift,
  overlayColor: props.overlayColor,
  loop: props.loop
})

const setupEngine = (): void => {
  const container = containerRef.value
  if (!container) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  try {
    engine = new MorphEngine(container, {
      items: props.items,
      startIndex: props.startIndex,
      reducedMotion,
      dprCap: props.dprCap,
      getOptions,
      onIndexChange: i => {
        index.value = i
      },
      onLost: () => {
        engineFailed.value = true
        engine = null
        emit('lost')
      }
    })
  } catch {
    // 不支持 WebGL（老 Safari / 禁 GPU / context 创建失败）
    engineFailed.value = true
    engine = null
    emit('lost')
  }
  index.value = props.startIndex
}

onMounted(() => {
  if (props.items.length === 0) {
    engineFailed.value = true
    return
  }
  setupEngine()
})

onUnmounted(() => {
  engine?.destroy()
  engine = null
})

watch(
  () => [props.items, props.startIndex],
  () => {
    engine?.destroy()
    engine = null
    engineFailed.value = false
    setupEngine()
  }
)

watch(
  () => props.paused,
  paused => {
    engine?.setExtPaused(paused)
  }
)

// autoplay：不依赖 index 变化推进（背景轮播不需要「交互后重置计时」的语义），
// 固定周期 next()；hover 是否暂停由 pauseOnHover 决定
let autoplayTimer: number | null = null
watch(
  () => [props.autoplay, props.autoplayDelay, hovering.value, engineFailed.value],
  () => {
    if (autoplayTimer !== null) {
      window.clearTimeout(autoplayTimer)
      autoplayTimer = null
    }
    if (!props.autoplay || props.autoplayDelay <= 0 || engineFailed.value) return
    if (props.pauseOnHover && hovering.value) return
    autoplayTimer = window.setTimeout(function tick() {
      engine?.next()
      autoplayTimer = window.setTimeout(tick, Math.max(props.autoplayDelay, 1) * 1000)
    }, Math.max(props.autoplayDelay, 1) * 1000)
  },
  { immediate: true }
)

const onKeyDown = (e: KeyboardEvent) => {
  if (props.decorative) return
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    engine?.next()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    engine?.prev()
  }
}

const rootStyle = computed<CSSProperties>(
  () =>
    ({
      borderRadius: `${props.radius}px`,
      touchAction: 'pan-y'
    }) as CSSProperties
)
</script>

<template>
  <div
    class="morph-slider"
    :class="{ 'is-decorative': decorative }"
    :style="rootStyle"
    :aria-hidden="decorative ? 'true' : undefined"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <!-- WebGL 兜底：不支持 / context 丢失 / 无 items 时退回静态首图 -->
    <img
      v-if="engineFailed && items.length > 0"
      class="morph-slider__fallback"
      :src="items[props.startIndex]?.image ?? items[0]!.image"
      alt=""
      decoding="async"
    />
    <div
      ref="containerRef"
      class="morph-slider__viewport"
      :role="decorative ? undefined : 'group'"
      :aria-roledescription="decorative ? undefined : 'carousel'"
      :aria-label="decorative ? undefined : 'Image morph slider'"
      :tabindex="decorative ? undefined : 0"
      @keydown="onKeyDown"
    />
  </div>
</template>

<style scoped>
.morph-slider {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
  background: var(--bases-bg, #0c0c0e);
}

.morph-slider__viewport {
  position: absolute;
  inset: 0;
  outline: none;
  cursor: grab;
}

.morph-slider__viewport:active {
  cursor: grabbing;
}

.morph-slider:not(.is-decorative) .morph-slider__viewport:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.7);
}

.morph-slider__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.morph-slider__fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
