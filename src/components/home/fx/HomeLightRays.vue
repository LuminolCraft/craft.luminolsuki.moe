<!--
  HomeLightRays — 体积光射线氛围层
  移植自 Vue Bits「LightRays」(https://vue-bits.dev/backgrounds/light-rays)
  原作者 David Haz · MIT + Commons Clause 许可，本文件为本地改写版（去 Tailwind、接入项目主题令牌）

  与 TocToggles.vue 主题切换的兼容约定：
  - 带 mix-blend-mode，属「环境层」，必须在 :root[data-vt] 帧内隐藏
  - 射线颜色由 raysColor 属性传入，两套主题各一套常量，不读 getComputedStyle
  - IntersectionObserver 控制显隐；页面隐藏时暂停 rAF；卸载释放 WebGL context
-->
<template>
  <div ref="containerRef" class="rays-layer" aria-hidden="true" />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Mesh, Program, Renderer, Triangle } from 'ogl'

export type RaysOrigin =
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'left'
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left'

// 微调点：射线密度 lightSpread、长度 rayLength、淡出 fadeDistance、鼠标影响 mouseInfluence
const props = withDefaults(
  defineProps<{
    raysOrigin?: RaysOrigin
    raysColor?: string
    raysSpeed?: number
    lightSpread?: number
    rayLength?: number
    pulsating?: boolean
    fadeDistance?: number
    saturation?: number
    followMouse?: boolean
    mouseInfluence?: number
    noiseAmount?: number
    distortion?: number
    opacity?: number
  }>(),
  {
    raysOrigin: 'top-center',
    raysColor: '#a78bfa',
    raysSpeed: 1,
    lightSpread: 1,
    rayLength: 1.6,
    pulsating: false,
    fadeDistance: 1.1,
    saturation: 1,
    followMouse: true,
    mouseInfluence: 0.08,
    noiseAmount: 0,
    distortion: 0,
    opacity: 0.55,
  },
)

const containerRef = ref<HTMLDivElement | null>(null)

let rafId = 0
let renderer: Renderer | null = null
let program: Program | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let isVisible = false
let isPageVisible = true
let resizeRaf = 0

const mouseRef = { x: 0.5, y: 0.5 }
const smoothMouseRef = { x: 0.5, y: 0.5 }

const rgbColor = computed<[number, number, number]>(() => hexToRgb(props.raysColor))

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m
    ? [parseInt(m[1]!, 16) / 255, parseInt(m[2]!, 16) / 255, parseInt(m[3]!, 16) / 255]
    : [1, 1, 1]
}

function getAnchorAndDir(
  origin: RaysOrigin,
  w: number,
  h: number,
): { anchor: [number, number]; dir: [number, number] } {
  const outside = 0.2
  switch (origin) {
    case 'top-left':
      return { anchor: [0, -outside * h], dir: [0, 1] }
    case 'top-right':
      return { anchor: [w, -outside * h], dir: [0, 1] }
    case 'left':
      return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] }
    case 'right':
      return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] }
    case 'bottom-left':
      return { anchor: [0, (1 + outside) * h], dir: [0, -1] }
    case 'bottom-center':
      return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] }
    case 'bottom-right':
      return { anchor: [w, (1 + outside) * h], dir: [0, -1] }
    default:
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] }
  }
}

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`

const FRAG = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;

uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;

  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);

  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);

  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                           1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                           1.1 * raysSpeed);

  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}`

function updatePlacement(): void {
  if (!containerRef.value || !renderer || !program) return
  const w = containerRef.value.offsetWidth
  const h = containerRef.value.offsetHeight
  if (w === 0 || h === 0) return
  renderer.setSize(w, h)
  const dpr = renderer.dpr
  const pw = w * dpr
  const ph = h * dpr
  program.uniforms.iResolution.value = [pw, ph]
  const { anchor, dir } = getAnchorAndDir(props.raysOrigin, pw, ph)
  program.uniforms.rayPos.value = anchor
  program.uniforms.rayDir.value = dir
}

function initialize(): void {
  const ctn = containerRef.value
  if (!ctn || renderer) return

  try {
    renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    })
  } catch (error) {
    console.warn('[HomeLightRays] WebGL 初始化失败，退化为静态渐变背景', error)
    renderer = null
    return
  }

  const gl = renderer.gl
  gl.canvas.style.width = '100%'
  gl.canvas.style.height = '100%'
  gl.canvas.style.display = 'block'
  while (ctn.firstChild) ctn.removeChild(ctn.firstChild)
  ctn.appendChild(gl.canvas)

  program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: [1, 1] },
      rayPos: { value: [0, 0] },
      rayDir: { value: [0, 1] },
      raysColor: { value: rgbColor.value },
      raysSpeed: { value: props.raysSpeed },
      lightSpread: { value: props.lightSpread },
      rayLength: { value: props.rayLength },
      pulsating: { value: props.pulsating ? 1 : 0 },
      fadeDistance: { value: props.fadeDistance },
      saturation: { value: props.saturation },
      mousePos: { value: [0.5, 0.5] },
      mouseInfluence: { value: props.followMouse ? props.mouseInfluence : 0 },
      noiseAmount: { value: props.noiseAmount },
      distortion: { value: props.distortion },
    },
  })

  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
  updatePlacement()

  const loop = (t: number) => {
    if (!renderer || !program) return
    if (!isVisible || !isPageVisible) {
      rafId = requestAnimationFrame(loop)
      return
    }
    program.uniforms.iTime.value = t * 0.001

    if (props.followMouse && props.mouseInfluence > 0) {
      const smoothing = 0.92
      smoothMouseRef.x = smoothMouseRef.x * smoothing + mouseRef.x * (1 - smoothing)
      smoothMouseRef.y = smoothMouseRef.y * smoothing + mouseRef.y * (1 - smoothing)
      program.uniforms.mousePos.value = [smoothMouseRef.x, smoothMouseRef.y]
    }

    try {
      renderer.render({ scene: mesh })
    } catch (error) {
      console.warn('[HomeLightRays] 渲染异常，停止循环', error)
      return
    }
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)

  resizeObserver = new ResizeObserver(() => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf)
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0
      updatePlacement()
    })
  })
  resizeObserver.observe(ctn)
}

let mouseThrottleId = 0
function handleMouseMove(e: MouseEvent): void {
  if (!containerRef.value || mouseThrottleId) return
  mouseThrottleId = requestAnimationFrame(() => {
    mouseThrottleId = 0
    if (!containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    mouseRef.x = (e.clientX - rect.left) / rect.width
    mouseRef.y = (e.clientY - rect.top) / rect.height
  })
}

function handlePageVisibility(): void {
  isPageVisible = document.visibilityState === 'visible'
}

onMounted(() => {
  const ctn = containerRef.value
  if (!ctn) return

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0]?.isIntersecting ?? false
    },
    { threshold: 0.05, rootMargin: '80px' },
  )
  intersectionObserver.observe(ctn)

  window.addEventListener('mousemove', handleMouseMove, { passive: true })
  document.addEventListener('visibilitychange', handlePageVisibility)

  // 首帧后才创建 WebGL，避免与首屏渲染抢主线程
  requestAnimationFrame(() => initialize())
})

watch(
  () => [
    props.raysColor,
    props.raysSpeed,
    props.lightSpread,
    props.raysOrigin,
    props.rayLength,
    props.pulsating,
    props.fadeDistance,
    props.saturation,
    props.mouseInfluence,
    props.noiseAmount,
    props.distortion,
  ],
  () => {
    if (!program) return
    program.uniforms.raysColor.value = rgbColor.value
    program.uniforms.raysSpeed.value = props.raysSpeed
    program.uniforms.lightSpread.value = props.lightSpread
    program.uniforms.rayLength.value = props.rayLength
    program.uniforms.pulsating.value = props.pulsating ? 1 : 0
    program.uniforms.fadeDistance.value = props.fadeDistance
    program.uniforms.saturation.value = props.saturation
    program.uniforms.mouseInfluence.value = props.followMouse ? props.mouseInfluence : 0
    program.uniforms.noiseAmount.value = props.noiseAmount
    program.uniforms.distortion.value = props.distortion
    updatePlacement()
  },
)

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  rafId = 0
  if (mouseThrottleId) cancelAnimationFrame(mouseThrottleId)
  mouseThrottleId = 0
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  resizeRaf = 0

  window.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('visibilitychange', handlePageVisibility)
  intersectionObserver?.disconnect()
  intersectionObserver = null
  resizeObserver?.disconnect()
  resizeObserver = null

  if (renderer) {
    try {
      const canvas = renderer.gl.canvas
      renderer.gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.parentNode?.removeChild(canvas)
    } catch (error) {
      console.warn('[HomeLightRays] 清理 WebGL 资源失败', error)
    }
    renderer = null
  }
  program = null
})
</script>

<style scoped>
.rays-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  opacity: v-bind(opacity);
  mix-blend-mode: screen;
}

/* 主题切换快照帧内隐藏：避免与旧主题像素混合产生色块 */
:root[data-vt] .rays-layer {
  opacity: 0 !important;
}

@media (prefers-reduced-motion: reduce) {
  .rays-layer {
    opacity: 0;
  }
}
</style>
