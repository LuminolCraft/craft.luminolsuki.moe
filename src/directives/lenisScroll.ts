import type { Directive } from 'vue'
import Lenis from 'lenis'
import type { LenisOptions } from 'lenis'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { lenisInstances } from '@/utils/lenisInstances'

// 使用 Map 存储元素与实例的映射（因为需要遍历销毁所有实例）
let instanceMap = new Map<HTMLElement, Lenis>()

/**
 * 销毁指定元素上的 Lenis 实例（如果存在）
 */
function destroyInstance(el: HTMLElement) {
  const lenis = instanceMap.get(el)
  if (!lenis) return

  const index = lenisInstances.indexOf(lenis)
  if (index > -1) lenisInstances.splice(index, 1)

  lenis.destroy()
  instanceMap.delete(el)
  el.removeAttribute('data-lenis-scroll') // 移除标记
}

/**
 * 销毁所有由该指令创建的内部 Lenis 实例
 */
export function destroyAllInstances() {
  instanceMap.forEach((lenis) => {
    const index = lenisInstances.indexOf(lenis)
    if (index > -1) lenisInstances.splice(index, 1)
    lenis.destroy()
  })
  instanceMap.clear() // 清空映射
}

export const lenisScrollDirective: Directive<HTMLElement, Partial<LenisOptions> | undefined> = {
  mounted(el, binding) {
    console.log('[v-lenis-scroll] mounted 被调用', el)

    // 强制销毁可能残留的旧实例（防止重复初始化）
    destroyInstance(el)

    // 仅在桌面端且未启用减少动画时初始化惯性滚动
    const isDesktop = window.matchMedia('(min-width: 769px) and (pointer: fine)').matches
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    console.log('[v-lenis-scroll] isDesktop:', isDesktop, 'reduceMotion:', reduceMotion)

    if (!isDesktop || reduceMotion) {
      console.log('[v-lenis-scroll] 跳过初始化（桌面端或减少动画条件不满足）')
      return
    }

    // 合并默认配置和用户传入的配置
    const options: LenisOptions = {
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.2,
      touchMultiplier: 1.5,
      ...(binding.value || {}),
      wrapper: el, // 将当前元素作为滚动容器
    }

    // 创建 Lenis 实例
    const lenis = new Lenis(options)
    instanceMap.set(el, lenis)
    lenisInstances.push(lenis)

    // 同步滚动事件到 ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update)

    console.log('[v-lenis-scroll] Lenis 实例已创建')
    el.setAttribute('data-lenis-scroll', '')
  },

  unmounted(el) {
    destroyInstance(el)
  },
}