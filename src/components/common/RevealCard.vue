<!--
  RevealCard —— 进入视口时弹入的轻量包装（AnimatedList 的核心入场效果）

  参考 Vue Bits「AnimatedList」(https://vue-bits.dev/components/animated-list)
  原作者 David Haz · MIT + Commons Clause 许可
  只取其卡片入场的一段：scale 0.7 → 1、opacity 0 → 1 的弹入，不做它的
  滚动容器 / 列表结构——新闻列表是页面级布局，包装组件只负责单张卡片。

  要点：
  - once：进过视口就保持终态，不随滚动缩回（列表卡片来回缩放很烦）
  - 动画完成后同步加 data-revealed 并清掉 motion 写入的内联 transform/opacity，
    释放对 transform 的控制——卡片的 CSS hover transform（translateY 等）在
    包装层之内，互不干扰；同时包装层不残留 transform，避免形成多余的包含块
  - prefers-reduced-motion：直接终态，不动画
-->
<script setup lang="ts">
import { ref, watch } from 'vue';
import { animate, useInView } from 'motion-v';

const props = withDefaults(
  defineProps<{
    /** 动画延迟（秒），用于列表 stagger */
    delay?: number;
  }>(),
  { delay: 0 },
);

const rootRef = ref<HTMLElement | null>(null);
const inView = useInView(rootRef, { amount: 0.3 });
let revealed = false;

function finish(el: HTMLElement) {
  el.setAttribute('data-revealed', '');
  el.style.transform = '';
  el.style.opacity = '';
}

function reveal(el: HTMLElement) {
  if (revealed) return;
  revealed = true;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    finish(el);
    return;
  }
  animate(
    el,
    { scale: [0.7, 1], opacity: [0, 1] },
    {
      duration: 0.5,
      delay: props.delay,
      ease: [0.34, 1.56, 0.64, 1],
    },
  ).then(() => {
    // 先挂终态 class，再清内联样式，同一帧内完成不会闪
    finish(el);
  });
}

watch(
  inView,
  (v) => {
    if (!v || !rootRef.value) return;
    reveal(rootRef.value);
  },
  { immediate: true },
);
</script>

<template>
  <div ref="rootRef" class="reveal-card">
    <slot />
  </div>
</template>

<style scoped>
.reveal-card {
  height: 100%;
  opacity: 0;
  transform: scale(0.7);
}

.reveal-card[data-revealed] {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .reveal-card {
    opacity: 1;
    transform: none;
  }
}
</style>
