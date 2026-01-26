<template>
<section class="news-detail-section">
        <div id="news-detail">
            <div class="news-content">
                <h1>{{ t('rules.simple.title') }}</h1>
                <p><em>{{ t('rules.simple.date') }}</em></p>
                
                <ol>
                    <li v-for="(rule, index) in rules" :key="index">{{ rule }}</li>
                </ol>

                <blockquote>
                    <p>{{ t('rules.simple.blockquote') }}</p>
                </blockquote>
            </div>
        </div>
        <a class="back-to-news" href="/">{{ t('rules.simple.backHome') }}</a>
    </section>
</template>
  

<style scoped>
@import '../styles/desktop/news-detail-styles.css';
@import '../styles/mobile/news-detail-mobile.css';

</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import zh from '../i18n/locales/zh';
import en from '../i18n/locales/en';

const { t, locale } = useI18n();

// 根据当前语言直接从语言文件中获取规则
const rules = computed(() => {
  const currentLang = locale.value;
  const rulesObj = currentLang === 'zh' ? zh : en;
  return rulesObj.rules.simple.rules || [];
});
</script>