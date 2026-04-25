// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),

    meta: {
      og: {
        title: 'LuminolCraft 服务器 - 加入我们的冒险',
        description: 'LuminolCraft 是 LuminolMC 附属的 Minecraft 服务器，拥有综合生存与纯净生存两个子服，管理活跃，欢迎加入我们!',
        image: {
          url: 'https://imagehosting-ez2.pages.dev/images/c25a955166388e1257c23d01c78a62e6.webp',
          width: 1200,
          height: 630,
          alt: 'LuminolCraft 服务器游戏截图'
        }
      }
    }
  },
  {
    path: '/SimpleRules',
    name: 'SimpleRules',
    component: () => import('../views/SimpleRules.vue'),
    meta: {
      og: {
        title: 'LuminolCraft 服务器规则(简洁版)',
        description: 'LuminolCraft 服务器的简洁规则说明，确保游戏环境公平和谐，包含行为准则与生存规则。',
        image: {
          url: 'https://imagehosting-ez2.pages.dev/images/c25a955166388e1257c23d01c78a62e6.webp',
          width: 1200,
          height: 630,
          alt: 'LuminolCraft 服务器规则说明'
        }
      }
    }
  },
  {
    path: '/Support',
    name: 'support',
    component: () => import('../views/Support.vue'),
    meta: {
      og: {
        title: '支持我们 - LuminolCraft 服务器',
        description: '通过捐赠和支持帮助 LuminolCraft 服务器维持运营，解锁更多游戏福利与活动，感谢您的贡献！',
        image: {
          url: 'https://imagehosting-ez2.pages.dev/images/c25a955166388e1257c23d01c78a62e6.webp',
          width: 1200,
          height: 630,
          alt: 'LuminolCraft 服务器支持页面'
        }
      }
    }
  },
  {
    path: '/News',
    name: 'news',
    component: () => import('../views/News.vue'),
    meta: {
      og: {
        title: 'LuminolCraft 服务器 - 最新新闻与公告',
        description: '了解 LuminolCraft 服务器的最新动态、活动和更新，第一时间获取游戏内重要信息。',
        image: {
          url: 'https://imagehosting-ez2.pages.dev/images/c25a955166388e1257c23d01c78a62e6.webp',
          width: 1200,
          height: 630,
          alt: 'LuminolCraft 服务器新闻公告'
        }
      }
    }
  },
  {
    path: '/NewsDetail',
    name: 'newsdetail',
    component: () => import('../views/NewsDetail.vue'),
    meta: {
      og: {
        title: 'LuminolCraft 服务器 - 最新新闻与公告',
        description: '了解 LuminolCraft 服务器的最新动态、活动和更新，第一时间获取游戏内重要信息。',
        image: {
          url: 'https://imagehosting-ez2.pages.dev/images/c25a955166388e1257c23d01c78a62e6.webp',
          width: 1200,
          height: 630,
          alt: 'LuminolCraft 服务器新闻公告'
        }
      }
    },
    props: (route: RouteLocationNormalizedLoaded) => ({ id: route.query.id }),
    alias: ['/news-detail', '/news-detail.html', '/NewsDetail.html']
  },
  {
    path: '/Archive',
    name: 'Archive',
    component: () => import('../views/Archive.vue'),
    meta: {
      og: {
        title: 'LuminolCraft 服务器监控',
        description: '实时监控 LuminolCraft 服务器的状态、玩家数量与性能指标，确保游戏体验流畅稳定。',
        image: {
          url: 'https://imagehosting-ez2.pages.dev/images/c25a955166388e1257c23d01c78a62e6.webp',
          width: 1200,
          height: 630,
          alt: 'LuminolCraft 服务器监控面板'
        }
      }
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
  routes,
  // scrollBehavior(to, from, savedPosition) {                       //滚动行为 参数to:要进入的路由对象  from:离开的路由对象 savedPosition:如果是浏览器前进后退按钮触发的导航会有值（如 { left: 0, top: 500 }）
  //           if (savedPosition) {                                        //如果有保存的位置，返回到该位置。情况一：用户点击浏览器 后退/前进
  //               return savedPosition
  //           }else if (to.hash) {                                        //如果有锚点，滚动到锚点  情况二：用户点击带锚点的链接
  //               return { el: to.hash, behavior: 'smooth' }              //滚动到锚点，并且平滑滚动（behavior:'smooth'）
  //           }
  //           else {                                                      //其他情况，滚动到顶部  情况三：用户点击普通链接
  //               return { left: 0, top: 0 }
  //           }
  //       }
})



export default router
