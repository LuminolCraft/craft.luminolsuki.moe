<template>
    <div ref="rootRef" class="home-root">
        <!-- 噪点叠加层 -->
        <div class="noise-overlay" aria-hidden="true"></div>

        <!-- 隐藏的 MotionPath 路径，供 .feature-icon 浮动使用 -->
        <svg class="icon-float-svg" width="0" height="0" aria-hidden="true">
            <path id="icon-float-path" d="M0,0 Q8,-10 16,0 T32,0" fill="none" />
        </svg>

        <!-- 顶部区域 -->
        <header class="hero-section">
            <div class="header-background" :class="{ 'fade-in': activeLayer === 1 }" :style="{ backgroundImage: `url(${currentImage1})`, opacity: activeLayer === 1 ? '1' : '0' }"></div>
            <div class="header-background" :style="{ backgroundImage: `url(${currentImage2})`, opacity: activeLayer === 2 ? '1' : '0' }"></div>
            <div class="hero-overlay" id="heroBg"></div>

            <div class="hero-content">
                <div class="hero-text">
                    <h1 class="hero-title">Luminol<br>Craft</h1>
                    <p class="hero-subtitle">{{ t('hero.subtitle') }}</p>
                    <p class="hero-description">{{ t('home.hero.description') }}</p>
                    <div class="hero-actions">
                        <a href="https://qm.qq.com/q/M29Eyniu8S" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                            <i class="fas fa-users"></i>
                            {{ t('common.joinGroup') }}
                        </a>
                    </div>
                </div>
                <div class="status-card status-card--float" id="statusCard">
                    <div class="status-header">
                        <div class="status-dot" :class="{ online: serverOnline, offline: !serverOnline }"></div>
                        <span class="status-label" :class="{ offline: !serverOnline }">{{ serverOnline ? '在线' : '离线' }}</span>
                    </div>
                    <div class="status-grid">
                        <div class="status-item"><div class="status-item-label">{{ t('home.serverStatus.playersLabel') }}</div><div class="status-item-value">{{ onlinePlayers }}</div></div>
                        <div class="status-item"><div class="status-item-label">{{ t('home.serverStatus.versionLabel') }}</div><div class="status-item-value">1.21.11</div></div>
                        <div class="status-item"><div class="status-item-label">{{ t('home.serverStatus.typeLabel') }}</div><div class="status-item-value">{{ t('home.serverStatus.typeValue') }}</div></div>
                        <div class="status-item"><div class="status-item-label">{{ t('home.serverStatus.statusLabel') }}</div><div class="status-item-value">{{ serverStatus }}</div></div>
                    </div>
                </div>
            </div>

            <!-- 滚动指示器 -->
            <div class="scroll-indicator">SCROLL ↓</div>
        </header>

        <!-- 特色区域 - Bento Grid -->
        <section class="features-section">
            <div class="features-container">
                <div class="section-header">
                    <h2 class="section-title">{{ t('home.features.title') }}</h2>
                    <p class="section-subtitle">{{ t('home.features.subtitle') }}</p>
                </div>

                <div class="features-grid">
                    <div class="feature-card feature-card--lg">
                        <div class="feature-icon feature-icon--square">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 448 512"><path fill="white" d="M338.8-9.9c11.9 8.6 16.3 24.2 10.9 37.8L271.3 224 416 224c13.5 0 25.5 8.4 30.1 21.1s.7 26.9-9.6 35.5l-288 240c-11.3 9.4-27.4 9.9-39.3 1.3s-16.3-24.2-10.9-37.8L176.7 288 32 288c-13.5 0-25.5-8.4-30.1-21.1s-.7-26.9 9.6-35.5l288-240c11.3-9.4 27.4-9.9 39.3-1.3z"/></svg>
                        </div>
                        <h3 class="feature-title">{{ t('home.features.responsive.title') }}</h3>
                        <p class="feature-description">{{ t('home.features.responsive.desc') }}</p>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon feature-icon--circle">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 384 512"><path fill="white" d="M16 64C16 28.7 44.7 0 80 0L304 0c35.3 0 64 28.7 64 64l0 384c0 35.3-28.7 64-64 64L80 512c-35.3 0-64-28.7-64-64L16 64zm64 0l0 304 224 0 0-304-224 0zM192 472c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32z"/></svg>
                        </div>
                        <h3 class="feature-title">{{ t('home.features.multiPlatform.title') }}</h3>
                        <p class="feature-description">{{ t('home.features.multiPlatform.desc') }}</p>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon feature-icon--circle">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="0 0 512 512"><path fill="white" d="M256 0c4.6 0 9.2 1 13.4 2.9L457.8 82.8c22 9.3 38.4 31 38.3 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0-172.4-82.5-213.1-264-213.6-363.2-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.9 1 251.4 0 256 0zm0 66.8l0 378.1c138-66.8 175.1-214.8 176-303.4l-176-74.6 0 0z"/></svg>
                        </div>
                        <h3 class="feature-title">{{ t('home.features.secureReliable.title') }}</h3>
                        <p class="feature-description">{{ t('home.features.secureReliable.desc') }}</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 服务器类型区域 - 左右对比 -->
        <section class="servers-section">
            <div class="servers-container">
                <div class="section-header">
                    <h2 class="section-title">{{ t('home.serverTypes.title') }}</h2>
                    <p class="section-subtitle">{{ t('home.serverTypes.subtitle') }}</p>
                </div>

                <div class="servers-grid">
                    <div class="server-card">
                        <span class="server-index">01</span>
                        <div class="server-type">{{ t('home.serverTypes.survival.type') }}</div>
                        <h3 class="server-name">{{ t('home.serverTypes.survival.name') }}</h3>
                        <p class="server-description">{{ t('home.serverTypes.survival.desc') }}</p>
                    </div>

                    <div class="servers-divider" aria-hidden="true"></div>

                    <div class="server-card">
                        <span class="server-index">02</span>
                        <div class="server-type">{{ t('home.serverTypes.creative.type') }}</div>
                        <h3 class="server-name">{{ t('home.serverTypes.creative.name') }}</h3>
                        <p class="server-description">{{ t('home.serverTypes.creative.desc') }}</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 团队区域 - Masonry / Polaroid -->
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
                                    <div class="contributor-role">{{ t('home.team.roles.survivalAdmin') }}</div>
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
                                    <img src="https://q1.qlogo.cn/g?b=qq&nk=3900217885&s=0" alt="婧婧" class="contributor-avatar" loading="lazy">
                                </div>
                                <div class="contributor-info">
                                    <div class="contributor-name">婧婧</div>
                                    <div class="contributor-role">{{ t('home.team.roles.admin') }}</div>
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
        <LastViewedPopup />
        <CookieConsentBanner />
    </div>
</template>

<style scoped>
@import '../styles/theme-colors.css';
@import '../styles/mobile/home-mobile.css';

/* ===== 根容器 / 噪点叠加 ===== */
.home-root {
    position: relative;
}

.noise-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    mix-blend-mode: overlay;
    opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.icon-float-svg {
    position: absolute;
    width: 0;
    height: 0;
    pointer-events: none;
}

/* ===== Hero 区域 ===== */
.hero-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
    background-color: transparent;
    background: linear-gradient(180deg,
        rgba(0, 0, 0, 0.3) 0%,
        rgba(0, 0, 0, 0.2) 70%,
        rgba(0, 0, 0, 0.1) 90%,
        transparent 100%);
}

.header-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0;
    transition: opacity 2s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: -2;
    will-change: transform, opacity;
}

.header-background.fade-in {
    opacity: 1;
}

.hero-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, rgba(11, 14, 23, 0.55) 0%, rgba(11, 14, 23, 0.7) 50%, rgba(11, 14, 23, 0.95) 100%), linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, transparent 50%);
    z-index: -1;
    pointer-events: none;
}

/* 单列左对齐 Hero 内容 */
.hero-content {
    position: relative;
    z-index: 2;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    padding: 0 40px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
}

.hero-text {
    max-width: 900px;
}

.hero-title {
    font-size: clamp(3rem, 10vw, 8rem);
    font-weight: 800;
    line-height: 0.95;
    letter-spacing: -0.04em;
    text-align: left;
    margin-bottom: 24px;
    background: linear-gradient(135deg, #f1f5f9 0%, #818cf8 50%, #22d3ee 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    will-change: transform, opacity;
}

.hero-subtitle {
    font-size: clamp(1.1rem, 2vw, 1.4rem);
    color: #aac2da;
    font-weight: 500;
    margin-bottom: 20px;
    max-width: 640px;
    will-change: transform, opacity;
}

.hero-description {
    font-size: 0.95rem;
    color: var(--text-primary);
    line-height: 1.8;
    max-width: 560px;
    margin-bottom: 32px;
    will-change: transform, opacity;
}

.hero-actions {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    will-change: transform, opacity;
}

.btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 28px;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    transition: transform 0.25s, box-shadow 0.25s, background 0.25s;
    cursor: pointer;
    border: none;
    font-family: var(--font-main);
    will-change: transform;
}

.btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
    color: white;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
}

.btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(158, 148, 216, 0.4);
}

/* 漂浮状态卡 */
.status-card {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 20px;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    position: relative;
    overflow: hidden;
    will-change: transform, opacity;
}

.status-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--bases-primary-gradient);
}

.status-card--float {
    position: absolute;
    right: 40px;
    bottom: 80px;
    width: 320px;
    transform: rotate(-2deg);
    z-index: 3;
}

.status-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
}

.status-label {
    font-size: 1.2rem;
    font-weight: 600;
    color: white;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.status-label.offline {
    color: var(--bases-error-color);
}

.status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.status-item {
    text-align: center;
}

.status-item-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 5px;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.status-item-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.status-dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    position: relative;
}

.status-dot::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 50%;
    z-index: -1;
}

.status-dot.online {
    background-color: var(--bases-online-dot);
}

.status-dot.online::before {
    background-color: var(--bases-online-dot);
}

.status-dot.offline {
    background-color: var(--bases-error-color);
}

.status-dot.offline::before {
    background-color: var(--bases-error-color);
}

/* 滚动指示器 */
.scroll-indicator {
    position: absolute;
    right: 48px;
    bottom: 24px;
    z-index: 3;
    font-size: 0.8rem;
    letter-spacing: 0.2em;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 600;
    will-change: transform, opacity;
}

/* ===== 特色区域 - Bento Grid ===== */
.features-section {
    padding: 100px 0;
    background-color: var(--background-color);
    position: relative;
}

.features-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg,
        transparent 0%,
        rgba(158, 148, 216, 1) 20%,
        rgba(158, 148, 216, 1) 50%,
        rgba(158, 148, 216, 1) 80%,
        transparent 100%);
    box-shadow:
        0 0 20px rgba(158, 148, 216, 0.8),
        0 0 40px rgba(158, 148, 216, 0.6),
        0 0 60px rgba(158, 148, 216, 0.4),
        0 0 80px rgba(158, 148, 216, 0.2);
    z-index: 10;
}

.features-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.section-header {
    text-align: center;
    margin-bottom: 60px;
    will-change: transform, opacity;
}

.section-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 1rem;
}

.section-subtitle {
    font-size: 1.2rem;
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
}

.features-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-template-rows: auto auto;
    gap: 0;
    border: 1px solid var(--glass-border);
    border-radius: 24px;
    overflow: hidden;
}

.feature-card {
    background: var(--card-bg);
    padding: 40px;
    border-right: 1px solid var(--glass-border);
    border-bottom: 1px solid var(--glass-border);
    position: relative;
    overflow: hidden;
    will-change: transform, opacity;
}

.feature-card:nth-child(1) {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), var(--card-bg));
}

.feature-card:nth-child(2) {
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.1), var(--card-bg));
}

.feature-card:nth-child(3) {
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), var(--card-bg));
    border-right: none;
}

.feature-card--lg {
    grid-column: 1 / 2;
    grid-row: 1 / 3;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.feature-card {
    border-radius: 16px;
}

.feature-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--bases-primary-gradient);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
}

.feature-card:hover::before {
    transform: scaleX(1);
}

.feature-icon {
    width: 80px;
    height: 80px;
    background: var(--bases-primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 2rem;
    color: white;
    will-change: transform;
}

.feature-icon--square {
    border-radius: 16px;
}

.feature-icon--circle {
    border-radius: 50%;
}

.feature-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 15px;
}

.feature-description {
    color: var(--text-secondary);
    line-height: 1.6;
}

/* ===== 服务器类型区域 - 左右对比 ===== */
.servers-section {
    padding: 100px 0;
    background: var(--background-color);
}

.servers-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.servers-grid {
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    gap: 0;
    margin-top: 60px;
    position: relative;
}

.servers-divider {
    background: linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.8) 50%, transparent 100%);
    box-shadow: 0 0 16px rgba(99, 102, 241, 0.6);
    width: 1px;
}

.server-card {
    background: var(--card-bg);
    border-radius: 20px;
    padding: 40px;
    border: 1px solid var(--glass-border);
    box-shadow: 0 15px 35px var(--shadow-color);
    position: relative;
    overflow: hidden;
    will-change: transform, opacity;
}

.server-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background: var(--primary-gradient);
}

.server-index {
    display: block;
    font-size: clamp(4rem, 12vw, 10rem);
    font-weight: 900;
    opacity: 0.08;
    line-height: 1;
    color: var(--text-color);
    margin-bottom: -0.2em;
    pointer-events: none;
}

.server-type {
    font-size: 0.9rem;
    color: var(--bases-primary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
}

.server-name {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 20px;
}

.server-description {
    color: var(--text-secondary);
    line-height: 1.7;
    font-size: 1.1rem;
}

/* ===== 团队区域 - Masonry / Polaroid ===== */
.team-section {
    padding: 100px 0;
    background: var(--background-color);
}

.team-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
}

.team-subsection {
    margin-bottom: 3rem;
}

.subsection-header {
    margin-bottom: 2rem;
    text-align: center;
}

.subsection-title {
    font-size: 1.5em;
    font-weight: 600;
    color: var(--primary-color);
    margin: 0 0 0.5rem 0;
}

.subsection-description {
    font-size: 1em;
    color: var(--text-secondary);
    margin: 0;
}

/* Masonry 布局 */
.contributors-flex {
    columns: 4;
    column-gap: 1.5rem;
    margin-top: 2rem;
}

.contributor-card {
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    background: var(--card-bg);
    padding: 1rem;
    width: 100%;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: inline-block;
    break-inside: avoid;
    margin-bottom: 1.5rem;
    will-change: transform, opacity;
}

.contributor-card:nth-child(3n + 1) {
    opacity: 0.85;
}

.contributor-card:nth-child(3n + 2) {
    opacity: 0.95;
}

.contributor-card:nth-child(3n + 3) {
    opacity: 1;
}

.contributor-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: var(--primary-color);
}

.contributor-layout {
    display: flex;
    flex-direction: row;
    gap: 1.2rem;
    align-items: flex-start;
}

.contributor-avatar-container {
    flex-shrink: 0;
    padding: 8px 8px 32px;
    background: white;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    will-change: transform;
}

.contributor-avatar {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
    border: 2px solid var(--glass-border);
    display: block;
}

.contributor-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    justify-content: space-between;
}

.contributor-links-wrapper {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-top: 0.5rem;
}

.contributor-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
    word-break: break-word;
}

.contributor-role {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-style: italic;
    margin: 0;
    line-height: 1.4;
}

.contributor-github-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--online-color);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 500;
    transition: color 0.3s ease;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.contributor-github-link:hover {
    color: var(--online-color);
    text-decoration: none;
}

.contributor-github-link .github-icon {
    flex-shrink: 0;
}

.github-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.contributor-links {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    margin-left: 0.8rem;
    vertical-align: middle;
}

.contributor-links a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 50%;
    color: var(--text-color);
    text-decoration: none;
    transition: all 0.3s ease;
    font-size: 1em;
    flex-shrink: 0;
}

.contributor-links a:hover {
    background: var(--primary-color);
    color: white;
    transform: scale(1.1);
}

/* ===== 响应式：移动端切换布局 ===== */
@media (max-width: 1024px) {
    .hero-title {
        font-size: clamp(2.5rem, 9vw, 5rem);
    }

    .status-card--float {
        right: 24px;
        bottom: 70px;
        width: 280px;
    }

    .contributors-flex {
        columns: 2;
    }
}

@media (max-width: 768px) {
    .hero-content {
        padding: 0 20px;
    }

    .hero-title {
        font-size: clamp(2.2rem, 12vw, 4rem);
    }

    .status-card--float {
        position: relative;
        right: auto;
        bottom: auto;
        width: 100%;
        margin-top: 32px;
        transform: rotate(-2deg);
    }

    .scroll-indicator {
        right: 24px;
        bottom: 16px;
    }

    /* Bento 退化为单列 */
    .features-grid {
        grid-template-columns: 1fr;
        grid-template-rows: auto;
    }

    .feature-card--lg {
        grid-column: 1 / 2;
        grid-row: auto;
    }

    .feature-card {
        border-right: none;
    }

    /* 服务器对比退化为单列，分隔线变横向 */
    .servers-grid {
        grid-template-columns: 1fr;
    }

    .servers-divider {
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.8) 50%, transparent 100%);
    }

    /* 团队退化为横向滚动轮播 */
    .contributors-flex {
        columns: auto;
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        column-gap: 0;
        gap: 1rem;
        padding-bottom: 1rem;
    }

    .contributor-card {
        scroll-snap-align: start;
        min-width: 280px;
        flex: 0 0 auto;
        margin-bottom: 0;
        display: flex;
    }

    .section-title {
        font-size: 2rem;
    }
}

@media (max-width: 480px) {
    .hero-title {
        font-size: clamp(2rem, 14vw, 3rem);
    }

    .status-card--float {
        padding: 16px;
    }

    .feature-card,
    .server-card {
        padding: 30px 20px;
    }

    .section-title {
        font-size: 1.8rem;
    }
}
</style>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import LastViewedPopup from '../components/LastViewedPopup.vue'
import CookieConsentBanner from '../components/CookieConsentBanner.vue'
import { useGsap } from '@/composables/useGsap'
import { EASINGS, STAGGERS, DURATIONS } from '@/gsap'

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)

const backgroundImages = [
  '/images/Image_1764466849.avif',
  '/images/Image_1764467382.avif',
  '/images/Image_1764468583.avif',
  '/images/Image_1764468914.avif',
  '/images/Image_1764392636.avif',
  '/images/Image_1764468731.avif',
  '/images/Image_1764465651.avif',
  '/images/3cda066bccaefea3eb268d4ca10f018a.webp',
  '/images/Image_585018650004905.webp',
  '/images/Image_585012522922876.webp',
  '/images/Image_585000138805953.webp',
  '/images/Image_669234245588716.webp',
  '/images/Image_669226165759604.webp',
  '/images/Image_669218057352159.webp',
  '/images/Image_669214276923463.webp',
  '/images/Image_669203224465863.webp',
  '/images/Image_669202127295447.webp',
  '/images/Image_669192564244096.webp',
  '/images/Image_669027140045097.webp',
  '/images/Image_585061010780930.webp',
  '/images/9ae17d2b-8fb3-4f05-8a75-48c40de55bd0.webp',
  '/images/Image_669276986426772.webp',
]

const currentIndex = ref(0)
const currentImage1 = ref(backgroundImages[0])
const currentImage2 = ref(backgroundImages[0])
const activeLayer = ref(1)

const nextRandomImage = () => {
  if (backgroundImages.length <= 1) return
  let newIndex: number
  do {
    newIndex = Math.floor(Math.random() * backgroundImages.length)
  } while (newIndex === currentIndex.value)
  currentIndex.value = newIndex
  if (activeLayer.value === 1) {
    currentImage2.value = backgroundImages[newIndex]
    activeLayer.value = 2
  } else {
    currentImage1.value = backgroundImages[newIndex]
    activeLayer.value = 1
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null

const serverOnline = ref(true)
const onlinePlayers = ref('加载中...')
const serverStatus = ref('服务器在线')

const fetchServerStatus = async () => {
  try {
    const response = await fetch('https://api.mcsrvstat.us/3/craft.luminolsuki.moe')
    if (response.ok) {
      const data = await response.json()
      serverOnline.value = data.online || false
      onlinePlayers.value = data.online ? `${data.players?.online || 0}/${data.players?.max || 0}` : '0/0'
      serverStatus.value = data.online ? '服务器在线' : '服务器离线'
    } else {
      throw new Error('API 请求失败')
    }
  } catch {
    serverOnline.value = false
    onlinePlayers.value = 'N/A'
    serverStatus.value = '服务器离线'
  }
}

const { create } = useGsap({ scope: rootRef })

onMounted(async () => {
  intervalId = setInterval(nextRandomImage, 3600)

  await fetchServerStatus()
  setInterval(fetchServerStatus, 30000)

  await nextTick()

  create((g) => {
    const mm = g.matchMedia()

    // 延迟刷新确保 DOM 就绪
    requestAnimationFrame(() => ScrollTrigger.refresh())

    // ============ reduceMotion: 仅设置终态，不播放动画 ============
    mm.add('(prefers-reduced-motion: reduce)', () => {
      g.set('.hero-title, .hero-subtitle, .hero-description, .hero-actions', { autoAlpha: 1, y: 0 })
      g.set('.status-card--float', { autoAlpha: 1, y: 0, rotation: -2 })
      g.set('.feature-card, .server-card, .contributor-card, .section-header', { autoAlpha: 1, y: 0, scale: 1 })
      g.set('.contributor-avatar-container', { rotation: 0 })
      g.set('.scroll-indicator', { autoAlpha: 0 })
    })

    // ============ no-preference: 全部动画 ============
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // 1. Hero 标题 SplitText (chars + words)
      const titleSplit = new SplitText('.hero-title', { type: 'chars,words' })

      // 2. Hero 副标题 SplitText (lines)
      const subtitleSplit = new SplitText('.hero-subtitle', { type: 'lines' })

      // 初始隐藏，防止 FOUC
      g.set('.hero-description', { autoAlpha: 0, y: 20 })
      g.set('.hero-actions', { autoAlpha: 0, y: 20 })
      g.set('.status-card--float', { autoAlpha: 0, y: 40, rotation: -8 })
      g.set('.feature-card', { autoAlpha: 0, y: 60 })
      g.set('.server-card', { autoAlpha: 0, y: 50 })
      g.set('.contributor-card', { autoAlpha: 0, y: 40, scale: 0.9 })
      g.set('.section-header', { autoAlpha: 0, y: 30 })
      g.set('.scroll-indicator', { autoAlpha: 1 })

      const heroTl = g.timeline()

      heroTl
        .from(titleSplit.chars, {
          yPercent: 120,
          autoAlpha: 0,
          rotateZ: 8,
          stagger: g.utils.distribute({ from: 'center', amount: 0.6 }),
          duration: DURATIONS.slow,
          ease: EASINGS.heroReveal,
        })
        .from(subtitleSplit.lines, {
          yPercent: 100,
          autoAlpha: 0,
          duration: DURATIONS.standard,
          ease: EASINGS.entrance,
          stagger: 0.1,
        }, '-=0.4')
        .to('.hero-description', {
          autoAlpha: 1,
          y: 0,
          duration: DURATIONS.entrance,
          ease: EASINGS.entrance,
        }, '-=0.3')
        .to('.hero-actions', {
          autoAlpha: 1,
          y: 0,
          duration: DURATIONS.entrance,
          ease: EASINGS.entrance,
        }, '-=0.3')
        // 5. 状态卡入场
        .to('.status-card--float', {
          autoAlpha: 1,
          y: 0,
          rotation: -2,
          duration: DURATIONS.slow,
          ease: EASINGS.heroReveal,
        }, '-=0.4')

      // 3. 背景视差滚动
      g.to('.header-background', {
        yPercent: 30,
        scale: 1.1,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // 4. SCROLL ↓ 指示器：持续浮动 + 滚动淡出
      g.to('.scroll-indicator', {
        y: 8,
        duration: 1.4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      })
      g.to('.scroll-indicator', {
        autoAlpha: 0,
        duration: 0.4,
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: '+=200',
          scrub: true,
        },
      })

      // 6. Features 批量入场
      ScrollTrigger.batch('.feature-card', {
        start: 'top 85%',
        batchMax: () => (window.innerWidth < 768 ? 2 : 4),
        onEnter: (batch) => g.to(batch, {
          autoAlpha: 1,
          y: 0,
          stagger: STAGGERS.cards,
          duration: DURATIONS.scrollReveal,
          ease: EASINGS.entrance,
          overwrite: true,
        }),
        onLeaveBack: (batch) => g.set(batch, { autoAlpha: 0, y: 60 }),
      })

      // 7. Feature 图标 MotionPath 浮动
      g.to('.feature-icon', {
        motionPath: {
          path: '#icon-float-path',
          align: 'self',
          alignOrigin: [0.5, 0.5],
        },
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      // 8. 服务器卡片入场 + 鼠标对比
      g.to('.server-card', {
        autoAlpha: 1,
        y: 0,
        stagger: 0.15,
        duration: DURATIONS.scrollReveal,
        ease: EASINGS.entrance,
        scrollTrigger: {
          trigger: '.servers-grid',
          start: 'top 85%',
          once: true,
        },
      })

      const grid = rootRef.value?.querySelector('.servers-grid') as HTMLElement | null
      const serverCards = grid ? Array.from(grid.querySelectorAll<HTMLElement>('.server-card')) : []
      const leftCard = serverCards[0] ?? null
      const rightCard = serverCards[1] ?? null

      const onMove = (e: MouseEvent) => {
        if (!grid) return
        const rect = grid.getBoundingClientRect()
        const x = e.clientX - rect.left
        const scaleLeft = g.utils.mapRange(0, rect.width, 1, 0.92, x)
        const scaleRight = g.utils.mapRange(0, rect.width, 0.92, 1, x)
        if (leftCard) g.to(leftCard, { scale: scaleLeft, duration: DURATIONS.standard, ease: EASINGS.smooth, overwrite: 'auto' })
        if (rightCard) g.to(rightCard, { scale: scaleRight, duration: DURATIONS.standard, ease: EASINGS.smooth, overwrite: 'auto' })
      }
      const onLeave = () => {
        if (leftCard) g.to(leftCard, { scale: 1, duration: DURATIONS.standard, ease: EASINGS.smooth, overwrite: 'auto' })
        if (rightCard) g.to(rightCard, { scale: 1, duration: DURATIONS.standard, ease: EASINGS.smooth, overwrite: 'auto' })
      }
      if (grid) {
        grid.addEventListener('mousemove', onMove)
        grid.addEventListener('mouseleave', onLeave)
      }

      // 9. Team polaroid 随机旋转
      g.set('.contributor-avatar-container', {
        rotation: () => g.utils.random(-3, 3),
      })

      // 10. Team 卡片批量入场
      ScrollTrigger.batch('.contributor-card', {
        start: 'top 85%',
        batchMax: 4,
        onEnter: (batch) => g.to(batch, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          stagger: 0.08,
          duration: DURATIONS.entrance,
          ease: EASINGS.entrance,
          overwrite: true,
        }),
        onLeaveBack: (batch) => g.set(batch, { autoAlpha: 1, y: 0, scale: 1 }),
      })

      // Section headers 入场
      g.utils.toArray<HTMLElement>('.section-header').forEach((header) => {
        g.to(header, {
          autoAlpha: 1,
          y: 0,
          duration: DURATIONS.entrance,
          ease: EASINGS.entrance,
          scrollTrigger: {
            trigger: header,
            start: 'top 85%',
            once: true,
          },
        })
      })

      // 清理鼠标监听
      return () => {
        if (grid) {
          grid.removeEventListener('mousemove', onMove)
          grid.removeEventListener('mouseleave', onLeave)
        }
      }
    })
  })
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>
