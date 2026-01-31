// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: {
      title: 'LuminolCraft 服务器 - 加入我们的冒险',
      description: 'LuminolCraft 是 LuminolMC 附属的 Minecraft 服务器，拥有综合生存与纯净生存两个子服，管理活跃，欢迎加入我们!'
    }
  },
  {
    path: '/SimpleRules',
    name: 'SimpleRules',
    component: () => import('../views/SimpleRules.vue'),
    meta: {
      title: 'LuminolCraft 服务器规则(简洁版)',
      description: 'LuminolCraft 是 LuminolMC 附属的 Minecraft 服务器，拥有综合生存与纯净生存两个子服，管理活跃，欢迎加入我们！'
    }
  },
  {
    path: '/Support',
    name: 'support',
    component: () => import('../views/Support.vue'),
    meta: {
      title: 'LuminolCraft 服务器 - 感谢您的支持',
      description: 'LuminolCraft 是 LuminolMC 附属的 Minecraft 服务器，拥有综合生存与纯净生存两个子服，管理活跃，欢迎加入我们！'
    }
  },
  {
    path: '/News',
    name: 'news',
    component: () => import('../views/News.vue'),
    meta: {
      title: 'LuminolCraft 服务器 - 了解服务器的最新资讯',
      description: 'LuminolCraft 是 LuminolMC 附属的 Minecraft 服务器，拥有综合生存与纯净生存两个子服，管理活跃，欢迎加入我们！'
    }
  },
  {
    path: '/NewsDetail',
    name: 'newsdetail',
    component: () => import('../views/NewsDetail.vue'),
    meta: {
      title: 'LuminolCraft 新闻详情',
      description: 'LuminolCraft 是 LuminolMC 附属的 Minecraft 服务器，拥有综合生存与纯净生存两个子服，管理活跃，欢迎加入我们！'
    },
    props: (route: RouteLocationNormalizedLoaded) => ({ id: route.query.id }),
    alias: ['/news-detail', '/news-detail.html', '/NewsDetail.html']
  },
  {
    path: '/Monitoring',
    name: 'monitoring',
    component: () => import('../views/Monitoring.vue'),
    meta: {
      title: 'LuminolCraft 服务器监控',
      description: 'LuminolCraft 是 LuminolMC 附属的 Minecraft 服务器，拥有综合生存与纯净生存两个子服，管理活跃，欢迎加入我们！'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: {
      title: '找不到页面喵qwq - LuminolCraft',
      description: '访问不到页面喵~。'
    }
  }
]



const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
