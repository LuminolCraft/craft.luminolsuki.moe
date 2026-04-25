<template>
    <main class="support-page">
        <div class="container">
            <section class="intro vercel-animate-fadeInUp">
                <h1 class="vercel-section-heading">{{ t('support.title') }}</h1>
                <p class="vercel-body-large">{{ t('support.intro') }}</p>
            </section>

            <section class="sponsorship-methods">
                <div class="methods-grid vercel-grid vercel-grid-cols-3">
                    <div class="method-item vercel-card vercel-animate-fadeInUp" style="animation-delay: 0.1s;">
                        <div class="method-header">
                            <i class="fas fa-thumbtack method-icon"></i>
                            <h3 class="method-title vercel-card-title">{{ t('support.methods.minebbs.title') }}</h3>
                        </div>
                        <p class="method-desc vercel-body-small">{{ t('support.methods.minebbs.desc') }}</p>
                        <a href="https://www.minebbs.com/threads/luminolcraft.35730/" target="_blank" rel="noopener noreferrer" class="btn vercel-btn vercel-btn-secondary">
                            {{ t('support.actions.goTo') }}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="link-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                        </a>
                    </div>

                    <div class="method-item vercel-card vercel-animate-fadeInUp" style="animation-delay: 0.15s;">
                        <div class="method-header">
                            <i class="fas fa-fire method-icon"></i>
                            <h3 class="method-title vercel-card-title">{{ t('support.methods.klpbbs.title') }}</h3>
                        </div>
                        <p class="method-desc vercel-body-small">{{ t('support.methods.klpbbs.desc') }}</p>
                        <a href="https://klpbbs.com/thread-162318-1-1.html" target="_blank" rel="noopener noreferrer" class="btn vercel-btn vercel-btn-secondary">
                            {{ t('support.actions.goTo') }}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="link-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                        </a>
                    </div>

                    <div class="method-item vercel-card vercel-animate-fadeInUp" style="animation-delay: 0.2s;">
                        <div class="method-header">
                            <i class="fas fa-thumbs-up method-icon"></i>
                            <h3 class="method-title vercel-card-title">{{ t('support.methods.mcmod.title') }}</h3>
                        </div>
                        <p class="method-desc vercel-body-small">{{ t('support.methods.mcmod.desc') }}</p>
                        <a href="https://play.mcmod.cn/sv20188263.html" target="_blank" rel="noopener noreferrer" class="btn vercel-btn vercel-btn-secondary">
                            {{ t('support.actions.goTo') }}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="link-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                        </a>
                    </div>

                    <div class="method-item vercel-card vercel-animate-fadeInUp" style="animation-delay: 0.25s;">
                        <div class="method-header">
                            <i class="fas fa-heart method-icon"></i>
                            <h3 class="method-title vercel-card-title">{{ t('support.methods.afdian.title') }}</h3>
                        </div>
                        <p class="method-desc vercel-body-small">{{ t('support.methods.afdian.desc') }}</p>
                        <a href="https://afdian.com/a/Luminol" target="_blank" rel="noopener noreferrer" class="btn vercel-btn vercel-btn-primary">
                            {{ t('support.actions.goToSponsor') }}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="link-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                        </a>
                    </div>

                    <div class="method-item vercel-card vercel-animate-fadeInUp" style="animation-delay: 0.3s;">
                        <div class="method-header">
                            <i class="fas fa-star method-icon"></i>
                            <h3 class="method-title vercel-card-title">{{ t('support.methods.luminolcraft.title') }}</h3>
                        </div>
                        <p class="method-desc vercel-body-small">{{ t('support.methods.luminolcraft.desc') }}</p>
                        <a href="https://github.com/LuminolCraft/" target="_blank" rel="noopener noreferrer" class="btn vercel-btn vercel-btn-secondary">
                            {{ t('support.actions.viewProject') }}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="link-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                        </a>
                    </div>

                    <div class="method-item vercel-card vercel-animate-fadeInUp" style="animation-delay: 0.35s;">
                        <div class="method-header">
                            <i class="fas fa-code method-icon"></i>
                            <h3 class="method-title vercel-card-title">{{ t('support.methods.webSource.title') }}</h3>
                        </div>
                        <p class="method-desc vercel-body-small">{{ t('support.methods.webSource.desc') }}</p>
                        <a href="https://github.com/LuminolCraft/craft.luminolsuki.moe" target="_blank" rel="noopener noreferrer" class="btn vercel-btn vercel-btn-secondary">
                            {{ t('support.actions.viewProject') }}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="link-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                        </a>
                    </div>
                </div>
            </section>

            <section class="thank-you vercel-animate-fadeInUp" style="animation-delay: 0.4s;">
                <h3 class="vercel-subheading-large">{{ t('support.thankYou.title') }}</h3>
                <p class="vercel-body">{{ t('support.thankYou.desc1') }}</p>
                <p class="vercel-body">{{ t('support.thankYou.desc2') }}</p>
            </section>
        </div>
    </main>
</template>


<style scoped>
.support-page {
    padding: var(--space-20) 0;
}

.container {
    max-width: var(--container-max-width);
    margin: 0 auto;
    padding: 0 var(--container-padding);
}

.intro {
    text-align: center;
    margin-bottom: var(--space-16);
}

.intro p {
    max-width: 600px;
    margin: var(--space-4) auto 0;
}

.sponsorship-methods {
    margin-bottom: var(--space-16);
}

.method-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
}

.method-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
}

.method-icon {
    font-size: 20px;
    color: var(--primary-color);
    opacity: 0.8;
}

.method-title {
    font-size: var(--font-size-card-title);
    font-weight: 600;
    line-height: 1.33;
    letter-spacing: -0.96px;
    color: var(--text-color);
}

.method-desc {
    color: var(--text-secondary);
    line-height: 1.56;
    flex-grow: 1;
}

.btn {
    align-self: flex-start;
}

.link-icon {
    width: 14px;
    height: 14px;
    margin-left: 4px;
    transition: transform 150ms ease-out;
}

.btn:hover .link-icon {
    transform: translateX(2px);
}

.thank-you {
    text-align: center;
    padding: var(--space-10);
}

.thank-you h3 {
    margin-bottom: var(--space-4);
}

.thank-you p {
    max-width: 700px;
    margin: 0 auto var(--space-3);
}

@media (max-width: 1024px) {
    .methods-grid {
        grid-template-columns: repeat(2, 1fr) !important;
    }
}

@media (max-width: 768px) {
    .support-page {
        padding: var(--space-12) 0;
    }

    .intro {
        margin-bottom: var(--space-10);
    }

    .sponsorship-methods {
        margin-bottom: var(--space-10);
    }

    .methods-grid {
        grid-template-columns: 1fr !important;
        gap: var(--space-4);
    }

    .thank-you {
        padding: var(--space-6);
    }
}
</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
