# Checklist

> 用于 `refactor-gsap-to-artwork` 验证。每个检查点含「你看到的现象」和「技术验证」两部分。前一部分你可直接判断，后一部分供我执行时核对。

## Phase 1：基础设施

- [x] **页脚海浪开始真正形变**（不再静态） | 技术验证：`src/gsap/plugin-setup.ts` 中显式 `gsap.registerPlugin(MorphSVGPlugin)`，且 `import 'gsap/MorphSVGPlugin'` 语句存在。
- [x] **首屏标题用上"艺术品级"自定义缓动** | 技术验证：`EASINGS` 导出 `heroReveal`（懒加载 CustomEase）、`parallax`、`tilt`；类型保持 `as const`。
- [x] **错峰常量就绪** | 技术验证：`STAGGERS` 导出 `parallaxChars`、`tiltIcons`。
- [x] **离开页面后动画不再偷偷运行** | 技术验证：`useGsap.ts` 内部使用 `gsap.context(callback, scope)`，并在 `onUnmounted` 调用 `ctx.revert()`。
- [x] **`useGsap` 提供"减少动画"工具** | 技术验证：`useGsap.ts` 暴露 `reduceMotion()` 工具方法。
- [x] **5 个未使用 composables 已删除** | 技术验证：`Grep` 全项目零引用 `useEntranceAnimation / useHoverAnimation / usePageTransition / useSplitText / useScrollTrigger`。
- [x] **SplitText 拆字后无视觉错位** | 技术验证：`gsap-splittext.css` 含 `.split-char / .split-word / .split-line` 的 `will-change: transform, opacity` 与 `.is-visible` 终态。

## Phase 2：关键 Bug 修复与合规层

### Footer.vue
- [x] **页脚海浪真正流动**（8 秒一个循环） | 技术验证：`gsap.to('.footer-wave-path-a', { morph: { shape: '.footer-wave-path-b' } })` 真正运行。
- [x] **社交图标 hover 错峰缩放** | 技术验证：使用 `gsap.utils.distribute`。
- [x] **离开页面后页脚动画停止** | 技术验证：使用 `useGsap({ scope: footerRef })`；无 `document.querySelectorAll` 全局选择器。
- [x] **开"减少动画"后页脚不动画** | 技术验证：`gsap.matchMedia()` 含 `(prefers-reduced-motion: reduce)` 分支。
- [x] **`<style>` 中无残留旧关键帧** | 技术验证：无 `@keyframes wave-animation`。
- [x] **时长/缓动统一** | 技术验证：全部引用 `DURATIONS / EASINGS`。

### NewsDetail.vue
- [x] **进入新闻详情页时所有内容依次淡入上滑** | 技术验证：选择器在 `#news-detail` 内部查询；动画对象含 `h1-h6 / p / ul / ol / blockquote / table / img`。
- [x] **顶部出现阅读进度条**（你读到哪，进度条长到哪） | 技术验证：固定进度条由 `ScrollTrigger scrub` 驱动 `scaleX 0→1`。
- [x] **点图片优雅展开到全屏再优雅收回** | 技术验证：图片灯箱使用 `Flip.fit` / `Flip.from`。
- [x] **正文标题每个字逐个高亮浮现** | 技术验证：`h1 / h2 / h3` 经 `SplitText` 拆字入场，按 `STAGGERS.parallaxChars`。
- [x] **开"减少动画"后详情页不动画** | 技术验证：`gsap.matchMedia()` 含 reduceMotion 分支。
- [x] **离开页面后详情页动画停止** | 技术验证：全部动画在 `useGsap({ scope })` 内。

### LastViewedPopup.vue / CookieConsentBanner.vue
- [x] **弹窗出现/消失更柔和（带弹性）** | 技术验证：两个组件均使用 `useGsap({ scope })`；硬编码时长替换为 `DURATIONS.*`；CookieConsentBanner 缓动使用 `EASINGS.bounce`。
- [x] **开"减少动画"后弹窗直接显示** | 技术验证：两个组件含 reduceMotion 分支。

## Phase 3：艺术品级动画

### Home.vue
- [x] **首屏标题"LuminolCraft"超大字号拆两行，左对齐** | 技术验证：`<h1 class="hero-title">Luminol<br>Craft</h1>`；CSS `font-size: clamp(3rem, 10vw, 8rem); text-align: left; line-height: 0.95`。
- [x] **"LuminolCraft" 每个字母从中间向两边错峰飘上来，带微抖旋转** | 技术验证：经 `SplitText` 拆字，`stagger: gsap.utils.distribute({ from: 'center', amount: 0.6 })`，缓动 `EASINGS.heroReveal`。
- [x] **服务器状态卡浮在右下角微倾 -2deg** | 技术验证：`.status-card--float` 加 `transform: rotate(-2deg)`；位置 `position: absolute` 或 `fixed` 在 hero 右下。
- [x] **右下角"SCROLL ↓"指示器持续浮动，下滑后消失** | 技术验证：`.scroll-indicator` 存在；`gsap.to` yoyo 浮动；ScrollTrigger 触发 `autoAlpha: 0`。
- [x] **背景叠加细微 noise 纹理** | 技术验证：`.noise-overlay` 存在；含 SVG noise 或 base64 noise 背景；`mix-blend-mode: overlay`。
- [x] **副标题一行行滑入** | 技术验证：`SplitText({ type: 'lines' })` 拆行，timeline position `'-=0.4'`。
- [x] **背景图随滚动视差推远** | 技术验证：背景图 `ScrollTrigger scrub` 视差（`yPercent: 30, scale: 1.1, ease: 'none'`）。
- [x] **Features 区域是 Bento 不等大小网格（第 1 张大卡占 2 列）** | 技术验证：`.features-grid` 用 `grid-template-columns: 2fr 1fr`；`.feature-card--lg` 占 2 列。
- [x] **Features 卡片有不同圆角与渐变** | 技术验证：`.feature-card--lg { border-radius: 24px }` / `.feature-card { border-radius: 16px }`；`:nth-child` 设置不同背景渐变。
- [x] **Features 图标方形+圆形混搭** | 技术验证：第 1 张图标 `border-radius: 16px`，后 2 张 `border-radius: 50%`。
- [x] **Features 卡片间用细线分割（不是间距）** | 技术验证：`gap: 0` + `border-right / border-bottom: 1px solid var(--glass-border)`。
- [x] **特性卡分批浮现（手机 2 张、桌面 4 张一批）** | 技术验证：`ScrollTrigger.batch` 含响应式 `batchMax` 函数。
- [x] **特性图标沿曲线轻轻浮动** | 技术验证：`MotionPathPlugin` 沿 SVG path 浮动。
- [x] **Servers 区域是左右分屏对比（中间渐变发光分割线）** | 技术验证：`.servers-grid { grid-template-columns: 1fr 1px 1fr }`；`.servers-divider` 含渐变发光背景。
- [x] **Servers 鼠标移到哪边那边放大、另一边缩小** | 技术验证：`mousemove` 中 `gsap.utils.mapRange(0, width, 1, 0.92, e.offsetX)` 算 scale；`overwrite: 'auto'`。
- [x] **Servers 类型用超大数字 "01" / "02"** | 技术验证：`.server-index` CSS `font-size: clamp(4rem, 12vw, 10rem); font-weight: 900; opacity: 0.08`。
- [x] **Team 区域是 Masonry 错落布局** | 技术验证：`.contributors-flex` 用 `columns: 4`；卡片 `break-inside: avoid`。
- [x] **Team 头像"宝丽来"风格（白边+微旋转）** | 技术验证：`.contributor-avatar-container` 加 `padding: 8px 8px 32px; background: white`；`transform: rotate(gsap.utils.random(-3, 3))`。
- [x] **Team 卡片有不同透明度** | 技术验证：`:nth-child` 设置 `opacity: 0.85 / 0.95 / 1.0`。
- [x] **Team 子分组横向滚动 carousel** | 技术验证：`.contributors-flex` 含 `overflow-x: auto; scroll-snap-type: x mandatory; display: flex`。
- [x] **首页动画衔接流畅，无延迟链** | 技术验证：无 delay 链；全部 timeline 使用 position 参数。
- [x] **首页 `<style>` 无残留旧关键帧** | 技术验证：无 `@keyframes wave-animation / gentleShift / pulse / fadeIn / fadeInUp / slideInFromLeft / slideInFromRight / float / gradientShift`。
- [x] **首页动画元素 hover 不抖动** | 技术验证：被 GSAP 动画的元素 CSS 无 `transition: transform/opacity/filter`，含 `will-change: transform, opacity`。
- [x] **首页开"减少动画"后所有装饰跳过** | 技术验证：`gsap.matchMedia()` 含 `(prefers-reduced-motion: reduce)` 分支，所有装饰动画跳到终态。

### NotFound.vue
- [x] **"404" 三字带旋转错峰登场** | 技术验证：经 `SplitText` 拆字，字符 `rotation: gsap.utils.random(-12, 12)`。
- [x] **主图标持续上下浮动** | 技术验证：`gsap.to` 持续 yoyo 浮动。
- [x] **背景 SVG 线条像被笔描出来** | 技术验证：背景 SVG path 用 `DrawSVGPlugin` 描线。
- [x] **开"减少动画"后 404 仅淡入** | 技术验证：reduceMotion 分支跳过 yoyo 与 DrawSVG。

### SimpleRules.vue / Support.vue / Archive.vue
- [x] **规则页所有内容逐个浮现** | 技术验证：SimpleRules 规则项 `ScrollTrigger.batch` + `STAGGERS.list`。
- [x] **规则页引用块左边竖线像被笔描** | 技术验证：blockquote 左竖线 `DrawSVGPlugin`。
- [x] **规则页无残留 fadeInUp 类** | 技术验证：无 `vercel-animate-fadeInUp`。
- [x] **支持页卡片 hover 3D 倾斜** | 技术验证：Support 卡片 3D tilt（`rotateY / rotateX / transformPerspective: 800`）。
- [x] **支持页 FAQ 折叠平滑** | 技术验证：FAQ 折叠用 `Flip.from`。
- [x] **归档页有入场动画** | 技术验证：Archive 无 `console.log`；存档列表 `ScrollTrigger.batch` 入场。

### Navbar.vue / ColorSchemeSwitcher.vue / TocToggles.vue
- [x] **汉堡按钮点一下优雅变形成 X** | 技术验证：Navbar Burger 图标 `gsap.timeline` 变形成 X。
- [x] **侧边栏滑入带弹性** | 技术验证：侧边栏用 `EASINGS.heroReveal`。
- [x] **开"减少动画"后导航直接切换** | 技术验证：含 reduceMotion 分支。
- [x] **配色卡 hover 不再抖动** | 技术验证：ColorSchemeSwitcher CSS 无 `transition: all 0.3s ease` 与 `:hover { transform }`；hover 由 GSAP 接管。
- [x] **主题图标切换旋转交叉淡入** | 技术验证：TocToggles CSS 无 `transition: opacity 200ms ease, transform 200ms ease`；图标切换用 `gsap.timeline`。
- [x] **主题切换圆形扩散更优雅** | 技术验证：主题扩散改用 `gsap.to` + `clipPath`，替换 WAAPI。

## Phase 4：全局验证

- [x] **`npm run build` 通过** | 技术验证：无 TS / Vue 编译错误。
- [x] **`npm run dev` 启动后逐页目视 OK** | 技术验证：Home / News / NewsDetail / Support / SimpleRules / NotFound / Archive 动画均生效。
- [x] **滚动 60fps 不卡** | 技术验证：DevTools Performance 录制 5s 滚动：无 Long Task > 50ms，FPS ≥ 55。
- [x] **开"减少动画"后所有装饰动画跳过** | 技术验证：浏览器开启 `prefers-reduced-motion: reduce` 后逐页确认。
- [x] **全项目无残留硬编码时长/缓动** | 技术验证：`Grep` 全项目无残留硬编码 `0.3s / 0.6s / power2.out`（特殊场景需注释说明）。
- [x] **全项目无残留死关键帧** | 技术验证：`Grep` 全项目无残留 `@keyframes wave-animation / gentleShift / pulse / fadeIn / fadeInUp / vercel-animate-fadeInUp`。
- [x] **全项目无全局选择器用于 GSAP** | 技术验证：`Grep` 全项目无 `document.querySelectorAll` 直接用于 GSAP 动画目标（必须通过 `useGsap({ scope })` 隔离）。
- [x] **所有使用 GSAP 的 .vue 文件均通过统一入口** | 技术验证：均通过 `useGsap({ scope })`；无裸 `gsap.to` 在 `onMounted` 外。
- [x] **Footer 控制台无 MorphSVGPlugin 未注册警告** | 技术验证：`Footer.vue` 控制台无 "MorphSVGPlugin not registered" 警告。
- [x] **NewsDetail 阅读进度条在滚动时平滑增长** | 技术验证：滚动时 `scaleX` 平滑变化。
- [x] **卸载任意组件后无残留 ScrollTrigger** | 技术验证：`ScrollTrigger.getAll()` 不含已卸载组件的 trigger（可通过 console 抽查）。

## GSAP Skills 合规复核（技术层）

- [x] **gsap-core**：所有入场动画使用 `autoAlpha` 而非 `opacity`；`from()` 起始态明确。
- [x] **gsap-timeline**：无 delay 链；timeline 用 position 参数串联。
- [x] **gsap-frameworks**（Vue）：全部组件使用 `gsap.context()` + `ctx.revert()`；`gsap.matchMedia()` 用于响应式与 reduceMotion。
- [x] **gsap-performance**：transform 别名（x/y/xPercent/scale/rotation）替代 layout 属性；`will-change` 声明并在 `onComplete` 清除；批量 ScrollTrigger。
- [x] **gsap-plugins**：MorphSVG / DrawSVG / MotionPath / Flip / SplitText / CustomEase 均经 `gsap.registerPlugin` 注册并实际使用。
- [x] **gsap-react**（Vue 等价）：scope 隔离；不在 SSR 期间运行 gsap；`onUnmounted` 清理。
- [x] **gsap-scrolltrigger**：`batch` + `batchMax`；`scrub` 视差；`pin` 谨慎；`refresh()` 在 layout 变更后调用。
- [x] **gsap-utils**：`toArray / distribute / clamp / mapRange / random / selector / pipe` 按场景使用；函数式 util 在滚动/鼠标回调中复用。
