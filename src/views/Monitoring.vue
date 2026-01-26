<template>
    <div class="monitoring-page">
        <div class="development-notice">
            <div class="development-content">
                <i class="fas fa-tools"></i>
                <h1>{{ t('monitoring.development.title') }}</h1>
                <p>{{ t('monitoring.development.description') }}</p>
                <a href="/" class="btn-back">{{ t('monitoring.development.backHome') }}</a>
            </div>
        </div>
        
    </div>
  </template>
<style scoped>
@import '../styles/desktop/monitoring-styles.css';
@import '../styles/mobile/monitoring-mobile.css';

</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
console.log('✅ Monitoring.vue 组件已成功加载！')
const { t } = useI18n();
</script>