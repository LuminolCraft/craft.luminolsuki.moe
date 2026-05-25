<template>
    <section class="rules-section">
        <div class="container">
            <div class="rules-content vercel-animate-fadeInUp">
                <h1 class="vercel-display-hero">{{ t('rules.simple.title') }}</h1>
                <p class="rules-date vercel-caption"><em>{{ t('rules.simple.date') }}</em></p>

                <ol class="rules-list">
                    <li v-for="(rule, index) in rules" :key="index" class="vercel-body">{{ rule }}</li>
                </ol>

                <blockquote class="rules-quote">
                    <p class="vercel-body-small">{{ t('rules.simple.blockquoteBefore') }}<a href="https://docs.qq.com/pdf/DQUZYS0FKenFmYWZx" target="_blank" rel="noopener noreferrer" class="rules-link">{{ t('rules.simple.blockquoteLink') }}<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="external-link-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg></a>{{ t('rules.simple.blockquoteAfter') }}</p>
                </blockquote>

                <a href="/" class="back-to-home vercel-btn vercel-btn-primary">{{ t('rules.simple.backHome') }}</a>
            </div>
        </div>
    </section>
</template>


<style scoped>

.rules-section {
    padding: var(--space-20) 0;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 var(--container-padding);
}

.rules-content {
    text-align: left;
    margin-top: var(--space-12);    
}

.rules-content h1 {
    margin-bottom: var(--space-4);
}

.rules-date {
    display: inline-block;
    margin-bottom: var(--space-8);
    color: var(--text-tertiary);
}

.rules-list {
    padding-left: var(--space-6);
    margin-bottom: var(--space-8);
}

.rules-list li {
    margin-bottom: var(--space-3);
    line-height: 1.56;
    color: var(--text-color);
}

.rules-quote {
    box-shadow: var(--shadow-border);
    background-color: var(--card-bg);
    padding: var(--space-6);
    margin: var(--space-8) 0;
    border-radius: var(--radius-comfortable);
    color: var(--text-secondary);
    font-style: normal;
    line-height: 1.56;
}

.rules-quote p {
    margin-bottom: 0;
    color: inherit;
}

.rules-link {
    color: var(--primary-color);
    text-decoration: none;
    border-bottom: 1px dashed var(--primary-color);
}

.rules-link:hover {
    border-bottom-style: solid;
}

.external-link-icon {
    width: 14px;
    height: 14px;
    margin-left: 3px;
    vertical-align: -1px;
    transition: transform 150ms ease-out;
}

.rules-link:hover .external-link-icon {
    transform: translateX(2px);
}

.back-to-home {
    display: inline-flex;
	align-items: center;
	gap: 10px;
	padding: 12px 28px;
	border-radius: var(--radius-comfortable);
	font-size: 0.9rem;
	font-weight: 600;
	text-decoration: none;
	transition: transform 0.25s,box-shadow 0.25s,background 0.25s;
	cursor: pointer;
	border: none;
	font-family: var(--font-main);
}

.back-to-home:hover {
	text-decoration: none;
}
.back-to-home:hover::before {
  left: 100%;
}
.back-to-home::before{
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left var(--duration-slow) var(--ease-out);
}



@media (max-width: 768px) {
    .rules-section {
        padding: var(--space-12) 0;
    }

    .rules-list {
        padding-left: var(--space-4);
    }

    .rules-quote {
        padding: var(--space-4);
    }
}
</style>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import zh from '../i18n/locales/zh'
import en from '../i18n/locales/en'
import { useGsap } from '@/composables/useGsap'
import { EASINGS, STAGGERS } from '@/gsap'

const { t, locale } = useI18n()

const rules = computed(() => {
  const currentLang = locale.value
  const rulesObj = currentLang === 'zh' ? zh : en
  return rulesObj.rules.simple.rules || []
})

const { create } = useGsap()

onMounted(() => {
  create((g) => {
    g.fromTo('.rules-list li',
      { autoAlpha: 0, x: -30 },
      {
        autoAlpha: 1,
        x: 0,
        stagger: STAGGERS.rules,
        duration: 0.6,
        ease: EASINGS.entrance,
        scrollTrigger: {
          trigger: '.rules-section',
          start: 'top 85%',
          once: true,
        },
      },
    )
  })
})
</script>
