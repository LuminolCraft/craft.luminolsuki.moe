<template>
    <!-- 顶部区域 -->
    <header class="hero-section">
        <div class="header-background" :class="{ 'fade-in': activeLayer === 1 }" :style="{ backgroundImage: `url(${currentImage1})`, opacity: activeLayer === 1 ? '1' : '0' }"></div>
        <div class="header-background" :style="{ backgroundImage: `url(${currentImage2})`, opacity: activeLayer === 2 ? '1' : '0' }"></div>
        <div class="hero-overlay" id="heroBg"></div>
        
        <!-- <div class="hero-orb hero-orb-1"></div>
        <div class="hero-orb hero-orb-2"></div> -->
        <div class="hero-content">
            <div class="hero-text">
                <h1 class="hero-title">LuminolCraft</h1>
                <p class="hero-subtitle"><span class="typed-text" id="typedText"></span></p>
                <p class="hero-description">{{ t('home.hero.description') }}</p>
                <div class="hero-actions">
                    <a href="https://qm.qq.com/q/M29Eyniu8S" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                        <i class="fas fa-users"></i>
                        {{ t('common.joinGroup') }}
                    </a>
                    <a href="monitoring" class="btn btn-secondary">
                        <i class="fas fa-chart-line"></i>
                        {{ t('common.monitoring') }}
                    </a>
                </div>
            </div>
            <div class="status-card" id="statusCard">
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
                                <img src="https://q1.qlogo.cn/g?b=qq&nk=3900217885&s=0" alt="IngilYing" class="contributor-avatar" loading="lazy">
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

</template>

<style scoped>
@import '../styles/theme-colors.css';
@import '../styles/mobile/home-mobile.css';

/* 全新的首页布局设计 */
.hero-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
    background: linear-gradient(180deg, 
        rgba(0, 0, 0, 0.3) 0%, 
        rgba(0, 0, 0, 0.2) 70%, 
        rgba(0, 0, 0, 0.1) 90%, 
        transparent 100%);
}

/* 背景轮播样式 */
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
    z-index: -2; /* 确保背景图片在最底层 */
}

.header-background.fade-in {
    opacity: 1;
}

/* 添加更柔和的过渡效果 */
.hero-section {
    background-color: transparent; /* 透明背景，让图片显示 */
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

.hero-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.5;
    z-index: -1;
}

.hero-orb-1 {
    top: 20%;
    left: 10%;
    width: 300px;
    height: 300px;
    background: rgba(99, 102, 241, 0.3);
    animation: gentleShift 8s ease-in-out infinite;
}

.hero-orb-2 {
    bottom: 20%;
    right: 10%;
    width: 250px;
    height: 250px;
    background: rgba(34, 211, 238, 0.3);
    animation: gentleShift 10s ease-in-out infinite reverse;
}

.hero-content {
    position: relative;
    z-index: 2;
    max-width: 1200px;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 60px;
    align-items: center;
    margin: 0 auto;

}


.hero-text {
    animation: fadeInUp 0.8s ease forwards;
}

.hero-title {
    font-size: clamp(2.2rem, 5vw, 3.5rem);
    font-weight: 700;
    line-height: 1.15;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #f1f5f9 0%, #818cf8 50%, #22d3ee 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    letter-spacing: -0.02em;
}

.hero-subtitle {
    font-size: 1.15rem;
    color: var(--accent-cyan);
    font-weight: 500;
    margin-bottom: 20px;
    height: 1.6em;
    position: relative;
    display: inline-block;
}

.hero-subtitle .typed-text {
    border-right: 2px solid var(--accent-cyan);
    white-space: nowrap;
    overflow: hidden;
    display: inline-block;
}

.hero-subtitle .typed-text.done {
    animation: cursorBlink 0.8s step-end infinite;
}

@keyframes cursorBlink {
    0%, 100% { border-right-color: var(--accent-cyan); }
    50% { border-right-color: transparent; }
}

.hero-description {
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.8;
    max-width: 560px;
    margin-bottom: 32px;
}

.hero-actions {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
}

.hero-visual {
    animation: fadeInUp 0.6s ease-out 0.15s both;
}

.btn-hero {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 28px;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
    cursor: pointer;
    border: none;
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
	transition: transform 0.25s,box-shadow 0.25s,background 0.25s;
	cursor: pointer;
	border: none;
	font-family: var(--font-main);
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

.btn-secondary-hero {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-primary);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary-hero:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
}

.server-status-card {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 20px;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    text-align: center;
    position: relative;
    overflow: hidden;
}

.server-status-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--bases-primary-gradient);
}

.status-card {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 20px;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    position: relative;
    overflow: hidden;
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

.status-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 20px;
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
    animation: pulse 2s infinite;
    z-index: -1;
  }
  
  /* 在线状态 - 绿色 */
  .status-dot.online {
    background-color: var(--bases-online-dot);
  }
  .status-dot.online::before {
    background-color: var(--bases-online-dot);
  }
  
  /* 离线状态 - 红色 */
  .status-dot.offline {
    background-color: var(--bases-error-color);
  }
  .status-dot.offline::before {
    background-color: var(--bases-error-color);
  }
  
  /* 脉冲动画 */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.2);
    }
  }
  
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.status-text {
    font-size: 1.2rem;
    font-weight: 600;
    color: white;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.server-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 20px;
}

.info-item {
    text-align: center;
}

.info-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 5px;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.info-value {
    font-size: 1.3rem;
    font-weight: 600;
    color: white;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.online {
    color: var(--online-color);
}

/* 移除所有过渡效果，让header和features-section直接连接 */

.wave-divider {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 200px;
    z-index: 1;
}

.wave-divider svg {
    width: 100%;
    height: 100%;
    display: block;
}

/* 波浪动画效果 */
.wave-divider svg path,
.footer-wave-divider svg path {
    animation: wave-animation 20s ease-in-out infinite alternate;
}

/* 为不同层次的波浪设置不同的动画延迟和时长，创造更自然的波浪效果 */
.wave-divider svg path:nth-child(1),
.footer-wave-divider svg path:nth-child(1) {
    animation-duration: 25s;
    animation-delay: -1s;
}

.wave-divider svg path:nth-child(2),
.footer-wave-divider svg path:nth-child(2) {
    animation-duration: 20s;
    animation-delay: -2s;
}

.wave-divider svg path:nth-child(3),
.footer-wave-divider svg path:nth-child(3) {
    animation-duration: 15s;
    animation-delay: -3s;
}

/* 波浪动画关键帧 */
@keyframes wave-animation {
    0% {
        d: path('M0,120V73.71c47.79-22.2,103.59-32.17,158-28,70.36,5.37,136.33,33.31,206.8,37.5C438.64,87.57,512.34,66.33,583,47.95c69.27-18,138.3-24.88,209.4-13.08,36.15,6,69.85,17.84,104.45,29.34C989.49,95,1113,134.29,1200,67.53V120Z');
    }
    25% {
        d: path('M0,120V80.71c47.79-18.2,103.59-28.17,158-24,70.36,7.37,136.33,35.31,206.8,39.5C438.64,90.57,512.34,69.33,583,50.95c69.27-15,138.3-21.88,209.4-10.08,36.15,8,69.85,19.84,104.45,31.34C989.49,98,1113,137.29,1200,70.53V120Z');
    }
    50% {
        d: path('M0,120V70.71c47.79-25.2,103.59-35.17,158-31,70.36,4.37,136.33,32.31,206.8,36.5C438.64,85.57,512.34,64.33,583,45.95c69.27-20,138.3-27.88,209.4-16.08,36.15,5,69.85,16.84,104.45,28.34C989.49,93,1113,132.29,1200,65.53V120Z');
    }
    75% {
        d: path('M0,120V85.71c47.79-16.2,103.59-26.17,158-22,70.36,8.37,136.33,36.31,206.8,40.5C438.64,92.57,512.34,71.33,583,52.95c69.27-13,138.3-19.88,209.4-8.08,36.15,9,69.85,20.84,104.45,32.34C989.49,100,1113,139.29,1200,72.53V120Z');
    }
    100% {
        d: path('M0,120V68.71c47.79-27.2,103.59-37.17,158-33,70.36,3.37,136.33,31.31,206.8,35.5C438.64,84.57,512.34,63.33,583,44.95c69.27-22,138.3-29.88,209.4-18.08,36.15,4,69.85,15.84,104.45,27.34C989.49,92,1113,131.29,1200,64.53V120Z');
    }
}



/* 新的柔和动画效果 */
@keyframes gentleShift {
    0%, 100% { 
        opacity: 0.8;
        transform: translateY(0px);
    }
    50% { 
        opacity: 1;
        transform: translateY(-2px);
    }
}

/* 特色区域 - 强自发光分隔效果 */
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
    animation: fadeInUp 0.5s ease-out 0.2s both;
}

.section-header {
    text-align: center;
    margin-bottom: 60px;
    animation: fadeInUp 0.5s ease-out 0.25s both;
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
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 40px;
    animation: fadeInUp 0.5s ease-out 0.3s both;
}

.feature-card {
    background: var(--card-bg);
    border-radius: 16px;
    padding: 40px;
    text-align: center;
    border: 1px solid var(--glass-border);
    box-shadow: 0 10px 30px var(--shadow-color);
    transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    position: relative;
    overflow: hidden;
}

/* 服务器卡片 */
.server-card {
    transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* 团队卡片 */
.contributor-card {
    transition: all 0.6s ease-out;
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
    transition: transform 0.3s ease;
}

.feature-card:hover::before {
    transform: scaleX(1);
}

.feature-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px var(--shadow-hover);
}

.feature-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--bases-primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 2rem;
    color: white;
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

/* 服务器类型区域 */
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
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 60px;
}

.server-card {
    background: var(--card-bg);
    border-radius: 20px;
    padding: 40px;
    border: 1px solid var(--glass-border);
    box-shadow: 0 15px 35px var(--shadow-color);
    transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    position: relative;
    overflow: hidden;
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

.server-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 25px 50px var(--shadow-hover);
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

/* 团队区域 */
.team-section {
    padding: 100px 0;
    background: var(--background-color);
}

.team-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
}

/* 团队flex布局 */
.team-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 30px;
    margin-top: 60px;
}

/* 团队子节 */
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

.contributors-flex {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-top: 2rem;
    align-items: start;
    justify-content: center;
}

.contributor-card {
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    background: var(--card-bg);
    padding: 1rem;
    width: 280px;
    height: 140px;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.contributor-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
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
}

.contributor-avatar {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
    border: 2px solid var(--glass-border);
    transition: border-color 0.3s ease;
}

.contributor-card:hover .contributor-avatar {
    border-color: var(--primary-color);
}

/* Contributor 信息 */
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

/* Contributor GitHub 链接 */
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
    /* width: 44px;
    height: 44px; */
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

/* 团队卡片统一样式 */
.team-card {
    background: var(--card-bg);
    border-radius: 20px;
    padding: 35px 25px;
    text-align: center;
    border: 1px solid var(--glass-border);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    flex: 0 0 300px;
    max-width: 300px;
}

.team-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--primary-gradient);
    transform: scaleX(0);
    transition: transform 0.3s ease;
}

.team-card:hover::before {
    transform: scaleX(1);
}

.team-card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
    border-color: var(--primary-color);
}

/* 头像样式 */
.team-avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    margin: 0 auto 25px;
    border: 3px solid var(--glass-border);
    transition: all 0.3s ease;
    object-fit: cover;
}

.team-card:hover .team-avatar {
    transform: scale(1.1);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

/* 姓名样式 */
.team-name {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 12px;
    transition: color 0.3s ease;
}

.team-card:hover .team-name {
    color: var(--primary-color);
}

/* 角色描述 */
.team-role {
    color: var(--text-secondary);
    margin-bottom: 25px;
    line-height: 1.6;
    font-size: 0.95rem;
}

/* 社交链接 */
.team-links {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 20px;
}

.team-link {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--glass-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--glass-border);
    text-decoration: none;
}

.team-link:hover {
    background: var(--primary-gradient);
    color: white;
    transform: translateY(-3px) scale(1.1);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
    border-color: transparent;
}

.team-link i {
    font-size: 18px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
    .hero-content {
        grid-template-columns: 1fr;
        gap: 40px;
        text-align: center;
    }
    
    .hero-title {
        font-size: 3rem;
    }
    
    .servers-grid {
        grid-template-columns: 1fr;
    }
    
    /* 平板端团队布局 */
    .team-card {
        flex: 0 0 280px;
        max-width: 280px;
    }
}

/* 移动端样式已移至 mobile.css */


/* 服务器配置样式 */
.server-config-section {
    margin: 25px 0 0 0;
    text-align: center;
}

.server-config-title {
    color: #f8f9fa;
    font-size: 1.2em;
    font-weight: 700;
    margin-bottom: 20px;
    opacity: 1;
    letter-spacing: 1px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    position: relative;
}

.server-config-title::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
    border-radius: 1px;
}

.server-config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 15px;
    max-width: 800px;
    margin: 0 auto;
    padding: 0 10px;
}

.config-item {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 16px 12px;
    text-align: center;
    transition: all 0.3s ease;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    min-height: 110px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.config-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.12);
}

.config-icon {
    font-size: 2em;
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.8);
    transition: all 0.3s ease;
}

.config-icon i {
    font-size: inherit;
    color: inherit;
}

.config-item:hover .config-icon {
    color: rgba(255, 255, 255, 1);
    transform: scale(1.05);
}

.config-label {
    color: rgba(248, 249, 250, 0.8);
    font-size: 0.85em;
    font-weight: 600;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
}

.config-value {
    color: #f8f9fa;
    font-size: 0.9em;
    font-weight: 500;
    margin-bottom: 4px;
    line-height: 1.3;
}

/* 主页服务器状态指示器样式 */
#server-status .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.3s ease;
}

#server-status .status-indicator::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;
}

#server-status .status-indicator.loading {
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
    border: 1px solid rgba(255, 193, 7, 0.3);
}

#server-status .status-indicator.loading::before {
    background: #ffc107;
}

#server-status .status-indicator.online {
    background: rgba(40, 167, 69, 0.2);
    color: #28a745;
    border: 1px solid rgba(40, 167, 69, 0.3);
}

#server-status .status-indicator.online::before {
    background: #28a745;
}

#server-status .status-indicator.offline {
    background: rgba(220, 53, 69, 0.2);
    color: #dc3545;
    border: 1px solid rgba(220, 53, 69, 0.3);
}

#server-status .status-indicator.offline::before {
    background: #dc3545;
}

#server-status .status-indicator.error {
    background: rgba(108, 117, 125, 0.2);
    color: #6c757d;
    border: 1px solid rgba(108, 117, 125, 0.3);
}

#server-status .status-indicator.error::before {
    background: #6c757d;
}

@keyframes pulse {
    0%, 100% { 
        opacity: 1; 
        transform: scale(1);
    }
    50% { 
        opacity: 0.6; 
        transform: scale(1.1);
    }
}
.gallery-item {
    position: relative;
    overflow: hidden;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    transition: all 0.3s;
    cursor: pointer;
}

.gallery-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

.gallery-img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    transition: transform 0.5s;
}

.gallery-item:hover .gallery-img {
    transform: scale(1.08);
}

.gallery-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 15px;
    background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0));
    color: white;
    opacity: 0;
    transform: translateY(15px);
    transition: all 0.3s;
}

.gallery-item:hover .gallery-overlay {
    opacity: 1;
    transform: translateY(0);
}

/* 规则盒子 */
.rules-box {
    /* border: 4px solid rgb(187, 52, 52); */
    padding: 40px 25px;
    background: var(--card-bg);
    border-radius: 10px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.05);
}

.rules-box ol {
    list-style-position: inside;
    padding-left: 0;
}

.rules-box li {
    position: relative;
    margin-bottom: 18px;
    padding-left: 8px;
    font-size: 1.05em;
    transition: all 0.3s;
}

.rules-box li:hover {
    transform: translateX(4px);
    color: var(--primary-color);
}

/* 加入按钮 
.join-btn {
    display: block;
    width: 220px;
    margin: 50px auto 0;
    padding: 15px;
    background: var(--primary-color);
    color: white;
    text-align: center;
    text-decoration: none;
    border-radius: 5px;
    font-size: clamp(1em, 3vw, 1.2em);
    transition: all 0.3s;
    position: relative;
    overflow: hidden;
}

.join-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: all 0.5s;
}

.join-btn:hover::before {
    left: 100%;
}

.join-btn:hover {
    background: var(--online-color);
    transform: translateY(-4px);
    box-shadow: 0 8px 18px rgba(0,0,0,0.2);
}
*/
/* Footer过渡区域样式已移至 footer.css */

/* Footer样式已移至 footer.css */

.social-links {
    margin-bottom: 25px;
}

.social-links a {
    display: inline-block;
    margin: 0 12px;
    color: white;
    font-size: 1.3em;
    transition: all 0.3s;
}

.social-links a:hover {
    color: var(--primary-color);
    transform: translateY(-4px);
}


@keyframes fadeInUp {
    from { 
        opacity: 0; 
        transform: translateY(20px); 
    }
    to { 
        opacity: 1; 
        transform: translateY(0); 
    }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
}

/* 滚动动画 */
@keyframes slideInFromLeft {
    from {
        opacity: 0;
        transform: translateX(-50px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes slideInFromRight {
    from {
        opacity: 0;
        transform: translateX(50px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* 悬停时的微动画 */
@keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
}

/* 渐变文字动画 */
@keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}



/* 加入按钮 
.join-btn {
    display: block;
    width: 220px;
    margin: 50px auto 0;
    padding: 15px;
    background: var(--primary-color);
    color: white;
    text-align: center;
    text-decoration: none;
    border-radius: 5px;
    font-size: clamp(1em, 3vw, 1.2em);
    transition: all 0.3s;
    position: relative;
    overflow: hidden;
}

.join-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: all 0.5s;
}

.join-btn:hover::before {
    left: 100%;
}

.join-btn:hover {
    background: var(--online-color);
    transform: translateY(-4px);
    box-shadow: 0 8px 18px rgba(0,0,0,0.2);
}
*/
@keyframes fadeIn {/* 页头文字、页头按钮动画 */
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
}

/* 波浪动画效果 */
.wave-divider svg path,
.footer-wave-divider svg path {
    animation: wave-animation 20s ease-in-out infinite alternate;
}

/* 为不同层次的波浪设置不同的动画延迟和时长，创造更自然的波浪效果 */
.wave-divider svg path:nth-child(1),
.footer-wave-divider svg path:nth-child(1) {
    animation-duration: 25s;
    animation-delay: -1s;
}

.wave-divider svg path:nth-child(2),
.footer-wave-divider svg path:nth-child(2) {
    animation-duration: 20s;
    animation-delay: -2s;
}

.wave-divider svg path:nth-child(3),
.footer-wave-divider svg path:nth-child(3) {
    animation-duration: 15s;
    animation-delay: -3s;
}

/* 波浪动画关键帧 */
@keyframes wave-animation {
    0% {
        d: path('M0,120V73.71c47.79-22.2,103.59-32.17,158-28,70.36,5.37,136.33,33.31,206.8,37.5C438.64,87.57,512.34,66.33,583,47.95c69.27-18,138.3-24.88,209.4-13.08,36.15,6,69.85,17.84,104.45,29.34C989.49,95,1113,134.29,1200,67.53V120Z');
    }
    25% {
        d: path('M0,120V80.71c47.79-18.2,103.59-28.17,158-24,70.36,7.37,136.33,35.31,206.8,39.5C438.64,90.57,512.34,69.33,583,50.95c69.27-15,138.3-21.88,209.4-10.08,36.15,8,69.85,19.84,104.45,31.34C989.49,98,1113,137.29,1200,70.53V120Z');
    }
    50% {
        d: path('M0,120V70.71c47.79-25.2,103.59-35.17,158-31,70.36,4.37,136.33,32.31,206.8,36.5C438.64,85.57,512.34,64.33,583,45.95c69.27-20,138.3-27.88,209.4-16.08,36.15,5,69.85,16.84,104.45,28.34C989.49,93,1113,132.29,1200,65.53V120Z');
    }
    75% {
        d: path('M0,120V85.71c47.79-16.2,103.59-26.17,158-22,70.36,8.37,136.33,36.31,206.8,40.5C438.64,92.57,512.34,71.33,583,52.95c69.27-13,138.3-19.88,209.4-8.08,36.15,9,69.85,20.84,104.45,32.34C989.49,100,1113,139.29,1200,72.53V120Z');
    }
    100% {
        d: path('M0,120V68.71c47.79-27.2,103.59-37.17,158-33,70.36,3.37,136.33,31.31,206.8,35.5C438.64,84.57,512.34,63.33,583,44.95c69.27-22,138.3-29.88,209.4-18.08,36.15,4,69.85,15.84,104.45,27.34C989.49,92,1113,131.29,1200,64.53V120Z');
    }
}



/* 新的柔和动画效果 */
@keyframes gentleShift {
    0%, 100% { 
        opacity: 0.8;
        transform: translateY(0px);
    }
    50% { 
        opacity: 1;
        transform: translateY(-2px);
    }
}

/* 特色区域 - 强自发光分隔效果 */
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
    animation: fadeInUp 0.5s ease-out 0.2s both;
}

.section-header {
    text-align: center;
    margin-bottom: 60px;
    animation: fadeInUp 0.5s ease-out 0.25s both;
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
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 40px;
    animation: fadeInUp 0.5s ease-out 0.3s both;
}

.feature-card {
    background: var(--card-bg);
    border-radius: 16px;
    padding: 40px;
    text-align: center;
    border: 1px solid var(--glass-border);
    box-shadow: 0 10px 30px var(--shadow-color);
    transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    position: relative;
    overflow: hidden;
}

/* 服务器卡片 */
.server-card {
    transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* 团队卡片 */
.contributor-card {
    transition: all 0.6s ease-out;
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
    transition: transform 0.3s ease;
}

.feature-card:hover::before {
    transform: scaleX(1);
}

.feature-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px var(--shadow-hover);
}

.feature-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--bases-primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 2rem;
    color: white;
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

/* 服务器类型区域 */
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
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 60px;
}

.server-card {
    background: var(--card-bg);
    border-radius: 20px;
    padding: 40px;
    border: 1px solid var(--glass-border);
    box-shadow: 0 15px 35px var(--shadow-color);
    transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    position: relative;
    overflow: hidden;
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

.server-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 25px 50px var(--shadow-hover);
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

/* 团队区域 */
.team-section {
    padding: 100px 0;
    background: var(--background-color);
}

.team-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
}

/* 团队flex布局 */
.team-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 30px;
    margin-top: 60px;
}

/* 团队子节 */
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

.contributors-flex {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-top: 2rem;
    align-items: start;
    justify-content: center;
}

.contributor-card {
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    background: var(--card-bg);
    padding: 1rem;
    width: 280px;
    height: 140px;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.contributor-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
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
}

.contributor-avatar {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
    border: 2px solid var(--glass-border);
    transition: border-color 0.3s ease;
}

.contributor-card:hover .contributor-avatar {
    border-color: var(--primary-color);
}

/* Contributor 信息 */
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

/* Contributor GitHub 链接 */
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
    /* width: 44px;
    height: 44px; */
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

/* 团队卡片统一样式 */
.team-card {
    background: var(--card-bg);
    border-radius: 20px;
    padding: 35px 25px;
    text-align: center;
    border: 1px solid var(--glass-border);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    flex: 0 0 300px;
    max-width: 300px;
}

.team-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--primary-gradient);
    transform: scaleX(0);
    transition: transform 0.3s ease;
}

.team-card:hover::before {
    transform: scaleX(1);
}

.team-card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
    border-color: var(--primary-color);
}

/* 头像样式 */
.team-avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    margin: 0 auto 25px;
    border: 3px solid var(--glass-border);
    transition: all 0.3s ease;
    object-fit: cover;
}

.team-card:hover .team-avatar {
    transform: scale(1.1);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

/* 姓名样式 */
.team-name {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 12px;
    transition: color 0.3s ease;
}

.team-card:hover .team-name {
    color: var(--primary-color);
}

/* 角色描述 */
.team-role {
    color: var(--text-secondary);
    margin-bottom: 25px;
    line-height: 1.6;
    font-size: 0.95rem;
}

/* 社交链接 */
.team-links {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 20px;
}

.team-link {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--glass-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--glass-border);
    text-decoration: none;
}

.team-link:hover {
    background: var(--primary-gradient);
    color: white;
    transform: translateY(-3px) scale(1.1);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
    border-color: transparent;
}

.team-link i {
    font-size: 18px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
    .hero-content {
        grid-template-columns: 1fr;
        gap: 40px;
        text-align: center;
    }
    
    .hero-title {
        font-size: 3rem;
    }
    
    .servers-grid {
        grid-template-columns: 1fr;
    }
    
    /* 平板端团队布局 */
    .team-card {
        flex: 0 0 280px;
        max-width: 280px;
    }
}

/* 移动端样式已移至 mobile.css */


/* 服务器配置样式 */
.server-config-section {
    margin: 25px 0 0 0;
    text-align: center;
}

.server-config-title {
    color: #f8f9fa;
    font-size: 1.2em;
    font-weight: 700;
    margin-bottom: 20px;
    opacity: 1;
    letter-spacing: 1px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    position: relative;
}

.server-config-title::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
    border-radius: 1px;
}

.server-config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 15px;
    max-width: 800px;
    margin: 0 auto;
    padding: 0 10px;
}

.config-item {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 16px 12px;
    text-align: center;
    transition: all 0.3s ease;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    min-height: 110px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.config-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.12);
}

.config-icon {
    font-size: 2em;
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.8);
    transition: all 0.3s ease;
}

.config-icon i {
    font-size: inherit;
    color: inherit;
}

.config-item:hover .config-icon {
    color: rgba(255, 255, 255, 1);
    transform: scale(1.05);
}

.config-label {
    color: rgba(248, 249, 250, 0.8);
    font-size: 0.85em;
    font-weight: 600;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
}

.config-value {
    color: #f8f9fa;
    font-size: 0.9em;
    font-weight: 500;
    margin-bottom: 4px;
    line-height: 1.3;
}

/* 主页服务器状态指示器样式 */
#server-status .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.3s ease;
}

#server-status .status-indicator::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;
}

#server-status .status-indicator.loading {
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
    border: 1px solid rgba(255, 193, 7, 0.3);
}

#server-status .status-indicator.loading::before {
    background: #ffc107;
}

#server-status .status-indicator.online {
    background: rgba(40, 167, 69, 0.2);
    color: #28a745;
    border: 1px solid rgba(40, 167, 69, 0.3);
}

#server-status .status-indicator.online::before {
    background: #28a745;
}

#server-status .status-indicator.offline {
    background: rgba(220, 53, 69, 0.2);
    color: #dc3545;
    border: 1px solid rgba(220, 53, 69, 0.3);
}

#server-status .status-indicator.offline::before {
    background: #dc3545;
}

#server-status .status-indicator.error {
    background: rgba(108, 117, 125, 0.2);
    color: #6c757d;
    border: 1px solid rgba(108, 117, 125, 0.3);
}

#server-status .status-indicator.error::before {
    background: #6c757d;
}

@keyframes pulse {
    0%, 100% { 
        opacity: 1; 
        transform: scale(1);
    }
    50% { 
        opacity: 0.6; 
        transform: scale(1.1);
    }
}
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
    
    if (activeLayer.value === 1) {
        currentImage2.value = backgroundImages[newIndex];
        activeLayer.value = 2;
    } else {
        currentImage1.value = backgroundImages[newIndex];
        activeLayer.value = 1;
    }
};

let intervalId: ReturnType<typeof setInterval> | null = null;

const serverOnline = ref(true);
const onlinePlayers = ref('加载中...');
const serverStatus = ref('服务器在线');

const fetchServerStatus = async () => {
    try {
        const response = await fetch('https://api.mcsrvstat.us/3/craft.luminolsuki.moe');
        if (response.ok) {
            const data = await response.json();
            serverOnline.value = data.online || false;
            onlinePlayers.value = data.online ? `${data.players?.online || 0}/${data.players?.max || 0}` : '0/0';
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

onMounted(async () => {
    intervalId = setInterval(nextRandomImage, 3600);
    
    await fetchServerStatus();
    setInterval(fetchServerStatus, 30000);
    
    // 打字机效果
    nextTick(() => {
        const el = document.getElementById('typedText');
        if (el) {
            const text = t('hero.subtitle');
            let i = 0;
            const speed = 80;

            function typeChar() {
                if (i < text.length) {
                    el.textContent += text.charAt(i);
                    i++;
                    setTimeout(typeChar, speed);
                } else {
                    el.classList.add('done');
                }
            }

            setTimeout(typeChar, 600);
        }
    });
    
    // 滚动相关
    window.addEventListener('scroll', function() {
        const y = window.scrollY;
        // 为背景轮播图添加滚动视差效果
        const headers = document.querySelectorAll('.header-background');
        headers.forEach(header => {
            if (y < window.innerHeight) {
                header.style.transform = `scale(${1.05 + y * 0.0001}) translateY(${y * 0.15}px)`;
            }
        });
    }, { passive: true });
});

onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
    // 清理事件监听器
    window.removeEventListener('scroll', () => {});
});
</script>
