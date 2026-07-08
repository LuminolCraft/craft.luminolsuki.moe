<template>
  <div ref="containerRef" class="toc-toggles">
    <div ref="overlayRef" class="theme-reveal" />
    <button
      id="theme-btn"
      class="theme-toggle"
      @click="themeToggle"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      <svg
        class="theme-icon theme-icon-sun"
        :class="{ active: isDark }"
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M11.9982 3.29083V1.76758M5.83985 18.1586L4.76275 19.2357M11.9982 22.2327V20.7094M19.2334 4.76468L18.1562 5.84179M20.707 12.0001H22.2303M18.1562 18.1586L19.2334 19.2357M1.76562 12.0001H3.28888M4.76267 4.76462L5.83977 5.84173M15.7104 8.28781C17.7606 10.3381 17.7606 13.6622 15.7104 15.7124C13.6601 17.7627 10.336 17.7627 8.28574 15.7124C6.23548 13.6622 6.23548 10.3381 8.28574 8.28781C10.336 6.23756 13.6601 6.23756 15.7104 8.28781Z" />
      </svg>
      <svg
        class="theme-icon theme-icon-moon"
        :class="{ active: !isDark }"
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M21.2481 11.8112C20.1889 12.56 18.8958 13 17.5 13C13.9101 13 11 10.0899 11 6.5C11 5.10416 11.44 3.81108 12.1888 2.75189C12.126 2.75063 12.0631 2.75 12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 11.9369 21.2494 11.874 21.2481 11.8112Z" />
      </svg>
    </button>

    <button
      id="lang-btn"
      class="theme-toggle"
      @click="langToggle"
      :aria-label="t('common.switchLanguage')"
      style="display: none;"
    >
      <svg
        ref="zhIconRef"
        class="lang-icon"
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="m5 8 6 6" />
        <path d="m4 14 6-6 2-3" />
        <path d="M2 5h12" />
        <path d="M7 2h1" />
        <path d="m22 22-5-10-5 10" />
        <path d="M14 18h6" />
      </svg>
      <svg
        ref="enIconRef"
        class="lang-icon"
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { useI18n } from '../composables/useI18n'
import { useGsap } from '@/composables/useGsap'
import { DURATIONS, EASINGS } from '@/gsap'

const { lang, toggleLang, t } = useI18n()
const containerRef = ref<HTMLDivElement | null>(null)
const { create, reduceMotion } = useGsap({ scope: containerRef })

const isDark = ref(false)
const overlayRef = ref<HTMLDivElement | null>(null)
const appliedDark = ref(false)

const animatingRef = ref(false)
const revealTween = ref<gsap.core.Tween | null>(null)
const keepaliveStyleEl = ref<HTMLStyleElement | null>(null)

const zhIconRef = ref<SVGElement | null>(null)
const enIconRef = ref<SVGElement | null>(null)

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1] ?? '') : null
}
const stored = getCookie('theme')
if (stored === 'dark') {
  isDark.value = true
  appliedDark.value = true
}

watch(isDark, (val) => {
  document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light')
}, { immediate: true })

function applyTheme(dark: boolean) {
  isDark.value = dark
  appliedDark.value = dark
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  document.cookie = `theme=${dark ? 'dark' : 'light'}; path=/; max-age=31536000`
}

function themeToggle(e: MouseEvent) {
  const next = !appliedDark.value

  // 减少动效：直接切换
  if (reduceMotion()) {
    applyTheme(next)
    return
  }

  // 动画进行中再次点击 → 单次切换方向（避免双重反转相互抵消）
  if (animatingRef.value && revealTween.value) {
    revealTween.value.reversed() ? revealTween.value.play() : revealTween.value.reverse()
    return
  }

  const x = e.clientX
  const y = e.clientY
  const maxDist = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )
  const endSize = maxDist * 2

  // 生成 32×32 像素化 SVG 圆形 mask
  const size = 32
  let rects = ''
  const r = size / 2
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const dx = j - r + 0.5
      const dy = i - r + 0.5
      if (dx * dx + dy * dy <= r * r) {
        rects += `<rect x="${j}" y="${i}" width="1.1" height="1.1" fill="black"/>`
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects}</svg>`
  const encodedSvg = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

  // 主路径：View Transitions API
  const startViewTransition: typeof document.startViewTransition | undefined = (document as any).startViewTransition
  if (startViewTransition) {
    animatingRef.value = true

    const transition = startViewTransition.call(document, () => {
      document.documentElement.setAttribute('data-vt', '')
      applyTheme(next)
      // 强制 reflow，确保新主题被快照
      void getComputedStyle(document.documentElement).opacity
      document.documentElement.removeAttribute('data-vt')
    })

    transition.ready.then(() => {
      // 注入 mask 规则 + no-op keepalive 动画（维持 ::view-transition-new(root) 伪元素存活）
      let styleEl = document.querySelector<HTMLStyleElement>('style[data-theme-reveal]')
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.setAttribute('data-theme-reveal', '')
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = `
        @keyframes theme-reveal-keepalive { from { opacity: 1 } to { opacity: 1 } }
        ::view-transition-new(root) {
          animation: theme-reveal-keepalive 10s forwards;
          mask-image: url("${encodedSvg}");
          mask-repeat: no-repeat;
          mask-size: var(--reveal-size) var(--reveal-size);
          mask-position: calc(${x}px - var(--reveal-size) / 2) calc(${y}px - var(--reveal-size) / 2);
          -webkit-mask-image: url("${encodedSvg}");
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-size: var(--reveal-size) var(--reveal-size);
          -webkit-mask-position: calc(${x}px - var(--reveal-size) / 2) calc(${y}px - var(--reveal-size) / 2);
        }
      `
      keepaliveStyleEl.value = styleEl

      const tween = gsap.fromTo(document.documentElement,
        { '--reveal-size': '0px' } as gsap.TweenVars,
        {
          '--reveal-size': `${endSize}px`,
          duration: 0.8,
          ease: EASINGS.smooth,
          onComplete: () => cleanupReveal(),
          onReverseComplete: () => {
            applyTheme(!appliedDark.value)
            cleanupReveal()
          },
        } as gsap.TweenVars
      )
      revealTween.value = tween
    }).catch(() => {
      cleanupReveal()
    })

    function cleanupReveal() {
      if (keepaliveStyleEl.value) {
        keepaliveStyleEl.value.remove()
        keepaliveStyleEl.value = null
      }
      revealTween.value = null
      animatingRef.value = false
    }
    return
  }

  // 回退路径：不支持 View Transitions，用 .theme-reveal overlay 淡出
  const overlay = overlayRef.value
  if (!overlay) {
    applyTheme(next)
    return
  }
  const oldBg = getComputedStyle(document.documentElement)
    .getPropertyValue('--background-color')
    .trim()
  applyTheme(next)
  overlay.style.background = oldBg
  overlay.style.display = 'block'
  gsap.set(overlay, { autoAlpha: 1 })
  animatingRef.value = true
  const tween = gsap.to(overlay, {
    autoAlpha: 0,
    duration: 0.4,
    ease: 'power1.out',
    onComplete: () => {
      overlay.style.display = 'none'
      revealTween.value = null
      animatingRef.value = false
    },
    onReverseComplete: () => {
      applyTheme(!appliedDark.value)
      overlay.style.display = 'none'
      revealTween.value = null
      animatingRef.value = false
    },
  })
  revealTween.value = tween
}

onMounted(() => {
  create((g) => {
    if (!zhIconRef.value || !enIconRef.value) return
    // 初始图标状态
    if (lang.value === 'zh') {
      g.set(enIconRef.value, { autoAlpha: 0, rotate: 90 })
      g.set(zhIconRef.value, { autoAlpha: 1, rotate: 0 })
    } else {
      g.set(zhIconRef.value, { autoAlpha: 0, rotate: 90 })
      g.set(enIconRef.value, { autoAlpha: 1, rotate: 0 })
    }

    // 主题切换按钮 hover
    const themeBtn = document.getElementById('theme-btn')
    if (themeBtn) {
      themeBtn.addEventListener('mouseenter', () => {
        g.to('.theme-icon.active', { scale: 1.1, duration: DURATIONS.hover, ease: EASINGS.hover })
      })
      themeBtn.addEventListener('mouseleave', () => {
        g.to('.theme-icon.active', { scale: 1, duration: DURATIONS.hover, ease: EASINGS.hover, clearProps: 'transform' })
      })
    }
  })
})

function langToggle() {
  const isZh = lang.value === 'zh'
  const outEl = isZh ? zhIconRef.value : enIconRef.value
  const inEl = isZh ? enIconRef.value : zhIconRef.value

  if (!reduceMotion() && outEl && inEl) {
    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } })
    tl.to(outEl, {
      rotate: 90,
      autoAlpha: 0,
      duration: DURATIONS.fast,
      ease: EASINGS.hover,
      onComplete: () => toggleLang(),
    })
    .fromTo(inEl,
      { rotate: -90, autoAlpha: 0 },
      { rotate: 0, autoAlpha: 1, duration: DURATIONS.fast, ease: EASINGS.hover },
      '-=0.1',
    )
    return
  }
  toggleLang()
}

onUnmounted(() => {
  if (revealTween.value) {
    revealTween.value.kill()
    revealTween.value = null
  }
  if (keepaliveStyleEl.value) {
    keepaliveStyleEl.value.remove()
    keepaliveStyleEl.value = null
  }
  animatingRef.value = false
})
</script>

<style scoped>
.toc-toggles {
  display: flex;
  align-items: center;
  gap: 2px;
}

.theme-toggle {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--bases-white);
  cursor: pointer;
  position: relative;
  transition: color 150ms ease, transform 150ms ease;
}

.theme-toggle:hover {
  color: var(--button-hover);
}

.theme-toggle:active {
  transform: scale(0.92);
  transition: color 150ms ease, transform 100ms ease-out;
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--bases-glass-border);
  outline-offset: 2px;
}

.theme-icon {
  position: absolute;
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
  will-change: transform, opacity;
}

@media screen and (max-width: 768px) {
  .theme-toggle {
    color: var(--text-color);
  }
}

.theme-icon.active {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.theme-reveal {
  position: fixed;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  display: none;
}

.lang-icon {
  position: absolute;
  will-change: transform, opacity;
}
</style>
