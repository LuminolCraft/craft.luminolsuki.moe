<template>
  <Navbar />
  <router-view />
  <Footer />
</template>


<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'

const route = useRoute()
const { t } = useI18n()

const title = computed(() => route.meta.title as string || 'LuminolCraft')
const description = computed(() => route.meta.description as string || t('hero.subtitle'))

useHead({
  title,
  meta: [
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description }
  ]
})

</script>
<style>
  @import './styles/fonts.css';
  @import './styles/theme-colors.css';
  @import './styles/typography.css';
  @import './styles/vercel-design-system.css';  /* Vercel Design System */
  @import './styles/responsive.css'; 
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
  
    html {
        scroll-behavior: smooth;
    }
  
    body {
        font-family: var(--vercel-font-family, var(--font-primary));
        font-size: var(--vercel-font-size-base, var(--font-size-base));
        line-height: var(--vercel-leading-relaxed, var(--body-line-height));
        color: var(--text-color);
        background-color: var(--background-color);
    }

    a {
        text-decoration: none;
        color: var(--link-color);
        transition: all var(--vercel-duration-fast) var(--vercel-ease-out);
    }

    a:hover {
        color: var(--link-hover-color);
        text-decoration: underline;
    }

    /* 全局部分样式 - 保留原有背景 */
    section {
        padding: var(--spacing-16) 0;
    }

    /* 全局标题样式 - Vercel Typography + 原有颜色 */
    .section-title {
        font-size: var(--vercel-section-heading, var(--font-size-3xl));
        font-weight: var(--vercel-weight-semibold, var(--font-weight-bold));
        line-height: var(--vercel-leading-snug, var(--line-height-tight));
        margin-bottom: var(--spacing-4);
        color: var(--text-color);
        text-align: center;
        letter-spacing: var(--vercel-tracking-tighter);
    }

    .section-subtitle {
        font-size: var(--vercel-body-large, var(--font-size-lg));
        font-weight: var(--vercel-weight-normal);
        line-height: var(--vercel-leading-loose, var(--line-height-relaxed));
        margin-bottom: var(--spacing-8);
        color: var(--text-secondary);
        text-align: center;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }

    /* Container System - 保留原有间距 */
    .container {
        max-width: var(--vercel-container-max-width);
        width: 100%;
        margin: 0 auto;
        padding: 0 var(--spacing-4);
    }
  </style>