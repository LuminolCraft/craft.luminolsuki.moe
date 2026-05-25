<template>
    <nav :class="{ 'navbar-fixed': appConfig.navbarFixed }">
      <input type="checkbox" id="burger" class="burger-input" ref="burgerInput">
      <label class="burger" for="burger" ref="burger">
        <span></span>
        <span></span>
        <span></span>
      </label>

      <!-- 侧边导航栏 -->
      <div class="side-nav" ref="sideNav">
        <router-link to="/">
          {{ t('common.home') }}
        </router-link>
        <router-link to="/SimpleRules" class="nav-link">
           {{ t('common.rules') }} <!--({{ t('common.rules') }}) -->
        </router-link>
        <!-- <a class="dropdown-ico" href="https://docs.qq.com/pdf/DQUZYS0FKenFmYWZx" target="_blank" rel="noopener noreferrer">
          {{ t('common.rules') }} ({{ t('common.detailedRules') }})
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="external-link-icon" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path>
            </svg>
        </a> -->
        <router-link to="/Support">
          {{ t('common.support') }}
        </router-link>
        <router-link to="/News">
          {{ t('common.news') }}
        </router-link>
        <!-- <router-link to="/Monitoring">
          {{ t('common.monitoring') }}
        </router-link> -->
        <TocToggles v-if="appConfig.showTocToggles" />
      </div>

      <div class="side-nav-overlay" ref="overlay"></div>
  
      <div class="logo-and-title">
            <div class="logo-container">
                <img src="https://imagehosting-ez2.pages.dev/images/c25a955166388e1257c23d01c78a62e6.webp" alt="logo" loading="lazy">
            </div>
            <div class="text-wrap">
                <a href="https://luminolsuki.moe/" target="_blank" rel="noopener noreferrer"  class="logo-and-text "><span style="color: #818cf8;">Luminol</span>MC
                    <svg  xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="external-link-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                </a>
            </div>
        </div>
  
      <div class="AAA">
        <div class="nav-links">
          <router-link to="/" class="nav-link">
          {{ t('common.home') }}
        </router-link>
        
          <router-link to="/SimpleRules" class="nav-link">
            {{ t('common.rules') }}
          </router-link>
          <!-- <a href="https://docs.qq.com/pdf/DQUZYS0FKenFmYWZx" target="_blank" rel="noopener noreferrer" class="nav-link">{{ t('common.detailedRules') }}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="external-link-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
          </a> -->
          <router-link to="/Support" class="nav-link">
            {{ t('common.support') }}
          </router-link>
          <router-link to="/News" class="nav-link">
            {{ t('common.news') }}
          </router-link>
          <!-- <router-link to="/Monitoring" class="nav-link">
            {{ t('common.monitoring') }}
          </router-link> -->
          <TocToggles v-if="appConfig.showTocToggles" />
        </div>
        
      </div>
    </nav>
  </template>
  <style scoped>
    @import '../styles/desktop/navigation.css';
    @import '../styles/mobile/navigation-mobile.css';
  </style>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import TocToggles from './TocToggles.vue'
import { appConfig } from '../config/app-config'
import { useGsap } from '@/composables/useGsap'

const { t } = useI18n()
const router = useRouter()

const burgerInput = ref<HTMLInputElement | null>(null)
const sideNav = ref<HTMLElement | null>(null)
const burger = ref<HTMLElement | null>(null)
const overlay = ref<HTMLElement | null>(null)
const navRef = ref<HTMLElement | null>(null)

const { create } = useGsap({ scope: navRef })

let sidebarTimeline: gsap.core.Timeline | null = null
let closeSidebar: () => void

create(() => {
  // --- 桌面端：滚动感知背景 ---
  const mm = gsap.matchMedia()
  mm.add('(min-width: 1024px)', () => {
    ScrollTrigger.create({
      start: 'top -50px',
      end: 99999,
      onUpdate: (self) => {
        const progress = Math.min(1, self.progress * 3)
        gsap.to('.navbar-glass-bg', {
          '--nav-alpha': progress,
          duration: 0.1,
        })
      },
    })
  })

  // --- 移动端侧边栏 timeline ---
  sidebarTimeline = gsap.timeline({ paused: true })
    .to(overlay.value, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' }, 0)
    .fromTo(sideNav.value,
      { x: '100%' },
      { x: '0%', duration: 0.35, ease: 'power3.out' },
      0,
    )

})

// --- 侧边栏控制 ---
closeSidebar = () => {
  if (burgerInput.value) burgerInput.value.checked = false
  sidebarTimeline?.reverse()
}

const handleClickOutside = (event: MouseEvent) => {
  if (!burgerInput.value || !sideNav.value || !burger.value) return
  if (
    !sideNav.value.contains(event.target as Node) &&
    !burger.value.contains(event.target as Node) &&
    event.target !== burgerInput.value
  ) {
    closeSidebar()
  }
  if (overlay.value && overlay.value.contains(event.target as Node)) {
    closeSidebar()
  }
}

const handleSideNavClick = (event: Event) => {
  const target = event.target as HTMLElement
  const link = target.closest('a, .router-link-active')
  if (link) {
    setTimeout(() => closeSidebar(), 100)
  }
}

watch(() => router.currentRoute.value, () => {
  closeSidebar()
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (sideNav.value) {
    sideNav.value.addEventListener('click', handleSideNavClick)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (sideNav.value) {
    sideNav.value.removeEventListener('click', handleSideNavClick)
  }
})
</script>