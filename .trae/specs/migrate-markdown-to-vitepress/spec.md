# 迁移 Markdown 渲染至 VitePress 风格方案 Spec

## Why

当前项目使用 `marked` + `highlight.js` + `katex` + `Chart.js` 在客户端运行时渲染远程拉取的 Markdown 新闻内容，并在 `MarkdownRenderer.vue`、`News.vue`、`NewsDetail.vue`、`SimpleRules.vue` 中各自维护渲染逻辑与专用 CSS。该实现存在以下问题：

1. **渲染能力分散**：`marked` 配置在多个文件中重复，样式与组件耦合，难以维护。
2. **安全与性能**：使用 `v-html` 注入 Markdown 输出，依赖自定义 XSS 校验；运行时加载远程 Markdown 与 CDN 高亮资源，增加网络依赖。
3. **扩展性差**：新增需要 Markdown 渲染的页面时，无法复用现有能力。
4. **与 VitePress 生态割裂**：VitePress 提供了更成熟的 Markdown 扩展、Shiki 语法高亮与主题系统，但当前方案未利用这些能力。

用户希望评估 VitePress 的可行性，并将 Markdown 渲染能力迁移到 VitePress 生态中，同时保留现有配色方案。

## What Changes

### 关键结论：VitePress 的定位与可行方案

VitePress 是一个**静态站点生成器（SSG）**，其核心 Markdown 渲染（`createMarkdownRenderer`）是 **Node.js 构建时 API**，用于在构建阶段将 `.md` 文件编译为静态 HTML/Vue 组件。当前项目的新闻内容是在**运行时**从远程 API（`https://luminolcraft-news.pages.dev/news.json`）拉取 Markdown 字符串并在浏览器中渲染，这与 VitePress 的构建时模型不直接兼容。

因此，提供两个方案：

- **方案 A（推荐）：VitePress 风格运行时渲染层**
  - 不完全引入 VitePress 作为站点生成器，而是引入其底层 Markdown 技术栈：`markdown-it` + `Shiki`（VitePress 默认语法高亮）+ `katex`。
  - 构建一个统一的 `MarkdownRenderer` 运行时组件，替换 `marked` 与 `highlight.js`。
  - 保留现有运行时数据流（从远程拉取新闻），移除原有 Markdown 专用 CSS，使用项目配色变量覆盖默认样式。
  - **优点**：改动范围可控、保留实时新闻更新能力、可维护性和扩展性好。
  - **缺点**：不是严格意义上的"VitePress 子站点"。

- **方案 B（完整 VitePress 子站点）**
  - 在项目中新增一个 VitePress 站点（例如 `docs-news/`），将新闻详情页从当前 Vue SPA 中**彻底迁出**，重写为 VitePress 主题页面或 Markdown 模板。
  - `NewsDetail.vue` 不会再作为当前 Vue Router 路由 `/NewsDetail` 的组件存在；用户访问新闻详情时，将跳转到 VitePress 子站点生成的静态页面（例如 `/news/detail/xxx.html`）。
  - 需要改造数据流：构建时调用远程 API 拉取新闻 Markdown 并生成静态页面，或预先将新闻内容放入 VitePress 的 `docs/` 目录。VitePress 的[动态路由](https://vitepress.dev/zh/guide/routing#dynamic-routes)也要求数据在构建时确定。
  - **优点**：完全利用 VitePress 生态（SEO、默认主题、自动生成目录等）。
  - **缺点**：
    - 新闻实时更新能力受限，必须依赖重新部署或 ISR/Webhook。
    - `News.vue` 列表页也需要决定：继续留在 Vue SPA 中（点击后跳转到外部 VitePress 页面），还是也迁移到 VitePress 中。无论哪种方式，都需要处理路由/导航衔接和主题一致性。
    - VitePress 虽然常用于文档，但也能做博客、新闻、营销站点；不过它的核心仍是"构建时生成静态内容"，而你的新闻目前是运行时从远程 API 拉取的，这与 VitePress 的模型冲突。
    - 改造范围最大，相当于在现有 Vue SPA 之外再维护一个子站点。

**回答你的疑问**：如果选 B 方案，确实需要重做 `NewsDetail.vue`，把它改成 VitePress 子站点的页面（不再是一个普通的 Vue 组件）。而且因为新闻内容在运行时才能拿到，B 方案必须改为构建时拉取数据，这会牺牲实时更新能力。因此，对于"运行时远程 Markdown"这个场景，**方案 A 更合适**。

本 Spec 默认按 **方案 A** 执行。若你确认接受 B 方案的静态生成代价，可再讨论数据流与部署方案。

### 具体变更

- 移除 `marked`、`highlight.js` 依赖（`katex`、`chart.js` 按需保留或移除）。
- 新增 `markdown-it`、`@shikijs/markdown-it`（或 `shiki`）、`markdown-it-anchor`、`markdown-it-task-lists` 等插件。
- 重写 `src/components/MarkdownRenderer.vue`：
  - 基于 `markdown-it` + Shiki 实现统一渲染。
  - 支持数学公式（`katex`）、表格、代码块、引用、链接、图片等。
  - 移除 Chart.js 图表渲染（当前未在新闻中实际使用，且引入复杂）。
  - 暴露 `content`、`tag`、`baseUrl` 等 Props，便于其他组件复用。
- 改造 `src/views/NewsDetail.vue`：
  - 删除 `marked` 与 `highlight.js` CDN 加载逻辑。
  - 使用 `MarkdownRenderer` 组件渲染 `markdownContent`。
  - 删除 `.news-content` 下的 Markdown 专用 CSS，改为通过全局/组件级 VitePress 风格样式覆盖。
- 改造 `src/views/News.vue`：
  - 删除 `marked` 与 `simpleMarkdownRender`。
  - 新闻卡片摘要改为纯文本截断（不再渲染 Markdown 为 HTML 后截断），避免 HTML 标签截断导致的问题。
- 改造 `src/views/SimpleRules.vue`：
  - 移除手动渲染的 `rules-list` 与 `rules-quote` 中的 Markdown 相关逻辑（当前 SimpleRules 使用 i18n 数组，不含 Markdown，但需清理与 Markdown 渲染耦合的样式）。
  - 保持现有规则列表展示，样式复用项目配色。
- 清理 `src/styles` 中所有 Markdown 专用 CSS（如 `.markdown-*` 类、`news-content` 下的 Markdown 元素样式），仅保留配色方案 CSS（`theme-colors.css`、`vercel-design-system.css`）。
- 更新 `vite.config.ts` 的 `manualChunks`，移除 `marked`、`highlight.js` 分包，新增 `markdown-it` 与 `shiki` 分包策略。
- 更新 `README` 中技术栈描述。

### 不变更的内容

- 项目整体 Vue 3 + Vue Router + Pinia + vue-i18n 架构不变。
- 新闻数据流（从 `luminolcraft-news.pages.dev` 拉取）在方案 A 中不变。
- 配色方案（`theme-colors.css`、`vercel-design-system.css`）完全保留。
- 路由配置不变（`/News`、`/NewsDetail` 等）。

## Impact

- **Affected specs**：新闻展示、服务器规则展示、Markdown 内容渲染。
- **Affected code**：
  - `src/components/MarkdownRenderer.vue`
  - `src/views/NewsDetail.vue`
  - `src/views/News.vue`
  - `src/views/SimpleRules.vue`
  - `src/styles/desktop/news-detail-styles.css`
  - `src/styles/mobile/news-detail-mobile.css`
  - `vite.config.ts`
  - `package.json`
  - `README.md`、`README.en.md`、`README.zh-CN.md`

## ADDED Requirements

### Requirement: 统一 Markdown 渲染组件

The system SHALL provide a reusable `MarkdownRenderer` component based on `markdown-it` and Shiki.

#### Scenario: 渲染新闻详情

- **WHEN** `NewsDetail.vue` 加载到新闻的 `markdownContent`
- **THEN** 它使用 `<MarkdownRenderer :content="markdownContent" />` 渲染内容
- **AND** 输出包含语法高亮、表格、引用、链接、图片、数学公式

#### Scenario: 扩展性

- **WHEN** 未来其他页面需要渲染 Markdown
- **THEN** 开发者只需导入 `MarkdownRenderer` 组件并传入 `content`
- **AND** 无需重复配置 markdown-it 或样式

### Requirement: VitePress 风格样式

The system SHALL apply VitePress-like typography and code block styles while preserving the existing purple color scheme.

#### Scenario: 代码块样式

- **WHEN** Markdown 包含代码块
- **THEN** 代码块使用 Shiki 高亮
- **AND** 背景色、边框、圆角使用项目现有 CSS 变量（`--card-bg`、`--glass-border`、`--vercel-radius-comfortable` 等）

#### Scenario: 暗色模式

- **WHEN** 用户切换暗色主题
- **THEN** Markdown 渲染内容自动跟随 `--text-color`、`--card-bg` 等变量变化

## MODIFIED Requirements

### Requirement: 新闻列表摘要展示

**Before**：新闻卡片摘要使用 `marked.parse(shortContent)` 将 Markdown 渲染为 HTML 后截断显示。

**After**：新闻卡片摘要直接从 `markdownContent` 提取纯文本并截断，不再渲染 Markdown 标签。

#### Scenario: 摘要显示

- **WHEN** 用户浏览新闻列表
- **THEN** 每张卡片显示纯文本摘要
- **AND** 摘要中不包含 Markdown 标记或 HTML 标签

### Requirement: 新闻详情页渲染

**Before**：`NewsDetail.vue` 使用全局 `marked` 与 `highlight.js` CDN 渲染 `markdownContent`。

**After**：`NewsDetail.vue` 使用 `MarkdownRenderer` 组件渲染 `markdownContent`，不再直接调用 `marked.parse` 或动态加载 highlight.js。

## REMOVED Requirements

### Requirement: marked 运行时渲染

**Reason**：`marked` 将被 `markdown-it` + Shiki 替代，以获得与 VitePress 一致的 Markdown 扩展和语法高亮能力。

**Migration**：
- 删除 `marked` 依赖。
- 将所有 `marked.parse(...)` 调用替换为 `MarkdownRenderer` 组件或 `renderMarkdown(content)` 工具函数。

### Requirement: highlight.js 运行时 CDN 加载

**Reason**：Shiki 提供构建时/运行时更稳定的语法高亮，且无需从 CDN 动态加载脚本。

**Migration**：
- 删除 `highlight.js` 依赖。
- 删除 `initCodeHighlight` 与动态加载 `cdnjs.cloudflare.com` 高亮资源的逻辑。

### Requirement: Chart.js Markdown 图表块

**Reason**：当前 `MarkdownRenderer.vue` 支持 ` ```chart ` 代码块渲染 Chart.js 图表，但项目实际新闻内容中未使用此功能，且 Chart.js 引入增加包体积。

**Migration**：
- 移除 `chart.js` 依赖与 `renderChart` 逻辑。
- 若未来需要图表，可单独扩展 `MarkdownRenderer` 的插件系统。

### Requirement: Markdown 专用 CSS

**Reason**：原有 `.markdown-*` 与 `.news-content` 下的 Markdown 元素样式与组件高度耦合，不利于复用和维护。

**Migration**：
- 删除 `MarkdownRenderer.vue` 中大量 `.markdown-*` 样式。
- 删除 `NewsDetail.vue` 中 `.news-content` 对 `h1-h6`、`p`、`a`、`code`、`pre`、`table`、`blockquote`、`ul/ol` 的样式覆盖。
- 使用项目全局 CSS 变量 + `MarkdownRenderer` 内部最小化样式实现一致外观。

## 风险与解决方案

| 风险 | 影响 | 解决方案 |
|------|------|----------|
| VitePress 无法直接作为运行时库使用 | 高 | 采用方案 A：使用 VitePress 底层技术栈（markdown-it + Shiki），而非完整 VitePress SSG。 |
| 移除 `highlight.js` CDN 后，Shiki 打包体积增大 | 中 | 仅加载常用语言的高亮；使用 `@shikijs/markdown-it` 的 bundle 方案；将 Shiki 拆分为独立 chunk。 |
| 新闻内容中的 HTML/JS 注入 | 高 | `markdown-it` 默认对 HTML 进行转义；保留现有新闻数据的 XSS 校验；对 Markdown 输出使用 DOMPurify 二次净化（可选）。 |
| 暗色模式/主题切换样式不一致 | 中 | 所有 Markdown 元素颜色使用 `--text-color`、`--text-secondary`、`--card-bg` 等 CSS 变量，确保跟随主题切换。 |
| 数学公式（katex）样式冲突 | 低 | 保留 `katex/dist/katex.min.css`，并在暗色模式下通过 CSS 变量覆盖公式颜色。 |
| 移除 Chart.js 后现有内容异常 | 低 | 当前无实际使用；移除前在新闻数据中确认无 ` ```chart ` 代码块。 |
| 新闻列表摘要纯文本截断导致信息丢失 | 低 | 摘要仅用于列表预览，详情页保留完整 Markdown 渲染。 |
