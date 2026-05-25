<template>
    <Navbar />
    <div class="container">
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
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.not-found-content {
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
}

.error-description {
    font-size: var(--font-size-body-large);
    font-weight: 400;
    line-height: 1.80;
    color: var(--text-secondary);
    margin: 0 0 var(--space-10) 0;
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
    transition: all 150ms ease-out;
    box-shadow: var(--shadow-border);
    position: relative;
    overflow: hidden;
}

.btn-back-home:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
}

.btn-back-home:focus-visible {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: 2px;
}

.btn-back-home:active {
    transform: translateY(0);
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
import { useGsap } from '@/composables/useGsap'
import { EASINGS } from '@/gsap'
import Navbar from '../components/Navbar.vue'

const { t } = useI18n()
const { create } = useGsap()

onMounted(() => {
  create((g) => {
    const tl = g.timeline({ defaults: { ease: EASINGS.entrance } })
    tl.fromTo('.error-code',
      { autoAlpha: 0, scale: 0.3, y: -60 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: 'back.out(1.7)' },
    )
    tl.fromTo('.error-description',
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.5 },
    '-=0.2')
    tl.fromTo('.btn-back-home',
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.5 },
    '-=0.1')
  })
})
</script>
