/**
 * vitest 全局 setup（jsdom 环境补丁）。
 *
 * jsdom 未实现 `window.matchMedia`，而 `src/gsap/match-media.ts` 在模块加载时就
 * 创建 `gsap.matchMedia()` 实例 —— 任何导入 `@/gsap` 的组件测试都会在导入期抛
 * `_win.matchMedia is not a function`。这里补一个最小实现：查询恒不匹配
 * （组件测试不依赖断点分支，媒体查询只影响动效参数）。
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string): MediaQueryList => {
    const mql = {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }
    return mql as unknown as MediaQueryList
  }) as typeof window.matchMedia
}
