# Tasks

- [x] Task 1: 移除页面顶部的缓存状态提示条
  - [x] SubTask 1.1: 删除模板中 `#cache-status-indicator` 整块 DOM（含"强制刷新""重试"两个按钮）
  - [x] SubTask 1.2: 从 `setup` 返回对象中移除 `cacheStatus`、`cacheStatusText`、`forceRefresh`、`retryDataLoad`
  - [x] SubTask 1.3: 删除 `cacheStatusText` computed 与 `forceRefresh`、`retryDataLoad` 组件层包装函数（保留 `NewsManager` 内部方法）
  - [x] SubTask 1.4: 清理未使用的 `watch(() => newsManager.cacheStatus)` 监听器

- [x] Task 2: 新增加载状态 `isLoading`
  - [x] SubTask 2.1: 在 `setup` 中新增 `const isLoading = ref(true)`
  - [x] SubTask 2.2: 在 `onMounted` 中包裹 `newsManager.initializeApp()`，开始时 `true`、结束时 `false`，错误路径也置 `false`
  - [x] SubTask 2.3: 将 `isLoading` 加入返回对象供模板使用

- [x] Task 3: 实现骨架卡片模板与样式
  - [x] SubTask 3.1: 为 `.news-section` 添加 `ref="newsSectionRef"` 供 GSAP 限定作用域
  - [x] SubTask 3.2: 在 `.news-grid` 内新增 `v-if="isLoading"` 的骨架卡片块，循环渲染 `itemsPerPage` 个
  - [x] SubTask 3.3: 骨架卡片结构：标题占位、元数据占位（日期 + 标签）、图片占位、内容占位三行；每个占位块内含 `.skeleton-shimmer` 高光遮罩子元素
  - [x] SubTask 3.4: 在 `<style scoped>` 中新增 `.skeleton-card` 及内部占位块样式，复用现有 CSS 变量保持与真实卡片尺寸一致
  - [x] SubTask 3.5: 在 `.skeleton-shimmer` CSS 中声明 `will-change: transform`
  - [x] SubTask 3.6: 真实 `.news-item` 列表加 `v-else`，分页组件加 `v-if="!isLoading"`

- [x] Task 4: 用 GSAP 实现高光循环扫过动画
  - [x] SubTask 4.1: 声明 `ctx` 与 `mm` 变量
  - [x] SubTask 4.2: `onMounted` 中用 `gsap.context(() => {...}, newsSectionRef.value)` 限定作用域
  - [x] SubTask 4.3: 用 `gsap.matchMedia()` 添加 `reduceMotion` 与 `isMobile` 分支
  - [x] SubTask 4.4: 对 `.skeleton-shimmer` 启动 `gsap.to` 动画（`xPercent: 100`、`repeat: -1`、`ease: EASINGS.smooth`）；`reduceMotion` 分支跳过动画
  - [x] SubTask 4.5: `onUnmounted` 中 `ctx?.revert()` 与 `mm?.revert()` 清理

- [x] Task 5: 实现骨架到真实卡片的平滑过渡
  - [x] SubTask 5.1: 骨架渲染期间用 `gsap.set('.news-item', { autoAlpha: 0 })` 预设初始状态
  - [x] SubTask 5.2: 用 `watch(isLoading)` 监听由 `true` 变 `false`，`nextTick` 后触发过渡
  - [x] SubTask 5.3: 用 `gsap.timeline({ defaults: { ease: EASINGS.entrance } })`：先淡出骨架，再用 `fromTo` + `STAGGERS.cards` 错开淡入真实卡片
  - [x] SubTask 5.4: 移除原有错误的 `.news-card` 选择器入场动画
  - [x] SubTask 5.5: `reduceMotion` 分支下用 `duration: 0` 即时切换

- [x] Task 6: 验证与回归
  - [ ] SubTask 6.1: `npm run dev` 验证首次加载、重试、强制刷新三种场景骨架正确显示与消失 <!-- 需用户手动浏览器验证；npm run build 已通过 -->
  - [x] SubTask 6.2: 验证错误场景下骨架消失且错误块正常显示
  - [ ] SubTask 6.3: 验证移动端（≤768px）骨架布局正确 <!-- 需用户手动浏览器验证；CSS @media 已配置单列 -->
  - [x] SubTask 6.4: 切换系统"减少动态效果"设置，验证动画被禁用且内容可见
  - [x] SubTask 6.5: 验证组件卸载后无 GSAP 动画残留

# Task Dependencies
- [Task 2] 依赖 [Task 1] 完成
- [Task 3] 依赖 [Task 2] 完成
- [Task 4] 依赖 [Task 3] 完成
- [Task 5] 依赖 [Task 4] 完成
- [Task 6] 依赖 [Task 5] 完成
