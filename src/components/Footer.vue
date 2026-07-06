<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { useGsap } from '@/composables/useGsap'
import { EASINGS, DURATIONS } from '@/gsap'
import { appConfig } from '../config/app-config'

const { t } = useI18n()

const websiteVersion = ref('加载中...')
const websiteFullHash = ref('')
const websiteBranch = ref('main')
const websiteUptime = ref('计算中...')

const footerRef = ref<HTMLElement | null>(null)
const { create } = useGsap({ scope: footerRef })

const canClickVersion = computed(() => {
    return websiteVersion.value !== '加载中...' && websiteVersion.value !== '计算中...'
})

const displayVersion = computed(() => {
    if (websiteVersion.value === '加载中...' || websiteVersion.value === '计算中...') return websiteVersion.value
    return websiteVersion.value.slice(0, 7)
})

const fetchVersion = async () => {
    const isLocalDev = window.location.hostname.includes('localhost') || 
                      window.location.hostname.includes('127.0.0.1')
    
    if (isLocalDev) {
        websiteVersion.value = 'dev'
        websiteFullHash.value = 'dev'
        return
    }
    
    try {
        const response = await fetch('/.netlify/functions/version', {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        })
        
        if (response.ok) {
            const data = await response.json()
            if (data.version && data.version !== 'unknown') {
                websiteVersion.value = data.version
                websiteFullHash.value = data.fullHash || data.version
                websiteBranch.value = data.branch || 'main'
            } else {
                websiteVersion.value = __APP_VERSION__
                websiteFullHash.value = __APP_VERSION__
            }
        }
    } catch (error) {
      console.error('获取版本失败:', error)
      websiteVersion.value = __APP_VERSION__
      websiteFullHash.value = __APP_VERSION__
    }
}

const calculateUptime = () => {
    const startDate = new Date('2025-07-23T11:57:00+08:00')
    const currentDate = new Date()
    const timeDiff = currentDate.getTime() - startDate.getTime()
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24))
    websiteUptime.value = `${daysDiff}`
}

const goToVersionCommit = () => {
    if (!canClickVersion.value) {
        return
    }

    const repoUrl = 'https://github.com/LuminolCraft/craft.luminolsuki.moe'
    const branch = websiteBranch.value || 'main'
    window.open(`${repoUrl}/commits/${branch}`, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
    fetchVersion()
    calculateUptime()

    create(() => {
      const mm = gsap.matchMedia()

      // --- 减少动画偏好：直接显示终态，不启动 MorphSVG 与 hover ---
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.footer-links .footer-column', { autoAlpha: 1, y: 0 })
        gsap.set('.website-status-info .status-item', { autoAlpha: 1, y: 0 })
      })

      // --- 正常动画 ---
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // MorphSVG 海浪形变：path-a → path-b 形状，yoyo 往返
        gsap.to('.footer-wave-path-a', {
          morph: { shape: '.footer-wave-path-b', shapeIndex: 'auto' },
          duration: 8,
          ease: EASINGS.smooth,
          repeat: -1,
          yoyo: true,
        })

        // Footer 栏目入场
        gsap.fromTo('.footer-links .footer-column',
          { autoAlpha: 0, y: 40 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.15,
            duration: DURATIONS.scrollReveal,
            ease: EASINGS.entrance,
            scrollTrigger: {
              trigger: 'footer',
              start: 'top 85%',
              once: true,
            },
          },
        )

        // 状态信息入场
        gsap.fromTo('.website-status-info .status-item',
          { autoAlpha: 0, y: 20 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.1,
            duration: DURATIONS.entrance,
            ease: EASINGS.entrance,
            scrollTrigger: {
              trigger: '.website-status-info',
              start: 'top 90%',
              once: true,
            },
          },
        )

        // 社交/外链图标 hover：错峰缩放 scale 1.15
        const icons = gsap.utils.toArray('.footer-column a')
        const linksEl = gsap.utils.toArray<HTMLElement>('.footer-links')[0]
        if (linksEl) {
          const onEnter = () => gsap.to(icons, {
            scale: 1.15,
            duration: DURATIONS.hover,
            ease: EASINGS.hover,
            stagger: gsap.utils.distribute({ from: 'random', amount: 0.3 }),
          })
          const onLeave = () => gsap.to(icons, {
            scale: 1,
            duration: DURATIONS.hover,
            ease: EASINGS.hover,
          })
          linksEl.addEventListener('mouseenter', onEnter)
          linksEl.addEventListener('mouseleave', onLeave)
        }
      })
    })
  })
</script>

<template>
    <div ref="footerRef">
    <div class="footer-transition-section">
        <div class="footer-wave-divider">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="wave-grad-1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--bases-footer-background-color)" stop-opacity="0" />
                    <stop offset="40%" stop-color="var(--bases-footer-background-color)" stop-opacity="0.15" />
                    <stop offset="100%" stop-color="var(--bases-footer-background-color)" stop-opacity="0.35" />
                  </linearGradient>
                  <linearGradient id="wave-grad-3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--bases-footer-background-color)" stop-opacity="0.3" />
                    <stop offset="60%" stop-color="var(--bases-footer-background-color)" stop-opacity="0.8" />
                    <stop offset="100%" stop-color="var(--bases-footer-background-color)" stop-opacity="1" />
                  </linearGradient>
                </defs>
                <path class="footer-wave-path footer-wave-path-b" fill="url(#wave-grad-1)" d="M0,120V70.71c47.79-25.2,103.59-35.17,158-31,70.36,4.37,136.33,32.31,206.8,36.5C438.64,85.57,512.34,64.33,583,45.95c69.27-20,138.3-27.88,209.4-16.08,36.15,5,69.85,16.84,104.45,28.34C989.49,93,1113,132.29,1200,65.53V120Z"></path>
                <path class="footer-wave-path footer-wave-path-a" fill="url(#wave-grad-3)" d="M0,120V73.71c47.79-22.2,103.59-32.17,158-28,70.36,5.37,136.33,33.31,206.8,37.5C438.64,87.57,512.34,66.33,583,47.95c69.27-18,138.3-24.88,209.4-13.08,36.15,6,69.85,17.84,104.45,29.34C989.49,95,1113,134.29,1200,67.53V120Z"></path>
            </svg>
        </div>
    </div>
    <footer>
        <div class="footer-links">
            <div class="footer-column">
                <h3>{{ t('footer.relatedLinks') }}</h3>
                <ul>
                    <li><a href="https://qm.qq.com/q/39rZKHurJe" target="_blank" rel="noopener noreferrer">{{ t('footer.qqGroup') }}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                    </a></li>
                    <li><a href="https://www.mczfw.cn/" target="_blank" rel="noopener noreferrer">{{ t('footer.minecraftServerList') }}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                    </a></li>
                    <li><a href="https://afdian.com/a/Luminol" target="_blank" rel="noopener noreferrer">{{ t('footer.afdian') }}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                    </a></li>
                    <li><a href="https://github.com/LuminolCraft/" target="_blank" rel="noopener noreferrer">{{ t('footer.github') }}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                    </a></li>
                </ul>
            </div>
            
            <div class="footer-column">
                <h3>{{ t('footer.promotionPosts') }}</h3>
                <ul>
                    <li><a href="https://www.minebbs.com/threads/luminolcraft.35730/" target="_blank" rel="noopener noreferrer">MineBBS<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg></a></li>
                    <li><a href="https://play.mcmod.cn/sv20188263.html" target="_blank" rel="noopener noreferrer">mcmod 找服玩<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg></a></li>
                    <li><a href="https://www.mcshuo.com/thread-3298-1-1.html" target="_blank" rel="noopener noreferrer">McFun<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg></a></li>
                    <li><a href="https://klpbbs.com/thread-162318-1-1.html" target="_blank" rel="noopener noreferrer">Klpbbs<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg></a></li>
                </ul>
            </div>
        </div>
    <div class="website-status-info">
        <div 
            class="status-item" 
            id="version-status-item" 
            :class="{ 'clickable': canClickVersion }"
            @click="goToVersionCommit"
        >
            <i class="fas fa-code-branch"></i>
            <span>{{ t('footer.version') }} <span>{{ displayVersion }}</span></span>
        </div>
        <div class="status-item">
            <i class="fas fa-clock"></i>
            <span>{{ t('footer.uptime') }} <span>{{ websiteUptime }}{{ t('footer.upday') }}</span></span>
        </div>
    </div>
        <div class="copyright-info" v-if="appConfig.showFooterCopyright">
            <p>{{ t('footer.copyright', { year: '2025-2026' }) }}</p>
            <p>{{ t('footer.disclaimer') }}</p>
            <p>{{ t('footer.font') }}<a href="https://hyperos.mi.com/font/" target="_blank" rel="noopener noreferrer">MiSans
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
            </a></p>
            <p>{{ t('footer.poweredBy') }} <a href="https://www.netlify.com/" target="_blank" rel="noopener noreferrer">Netlify
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
            </a></p>
        </div>
    </footer>
    </div>
</template>

<style scoped>

li{
    list-style-type: none;
}
p{
    color: var(--color-footer-text);
}
.footer-transition-section {
    position: relative;
    height: 150px;
    overflow: hidden;
}

.footer-wave-divider {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 150px;
    z-index: 1;
}

.footer-wave-divider svg {
    width: 100%;
    height: 100%;
    display: block;
}

.footer-wave-path {
    will-change: transform, opacity;
}

/* Footer base */
footer {
    
    padding: 60px 20px 30px;
    background: var(--bases-footer-background-color);
    color: var(--color-footer-text);
    text-align: center;
    position: relative;
    margin-top: -2px;
}
footer p {
    text-align: center;
}

.social-links {
    margin-bottom: 25px;
}

.social-links a {
    display: inline-block;
    margin: 0 12px;
    color: var(--color-footer-text);
    font-size: 1.3em;
    transition: all 0.3s;
}

.social-links a:hover {
    color: var(--color-footer-text);
    transform: translateY(-4px);
}
/* Website status info */
.website-status-info {
    display: flex;
    justify-content: center;
    gap: 30px;
    margin: 25px 0 15px 0;
    flex-wrap: wrap;
    opacity: 0.8;
    font-size: 0.9em;
}

.status-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ccc;
    transition: color 0.3s ease, background 0.3s ease;
    will-change: transform, opacity;
    padding: 8px 12px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-item:hover {
    color: var(--primary-color);
    background: rgba(158, 148, 216, 0.1);
    transform: translateY(-2px);
}

.status-item i {
    font-size: 14px;
    color: var(--primary-color);
    opacity: 0.8;
}

.status-item span {
    font-family: var(--font-primary);
    font-weight: 500;
}

.status-item span span {
    font-weight: 600;
    color: #fff;
    opacity: 0.9;
}

/* Clickable version item */
#version-status-item.clickable {
    cursor: pointer;
    position: relative;
}

#version-status-item.clickable:hover {
    color: var(--primary-color);
    background: rgba(158, 148, 216, 0.15);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(158, 148, 216, 0.2);
}

#version-status-item.clickable:hover i {
    color: var(--primary-color);
    opacity: 1;
}

#version-status-item:hover span span {
    color: var(--primary-color);
    opacity: 1;
}

#version-status-item:active {
    transform: translateY(0);
    background: rgba(158, 148, 216, 0.2);
}


/* Footer link columns */
.footer-links {
    display: flex;
    justify-content: center;
    gap: 40px;
    margin: 30px 0;
    flex-wrap: wrap;
}

.footer-column {
    will-change: transform, opacity;
}

.footer-column h3 {
    color: var(--color-footer-text);
    margin-bottom: 15px;
    font-size: 1.2em;
}

.footer-column ul {
    list-style: none;
    padding: 0;
}

.footer-column li {
    margin-bottom: 8px;
}

.footer-column a {
    color: var(--color-footer-text);
    text-decoration: none;
    transition: color 0.3s;
    will-change: transform, opacity;
}

.footer-column a:hover {
    color: var(--color-footer-text);
}

.footer-column svg{
    width: 18px;
    height: 18px;
    margin-left: 8px;
}


/* Copyright */
.copyright-info {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.9em;
    color: var(--color-footer-text);
}

.copyright-info p {
    margin: 8px 0;
}

.copyright-info a:any-link {
    color: var(--color-footer-text);
}

.copyright-info a:hover {
    color: var(--color-footer-text);
}

.copyright-info svg {
    width: 12px;
    height: 12px;
    margin-left: 8px;
}

</style>

