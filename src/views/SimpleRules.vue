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
                    <p class="vercel-body-small">{{ t('rules.simple.blockquote') }}</p>
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
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import zh from '../i18n/locales/zh';
import en from '../i18n/locales/en';

const { t, locale } = useI18n();

const rules = computed(() => {
  const currentLang = locale.value;
  const rulesObj = currentLang === 'zh' ? zh : en;
  return rulesObj.rules.simple.rules || [];
});
</script>
