<template>
    <nav ref="navRef" :class="{ 'navbar-fixed': appConfig.navbarFixed }">
      <input type="checkbox" id="burger" class="burger-input" ref="burgerInput" @change="onBurgerChange">
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
               <a href="https://github.com/LuminolCraft" target="_blank" rel="noopener noreferrer"  class="logo-and-text "><span style="color: #818cf8;">Luminol</span>Craft
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
        </div>

      </div>

      <!-- 右侧操作区：主题切换 + 登录/账号入口 -->
      <div class="nav-actions">
        <TocToggles v-if="appConfig.showTocToggles" />
        <template v-if="auth.isAuthenticated">
          <router-link v-if="authz.hasPermission('admin:access')" to="/admin/users" class="nav-link">
            {{ t('auth.nav.admin') }}
          </router-link>
          <router-link to="/settings/profile" class="nav-link nav-user" :title="auth.me?.username">
            <UserAvatar :user-id="auth.me?.id" :name="auth.me?.username" :size="24" />
            <span>{{ auth.me?.username }}</span>
          </router-link>
          <router-link to="/settings/profile" class="nav-link">
            {{ t('auth.nav.account') }}
          </router-link>
          <button type="button" class="nav-auth-btn" :disabled="loggingOut" @click="onLogout">
            {{ loggingOut ? t('auth.security.revoking') : t('auth.nav.logout') }}
          </button>
        </template>
        <router-link v-else :to="loginTarget" class="nav-login-btn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
          </svg>
          {{ t('auth.nav.login') }}
        </router-link>
      </div>
    </nav>
  </template>
  <style scoped>
    @import '../styles/desktop/navigation.css';
    @import '../styles/mobile/navigation-mobile.css';

  /* 认证入口：退出登录按钮（在右侧操作区内，间距由 .nav-actions gap 控制） */
  .nav-auth-btn {
    display: inline-block;
    background: none;
    border: none;
    padding: 0;
    color: white;
    font-size: 1.1em;
    font-family: inherit;
    cursor: pointer;
    transition: color 0.3s;
  }
  .nav-auth-btn:hover {
    color: var(--button-hover);
  }
  .nav-auth-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .nav-auth-btn:focus-visible {
    outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
    outline-offset: 2px;
  }

  /* 登录入口：品牌色主按钮（右侧操作区内，间距由 .nav-actions gap 控制） */
  .nav-login-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 18px;
    background: var(--primary-color);
    color: var(--vercel-white);
    border-radius: 10px;
    font-size: 1em;
    font-weight: 600;
    line-height: 1;
    text-decoration: none;
    cursor: pointer;
    box-shadow: 0 2px 12px color-mix(in srgb, var(--primary-color) 40%, transparent);
    transition:
      filter 0.2s ease,
      transform 0.15s ease,
      box-shadow 0.2s ease;
  }
  .nav-login-btn:hover {
    color: var(--vercel-white);
    filter: brightness(1.12);
    transform: translateY(-1px);
    box-shadow: 0 4px 18px color-mix(in srgb, var(--primary-color) 55%, transparent);
  }
  .nav-login-btn:active {
    transform: translateY(0) scale(0.98);
  }
  .nav-login-btn:focus-visible {
    outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
    outline-offset: 2px;
  }
  .nav-login-btn svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  /* 用户入口：头像 + 用户名 */
  .nav-user {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .nav-user span {
    max-width: 10em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  </style>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import TocToggles from './TocToggles.vue'
import UserAvatar from './UserAvatar.vue'
import { appConfig } from '../config/app-config'
import { useGsap } from '@/composables/useGsap'
import { useAuthStore } from '@/stores/auth'
import { useAuthorizationStore } from '@/stores/authorization'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const authz = useAuthorizationStore()

const loggingOut = ref(false)

/** 登录入口：携带当前页路径，登录成功后回跳（站内路径由 store 校验） */
const loginTarget = computed(() => {
  if (route.path === '/login') return { path: '/login' }
  return { path: '/login', query: { redirect: route.fullPath } }
})

async function onLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await auth.signOut()
  } finally {
    loggingOut.value = false
    router.replace('/login')
  }
}

const burgerInput = ref<HTMLInputElement | null>(null)
const sideNav = ref<HTMLElement | null>(null)
const burger = ref<HTMLElement | null>(null)
const overlay = ref<HTMLElement | null>(null)
const navRef = ref<HTMLElement | null>(null)

const { create, reduceMotion } = useGsap({ scope: navRef })

const menuOpen = ref(false)
let sidebarTimeline: gsap.core.Timeline | null = null
let burgerLines: HTMLElement[] = []

function setMenuInstant(open: boolean) {
  if (!sideNav.value || !overlay.value || burgerLines.length < 3) return
  if (open) {
    gsap.set(overlay.value, { autoAlpha: 1 })
    gsap.set(sideNav.value, { xPercent: 0, autoAlpha: 1 })
    gsap.set(burgerLines[0]!, { rotate: 45, y: 7 })
    gsap.set(burgerLines[1]!, { autoAlpha: 0, scale: 0 })
    gsap.set(burgerLines[2]!, { rotate: -45, y: -7 })
  } else {
    gsap.set(overlay.value, { autoAlpha: 0 })
    gsap.set(sideNav.value, { xPercent: -100, autoAlpha: 0 })
    gsap.set(burgerLines[0]!, { rotate: 0, y: 0 })
    gsap.set(burgerLines[1]!, { autoAlpha: 1, scale: 1 })
    gsap.set(burgerLines[2]!, { rotate: 0, y: 0 })
  }
}

function onBurgerChange() {
  const open = burgerInput.value?.checked ?? false
  menuOpen.value = open
  if (reduceMotion()) {
    setMenuInstant(open)
    return
  }
  if (open) {
    sidebarTimeline?.play()
  } else {
    sidebarTimeline?.reverse()
  }
}

function closeSidebar() {
  if (burgerInput.value) burgerInput.value.checked = false
  menuOpen.value = false
  if (reduceMotion()) {
    setMenuInstant(false)
    return
  }
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
  create((g) => {
    const mm = g.matchMedia()

    // --- 桌面端：滚动感知背景（保持不变） ---
    mm.add('(min-width: 1024px)', () => {
      ScrollTrigger.create({
        start: 'top -50px',
        end: 99999,
        onUpdate: (self) => {
          const progress = Math.min(1, self.progress * 3)
          g.to('.navbar-glass-bg', {
            '--nav-alpha': progress,
            duration: 0.1,
          })
        },
      })
    })

    // --- 移动端：优化后的侧边栏动画 ---
    mm.add('(max-width: 896px)', () => {
      if (!sideNav.value || !overlay.value) return

      burgerLines = g.utils.toArray<HTMLElement>('.burger span')
      if (burgerLines.length < 3) return

      // 初始隐藏状态
      g.set(overlay.value, { autoAlpha: 0 })
      g.set(sideNav.value, { xPercent: -100, autoAlpha: 0 })

      // 🚀 优化动画：更快、更协调
      sidebarTimeline = g.timeline({
        paused: true,
        defaults: {
          ease: 'power3.out', // 更干脆的缓动
        },
      })
        // 1. overlay 淡入（稍慢，营造氛围）
        .to(overlay.value, {
          autoAlpha: 1,
          duration: 0.25,
          ease: 'power2.out',
        }, 0)
        // 2. 侧边栏滑入（主动画，稍快）
        .fromTo(sideNav.value,
          { xPercent: -100, autoAlpha: 0 },
          {
            xPercent: 0,
            autoAlpha: 1,
            duration: 0.35,
            ease: 'power3.out',
          },
          0.05, // 比 overlay 晚 0.05s，有层次感
        )
        // 3. 三条 span 的错落动画（每条间隔 0.04s）
        // 第1条：旋转 + 上移
        .to(burgerLines[0]!, {
          rotate: 45,
          y: 7,
          duration: 0.2,
          ease: 'power2.out',
        }, 0)
        // 第2条：淡出 + 缩小（0.1s 延迟，让中间那条消失得优雅）
        .to(burgerLines[1]!, {
          autoAlpha: 0,
          scale: 0.4,
          duration: 0.15,
          ease: 'power2.out',
        }, 0.06)
        // 第3条：旋转 + 下移（比第1条晚 0.06s，形成波浪）
        .to(burgerLines[2]!, {
          rotate: -45,
          y: -7,
          duration: 0.2,
          ease: 'power2.out',
        }, 0.08)

      // 关闭动画：只需要反向播放，GSAP 会自动反转所有 tweens
      // 但如果希望关闭比打开更快，可以设置 reverse 的速度
      sidebarTimeline.timeScale(1.2) // 整体加速 1.2 倍
    })
  })

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
