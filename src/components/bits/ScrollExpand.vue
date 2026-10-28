<!--
  ScrollExpand —— 滚动展开全屏媒体

  移植自 Vue Bits「ScrollExpand」(https://vue-bits.dev/components/scroll-expand)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点（相对上游源码）：
  - 去 Tailwind：root/track/stage/frame 的原子类全部翻成 scoped CSS（前缀 se-）
  - root 去掉 h-full：本项目用在页面流（window scroll 模式），高度由 track 撑起，
    h-full 在无固定高的父级里反而让 root 塌陷
  - <img> 补 loading="lazy" 与 decoding="async"（上游无）；video 分支保留但本项目未用
  - will-change 只留在 frame/media/title/hint/overlay（与上游一致），
    动画走 clip-path/transform 合成器路径，滚动停止后 rAF 自动收敛退出
  - prefers-reduced-motion：帧直接锁定滚动位置（上游已有该分支，保留并注释）
-->
<template>
  <div ref="rootRef" class="scroll-expand" :style="style">
    <div ref="trackRef" class="scroll-expand__track">
      <div ref="stageRef" class="scroll-expand__stage">
        <div ref="frameRef" class="scroll-expand__frame">
          <img
            ref="mediaRef"
            class="scroll-expand__media"
            :src="src"
            :alt="alt"
            loading="lazy"
            decoding="async"
            draggable="false"
          />
          <div ref="scrimRef" class="scroll-expand__scrim" />
          <div v-if="$slots.default" ref="overlayRef" class="scroll-expand__overlay">
            <slot />
          </div>
        </div>
        <div v-if="title" ref="titleRef" class="scroll-expand__title">{{ title }}</div>
        <div v-if="scrollHint" ref="hintRef" class="scroll-expand__hint">{{ scrollHint }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type CSSProperties } from 'vue';

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

interface ScrollExpandProps {
  src?: string;
  alt?: string;
  title?: string;
  scrollHint?: string;
  startWidth?: number;
  startHeight?: number;
  startRadius?: number;
  endRadius?: number;
  mediaZoom?: number;
  scrollDistance?: number;
  holdDistance?: number;
  smoothing?: number;
  overlayScrim?: number;
  useWindowScroll?: boolean;
  enabled?: boolean;
  style?: CSSProperties;
}

const props = withDefaults(defineProps<ScrollExpandProps>(), {
  src: '',
  alt: '',
  title: '',
  scrollHint: '',
  startWidth: 42,
  startHeight: 58,
  startRadius: 24,
  endRadius: 0,
  mediaZoom: 1.35,
  scrollDistance: 1.2,
  holdDistance: 0.35,
  smoothing: 0.1,
  overlayScrim: 0.45,
  useWindowScroll: true,
  enabled: true,
  style: () => ({}),
});

const rootRef = ref<HTMLDivElement | null>(null);
const trackRef = ref<HTMLDivElement | null>(null);
const stageRef = ref<HTMLDivElement | null>(null);
const frameRef = ref<HTMLDivElement | null>(null);
const mediaRef = ref<HTMLImageElement | null>(null);
const titleRef = ref<HTMLDivElement | null>(null);
const overlayRef = ref<HTMLDivElement | null>(null);
const scrimRef = ref<HTMLDivElement | null>(null);
const hintRef = ref<HTMLDivElement | null>(null);

let teardown: (() => void) | null = null;

const applyProgress = (p: number) => {
  const frame = frameRef.value;
  const media = mediaRef.value;
  if (!frame || !media) return;

  const e = smoothstep(0, 1, p);

  const w = props.startWidth + (100 - props.startWidth) * e;
  const h = props.startHeight + (100 - props.startHeight) * e;
  const ix = Math.max(0, (100 - w) / 2);
  const iy = Math.max(0, (100 - h) / 2);
  const r = props.startRadius + (props.endRadius - props.startRadius) * e;
  frame.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;

  media.style.transform = `scale(${props.mediaZoom + (1 - props.mediaZoom) * e})`;

  if (scrimRef.value) scrimRef.value.style.opacity = `${props.overlayScrim * e}`;

  if (titleRef.value) {
    const out = smoothstep(0.4, 0.88, p);
    titleRef.value.style.opacity = `${1 - out}`;
    titleRef.value.style.transform = `translate3d(0, ${-28 * out}px, 0) scale(${1 + 0.06 * out})`;
  }

  if (hintRef.value) {
    const gone = smoothstep(0, 0.12, p);
    hintRef.value.style.opacity = `${1 - gone}`;
    hintRef.value.style.transform = `translate3d(0, ${8 * gone}px, 0)`;
  }

  if (overlayRef.value) {
    const inn = smoothstep(0.68, 1, p);
    overlayRef.value.style.opacity = `${inn}`;
    overlayRef.value.style.transform = `translate3d(0, ${18 * (1 - inn)}px, 0)`;
  }
};

const setup = () => {
  const root = rootRef.value;
  const track = trackRef.value;
  const stage = stageRef.value;
  if (!root || !track || !stage) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let raf = 0;
  let current = 0;
  let target = 0;
  let stageH = 0;
  let running = false;

  const measure = () => {
    stageH = props.useWindowScroll ? window.innerHeight : root.clientHeight;
    if (stageH <= 0) return;
    stage.style.height = `${stageH}px`;
    track.style.height = `${stageH * (1 + Math.max(0, props.scrollDistance) + Math.max(0, props.holdDistance))}px`;

    const w = root.clientWidth || stageH;
    stage.style.setProperty('--se-title-size', `${clamp(w * 0.075, 20, 84)}px`);
  };

  const readProgress = () => {
    if (!props.enabled) return 1;
    const span = stageH * Math.max(0.01, props.scrollDistance);
    if (props.useWindowScroll) {
      const top = track.getBoundingClientRect().top;
      return clamp(-top / span, 0, 1);
    }
    return clamp(root.scrollTop / span, 0, 1);
  };

  const tick = () => {
    const k = props.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * props.smoothing));
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.0004) {
      current = target;
      running = false;
    }
    applyProgress(current);
    raf = running ? requestAnimationFrame(tick) : 0;
  };

  const kick = () => {
    if (running) return;
    running = true;
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const onScroll = () => {
    target = readProgress();
    if (props.smoothing <= 0 || reduceMotion) {
      current = target;
      applyProgress(current);
      return;
    }
    kick();
  };

  const onResize = () => {
    measure();
    target = readProgress();
    current = target;
    applyProgress(current);
  };

  measure();
  target = readProgress();
  current = target;
  applyProgress(current);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  const ro = new ResizeObserver(onResize);
  ro.observe(root);

  teardown = () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    ro.disconnect();
  };
};

onMounted(() => {
  setup();
});

onUnmounted(() => {
  teardown?.();
  teardown = null;
});

watch(
  () => props.useWindowScroll,
  () => {
    teardown?.();
    teardown = null;
    setup();
  }
);

const style = computed(() => props.style);
</script>

<style scoped>
.scroll-expand {
  position: relative;
  width: 100%;
}

.scroll-expand__track {
  position: relative;
  width: 100%;
}

.scroll-expand__stage {
  position: sticky;
  top: 0;
  width: 100%;
  overflow: hidden;
  --se-title-size: 4rem;
}

.scroll-expand__frame {
  position: absolute;
  inset: 0;
  will-change: clip-path;
  clip-path: inset(21% 29% 21% 29% round 24px);
}

.scroll-expand__media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center;
  user-select: none;
  will-change: transform;
}

.scroll-expand__scrim {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.1) 45%, rgba(0, 0, 0, 0.35));
}

.scroll-expand__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  opacity: 0;
  padding: 6%;
  text-align: center;
  will-change: opacity, transform;
}

.scroll-expand__title {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: 0 6%;
  font-weight: 700;
  color: #fff;
  text-align: center;
  line-height: 1;
  letter-spacing: -0.03em;
  pointer-events: none;
  will-change: opacity, transform;
  font-size: var(--se-title-size);
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.45);
}

.scroll-expand__hint {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.55);
  text-align: center;
  letter-spacing: 0.02em;
  pointer-events: none;
  will-change: opacity, transform;
}
</style>
