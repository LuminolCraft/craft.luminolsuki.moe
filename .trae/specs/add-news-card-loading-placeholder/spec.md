# 新闻卡片加载占位动画 Spec

## Why
新闻页 `src/views/News.vue` 在加载新闻数据时，新闻网格区域是空白的，用户看不出"正在加载"。我们希望在数据加载期间显示灰色的骨架占位卡片（带高光扫过动画），数据到了再平滑过渡到真实卡片。同时移除页面顶部那条"数据已更新 X 分钟前"的提示条（`cache-status-indicator`），因为骨架动画本身就能传达加载状态。

动画使用项目已有的 GSAP 库实现，**严格遵循 8 个 GSAP 官方技能**（gsap-core / gsap-timeline / gsap-frameworks / gsap-performance / gsap-plugins / gsap-react / gsap-scrolltrigger / gsap-utils）的最佳实践，具体合规要求见文末"GSAP Skills 合规矩阵"。

## What Changes
- 加载中：在新闻网格位置显示一组灰色骨架卡片（数量与一页新闻数相同），形状与真实卡片一致（标题、日期、标签、图片、正文四个占位块），并有高光从左到右循环扫过的动画效果。
- 加载完成：骨架卡片淡出，真实新闻卡片依次淡入。
- 加载失败：骨架消失，显示原有的错误提示块。
- 移除页面顶部的 `cache-status-indicator` 提示条（含"强制刷新""重试"按钮）。
- **BREAKING**：模板中移除 `cache-status-indicator` 相关 DOM 与暴露的 `cacheStatus`、`cacheStatusText`、`forceRefresh`、`retryDataLoad` 返回值，依赖这些响应式变量的外部消费者需同步调整。

## Impact
- Affected specs: 无。
- Affected code:
  - `src/views/News.vue`（模板、脚本、样式）
  - 复用项目内 `@/gsap` 模块导出的 `EASINGS`、`STAGGERS`、`DURATIONS` 常量
  - 复用现有 CSS 变量保持视觉一致
- 不需要额外注册 GSAP 插件（`ScrollTrigger` 已在原文件中导入注册；本特性不使用 ScrollTrigger，但保留 import 不破坏其他用法）

## ADDED Requirements

### Requirement: 加载期间显示骨架卡片
系统 SHALL 在新闻数据加载中（首次进入、重试、强制刷新）时，于新闻网格位置显示与一页新闻数量相同的骨架占位卡片，替代真实卡片。

#### Scenario: 首次进入页面
- **WHEN** 用户进入新闻页且数据尚未加载完成
- **THEN** 新闻网格位置显示骨架卡片（灰色占位）
- **AND** 真实新闻卡片不显示
- **AND** 分页组件不显示

#### Scenario: 加载失败
- **WHEN** 加载失败
- **THEN** 骨架卡片消失
- **AND** 显示原有的错误提示块

### Requirement: 骨架卡片高光扫过动画
系统 SHALL 为骨架卡片显示一个从左到右循环的高光扫过效果，让用户直观感知"正在加载"。

#### Scenario: 骨架卡片显示时
- **WHEN** 骨架卡片渲染到页面
- **THEN** 每张骨架卡片上有高光从左到右循环扫过
- **AND** 动画平滑、不卡顿

#### Scenario: 用户启用了"减少动态效果"系统设置
- **WHEN** 用户的系统设置了 `prefers-reduced-motion: reduce`
- **THEN** 高光扫过动画被禁用
- **AND** 骨架卡片仍以静态形式显示（内容可见）

### Requirement: 骨架到真实卡片平滑过渡
系统 SHALL 在数据加载完成后，先将骨架卡片淡出，再让真实新闻卡片依次淡入，过渡自然不突兀。

#### Scenario: 数据加载完成
- **WHEN** 数据加载完成且无错误
- **THEN** 骨架卡片平滑淡出
- **AND** 真实新闻卡片以错开的时间依次淡入
- **AND** 过渡过程中无闪烁、无空白

### Requirement: 加载状态覆盖三种场景
系统 SHALL 在以下三种场景下都显示骨架卡片：首次进入页面、触发重试、触发强制刷新。

#### Scenario: 首次加载
- **WHEN** 组件挂载并开始拉取数据
- **THEN** `isLoading` 为 `true`，显示骨架

#### Scenario: 加载成功
- **WHEN** 数据拉取成功
- **THEN** `isLoading` 切换为 `false`，触发过渡

#### Scenario: 加载失败
- **WHEN** 数据拉取抛出异常
- **THEN** `isLoading` 切换为 `false`
- **AND** `loadError` 切换为 `true`，显示错误块

## REMOVED Requirements

### Requirement: 缓存状态指示器 UI
**Reason**: 用户明确指出该提示可以移除，骨架动画已能传达加载状态。
**Migration**: `NewsManager` 内部的缓存检测、后台刷新、`forceRefresh`、`retryDataLoad` 方法保留供组件内部调用；仅移除模板中 `#cache-status-indicator` DOM 块及组件 `setup` 返回值中的 `cacheStatus`、`cacheStatusText`、`forceRefresh`、`retryDataLoad`。`loadError` 仍保留并通过 `.error-message` 展示。

---

## GSAP Skills 合规矩阵（实现者必须严格遵守）

本节为技术实现约束，普通读者可跳过。每条规则明确标注来源技能与具体条款，实现者需逐条对照。

### 来自 gsap-frameworks（Vue 生命周期）
| 规则 | 来源条款 |
|------|----------|
| 在 `onMounted` 内创建 GSAP 动画（DOM 已就绪） | "Create tweens and ScrollTriggers after the component's DOM is available (e.g. onMounted)" |
| 使用 `gsap.context(callback, containerRef)` 限定选择器作用域 | "gsap.context(scope) — pass the container ref as the second argument" |
| 在 `onUnmounted` 中调用 `ctx.revert()` 清理 | "always call ctx.revert() so tweens and ScrollTriggers are killed and inline styles reverted" |
| 不在 `setup` 同步顶层创建动画 | "Do not create GSAP animations in the component's setup or in a synchronous top-level script" |

**Vue 3 模式参考**（gsap-frameworks 给出）：
```javascript
const container = ref(null);
let ctx;
onMounted(() => {
  ctx = gsap.context(() => {
    gsap.to(".box", { x: 100, duration: 0.6 });
  }, container.value);
});
onUnmounted(() => { ctx?.revert(); });
```

### 来自 gsap-core（核心 API 与可访问性）
| 规则 | 来源条款 |
|------|----------|
| 使用 `autoAlpha` 而非 `opacity` 做淡入淡出 | "autoAlpha — Prefer over opacity for fade in/out" |
| 使用 transform 别名（`x`/`y`/`xPercent`/`scale`/`rotation`） | "Prefer GSAP's transform aliases over the raw transform string" |
| 属性名用 camelCase（如 `backgroundColor`） | "Always use property names in camelCase" |
| 使用内置 ease 字符串或项目 `EASINGS` 常量 | "Use documented built-in eases" |
| 使用 `gsap.matchMedia()` 处理响应式 + `prefers-reduced-motion` | "Use gsap.matchMedia() for responsive breakpoints and prefers-reduced-motion" |
| `prefers-reduced-motion: reduce` 时用 `duration: 0` 或跳过动画 | "Use duration: 0 or skip the animation when reduceMotion is true" |
| 不嵌套 `gsap.context()` 在 matchMedia 内 | "Do not nest gsap.context() inside matchMedia — matchMedia creates a context internally" |
| 多个 `fromTo` 堆叠同属性时设 `immediateRender: false` | "set immediateRender: false on the later one(s)" |

**matchMedia 模式参考**（gsap-core 给出）：
```javascript
mm.add({
  isDesktop: "(min-width: 800px)",
  isMobile: "(max-width: 799px)",
  reduceMotion: "(prefers-reduced-motion: reduce)"
}, (context) => {
  const { isDesktop, reduceMotion } = context.conditions;
  gsap.to(".box", {
    rotation: isDesktop ? 360 : 180,
    duration: reduceMotion ? 0 : 2
  });
});
```

### 来自 gsap-timeline（时间线）
| 规则 | 来源条款 |
|------|----------|
| 用 `gsap.timeline` 而非 `delay` 链做序列动画 | "Prefer timelines for sequencing" / "Chain animations with delay when a timeline can sequence them" |
| 用位置参数（第三参数）放置 tween | "Use the position parameter (third argument) to place tweens at specific times" |
| 在 timeline 构造器传 `defaults` | "Pass defaults into the timeline constructor so child tweens inherit" |
| 不在 timeline 子 tween 上挂 ScrollTrigger | "Nest animations that contain a ScrollTrigger; ScrollTriggers should only be on top-level" |

**timeline 模式参考**（gsap-timeline 给出）：
```javascript
const tl = gsap.timeline({ defaults: { duration: 0.5, ease: "power2.out" } });
tl.to(".a", { x: 100 }).to(".b", { y: 50 }, "+=0.5");
```

### 来自 gsap-performance（性能）
| 规则 | 来源条款 |
|------|----------|
| 仅动画 transform 与 opacity，不动画 `width`/`height`/`top`/`left` | "Prefer: x, y, scale, rotation, opacity" / "Avoid when possible: width, height, top, left, margin, padding" |
| 在动画元素 CSS 中声明 `will-change: transform` | "Use will-change in CSS on elements that will animate" |
| 用 `stagger` 而非多个手动 delay tween | "Use stagger instead of many separate tweens with manual delays" |
| 不在所有元素上设 `will-change` "just in case" | "Set will-change or force3D on every element 'just in case'" |
| 清理离屏/卸载动画 | "Clean up or kill off-screen animations" |

### 来自 gsap-utils（工具函数）
| 规则 | 来源条款 |
|------|----------|
| 使用 `gsap.utils.selector(scope)` 或 `gsap.context` 限定选择器 | "Use gsap.utils.selector(scope) in components so selectors are scoped to a container or ref" |
| 用 `gsap.utils.toArray()` 将 NodeList 转数组 | "use toArray when GSAP or your code needs a true array from a selector or NodeList" |

### 来自 gsap-plugins（插件）
| 规则 | 来源条款 |
|------|----------|
| 使用插件前必须 `gsap.registerPlugin()` | "Register every plugin used with gsap.registerPlugin() before first use" |
| 本特性不引入新插件（`ScrollTrigger` 已注册） | — |
| 如需自定义曲线用 `CustomEase`（本特性不使用） | "CustomEase for custom curves" |

### 来自 gsap-scrolltrigger（本特性不使用，但保留合规）
| 规则 | 来源条款 |
|------|----------|
| 本特性不使用 ScrollTrigger（加载动画与滚动无关） | — |
| 若未来引入，需在 timeline 顶层挂 ScrollTrigger，不在子 tween 上 | "Put ScrollTrigger on the timeline, not on tweens inside a timeline" |
| 布局变化后需 `ScrollTrigger.refresh()` | "Call ScrollTrigger.refresh() after DOM/layout changes" |

### 来自 gsap-react（本项目为 Vue，仅参考）
本特性为 Vue 3 项目，不使用 `useGSAP` hook，遵循 gsap-frameworks 的 Vue 模式即可。

---

## 实现者参考代码骨架

```javascript
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import { gsap } from 'gsap';
import { EASINGS, STAGGERS, DURATIONS } from '@/gsap';

// setup() 内
const newsSectionRef = ref<HTMLElement | null>(null);
let ctx: gsap.Context | undefined;
let mm: gsap.MatchMedia | undefined;

onMounted(() => {
  if (!newsSectionRef.value) return;  // gsap-frameworks: 等待 DOM 就绪

  ctx = gsap.context(() => {  // gsap-frameworks: 限定作用域
    mm = gsap.matchMedia();   // gsap-core: matchMedia
    mm.add({
      isDesktop: '(min-width: 769px)',
      isMobile: '(max-width: 768px)',
      reduceMotion: '(prefers-reduced-motion: reduce)',
    }, (context) => {
      const { reduceMotion } = context.conditions;
      // gsap-performance: 仅动画 transform
      // gsap-core: reduceMotion 时 duration: 0
      gsap.to('.skeleton-shimmer', {
        xPercent: 100,
        repeat: -1,
        ease: EASINGS.smooth,
        duration: reduceMotion ? 0 : 1.5,
      });
    });
  }, newsSectionRef.value);  // gsap-frameworks: 第二参数为 scope
});

// gsap-timeline: 用 timeline + 位置参数，不用 delay 链
watch(isLoading, async (newVal, oldVal) => {
  if (oldVal && !newVal && !loadError.value) {
    await nextTick();
    gsap.set('.news-item', { autoAlpha: 0 });  // gsap-core: autoAlpha
    const tl = gsap.timeline({ defaults: { ease: EASINGS.entrance } });
    tl.to('.skeleton-card', { autoAlpha: 0, duration: DURATIONS.fast })
      .fromTo('.news-item',
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, stagger: STAGGERS.cards, duration: 0.7 },
        '+=0.05'  // gsap-timeline: 位置参数
      );
  }
});

onUnmounted(() => {
  ctx?.revert();  // gsap-frameworks: 清理
  mm?.revert();   // gsap-core: matchMedia 清理
});
```
