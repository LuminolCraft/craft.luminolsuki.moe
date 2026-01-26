<template>
    <!-- 顶部区域 -->
    <header id="header" class="hero-section">
        <!-- 背景轮播图容器 - 双层实现平滑过渡 -->
        <div class="header-background fade-in" id="bg-slider-1" :style="{ backgroundImage: `url(${currentImage1})` }"></div>
        <div class="header-background" id="bg-slider-2" :style="{ backgroundImage: `url(${currentImage2})` }"></div>
        
        <div class="hero-overlay"></div>
        
        <div class="hero-content">
            <div class="hero-text">
                <h1 class="hero-title">LuminolCraft</h1>
                <p class="hero-subtitle">{{ t('hero.subtitle') }}</p>
                <p class="hero-description">{{ t('home.hero.description') }}</p>
                
                <div class="hero-actions">
                    <a href="https://qm.qq.com/q/M29Eyniu8S" target="_blank" rel="noopener noreferrer" class="btn-hero btn-primary-hero">
                        <i class="fas fa-users"></i>
                        {{ t('common.joinGroup') }}
                    </a>
                    <a href="monitoring" class="btn-hero btn-secondary-hero">
                        <i class="fas fa-chart-line"></i>
                        {{ t('common.monitoring') }}
                    </a>
                </div>
            </div>
            
            <div class="hero-visual">
                <div class="server-status-card">
                    <div class="status-indicator">
                        <div class="status-dot" id="server-status-dot"></div>
                        <div class="status-text" id="server-status-text">{{ t('home.serverStatus.loading') }}</div>
                    </div>
                    
                    <div class="server-info-grid">
                        <div class="info-item">
                            <div class="info-label">{{ t('home.serverStatus.playersLabel') }}</div>
                            <span class="info-value" id="online-players">{{ t('home.serverStatus.playersLoading') }}</span>
                        </div>
                        
                        <!-- <div class="info-item">
                            <div class="info-label">服务器版本</div>
                            <div class="info-value" id="server-version">加载中...</div>
                        </div> -->
                        <div class="info-item">
                            <div class="info-label">{{ t('home.serverStatus.versionLabel') }}</div>
                            <div class="info-value" id="info-version">1.21.7/8</div>
                        </div>
                        <div id="info-server-type" class="info-item">
                            <div class="info-label">{{ t('home.serverStatus.typeLabel') }}</div>
                            <div class="info-value">{{ t('home.serverStatus.typeValue') }}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">{{ t('home.serverStatus.statusLabel') }}</div>
                            <div class="info-value" id="server-status">{{ t('home.serverStatus.statusChecking') }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        
        
    </header>

    <!-- 特色区域 -->
    <section class="features-section">
        <div class="features-container">
            <div class="section-header">
                <h2 class="section-title">{{ t('home.features.title') }}</h2>
                <p class="section-subtitle">{{ t('home.features.subtitle') }}</p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 448 512"><path fill="white" d="M338.8-9.9c11.9 8.6 16.3 24.2 10.9 37.8L271.3 224 416 224c13.5 0 25.5 8.4 30.1 21.1s.7 26.9-9.6 35.5l-288 240c-11.3 9.4-27.4 9.9-39.3 1.3s-16.3-24.2-10.9-37.8L176.7 288 32 288c-13.5 0-25.5-8.4-30.1-21.1s-.7-26.9 9.6-35.5l288-240c11.3-9.4 27.4-9.9 39.3-1.3z"/></svg>

                    </div>
                    <h3 class="feature-title">{{ t('home.features.responsive.title') }}</h3>
                    <p class="feature-description">{{ t('home.features.responsive.desc') }}</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 384 512"><path fill="white" d="M16 64C16 28.7 44.7 0 80 0L304 0c35.3 0 64 28.7 64 64l0 384c0 35.3-28.7 64-64 64L80 512c-35.3 0-64-28.7-64-64L16 64zm64 0l0 304 224 0 0-304-224 0zM192 472c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32z"/></svg>

                    </div>
                    <h3 class="feature-title">{{ t('home.features.multiPlatform.title') }}</h3>
                    <p class="feature-description">{{ t('home.features.multiPlatform.desc') }}</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 512 512"><path fill="white" d="M256 0c4.6 0 9.2 1 13.4 2.9L457.8 82.8c22 9.3 38.4 31 38.3 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0-172.4-82.5-213.1-264-213.6-363.2-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.9 1 251.4 0 256 0zm0 66.8l0 378.1c138-66.8 175.1-214.8 176-303.4l-176-74.6 0 0z"/></svg>

                    </div>
                    <h3 class="feature-title">{{ t('home.features.secureReliable.title') }}</h3>
                    <p class="feature-description">{{ t('home.features.secureReliable.desc') }}</p>
                </div>
            </div>
        </div>
    </section>

    <!-- 服务器类型区域 -->
    <section class="servers-section">
        <div class="servers-container">
            <div class="section-header">
                <h2 class="section-title">{{ t('home.serverTypes.title') }}</h2>
                <p class="section-subtitle">{{ t('home.serverTypes.subtitle') }}</p>
            </div>
            
            <div class="servers-grid">
                <div class="server-card">
                    <div class="server-type">{{ t('home.serverTypes.survival.type') }}</div>
                <h3 class="server-name">{{ t('home.serverTypes.survival.name') }}</h3>
                <p class="server-description">{{ t('home.serverTypes.survival.desc') }}</p>
                </div>
                
                <div class="server-card">
                    <div class="server-type">{{ t('home.serverTypes.creative.type') }}</div>
                <h3 class="server-name">{{ t('home.serverTypes.creative.name') }}</h3>
                <p class="server-description">{{ t('home.serverTypes.creative.desc') }}</p>
                </div>
            </div>
        </div>
    </section>

    <!-- 团队区域 -->
    <section class="team-section">
        <div class="team-container">
            <div class="section-header">
                <h2 class="section-title">{{ t('home.team.title') }}</h2>
                <p class="section-subtitle">{{ t('home.team.subtitle') }}</p>
            </div>
            
            <!-- 服务器核心管理层 -->
            <section class="team-subsection">
                <div class="subsection-header">
                    <h3 class="subsection-title">{{ t('home.team.management.title') }}</h3>
                    <p class="subsection-description">{{ t('home.team.management.subtitle') }}</p>
                </div>
                
                <div class="contributors-flex">
                    <article class="contributor-card">
                        <div class="contributor-layout">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=2506442080&s=0" alt="MrHua269" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">MrHua269</div>
                                <div class="contributor-role">{{ t('home.team.roles.owner') }}</div>
                                <a href="https://github.com/MrHua269" target="_blank" rel="noopener noreferrer" class="contributor-github-link">
                                    <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                    MrHua269
                                </a>
                            </div>
                        </div>
                    </article>
                    
                    <article class="contributor-card">
                        <div class="contributor-layout">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=1638465997&s=0" alt="NaT_Jerry" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">NaT_Jerry</div>
                                <div class="contributor-role">{{ t('home.team.roles.admin') }}</div>
                                <div class="contributor-links-wrapper">
                                    <a href="https://github.com/NatJerry" target="_blank" rel="noopener noreferrer" class="contributor-github-link">
                                    <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.287.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729.115.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                    NatJerry
                                </a>
                                <div class="contributor-links">
                                    <a href="https://qm.qq.com/q/6IjUhdaTRe" target="_blank" rel="noopener noreferrer">
                                        <i class="fa-brands fa-qq"></i>
                                    </a>
                                        <a href="mailto:xiaomajunqwq123@outlook.com">
                                            <i class="fas fa-envelope"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>
                    
                    <article class="contributor-card">
                        <div class="contributor-layout">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=3337913379&s=0" alt="Klop233" class="contributor-avatar" loading="lazy">
                            </div>
                           <div class="contributor-info">
                                <div class="contributor-name">Klop233</div>
                                <div class="contributor-role">{{ t('home.team.roles.admin') }}</div>
                                <a href="https://github.com/Klop233/" target="_blank" rel="noopener noreferrer" class="contributor-github-link">
                                    <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                    Klop233
                                </a>
                            </div>
                        </div>
                    </article>
                    
                    <article class="contributor-card">
                        <div class="contributor-layout">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=985526606&s=0" alt="IngilYing" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">IngilYing</div>
                                <div class="contributor-role">{{ t('home.team.roles.survivalAdmin') }}</div>
                                <a href="https://github.com/ingilying" target="_blank" rel="noopener noreferrer" class="contributor-github-link">
                                    <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                    ingilying
                                </a>
                            </div>
                        </div>
                    </article>
                    
                    
                    <article class="contributor-card">
                        <div class="contributor-layout">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=3466829709&s=0" alt="xiaomu18" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">xiaomu18</div>
                                <div class="contributor-role">{{ t('home.team.roles.creativeAdmin') }}</div>
                                <a href="https://github.com/xiaomu18/" target="_blank" rel="noopener noreferrer" class="contributor-github-link">
                                    <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                    xiaomu18
                                </a>
                            </div>
                        </div>
                    </article>
                </div>
            </section>
            
            <!-- 社区运营和开发团队 -->
            <section class="team-subsection">
                <div class="subsection-header">
                    <h3 class="subsection-title">{{ t('home.team.community.title') }}</h3>
                    <p class="subsection-description">{{ t('home.team.community.subtitle') }}</p>
                </div>
                
                <div class="contributors-flex">
                    <article class="contributor-card">
                        <div class="contributor-layout">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=1462355431&s=0" alt="Lonelyplanet_" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">Lonelyplanet_</div>
                                <div class="contributor-role">{{ t('home.team.roles.community') }}</div>
                            </div>
                        </div>
                    </article>
                    
                    <article class="contributor-card">
                        <div class="contributor-layout">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=1562869214&s=0" alt="LycaonW" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">LycaonW</div>
                                <div class="contributor-role">{{ t('home.team.roles.community') }}</div>
                            </div>
                        </div>
                    </article>
                    
                    <article class="contributor-card">
                        <div class="contributor-layout">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=1928325064&s=0" alt="Narcssu" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">Narcssu</div>
                                <div class="contributor-role">{{ t('home.team.roles.developer') }}</div>
                                <div class="contributor-links-wrapper">
                                    <a href="https://github.com/NARCSSU" target="_blank" rel="noopener noreferrer" class="contributor-github-link">
                                    <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                    NARCSSU
                                </a>
                                    <div class="contributor-links">
                                        <a href="mailto:goofygazer@gmail.com">
                                            <i class="fas fa-envelope"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>
                </div>
            </section>
        </div>
    </section>

</template>

<style scoped>
@import '../styles/desktop/home.css';
@import '../styles/mobile/home-mobile.css';
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const backgroundImages = [
    'https://imagehosting-ez2.pages.dev/avif/Image_1764466849.avif',
    'https://imagehosting-ez2.pages.dev/avif/Image_1764467382.avif',
    'https://imagehosting-ez2.pages.dev/avif/Image_1764468583.avif',
    'https://imagehosting-ez2.pages.dev/avif/Image_1764468914.avif',
    'https://imagehosting-ez2.pages.dev/avif/Image_1764392636.avif',
    'https://imagehosting-ez2.pages.dev/avif/Image_1764468731.avif',
    'https://imagehosting-ez2.pages.dev/avif/Image_1764465651.avif',
    'https://imagehosting-ez2.pages.dev/images/3cda066bccaefea3eb268d4ca10f018a.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_585018650004905.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_585012522922876.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_585000138805953.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_669234245588716.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_669226165759604.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_669218057352159.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_669214276923463.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_669203224465863.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_669202127295447.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_669192564244096.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_669027140045097.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_585061010780930.webp',
    'https://imagehosting-ez2.pages.dev/images/9ae17d2b-8fb3-4f05-8a75-48c40de55bd0.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_669276986426772.webp',
    'https://imagehosting-ez2.pages.dev/images/Image_669276986426772.webp',
];

const currentIndex = ref(0);
const currentImage1 = ref(backgroundImages[0]);
const currentImage2 = ref(backgroundImages[0]);
const activeLayer = ref(1);

const nextRandomImage = () => {
    if (backgroundImages.length <= 1) return;
    
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * backgroundImages.length);
    } while (newIndex === currentIndex.value);
    
    currentIndex.value = newIndex;
    
    const bg1 = document.getElementById('bg-slider-1');
    const bg2 = document.getElementById('bg-slider-2');
    
    if (activeLayer.value === 1) {
        if (bg2) {
            bg2.style.backgroundImage = `url(${backgroundImages[newIndex]})`;
            bg2.style.opacity = '1';
        }
        if (bg1) {
            bg1.style.opacity = '0';
        }
        activeLayer.value = 2;
    } else {
        if (bg1) {
            bg1.style.backgroundImage = `url(${backgroundImages[newIndex]})`;
            bg1.style.opacity = '1';
        }
        if (bg2) {
            bg2.style.opacity = '0';
        }
        activeLayer.value = 1;
    }
};

let intervalId: ReturnType<typeof setInterval> | null = null;

const serverOnline = ref(false);
const onlinePlayers = ref('加载中...');
const serverVersion = ref('1.21.7/8');
const serverStatus = ref(t('home.serverStatus.statusChecking'));

const fetchServerStatus = async () => {
    try {
        const response = await fetch('https://api.mcsrvstat.us/3/craft.luminolsuki.moe');
        if (response.ok) {
            const data = await response.json();
            serverOnline.value = data.online || false;
            onlinePlayers.value = data.online ? `${data.players?.online || 0}/${data.players?.max || 0}` : '0/0';
            serverVersion.value = data.version || '1.21.7/8';
            serverStatus.value = data.online ? '服务器在线' : '服务器离线';
        } else {
            throw new Error('API 请求失败');
        }
    } catch (error) {
        console.error('获取服务器状态失败:', error);
        serverOnline.value = false;
        onlinePlayers.value = 'N/A';
        serverStatus.value = '服务器离线';
    }
};

const updateStatusDisplay = () => {
    const statusDot = document.getElementById('server-status-dot');
    const statusText = document.getElementById('server-status-text');
    const playersElement = document.getElementById('online-players');
    const statusElement = document.getElementById('server-status');
    
    if (statusDot) {
        statusDot.className = `status-dot ${serverOnline.value ? 'online' : 'offline'}`;
    }
    
    if (statusText) {
        statusText.textContent = serverOnline.value ? '在线' : '离线';
    }
    
    if (playersElement) {
        playersElement.textContent = onlinePlayers.value;
    }
    
    if (statusElement) {
        statusElement.textContent = serverStatus.value;
    }
};

onMounted(async () => {
    intervalId = setInterval(nextRandomImage, 3600);
    
    await fetchServerStatus();
    await nextTick();
    updateStatusDisplay();
    
    setInterval(fetchServerStatus, 30000);
    setInterval(updateStatusDisplay, 30000);
});

onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
});
</script>