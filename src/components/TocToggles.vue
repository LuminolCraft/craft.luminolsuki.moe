<template>
  <div class="toc-toggles">
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
const { create } = useGsap({ scope: containerRef })

const isDark = ref(false)
const overlayRef = ref<HTMLDivElement | null>(null)
const revealAnim = ref<Animation | null>(null)
const appliedDark = ref(false)
const animatingRef = ref(false)
let pointerdownCleanup: (() => void) | null = null

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

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyTheme(next)
    return
  }

  const x = e.clientX
  const y = e.clientY
  const maxDist = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )
  const endSize = maxDist * 2

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

  if (document.startViewTransition) {
    if (animatingRef.value) {
      if (revealAnim.value) revealAnim.value.reverse()
      return
    }

    animatingRef.value = true

    const transition = document.startViewTransition(() => {
      document.documentElement.setAttribute('data-vt', '')
      applyTheme(next)
      getComputedStyle(document.documentElement).opacity
      document.documentElement.removeAttribute('data-vt')
    })

    transition.ready.then(() => {
      let styleEl = document.querySelector('style[data-theme-reveal]')
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.setAttribute('data-theme-reveal', '')
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = `
        ::view-transition-new(root) {
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

      const anim = document.documentElement.animate(
        { '--reveal-size': ['0px', `${endSize}px`] } as PropertyIndexedKeyframes,
        {
          duration: 800,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
          fill: 'both' as FillMode
        }
      )
      revealAnim.value = anim

      anim.onfinish = () => {
        if (anim.playbackRate < 0) {
          document.documentElement.setAttribute('data-vt', '')
          applyTheme(!appliedDark.value)
          getComputedStyle(document.documentElement).opacity
          document.documentElement.removeAttribute('data-vt')
        }
        animatingRef.value = false
        revealAnim.value = null
      }
    })
    return
  }

  const overlay = overlayRef.value
  if (!overlay) return

  const currentAnim = revealAnim.value
  if (currentAnim && currentAnim.playState !== 'finished' && currentAnim.playState !== 'idle') {
    currentAnim.reverse()
    return
  }
  if (currentAnim) {
    currentAnim.cancel()
    overlay.style.display = 'none'
    revealAnim.value = null
  }

  const oldBg = getComputedStyle(document.documentElement)
    .getPropertyValue('--background-color')
    .trim()
  applyTheme(next)

  overlay.style.background = oldBg
  overlay.style.maskImage = 'none'
  overlay.style.webkitMaskImage = 'none'
  overlay.style.display = 'block'

  const anim = overlay.animate(
    { opacity: [1, 0] },
    { duration: 400, easing: 'ease', fill: 'both' as FillMode }
  )
  revealAnim.value = anim

  anim.addEventListener('finish', () => {
    if (revealAnim.value !== anim) return
    if (anim.playbackRate < 0) {
      applyTheme(!appliedDark.value)
    }
    overlay.style.display = 'none'
    revealAnim.value = null
  })
}

onMounted(() => {
  create((g) => {
    if (!zhIconRef.value || !enIconRef.value) return

    // 初始状态设置
    if (lang.value === 'zh') {
      g.set(enIconRef.value, { opacity: 0, rotateY: 90, scale: 0.8 })
      g.set(zhIconRef.value, { opacity: 1, rotateY: 0, scale: 1 })
    } else {
      g.set(zhIconRef.value, { opacity: 0, rotateY: 90, scale: 0.8 })
      g.set(enIconRef.value, { opacity: 1, rotateY: 0, scale: 1 })
    }

    // 主题切换按钮 hover
    const themeBtn = document.getElementById('theme-btn')
    if (themeBtn) {
      themeBtn.addEventListener('mouseenter', () => {
        g.to('.theme-icon.active', { scale: 1.1, duration: DURATIONS.hover, ease: EASINGS.hover })
      })
      themeBtn.addEventListener('mouseleave', () => {
        g.to('.theme-icon.active', { scale: 1, duration: DURATIONS.hover, ease: EASINGS.hover })
      })
    }
  })

  function onPointerDown(e: PointerEvent) {
    if (!animatingRef.value || !revealAnim.value) return
    const btn = document.getElementById('theme-btn')
    if (!btn) return
    const r = btn.getBoundingClientRect()
    if (
      e.clientX >= r.left && e.clientX <= r.right &&
      e.clientY >= r.top && e.clientY <= r.bottom
    ) {
      e.stopPropagation()
      revealAnim.value.reverse()
    }
  }
  document.addEventListener('pointerdown', onPointerDown, true)
  pointerdownCleanup = () => {
    document.removeEventListener('pointerdown', onPointerDown, true)
    if (revealAnim.value) {
      revealAnim.value.cancel()
      revealAnim.value = null
    }
  }
})

onUnmounted(() => {
  pointerdownCleanup?.()
})

const zhIconRef = ref<SVGElement | null>(null)
const enIconRef = ref<SVGElement | null>(null)

function langToggle() {
  const isZh = lang.value === 'zh'
  const outEl = isZh ? zhIconRef.value : enIconRef.value
  const inEl = isZh ? enIconRef.value : zhIconRef.value

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && outEl && inEl) {
    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } })
    tl.to(outEl, {
      opacity: 0,
      rotateY: 90,
      scale: 0.8,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => toggleLang(),
    })
    .fromTo(inEl,
      { opacity: 0, rotateY: -90, scale: 0.8 },
      { opacity: 1, rotateY: 0, scale: 1, duration: 0.3, ease: 'power2.out' },
      '-=0.05',
    )
    return
  }
  toggleLang()
}
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
  transition: opacity 200ms ease, transform 200ms ease;
  
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
}
</style>
