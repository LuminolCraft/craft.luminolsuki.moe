<template>
  <Transition name="consent-slide">
    <div
      v-if="visible && !hasConsented"
      ref="bannerRef"
      class="cookie-consent-banner"
      :class="[`consent-${position}`, { 'consent-exiting': isExiting }]"
      :style="{ zIndex }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-message"
    >
      <div class="consent-accent"></div>

      <div class="consent-body">
        <div class="consent-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
            <path d="M8.5 8.5v.01"/>
            <path d="M16 15.5v.01"/>
            <path d="M12 12v.01"/>
            <path d="M11 17v.01"/>
            <path d="M7 14v.01"/>
          </svg>
        </div>

        <p id="consent-message" class="consent-message">{{ consentMessage }}</p>

        <div class="consent-actions">
          <button
            ref="declineBtn"
            class="consent-btn consent-btn-decline"
            type="button"
            @click="handleDecline"
          >
            {{ consentDeclineText }}
          </button>
          <button
            ref="acceptBtn"
            class="consent-btn consent-btn-accept"
            type="button"
            @click="handleAccept"
          >
            {{ consentAcceptText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { useCookieConsent } from '../composables/useCookieConsent'

const props = withDefaults(
  defineProps<{
    message?: string
    acceptText?: string
    declineText?: string
    position?: 'bottom' | 'bottom-left' | 'bottom-right'
    zIndex?: number
  }>(),
  {
    message: '',
    acceptText: '',
    declineText: '',
    position: 'bottom',
    zIndex: 999,
  },
)

const emit = defineEmits<{
  accepted: []
  declined: []
}>()

const { t } = useI18n()
const { getConsent, setConsent } = useCookieConsent()

const visible = ref(false)
const isExiting = ref(false)
const hasConsented = ref(false)
const acceptBtn = ref<HTMLButtonElement | null>(null)
const declineBtn = ref<HTMLButtonElement | null>(null)
const bannerRef = ref<HTMLElement | null>(null)

const consentMessage = computed(() => props.message || t('cookieConsent.message'))
const consentAcceptText = computed(() => props.acceptText || t('cookieConsent.accept'))
const consentDeclineText = computed(() => props.declineText || t('cookieConsent.decline'))

function animateIn(el: HTMLElement) {
  const tl = gsap.timeline()

  tl.fromTo(el,
    { autoAlpha: 0, y: 60 },
    { autoAlpha: 1, y: 0, duration: 0.5, ease: 'back.out(1.2)' },
  )

  const icon = el.querySelector('.consent-icon')
  const message = el.querySelector('.consent-message')
  const actions = el.querySelector('.consent-actions')

  if (icon) {
    tl.fromTo(icon,
      { autoAlpha: 0, scale: 0.5 },
      { autoAlpha: 1, scale: 1, duration: 0.32, ease: 'power2.out' },
    '-=0.25')
  }
  if (message) {
    tl.fromTo(message,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out' },
    '-=0.08')
  }
  if (actions) {
    tl.fromTo(actions,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out' },
    '-=0.08')
  }
}

function animateOut(el: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline()

  const icon = el.querySelector('.consent-icon')
  const message = el.querySelector('.consent-message')
  const actions = el.querySelector('.consent-actions')

  if (actions) {
    tl.to(actions,
      { autoAlpha: 0, y: -8, duration: 0.26, ease: 'power2.in' },
    0)
  }
  if (message) {
    tl.to(message,
      { autoAlpha: 0, y: -8, duration: 0.26, ease: 'power2.in' },
    0.05)
  }
  if (icon) {
    tl.to(icon,
      { autoAlpha: 0, scale: 0.5, duration: 0.26, ease: 'power2.in' },
    0.1)
  }

  tl.to(el,
    { autoAlpha: 0, y: 40, duration: 0.4, ease: 'back.in(1.4)' },
  '-=0.08')

  return tl
}

watch(visible, async (val) => {
  if (val) {
    await nextTick()
    if (bannerRef.value) animateIn(bannerRef.value)
  }
})

function handleAccept() {
  if (isExiting.value) return
  setConsent('accepted')
  isExiting.value = true
  emit('accepted')
  if (bannerRef.value) {
    animateOut(bannerRef.value).eventCallback('onComplete', () => {
      hasConsented.value = true
    })
  } else {
    hasConsented.value = true
  }
}

function handleDecline() {
  if (isExiting.value) return
  setConsent('declined')
  isExiting.value = true
  emit('declined')
  if (bannerRef.value) {
    animateOut(bannerRef.value).eventCallback('onComplete', () => {
      hasConsented.value = true
    })
  } else {
    hasConsented.value = true
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!visible.value || isExiting.value) return

  if (e.key === 'Tab') {
    e.preventDefault()
    if (document.activeElement === acceptBtn.value) {
      declineBtn.value?.focus()
    } else {
      acceptBtn.value?.focus()
    }
  }
}

onMounted(async () => {
  const existing = getConsent()
  if (existing !== null) {
    hasConsented.value = true
    return
  }

  await nextTick()
  visible.value = true
  await nextTick()
  acceptBtn.value?.focus()

  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.cookie-consent-banner {
  position: fixed;
  overflow: hidden;
  background: var(--card-bg, rgba(255, 255, 255, 0.95));
  border-radius: var(--vercel-radius-comfortable, 12px);
  box-shadow:
    0 8px 32px rgba(109, 91, 154, 0.18),
    0 0 0 1px rgba(158, 148, 216, 0.12);
  font-family: var(--font-primary, var(--vercel-font-family, sans-serif));
}

.consent-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--bases-primary-gradient, linear-gradient(135deg, #9e94d8 0%, #b6ade6 100%));
}

.consent-body {
  display: flex;
  align-items: center;
  gap: var(--vercel-space-4, 16px);
  padding: var(--vercel-space-4, 16px) var(--vercel-space-5, 20px);
}

.consent-icon {
  flex-shrink: 0;
  color: var(--primary-color, #a78bfa);
  display: flex;
  align-items: center;
}

.consent-message {
  flex: 1;
  font-size: var(--vercel-font-size-body-small, 14px);
  line-height: var(--vercel-leading-base, 1.6);
  color: var(--text-color, #171717);
  margin: 0;
}

.consent-actions {
  display: flex;
  gap: var(--vercel-space-2, 8px);
  flex-shrink: 0;
}

.consent-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  min-width: 80px;
  min-height: 44px;
  border: none;
  border-radius: var(--vercel-radius-standard, 6px);
  font-family: inherit;
  font-size: var(--vercel-font-size-body-small, 14px);
  font-weight: var(--vercel-weight-medium, 500);
  cursor: pointer;
  transition:
    background var(--vercel-duration-fast, 150ms) var(--vercel-ease-out, ease-out),
    color var(--vercel-duration-fast, 150ms) var(--vercel-ease-out, ease-out),
    box-shadow var(--vercel-duration-fast, 150ms) var(--vercel-ease-out, ease-out);
}

.consent-btn:focus-visible {
  outline: 2px solid var(--focus-ring-color, #a78bfa);
  outline-offset: 2px;
}

.consent-btn-accept {
  background: var(--bases-primary-gradient, linear-gradient(135deg, #9e94d8 0%, #b6ade6 100%));
  color: #fff;
}

.consent-btn-accept:hover {
  box-shadow: 0 4px 12px rgba(109, 91, 154, 0.3);
}

.consent-btn-decline {
  background: transparent;
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
}

.consent-btn-decline:hover {
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-color, #171717);
}

/* Position variants */
.consent-bottom {
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  width: calc(100% - 40px);
  max-width: 720px;
}

.consent-bottom-left {
  left: 20px;
  bottom: 20px;
  width: calc(100% - 40px);
  max-width: 480px;
}

.consent-bottom-right {
  right: 20px;
  bottom: 20px;
  width: calc(100% - 40px);
  max-width: 480px;
}

/* Transition classes — 保留空的用于兼容，实际动画由 GSAP 驱动 */
.consent-slide-enter-active,
.consent-slide-leave-active {
  transition: none;
}

/* Responsive */
@media (max-width: 767px) {
  .consent-body {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--vercel-space-3, 12px);
  }

  .consent-icon {
    display: none;
  }

  .consent-message {
    font-size: 13px;
  }

  .consent-actions {
    width: 100%;
    flex-direction: row;
  }

  .consent-btn {
    flex: 1;
    padding: 10px 16px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .consent-slide-enter-active,
  .consent-slide-leave-active {
    animation-duration: 0.01ms !important;
  }
}
</style>
