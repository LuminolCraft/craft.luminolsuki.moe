<template>
  <Transition name="popup-slide">
    <div
      v-if="visible && newsData"
      ref="popupRef"
      class="last-viewed-popup"
      role="alert"
      aria-live="polite"
      @mouseenter="pauseTimer"
      @mouseleave="resumeTimer"
    >
      <div class="popup-accent"></div>

      <div class="popup-body" @click.stop="navigateToNews" role="button" :tabindex="0" @keydown.enter="navigateToNews" @keydown.space.prevent="navigateToNews">
        <div class="popup-header">
          <span class="popup-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            继续阅读
          </span>
        </div>
        <p class="popup-title text-truncate">{{ newsData.title }}</p>
      </div>

      <button
        class="popup-close"
        @click.stop="dismiss"
        :aria-label="'关闭通知'"
        type="button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="popup-progress-bar"></div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { useLastViewedCookie, type LastViewedNews } from '../composables/useLastViewedCookie'
import { useCookieConsent } from '../composables/useCookieConsent'
import { EASINGS } from '@/gsap'

const emit = defineEmits<{
  dismissed: []
}>()

const { getLastViewedNews, clearLastViewedNews } = useLastViewedCookie()
const { getConsent } = useCookieConsent()
const router = useRouter()

const newsData = ref<LastViewedNews | null>(null)
const visible = ref(false)
const isExiting = ref(false)
const popupRef = ref<HTMLElement | null>(null)
const PROGRESS_DURATION = 5

let dismissTimer: ReturnType<typeof setTimeout> | null = null
let progressTween: gsap.core.Tween | null = null

function navigateToNews() {
  if (isExiting.value || !newsData.value) return
  exitAndCleanup(() => {
    router.push({ name: 'newsdetail', query: { id: newsData.value!.id.toString() } })
    clearLastViewedNews()
    emit('dismissed')
  })
}

function dismiss() {
  if (isExiting.value) return
  exitAndCleanup(() => {
    clearLastViewedNews()
    emit('dismissed')
  })
}

function exitAndCleanup(onDone: () => void) {
  isExiting.value = true
  clearDismissTimer()
  progressTween?.kill()

  if (popupRef.value) {
    gsap.to(popupRef.value, {
      autoAlpha: 0,
      x: '120%',
      duration: 0.4,
      ease: EASINGS.exit,
      onComplete: () => {
        visible.value = false
        onDone()
      },
    })
  } else {
    visible.value = false
    setTimeout(onDone, 400)
  }
}

function clearDismissTimer() {
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

function startProgressBar() {
  const bar = popupRef.value?.querySelector('.popup-progress-bar') as HTMLElement
  if (!bar) return
  progressTween = gsap.fromTo(bar,
    { scaleX: 1 },
    { scaleX: 0, transformOrigin: 'left center', duration: PROGRESS_DURATION, ease: 'none' },
  )
}

function pauseTimer() {
  if (isExiting.value) return
  clearDismissTimer()
  progressTween?.pause()
}

function resumeTimer() {
  if (isExiting.value) return
  const remaining = progressTween ? progressTween.duration() - progressTween.time() : PROGRESS_DURATION
  dismissTimer = setTimeout(() => dismiss(), remaining * 1000)
  progressTween?.resume()
}

watch(visible, async (val) => {
  if (!val) return
  await nextTick()
  if (!popupRef.value) return

  gsap.fromTo(popupRef.value,
    { autoAlpha: 0, x: '120%' },
    { autoAlpha: 1, x: '0%', duration: 0.55, ease: 'back.out(1.2)' },
  )
  const bodyItems = popupRef.value.querySelectorAll('.popup-body > *')
  gsap.fromTo(bodyItems,
    { autoAlpha: 0, y: 10 },
    { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out', delay: 0.3 },
  )
  startProgressBar()
  dismissTimer = setTimeout(() => dismiss(), PROGRESS_DURATION * 1000)
})

onMounted(() => {
  const consent = getConsent()
  if (consent !== 'accepted') return

  const news = getLastViewedNews()
  if (!news) return

  newsData.value = news

  setTimeout(() => {
    visible.value = true
  }, 1000)
})

onUnmounted(() => {
  clearDismissTimer()
  progressTween?.kill()
})
</script>

<style scoped>
.last-viewed-popup {
  position: fixed;
  z-index: 1000;
  overflow: hidden;
  background: var(--card-bg, rgba(255, 255, 255, 0.95));
  border-radius: var(--vercel-radius-comfortable, 8px);
  box-shadow:
    0 10px 40px rgba(109, 91, 154, 0.2),
    0 0 0 1px rgba(158, 148, 216, 0.15);
  font-family: var(--font-primary, var(--vercel-font-family, sans-serif));
  cursor: pointer;
  user-select: none;
}

.popup-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--bases-primary-gradient, linear-gradient(135deg, #9e94d8 0%, #b6ade6 100%));
}

.popup-body {
  padding: var(--vercel-space-4, 16px) var(--vercel-space-10, 40px) var(--vercel-space-4, 16px) var(--vercel-space-4, 16px);
  position: relative;
}

.popup-header {
  display: flex;
  align-items: center;
  gap: var(--vercel-space-2, 8px);
  margin-bottom: var(--vercel-space-2, 8px);
}

.popup-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--vercel-font-size-caption, 12px);
  font-weight: var(--vercel-weight-medium, 500);
  color: var(--text-secondary, #666);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.popup-label svg {
  color: var(--primary-color, #a78bfa);
  flex-shrink: 0;
}

.popup-title {
  font-size: var(--vercel-font-size-body-small, 14px);
  font-weight: var(--vercel-weight-semibold, 600);
  line-height: var(--vercel-leading-base, 1.5);
  color: var(--text-color, #171717);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-close {
  position: absolute;
  top: var(--vercel-space-3, 12px);
  right: var(--vercel-space-3, 12px);
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary, #666);
  border-radius: var(--vercel-radius-standard, 6px);
  cursor: pointer;
  transition: all var(--vercel-duration-fast, 150ms) var(--vercel-ease-out, ease-out);
  z-index: 2;
}

.popup-close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-color, #171717);
}

.popup-close:focus-visible {
  outline: 2px solid var(--focus-ring-color, #a78bfa);
  outline-offset: 2px;
}

.popup-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: var(--bases-primary-gradient, linear-gradient(135deg, #9e94d8 0%, #b6ade6 100%));
  transform-origin: left center;
}

/* Transition classes — 保留空的用于兼容，实际动画由 GSAP 驱动 */
.popup-slide-enter-active,
.popup-slide-leave-active {
  transition: none;
}

/* Responsive */
@media (min-width: 1024px) {
  .last-viewed-popup {
    width: 320px;
    bottom: 24px;
    right: 24px;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .last-viewed-popup {
    width: 280px;
    bottom: 16px;
    right: 16px;
  }
}

@media (max-width: 767px) {
  .last-viewed-popup {
    width: calc(100vw - 32px);
    bottom: 12px;
    left: 16px;
    right: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .popup-slide-enter-active,
  .popup-slide-leave-active {
    transition-duration: 0.01ms !important;
  }

  .last-viewed-popup::after {
    animation-duration: 0.01ms !important;
  }
}
</style>
