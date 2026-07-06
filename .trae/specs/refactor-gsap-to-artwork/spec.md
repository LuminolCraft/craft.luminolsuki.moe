# 把项目动画重做成艺术品级 Spec

> 这份文档分两部分：上半部分**用大白话**告诉你"做完后你能看到什么"，下半部分是**给我看的技术清单**，确保严格遵循 8 项 GSAP Skills。你只需要看上半部分判断是否符合你想要的美感。

## 你能看到的视觉变化（为什么要做这次重构）

### 现在的问题（5 个）

1. **页脚海浪不动**：底部那条 SVG 波浪，代码里写好了形变动画，但因为插件没注册成功，**实际上一动不动**——你看到的只是静态图。
2. **新闻详情页啥动画都没有**：进入新闻详情页，本该有标题/段落/图片逐个淡入的优雅效果，但因为选择器写错了（`.news-article` 但模板里是 `#news-detail`），**整页动画全失效**，所有内容"啪"一下全出现。
3. **切换页面时卡顿、抖动**：主题切换按钮、配色卡、Home 首页等地方，CSS 自己有一套过渡，GSAP 也想动画同一属性，**两边打架**，导致抖动。
4. **关掉的动画还在偷偷跑**：页脚、最近浏览弹窗、Cookie 横幅这几个组件，离开页面后动画**没被清理**，仍在后台运行，拖慢性能。
5. **美感不够"艺术品"**：首屏标题"LuminolCraft"现在只是整体淡入；卡片没有 3D 倾斜；404 页很普通；阅读新闻时没有进度条；图片点击不能优雅放大。

### 重构后你会看到什么

#### 首页（Home）—— 整体重新布局排版

> 当前首页太"传统"：标题居中、3 张等宽特性卡、2 列服务器卡、团队一排排卡片。重做成"艺术品"质感：

- **首屏布局**：
  - 不再用 2 列网格（文字 + 状态卡）。
  - **"LuminolCraft" 标题超大字号**（`clamp(3rem, 10vw, 8rem)`），可能拆成两行 "Luminol" + "Craft"，**每个字母都能单独动画**。
  - 标题、副标题、描述、按钮**全部左对齐**，不再居中——更有杂志感。
  - **服务器状态卡浮在右下角**，半透明玻璃质感，**微倾 -2deg**，像随手放在桌上的卡片。
  - 右下角加一条**"SCROLL ↓"垂直滚动指示器**，持续轻微浮动提示用户下滑。
  - 背景图保持轮播，但叠加一层**细微 noise 纹理**增加质感（不再是平的画面）。
- **"LuminolCraft" 标题入场**：每个字母**从中间向两边错峰**飘上来，像水波荡开，带一点旋转的微抖。
- **副标题**：一行行从下往上滑入，跟标题衔接得天衣无缝。
- **背景图**：往下滑时，背景图**慢慢被推远 + 微微放大**，有视差纵深感。
- **Features 区域改 Bento Grid**：
  - 不再是 3 张等宽卡片，改成 **Bento 不等大小网格**：第 1 张大卡（占 2 列）+ 后 2 张小卡。
  - 卡片有**不同圆角、不同渐变背景**，避免统一感，像杂志拼贴。
  - 图标不再都是圆形：第 1 张用大方形，后 2 张用圆形——制造视觉节奏。
  - 卡片之间用**细线分割**而非纯间距，更像版式设计。
  - 滚动到视野时**分批**浮现（手机 2 张一批、桌面 4 张一批）。
  - 特性图标**沿一条看不见的曲线轻轻浮动**，像在水面上漂。
- **Servers 区域改分屏对比**：
  - 不再 2 列等宽，改成 **左右分屏对比**：左边生存服，右边创造服，中间一条渐变发光分割线。
  - **鼠标移到哪边，那边放大、另一边缩小**（像 VS 对比效果）。
  - 服务器类型用**超大数字 "01" / "02"** 作为视觉锚点，字号 `clamp(4rem, 12vw, 10rem)`。
- **Team 区域改 Masonry 错落**：
  - 不再是统一大小的卡片，改成 **Masonry 错落布局**：贡献者卡片不等高、不等宽。
  - 头像放大成**"宝丽来"风格**（白边 + 微旋转 ±3deg），像照片贴在墙上。
  - 卡片有**不同透明度**（0.85 / 0.95 / 1.0），制造层次感。
  - 子分组改**横向滚动 carousel**（而非纵向堆叠），左右拖动浏览。

#### 新闻列表（News）
- 之前的骨架屏动画保留。
- 卡片 hover 时**跟着鼠标 3D 倾斜**（像拿一张名片在手里翻看）。

#### 新闻详情（NewsDetail）
- **顶部多一条进度条**：你读到哪，进度条就长到哪，颜色跟主题对齐。
- **图片可点击放大**：点图片时，图片**从原位优雅展开到全屏**（不是突兀弹窗），关闭时再优雅收回。
- **正文标题**：每个字**逐个高亮浮现**，不再是整段一起出现。
- **所有内容**（标题、段落、列表、引用、表格、图片）**依次淡入上滑**。

#### 404 页（NotFound）
- **"404" 三个字**：每个数字**带轻微旋转**错峰登场，像被风吹起来。
- **主图标**：持续**上下浮动**，像在呼吸。
- **背景 SVG 线条**：像有人**用笔慢慢描出来**一样逐条画完。

#### 规则页（SimpleRules）
- 标题、日期、规则项、代码块**逐个浮现**。
- 引用块左边的竖线**像被笔描出来**。

#### 支持页（Support）
- 卡片 hover 时**3D 倾斜**。
- FAQ 折叠/展开**平滑过渡**，不再"啪"一下。

#### 导航栏（Navbar）
- **汉堡按钮**：点一下，三条线**优雅变形成 X**，不再是简单切换图片。
- **侧边栏**：滑入时带**弹性缓动**，更有质感。

#### 页脚（Footer）
- **海浪 SVG**：两条波浪线**互相形变**，像真正的海浪在涌动（8 秒一个循环）。
- **社交图标**：hover 时**错峰缩放**，像水面涟漪。

#### 主题切换（ColorSchemeSwitcher / TocToggles）
- 圆形扩散切换主题：从点击位置**圆形扩散**到全屏，更优雅。
- 图标切换：**旋转交叉淡入**，不再是生硬切换。
- 主题切换不再与 CSS 打架（抖动消失）。

#### 弹窗（LastViewedPopup / CookieConsentBanner）
- 出现/消失带**弹性缓动**，更柔和。

#### 全局体验
- **系统开"减少动画"**：所有装饰动画**自动跳过**，直接显示终态——尊重无障碍需求。
- **滚动更顺滑**：60fps 不卡顿。
- **切换页面不再有残留动画**。

---

## What Changes（变更清单）

### 修复层
- **BREAKING**（仅内部）：删除 5 个没人用的 composables（`useEntranceAnimation / useHoverAnimation / usePageTransition / useSplitText / useScrollTrigger`），统一用 `useGsap` 一个入口。
- 修复 [Footer.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/components/Footer.vue)：注册 MorphSVGPlugin；用 `useGsap({ scope })` 包裹；删全局选择器；删死 CSS `@keyframes`；加 reduceMotion 分支。
- 修复 [NewsDetail.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/views/NewsDetail.vue)：选择器 `.news-article` → `#news-detail` 内部子元素；动画对象扩展到 `h1-h6 / p / ul / ol / blockquote / table / img`；加 reduceMotion 分支。
- [plugin-setup.ts](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/gsap/plugin-setup.ts) 显式注册 MorphSVGPlugin。
- 所有视图/组件统一：`useGsap({ scope: containerRef })` + `gsap.matchMedia()`；硬编码时长/缓动替换为 `DURATIONS / EASINGS / STAGGERS`。
- 消除 CSS/GSAP 同属性冲突：ColorSchemeSwitcher / TocToggles / Home 中将 CSS `transition` 限制到非冲突属性，或改为 `will-change: transform` + GSAP 独占。
- 动画元素 CSS 加 `will-change: transform, opacity`，`onComplete` 用 `gsap.set` 清除。

### 美感层
- **Home 首屏重新布局**：HTML 结构改为左对齐 hero + 右下角浮卡；标题 `clamp(3rem, 10vw, 8rem)` 拆两行；新增 `.scroll-indicator` + `.noise-overlay`；SplitText 拆字 + `gsap.utils.distribute({ from: "center" })`；副标题 SplitText 拆行；背景图 ScrollTrigger scrub 视差 + scale。
- **Home Features 改 Bento Grid**：HTML 改 `grid-template-columns: 2fr 1fr; grid-template-rows: auto auto;`，第 1 张 `.feature-card--lg` 占 2 列；卡片不同圆角（24px / 16px）与渐变；图标第 1 张方形后 2 张圆形；卡片间用 1px 细线分割；ScrollTrigger.batch + 响应式 batchMax；特性图标 MotionPathPlugin 浮动。
- **Home Servers 改分屏对比**：HTML 改 `grid-template-columns: 1fr 1px 1fr`，中间渐变发光分隔线；左右卡片用 `gsap.to(scale)` 跟随鼠标 X 位置（`gsap.utils.mapRange`）；类型用 `<span class="server-index">01</span>` 超大数字 `clamp(4rem, 12vw, 10rem)`。
- **Home Team 改 Masonry**：HTML 改 CSS columns 或 grid masonry；卡片 `break-inside: avoid`；不同卡片不同 `padding / opacity`；头像加 `padding: 8px 8px 32px; background: white; transform: rotate(gsap.utils.random(-3, 3))`；子分组用横向 `overflow-x: auto; scroll-snap-type: x mandatory`。
- **News 列表**：卡片 `gsap.utils.distribute({ from: "start", grid: "auto" })`；hover 3D tilt（`rotateY / rotateX` + `transformPerspective: 800`）。
- **NewsDetail**：顶部阅读进度条（ScrollTrigger scrub）；图片灯箱 timeline + Flip；正文标题 SplitText 拆字。
- **NotFound**：SplitText 拆 "404" + `rotation: gsap.utils.random(-12, 12)`；持续 yoyo 浮动；背景 SVG DrawSVGPlugin 描线。
- **SimpleRules**：标题/日期/规则列表/代码块入场；规则项 ScrollTrigger.batch + STAGGERS.list；blockquote DrawSVGPlugin 描左边竖线。
- **Support**：卡片 3D hover tilt；FAQ 折叠用 Flip。
- **Navbar**：Burger 图标 timeline 变形成 X；侧边栏入场用 CustomEase 弹性；reduceMotion 分支。
- **Footer**：海浪 MorphSVGPlugin 循环形变；社交图标 hover `gsap.utils.distribute` 错峰缩放。
- **LastViewedPopup / CookieConsentBanner**：timeline + `EASINGS.bounce`；reduceMotion 对齐。
- **ColorSchemeSwitcher / TocToggles**：主题切换 `gsap.to` + clipPath（替换 WAAPI）；图标 timeline 旋转交叉淡入。
- **全局**：`heroReveal` CustomEase 实际应用到首屏；`EASINGS` 扩展 `parallax`、`tilt`；`STAGGERS` 扩展 `parallaxChars`、`tiltIcons`。

### 清理层
- 删除 Home/Footer/Support/SimpleRules 中所有死 `@keyframes` 与 `vercel-animate-fadeInUp` 类。
- 删除 Archive.vue 中无意义 `console.log`，补齐基础入场动画。
- match-media.ts 保留全局 `mm` 导出；组件级优先用局部 `gsap.matchMedia()`。
- gsap-splittext.css 补齐 `.split-char.is-visible` 等过渡样式。

## Impact

- **Affected specs**：无（与 `migrate-markdown-to-vitepress` 不重叠；`add-news-card-loading-placeholder` 已完成且兼容）。
- **Affected code**（共 18 文件）：
  - 视图：[Home.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/views/Home.vue)、[NewsDetail.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/views/NewsDetail.vue)、[Support.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/views/Support.vue)、[NotFound.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/views/NotFound.vue)、[SimpleRules.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/views/SimpleRules.vue)、[Archive.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/views/Archive.vue)、[News.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/views/News.vue)（仅微调对齐新常量）
  - 组件：[Navbar.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/components/Navbar.vue)、[Footer.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/components/Footer.vue)、[LastViewedPopup.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/components/LastViewedPopup.vue)、[CookieConsentBanner.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/components/CookieConsentBanner.vue)、[ColorSchemeSwitcher.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/components/ColorSchemeSwitcher.vue)、[TocToggles.vue](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/components/TocToggles.vue)
  - GSAP 配置：[plugin-setup.ts](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/gsap/plugin-setup.ts)、[easings.ts](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/gsap/config/easings.ts)、[staggers.ts](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/gsap/config/staggers.ts)
  - Composables：删除 5 个未使用文件，保留并完善 `useGsap.ts`
  - 样式：[gsap-splittext.css](file:///c:/Users/Administrator/Desktop/craft.luminolsuki.moe/src/styles/gsap-splittext.css)
- **运行时影响**：插件加载时间略增（MorphSVG 真正生效后），但通过 `gsap.matchMedia` + `will-change` + transform 别名 + 批量 ScrollTrigger，运行时帧率保持 60fps；卸载泄漏归零。

---

## 实现细节（供开发者参考，你不用看这部分）

### ADDED Requirements

#### Requirement: GSAP Skills 合规基线
项目内每一个使用 `gsap.*` 或 `ScrollTrigger.*` 的文件 SHALL 满足 8 项 Skills 的强制条款。

##### Scenario: 组件卸载无泄漏
- **WHEN** 任意使用 GSAP 的组件被卸载
- **THEN** 其所有 tween 与 ScrollTrigger 通过 `gsap.context()` 的 `ctx.revert()` 一并清除，且无 console 警告

##### Scenario: 选择器作用域隔离
- **WHEN** 组件内调用 `gsap.to(".foo")`
- **THEN** 选择器只匹配该组件 `scope` 内的元素，绝不命中其他组件或全局

##### Scenario: 动画属性独占
- **WHEN** GSAP 动画元素的 `transform / opacity / filter`
- **THEN** 同一元素 CSS 不再声明 `transition: transform/opacity/filter`；改为 `will-change: transform, opacity`

##### Scenario: 响应式与可访问性
- **WHEN** 用户系统设置 `prefers-reduced-motion: reduce`
- **THEN** 所有装饰性 GSAP 动画直接跳到终态或保持静止

##### Scenario: 统一常量
- **WHEN** 编写新的 tween
- **THEN** `duration` / `ease` / `stagger` 引用 `DURATIONS` / `EASINGS` / `STAGGERS`，禁止硬编码字面量

#### Requirement: 艺术品级动画体验
项目 SHALL 通过 SplitText 拆字、CustomEase 自定义曲线、ScrollTrigger 视差与 batch、MorphSVG 形变、DrawSVG 描线、Flip 状态过渡、MotionPath 路径动画，使首屏、卡片、详情页、404 页达到"艺术品"质感。

##### Scenario: 首屏标题入场
- **WHEN** 用户首次进入 Home
- **THEN** "LuminolCraft" 经 SplitText 拆字，字符按 `from: "center"` 错峰从 `yPercent: 100 + autoAlpha: 0` 入场，使用 `heroReveal` CustomEase

##### Scenario: 卡片 3D hover
- **WHEN** 用户鼠标悬停 News / Support 卡片
- **THEN** 卡片以鼠标位置为锚点产生 `rotateY / rotateX` 3D tilt，`transformPerspective: 800`，缓动 `EASINGS.tilt`

##### Scenario: 阅读进度条
- **WHEN** 用户阅读 NewsDetail
- **THEN** 顶部固定进度条由 `ScrollTrigger scrub` 驱动 `scaleX 0→1`

##### Scenario: Footer 波浪形变
- **WHEN** 页面挂载 Footer
- **THEN** 两条 SVG path 通过 MorphSVGPlugin 在 8s 周期内循环形变，缓动 `power1.inOut`

##### Scenario: 404 艺术化
- **WHEN** 用户进入 NotFound
- **THEN** "404" 经 SplitText 拆字微抖入场，背景 SVG 用 DrawSVGPlugin 描线，主图标持续 yoyo 浮动

### MODIFIED Requirements

#### Requirement: GSAP 配置入口
`setupGsap()` SHALL 在 `registerGsapPlugins()` 中显式注册 MorphSVGPlugin；`EASINGS.heroReveal` 由 CustomEase 实际创建并暴露；新增 `parallax`、`tilt`；`STAGGERS` 新增 `parallaxChars`、`tiltIcons`。

#### Requirement: 组件动画入口
所有视图/组件 SHALL 通过 `useGsap({ scope: containerRef })` 创建动画；`useGsap` 内部 SHALL 使用 `gsap.context(callback, scope)` 并在 `onUnmounted` 调用 `ctx.revert()`。

### REMOVED Requirements

#### Requirement: 未使用的 composables
**Reason**：`useEntranceAnimation / useHoverAnimation / usePageTransition / useSplitText / useScrollTrigger` 全项目零引用，且未实现 context/scope，违反 gsap-frameworks / gsap-react。
**Migration**：统一使用 `useGsap`；需要 SplitText 时在 `useGsap.create((g) => { new SplitText(...) })` 内创建，由 context 自动 revert。

#### Requirement: 死 CSS 关键帧
**Reason**：`@keyframes wave-animation / gentleShift / pulse / fadeIn / fadeInUp / vercel-animate-fadeInUp` 等已被 GSAP 取代，且与 GSAP 同属性冲突。
**Migration**：删除对应 `@keyframes` 与应用类；动画全部由 GSAP 接管。

---

## 附录：GSAP Skills 合规矩阵

| 规则 | 来源 Skill | 落地位置 |
|---|---|---|
| 一律通过 `gsap.context()` + `ctx.revert()` 包裹与清理 | gsap-react / gsap-frameworks | `useGsap.ts` + 所有组件 |
| 选择器必须 `scope` 隔离 | gsap-react / gsap-utils (`selector(scope)`) | `useGsap({ scope })` |
| 用 `gsap.matchMedia()` 处理响应式 + `prefers-reduced-motion` | gsap-frameworks / gsap-core | 每个组件内局部 mm |
| 优先 `autoAlpha` 而非 `opacity` | gsap-core | 所有入场动画 |
| 优先 transform 别名（x/y/xPercent/scale/rotation）| gsap-performance | 全项目 |
| `will-change: transform, opacity` 并在 `onComplete` 清除 | gsap-performance | 动画元素 CSS |
| 用 `gsap.timeline` + position 参数，禁止 delay 链 | gsap-timeline | Home / Navbar / NotFound 等 |
| `ScrollTrigger.batch` + `batchMax` 响应式 | gsap-scrolltrigger | Home / News / SimpleRules |
| `scrub` 视差 + `pin` 谨慎使用 | gsap-scrolltrigger | Home 背景 / NewsDetail 进度条 |
| 插件显式 `gsap.registerPlugin` | gsap-plugins | `plugin-setup.ts` |
| MorphSVG / DrawSVG / MotionPath / Flip / SplitText / CustomEase 实际启用 | gsap-plugins | Footer / NotFound / Home / NewsDetail |
| `gsap.utils.toArray / distribute / clamp / mapRange / random / selector / pipe` 按场景使用 | gsap-utils | 各组件 |
| 不在 SSR 期间运行 gsap | gsap-react | `useGsap` 仅在 `onMounted` 内 create |
| 颜色用 `splitColor` / 单位用 `getUnit` / `unitize` | gsap-utils | 需要时 |
| 优先函数式 util（省略 value）以便复用 | gsap-utils | 滚动/鼠标回调 |
