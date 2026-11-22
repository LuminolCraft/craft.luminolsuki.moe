<!--
  GlobeDust —— 示例 C：星尘球

  做法：球面撒 4.6 万个点（半径按 fbm 起伏，读起来还是一颗星球而不是一个球），
  点的亮度在 shader 里按 dot(法线, 光向) 算，昼夜分界自然过渡，暗面点更亮当城市光。
  指针位置换算成球面一点传进去，附近点沿法线抬起 + 提亮 —— 鼠标掠过会有涟漪。

  点渲染用 additive + 不写深度，球心放一颗接近纯黑的小球挡住背面的点，于是有体积感。
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { createStage, fbm3, readPalette, type Stage } from './globe-scene'

const host = ref<HTMLDivElement | null>(null)
const failed = ref(false)
let stage: Stage | null = null

const COUNT = 46000

onMounted(() => {
  const el = host.value
  if (!el) return
  const p = readPalette()
  const st = createStage(el)
  if (!st) {
    failed.value = true
    return
  }
  stage = st
  const { scene, camera } = st
  camera.position.set(0, 0.1, 3.0)

  const positions = new Float32Array(COUNT * 3)
  const seeds = new Float32Array(COUNT)
  const bright = new Float32Array(COUNT)
  const dir = new THREE.Vector3()
  for (let i = 0; i < COUNT; i++) {
    dir.randomDirection()
    const h = fbm3(dir.x * 2.4 + 4.2, dir.y * 2.4 + 8.6, dir.z * 2.4 + 1.9, 4)
    const land = fbm3(dir.x * 1.4 + 21, dir.y * 1.4 + 5, dir.z * 1.4 + 13, 3)
    const r = 1 + h * 0.055 + Math.max(0, land - 0.05) * 0.02
    positions.set([dir.x * r, dir.y * r, dir.z * r], i * 3)
    seeds[i] = Math.random()
    // 大尺度起伏当「大陆」：亮的地方粒子更密更亮，球面就有了明暗结构
    bright[i] = THREE.MathUtils.clamp((land + 0.45) / 0.9, 0, 1)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1))
  geo.setAttribute('aBright', new THREE.Float32BufferAttribute(bright, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uLight: { value: new THREE.Vector3(1, 0.2, 0.6) },
      uPointer: { value: new THREE.Vector3(0, 0, 1.2) },
      uDay: { value: p.text.clone().lerp(p.primary, 0.35) },
      uNight: { value: p.primary.clone().lerp(new THREE.Color('#ffd7a8'), 0.35) },
      uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aBright;
      uniform float uTime;
      uniform vec3 uPointer;
      uniform vec3 uLight;
      uniform float uDpr;
      varying float vLit;
      varying float vSeed;
      varying float vFacing;
      void main() {
        vec3 n = normalize(position);
        float d = distance(position, uPointer);
        // 指针附近的点抬起来，形成一道涟漪
        float ripple = sin(d * 9.0 - uTime * 2.2) * exp(-d * 2.6) * 0.075;
        vec3 pos = position + n * ripple;

        vSeed = aSeed;
        vLit = dot(n, normalize(uLight)) + aBright * 0.25;
        // 背离镜头的那半球直接压暗，等于自己做遮挡，不必再塞一颗挡板球
        vFacing = dot(normalize(normalMatrix * n), normalize((modelViewMatrix * vec4(pos, 1.0)).xyz));

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = (1.4 + aSeed * 2.2 + aBright * 1.6) * uDpr * (2.9 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uDay;
      uniform vec3 uNight;
      uniform float uTime;
      varying float vLit;
      varying float vSeed;
      varying float vFacing;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float soft = smoothstep(0.5, 0.06, d);
        float night = smoothstep(0.25, -0.5, vLit);
        float day = smoothstep(-0.1, 0.55, vLit);
        vec3 col = mix(uDay * 0.7, uNight, night) + uDay * day * 0.45;
        float twinkle = 0.78 + 0.22 * sin(uTime * 2.4 + vSeed * 60.0);
        float front = smoothstep(-0.15, 0.35, vFacing);
        // 边缘再补一圈辉光，轮廓才立得住
        float limb = pow(1.0 - abs(vFacing), 5.0);
        float a = soft * front * (0.34 + night * 0.62 + day * 0.34 + limb * 0.9) * twinkle;
        gl_FragColor = vec4(col, a);
      }
    `,
  })

  const globe = new THREE.Points(geo, mat)
  scene.add(globe)

  // 外圈两段弧，给画面一个「刻度」参照
  const ringMat = new THREE.MeshBasicMaterial({
    color: p.primary,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.24, 1.243, 200, 1, 0.5, Math.PI * 1.2), ringMat)
  ring.rotation.set(1.35, 0.2, 0.35)
  scene.add(ring)

  const ptr = new THREE.Vector3()
  st.onFrame((time) => {
    const lightA = time * 0.18
    mat.uniforms.uLight!.value.set(Math.cos(lightA), 0.35, Math.sin(lightA))
    mat.uniforms.uTime!.value = time

    // 指针映射到球面前侧的一点（-1~1 → 世界坐标），涟漪才有落点
    ptr.set(st.pointer.sx * 1.15, -st.pointer.sy * 1.15, 1.05).normalize()
    mat.uniforms.uPointer!.value.copy(ptr)

    globe.rotation.y = time * 0.03 + st.pointer.sx * 0.45
    ring.rotation.z = 0.35 + time * 0.04
    camera.position.x = st.pointer.sx * 0.14
    camera.position.y = 0.1 - st.pointer.sy * 0.1
    camera.lookAt(0, 0, 0)
  })
})

onBeforeUnmount(() => stage?.dispose())
</script>

<template>
  <div class="gd">
    <div ref="host" class="gd__stage" role="img" aria-label="由星尘组成的世界球" />
    <p v-if="failed" class="gd__fallback">当前环境不支持 WebGL，此处显示为文字说明。</p>
  </div>
</template>

<style scoped>
.gd {
  position: relative;
  width: 100%;
  height: 100%;
}
.gd__stage {
  width: 100%;
  height: 100%;
}
.gd__stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
.gd__fallback {
  position: absolute;
  inset: auto 0 12px;
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
</style>
