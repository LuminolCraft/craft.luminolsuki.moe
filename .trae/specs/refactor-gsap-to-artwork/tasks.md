# Tasks

> 变更范围：`refactor-gsap-to-artwork`。任务按依赖顺序排列；Phase 1 必须先完成（其他 phase 全部依赖其常量与入口）；Phase 2-3 在 Phase 1 完成后可并行启动不同的子代理。每个子任务都需通过 `npm run build` 与目视检查（dev server）。
>
> 每个任务含「视觉效果」（你将看到什么）和「技术实现」（供我执行时参考）两部分。

## Phase 1：基础设施（必须最先完成）

- [x] Task 1: 扩展 GSAP 配置常量与插件注册
  - **视觉效果**：页脚海浪开始真正形变；首屏标题用上"艺术品级"自定义缓动；为后续所有动画准备好统一的时长/缓动/错峰常量。
  - **技术实现**：
    - [x] SubTask 1.1: 修改 `src/gsap/plugin-setup.ts`：在 `gsap.registerPlugin(...)` 中显式加入 `MorphSVGPlugin`（从 `gsap/MorphSVGPlugin` 导入）；保持原有 ScrollTrigger / ScrollToPlugin / SplitText / Flip / CustomEase / DrawSVGPlugin / MotionPathPlugin 注册顺序。
    - [x] SubTask 1.2: 修改 `src/gsap/config/easings.ts`：保留 `heroReveal` 字段，但改为懒加载——在 `setupGsapDefaults()` 之后由 `CustomEase.create('heroReveal', 'M0,0 C0.25,1 0.5,1 1,1')` 创建；新增 `parallax: 'none'`、`tilt: 'power3.out'`；导出类型保持 `as const`。
    - [x] SubTask 1.3: 修改 `src/gsap/config/staggers.ts`：新增 `parallaxChars: { each: 0.04, from: 'center' }`、`tiltIcons: { each: 0.06, from: 'random' }`。
    - [x] SubTask 1.4: 修改 `src/composables/useGsap.ts`：保留 `create(callback)` 签名；在 JSDoc 中明确"内部使用 `gsap.context(callback, scope)` 且在 `onUnmounted` 调用 `ctx.revert()`"；增加 `reduceMotion` 工具方法（返回 `matchMedia('(prefers-reduced-motion: reduce)').matches`）供组件直接调用。
    - [x] SubTask 1.5: 删除 5 个未使用 composables：`useEntranceAnimation.ts` / `useHoverAnimation.ts` / `usePageTransition.ts` / `useSplitText.ts` / `useScrollTrigger.ts`（先 `Grep` 确认零引用再删）。
    - [x] SubTask 1.6: 完善 `src/styles/gsap-splittext.css`：补齐 `.split-char / .split-word / .split-line` 的 `will-change: transform, opacity` 与 `.is-visible` 终态样式，确保 SplitText 拆字后无视觉错位。

## Phase 2：修复关键 Bug 与合规层（可与 Phase 3 并行）

- [x] Task 2: 修复 Footer.vue（MorphSVG 真正生效 + 资源隔离）
  - **视觉效果**：页脚海浪**真正开始流动**；社交图标 hover **错峰缩放**；离开页面后动画不再偷偷运行。
  - **技术实现**：
    - [x] SubTask 2.1: 用 `useGsap({ scope: footerRef })` 包裹全部动画；删除 `document.querySelectorAll('.footer-wave-path')`，改为 scope 内的 `gsap.utils.toArray('.footer-wave-path')`。
    - [x] SubTask 2.2: 用 `gsap.matchMedia()` 加 `(prefers-reduced-motion: reduce)` 分支：减少 motion 时直接 `gsap.set` 终态、不启动 MorphSVG 循环。
    - [x] SubTask 2.3: 实现 MorphSVG 形变：`gsap.to('.footer-wave-path-a', { morph: { shape: '.footer-wave-path-b', shapeIndex: 'auto' }, duration: 8, ease: 'power1.inOut', repeat: -1, yoyo: true })`；删除原 `transform: translateX` 的循环位移 tween。
    - [x] SubTask 2.4: 社交图标 hover：`gsap.utils.distribute({ from: 'random', amount: 0.3 })` 错峰 `scale: 1.15`，缓动 `EASINGS.hover`。
    - [x] SubTask 2.5: 删除 `<style>` 中所有 `@keyframes wave-animation` 与对应应用类。
    - [x] SubTask 2.6: 时长/缓动全部引用 `DURATIONS / EASINGS`。

- [x] Task 3: 修复 NewsDetail.vue（选择器 Bug + 阅读进度条 + 灯箱 GSAP 化）
  - **视觉效果**：进入新闻详情页时**标题、段落、列表、引用、表格、图片依次淡入上滑**；顶部多一条**阅读进度条**；点图片**优雅展开到全屏**再优雅收回。
  - **技术实现**：
    - [x] SubTask 3.1: 选择器由 `.news-article` 改为在 `#news-detail` 内部查询；动画对象扩展到 `h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote, table, img`。
    - [x] SubTask 3.2: 加入 `gsap.matchMedia()` 与 `prefers-reduced-motion` 分支。
    - [x] SubTask 3.3: 顶部新增固定阅读进度条 `<div class="reading-progress"><span ref="progressBarRef" /></div>`；用 `ScrollTrigger.create({ trigger: '#news-detail', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: self => gsap.to(progressBarRef.value, { scaleX: self.progress, duration: 0.1, overwrite: true }) })`。
    - [x] SubTask 3.4: 图片灯箱用 `Flip.fit` + `gsap.timeline`：点击图片时记录 `Flip.getState(img)`，展开到全屏 overlay，关闭时 `Flip.from(state, { duration: DURATIONS.slow, ease: EASINGS.smooth })`。
    - [x] SubTask 3.5: 正文 `h1 / h2 / h3` 用 `SplitText({ type: 'chars,words' })` 拆字后入场（按 `STAGGERS.parallaxChars`）。
    - [x] SubTask 3.6: 所有动画在 `useGsap({ scope: articleRef })` 内；时长/缓动引用常量。

- [x] Task 4: 修复 LastViewedPopup / CookieConsentBanner（context + matchMedia）
  - **视觉效果**：弹窗出现/消失**更柔和**（带弹性）；开"减少动画"时直接显示不动画。
  - **技术实现**：
    - [x] SubTask 4.1: LastViewedPopup 改为 `useGsap({ scope: popupRef })`；硬编码时长替换为 `DURATIONS.standard / DURATIONS.slow`；加入 `gsap.matchMedia()` reduceMotion 分支。
    - [x] SubTask 4.2: CookieConsentBanner 改为 `useGsap({ scope: bannerRef })`；保留 timeline + position 参数；缓动替换为 `EASINGS.bounce`；加入 reduceMotion 分支。

## Phase 3：艺术品级动画（可与 Phase 2 并行）

- [x] Task 5: Home.vue 整体重新布局排版 + 艺术品化
  - **视觉效果**：
    - **首屏**：标题"LuminolCraft"超大字号拆两行，**左对齐**，每个字母从中间向两边错峰飘上来；服务器状态卡**浮在右下角微倾 -2deg**；右下角有"SCROLL ↓"垂直指示器持续浮动；背景叠加**细微 noise 纹理**。
    - **Features**：改成 **Bento 不等大小网格**（第 1 张大卡占 2 列 + 后 2 张小卡），不同圆角与渐变，图标方形+圆形混搭，卡片间用细线分割。
    - **Servers**：改成 **左右分屏对比**，中间渐变发光分割线；鼠标移到哪边那边放大、另一边缩小；类型用超大数字 "01" / "02"。
    - **Team**：改成 **Masonry 错落布局**，头像"宝丽来"风格（白边+微旋转），卡片不同透明度，子分组横向滚动 carousel。
    - **背景图**随滚动**视差推远**；特性图标**沿曲线轻轻浮动**。
  - **技术实现**：
    - [x] SubTask 5.1: 重写 hero HTML 结构：`.hero-content` 改为单列左对齐；标题 `<h1 class="hero-title">Luminol<br>Craft</h1>`；状态卡 `<div class="status-card status-card--float">` 加 `transform: rotate(-2deg)`；新增 `<div class="scroll-indicator">SCROLL ↓</div>` 与 `<div class="noise-overlay"></div>`。
    - [x] SubTask 5.2: 标题 CSS 改 `font-size: clamp(3rem, 10vw, 8rem); text-align: left; line-height: 0.95; letter-spacing: -0.04em`；标题渐变保留但加 `background-size: 200% auto` 配合 GSAP `gradientShift` 动画。
    - [x] SubTask 5.3: 用 `new SplitText('.hero-title', { type: 'chars,words' })` 拆 "LuminolCraft"；`gsap.from(chars, { yPercent: 120, autoAlpha: 0, rotateZ: 8, stagger: gsap.utils.distribute({ from: 'center', amount: 0.6 }), duration: DURATIONS.slow, ease: EASINGS.heroReveal })`。
    - [x] SubTask 5.4: 副标题用 `SplitText({ type: 'lines' })` 拆行，timeline position `'-=0.4'` 入场。
    - [x] SubTask 5.5: 背景图改为 `gsap.to('.header-background', { yPercent: 30, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: true } })`。
    - [x] SubTask 5.6: "SCROLL ↓" 指示器：`gsap.to('.scroll-indicator', { y: 8, duration: 1.4, ease: 'sine.inOut', repeat: -1, yoyo: true })`；ScrollTrigger 在用户开始下滑后 `gsap.to('.scroll-indicator', { autoAlpha: 0, duration: 0.4 })`。
    - [x] SubTask 5.7: 重写 Features HTML：`.features-grid { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: auto auto; gap: 0; }`；第 1 张加 `.feature-card--lg` 占 `grid-column: 1 / 2; grid-row: 1 / 3`；卡片间用 `border-right: 1px solid var(--glass-border)` 与 `border-bottom` 分割。
    - [x] SubTask 5.8: 卡片不同圆角：`.feature-card--lg { border-radius: 24px }` / `.feature-card { border-radius: 16px }`；不同渐变背景按 `:nth-child` 设置；图标第 1 张 `border-radius: 16px`（方形）后 2 张 `border-radius: 50%`（圆形）。
    - [x] SubTask 5.9: 特性卡改为 `ScrollTrigger.batch('.feature-card', { start: 'top 85%', batchMax: () => window.innerWidth < 768 ? 2 : 4, onEnter: batch => gsap.from(batch, { y: 60, autoAlpha: 0, stagger: STAGGERS.cards, ease: EASINGS.entrance, overwrite: true }), onLeaveBack: batch => gsap.set(batch, { autoAlpha: 0, y: 60 }) })`。
    - [x] SubTask 5.10: 特性图标 `MotionPathPlugin` 沿 SVG path `#icon-float-path` 轻浮动：`gsap.to('.feature-icon', { motionPath: { path: '#icon-float-path', align: 'self', alignOrigin: [0.5, 0.5] }, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' })`。
    - [x] SubTask 5.11: 重写 Servers HTML：`.servers-grid { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 0; }`；中间 `<div class="servers-divider"></div>` 加渐变发光背景；每张卡加 `<span class="server-index">01</span>` / `02`，CSS `font-size: clamp(4rem, 12vw, 10rem); font-weight: 900; opacity: 0.08`。
    - [x] SubTask 5.12: Servers 鼠标对比效果：`.servers-grid` 上 `mousemove` 监听，用 `gsap.utils.mapRange(0, width, 1, 0.92, e.offsetX)` 算左卡 scale，右卡反向；缓动 `EASINGS.smooth`，`overwrite: 'auto'`。
    - [x] SubTask 5.13: 重写 Team HTML：`.contributors-flex` 改为 `columns: 4; column-gap: 1.5rem`；卡片 `break-inside: avoid; display: inline-block; width: 100%`；不同卡片 `:nth-child` 设不同 `padding / opacity` (0.85/0.95/1.0)。
    - [x] SubTask 5.14: 头像"宝丽来"化：`.contributor-avatar-container { padding: 8px 8px 32px; background: white; box-shadow: 0 4px 16px rgba(0,0,0,0.15) }`；`transform: rotate(gsap.utils.random(-3, 3))` 在 onMounted 内一次性 set。
    - [x] SubTask 5.15: 子分组 `.contributors-flex` 改为 `overflow-x: auto; scroll-snap-type: x mandatory; display: flex`；卡片 `scroll-snap-align: start; min-width: 280px`。
    - [x] SubTask 5.16: 删除 `@keyframes wave-animation / gentleShift / pulse / fadeIn / fadeInUp / slideInFromLeft / slideInFromRight / float / gradientShift` 等死代码；CSS 中被 GSAP 动画的元素移除冲突的 `transition: transform / opacity / filter`，加 `will-change: transform, opacity`。
    - [x] SubTask 5.17: 把所有 timeline 的 delay 链改为 position 参数（`'-=0.3'` 等）。
    - [x] SubTask 5.18: 加 `gsap.matchMedia()` 含 `(prefers-reduced-motion: reduce)` 分支：所有装饰动画跳到终态；状态卡直接显示；特性卡直接显示。

- [x] Task 6: NotFound.vue 艺术化
  - **视觉效果**："404" 三个字**带旋转错峰登场**；主图标**持续上下浮动**；背景 SVG 线条**像被笔慢慢描出来**。
  - **技术实现**：
    - [x] SubTask 6.1: 用 SplitText 拆 "404"，字符 `rotation: gsap.utils.random(-12, 12)`，timeline position `'-=0.15'` 错峰入场；缓动 `EASINGS.bounce`。
    - [x] SubTask 6.2: 持续浮动：`gsap.to('.not-found-icon', { y: -16, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true })`。
    - [x] SubTask 6.3: 背景 SVG `<path>` 用 `DrawSVGPlugin` 描线：`gsap.from('.bg-path', { drawSVG: '0%', duration: 2.4, ease: 'power2.inOut', stagger: 0.2 })`。
    - [x] SubTask 6.4: 加 `gsap.matchMedia()` reduceMotion 分支：跳过 yoyo 与 DrawSVG，仅做简单淡入。

- [x] Task 7: SimpleRules.vue / Support.vue / Archive.vue 提升
  - **视觉效果**：规则页所有内容**逐个浮现**，引用块左边竖线**像被笔描**；支持页卡片 hover **3D 倾斜**，FAQ 折叠**平滑过渡**；归档页**也有入场动画**了。
  - **技术实现**：
    - [x] SubTask 7.1: SimpleRules 标题/日期/blockquote/反引代码块入场；规则项 `ScrollTrigger.batch` + `STAGGERS.list`；blockquote 左竖线用 `DrawSVGPlugin` 描线；删除 `vercel-animate-fadeInUp` 类与死 `@keyframes`。
    - [x] SubTask 7.2: Support 卡片 3D tilt：`mousemove` 中用 `gsap.utils.mapRange(0, width, -10, 10, e.offsetX)` 计算 `rotateY`；FAQ 折叠用 `Flip.from(state, { duration: DURATIONS.standard, ease: EASINGS.smooth, absoluteOnLeave: true })`；删除 `vercel-animate-fadeInUp` 类。
    - [x] SubTask 7.3: Archive 删除 `console.log`；为存档列表加入 `ScrollTrigger.batch` 入场（复用 `STAGGERS.list`）。

- [x] Task 8: Navbar.vue / ColorSchemeSwitcher.vue / TocToggles.vue 提升
  - **视觉效果**：汉堡按钮**优雅变形成 X**；侧边栏滑入**带弹性**；主题切换**圆形扩散**到全屏；图标切换**旋转交叉淡入**；配色卡 hover 不再抖动。
  - **技术实现**：
    - [x] SubTask 8.1: Navbar Burger 图标用 `gsap.timeline()` 把三条线变形成 X（`rotate: 45 / translateY / rotate: -45`），position 参数串联；侧边栏入场用 `EASINGS.heroReveal`；加 reduceMotion 分支直接 toggle 类名。
    - [x] SubTask 8.2: ColorSchemeSwitcher 移除 CSS `transition: all 0.3s ease` 与 `:hover { transform }`；改为 `useGsap` 中 `gsap.to('.swatch', { y: -2, rotate: 6, ease: EASINGS.hover, duration: DURATIONS.fast })`；CSS 仅留 `will-change: transform`。
    - [x] SubTask 8.3: TocToggles 移除 CSS `transition: opacity 200ms ease, transform 200ms ease`；图标切换用 `gsap.timeline()`：当前图标 `rotate: 90, autoAlpha: 0`，新图标 `rotate: 0, autoAlpha: 1`；主题切换圆形扩散改用 `gsap.to(overlay, { clipPath: 'circle(150% at x y)', duration: DURATIONS.slow, ease: EASINGS.smooth })`，替换 WAAPI。

## Phase 4：收尾与统一

- [x] Task 9: 全局验证与 News.vue 对齐
  - **视觉效果**：所有页面动画**统一风格**（时长/缓动一致）；滚动**60fps 不卡**；开"减少动画"后**所有装饰跳过**；无残留死代码。
  - **技术实现**：
    - [x] SubTask 9.1: `News.vue` 中已有占位动画，仅替换硬编码 `0.4 / 0.6 / power2.out` 为 `DURATIONS / EASINGS`；确认 `will-change: transform` 已在骨架卡上声明（之前完成）。
    - [x] SubTask 9.2: 全项目 `Grep` 残留的 `transition: all` / `transition: transform` / `transition: opacity` 在被 GSAP 动画的元素上的实例，逐一移除或限制到非冲突属性。
    - [x] SubTask 9.3: 全项目 `Grep` 残留的 `@keyframes` 死代码（`wave-animation / gentleShift / pulse / fadeIn / fadeInUp / vercel-animate-fadeInUp`）并删除。
    - [x] SubTask 9.4: 运行 `npm run build` 与 `npm run dev`，逐页目视验证；用浏览器 DevTools Performance 录制 5s 滚动，确认无 Long Task > 50ms 且 FPS ≥ 55。
    - [x] SubTask 9.5: 在系统设置中开启 `prefers-reduced-motion: reduce`，逐页确认装饰动画被跳过。

# Task Dependencies

- Task 1（Phase 1）必须最先完成；其他所有 Task 依赖其新增的常量与 `useGsap` 入口。
- Task 2 / Task 3 / Task 4（Phase 2）之间无依赖，可并行子代理。
- Task 5 / Task 6 / Task 7 / Task 8（Phase 3）之间无依赖，可并行子代理。
- Task 9（Phase 4）依赖 Phase 2 + Phase 3 全部完成。
