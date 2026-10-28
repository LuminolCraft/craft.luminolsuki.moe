<!--
  SplitText — 逐字入场标题（Hero h1）
  移植自 Vue Bits「SplitText」(https://vue-bits.dev/components/split-text)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点：
  - 去 Tailwind：`split-parent overflow-hidden inline-block whitespace-normal` 改为 scoped CSS；
    `className` prop 保留签名，只透传普通类名
  - 无障碍：拆字前先存 `textContent` 原文 → 拆字后父元素写 `aria-label`、每个字加 `aria-hidden`，
    revert 时清掉 `aria-label`（否则读屏会把「与朋友一起…」读成一个字一个字）
  - 新增 `ready` prop（默认 true，保留给需要门控的场景）：false 时保持隐藏且不启动动画。
    Hero 现在**不用**它 —— h1 是纯文本、没有 decode 成本，首帧就该不透明，
    LCP 门控只留给 WebGL 画布的淡入
  - `stagger` 方向固定 `from: 'start'`（中文标题按随机顺序入场会读不成句）
  - 窄屏（≤768px）不拆字：拆字后每个字是 inline-block，中文没有词间空白，
    相邻 inline-block 之间不存在断行机会，标题会横向溢出而不是折行；
    跨断点（旋转 / 拖窗口）时会自动撤销或重建拆字
  - 默认时长/延迟改为引用 gsap/config 的令牌，不再写裸数字
  - reduced-motion 下完全不拆字、不做入场，标题保持静态可见
  - 入场结束后把 `overflow` 放开，避免中文字形在大字号下被裁掉上下缘
-->
<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'
import { computed, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import { prefersReducedMotion } from '@/components/home/fx/home-fx-env'
import { DURATIONS } from '@/gsap/config/durations'
import { EASINGS } from '@/gsap/config/easings'

type SplitType = 'chars' | 'words' | 'lines' | 'words, chars'
type TagName = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'
type StaggerFrom = 'start' | 'center' | 'end'
type EaseFn = (t: number) => number

interface SplitTextElement extends HTMLElement {
  _bitsSplitInstance?: GSAPSplitText
}

interface Props {
  /** 要拆分的纯文本 */
  text: string
  /** 透传的普通类名（不再接受 Tailwind 原子类） */
  className?: string
  /** 逐字延迟（毫秒）——沿用上游语义，内部换算成 gsap 的 stagger 秒 */
  delay?: number
  duration?: number
  ease?: string | EaseFn
  splitType?: SplitType
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  threshold?: number
  rootMargin?: string
  tag?: TagName
  textAlign?: CSSProperties['textAlign']
  /** 入场方向（字序） */
  staggerFrom?: StaggerFrom
  /** LCP 门控：false 时保持隐藏且不启动动画 */
  ready?: boolean
  onLetterAnimationComplete?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  className: '',
  delay: DURATIONS.charStagger * 1000,
  duration: DURATIONS.entrance,
  ease: EASINGS.entrance,
  splitType: 'chars',
  from: () => ({ y: 24, autoAlpha: 0 }),
  to: () => ({ y: 0, autoAlpha: 1 }),
  threshold: 0.1,
  rootMargin: '-100px',
  tag: 'p',
  textAlign: 'center',
  staggerFrom: 'start',
  ready: true,
  onLetterAnimationComplete: undefined,
})

const emit = defineEmits<{
  'animation-complete': []
}>()

const elRef = ref<SplitTextElement | null>(null)
const fontsLoaded = ref(false)
const animationCompleted = ref(false)
/** reduced-motion：不拆字（在 setup 里同步读，避免首帧闪一下隐藏态） */
const reduceMotion = ref(prefersReducedMotion())

// LCP 没到 或 reduced-motion 直接可见
const visible = computed(() => reduceMotion.value || props.ready)

const onCompleteRef = ref(props.onLetterAnimationComplete)
watch(
  () => props.onLetterAnimationComplete,
  (cb) => {
    onCompleteRef.value = cb
  },
)

const scrollTriggerStart = computed(() => {
  const startPct = (1 - props.threshold) * 100
  const mm = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(props.rootMargin || '')
  const mv = mm?.[1] ? parseFloat(mm[1]) : 0
  const mu = mm?.[2] ?? 'px'
  const sign = mv === 0 ? '' : mv < 0 ? `-=${Math.abs(mv)}${mu}` : `+=${mv}${mu}`
  return `top ${startPct}%${sign}`
})

const elStyle = computed<CSSProperties>(() => ({
  textAlign: props.textAlign,
  wordWrap: 'break-word',
  willChange: 'transform, opacity',
  // reduced-motion 下不做遮罩，避免中文上下缘被裁
  ...(reduceMotion.value ? { overflow: 'visible' } : null),
  // 等 LCP：先隐藏，就绪后由 gsap 的 autoAlpha 接管
  ...(visible.value ? null : { visibility: 'hidden' as const }),
}))

const elClass = computed(() => ['split-text', props.className].filter(Boolean).join(' '))

function assignTargets(self: GSAPSplitText): Element[] {
  if (props.splitType.includes('chars') && self.chars?.length) return self.chars
  if (props.splitType.includes('words') && self.words?.length) return self.words
  if (props.splitType.includes('lines') && self.lines?.length) return self.lines
  return self.chars ?? self.words ?? self.lines ?? []
}

function clearAria(): void {
  const el = elRef.value
  if (!el) return
  el.removeAttribute('aria-label')
  el.style.overflow = ''
}

/** 窄屏走「整块入场」，没有拆字（见 initAnimation 里的说明） */
let blockTween: gsap.core.Tween | null = null

function killBlockTween(): void {
  blockTween?.scrollTrigger?.kill()
  blockTween?.kill()
  blockTween = null
}

function destroyInstance(): void {
  const el = elRef.value
  if (!el) return
  killBlockTween()
  // 组件不用 gsap.context 托管，ScrollTrigger 需要在卸载时自己收干净
  for (const st of ScrollTrigger.getAll()) {
    if (st.trigger === el) st.kill()
  }
  el._bitsSplitInstance?.revert()
  el._bitsSplitInstance = undefined
  clearAria()
}

/** 与 home-mobile.css 的断点一致 */
const NARROW_MAX_PX = 768

function isNarrowViewport(): boolean {
  if (typeof window === 'undefined') return false
  if (!window.matchMedia) return window.innerWidth <= NARROW_MAX_PX
  return window.matchMedia(`(max-width: ${NARROW_MAX_PX}px)`).matches
}

let narrowQuery: MediaQueryList | null = null

/**
 * 跨过断点时切换形态：
 * - 变窄 → 撤掉拆字，恢复可折行的纯文本（拆字后的 inline-block 之间没有断行机会，会横向溢出）
 * - 变宽 → 重新拆字并重播一次入场
 */
function onNarrowChange(): void {
  const el = elRef.value
  if (!el || reduceMotion.value) return

  if (isNarrowViewport()) {
    destroyInstance()
    // 撤销拆字后 CSS 的 overflow: hidden 会回来，中文大字号上下缘会被裁
    el.style.overflow = 'visible'
    animationCompleted.value = true
    return
  }

  animationCompleted.value = false
  initAnimation()
}

function initAnimation(): void {
  const el = elRef.value
  if (!el || !props.text) return
  if (reduceMotion.value) return
  if (!props.ready || !fontsLoaded.value) return
  if (animationCompleted.value) return

  destroyInstance()

  // 拆字前保存原文：拆完之后 DOM 里只剩一个个 <div>，textContent 会被插入的空白污染
  const originalText = el.textContent ?? props.text
  const start = scrollTriggerStart.value

  const complete = (): void => {
    animationCompleted.value = true
    el.style.overflow = 'visible'
    onCompleteRef.value?.()
    emit('animation-complete')
  }

  /**
   * 窄屏不拆字。
   * split 之后的每个字都是 inline-block，而中文没有词间空白，
   * 相邻 inline-block 之间不存在断行机会 —— 标题会横向溢出屏幕而不是折行。
   * 所以窄屏退化成「整块淡入 + 上移」，观感接近，但排版是正常的。
   */
  if (isNarrowViewport()) {
    blockTween = gsap.fromTo(el, { ...props.from }, {
      ...props.to,
      duration: props.duration,
      ease: props.ease,
      scrollTrigger: { trigger: el, start, once: true, fastScrollEnd: true },
      willChange: 'transform, opacity',
      force3D: true,
      onComplete: complete,
    })
    return
  }

  const splitInstance = new GSAPSplitText(el, {
    type: props.splitType,
    smartWrap: true,
    autoSplit: props.splitType === 'lines',
    linesClass: 'split-line',
    wordsClass: 'split-word',
    charsClass: 'split-char',
    reduceWhiteSpace: false,
    onSplit: (self: GSAPSplitText) => {
      // a11y：父元素读原文，每个字对读屏隐藏
      el.setAttribute('aria-label', originalText)
      const targets = assignTargets(self)
      for (const node of targets) {
        node.setAttribute('aria-hidden', 'true')
      }

      return gsap.fromTo(targets, { ...props.from }, {
        ...props.to,
        duration: props.duration,
        ease: props.ease,
        stagger: { each: props.delay / 1000, from: props.staggerFrom },
        scrollTrigger: {
          trigger: el,
          start,
          once: true,
          fastScrollEnd: true,
          anticipatePin: 0.4,
        },
        willChange: 'transform, opacity',
        force3D: true,
        onComplete: complete,
      })
    },
  })

  el._bitsSplitInstance = splitInstance
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    narrowQuery = window.matchMedia(`(max-width: ${NARROW_MAX_PX}px)`)
    narrowQuery.addEventListener('change', onNarrowChange)
  }

  if (typeof document === 'undefined' || !document.fonts) {
    fontsLoaded.value = true
    return
  }
  if (document.fonts.status === 'loaded') {
    fontsLoaded.value = true
    return
  }
  void document.fonts.ready.then(() => {
    fontsLoaded.value = true
  })
})

watch([fontsLoaded, visible], () => {
  if (!fontsLoaded.value || !visible.value) return
  initAnimation()
})

watch(
  () => [
    props.text,
    props.delay,
    props.duration,
    props.ease,
    props.splitType,
    props.staggerFrom,
    JSON.stringify(props.from),
    JSON.stringify(props.to),
    props.threshold,
    props.rootMargin,
  ],
  () => {
    if (!fontsLoaded.value || !visible.value) return
    animationCompleted.value = false
    initAnimation()
  },
)

onBeforeUnmount(() => {
  if (narrowQuery) {
    narrowQuery.removeEventListener('change', onNarrowChange)
    narrowQuery = null
  }
  destroyInstance()
})
</script>

<template>
  <component :is="tag" ref="elRef" :class="elClass" :style="elStyle">{{ text }}</component>
</template>

<style scoped>
.split-text {
  display: inline-block;
  overflow: hidden;
  white-space: normal;
}

/* SplitText 生成的 char 用 inline-block 才能走 transform。
   :deep 是因为这些节点由 gsap 运行时插入，不带本组件的 scope 属性。 */
.split-text :deep(.split-char) {
  display: inline-block;
  will-change: transform, opacity;
}

.split-text :deep(.split-word) {
  display: inline-block;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .split-text :deep(.split-char) {
    will-change: auto;
  }
}
</style>
