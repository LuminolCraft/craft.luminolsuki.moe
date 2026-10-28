<!--
  ThoughtLine —— AI 回复的「思考中」一行态

  移植自 NXUI「Thought Line」（https://nxui.geoql.in/docs/components/thought-line，
  注册表源码 https://nxui.geoql.in/r/thought-line.json）
  原作者 David Haz · MIT + Commons Clause 许可（上游注明 "Ported from React Bits by David Haz"）

  改写要点（相对上游源码）：
  - 去 Nuxt 依赖：`<Icon name="lucide:...">` 换成 @hugeicons/vue（AiSparkles / ChevronDown / Check）
  - 去全局样式：`<style>` 全局块改 scoped，类名 thought-line__* → tl-*
  - 文案中文化：默认 label 'Thinking…' → '思考中…'，无 timer 的 settle 文案
    'Done thinking' → '已思考'（showTimer 时的 'Thought for' → '思考了'），
    spoken() 播报改为「x.x 秒 / x 分 x.x 秒」
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { animate } from 'motion-v';
import type { AnimationPlaybackControls } from 'motion-v';
import { usePreferredReducedMotion } from '@vueuse/core';
import { HugeiconsIcon } from '@hugeicons/vue';
import { AiSparklesIcon, CheckIcon, ChevronDownIcon } from '@hugeicons/core-free-icons';

/** 内置 glyph：sparkle / dot / none，或用 #glyph 插槽自定义 */
export type ThoughtLineGlyph = 'sparkle' | 'dot' | 'none';

interface ThoughtLineProps {
  /** working 时显示的行。它呼吸、带 shimmer，也是无障碍播报的文本 */
  label?: string;
  /** settle 后显示的行。留空且无 timer 时用「已思考」 */
  doneLabel?: string;
  glyph?: ThoughtLineGlyph;
  /** 行下方的步骤轨迹。最后一步是当前步，之前的打勾 */
  steps?: string[];
  /** 变成轨迹的开关（带 chevron） */
  collapsible?: boolean;
  /** settle 时把轨迹折进一行 */
  collapseOnSettle?: boolean;
  /** 行与轨迹的墨色 */
  color?: string;
  /** 仅 glyph 的颜色。留空跟随墨色 */
  glyphColor?: string;
  /** 字号 px，其余尺寸按 em 缩放 */
  fontSize?: number;
  /** 一次呼吸（升+降）的秒数 */
  breathPeriod?: number;
  /** 呼吸谷底变暗的程度。0 为不呼吸 */
  breathDepth?: number;
  /** working 标签上的墨带扫过效果 */
  shimmer?: boolean;
  /** 一次 shimmer 的秒数 */
  shimmerDuration?: number;
  /** settle 和弦时长 ms：交叉淡入、变暗、滑动、折叠 */
  settleDuration?: number;
  /** 交叉淡入接缝处的模糊 px */
  settleBlur?: number;
  /** working / settled。重新置 true 会重置计时 */
  working?: boolean;
  /** 秒数后自动 settle。0 表示等 working 变 false */
  settleAfter?: number;
  /** 受控秒数。内部时钟不跑 */
  elapsed?: number;
  /** 冻结进句子的实时计时器 */
  showTimer?: boolean;
  /** 根元素附加 class */
  class?: string;
}

const props = withDefaults(defineProps<ThoughtLineProps>(), {
  label: '思考中…',
  doneLabel: '',
  glyph: 'sparkle',
  steps: () => [],
  collapsible: true,
  collapseOnSettle: true,
  color: 'currentColor',
  glyphColor: '',
  fontSize: 16,
  breathPeriod: 1.6,
  breathDepth: 0.45,
  shimmer: true,
  shimmerDuration: 1.8,
  settleDuration: 350,
  settleBlur: 2,
  working: true,
  settleAfter: 0,
  elapsed: undefined,
  showTimer: true,
  class: '',
});

const emit = defineEmits<{
  /** 每次 settle 触发一次，带冻结的秒数 */
  settle: [seconds: number];
}>();

defineSlots<{
  /** 自定义 glyph，替换内置 sparkle/dot */
  glyph?: () => unknown;
  /** 包裹任一标签文本，用于加光效或链接。仅行内内容 */
  label?: (scope: { text: string; working: boolean }) => unknown;
}>();

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];
const GLYPH_DONE = 0.55;
const NO_ATTRS = {};

function fmt(ds: number): string {
  return ds < 600
    ? `${(ds / 10).toFixed(1)}s`
    : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`;
}

function spoken(ds: number): string {
  return ds < 600
    ? `${(ds / 10).toFixed(1)} 秒`
    : `${Math.floor(ds / 600)} 分 ${((ds % 600) / 10).toFixed(1)} 秒`;
}

const reducedMotion = usePreferredReducedMotion();
const reduce = computed(() => reducedMotion.value === 'reduce');

const autoSettled = ref(false);
const open = ref(true);
const isWorking = computed(() => props.working && !autoSettled.value);
const doneText = computed(
  () => props.doneLabel || (props.showTimer ? '思考了' : '已思考'),
);
const hasTrace = computed(() => props.steps.length > 0);
const depth = computed(() =>
  reduce.value ? Math.min(props.breathDepth, 0.2) : props.breathDepth,
);
const period = computed(() =>
  reduce.value ? props.breathPeriod * 1.5 : props.breathPeriod,
);
const trough = computed(() => 1 - depth.value);
const sheen = computed(() => props.shimmer && !reduce.value);
const toggle = computed(() => hasTrace.value && props.collapsible);

const glyphRef = ref<HTMLElement | null>(null);
const breathRef = ref<HTMLElement | null>(null);
const timerRef = ref<HTMLElement | null>(null);
const stackRef = ref<HTMLElement | null>(null);
const workRef = ref<HTMLElement | null>(null);
const doneRef = ref<HTMLElement | null>(null);

let ds = 0;
let prevWorking = isWorking.value;
const announce = ref(props.label);

watch(
  () => props.working,
  (w) => {
    if (w) autoSettled.value = false;
  },
);

watch(
  [isWorking, () => props.collapseOnSettle],
  ([w, collapse]) => {
    if (w) open.value = true;
    else if (collapse) open.value = false;
  },
  { immediate: true },
);

// glyph + 标签的呼吸，或 settle 时的变暗
let running: AnimationPlaybackControls[] = [];
let breathToken = 0;

function stopBreath() {
  breathToken += 1;
  running.forEach((a) => a.stop());
  running = [];
}

function loop(el: HTMLElement, delay: number): AnimationPlaybackControls {
  return animate(
    el,
    { opacity: [trough.value, 1, trough.value] },
    { duration: period.value, ease: EASE_IN_OUT, repeat: Infinity, delay },
  );
}

function runBreath() {
  stopBreath();
  const token = breathToken;
  const glyphEl = glyphRef.value;
  const breathEl = breathRef.value;
  if (!breathEl) return;
  const s = props.settleDuration / 1000;
  if (isWorking.value) {
    if (depth.value > 0) {
      if (sheen.value)
        running.push(
          animate(breathEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT }),
        );
      if (glyphEl) {
        const lead = animate(
          glyphEl,
          { opacity: trough.value },
          { duration: 0.2, ease: EASE_OUT },
        );
        running.push(lead);
        void lead.then(() => {
          if (token !== breathToken) return;
          running.push(loop(glyphEl, 0));
          if (!sheen.value) running.push(loop(breathEl, 0.14));
        });
      } else if (!sheen.value) {
        running.push(loop(breathEl, 0.14));
      }
    } else {
      if (glyphEl)
        running.push(
          animate(glyphEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT }),
        );
      running.push(
        animate(breathEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT }),
      );
    }
  } else {
    if (glyphEl)
      running.push(
        animate(
          glyphEl,
          { opacity: GLYPH_DONE },
          { duration: s, ease: EASE_OUT },
        ),
      );
    running.push(
      animate(breathEl, { opacity: 1 }, { duration: s, ease: EASE_OUT }),
    );
  }
}

// 时钟
let clockId = 0;

function paint(next: number) {
  ds = next;
  if (timerRef.value) timerRef.value.textContent = fmt(next);
}

function runClock() {
  window.clearInterval(clockId);
  clockId = 0;
  if (props.elapsed != null) {
    paint(Math.round(props.elapsed * 10));
    return;
  }
  if (!isWorking.value) return;
  const startedAt = performance.now();
  paint(0);
  clockId = window.setInterval(() => {
    const next = Math.floor((performance.now() - startedAt) / 100);
    paint(next);
    if (props.settleAfter > 0 && next >= Math.round(props.settleAfter * 10))
      autoSettled.value = true;
  }, 100);
}

// 计时器滑动到当前标签的右侧
let ro: ResizeObserver | null = null;

function place(glide: boolean) {
  const t = timerRef.value;
  const stack = stackRef.value;
  const active = isWorking.value ? workRef.value : doneRef.value;
  if (!t || !stack || !active) return;
  const shift = active.offsetWidth - stack.offsetWidth;
  if (!glide) t.style.transition = 'none';
  t.style.transform = `translateX(${shift}px)`;
  if (!glide) {
    void t.offsetWidth;
    t.style.transition = '';
  }
}

function placeStill() {
  place(false);
}

function runPlace() {
  place(prevWorking !== isWorking.value);
  prevWorking = isWorking.value;
  ro?.disconnect();
  ro = new ResizeObserver(placeStill);
  if (workRef.value) ro.observe(workRef.value);
  if (doneRef.value) ro.observe(doneRef.value);
}

function runAnnounce() {
  if (isWorking.value) {
    announce.value = props.label;
    return;
  }
  announce.value = props.showTimer
    ? `${doneText.value} ${spoken(ds)}`
    : doneText.value;
  emit('settle', ds / 10);
}

onMounted(() => {
  runClock();
  runPlace();
  runBreath();
  runAnnounce();

  watch([isWorking, () => props.elapsed, () => props.settleAfter], runClock, {
    flush: 'post',
  });
  watch(
    [
      isWorking,
      () => props.label,
      doneText,
      () => props.fontSize,
      () => props.showTimer,
    ],
    runPlace,
    { flush: 'post' },
  );
  watch(
    [
      isWorking,
      period,
      depth,
      trough,
      () => props.settleDuration,
      () => props.glyph,
      sheen,
    ],
    runBreath,
    { flush: 'post' },
  );
  watch(isWorking, runAnnounce);
});

onBeforeUnmount(() => {
  window.clearInterval(clockId);
  ro?.disconnect();
  stopBreath();
});

function handleToggle() {
  if (toggle.value) open.value = !open.value;
}

const rootStyle = computed(() => ({
  '--tl-font': `${props.fontSize}px`,
  '--tl-color': props.color,
  '--tl-glyph': props.glyphColor || props.color,
  '--tl-settle': `${props.settleDuration}ms`,
  '--tl-blur': `${props.settleBlur}px`,
  '--tl-shimmer': `${props.shimmerDuration}s`,
}));

const headAttrs = computed(() =>
  props.collapsible
    ? {
        type: 'button',
        'data-toggle': toggle.value ? '' : undefined,
        'aria-expanded': toggle.value ? open.value : undefined,
        tabindex: toggle.value ? 0 : -1,
      }
    : NO_ATTRS,
);

function stepDone(i: number): boolean {
  return !isWorking.value || i < props.steps.length - 1;
}
</script>

<template>
  <div
    :class="['tl', props.class]"
    :data-working="isWorking ? '' : undefined"
    :data-open="open && hasTrace ? '' : undefined"
    :style="rootStyle"
  >
    <component
      :is="collapsible ? 'button' : 'div'"
      class="tl-head"
      v-bind="headAttrs"
      @click="handleToggle"
    >
      <span
        v-if="glyph !== 'none' || $slots.glyph"
        ref="glyphRef"
        class="tl-glyph"
        aria-hidden="true"
      >
        <slot name="glyph">
          <HugeiconsIcon v-if="glyph === 'sparkle'" :icon="AiSparklesIcon" :size="14" />
          <span v-else-if="glyph === 'dot'" class="tl-dot" />
        </slot>
      </span>
      <span ref="stackRef" class="tl-label" aria-hidden="true">
        <span
          ref="workRef"
          class="tl-text"
          :data-active="isWorking ? '' : undefined"
        >
          <span
            ref="breathRef"
            class="tl-breath"
            :data-shimmer="sheen ? '' : undefined"
          >
            <slot name="label" :text="label" :working="true">{{ label }}</slot>
          </span>
        </span>
        <span
          ref="doneRef"
          class="tl-text tl-text--done"
          :data-active="isWorking ? undefined : ''"
        >
          <slot name="label" :text="doneText" :working="false">{{
            doneText
          }}</slot>
        </span>
      </span>
      <span
        v-if="showTimer"
        ref="timerRef"
        class="tl-timer"
        :data-done="isWorking ? undefined : ''"
        aria-hidden="true"
        >0.0s</span
      >
      <span
        v-if="collapsible"
        class="tl-chevron"
        :data-on="hasTrace ? '' : undefined"
        aria-hidden="true"
      >
        <HugeiconsIcon :icon="ChevronDownIcon" :size="14" />
      </span>
      <span class="tl-sr" role="status">{{ announce }}</span>
    </component>
    <div
      v-if="hasTrace"
      class="tl-trace"
      :data-open="open ? '' : undefined"
      :aria-hidden="!open"
    >
      <div class="tl-fold">
        <div class="tl-steps">
          <div
            v-for="(text, i) in steps"
            :key="`${i}-${text}`"
            class="tl-step"
            :data-done="stepDone(i) ? '' : undefined"
          >
            <span class="tl-mark" aria-hidden="true">
              <HugeiconsIcon v-if="stepDone(i)" :icon="CheckIcon" :size="12" />
              <i v-else class="tl-pulse" />
            </span>
            <span class="tl-step-text">{{ text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tl {
  --tl-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --tl-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --tl-done: 0.75;
  --tl-timer: 0.55;

  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  color: var(--tl-color);
  font-family: inherit;
  font-size: var(--tl-font);
  font-weight: 500;
  line-height: 1.2;
}

.tl-head {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  white-space: nowrap;
  outline: none;
  cursor: default;
}

.tl-head[data-toggle] {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.tl-glyph {
  display: inline-flex;
  flex: none;
  width: 1.1em;
  height: 1.1em;
  margin-right: 0.2em;
  color: var(--tl-glyph);
}

.tl-glyph :deep(svg),
.tl-mark :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.tl-dot {
  width: 0.5em;
  height: 0.5em;
  margin: auto;
  border-radius: 50%;
  background: currentColor;
}

.tl-label {
  display: inline-grid;
}

.tl-text {
  grid-area: 1 / 1;
  width: max-content;
  opacity: 0;
  filter: blur(var(--tl-blur));
  transition:
    opacity var(--tl-settle) var(--tl-ease-out),
    filter var(--tl-settle) var(--tl-ease-out);
}

.tl-text[data-active] {
  opacity: 1;
  filter: blur(0);
}

.tl-text--done[data-active] {
  opacity: var(--tl-done);
}

.tl-breath {
  display: inline-block;
}

.tl[data-working] .tl-breath[data-shimmer] {
  background: linear-gradient(
    100deg,
    color-mix(in srgb, var(--tl-color) 50%, transparent) 30%,
    var(--tl-color) 50%,
    color-mix(in srgb, var(--tl-color) 50%, transparent) 70%
  );
  background-size: 250% 100%;
  background-position: 125% 0;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: tl-shimmer var(--tl-shimmer) linear infinite;
}

@keyframes tl-shimmer {
  to {
    background-position: -125% 0;
  }
}

.tl-timer {
  font-variant-numeric: tabular-nums;
  opacity: var(--tl-timer);
  transition:
    opacity var(--tl-settle) ease,
    transform var(--tl-settle) var(--tl-ease-in-out);
}

.tl-timer[data-done] {
  opacity: var(--tl-done);
}

.tl-chevron {
  display: inline-flex;
  margin-left: 0.1em;
  opacity: 0;
  transition:
    opacity 200ms ease,
    transform 200ms var(--tl-ease-out);
}

.tl-chevron[data-on] {
  opacity: 0.55;
}

.tl[data-open] .tl-chevron {
  transform: rotate(180deg);
}

.tl-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.tl-trace {
  display: grid;
  grid-template-rows: 0fr;
  width: 0;
  min-width: 100%;
  transition: grid-template-rows var(--tl-settle) var(--tl-ease-out);
}

.tl-trace[data-open] {
  grid-template-rows: 1fr;
}

.tl-fold {
  min-height: 0;
  overflow-x: visible;
  overflow-y: clip;
}

.tl-steps {
  display: flex;
  flex-direction: column;
  gap: 0.45em;
  width: max-content;
  padding: 0.6em 0 0.2em 1.6em;
  font-size: 0.875em;
  font-weight: 400;
  white-space: nowrap;
}

.tl-step {
  display: flex;
  align-items: center;
  gap: 0.5em;
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 200ms var(--tl-ease-out),
    transform 200ms var(--tl-ease-out);
}

@starting-style {
  .tl-step {
    opacity: 0;
    transform: translateY(-4px);
  }
}

.tl-mark {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 1em;
  height: 1em;
  opacity: 0.55;
}

.tl-pulse {
  display: block;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: currentColor;
  animation: tl-pulse 1.6s var(--tl-ease-in-out) infinite;
}

@keyframes tl-pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }
}

.tl-step-text {
  transition: opacity var(--tl-settle) ease;
}

.tl-step[data-done] .tl-step-text {
  opacity: 0.55;
}

@media (prefers-reduced-motion: reduce) {
  .tl-text {
    filter: none !important;
    transition: opacity var(--tl-settle) ease;
  }

  .tl-timer {
    transition: opacity var(--tl-settle) ease;
  }

  .tl-step {
    transform: none !important;
    transition: opacity 200ms ease;
  }

  .tl-pulse {
    animation-duration: 2.4s;
  }
}
</style>
