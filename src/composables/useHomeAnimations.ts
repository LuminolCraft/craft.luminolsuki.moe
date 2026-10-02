/**
 * useHomeAnimations —— 首页跨区块的共享动效
 *
 * 只放「用选择器扫整页、不属于某一个区块」的动画：
 * - `[data-reveal]`：区块进入
 * - `[data-compare-img]`：对比区图片轻微缩放进入
 *
 * 区块自己的动画（Hero 文案拆字、状态带计数、演示区滚动故事、截图带）留在各自组件里，
 * 因为那些动画与组件内部的 ref 强绑定，抽出来只会多一层传参。
 */
import { onUnmounted, type Ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * 页面级的进入动效。
 *
 * @param scope 首页根元素；选择器与 ScrollTrigger 都限定在它内部
 */
export function useHomeReveal(scope: Ref<HTMLElement | null>) {
  let ctx: gsap.Context | null = null
  let mm: gsap.MatchMedia | null = null

  const start = (): void => {
    const root = scope.value
    if (!root) return

    ctx = gsap.context(() => {
      mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.from(el, {
            y: 24,
            autoAlpha: 0,
            duration: 0.6,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 80%', once: true },
          })
        })

        gsap.utils.toArray<HTMLElement>('[data-compare-img]').forEach((el) => {
          gsap.fromTo(
            el,
            { scale: 1.02 },
            {
              scale: 1,
              duration: 0.8,
              ease: 'power2.out',
              scrollTrigger: { trigger: el, start: 'top 85%', once: true },
            },
          )
        })
      })

      mm.add('(prefers-reduced-motion: reduce)', () => {
        // 减少动效：清掉进入动画留下的内联样式，内容直接可见
        gsap.set('[data-reveal]', { clearProps: 'all' })
        gsap.set('[data-compare-img]', { clearProps: 'all' })
      })
    }, root)
  }

  onUnmounted(() => {
    mm?.revert()
    ctx?.revert()
    ctx = null
    mm = null
  })

  return { start }
}
