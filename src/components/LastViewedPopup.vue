<template>
  <Transition name="popup-slide">
    <div
      v-if="visible && newsData"
      class="last-viewed-popup"
      :class="{ 'popup-exiting': isExiting }"
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
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLastViewedCookie, type LastViewedNews } from '../composables/useLastViewedCookie'
import { useCookieConsent } from '../composables/useCookieConsent'

const emit = defineEmits<{
  dismissed: []
}>()

const { getLastViewedNews, clearLastViewedNews } = useLastViewedCookie()
const { getConsent } = useCookieConsent()
const router = useRouter()

const newsData = ref<LastViewedNews | null>(null)
const visible = ref(false)
const isExiting = ref(false)
const PROGRESS_DURATION = 5000

let dismissTimer: ReturnType<typeof setTimeout> | null = null
let remainingTime = PROGRESS_DURATION
let timerStartTime = 0
let popupElement: HTMLElement | null = null

function navigateToNews() {
  if (isExiting.value || !newsData.value) return
  startExit()
  visible.value = false
  setTimeout(() => {
    router.push({ name: 'newsdetail', query: { id: newsData.value!.id.toString() } })
    clearLastViewedNews()
    emit('dismissed')
  }, 500)
}

function startExit() {
  isExiting.value = true
  clearDismissTimer()
}

function dismiss() {
  if (isExiting.value) return
  startExit()
  visible.value = false
  setTimeout(() => {
    clearLastViewedNews()
    emit('dismissed')
  }, 500)
}

function clearDismissTimer() {
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

function pauseTimer() {
  if (isExiting.value) return
  if (dismissTimer !== null) {
    remainingTime = Math.max(0, remainingTime - (Date.now() - timerStartTime))
    clearDismissTimer()
  }
  if (popupElement) {
    popupElement.classList.add('popup-paused')
  }
}

function resumeTimer() {
  if (isExiting.value) return
  timerStartTime = Date.now()
  dismissTimer = setTimeout(() => {
    dismiss()
  }, remainingTime)
  if (popupElement) {
    popupElement.classList.remove('popup-paused')
  }
}

function startDismissTimer() {
  timerStartTime = Date.now()
  dismissTimer = setTimeout(() => {
    dismiss()
  }, PROGRESS_DURATION)
}

onMounted(() => {
  const consent = getConsent()
  if (consent !== 'accepted') return

  const news = getLastViewedNews()
  if (!news) return

  newsData.value = news
  popupElement = document.querySelector('.last-viewed-popup')

  setTimeout(() => {
    visible.value = true
    requestAnimationFrame(() => {
      startDismissTimer()
    })
  }, 1000)
})

onUnmounted(() => {
  clearDismissTimer()
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

.last-viewed-popup::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--bases-primary-gradient, linear-gradient(135deg, #9e94d8 0%, #b6ade6 100%));
  animation: progressShrink 5s linear forwards;
}

.popup-paused::after {
  animation-play-state: paused;
}

@keyframes progressShrink {
  0% {
    width: 100%;
  }
  100% {
    width: 0%;
  }
}

/* Transition classes */
.popup-slide-enter-active {
  animation: slideInBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.popup-slide-leave-active {
  animation: slideOutBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.popup-slide-enter-from {
  opacity: 0;
}

.popup-slide-leave-to {
  opacity: 0;
}

@keyframes slideInBounce {
  0% {
    opacity: 0;
    transform: translateX(120%);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOutBounce {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(120%);
  }
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
