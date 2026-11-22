<!--
  GlobeScan —— 示例 B：扫描建造球（SVG 贴图 + HTML-in-Canvas）

  做法：
  1. 陆地不是贴图资源，是用 SVG 现画的等高线轮廓 + 经纬网，再栅格化成球面贴图（同首页等高线一套写法）；
  2. 一条扫描线从南极扫到北极，线以下「已建造」发亮、以上只剩暗底 —— 用 shader 里比较
     position.y 与 uScanY 实现，不用两个模型拼接；
  3. 前景那行说明文字是真的 DOM：借 three 的 HTMLTexture（HTML-in-Canvas 的 WebGL 通道，
     Chrome 157+ 默认开启），把元素直接上传成纹理贴到平面上，所以文字仍在无障碍树里；
     环境不支持时退回普通 DOM 覆盖层。

  全部尺寸与配色取自 CSS 变量，深浅色切换后重建即可。
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { createStage, readPalette, svgToTexture, type Stage } from './globe-scene'

const host = ref<HTMLDivElement | null>(null)
const failed = ref(false)
const hicOk = ref(false)
let stage: Stage | null = null

/** 等距圆柱投影下画一块陆地：极坐标 + 三频正弦扰动，横向拉宽一点；scale 用来画同心等高线 */
function shrinkPath(cx: number, cy: number, r: number, seed: number, scale: number): string {
  const steps = 72
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const k =
      1 +
      0.26 * Math.sin(3 * t + seed) +
      0.13 * Math.sin(5 * t - seed * 1.7) +
      0.07 * Math.sin(7 * t + seed * 0.6)
    const x = cx + Math.cos(t) * r * 1.32 * k * scale
    const y = cy + Math.sin(t) * r * k * scale
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return `${d}Z`
}

function buildSvg(color: string): string {
  const W = 2048
  const H = 1024
  const lands = [
    { cx: 430, cy: 360, r: 190, seed: 0.7 },
    { cx: 760, cy: 620, r: 230, seed: 2.1 },
    { cx: 1180, cy: 300, r: 170, seed: 4.3 },
    { cx: 1420, cy: 640, r: 205, seed: 1.2 },
    { cx: 940, cy: 250, r: 110, seed: 5.6 },
    { cx: 260, cy: 720, r: 120, seed: 3.4 },
  ]

  const grid: string[] = []
  for (let x = 0; x <= W; x += 128) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" />`)
  for (let y = 0; y <= H; y += 128) grid.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" />`)

  const contours = lands
    .map((l) => {
      const rings = [1, 0.74, 0.5, 0.28]
        .map(
          (s, i) =>
            `<path d="${shrinkPath(l.cx, l.cy, l.r, l.seed, s)}" stroke-width="${
              i === 0 ? 7 : 3.2
            }" stroke-opacity="${(0.95 - i * 0.18).toFixed(2)}" />`,
        )
        .join('')
      return `<g fill="none" stroke="${color}" stroke-linejoin="round">${rings}</g>`
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <g stroke="#ffffff" stroke-opacity="0.07" stroke-width="2">${grid.join('')}</g>
    ${contours}
  </svg>`
}

onMounted(async () => {
  const el = host.value
  if (!el) return
  const p = readPalette()
  const st = createStage(el)
  if (!st) {
    failed.value = true
    return
  }
  stage = st
  const { scene, camera, renderer } = st
  camera.position.set(0, 0.08, 3.15)

  const hex = `#${p.primary.getHexString()}`
  let tex: THREE.CanvasTexture
  try {
    tex = await svgToTexture(buildSvg(hex))
  } catch {
    failed.value = true
    st.dispose()
    stage = null
    return
  }

  const uniforms = {
    uMap: { value: tex },
    uScanY: { value: -1.15 },
    uColor: { value: p.primary.clone() },
    uCore: { value: new THREE.Color('#05060c') },
  }

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 80),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vY;
        varying float vRim;
        void main() {
          vUv = uv;
          vY = position.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vRim = 1.0 - abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uScanY;
        uniform vec3 uColor;
        uniform vec3 uCore;
        varying vec2 vUv;
        varying float vY;
        varying float vRim;
        void main() {
          float line = texture2D(uMap, vUv).a;
          // 扫描线以下算「已建造」
          float built = smoothstep(uScanY + 0.04, uScanY - 0.04, vY);
          float edge = exp(-pow((vY - uScanY) * 16.0, 2.0));
          vec3 base = mix(uCore, uColor * 0.12, built * 0.85);
          vec3 col = base
            + uColor * line * (0.16 + built * 0.95)
            + uColor * edge * 0.9
            + uColor * pow(vRim, 3.4) * 0.32;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  )
  scene.add(sphere)

  /* 扫描环：跟着 uScanY 上下走的一道光圈 */
  const ringMat = new THREE.MeshBasicMaterial({
    color: p.primary,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.999, 1.035, 160), ringMat)
  ring.rotation.x = -Math.PI / 2
  scene.add(ring)

  /* 外圈细轨道，静止当刻度 */
  const orbit = new THREE.Mesh(
    new THREE.RingGeometry(1.28, 1.283, 200),
    new THREE.MeshBasicMaterial({
      color: p.primary,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  orbit.rotation.set(1.42, 0.16, 0.2)
  scene.add(orbit)

  /* —— HTML-in-Canvas：把 DOM 文案上传成纹理，贴成球前面的悬浮标签 —— */
  const readVar = (name: string, fallback: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  const label = document.createElement('div')
  label.setAttribute('drawable', '')
  label.style.cssText = [
    'position:absolute',
    'left:0',
    'top:0',
    'width:360px',
    'padding:10px 14px',
    'border-left:2px solid ' + hex,
    'background:linear-gradient(90deg,rgba(10,10,18,0.86),rgba(10,10,18,0))',
    'font-family:' + readVar('--font-primary', 'system-ui'),
    'color:' + readVar('--text-color', '#f2eefc'),
    'line-height:1.35',
  ].join(';')
  label.innerHTML =
    `<div style="font-family:${readVar('--font-mono', 'monospace')};font-size:11px;letter-spacing:.14em;` +
    `text-transform:uppercase;color:${hex};opacity:.9">scan · 存档扫描</div>` +
    `<div style="font-size:15px;font-weight:600;margin-top:4px">12.8 万块建筑存档</div>` +
    `<div style="font-size:11.5px;opacity:.66;margin-top:2px">同一张地图，自开服起未重置</div>`

  if (st.htmlTexture) {
    renderer.domElement.setAttribute('content', 'drawable')
    renderer.domElement.setAttribute('layoutsubtree', 'true')
    const map = new THREE.HTMLTexture(label)
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.36),
      new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, depthTest: false }),
    )
    plane.position.set(-0.52, -0.62, 1.18)
    plane.renderOrder = 10
    scene.add(plane)
    hicOk.value = true
  }

  st.onFrame((time) => {
    // 5.6s 扫一遍，停 1s 再来
    const t = (time % 6.6) / 5.6
    const scanY = t < 1 ? -1.18 + t * 2.36 : 1.18
    uniforms.uScanY.value = scanY
    ring.position.y = scanY
    ring.visible = t < 1
    ringMat.opacity = 0.85

    sphere.rotation.y = time * 0.05 + st.pointer.sx * 0.4
    camera.position.x = st.pointer.sx * 0.16
    camera.position.y = 0.08 - st.pointer.sy * 0.12
    camera.lookAt(0, 0, 0)
  })
})

onBeforeUnmount(() => stage?.dispose())
</script>

<template>
  <div class="gs">
    <div ref="host" class="gs__stage" role="img" aria-label="扫描建造的世界地图" />
    <p v-if="failed" class="gs__fallback">当前环境不支持 WebGL，此处显示为文字说明。</p>
    <!-- HTML-in-Canvas 不可用时的等价 DOM 版 -->
    <div v-if="!failed && !hicOk" class="gs__cap">
      <span class="gs__cap-kicker">scan · 存档扫描</span>
      <b>12.8 万块建筑存档</b>
      <span class="gs__cap-sub">同一张地图，自开服起未重置</span>
    </div>
  </div>
</template>

<style scoped>
.gs {
  position: relative;
  width: 100%;
  height: 100%;
}
.gs__stage {
  width: 100%;
  height: 100%;
}
.gs__stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
.gs__cap {
  position: absolute;
  left: 6%;
  bottom: 12%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-left: 2px solid var(--primary-color);
  background: linear-gradient(90deg, color-mix(in srgb, var(--background-color) 86%, transparent), transparent);
  color: var(--text-color);
  pointer-events: none;
}
.gs__cap-kicker {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary-color);
}
.gs__cap b {
  font-size: 14px;
  font-weight: 600;
}
.gs__cap-sub {
  font-size: 11px;
  color: var(--text-secondary);
}
.gs__fallback {
  position: absolute;
  inset: auto 0 12px;
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
</style>
