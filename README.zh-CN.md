# LuminolCraft

<div align="center">

![Vue 3](https://img.shields.io/badge/Vue-3.5.25-42b883?style=flat-square&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.0-3178c6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646cff?style=flat-square&logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.19.0-339933?style=flat-square&logo=node.js)
![pnpm](https://img.shields.io/badge/pnpm-recommended-F69220?style=flat-square&logo=pnpm)
![License](https://img.shields.io/badge/License-AGPL_v3-blue?style=flat-square)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

LuminolCraft 是 LuminolMC 附属的 Minecraft 服务器官方网站，基于 Vue 3 构建的现代化单页应用（SPA）。网站提供服务器状态监控、新闻资讯、服务器规则、支持信息等功能，并支持多语言切换与响应式设计。

## 目录

- [项目背景与目标](#项目背景与目标)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [环境配置指南](#环境配置指南)
- [项目结构](#项目结构)
- [核心模块介绍](#核心模块介绍)
- [API 接口文档](#api-接口文档)
- [配置参考](#配置参考)
- [测试策略](#测试策略)
- [部署流程](#部署流程)
- [版本控制规范](#版本控制规范)
- [代码风格指南](#代码风格指南)
- [常见问题与故障排查](#常见问题与故障排查)
- [维护注意事项](#维护注意事项)
- [贡献指南](#贡献指南)
- [许可证](#许可证)
- [致谢](#致谢)
- [联系方式](#联系方式)

## 项目背景与目标

### 背景

LuminolCraft 是 LuminolMC 附属的 Minecraft 服务器官方网站。该项目旨在为服务器社区提供一个现代化、高性能的 Web 平台，提供实时服务器信息、新闻资讯和支持资源。

### 项目定位

本项目是一个现代化的单页应用（SPA），提供以下能力：
- 实时服务器状态监控
- 动态新闻与公告系统
- 服务器规则与支持信息
- 多语言、多主题支持
- 桌面端与移动端的响应式设计

### 业务目标

- **社区活跃度**：通过实时信息与新闻资讯培养活跃的玩家社区
- **服务器透明度**：让玩家了解服务器状态、在线人数与性能
- **赞助支持**：通过专门的支持页面助力服务器维护

### 技术目标

- **高性能**：代码分割、懒加载与构建产物优化
- **类型安全**：全量 TypeScript 覆盖，保证代码可维护性
- **响应式设计**：桌面端与移动端一致体验
- **国际化**：内置中英文双语支持
- **SEO 优化**：Open Graph 标签、站点地图生成、规范 URL

### 目标受众

- LuminolCraft Minecraft 服务器玩家
- 项目维护者与贡献者
- 对服务器状态感兴趣的 Minecraft 社区成员

## 核心功能

- **服务器状态监控** - 通过 mcsrvstat.us API 实时展示在线玩家、服务器版本与运行时间
- **新闻系统** - 动态新闻列表与详情页，支持 Markdown 渲染、KaTeX 数学公式与语法高亮
- **服务器规则** - 清晰简洁的服务器规则展示
- **支持页面** - 服务器支持与赞助信息
- **归档/监控** - 使用 Chart.js 进行服务器状态历史可视化
- **多语言支持** - 内置中英文国际化，基于 localStorage 持久化
- **主题切换** - 亮色/暗色主题与多种配色方案
- **响应式设计** - 桌面端与移动端独立 CSS，完美适配
- **高性能** - Vite 构建，支持代码分割、懒加载与 terser 压缩
- **SEO 优化** - 路由级 Open Graph 标签、自动站点地图、规范 URL
- **统计分析** - 集成隐私优先的统计分析平台，用于流量监控

## 技术栈

### 运行时依赖

| 库 | 版本 | 用途 | 文档 |
|---------|---------|---------|---------------|
| vue | ^3.5.25 | 渐进式 JavaScript 框架 | [vuejs.org](https://vuejs.org/) |
| vue-router | ^4.6.3 | Vue.js 官方路由 | [router.vuejs.org](https://router.vuejs.org/) |
| pinia | ^3.0.4 | 状态管理 | [pinia.vuejs.org](https://pinia.vuejs.org/) |
| vue-i18n | ^9.14.4 | 国际化 | [vue-i18n.intlify.dev](https://vue-i18n.intlify.dev/) |
| @unhead/vue | ^1.9.5 | SEO Head 标签管理 | [unhead.unjs.io](https://unhead.unjs.io/) |
| @unhead/ssr | ^2.0.19 | SSR Head 管理工具 | [unhead.unjs.io](https://unhead.unjs.io/) |
| gsap | ^3.15.0 | 专业动画库 | [gsap.com](https://gsap.com/) |
| chart.js | ^4.5.1 | 数据可视化图表 | [chartjs.org](https://www.chartjs.org/) |
| marked | ^17.0.1 | Markdown 解析器 | [marked.js.org](https://marked.js.org/) |
| highlight.js | ^11.11.1 | 语法高亮 | [highlightjs.org](https://highlightjs.org/) |
| katex | ^0.16.27 | 数学公式渲染 | [katex.org](https://katex.org/) |
| lodash | ^4.17.21 | 工具函数 | [lodash.com](https://lodash.com/) |

### 开发依赖

| 库 | 版本 | 用途 |
|---------|---------|---------|
| vite | ^7.2.4 | 构建工具 |
| @vitejs/plugin-vue | ^6.0.2 | Vue SFC 支持 |
| vite-plugin-vue-devtools | ^8.0.5 | 开发者工具 |
| typescript | ~5.9.0 | 类型检查 |
| vue-tsc | ^3.2.1 | Vue 类型检查 |
| vitest | ^4.0.14 | 单元测试框架 |
| @vue/test-utils | ^2.4.6 | Vue 测试工具 |
| jsdom | ^27.2.0 | 测试用 DOM 环境 |
| eslint | ^9.39.1 | 代码检查 |
| eslint-plugin-vue | ~10.5.1 | Vue ESLint 规则 |
| prettier | 3.6.2 | 代码格式化 |
| terser | ^5.44.1 | JS 压缩 |
| tsx | ^4.21.0 | TypeScript 执行 |
| sitemap | ^9.0.0 | 站点地图生成 |
| npm-run-all2 | ^8.0.4 | 并行脚本执行器 |

### 使用的 GSAP 插件

项目使用以下 GSAP 插件（在 `src/gsap/plugin-setup.ts` 中注册）：
- ScrollTrigger - 滚动触发动画
- ScrollToPlugin - 平滑滚动动画
- SplitText - 文本分割动画
- Flip - 布局过渡动画
- CustomEase - 自定义缓动曲线
- DrawSVGPlugin - SVG 绘制动画
- MotionPathPlugin - 路径运动动画
- MorphSVGPlugin - SVG 变形动画

## 环境配置指南

### 前置条件

- **Node.js**：>= 20.19.0 或 >= 22.12.0（在 `package.json` engines 中指定）
- **包管理器**：pnpm（推荐）或 npm
- **Git**：用于版本控制

### 开发环境

```bash
# 克隆仓库
git clone <repository-url>
cd craft.luminolsuki.moe

# 安装依赖（推荐使用 pnpm）
pnpm install

# 或使用 npm
npm install

# 启动开发服务器（默认端口 3000，自动打开浏览器）
pnpm dev

# 或使用 npm
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 测试环境

- **框架**：Vitest 4.0.14，使用 jsdom 环境
- **配置**：`vitest.config.ts`（继承 vite.config，jsdom 环境，排除 e2e）

```bash
# 运行单元测试
pnpm test:unit

# 监听模式
pnpm test:unit -- --watch

# 覆盖率报告
pnpm test:unit -- --coverage
```

### 生产环境

```bash
# 类型检查 + 构建 + 站点地图生成
pnpm build

# 或使用 npm
npm run build

# 预览生产构建
pnpm preview

# 或使用 npm
npm run preview
```

- **构建产物**：`dist/` 目录
- **Netlify Node 版本**：22（在 `netlify.toml` 中指定）

### 构建期全局变量

以下全局变量在构建期通过 Vite `define` 注入：

- `__APP_VERSION__`：Git 提交哈希（来自 `COMMIT_REF`、`CF_PAGES_COMMIT_SHA`、`GIT_COMMIT` 环境变量或 git 命令）
- `__BUILD_TIME__`：构建时的 ISO 时间戳

## 项目结构

```
craft.luminolsuki.moe/
├── .netlify/
│   └── functions/                    # Netlify Serverless Functions
│       ├── news.js                   # 新闻数据代理函数
│       └── version.js                # 版本信息函数
├── .trae/
│   └── specs/                        # 项目规范文档
├── public/
│   ├── images/                       # 静态图片（WebP/AVIF）
│   └── favicon.ico                   # 站点图标
├── src/
│   ├── components/                   # 可复用组件（7 个文件）
│   │   ├── Navbar.vue                # 导航栏
│   │   ├── Footer.vue                # 页脚
│   │   ├── MarkdownRenderer.vue      # Markdown 渲染器（KaTeX + highlight.js）
│   │   ├── ColorSchemeSwitcher.vue   # 配色方案切换器
│   │   ├── CookieConsentBanner.vue   # Cookie 同意横幅
│   │   ├── LastViewedPopup.vue       # 最近浏览弹窗
│   │   └── TocToggles.vue            # 主题与语言切换组件
│   ├── composables/                  # 组合式函数（9 个文件）
│   │   ├── useCookieConsent.ts       # Cookie 同意状态
│   │   ├── useEntranceAnimation.ts   # 入场动画
│   │   ├── useGsap.ts                # GSAP 工具
│   │   ├── useHoverAnimation.ts      # 悬停动画
│   │   ├── useI18n.ts                # 国际化辅助函数
│   │   ├── useLastViewedCookie.ts    # 最近浏览 Cookie
│   │   ├── usePageTransition.ts      # 页面过渡
│   │   ├── useScrollTrigger.ts       # 滚动触发动画
│   │   └── useSplitText.ts           # 文本分割
│   ├── config/
│   │   └── app-config.ts             # 应用配置
│   ├── gsap/                         # GSAP 动画模块
│   │   ├── config/
│   │   │   ├── durations.ts          # 动画时长
│   │   │   ├── easings.ts            # 缓动曲线
│   │   │   └── staggers.ts           # 交错配置
│   │   ├── defaults.ts               # 默认动画配置
│   │   ├── index.ts                  # 模块入口
│   │   ├── match-media.ts            # 响应式动画匹配
│   │   └── plugin-setup.ts           # 插件注册
│   ├── i18n/                         # 国际化
│   │   ├── locales/
│   │   │   ├── zh.ts                 # 中文翻译
│   │   │   └── en.ts                 # 英文翻译
│   │   └── index.ts                  # i18n 配置
│   ├── router/
│   │   └── index.ts                  # Vue Router 配置
│   ├── stores/                       # Pinia 状态管理
│   ├── styles/                       # CSS 样式
│   │   ├── desktop/                  # 桌面端样式
│   │   │   ├── home.css
│   │   │   ├── monitoring-styles.css
│   │   │   ├── navigation.css
│   │   │   ├── news-detail-styles.css
│   │   │   ├── news-styles.css
│   │   │   └── support-styles.css
│   │   ├── mobile/                   # 移动端样式
│   │   │   ├── home-mobile.css
│   │   │   ├── monitoring-mobile.css
│   │   │   ├── navigation-mobile.css
│   │   │   ├── news-detail-mobile.css
│   │   │   ├── news-mobile.css
│   │   │   ├── notfound-mobile.css
│   │   │   └── support-mobile.css
│   │   ├── fonts.css                 # 字体定义
│   │   ├── gsap-splittext.css        # GSAP SplitText 样式
│   │   ├── responsive.css            # 响应式样式
│   │   ├── theme-colors.css          # 主题颜色变量
│   │   ├── typography.css            # 排版
│   │   └── vercel-design-system.css  # Vercel 设计系统
│   ├── utils/                        # 工具函数
│   │   ├── generate-sitemap.ts       # 站点地图生成
│   │   └── utils.ts                  # 通用工具（防抖、节流）
│   ├── views/                        # 页面组件（7 个文件）
│   │   ├── Home.vue                  # 首页
│   │   ├── News.vue                  # 新闻列表
│   │   ├── NewsDetail.vue            # 新闻详情
│   │   ├── SimpleRules.vue           # 服务器规则
│   │   ├── Support.vue               # 支持页面
│   │   ├── Archive.vue               # 服务器监控
│   │   └── NotFound.vue              # 404 页面
│   ├── App.vue                       # 根组件
│   └── main.ts                       # 应用入口
├── .editorconfig                     # 编辑器配置
├── .gitattributes                    # Git 属性
├── .gitignore                        # Git 忽略规则
├── .prettierrc.json                  # Prettier 配置
├── DESIGN.md                         # 设计系统文档
├── eslint.config.ts                  # ESLint 配置
├── index.html                        # HTML 模板
├── netlify.toml                      # Netlify 部署配置
├── package.json                      # 项目依赖
├── tsconfig.json                     # TypeScript 配置（引用）
├── tsconfig.app.json                 # 应用 TypeScript 配置
├── tsconfig.node.json                # Node TypeScript 配置
├── tsconfig.vitest.json              # Vitest TypeScript 配置
├── vite.config.ts                    # Vite 配置
└── vitest.config.ts                  # Vitest 配置
```

## 核心模块介绍

### 页面组件（views/）

| 组件 | 路由 | 描述 |
|-----------|-------|-------------|
| Home.vue | `/` | 首页，包含 Hero 区、特性、服务器信息 |
| News.vue | `/News` | 新闻列表，支持分页 |
| NewsDetail.vue | `/NewsDetail` | 新闻详情，支持 Markdown 渲染（别名：`/news-detail`、`/news-detail.html`、`/NewsDetail.html`） |
| SimpleRules.vue | `/SimpleRules` | 服务器规则展示 |
| Support.vue | `/Support` | 支持与赞助信息 |
| Archive.vue | `/Archive` | 服务器监控与历史 |
| NotFound.vue | `/:pathMatch(.*)*` | 404 页面 |

### 可复用组件（components/）

- **Navbar.vue** - 导航栏，支持固定定位
- **Footer.vue** - 页脚，包含版权信息
- **MarkdownRenderer.vue** - Markdown 渲染，集成 KaTeX 数学公式与 highlight.js 语法高亮
- **ColorSchemeSwitcher.vue** - 配色方案切换组件
- **CookieConsentBanner.vue** - GDPR Cookie 同意横幅
- **LastViewedPopup.vue** - 最近浏览内容弹窗
- **TocToggles.vue** - 主题与语言切换组件

### 组合式函数（composables/）

- **useCookieConsent.ts** - Cookie 同意状态管理
- **useEntranceAnimation.ts** - 页面入场动画
- **useGsap.ts** - GSAP 工具封装
- **useHoverAnimation.ts** - 悬停效果动画
- **useI18n.ts** - 国际化辅助函数
- **useLastViewedCookie.ts** - 最近浏览 Cookie 逻辑
- **usePageTransition.ts** - 页面过渡动画
- **useScrollTrigger.ts** - 滚动触发动画
- **useSplitText.ts** - 文本分割（用于动画）

### GSAP 模块（gsap/）

- **plugin-setup.ts** - 注册 8 个 GSAP 插件（ScrollTrigger、ScrollToPlugin、SplitText、Flip、CustomEase、DrawSVGPlugin、MotionPathPlugin、MorphSVGPlugin）
- **defaults.ts** - 默认动画配置（duration: 0.6，ease: 'power2.out'，overwrite: 'auto'）
- **match-media.ts** - 响应式动画匹配
- **config/** - 动画配置（durations.ts、easings.ts、staggers.ts）

### 国际化（i18n/）

- **默认语言**：`zh`（中文）
- **回退语言**：`en`（英文）
- **持久化**：localStorage 键名 `locale`
- **模式**：组合式 API（legacy: false）
- **文件**：`locales/zh.ts`（中文）、`locales/en.ts`（英文）

## API 接口文档

### Netlify Functions

#### GET /.netlify/functions/news

从外部 GitHub 仓库获取新闻数据。

- **方法**：GET、OPTIONS（CORS 预检）
- **响应**：包含新闻条目的 JSON 数组
- **数据源**：`LuminolCraft/news.json` 仓库（main 分支）
- **CORS**：`Access-Control-Allow-Origin: *`
- **错误响应**：500 状态码及错误信息

#### GET /.netlify/functions/version

返回部署版本信息。

- **方法**：GET、OPTIONS（CORS 预检）
- **响应**：包含 `version`、`fullHash`、`branch`、`deployTime`、`timestamp`、`source` 字段的 JSON 对象
- **版本来源**（优先级顺序）：`COMMIT_REF`、`GIT_COMMIT_REF`、`NETLIFY_VERSION`、`DEPLOY_ID`，或回退到 GitHub API
- **错误响应**：500 状态码及错误信息

### 使用的外部 API

- **mcsrvstat.us API**：Minecraft 服务器状态（在线人数、版本、运行时间）
- **GitHub Raw Content**：新闻数据仓库
- **GitHub API**：版本函数的提交信息回退
- **统计分析服务**：隐私优先的流量监控平台

### 构建期变量

- `__APP_VERSION__`：通过 Vite `define` 注入，包含 Git 提交哈希
- `__BUILD_TIME__`：通过 Vite `define` 注入，包含构建时的 ISO 时间戳

## 配置参考

### 应用配置（`src/config/app-config.ts`）

```typescript
export interface AppConfig {
  showTocToggles: boolean;           // 显示主题/语言切换组件
  navbarFixed: boolean;              // 固定导航栏
  showFooterCopyright: boolean;      // 页脚版权可见性
  newsPagination: {
    desktopItemsPerPage: number;     // 桌面端每页条数（默认：6）
    mobileItemsPerPage: number;      // 移动端每页条数（默认：2）
    maxDisplayedPages: number;       // 最大显示页码数（默认：5）
  };
}
```

### Vite 配置（`vite.config.ts`）

- **别名**：`@` → `./src`
- **构建**：Terser 压缩、手动分包（vue-vendor、markdown、highlight）、CSS 代码分割、不生成 sourcemap
- **服务器**：端口 3000，自动打开浏览器
- **Define**：`__APP_VERSION__`、`__BUILD_TIME__`

### TypeScript 配置

- **tsconfig.json**：项目引用（node、app、vitest）
- **tsconfig.app.json**：继承 @vue/tsconfig dom，路径 `@/*` → `./src/*`
- **tsconfig.vitest.json**：继承 vite 配置，jsdom 环境

### Netlify 配置（`netlify.toml`）

```toml
[build]
  command = "pnpm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 测试策略

### 框架

- **Vitest** 4.0.14，使用 jsdom 环境
- **@vue/test-utils** 用于组件测试

### 测试命令

```bash
# 运行单元测试
pnpm test:unit

# 监听模式
pnpm test:unit -- --watch

# 覆盖率报告
pnpm test:unit -- --coverage
```

### 测试文件位置

- **测试文件**：`src/**/__tests__/*`
- **配置文件**：`vitest.config.ts`
- **排除项**：`e2e/**` 及 vitest 默认排除项

### 测试指南

- 为组合式函数与工具函数编写单元测试
- 使用 @vue/test-utils 进行组件测试
- 在测试中 Mock 外部 API 调用
- 同时测试中英文 i18n 输出
- 创建 Pull Request 前确保测试通过

## 部署流程

### Netlify 部署（主要）

1. 将代码推送到 GitHub 仓库
2. 在 Netlify 仪表板连接仓库
3. 配置构建设置（自动从 `netlify.toml` 读取）：
   - 构建命令：`pnpm run build`
   - 发布目录：`dist`
   - Node 版本：22
4. 推送到 `main` 分支时 Netlify 自动部署
5. Netlify Functions 从 `.netlify/functions/` 部署
6. SPA 重定向已配置，支持客户端路由

### 其他平台

- **Vercel**：导入仓库，框架预设选 Vue，构建命令 `pnpm build`，输出目录 `dist`
- **GitHub Pages**：本地构建，将 `dist/` 部署到 `gh-pages` 分支，配置 base 路径
- **Cloudflare Pages**：构建命令 `pnpm build`，输出目录 `dist`，Node 版本 20+
- **AWS S3 + CloudFront**：将 `dist/` 上传到 S3，配置 CloudFront 支持 SPA

### 构建产物

- **位置**：`dist/`
- **内容**：`index.html`、`assets/`、`sitemap.xml`
- **代码分割**：vue-vendor、markdown、highlight 三个 chunk
- **不生成 sourcemap**（减小体积）

## 版本控制规范

### 分支策略

- `main`：生产就绪代码
- `feature/*`：新功能开发
- `fix/*`：Bug 修复
- `docs/*`：文档更新

### 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

[可选正文]

[可选脚注]
```

**类型**：`feat`、`fix`、`docs`、`style`、`refactor`、`test`、`chore`、`perf`、`ci`、`build`、`revert`

**示例**：
```
feat(news): add pagination for news list
fix(router): resolve NewsDetail alias issue
docs(readme): update deployment guide
```

### Pull Request 流程

1. Fork 仓库
2. 从 `main` 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 确保测试通过：`pnpm test:unit`
4. 确保代码检查通过：`pnpm lint`
5. 确保类型检查通过：`pnpm type-check`
6. 如需要，更新文档
7. 创建 Pull Request，附上描述与截图

## 代码风格指南

### ESLint 配置

- **配置文件**：`eslint.config.ts`
- **规则**：Vue essential + TypeScript recommended
- **Vitest 插件**用于测试文件
- **Prettier 集成**（skip-formatting）

```bash
# 运行 ESLint 并自动修复
pnpm lint

# 或使用 npm
npm run lint
```

### Prettier 配置

- **不使用分号**（`semi: false`）
- **单引号**（`singleQuote: true`）
- **行宽**：100

```bash
# 格式化代码
pnpm format

# 或使用 npm
npm run format
```

### EditorConfig

- **缩进**：2 空格
- **行尾**：LF
- **字符集**：UTF-8
- **去除行尾空格**：是
- **文件末尾插入空行**：是
- **最大行宽**：100

### TypeScript 指南

- **严格模式**（通过 @vue/tsconfig）
- 使用 **Composition API** 与 `<script setup lang="ts">`
- 为所有数据结构定义 **interface**
- 使用 `@/` 别名导入
- 避免 `any` 类型（使用 `unknown` 或合适类型）

## 常见问题与故障排查

### 1. 开发服务器无法启动 / 端口 3000 被占用

**解决方案**：修改 `vite.config.ts` 中的 `server.port`，或终止占用 3000 端口的进程：

```bash
# 查找并终止占用 3000 端口的进程（Windows）
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# 或在 vite.config.ts 中修改端口
server: { port: 3001 }
```

### 2. pnpm install 失败，提示 peer dependency 错误

**解决方案**：确保 Node.js 版本 >= 20.19.0 或 >= 22.12.0。如需要，使用：

```bash
pnpm install --force
```

### 3. 构建失败，提示类型错误

**解决方案**：单独运行类型检查以查看详细错误：

```bash
pnpm type-check
```

在运行 `pnpm build` 前修复所有类型错误。

### 4. 本地开发时新闻无法加载

**解决方案**：新闻函数运行在 Netlify 上。本地开发时，应用可能调用生产 API 端点。检查 `News.vue` 中的 API URL 配置。

### 5. i18n 切换不生效

**解决方案**：在浏览器 DevTools 中清除 localStorage 的 `locale` 键。确保 `zh.ts` 与 `en.ts` 的键结构一致。

### 6. GSAP 动画不工作

**解决方案**：确保在 `main.ts` 中调用了 `setupGsap()`。检查所有需要的插件是否在 `src/gsap/plugin-setup.ts` 中注册。

### 7. 构建时站点地图生成失败

**解决方案**：确保 `dist/` 目录存在。站点地图脚本在构建后运行。检查 `src/utils/generate-sitemap.ts` 是否有错误。

### 8. Netlify 部署后刷新出现 404

**解决方案**：验证 `netlify.toml` 包含 SPA 重定向规则：

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 9. 图片无法加载（Referrer Policy）

**解决方案**：`index.html` 中有 `<meta name="referrer" content="no-referrer">`。部分图片托管要求 Referrer。检查图片 URL 与托管策略。

### 10. KaTeX/数学公式不渲染

**解决方案**：确保已引入 KaTeX CSS。检查 `MarkdownRenderer.vue` 中的 KaTeX 集成，并验证 KaTeX CSS 是否已加载。

## 维护注意事项

### 日常维护任务

- **依赖**：每月运行 `pnpm outdated`，谨慎更新依赖
- **安全**：定期运行 `pnpm audit`，及时修复漏洞
- **Node.js**：在支持范围内保持 Node.js 版本更新
- **新闻数据**：维护 `LuminolCraft/news.json` 仓库
- **统计分析**：监控分析仪表板的流量异常

### 必须理解的关键文件

- `src/main.ts` - 应用入口，插件注册，SEO meta 注入
- `src/router/index.ts` - 路由定义，包含 OG meta 标签
- `src/config/app-config.ts` - 集中式应用配置
- `vite.config.ts` - 构建优化设置
- `netlify.toml` - 部署与缓存规则

### 性能考量

- 代码分割针对 vue/markdown/highlight 供应商配置
- 图片使用 WebP/AVIF 格式以减小体积
- `index.html` 中配置字体预加载
- 启用 CSS 代码分割
- 生产环境不生成 sourcemap（减小体积）
- 启用 Terser 压缩

### SEO 维护

- OG 标签在 `src/router/index.ts` 中按路由配置
- 站点地图通过 `src/utils/generate-sitemap.ts` 在构建时自动生成
- 规范 URL 在 `src/main.ts` 中注入
- 新增页面时，在 `generate-sitemap.ts` 中更新站点地图路由

### i18n 维护

- 同时更新 `zh.ts` 与 `en.ts`
- 保持各语言键结构一致
- 更新后测试语言切换
- 默认语言为 `zh`，回退语言为 `en`

### GSAP/动画维护

- 插件注册在 `src/gsap/plugin-setup.ts`
- 默认 duration/ease 在 `src/gsap/defaults.ts`
- 动画配置在 `src/gsap/config/`
- 部分插件（DrawSVGPlugin、MorphSVGPlugin）为 GSAP 付费插件 - 请验证许可证

## 贡献指南

### Fork 与分支工作流

1. 在 GitHub 上 Fork 仓库
2. 本地克隆你的 Fork
3. 添加上游仓库为远程
4. 为你的修改创建特性分支
5. 遵循代码风格指南进行修改
6. 充分测试你的修改
7. 提交 Pull Request

### 代码风格要求

- 遵循 ESLint 规则（运行 `pnpm lint`）
- 遵循 Prettier 格式化（运行 `pnpm format`）
- 使用 2 空格缩进
- 使用 LF 行尾
- 不保留行尾空格

### TypeScript 要求

- 为所有新函数与组件定义类型
- 为数据结构使用 interface
- 避免 `any` 类型
- 使用 `@/` 别名导入

### 测试要求

- 为新的组合式函数与工具函数编写测试
- 确保现有测试通过：`pnpm test:unit`
- i18n 修改需同时测试中英文输出

### PR 审查流程

- 确保所有 CI 检查通过
- 如需要，更新文档
- UI 修改附上截图
- 及时回复审查反馈

## 许可证

本项目基于 GNU Affero General Public License v3.0（AGPL-3.0）授权 - 详见 [LICENSE](LICENSE) 文件。

## 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [TypeScript](https://www.typescriptlang.org/) - 带类型的 JavaScript
- [Pinia](https://pinia.vuejs.org/) - 你会爱用的 Vue 状态管理库
- [Vue Router](https://router.vuejs.org/) - Vue.js 官方路由
- [Vue I18n](https://vue-i18n.intlify.dev/) - Vue 国际化插件
- [Chart.js](https://www.chartjs.org/) - 简洁灵活的 JavaScript 图表库
- [Marked](https://marked.js.org/) - Markdown 解析器与编译器
- [Highlight.js](https://highlightjs.org/) - Web 语法高亮
- [GSAP](https://gsap.com/) - 现代网络的专业级动画
- [Lodash](https://lodash.com/) - 现代 JavaScript 工具库
- [KaTeX](https://katex.org/) - 快速 Web 数学排版
- [Unhead](https://unhead.unjs.io/) - Vue 通用 Head 标签管理器

## 联系方式

- QQ 交流群：[点击加入](https://qm.qq.com/q/M29Eyniu8S)
- GitHub Issues：[提交问题](https://github.com/NARCSSU/craft.luminolsuki.moe/issues)

---

<div align="center">

**Made with ❤️ by LuminolCraft Team**

</div>
