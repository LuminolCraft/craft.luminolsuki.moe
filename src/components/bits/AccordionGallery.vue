<!--
  AccordionGallery —— 手风琴图片画廊

  移植自 Vue Bits「AccordionGallery」
  (https://github.com/DavidHDev/vue-bits/tree/main/src/content/Components/AccordionGallery)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点（相对上游源码）：
  - 去 Tailwind：root 与 panel/label 的原子类全部翻成 scoped CSS 真实规则，
    类名 ag-*（CSS 变量沿用上游的 --ag-*）
  - 新增 ariaLabel prop（上游硬编码英文 "Image accordion gallery"）
  - 逻辑（gsap timeline / ResizeObserver / 键盘导航 / reduce-motion）保持上游原样
-->
<script setup lang="ts">
import { gsap } from 'gsap';
import { computed, onMounted, onUnmounted, ref, watch, type CSSProperties, type ComponentPublicInstance } from 'vue';

export interface AccordionGalleryItem {
  image: string;
  label?: string;
  /** 展开面板 caption 里 label 下方的小字说明（随面板显隐动画一起走） */
  description?: string;
  link?: string;
  alt?: string;
}

export type AccordionGalleryOrientation = 'horizontal' | 'vertical';
export type AccordionGalleryTrigger = 'hover' | 'click';

interface AccordionGalleryProps {
  items?: AccordionGalleryItem[];
  defaultIndex?: number;
  ariaLabel?: string;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  orientation?: AccordionGalleryOrientation;
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  stagger?: number;
  trigger?: AccordionGalleryTrigger;
  showLabels?: boolean;
  grayscale?: boolean;
}

const props = withDefaults(defineProps<AccordionGalleryProps>(), {
  items: () => [],
  defaultIndex: 0,
  ariaLabel: '图片手风琴画廊',
  accentColor: '#ffffff',
  overlayColor: '#060010',
  textColor: '#ffffff',
  height: 460,
  gap: 10,
  radius: 16,
  expandRatio: 0.52,
  orientation: 'horizontal',
  duration: 0.6,
  ease: 'power3.out',
  parallax: 0.5,
  tilt: 8,
  stagger: 0.06,
  trigger: 'hover',
  showLabels: true,
  grayscale: true
});

const rootRef = ref<HTMLDivElement | null>(null);
const panelRefs = ref<(HTMLElement | null)[]>([]);
const mediaRefs = ref<(HTMLElement | null)[]>([]);
const barRefs = ref<(HTMLElement | null)[]>([]);
const textRefs = ref<(HTMLElement | null)[]>([]);

const setPanelRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  panelRefs.value[index] = el as HTMLElement | null;
};
const setMediaRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  mediaRefs.value[index] = el as HTMLElement | null;
};
const setBarRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  barRefs.value[index] = el as HTMLElement | null;
};
const setTextRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  textRefs.value[index] = el as HTMLElement | null;
};

const vertical = computed(() => props.orientation === 'vertical');
const active = ref(Math.min(Math.max(props.defaultIndex, 0), props.items.length - 1));

const prefersReduced =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const overlayBg = computed(
  () =>
    `linear-gradient(180deg, transparent 45%, color-mix(in srgb, ${props.overlayColor} 78%, transparent) 100%), color-mix(in srgb, ${props.overlayColor} calc(var(--ag-dim, 0.35) * 100%), transparent)`
);

const rootStyle = computed<CSSProperties>(() => ({
  gap: `${props.gap}px`,
  height: vertical.value ? `${Math.round(props.height * 1.6)}px` : `${props.height}px`
}));

let tl: gsap.core.Timeline | null = null;
let mediaSize = 320;
let firstRun = true;
let ro: ResizeObserver | null = null;

const applyLayout = (animate: boolean) => {
  const panels = panelRefs.value;
  if (!panels.length) return;

  const n = props.items.length;
  const r = Math.min(Math.max(props.expandRatio, 0.2), 0.9);
  const grow = n > 1 ? (r * (n - 1)) / (1 - r) : 1;

  tl?.kill();
  const dur = animate && !prefersReduced ? props.duration : 0;
  const timeline = gsap.timeline();

  panels.forEach((panel, i) => {
    if (!panel) return;
    const isActive = i === active.value;
    const media = mediaRefs.value[i];
    const bar = barRefs.value[i];
    const text = textRefs.value[i];

    const rot = isActive ? 0 : i < active.value ? props.tilt : -props.tilt;
    const rotProp = vertical.value ? { rotateX: -rot } : { rotateY: rot };

    timeline.to(panel, { flexGrow: isActive ? grow : 1, ...rotProp, duration: dur, ease: props.ease }, 0);

    if (media) {
      const drift = Math.max(-1.5, Math.min(1.5, active.value - i));
      const shift = drift * props.parallax * mediaSize * 0.06;
      const gray = props.grayscale ? (isActive ? 0 : 1) : 0;
      timeline.to(
        media,
        {
          xPercent: -50,
          yPercent: -50,
          x: vertical.value ? 0 : isActive ? 0 : shift,
          y: vertical.value ? (isActive ? 0 : shift) : 0,
          '--ag-gray': gray,
          '--ag-dim': isActive ? 0 : 0.35,
          duration: dur,
          ease: props.ease
        },
        0
      );
    }

    if (props.showLabels && bar && text) {
      if (isActive) {
        timeline.to(
          [bar, text],
          { opacity: 1, x: 0, duration: dur, ease: props.ease, stagger: prefersReduced ? 0 : props.stagger },
          0
        );
      } else {
        timeline.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease: props.ease }, 0);
      }
    }
  });

  tl = timeline;
};

const measure = () => {
  const el = rootRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const total = vertical.value ? rect.height : rect.width;
  const usable = Math.max(total - props.gap * (props.items.length - 1), 120);
  const size = Math.max(140, usable * Math.min(Math.max(props.expandRatio, 0.2), 0.9) * 1.22);
  mediaSize = size;
  el.style.setProperty('--ag-media-size', `${size}px`);
  applyLayout(!firstRun);
};

onMounted(() => {
  measure();
  firstRun = false;

  const el = rootRef.value;
  if (el) {
    ro = new ResizeObserver(measure);
    ro.observe(el);
  }
});

onUnmounted(() => {
  ro?.disconnect();
  tl?.kill();
});

watch(
  () => [props.gap, props.items.length, props.expandRatio, vertical.value],
  () => measure()
);

watch(
  () => [
    active.value,
    props.items.length,
    props.expandRatio,
    props.duration,
    props.ease,
    vertical.value,
    props.tilt,
    props.parallax,
    props.grayscale,
    props.showLabels,
    props.stagger
  ],
  () => applyLayout(!firstRun)
);

const handleEnter = (i: number) => {
  if (props.trigger === 'hover') active.value = i;
};

const handleClick = (i: number, e: MouseEvent) => {
  if (i !== active.value) {
    e.preventDefault();
    active.value = i;
  }
};

const handleKeyDown = (i: number, e: KeyboardEvent) => {
  const n = props.items.length;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    active.value = (i + 1) % n;
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    active.value = (i - 1 + n) % n;
  }
};
</script>

<template>
  <div
    ref="rootRef"
    class="ag"
    :class="vertical ? 'ag--vertical' : 'ag--horizontal'"
    :style="rootStyle"
    role="list"
    :aria-label="ariaLabel"
  >
    <component
      :is="item.link ? 'a' : 'div'"
      v-for="(item, i) in items"
      :key="i"
      :ref="(el: Element | ComponentPublicInstance | null) => setPanelRef(el, i)"
      class="ag-panel"
      :style="
        {
          borderRadius: `${radius}px`,
          '--ag-accent': accentColor,
          willChange: 'flex-grow, transform'
        } as CSSProperties
      "
      :href="item.link || undefined"
      @click="(e: MouseEvent) => handleClick(i, e)"
      @mouseenter="handleEnter(i)"
      @focus="active = i"
      @keydown="(e: KeyboardEvent) => handleKeyDown(i, e)"
      role="listitem"
      tabindex="0"
      :aria-current="active === i ? 'true' : undefined"
      :aria-label="item.label"
    >
      <span class="ag-clip">
        <span
          :ref="(el: Element | ComponentPublicInstance | null) => setMediaRef(el, i)"
          class="ag-media"
          :style="{
            width: vertical ? '100%' : 'var(--ag-media-size, 320px)',
            height: vertical ? 'var(--ag-media-size, 320px)' : '100%',
            willChange: 'transform, filter'
          }"
        >
          <img
            :src="item.image"
            :alt="item.alt || item.label || ''"
            :draggable="false"
            class="ag-img"
          />
        </span>
        <span class="ag-overlay" :style="{ background: overlayBg }" aria-hidden="true" />
      </span>
      <span
        v-if="showLabels"
        class="ag-labels"
        aria-hidden="true"
      >
        <span
          :ref="(el: Element | ComponentPublicInstance | null) => setBarRef(el, i)"
          class="ag-bar"
          :style="{
            background: accentColor,
            boxShadow: `0 0 12px color-mix(in srgb, ${accentColor} 60%, transparent)`
          }"
        />
        <span
          :ref="(el: Element | ComponentPublicInstance | null) => setTextRef(el, i)"
          class="ag-text"
          :style="{ color: textColor }"
        >
          <span class="ag-text__label">{{ item.label }}</span>
          <span v-if="item.description" class="ag-text__desc">{{ item.description }}</span>
        </span>
      </span>
    </component>
  </div>
</template>

<style scoped>
.ag {
  display: flex;
  width: 100%;
  max-width: 100%;
  perspective: 1400px;
}

.ag--horizontal {
  flex-direction: row;
}

.ag--vertical {
  flex-direction: column;
}

@media (max-width: 520px) {
  .ag {
    flex-direction: column;
    perspective: none;
  }
}

.ag-panel {
  position: relative;
  display: block;
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #0a0713;
  outline: none;
  text-decoration: none;
  transform-style: preserve-3d;
  transform-origin: center;
  cursor: pointer;
  box-shadow: 0 10px 30px -18px rgba(0, 0, 0, 0.8);
}

.ag-panel:focus-visible {
  box-shadow:
    0 0 0 2px var(--ag-accent),
    0 10px 30px -18px rgba(0, 0, 0, 0.8);
}

@media (max-width: 520px) {
  .ag-panel {
    min-height: 84px;
    transform-style: flat;
  }
}

.ag-clip {
  position: absolute;
  inset: 0;
  display: block;
  border-radius: inherit;
  overflow: hidden;
}

.ag-media {
  position: absolute;
  top: 50%;
  left: 50%;
  filter: grayscale(var(--ag-gray, 1));
}

.ag-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-drag: none;
}

.ag-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ag-labels {
  position: absolute;
  right: 20px;
  bottom: 20px;
  left: 20px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: none;
}

.ag-bar {
  flex: none;
  width: 3px;
  height: 26px;
  border-radius: 3px;
  opacity: 0;
}

.ag-text {
  overflow: hidden;
  font-weight: 600;
  font-size: clamp(1rem, 1.4vw, 1.4rem);
  letter-spacing: 0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.55);
  opacity: 0;
}

/* 有 description 时 caption 变两行：标题 + 小字说明 */
.ag-text:has(.ag-text__desc) {
  white-space: normal;
}

.ag-text__label,
.ag-text__desc {
  display: block;
}

.ag-text__desc {
  margin-top: 0.4em;
  font-weight: 400;
  font-size: 0.72em;
  line-height: 1.55;
  letter-spacing: 0.02em;
  opacity: 0.82;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  white-space: normal;
  text-overflow: clip;
}
</style>
