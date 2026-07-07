<template>
    <Navbar />
    <div class="container">
        <svg class="bg-sketch" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path class="bg-path" d="M50,200 Q300,100 600,250 T1150,200" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3" />
            <path class="bg-path" d="M50,400 Q300,500 600,350 T1150,400" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.2" />
            <path class="bg-path" d="M50,600 Q300,700 600,550 T1150,600" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.25" />
        </svg>
        <div class="not-found-content">
            <h1 class="error-code">404</h1>
            <p class="error-description">{{ t('404.description') }}</p>
            <a href="/" class="btn-back-home vercel-btn vercel-btn-primary">{{ t('404.backhome') }}</a>
        </div>
    </div>
    <Footer />
</template>


<style scoped>
.container {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.bg-sketch {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    color: var(--primary-color, #9e94d8);
    pointer-events: none;
    z-index: 0;
}

.bg-path {
    will-change: transform, opacity;
}

.not-found-content {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: var(--space-10) var(--space-5);
}

.error-code {
    font-size: clamp(5rem, 12vw, 8rem);
    font-weight: 600;
    line-height: 1.00;
    letter-spacing: -2.0px;
    color: var(--primary-color);
    margin: 0 0 var(--space-6) 0;
    will-change: transform, opacity;
}

.error-description {
    font-size: var(--font-size-body-large);
    font-weight: 400;
    line-height: 1.80;
    color: var(--text-secondary);
    margin: 0 0 var(--space-10) 0;
    will-change: transform, opacity;
}

.btn-back-home:hover::before {
  left: 100%;
}

.btn-back-home::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left var(--duration-slow) var(--ease-out);
}

.btn-back-home {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 32px;
    background: var(--vercel-black);
    color: var(--vercel-white);
    text-decoration: none;
    border-radius: var(--vercel-radius-standard, 6px);
    font-size: var(--vercel-font-size-button, 0.875rem);
    font-weight: 500;
    line-height: 1.43;
    letter-spacing: 0;
    transition: box-shadow 150ms ease-out;
    box-shadow: var(--shadow-border);
    position: relative;
    overflow: hidden;
    will-change: transform, opacity;
}

.btn-back-home:hover {
    box-shadow: var(--shadow-hover);
}

.btn-back-home:focus-visible {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: 2px;
}

.btn-back-home:active {
    box-shadow: var(--shadow-border);
}

@media (max-width: 768px) {
    .not-found-content {
        padding: var(--space-8) var(--space-4);
    }

    .error-code {
        font-size: clamp(4rem, 15vw, 6rem);
        letter-spacing: -1.28px;
    }

    .error-description {
        font-size: var(--font-size-body);
    }

    .btn-back-home {
        padding: 10px 24px;
        font-size: var(--vercel-font-size-button, 0.875rem);
    }
}
</style>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SplitText } from 'gsap/SplitText'
import { useGsap } from '@/composables/useGsap'
import { EASINGS, DURATIONS, STAGGERS } from '@/gsap'
import Navbar from '../components/Navbar.vue'

const { t } = useI18n()
const { create } = useGsap()

onMounted(() => {
  create((g) => {
    g.set('.error-code, .error-description, .btn-back-home', { autoAlpha: 0 })

    const mm = g.matchMedia()

    // reduceMotion: simple fade-in only
    mm.add('(prefers-reduced-motion: reduce)', () => {
      g.set('.error-code, .error-description, .btn-back-home', { autoAlpha: 1 })
      g.set('.bg-path', { drawSVG: '100%' })
    })

    // normal animation
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Background SVG draw — pen-sketch effect
      g.from('.bg-path', {
        drawSVG: '0%',
        duration: 2.4,
        ease: 'power2.inOut',
        stagger: 0.2,
      })

      // Split "404" into chars with rotation stagger
      const split = new SplitText('.error-code', { type: 'chars' })
      // Reveal the parent (hidden for FOUC) so the chars are visible while animating in
      g.set('.error-code', { autoAlpha: 1 })
      const tl = g.timeline({ defaults: { ease: EASINGS.bounce } })
      tl.from(split.chars, {
        autoAlpha: 0,
        y: -80,
        rotation: () => g.utils.random(-12, 12),
        scale: 0.3,
        stagger: { each: 0.12, from: 'center' },
        duration: DURATIONS.slow,
      })
      tl.fromTo('.error-description',
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: DURATIONS.entrance },
      '-=0.3')
      tl.fromTo('.btn-back-home',
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: DURATIONS.entrance },
      '-=0.2')

      // Continuous float on error-code (yoyo)
      g.to('.error-code', {
        y: -16,
        duration: 2.4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      })
    })
  })
})
</script>
