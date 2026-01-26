<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const websiteVersion = ref('加载中...')
const websiteFullHash = ref('')
const websiteUptime = ref('计算中...')

const canClickVersion = computed(() => {
    return websiteVersion.value !== '加载中...' && websiteVersion.value !== '计算中...'
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
            }
        }
    } catch (error) {
        console.error('获取版本失败:', error)
        websiteVersion.value = 'unknown'
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
    
    const githubRepoUrl = 'https://github.com/LuminolCraft/luminolcraft-vue-main'
    let githubUrl
    
    if (websiteVersion.value === 'dev') {
        githubUrl = `${githubRepoUrl}/tree/main`
    } else if (websiteFullHash.value && websiteFullHash.value !== 'unknown' && websiteFullHash.value !== 'dev') {
        githubUrl = `${githubRepoUrl}/commit/${websiteFullHash.value}`
    } else if (websiteVersion.value && websiteVersion.value !== 'unknown' && websiteVersion.value !== 'dev') {
        githubUrl = `${githubRepoUrl}/commit/${websiteVersion.value}`
    } else {
        githubUrl = `${githubRepoUrl}/tree/main`
    }
    
    window.open(githubUrl, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
    fetchVersion()
    calculateUptime()
})
</script>

<template>
    <div class="footer-transition-section">
        <div class="footer-wave-divider">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path class="footer-wave-path" opacity=".3" fill="var(--footer-background-color)"></path>
                <path class="footer-wave-path" opacity=".6" fill="var(--footer-background-color)"></path>
                <path class="footer-wave-path" fill="var(--footer-background-color)"></path>
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
            <span>{{ t('footer.version') }} <span>{{ websiteVersion }}</span></span>
        </div>
        <div class="status-item">
            <i class="fas fa-clock"></i>
            <span>{{ t('footer.uptime') }} <span>{{ websiteUptime }}</span></span>
        </div>
    </div>
        <div class="copyright-info">
            <p>{{ t('footer.copyright', { year: 2025-2026 }) }}</p>
            <p>{{ t('footer.disclaimer') }}</p>
            <p>{{ t('footer.font') }}<a href="https://hyperos.mi.com/font/" target="_blank" rel="noopener noreferrer">MiSans
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
            </a></p>
            <p>{{ t('footer.poweredBy') }} <a href="https://www.netlify.com/" target="_blank" rel="noopener noreferrer">Netlify
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
            </a></p>
        </div>
    </footer>
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

.footer-wave-divider svg path {
    animation: wave-animation 20s ease-in-out infinite alternate;
}

/* 为不同层次的波浪设置不同的动画延迟和时长，创造更自然的波浪效果 */
.footer-wave-divider svg path:nth-child(1) {
    animation-duration: 25s;
    animation-delay: -1s;
}

.footer-wave-divider svg path:nth-child(2) {
    animation-duration: 20s;
    animation-delay: -2s;
}

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

.footer-wave-path {
    fill: var(--footer-background-color);
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
    transition: all 0.3s ease;
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

