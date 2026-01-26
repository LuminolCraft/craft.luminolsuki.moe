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
        font-family: var(--font-primary);
        font-size: var(--font-size-base);
        line-height: var(--body-line-height);
        color: var(--text-color);
        background-color: var(--background-color);
    }
  
    a {
        text-decoration: none;
        color: var(--link-color);
        transition: var(--link-transition);
    }
  
    a:hover {
        color: var(--link-hover-color);
        text-decoration: underline;
    }
  
    /* 全局部分样式 */
    section {
        padding: var(--spacing-16) 0;
    }
  
    /* 全局标题样式 */
    .section-title {
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-bold);
        line-height: var(--line-height-tight);
        margin-bottom: var(--spacing-4);
        color: var(--text-color);
        text-align: center;
    }
  
    .section-subtitle {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-normal);
        line-height: var(--line-height-relaxed);
        margin-bottom: var(--spacing-8);
        color: var(--text-secondary);
        text-align: center;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }
  </style>