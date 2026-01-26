# LuminolCraft

<div align="center">

![Vue 3](https://img.shields.io/badge/Vue-3.5.25-42b883?style=flat-square&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.0-3178c6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646cff?style=flat-square&logo=vite)
![License](https://img.shields.io/badge/License-AGPL_v3-blue?style=flat-square)

</div>

LuminolCraft 是 LuminolMC 附属的 Minecraft 服务器官方网站，基于 Vue 3 构建的现代化单页应用（SPA）。网站提供服务器状态监控、新闻资讯、服务器规则、支持信息等功能，支持多语言切换和响应式设计。

## 核心功能

- **服务器状态监控** - 实时显示服务器在线人数、版本等信息
- **新闻资讯系统** - 动态新闻列表和详情页面，支持 Markdown 渲染
- **服务器规则** - 清晰简洁的服务器规则展示
- **支持页面** - 服务器支持与捐赠信息
- **多语言支持** - 内置中文和英文国际化支持
- **主题切换** - 支持亮色/暗色主题和多种配色方案
- **响应式设计** - 完美适配桌面端和移动端设备
- **高性能** - 基于 Vite 构建，支持代码分割和懒加载
- **TypeScript** - 完整的类型安全支持

## 快速开始

### 环境要求

- Node.js >= 20.19.0 或 >= 22.12.0
- pnpm（推荐）或 npm

### 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 开发模式

```bash
# 启动开发服务器（默认端口 3000）
pnpm dev

# 或使用 npm
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
# 类型检查并构建
pnpm build

# 或使用 npm
npm run build
```

```
构建产物将输出到 `dist/` 目录。
```

### 预览生产构建

```bash
pnpm preview

# 或使用 npm
npm run preview
```

## 项目结构

```
luminolcraft-vue/
├── public/                 # 静态资源
├── src/
│   ├── components/          # 可复用组件
│   │   ├── Navbar.vue       # 导航栏
│   │   ├── Footer.vue       # 页脚
│   │   ├── MarkdownRenderer.vue  # Markdown 渲染器
│   │   ├── ThemeToggle.vue  # 主题切换
│   │   ├── LanguageSwitcher.vue  # 语言切换
│   │   └── ColorSchemeSwitcher.vue  # 配色方案切换
│   ├── config/              # 应用配置
│   │   └── app-config.ts    # 配置文件
│   ├── i18n/                # 国际化
│   │   ├── locales/         # 语言文件
│   │   │   ├── zh.ts        # 中文
│   │   │   └── en.ts        # 英文
│   │   └── index.ts         # i18n 配置
│   ├── router/              # 路由配置
│   │   └── index.ts
│   ├── stores/              # Pinia 状态管理
│   ├── styles/              # 样式文件
│   │   ├── desktop/         # 桌面端样式
│   │   ├── mobile/          # 移动端样式
│   │   ├── fonts.css        # 字体
│   │   ├── theme-colors.css # 主题颜色
│   │   ├── typography.css   # 排版
│   │   └── responsive.css   # 响应式
│   ├── utils/               # 工具函数
│   │   └── netlify/         # Netlify Functions
│   ├── views/               # 页面组件
│   │   ├── Home.vue         # 首页
│   │   ├── News.vue         # 新闻列表
│   │   ├── NewsDetail.vue   # 新闻详情
│   │   ├── Monitoring.vue    # 服务器监控
│   │   ├── SimpleRules.vue  # 服务器规则
│   │   ├── Support.vue      # 支持页面
│   │   └── NotFound.vue     # 404 页面
│   ├── App.vue              # 根组件
│   └── main.ts              # 应用入口
├── index.html               # HTML 模板
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
├── package.json             # 项目依赖
└── netlify.toml             # Netlify 部署配置
```

## 配置

### 应用配置

在 `src/config/app-config.ts` 中可以配置以下选项：

```typescript
export interface AppConfig {
  showLanguageToggle: boolean;    // 显示语言切换按钮
  navbarFixed: boolean;           // 固定导航栏
  showFooterCopyright: boolean;   // 显示页脚版权信息
}
```

### 路由配置

路由定义在 `src/router/index.ts`，包含以下页面：

| 路径 | 组件 | 描述 |
|------|------|------|
| `/` | Home | 首页 |
| `/News` | News | 新闻列表 |
| `/NewsDetail` | NewsDetail | 新闻详情 |
| `/Monitoring` | Monitoring | 服务器监控 |
| `/SimpleRules` | SimpleRules | 服务器规则 |
| `/Support` | Support | 支持页面 |

## 测试

```bash
# 运行单元测试
pnpm test:unit

# 或使用 npm
npm run test:unit
```

## 代码规范

项目使用 ESLint 和 Prettier 进行代码检查和格式化。

```bash
# 运行 ESLint 检查并自动修复
pnpm lint

# 或使用 npm
npm run lint

# 格式化代码
pnpm format

# 或使用 npm
npm run format
```

## 部署

### Netlify 部署

项目已配置 Netlify 部署，使用 `netlify.toml` 配置文件：

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

部署步骤：

1. 将代码推送到 GitHub 仓库
2. 在 Netlify 中连接仓库
3. Netlify 会自动检测 `netlify` 并执行构建命令

### 其他平台

项目可以部署到任何支持静态网站托管的平台，如：

- Vercel
- GitHub Pages
- Cloudflare Pages
- AWS S3 + CloudFront

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 遵循现有代码风格
- 为新功能添加 TypeScript 类型
- 更新相关文档
- 确保所有测试通过
- 运行 `pnpm lint` 确保代码符合规范

## 许可证

本项目采用 GNU Affero General Public License v3.0 许可证 - 详见 [LICENSE](LICENSE) 文件

## 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
- [Pinia](https://pinia.vuejs.org/) - Vue 状态管理库
- [Vue Router](https://router.vuejs.org/) - Vue 官方路由
- [Vue I18n](https://vue-i18n.intlify.dev/) - Vue 国际化插件
- [Chart.js](https://www.chartjs.org/) - 图表库
- [Marked](https://marked.js.org) - Markdown 解析器
- [Highlight.js](https://highlightjs.org/) - 语法高亮库

## 联系方式

- QQ群: [点击加入](https://qm.qq.com/q/M29Eyniu8S)
- GitHub Issues: [提交问题](https://github.com/NARCSSU/craft.luminolsuki.moe/issues)

---

<div align="center">

**Made with ❤️ by LuminolCraft Team**

</div>
