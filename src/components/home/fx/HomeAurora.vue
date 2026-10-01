<!--
  HomeAurora — 极光氛围背景层
  移植自 Vue Bits「Aurora」(https://vue-bits.dev/backgrounds/aurora)
  原作者 David Haz · MIT + Commons Clause 许可，本文件为本地改写版（去 Tailwind、接入项目主题令牌）

  与 TocToggles.vue 主题切换的兼容约定：
  - 本层带 mix-blend-mode，属「环境层」，必须在 :root[data-vt] 帧内隐藏（见下方 style）
  - 颜色由 colorStops 属性传入，两套主题各一套常量，不读 getComputedStyle
  - 卸载时释放 WebGL context，避免切换路由后 context 泄漏
-->
<template>
  <div ref="containerRef" class="aurora-layer" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { Color, Mesh, Program, Renderer, Triangle } from 'ogl'

// 微调点：Aurora 的噪波幅度（越大极光带越"高"）
const props = withDefaults(
  defineProps<{
    colorStops?: string[]
    amplitude?: number
    blend?: number
    speed?: number
    opacity?: number
  }>(),
  {
    colorStops: () => ['#0b0e17', '#8b5cf6', '#0b0e17'],
    amplitude: 1.1,
    blend: 0.55,
    speed: 0.5,
    opacity: 0.9,
  },
)

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \\
  int index = 0;                                            \\
  for (int i = 0; i < 2; i++) {                               \\
     ColorStop currentColor = colors[i];                    \\
     bool isInBetween = currentColor.position <= factor;    \\
     index = int(mix(float(index), float(i), float(isInBetween))); \\
  }                                                         \\
  ColorStop currentColor = colors[index];                   \\
  ColorStop nextColor = colors[index + 1];                  \\
  float range = nextColor.position - currentColor.position; \\
  float lerpFactor = (factor - currentColor.position) / range; \\
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \\
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`

const containerRef = ref<HTMLDivElement | null>(null)

let rafId = 0
let renderer: Renderer | null = null
let program: Program | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let isVisible = true

function toStops(hexes: string[]): [number, number, number][] {
  return hexes.map((hex) => {
    const c = new Color(hex)
    return [c.r, c.g, c.b] as [number, number, number]
  })
}

function applyUniforms(): void {
  if (!program) return
  program.uniforms.uAmplitude.value = props.amplitude
  program.uniforms.uBlend.value = props.blend
  program.uniforms.uColorStops.value = toStops(
    props.colorStops || ['#0b0e17', '#8b5cf6', '#0b0e17'],
  )
  if (containerRef.value) {
    program.uniforms.uResolution.value = [
      containerRef.value.offsetWidth,
      containerRef.value.offsetHeight,
    ]
  }
}

onMounted(() => {
  const ctn = containerRef.value
  if (!ctn) return

  try {
    renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    })
  } catch (error) {
    console.warn('[HomeAurora] WebGL 初始化失败，退化为静态渐变背景', error)
    renderer = null
    return
  }

  const gl = renderer.gl
  gl.clearColor(0, 0, 0, 0)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.canvas.style.backgroundColor = 'transparent'
  gl.canvas.style.width = '100%'
  gl.canvas.style.height = '100%'
  gl.canvas.style.display = 'block'
  ctn.appendChild(gl.canvas)

  const geometry = new Triangle(gl)
  if (geometry.attributes.uv) delete geometry.attributes.uv

  program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uAmplitude: { value: props.amplitude },
      uColorStops: { value: toStops(props.colorStops) },
      uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
      uBlend: { value: props.blend },
    },
  })

  const mesh = new Mesh(gl, { geometry, program })
  applyUniforms()

  // 尺寸变化用 ResizeObserver，避免 window resize 抖动
  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !program || !containerRef.value) return
    const w = containerRef.value.offsetWidth
    const h = containerRef.value.offsetHeight
    renderer.setSize(w, h)
    program.uniforms.uResolution.value = [w, h]
  })
  resizeObserver.observe(ctn)

  // 离开视口即停渲染，省 GPU
  intersectionObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0]?.isIntersecting ?? false
    },
    { threshold: 0 },
  )
  intersectionObserver.observe(ctn)

  const update = (t: number) => {
    rafId = requestAnimationFrame(update)
    if (!isVisible || !program || !renderer) return
    program.uniforms.uTime.value = t * 0.001 * props.speed * 0.1
    renderer.render({ scene: mesh })
  }
  rafId = requestAnimationFrame(update)
})

watch(() => [props.amplitude, props.blend, props.colorStops], applyUniforms, { deep: true })

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  rafId = 0
  resizeObserver?.disconnect()
  resizeObserver = null
  intersectionObserver?.disconnect()
  intersectionObserver = null

  const ctn = containerRef.value
  if (renderer) {
    const canvas = renderer.gl.canvas
    if (ctn && canvas.parentNode === ctn) ctn.removeChild(canvas)
    renderer.gl.getExtension('WEBGL_lose_context')?.loseContext()
    renderer = null
  }
  program = null
})
</script>

<style scoped>
.aurora-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: v-bind(opacity);
  mix-blend-mode: screen;
}

/* 主题切换快照帧内隐藏：避免与旧主题像素混合产生色块 */
:root[data-vt] .aurora-layer {
  opacity: 0 !important;
}

@media (prefers-reduced-motion: reduce) {
  .aurora-layer {
    opacity: 0;
  }
}
</style>
