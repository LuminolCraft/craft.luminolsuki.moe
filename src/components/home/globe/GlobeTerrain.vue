<!--
  GlobeTerrain —— 示例 A：昼夜地形球

  做法：二十面体细分（detail 4，5120 面）按 fbm 噪声沿法线抬升，flatShading 得到低模棱面；
  海洋与陆地用顶点色区分，再叠一层同几何的线框当等高线。
  光源绕 Y 轴公转 = 昼夜；夜侧的城市灯火用 Points + 自定义 shader，按 dot(法线, 光照方向)
  自己算显隐，所以灯只亮在暗面。最外层是背面球做 fresnel 大气辉光。

  指针只做阻尼视差（不接管相机），滚动离开视口即停渲染 —— 首页同时挂多个不吃 GPU。
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { createStage, fbm3, readPalette, type Stage } from './globe-scene'

const host = ref<HTMLDivElement | null>(null)
const failed = ref(false)
let stage: Stage | null = null

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
  const { scene, camera, renderer } = st

  const group = new THREE.Group()
  group.rotation.z = 0.14
  scene.add(group)

  /* —— 地形 ——
     纯 fbm 阈值会糊成一整块大陆，看不出海岸线；改成「若干大陆种子 + 高斯衰减」，
     覆盖面积可控，再用 fbm 只做地表起伏。 */
  const SEEDS: { dir: THREE.Vector3; r: number }[] = []
  for (let i = 0; i < 9; i++) {
    const y = 1 - (2 * (i + 0.5)) / 9
    const rad = Math.sqrt(Math.max(0, 1 - y * y))
    const th = i * 2.39996 + 0.8
    SEEDS.push({
      dir: new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad),
      r: 0.4 + 0.15 * Math.abs(Math.sin(i * 2.31)),
    })
  }
  const SEA = 0.55
  const maskOf = (v: THREE.Vector3) => {
    let m = 0
    for (const s of SEEDS) {
      const a = Math.acos(Math.min(1, Math.max(-1, v.dot(s.dir))))
      const g = Math.exp(-((a / s.r) ** 2))
      if (g > m) m = g
    }
    return m
  }

  const geo = new THREE.IcosahedronGeometry(1, 14)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const dir = new THREE.Vector3()

  // 只做位移；海岸线、配色全交给片元着色器，边缘才不会被网格顶点啃出锯齿
  for (let i = 0; i < pos.count; i++) {
    dir.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize()
    const mask = maskOf(dir)
    const ridge = fbm3(dir.x * 5.2 + 9.1, dir.y * 5.2 + 3.7, dir.z * 5.2 + 5.3, 3)
    const r = mask > SEA ? 1 + (mask - SEA) * 0.22 + ridge * 0.02 : 1 + ridge * 0.006
    pos.setXYZ(i, dir.x * r, dir.y * r, dir.z * r)
  }
  geo.computeVertexNormals()

  /* 光照自己算：wrap 光（0.5+0.5·dot）压住暗面，高光只留一道窄带 ——
     内置标准材质在深色主题下太容易烧成一片白。 */
  const globeMat = new THREE.ShaderMaterial({
    uniforms: {
      uSeeds: { value: SEEDS.map((sd) => new THREE.Vector4(sd.dir.x, sd.dir.y, sd.dir.z, sd.r)) },
      uSea: { value: SEA },
      uLight: { value: new THREE.Vector3(1, 0, 0) },
      uOcean: { value: new THREE.Color('#0a1430') },
      uLandA: { value: new THREE.Color('#1b1436') },
      uLandB: { value: p.primary.clone().multiplyScalar(0.68) },
      uCoast: { value: p.primary.clone().lerp(new THREE.Color('#ffffff'), 0.35) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vObj;
      varying vec3 vN;
      void main() {
        vObj = normalize(position);
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec4 uSeeds[9];
      uniform float uSea;
      uniform vec3 uLight;
      uniform vec3 uOcean;
      uniform vec3 uLandA;
      uniform vec3 uLandB;
      uniform vec3 uCoast;
      varying vec3 vObj;
      varying vec3 vN;

      float hash31(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
      }
      float vnoise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash31(i);
        float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
        return mix(
          mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
          mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
          f.z);
      }
      float fbm(vec3 p) {
        float s = 0.0;
        float a = 0.5;
        for (int k = 0; k < 3; k++) { s += vnoise(p) * a; p *= 2.13; a *= 0.5; }
        return s / 0.875;
      }

      void main() {
        // 大陆 = 九颗种子的高斯衰减取最大，和送 GPU 的位移用同一套参数。
        // 角度先用噪声拧一下，圆盘才会长成不规则海岸。
        float warp = fbm(vObj * 2.3);
        float detail = fbm(vObj * 7.0);
        float mask = 0.0;
        for (int i = 0; i < 9; i++) {
          vec4 s = uSeeds[i];
          float a = acos(clamp(dot(vObj, s.xyz), -1.0, 1.0));
          a *= 0.62 + 0.85 * warp;
          a += (detail - 0.5) * 0.16;
          float g = exp(-(a / s.w) * (a / s.w));
          mask = max(mask, g);
        }

        float land = smoothstep(uSea - 0.015, uSea + 0.015, mask);
        float t = clamp((mask - uSea) / 0.42, 0.0, 1.0);
        vec3 base = mix(uOcean, mix(uLandA, uLandB, t), land);

        // 海岸线：贴着海平面的窄带提亮，暗面也能看出轮廓
        float coast = 1.0 - smoothstep(0.0, 0.009, abs(mask - uSea));
        base = mix(base, uCoast, coast * 0.8);

        float d = dot(normalize(vN), normalize(uLight));
        float wrap = 0.5 + 0.5 * d;
        vec3 col = base * (0.24 + 1.1 * pow(wrap, 1.6));
        col += uCoast * pow(max(wrap, 0.0), 16.0) * 0.14;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
  const globe = new THREE.Mesh(geo, globeMat)
  group.add(globe)

  /* —— 等高线：同几何的线框，压一点透明度当等高线读 —— */
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geo),
    new THREE.LineBasicMaterial({ color: p.primary, transparent: true, opacity: 0.13, depthWrite: false }),
  )
  group.add(wire)

  /* —— 城市灯火：只落在陆地上，夜侧才亮 —— */
  const lights: number[] = []
  const seeds: number[] = []
  for (let i = 0; i < pos.count; i += 23) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    if (Math.hypot(x, y, z) < 1.004) continue
    lights.push(x * 1.006, y * 1.006, z * 1.006)
    seeds.push(Math.random())
  }
  const lightGeo = new THREE.BufferGeometry()
  lightGeo.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3))
  lightGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1))
  const lightMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uLight: { value: new THREE.Vector3(1, 0, 0) },
      uTime: { value: 0 },
      uColor: { value: p.primary.clone().lerp(new THREE.Color('#ffd9a0'), 0.55) },
      uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform vec3 uLight;
      uniform float uTime;
      uniform float uDpr;
      varying float vA;
      void main() {
        vec3 n = normalize(position);
        float lit = dot(n, uLight);
        // 夜侧才亮，边缘给一段过渡
        vA = smoothstep(0.18, -0.42, lit) * (0.5 + 0.5 * sin(uTime * 1.7 + aSeed * 42.0));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (1.4 + aSeed * 2.4) * uDpr * (2.4 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float a = smoothstep(0.5, 0.05, d) * vA;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  })
  const cityDots = new THREE.Points(lightGeo, lightMat)
  group.add(cityDots)

  /* —— 大气辉光：背面球 + fresnel —— */
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(1.06, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uColor: { value: p.primary.clone() } },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          // 背面球的法线朝外，圆盘中心 dot≈-1、边缘≈0，所以取绝对值才只在边缘发光
          float f = pow(max(0.0, 0.62 - abs(dot(vN, vV))), 4.0);
          gl_FragColor = vec4(uColor, f * 1.9);
        }
      `,
    }),
  )
  scene.add(atmo)

  /* —— 轨道环：两段弧，缓慢反向转 —— */
  const ringMat = new THREE.MeshBasicMaterial({
    color: p.primary,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const ringA = new THREE.Mesh(new THREE.RingGeometry(1.34, 1.345, 180, 1, 0.3, Math.PI * 1.3), ringMat)
  ringA.rotation.set(1.28, 0.1, 0.5)
  const ringB = new THREE.Mesh(new THREE.RingGeometry(1.52, 1.524, 180, 1, 2.4, Math.PI * 0.75), ringMat)
  ringB.rotation.set(1.12, -0.3, 1.6)
  scene.add(ringA, ringB)

  /* —— 星场 —— */
  const starCount = 900
  const starPos = new Float32Array(starCount * 3)
  const starV = new THREE.Vector3()
  for (let i = 0; i < starCount; i++) {
    starV.randomDirection().multiplyScalar(7 + Math.random() * 9)
    starPos.set([starV.x, starV.y, starV.z], i * 3)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3))
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: p.text, size: 0.035, transparent: true, opacity: 0.5, depthWrite: false }),
  )
  scene.add(stars)

  /* —— 光源方向：自己算，不挂 three 的灯 —— */
  const lightWorld = new THREE.Vector3()
  const lightView = new THREE.Vector3()

  st.onFrame((time) => {
    const a = time * 0.16
    lightWorld.set(Math.cos(a), 0.32, Math.sin(a)).normalize()
    // 球面材质要的是视图空间的方向
    lightView.copy(lightWorld).transformDirection(camera.matrixWorldInverse)
    globeMat.uniforms.uLight!.value.copy(lightView)
    // 城市灯火在物体空间里判断，给世界方向即可
    lightMat.uniforms.uLight!.value.copy(lightWorld)
    lightMat.uniforms.uTime!.value = time

    globe.rotation.y = time * 0.035 + st.pointer.sx * 0.5
    wire.rotation.y = globe.rotation.y
    cityDots.rotation.y = globe.rotation.y
    group.rotation.x = -st.pointer.sy * 0.22
    group.rotation.z = 0.14 + st.pointer.sx * 0.06
    ringA.rotation.z = 0.5 + time * 0.05
    ringB.rotation.z = 1.6 - time * 0.035
    stars.rotation.y = time * 0.006
    camera.position.x = st.pointer.sx * 0.12
    camera.position.y = 0.1 - st.pointer.sy * 0.1
    camera.lookAt(0, 0, 0)
    renderer.setClearAlpha(0)
  })
})

onBeforeUnmount(() => stage?.dispose())
</script>

<template>
  <div class="gt">
    <div ref="host" class="gt__stage" role="img" aria-label="昼夜自转的低模块世界地图" />
    <p v-if="failed" class="gt__fallback">当前环境不支持 WebGL，此处显示为文字说明。</p>
  </div>
</template>

<style scoped>
.gt {
  position: relative;
  width: 100%;
  height: 100%;
}
.gt__stage {
  width: 100%;
  height: 100%;
}
.gt__stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
.gt__fallback {
  position: absolute;
  inset: auto 0 12px;
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
</style>
