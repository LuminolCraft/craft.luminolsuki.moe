<template>
    <main>
            <div class="container">
                <section class="intro">
                    <h2>{{ t('support.title') }}</h2>
                    <p>{{ t('support.intro') }}</p>
                </section>
    
                <section class="sponsorship-methods">
                    <div class="methods-grid">
                        <div class="method-item">
                            <div class="method-header">
                                <i class="fas fa-thumbtack method-icon"></i>
                                <h3 class="method-title">{{ t('support.methods.minebbs.title') }}</h3>
                            </div>
                            <p class="method-desc">{{ t('support.methods.minebbs.desc') }}</p>
                            <a href="https://www.minebbs.com/threads/luminolcraft.35730/" target="_blank" rel="noopener noreferrer" class="btn">{{ t('support.actions.goTo') }}
                                <svg  xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                            </a>
                        </div>
    
                        <div class="method-item">
                            <div class="method-header">
                                <i class="fas fa-fire method-icon"></i>
                                <h3 class="method-title">{{ t('support.methods.klpbbs.title') }}</h3>
                            </div>
                            <p class="method-desc">{{ t('support.methods.klpbbs.desc') }}</p>
                            <a href="https://klpbbs.com/thread-162318-1-1.html" target="_blank" rel="noopener noreferrer" class="btn">{{ t('support.actions.goTo') }}
                                <svg  xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                            </a>
                        </div>
    
                        <div class="method-item">
                            <div class="method-header">
                                <i class="fas fa-thumbs-up method-icon"></i>
                                <h3 class="method-title">{{ t('support.methods.mcmod.title') }}</h3>
                            </div>
                            <p class="method-desc">{{ t('support.methods.mcmod.desc') }}</p>
                            <a href="https://play.mcmod.cn/sv20188263.html" target="_blank" rel="noopener noreferrer" class="btn">{{ t('support.actions.goTo') }}
                                <svg  xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                            </a>
                        </div>
    
                        <div class="method-item">
                            <div class="method-header">
                                <i class="fas fa-heart method-icon"></i>
                                <h3 class="method-title">{{ t('support.methods.afdian.title') }}</h3>
                            </div>
                            <p class="method-desc">{{ t('support.methods.afdian.desc') }}</p>
                            <a href="https://afdian.com/a/Luminol" target="_blank" rel="noopener noreferrer" class="btn">{{ t('support.actions.goToSponsor') }}
                                <svg  xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                            </a>
                        </div>
    
                        <div class="method-item">
                            <div class="method-header">
                                <i class="fas fa-star method-icon"></i>
                                <h3 class="method-title">{{ t('support.methods.luminolcraft.title') }}</h3>
                            </div>
                            <p class="method-desc">{{ t('support.methods.luminolcraft.desc') }}</p>
                            <a href="https://github.com/LuminolCraft/" target="_blank" rel="noopener noreferrer" class="btn">{{ t('support.actions.viewProject') }}
                                <svg  xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                            </a>
                        </div>
    
                        <div class="method-item">
                            <div class="method-header">
                                <i class="fas fa-code method-icon"></i>
                                <h3 class="method-title">{{ t('support.methods.webSource.title') }}</h3>
                            </div>
                            <p class="method-desc">{{ t('support.methods.webSource.desc') }}</p>
                            <a href="https://github.com/LuminolCraft/craft.luminolsuki.moe" target="_blank" rel="noopener noreferrer" class="btn">{{ t('support.actions.viewProject') }}
                                <svg  xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                            </a>
                        </div>
                    </div>
                </section>
    
                <section class="thank-you">
                    <h3>{{ t('support.thankYou.title') }}</h3>
                    <p>{{ t('support.thankYou.desc1') }}</p>
                    <p>{{ t('support.thankYou.desc2') }}</p>
                </section>
            </div>
        </main>
    </template>
      
    
    <style scoped>
    @import '../styles/desktop/support-styles.css';
    @import '../styles/mobile/support-mobile.css';
    
    </style>
    
    <script setup lang="ts">
    import { useI18n } from 'vue-i18n';
    const { t } = useI18n();
    </script>