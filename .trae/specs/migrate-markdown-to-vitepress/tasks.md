# Tasks

- [ ] Task 1: 技术可行性确认与依赖调整
  - [ ] SubTask 1.1: 确认 VitePress 定位（SSG，不直接支持运行时远程 Markdown 渲染），在 spec.md 中记录结论
  - [ ] SubTask 1.2: 与用户确认采用方案 A（VitePress 风格运行时渲染层），明确不采用方案 B（完整 VitePress 子站点）以避免牺牲新闻实时更新能力
  - [ ] SubTask 1.3: 移除 `marked`、`highlight.js`、`chart.js` 依赖
  - [ ] SubTask 1.4: 安装 `markdown-it`、`@shikijs/markdown-it`、`@types/markdown-it`、`markdown-it-anchor`、`markdown-it-task-lists`、`dompurify`（可选）
  - [ ] SubTask 1.5: 更新 `vite.config.ts` 的 `manualChunks`，移除 `marked`/`highlight` 分包，新增 markdown/shiki 分包策略
  - [ ] SubTask 1.6: 运行 `pnpm install` 与 `pnpm run type-check`，确保依赖无冲突

- [ ] Task 2: 构建统一 Markdown 渲染组件
  - [ ] SubTask 2.1: 在 `src/composables/` 新建 `useMarkdownRenderer.ts`，封装 `markdown-it` 实例与 Shiki 高亮初始化
  - [ ] SubTask 2.2: 重写 `src/components/MarkdownRenderer.vue`：基于组合式函数渲染 Markdown，支持数学公式（katex）、表格、代码块、链接、图片、引用、列表
  - [ ] SubTask 2.3: 移除 `MarkdownRenderer.vue` 中所有 `.markdown-*` 专用样式，仅保留基于项目 CSS 变量的最小化样式
  - [ ] SubTask 2.4: 添加 `content`、`baseUrl`、`className` 等 Props，便于后续组件复用
  - [ ] SubTask 2.5: 在 `src/utils/` 新增 `stripMarkdown.ts` 工具函数，用于将 Markdown 转为纯文本摘要

- [ ] Task 3: 改造新闻详情页 `NewsDetail.vue`
  - [ ] SubTask 3.1: 删除 `marked` 导入、`initMarked`、`parseTokens`、`initCodeHighlight` 与 CDN 加载逻辑
  - [ ] SubTask 3.2: 导入并使用 `MarkdownRenderer` 组件替换 `renderedContent` 的 `v-html` 渲染
  - [ ] SubTask 3.3: 删除 `.news-content` 下对 `h1-h6`、`p`、`a`、`code`、`pre`、`table`、`blockquote`、`ul/ol` 的专用 CSS
  - [ ] SubTask 3.4: 保留 `.news-content` 容器基础样式（字体、行高、边距）
  - [ ] SubTask 3.5: 运行类型检查，确保无 `marked`/`highlight.js` 残留引用

- [ ] Task 4: 改造新闻列表页 `News.vue`
  - [ ] SubTask 4.1: 删除 `marked` 导入、`simpleMarkdownRender`、`initMarked` 与 `parseTokens`
  - [ ] SubTask 4.2: 将 `renderShortContent` 改为调用 `stripMarkdown` 后纯文本截断
  - [ ] SubTask 4.3: 调整搜索逻辑：如之前搜索 Markdown 源内容，需改为搜索纯文本摘要或保持搜索 `markdownContent`
  - [ ] SubTask 4.4: 运行类型检查

- [ ] Task 5: 改造简洁规则页 `SimpleRules.vue`
  - [ ] SubTask 5.1: 检查并移除与 Markdown 渲染耦合的逻辑（当前主要为 i18n 数组，无 Markdown 渲染）
  - [ ] SubTask 5.2: 清理冗余样式，确保规则列表与引用块继续使用项目配色变量
  - [ ] SubTask 5.3: 确认无 `marked`/`highlight.js` 引用

- [ ] Task 6: 清理 Markdown 专用样式
  - [ ] SubTask 6.1: 检查 `src/styles/desktop/news-detail-styles.css` 与 `src/styles/mobile/news-detail-mobile.css`，移除其中与 Markdown 元素相关的样式
  - [ ] SubTask 6.2: 确认 `src/styles` 下无其他 `.markdown-*` 样式残留
  - [ ] SubTask 6.3: 确保配色方案文件（`theme-colors.css`、`vercel-design-system.css`）不被删除或修改

- [ ] Task 7: 文档与构建验证
  - [ ] SubTask 7.1: 更新 `README.md`、`README.en.md`、`README.zh-CN.md` 中的技术栈描述（移除 marked/highlight.js/Chart.js，新增 markdown-it/Shiki）
  - [ ] SubTask 7.2: 运行 `pnpm run type-check`
  - [ ] SubTask 7.3: 运行 `pnpm run lint`
  - [ ] SubTask 7.4: 运行 `pnpm run build-only`，确认构建成功
  - [ ] SubTask 7.5: 启动 `pnpm run dev`，手动验证新闻列表与详情页 Markdown 渲染、暗色模式切换、代码高亮

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2
- Task 5 depends on Task 2
- Task 6 depends on Task 3 and Task 4
- Task 7 depends on Task 3, Task 4, Task 5, Task 6
