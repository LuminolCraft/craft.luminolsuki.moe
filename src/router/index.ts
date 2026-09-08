// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuthorizationStore } from '@/stores/authorization'
import { ADMIN_ACCESS_PERMISSION } from '@/types/nexus'
// 首页静态导入：与导航栏/页脚同帧渲染，消除懒加载导致的二次请求白屏等待
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,

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
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { hideChrome: true, guestOnly: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { hideChrome: true, guestOnly: true }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/ForgotPassword.vue'),
    meta: { hideChrome: true, guestOnly: true }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/ResetPassword.vue'),
    meta: { hideChrome: true, guestOnly: true }
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: () => import('../views/VerifyEmail.vue'),
    meta: { hideChrome: true }
  },
  {
    // QQ 关联失败落地页：后端 Better Auth genericOAuth 302 到 /auth/link-error?error=<code>
    path: '/auth/link-error',
    name: 'AuthLinkError',
    component: () => import('../views/auth/LinkAccountError.vue'),
    meta: { hideChrome: true }
  },
  // ---------- 用户中心（侧边栏布局壳） ----------
  {
    path: '/settings',
    component: () => import('../components/settings/SettingsLayout.vue'),
    redirect: { name: 'SettingsProfile' },
    meta: { requiresAuth: true },
    children: [
      {
        path: 'profile',
        name: 'SettingsProfile',
        component: () => import('../views/settings/ProfileView.vue'),
        meta: {
          og: { title: '个人资料 - LuminolCraft 服务器', description: '管理你的公开身份与账号信息。' }
        }
      },
      {
        path: 'minecraft',
        name: 'SettingsMinecraft',
        component: () => import('../views/settings/MinecraftView.vue'),
        meta: {
          og: { title: 'Minecraft 绑定 - LuminolCraft 服务器', description: '绑定你的游戏身份，管理主号与小号关联。' }
        }
      },
      {
        path: 'security',
        name: 'AccountSecurity',
        component: () => import('../views/AccountSecurity.vue'),
        meta: {
          og: { title: '账号与安全 - LuminolCraft 服务器', description: '查看并管理你的登录设备与会话。' }
        }
      }
    ]
  },
  // ---------- 管理后台（独立控制台布局壳，沉浸式无站点导航） ----------
  {
    path: '/admin',
    component: () => import('../components/admin/AdminLayout.vue'),
    redirect: { name: 'AdminUsers' },
    meta: {
      requiresAuth: true,
      requiresPermission: ADMIN_ACCESS_PERMISSION,
      hideChrome: true
    },
    children: [
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/UsersView.vue'),
        meta: { og: { title: '用户管理 - LuminolCraft', description: '管理站内用户与角色。' } }
      },
      {
        path: 'users/:id',
        name: 'AdminUserDetail',
        component: () => import('../views/admin/UserDetail.vue'),
        meta: { og: { title: '用户详情 - LuminolCraft', description: '查看用户资料、角色与 Minecraft 账号。' } }
      },
      {
        path: 'bans',
        name: 'AdminBans',
        component: () => import('../views/admin/BansView.vue'),
        meta: { og: { title: '封禁管理 - LuminolCraft', description: '查看、修改与撤销站内封禁。' } }
      },
      {
        path: 'audit',
        name: 'AdminAudit',
        component: () => import('../views/admin/AuditView.vue'),
        meta: { og: { title: '审计日志 - LuminolCraft', description: '追踪站内敏感操作。' } }
      }
    ]
  },
  // 403 视图：独立于 /admin 布局，不带 requiresPermission，避免守卫循环
  {
    path: '/admin/forbidden',
    name: 'AdminForbidden',
    component: () => import('../views/admin/ForbiddenView.vue'),
    meta: { requiresAuth: true, hideChrome: true }
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
  scrollBehavior(to, from, savedPosition) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (savedPosition) {
          resolve(savedPosition)
        } else if (to.hash) {
          resolve({ el: to.hash, behavior: 'smooth' })
        } else {
          resolve({ left: 0, top: 0, behavior: 'instant' })
        }
      }, 0)
    })
  }
})

// ---------- 登录态守卫 ----------
// 登录态 Source of Truth 是服务端 Better Auth Session（get-session + GET /me），store 只是 UI 缓存。
// 公开路由绝不阻塞导航：initialize 后台静默执行（导航栏等 UI 会在就绪后自动更新），
// 否则初始化慢时会卡住整个导航，导致 router-view 迟迟不渲染（首屏只剩导航栏/页脚）。
// 仅受保护路由必须先确认登录态。
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.initialized) {
    if (to.meta.requiresAuth || to.meta.guestOnly) {
      // 受保护路由与 guest 页（登录/注册等）都必须先确认真实登录态；
      // guest 页等待是可接受的（独立页无首屏压力），否则已登录用户刷新登录页会闪现表单。
      try {
        await auth.initialize()
      } catch {
        /* 网络/服务端异常：不清登录态、放行，由页面内部自行处理 */
      }
    } else {
      auth.initialize().catch(() => {})
    }
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  // 已登录用户访问登录/注册等 guest 页 → 重定向回首页（含另一标签页登录后刷新的场景）
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { path: '/' }
  }

  // ---------- 权限守卫（仅前端体验优化，真实裁决永远在后端 API） ----------
  // authorization 未就绪（网络失败）时重试一次；无权限 → 403 视图，不踢回登录。
  const requiredPermission = to.meta.requiresPermission as string | undefined
  if (requiredPermission) {
    const authz = useAuthorizationStore()
    if (!authz.loaded) {
      await authz.fetchAuthorization()
    }
    if (!authz.hasPermission(requiredPermission)) {
      return { path: '/admin/forbidden', query: { from: to.fullPath } }
    }
  }
})

export default router
