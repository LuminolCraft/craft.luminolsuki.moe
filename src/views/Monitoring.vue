<template>
    <div class="monitoring-page vercel-section">
        <div class="vercel-container">
            <!-- 页面标题区域 -->
            <header class="monitoring-header vercel-animate-fadeInUp">
                <h1 class="vercel-display-hero">{{ t('monitoring.development.title') }}</h1>
                <p class="vercel-body-large">{{ t('monitoring.development.description') }}</p>
            </header>

            <!-- 开发状态卡片 -->
            <main class="monitoring-content">
                <div class="status-card vercel-card vercel-animate-scaleIn">
                    <div class="card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    
                    <div class="card-content">
                        <h2 class="vercel-card-title">{{ t('monitoring.development.title') }}</h2>
                        <p class="vercel-body">{{ t('monitoring.development.description') }}</p>
                        
                        <div class="status-info">
                            <div class="info-item">
                                <span class="info-label">Status</span>
                                <span class="badge vercel-badge">In Development</span>
                            </div>
                            
                            <div class="info-item">
                                <span class="info-label">Expected Launch</span>
                                <span class="info-value">Coming Soon</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-actions">
                        <a href="/" class="vercel-btn vercel-btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m15 18-6-6 6-6"/>
                                <path d="M19.5 12H4.5"/>
                            </svg>
                            {{ t('monitoring.development.backHome') }}
                        </a>
                    </div>
                </div>

                <!-- 功能预览卡片 -->
                <div class="features-preview vercel-grid vercel-grid-cols-2">
                    <div class="preview-card vercel-card vercel-animate-fadeInUp">
                        <div class="preview-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
                            </svg>
                        </div>
                        <h3 class="vercel-subheading">Real-time Monitoring</h3>
                        <p class="vercel-body-small">Track server performance and player activity in real-time with advanced analytics.</p>
                    </div>

                    <div class="preview-card vercel-card vercel-animate-fadeInUp">
                        <div class="preview-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 7.5V18M3 7.5v11m0 0V9a9 9 0 0118 0v9.5M3 16.5h18"/>
                            </svg>
                        </div>
                        <h3 class="vercel-subheading">Server Statistics</h3>
                        <p class="vercel-body-small">Comprehensive server metrics including uptime, TPS, memory usage, and more.</p>
                    </div>

                    <div class="preview-card vercel-card vercel-animate-fadeInUp">
                        <div class="preview-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A18.036 18.036 0 0110.602 20.57M15 19.128v-.106c0-1.113.285-2.16.786-3.07M15 19.128v-.106A18.036 18.036 0 0019.398 17.47M10.602 20.57a9.38 9.38 0 01-2.625.372 9.337 9.337 0 01-4.121-.952A4.125 4.125 0 008.523 16.5M10.602 20.57v-.106c0-1.113-.285-2.16-.786-3.07M10.602 20.57v-.106A18.036 18.036 0 004.202 17.47M10.602 20.57v-.106c0-1.113.285-2.16.786-3.07"/>
                            <path d="M12 12h.008v.008H12V12zm0 0h.008V12H12V12zm0 0h.008V12H12V12z"/>
                            <circle cx="12" cy="12" r="9"/>
                        </svg>
                        </div>
                        <h3 class="vercel-subheading">Player Analytics</h3>
                        <p class="vercel-body-small">Detailed player statistics, online history, and engagement metrics.</p>
                    </div>

                    <div class="preview-card vercel-card vercel-animate-fadeInUp">
                        <div class="preview-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-1.621-1.621a3 3 0 01-.879-2.122V17.25m-3 0h3M12 15.75h3a3 3 0 110-6h-3m0 0V9m6 6v-6m-6 6h6"/>
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        </div>
                        <h3 class="vercel-subheading">Security Dashboard</h3>
                        <p class="vercel-body-small">Monitor security events, track suspicious activities, and manage access control.</p>
                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<style scoped>
@import '../styles/desktop/monitoring-styles.css';
@import '../styles/mobile/monitoring-mobile.css';

/* Vercel Design System - Monitoring Page (保留原有背景色) */

.monitoring-page {
    background: var(--background-color);
    min-height: 100vh;
}

.monitoring-header {
    text-align: center;
    margin-bottom: var(--vercel-space-16);
}

.monitoring-header h1 {
    margin-bottom: var(--vercel-space-5);
}

.monitoring-header p {
    max-width: 600px;
    margin: 0 auto;
}

.monitoring-content {
    display: flex;
    flex-direction: column;
    gap: var(--vercel-space-10);
}

.status-card {
    max-width: 800px;
    margin: 0 auto;
    text-align: left;
}

.card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    border-radius: var(--vercel-radius-comfortable);
    background: var(--card-bg);
    color: var(--text-color);
    margin-bottom: var(--vercel-space-6);
}

.card-content {
    margin-bottom: var(--vercel-space-6);
}

.card-content h2 {
    margin-bottom: var(--vercel-space-3);
}

.card-content p {
    color: var(--text-secondary);
    line-height: var(--vercel-leading-relaxed);
}

.status-info {
    display: flex;
    flex-wrap: wrap;
    gap: var(--vercel-space-6);
    margin-top: var(--vercel-space-5);
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: var(--vercel-space-2);
}

.info-label {
    font-size: 12px;
    font-weight: var(--vercel-weight-medium);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.info-value {
    font-size: 16px;
    font-weight: var(--vercel-weight-semibold);
    color: var(--text-color);
}

.card-actions {
    display: flex;
    gap: var(--vercel-space-4);
    padding-top: var(--vercel-space-5);
    border-top: 1px solid var(--glass-border);
}

.features-preview {
    margin-top: var(--vercel-space-12);
}

.preview-card {
    text-align: left;
}

.preview-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: var(--vercel-radius-comfortable);
    background: var(--primary-color);
    color: var(--text-primary);
    margin-bottom: var(--vercel-space-4);
}

.preview-card h3 {
    font-size: 1.25rem;
    font-weight: var(--vercel-weight-semibold);
    color: var(--text-color);
    letter-spacing: var(--vercel-tracking-normal);
    margin-bottom: var(--vercel-space-3);
    line-height: var(--vercel-leading-normal);
}

.preview-card p {
    color: var(--text-secondary);
    line-height: var(--vercel-leading-relaxed);
}

/* 响应式设计 */
@media (max-width: 1024px) {
    .features-preview {
        grid-template-columns: 1fr;
    }
    
    .status-info {
        flex-direction: column;
        gap: var(--vercel-space-4);
    }
}

@media (max-width: 768px) {
    .monitoring-header {
        margin-bottom: var(--vercel-space-10);
    }
    
    .card-actions {
        flex-direction: column;
    }
    
    .card-actions .vercel-btn {
        justify-content: center;
    }
}
</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
console.log('✅ Monitoring.vue 组件已成功加载！采用 Vercel Design System')
const { t } = useI18n();
</script>