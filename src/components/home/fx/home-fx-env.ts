/**
 * 首页特效环境探测与重资源懒加载
 *
 * 目的：WebGL 氛围层（Aurora / LightRays）体积与 GPU 开销都明显大于 GSAP 动效，
 * 因此统一在这里判断「是否值得加载」，并只在需要时动态 import，避免拖慢首屏。
 *
 * 判定优先级：reduceMotion > 无 WebGL > 低端设备（内存 / 核心数 / 屏幕宽度）
 */
import { defineAsyncComponent, type Component } from 'vue'

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

/** 只探测一次，结果缓存 */
let webglSupport: boolean | null = null

export function supportsWebGL(): boolean {
  if (webglSupport !== null) return webglSupport
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    webglSupport = Boolean(gl)
    // 探测用的 context 要立刻释放，否则会占用一个 WebGL 槽位
    if (gl && 'getExtension' in gl) {
      const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')
      lose?.loseContext()
    }
  } catch {
    webglSupport = false
  }
  return webglSupport
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(pointer: coarse)').matches
}

/** 低端设备：省流量模式 / 内存 ≤ 4GB / 逻辑核心 ≤ 4 / 窄屏 */
export function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return true
  const nav = navigator as NavigatorWithMemory
  if (nav.connection?.saveData) return true
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return true
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return true
  if (typeof window !== 'undefined' && window.innerWidth < 900) return true
  return false
}

/**
 * 是否启用 WebGL 氛围层。
 * 移动端同样允许（有静态渐变兜底），只有低端设备与 reduced-motion 会关掉。
 */
export function shouldUseWebGL(): boolean {
  if (prefersReducedMotion()) return false
  if (isLowEndDevice()) return false
  return supportsWebGL()
}

/** 是否启用指针跟随类交互（spotlight / tilt / magnet / 粒子排斥） */
export function shouldUsePointerFx(): boolean {
  if (prefersReducedMotion()) return false
  return !isCoarsePointer()
}

/* ---------- 重资源组件的懒加载入口 ---------- */

export const LazyHomeAurora: Component = defineAsyncComponent(() => import('./HomeAurora.vue'))
export const LazyHomeLightRays: Component = defineAsyncComponent(
  () => import('./HomeLightRays.vue'),
)
export const LazyHomeParticles: Component = defineAsyncComponent(
  () => import('./HomeParticles.vue'),
)
