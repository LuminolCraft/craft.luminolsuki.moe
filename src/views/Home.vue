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

        <!-- 服务器类型区域 - 对角分割 + Scroll-Pinned 切换 -->
        <section class="servers-section">
            <div class="servers-container">
                <div class="section-header">
                    <h2 class="section-title">{{ t('home.serverTypes.title') }}</h2>
                    <p class="section-subtitle">{{ t('home.serverTypes.subtitle') }}</p>
                </div>

                <div class="servers-grid">
                    <div class="server-panel">
                        <span class="server-index">01</span>
                        <div class="server-type">{{ t('home.serverTypes.survival.type') }}</div>
                        <h3 class="server-name">{{ t('home.serverTypes.survival.name') }}</h3>
                        <p class="server-description">{{ t('home.serverTypes.survival.desc') }}</p>
                    </div>

                    <div class="server-panel">
                        <span class="server-index">02</span>
                        <div class="server-type">{{ t('home.serverTypes.creative.type') }}</div>
                        <h3 class="server-name">{{ t('home.serverTypes.creative.name') }}</h3>
                        <p class="server-description">{{ t('home.serverTypes.creative.desc') }}</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 团队区域 - Kinetic Typography + Spotlight + Bento + Inertia Parallax -->
        <section class="team-section">
            <div class="team-container">
                <div class="section-header">
                    <h2 class="section-title">{{ t('home.team.title') }}</h2>
                    <p class="section-subtitle">{{ t('home.team.subtitle') }}</p>
                </div>

                <!-- 服务器管理组（唯一分组） -->
                <div class="team-subsection">
                    <div class="subsection-header">
                        <h3 class="subsection-title">{{ t('home.team.management.title') }}</h3>
                        <p class="subsection-description">{{ t('home.team.management.subtitle') }}</p>
                    </div>

                    <div class="team-grid">
                        <!-- MrHua269 (Owner, 2x2 大格) -->
                        <article class="contributor-card contributor-card--owner">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=2506442080&s=0" alt="MrHua269" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">MrHua269</div>
                                <div class="contributor-role">{{ t('home.team.roles.owner') }}</div>
                                <div class="contributor-links-wrapper">
                                    <a href="https://github.com/MrHua269" target="_blank" rel="noopener noreferrer" class="contributor-github-link">
                                        <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                        </svg>
                                        MrHua269
                                    </a>
                                </div>
                            </div>
                        </article>

                        <!-- NaT_Jerry -->
                        <article class="contributor-card">
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
                        </article>

                        <!-- Klop233 -->
                        <article class="contributor-card">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=3337913379&s=0" alt="Klop233" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">Klop233</div>
                                <div class="contributor-role">{{ t('home.team.roles.admin') }}</div>
                                <div class="contributor-links-wrapper">
                                    <a href="https://github.com/Klop233/" target="_blank" rel="noopener noreferrer" class="contributor-github-link">
                                        <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                        </svg>
                                        Klop233
                                    </a>
                                </div>
                            </div>
                        </article>

                        <!-- IngilYing -->
                        <article class="contributor-card">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=985526606&s=0" alt="IngilYing" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">IngilYing</div>
                                <div class="contributor-role">{{ t('home.team.roles.survivalAdmin') }}</div>
                                <div class="contributor-links-wrapper">
                                    <a href="https://github.com/ingilying" target="_blank" rel="noopener noreferrer" class="contributor-github-link">
                                        <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                        </svg>
                                        ingilying
                                    </a>
                                </div>
                            </div>
                        </article>

                        <!-- xiaomu18 -->
                        <article class="contributor-card">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=3466829709&s=0" alt="xiaomu18" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">xiaomu18</div>
                                <div class="contributor-role">{{ t('home.team.roles.creativeAdmin') }}</div>
                                <div class="contributor-links-wrapper">
                                    <a href="https://github.com/xiaomu18/" target="_blank" rel="noopener noreferrer" class="contributor-github-link">
                                        <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                        </svg>
                                        xiaomu18
                                    </a>
                                </div>
                            </div>
                        </article>

                        <!-- Narcssu (moved from community to management, new role: serverAdmin) -->
                        <article class="contributor-card">
                            <div class="contributor-avatar-container">
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=1928325064&s=0" alt="Narcssu" class="contributor-avatar" loading="lazy">
                            </div>
                            <div class="contributor-info">
                                <div class="contributor-name">Narcssu</div>
                                <div class="contributor-role">{{ t('home.team.roles.serverAdmin') }}</div>
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
                        </article>
                    </div>
                </div>
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

/* hero → features 渐变混合过渡层（ScrollTrigger 驱动 --reveal-size 0 → 120px） */
.hero-section::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: var(--reveal-size, 0px);
    background: linear-gradient(to bottom, transparent, var(--background-color));
    pointer-events: none;
    z-index: 1;
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

/* ===== 特色区域 - 不规则 Bento + Spotlight + 3D Tilt ===== */
.features-section {
    padding: 100px 0;
    background-color: var(--background-color);
    position: relative;
    --cursor-x: 50%;
    --cursor-y: 50%;
    contain: layout style;
}

/* Section-level spotlight cursor */
.features-section::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background: radial-gradient(
        circle 300px at var(--cursor-x) var(--cursor-y),
        rgba(99, 102, 241, 0.08),
        transparent 70%
    );
}

.features-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    position: relative;
    z-index: 1;
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

/* 不规则 Bento Grid */
.features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, minmax(200px, auto));
    grid-template-areas:
        "responsive responsive multiplatform"
        "responsive responsive secure";
    gap: 1.5rem;
    perspective: 1000px;
}

.feature-card:nth-child(1) { grid-area: responsive; }
.feature-card:nth-child(2) { grid-area: multiplatform; }
.feature-card:nth-child(3) { grid-area: secure; }

.feature-card {
    --card-x: 50%;
    --card-y: 50%;
    position: relative;
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    background: var(--card-bg);
    padding: 32px;
    overflow: hidden;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 10px 30px var(--shadow-color);
    transform-style: preserve-3d;
    will-change: transform, opacity;
    contain: layout style paint;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:nth-child(1) {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), var(--card-bg));
}

.feature-card:nth-child(2) {
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.1), var(--card-bg));
}

.feature-card:nth-child(3) {
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), var(--card-bg));
}

/* 局部 spotlight 高光层 */
.feature-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    pointer-events: none;
    z-index: 1;
    background: radial-gradient(
        circle 200px at var(--card-x) var(--card-y),
        rgba(99, 102, 241, 0.15),
        transparent 70%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
}

.feature-card:hover::before { opacity: 1; }

@media (pointer: coarse) {
    .feature-card::before { display: none; }
}

/* 大卡片特殊样式（保留 .feature-card--lg 用于 flex 布局与图标尺寸） */
.feature-card--lg {
    display: flex;
    flex-direction: column;
    justify-content: center;
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
    transform-style: preserve-3d;
    position: relative;
    z-index: 2;
}

.feature-card--lg .feature-icon {
    width: 96px;
    height: 96px;
}

.feature-icon--square {
    border-radius: 16px;
}

.feature-icon--circle {
    border-radius: 50%;
}

/* Kinetic Typography */
.feature-title {
    font-size: clamp(1.5rem, 2.5vw, 2rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--text-color) 0%, var(--primary-color) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 15px;
    line-height: 1.1;
    contain: layout style paint;
    position: relative;
    z-index: 2;
}

/* View Transitions 期间纯色兜底（避免 background-clip:text 闪烁） */
:root[data-vt] .feature-title {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.feature-card--lg .feature-title {
    font-size: clamp(2rem, 4vw, 2.8rem);
}

.feature-description {
    color: var(--text-secondary);
    line-height: 1.6;
    position: relative;
    z-index: 2;
}

/* ===== 服务器类型区域 - 可扩展 Bento ===== */
.servers-section {
    padding: 100px 0;
    background: var(--background-color);
    position: relative;
}

.servers-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
}

.servers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 60px;
}

.server-panel {
    position: relative;
    padding: 40px;
    background: var(--card-bg);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    box-shadow: 0 10px 30px var(--shadow-color);
    overflow: hidden;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    will-change: transform, opacity;
    transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

/* 第一张卡片渐变背景（保留原设计语言） */
.server-panel:nth-child(1) {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), var(--card-bg) 60%);
}

.server-panel:nth-child(2) {
    background: linear-gradient(225deg, rgba(168, 85, 247, 0.12), var(--card-bg) 60%);
}

/* 第三张及以后（未来扩展用） */
.server-panel:nth-child(3) {
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.12), var(--card-bg) 60%);
}

.server-panel:nth-child(4) {
    background: linear-gradient(225deg, rgba(245, 158, 11, 0.12), var(--card-bg) 60%);
}

/* hover：scale + border 高亮 + box-shadow 增强 */
.server-panel:hover {
    transform: scale(1.03);
    border-color: var(--primary-color);
    box-shadow: 0 15px 40px var(--shadow-hover);
}

/* hover 时编号变亮 */
.server-panel:hover .server-index {
    opacity: 0.35;
}

@media (pointer: coarse) {
    .server-panel:hover {
        transform: none;
    }
}

/* Kinetic Typography 大号编号 */
.server-index {
    display: block;
    font-size: clamp(4rem, 12vw, 10rem);
    font-weight: 900;
    line-height: 1;
    margin-bottom: -0.2em;
    pointer-events: none;
    background: linear-gradient(135deg, var(--text-color) 0%, var(--primary-color) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    opacity: 0.15;
    transition: opacity 0.3s ease;
    contain: layout style paint;
}

/* View Transitions 期间纯色兜底（避免 background-clip:text 闪烁） */
:root[data-vt] .server-index {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.server-type {
    font-size: 0.9rem;
    color: var(--bases-primary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
    position: relative;
    z-index: 2;
}

.server-name {
    font-size: clamp(1.8rem, 3vw, 2.5rem);
    font-weight: 800;
    color: var(--text-color);
    margin-bottom: 20px;
    letter-spacing: -0.02em;
    position: relative;
    z-index: 2;
}

.server-description {
    color: var(--text-secondary);
    line-height: 1.7;
    font-size: 1.1rem;
    position: relative;
    z-index: 2;
}

/* ===== 团队区域 - Kinetic Typography + Spotlight + Bento + Inertia Parallax ===== */
.team-section {
    --cursor-x: 50%;
    --cursor-y: 50%;
    position: relative;
    padding: 100px 0;
    background: var(--background-color);
    overflow: hidden;
}

/* Section-level spotlight cursor 高光层 */
.team-section::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    background: radial-gradient(
        circle 300px at var(--cursor-x) var(--cursor-y),
        rgba(99, 102, 241, 0.12),
        transparent 70%
    );
    opacity: 0;
    transition: opacity 0.4s ease;
}

.team-section:hover::after { opacity: 1; }

@media (pointer: coarse) {
    .team-section::after { display: none; }
}

.team-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
    position: relative;
    z-index: 2;
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

/* Asymmetric Bento Grid + 3D Tilt 支撑 */
.team-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(3, minmax(160px, auto));
    grid-template-areas:
        "owner owner nat   klop"
        "owner owner nat   ingil"
        "xiaomu xiaomu nar  nar";
    gap: 1.5rem;
    margin-top: 2rem;
    perspective: 1000px;
}

.contributor-card:nth-child(1) { grid-area: owner; }
.contributor-card:nth-child(2) { grid-area: nat; }
.contributor-card:nth-child(3) { grid-area: klop; }
.contributor-card:nth-child(4) { grid-area: ingil; }
.contributor-card:nth-child(5) { grid-area: xiaomu; }
.contributor-card:nth-child(6) { grid-area: nar; }

.contributor-card {
    --card-x: 50%;
    --card-y: 50%;
    --border-angle: 0deg;
    --avatar-glow-x: 50%;
    --avatar-glow-y: 50%;
    position: relative;
    border: 2px solid transparent;
    border-radius: 16px;
    background:
        linear-gradient(var(--card-bg), var(--card-bg)) padding-box,
        conic-gradient(from var(--border-angle), var(--primary-color), transparent 30%, var(--primary-color)) border-box;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    will-change: transform;
    transform-style: preserve-3d;
    transition: border-color 0.3s ease;
}

/* 卡片局部 spotlight 高光层 */
.contributor-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    pointer-events: none;
    z-index: 1;
    background: radial-gradient(
        circle 200px at var(--card-x) var(--card-y),
        rgba(99, 102, 241, 0.15),
        transparent 70%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
}

.contributor-card:hover::before { opacity: 1; }

@media (pointer: coarse) {
    .contributor-card::before { display: none; }
}

/* 卡片布局 */
.contributor-avatar-container {
    position: relative;
    flex-shrink: 0;
    padding: 4px;
}

/* 头像光晕层 */
.contributor-avatar-container::after {
    content: '';
    position: absolute;
    inset: -20px;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(
        circle 60px at var(--avatar-glow-x) var(--avatar-glow-y),
        rgba(99, 102, 241, 0.3),
        transparent 70%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
}

.contributor-card:hover .contributor-avatar-container::after { opacity: 1; }

@media (pointer: coarse) {
    .contributor-avatar-container::after { display: none; }
}

.contributor-avatar {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    object-fit: cover;
    border: 2px solid var(--glass-border);
    display: block;
    position: relative;
    z-index: 2;
}

.contributor-card--owner .contributor-avatar {
    width: 80px;
    height: 80px;
    border-radius: 16px;
}

.contributor-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    position: relative;
    z-index: 2;
}

.contributor-links-wrapper {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-top: 0.5rem;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.3s ease, transform 0.3s ease;
}

/* Owner 卡片链接默认可见 */
.contributor-card--owner .contributor-links-wrapper {
    opacity: 1;
    transform: translateY(0);
}

/* 非 Owner 卡片 hover 时显示链接 */
.contributor-card:not(.contributor-card--owner):hover .contributor-links-wrapper {
    opacity: 1;
    transform: translateY(0);
}

/* Kinetic Typography */
.contributor-name {
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, var(--text-color) 0%, var(--primary-color) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    line-height: 1;
    word-break: break-word;
    contain: layout style paint;
}

/* View Transitions 期间纯色兜底（避免 background-clip:text 闪烁） */
:root[data-vt] .contributor-name {
    color: var(--text-color);
    background: none;
    -webkit-background-clip: initial;
    background-clip: initial;
}

.contributor-card--owner .contributor-name {
    font-size: clamp(2.5rem, 5vw, 4rem);
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
    will-change: transform;
}

.contributor-github-link:hover {
    color: var(--online-color);
    text-decoration: none;
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
    width: 32px;
    height: 32px;
    will-change: transform;
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

    .team-grid {
        grid-template-columns: repeat(2, 1fr);
        grid-template-areas:
            "owner owner"
            "nat klop"
            "ingil nar"
            "xiaomu xiaomu";
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
        grid-template-areas: none;
    }

    .feature-card,
    .feature-card:nth-child(n) {
        grid-area: auto;
    }

    /* 服务器网格退化为单列 */
    .servers-grid {
        grid-template-columns: 1fr;
    }

    .server-panel {
        padding: 40px 30px;
    }

    .server-description {
        max-width: 100%;
    }

    /* 团队退化为单列 */
    .team-grid {
        grid-template-columns: 1fr;
        grid-template-areas: none;
    }

    .contributor-card,
    .contributor-card:nth-child(n) {
        grid-area: auto;
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
    .server-panel {
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
      g.set('.feature-card, .server-panel, .contributor-card, .section-header', { autoAlpha: 1, y: 0, scale: 1 })
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
      g.set('.server-panel', { autoAlpha: 0, y: 50 })
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

      // 6. hero → features 渐变混合过渡层（::after height 通过 --reveal-size 驱动）
      g.fromTo('.hero-section', { '--reveal-size': '0px' } as gsap.TweenVars, {
        '--reveal-size': '120px',
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'bottom 80%',
          end: 'bottom 20%',
          scrub: true,
        },
      } as gsap.TweenVars)

      // 7. Features 入场 timeline：大卡片先入场 + 小卡片 stagger 跟进 + 入场后启动图标浮动
      const iconFloat = g.to('.feature-icon', {
        motionPath: {
          path: '#icon-float-path',
          align: 'self',
          alignOrigin: [0.5, 0.5],
        },
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        paused: true,
      })

      const featuresTl = g.timeline({
        scrollTrigger: {
          trigger: '.features-grid',
          start: 'top 75%',
          once: true,
        },
        defaults: { ease: EASINGS.entrance, duration: DURATIONS.scrollReveal },
      })
      featuresTl
        .to('.feature-card:nth-child(1)', { autoAlpha: 1, y: 0 })
        .to('.feature-card:not(:nth-child(1))', { autoAlpha: 1, y: 0, stagger: STAGGERS.cards }, '-=0.2')
        .add(() => { iconFloat.play() })

      // 8. 服务器面板入场
      g.to('.server-panel', {
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

      // 9. servers-section Scroll-Pinned 切换 + features spotlight + features 3D tilt（matchMedia: 桌面 + 非 reduceMotion）
      const interactionMm = g.matchMedia()
      interactionMm.add({
        isDesktop: '(min-width: 769px) and (pointer: fine)',
        reduceMotion: '(prefers-reduced-motion: reduce)',
      }, (context) => {
        const { isDesktop, reduceMotion } = context.conditions!
        if (!isDesktop || reduceMotion) return

        // 9.1 servers-section 不再 pin，改为入场 stagger（已在第 8 节定义）+ hover 切换（CSS 实现）

        // 9.2 features-section spotlight cursor 跟随
        const featuresSection = g.utils.toArray<HTMLElement>('.features-section')[0]
        const setFeatureCursorX = featuresSection ? (g.quickTo(featuresSection, '--cursor-x', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)) : null
        const setFeatureCursorY = featuresSection ? (g.quickTo(featuresSection, '--cursor-y', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)) : null
        const onFeaturesMove = (e: MouseEvent) => {
          if (!featuresSection) return
          const rect = featuresSection.getBoundingClientRect()
          setFeatureCursorX?.(`${e.clientX - rect.left}px`)
          setFeatureCursorY?.(`${e.clientY - rect.top}px`)
        }
        if (featuresSection) {
          featuresSection.addEventListener('mousemove', onFeaturesMove)
        }

        // 9.3 feature-card 3D tilt + 局部 spotlight 变量（tilt ±6°）
        const featureCleanups: Array<() => void> = []
        const setupFeatureCardInteractions = (card: HTMLElement) => {
          const setRotateX = g.quickTo(card, 'rotationX', { duration: 0.3, ease: 'power2.out' })
          const setRotateY = g.quickTo(card, 'rotationY', { duration: 0.3, ease: 'power2.out' })
          const setCardX = g.quickTo(card, '--card-x', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
          const setCardY = g.quickTo(card, '--card-y', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)

          const onCardMove = (e: MouseEvent) => {
            const rect = card.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            const cx = rect.width / 2
            const cy = rect.height / 2
            const rotY = ((x - cx) / cx) * 6
            const rotX = -((y - cy) / cy) * 6
            setRotateX(rotX)
            setRotateY(rotY)
            setCardX(`${x}px`)
            setCardY(`${y}px`)
          }
          const onCardLeave = () => {
            setRotateX(0)
            setRotateY(0)
          }
          card.addEventListener('mousemove', onCardMove)
          card.addEventListener('mouseleave', onCardLeave)
          return () => {
            card.removeEventListener('mousemove', onCardMove)
            card.removeEventListener('mouseleave', onCardLeave)
          }
        }
        g.utils.toArray<HTMLElement>('.feature-card').forEach((card) => {
          featureCleanups.push(setupFeatureCardInteractions(card))
        })

        return () => {
          if (featuresSection) {
            featuresSection.removeEventListener('mousemove', onFeaturesMove)
          }
          featureCleanups.forEach(cleanup => cleanup())
          featureCleanups.length = 0
          iconFloat.pause()
        }
      })

      // 9. Section-level spotlight cursor 跟随（gsap-utils: quickTo 避免高频 mousemove 创建新 tween）
      const teamSection = g.utils.toArray<HTMLElement>('.team-section')[0]
      const setCursorX = teamSection ? (g.quickTo(teamSection, '--cursor-x', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)) : null
      const setCursorY = teamSection ? (g.quickTo(teamSection, '--cursor-y', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)) : null
      const onTeamMove = (e: MouseEvent) => {
        if (!teamSection) return
        const rect = teamSection.getBoundingClientRect()
        setCursorX?.(`${e.clientX - rect.left}px`)
        setCursorY?.(`${e.clientY - rect.top}px`)
      }
      if (teamSection) {
        teamSection.addEventListener('mousemove', onTeamMove)
      }

      // 10. Scroll-Linked 惯性视差（gsap-scrolltrigger: scrub 1s 产生惯性感）
      g.utils.toArray<HTMLElement>('.contributor-card').forEach((card) => {
        const depth = card.classList.contains('contributor-card--owner') ? 5 : 15
        g.to(card, {
          yPercent: -depth,
          ease: 'none',
          scrollTrigger: {
            trigger: '.team-section',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        })
      })

      // 11. Owner 卡片先入场，其他成员 stagger 跟进（gsap-timeline: 位置参数）
      const teamTl = g.timeline({
        scrollTrigger: {
          trigger: '.team-section',
          start: 'top 70%',
          once: true,
        },
        defaults: { ease: EASINGS.entrance, duration: DURATIONS.entrance },
      })
      teamTl.fromTo('.contributor-card--owner',
        { autoAlpha: 0, y: 30, scale: 0.95 },
        { autoAlpha: 1, y: 0, scale: 1 }
      )
      .fromTo('.contributor-card:not(.contributor-card--owner)',
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, stagger: 0.08 },
        '+=0.1'
      )

      // 12. 卡片多交互效果（3D Tilt + 局部 spotlight + name 视差 + 头像 glow + border-angle + magnetic links）
      const setupCardInteractions = (card: HTMLElement) => {
        const isOwner = card.classList.contains('contributor-card--owner')
        const nameEl = card.querySelector<HTMLElement>('.contributor-name')
        const links = card.querySelectorAll<HTMLElement>('.contributor-github-link, .contributor-links a')
        const linksWrapper = card.querySelector<HTMLElement>('.contributor-links-wrapper')

        // quickTo setters
        const setRotateX = g.quickTo(card, 'rotationX', { duration: 0.3, ease: 'power2.out' })
        const setRotateY = g.quickTo(card, 'rotationY', { duration: 0.3, ease: 'power2.out' })
        const setCardX = g.quickTo(card, '--card-x', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
        const setCardY = g.quickTo(card, '--card-y', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
        const setBorderAngle = g.quickTo(card, '--border-angle', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
        const setAvatarGlowX = g.quickTo(card, '--avatar-glow-x', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
        const setAvatarGlowY = g.quickTo(card, '--avatar-glow-y', { duration: 0.3, ease: 'power2.out' }) as unknown as ((value: string) => void)
        const setNameX = nameEl ? g.quickTo(nameEl, 'x', { duration: 0.3, ease: 'power2.out' }) : null
        const setNameY = nameEl ? g.quickTo(nameEl, 'y', { duration: 0.3, ease: 'power2.out' }) : null
        const linkSetters = Array.from(links).map(link => ({
          el: link,
          setX: g.quickTo(link, 'x', { duration: 0.3, ease: 'power2.out' }),
          setY: g.quickTo(link, 'y', { duration: 0.3, ease: 'power2.out' }),
        }))

        const onCardMove = (e: MouseEvent) => {
          const rect = card.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const cx = rect.width / 2
          const cy = rect.height / 2
          // 3D Tilt（最大 ±8°）
          const rotY = ((x - cx) / cx) * 8
          const rotX = -((y - cy) / cy) * 8
          setRotateX(rotX)
          setRotateY(rotY)
          // 局部 spotlight 变量
          setCardX(`${x}px`)
          setCardY(`${y}px`)
          // border-angle（基于鼠标在卡片内的角度，0-360°）
          const angle = (Math.atan2(y - cy, x - cx) * 180 / Math.PI + 360) % 360
          setBorderAngle(`${angle}deg`)
          // 头像 glow 偏移（最大 ±12px）
          setAvatarGlowX(`${50 + ((x - cx) / cx) * 25}%`)
          setAvatarGlowY(`${50 + ((y - cy) / cy) * 25}%`)
          // kinetic name 反向视差（最大 ±8px）
          setNameX?.(-((x - cx) / cx) * 8)
          setNameY?.(-((y - cy) / cy) * 8)
          // magnetic links（80px 范围内吸引）
          linkSetters.forEach(({ el, setX, setY }) => {
            const linkRect = el.getBoundingClientRect()
            const linkCx = linkRect.left + linkRect.width / 2
            const linkCy = linkRect.top + linkRect.height / 2
            const dx = e.clientX - linkCx
            const dy = e.clientY - linkCy
            const dist = Math.hypot(dx, dy)
            if (dist < 80) {
              const factor = (1 - dist / 80) * 6
              setX((dx / dist) * factor)
              setY((dy / dist) * factor)
            } else {
              setX(0)
              setY(0)
            }
          })
        }

        const onCardEnter = () => {
          // 非 Owner 卡片：reveal 社交链接
          if (!isOwner && linksWrapper) {
            g.to(linksWrapper, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' })
          }
        }

        const onCardLeave = () => {
          setRotateX(0)
          setRotateY(0)
          setNameX?.(0)
          setNameY?.(0)
          linkSetters.forEach(({ setX, setY }) => { setX(0); setY(0) })
          if (!isOwner && linksWrapper) {
            g.to(linksWrapper, { autoAlpha: 0, y: 8, duration: 0.2, ease: 'power2.in' })
          }
        }

        card.addEventListener('mousemove', onCardMove)
        card.addEventListener('mouseenter', onCardEnter)
        card.addEventListener('mouseleave', onCardLeave)

        return () => {
          card.removeEventListener('mousemove', onCardMove)
          card.removeEventListener('mouseenter', onCardEnter)
          card.removeEventListener('mouseleave', onCardLeave)
        }
      }

      // 用 matchMedia 包裹卡片交互（触屏与 reduce-motion 跳过）
      const mm = g.matchMedia()
      const cardCleanups: Array<() => void> = []
      mm.add({
        isDesktop: '(min-width: 769px) and (pointer: fine)',
        reduceMotion: '(prefers-reduced-motion: reduce)',
      }, (context) => {
        const { isDesktop, reduceMotion } = context.conditions!
        if (!isDesktop || reduceMotion) return
        g.utils.toArray<HTMLElement>('.contributor-card').forEach((card) => {
          cardCleanups.push(setupCardInteractions(card))
        })
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
        if (teamSection) {
          teamSection.removeEventListener('mousemove', onTeamMove)
        }
        cardCleanups.forEach(cleanup => cleanup())
        cardCleanups.length = 0
      }
    })
  })
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>
