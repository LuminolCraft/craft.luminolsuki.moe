<template>
    <nav>
      <input type="checkbox" id="burger" class="burger-input" ref="burgerInput">
      <label class="burger" for="burger">
        <span></span>
        <span></span>
        <span></span>
      </label>
  
      <!-- 侧边导航栏 -->
      <div class="side-nav">
        <router-link to="/">{{ t('common.home') }}</router-link>
        <router-link to="/SimpleRules">{{ t('common.rules') }} ({{ t('common.simpleRules') }})</router-link>
        <a class="dropdown-ico" href="https://docs.qq.com/pdf/DQUZYS0FKenFmYWZx" target="_blank" rel="noopener noreferrer">
          {{ t('common.rules') }} ({{ t('common.detailedRules') }})
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path>
            </svg>
        </a>
        <router-link to="/Support">{{ t('common.support') }}</router-link>
        <router-link to="/News">{{ t('common.news') }}</router-link>
        <router-link to="/Monitoring">{{ t('common.monitoring') }}</router-link>
      </div>
  
      <div class="side-nav-overlay"></div>
  
      <div class="logo-and-title">
            <div class="logo-container">
                <img src="https://imagehosting-ez2.pages.dev/images/c25a955166388e1257c23d01c78a62e6.webp" alt="logo" loading="lazy">
            </div>
            <div class="text-wrap">
                <a href="https://luminolsuki.moe/" target="_blank" rel="noopener noreferrer"  class="logo-and-text ">LuminolMC
                    <svg  xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                </a>
            </div>
        </div>
  
      <div class="AAA">
        <div class="nav-links">
          <!-- <router-link to="/">主页</router-link> -->
          <a href="/">{{ t('common.home') }}</a>
          <div class="dropdown">
            <a href="#" class="dropdown-toggle">{{ t('common.rules') }}
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </a>
            <div class="dropdown-menu">
                <router-link class="dropdown-item" to="/SimpleRules">{{ t('common.simpleRules') }}</router-link>
                    <!-- <svg  xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg> -->
                <a href="https://docs.qq.com/pdf/DQUZYS0FKenFmYWZx" target="_blank" rel="noopener noreferrer"  class="dropdown-item">{{ t('common.detailedRules') }}
                    <svg  xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                </a>
            </div>
        </div>
          <router-link to="/Support">{{ t('common.support') }}</router-link>
          <router-link to="/News">{{ t('common.news') }}</router-link>
          <router-link to="/Monitoring">{{ t('common.monitoring') }}</router-link>
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
import { ref, onMounted, onUnmounted } from 'vue'

const { t } = useI18n()

// 获取burger复选框元素
const burgerInput = ref<HTMLInputElement | null>(null)

// 点击外部区域关闭侧边栏的处理函数
const handleClickOutside = (event: MouseEvent) => {
  // 确保burgerInput已获取
  if (!burgerInput.value) return
  
  // 获取侧边栏和汉堡菜单元素
  const sideNav = document.querySelector('.side-nav')
  const burger = document.querySelector('.burger')
  
  // 检查点击目标是否在侧边栏或汉堡菜单外部
  if (
    sideNav && 
    burger && 
    !sideNav.contains(event.target as Node) && 
    !burger.contains(event.target as Node) &&
    event.target !== burgerInput.value
  ) {
    // 关闭侧边栏
    burgerInput.value.checked = false
  }
}

// 组件挂载时添加事件监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

// 组件卸载时移除事件监听，避免内存泄漏
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>