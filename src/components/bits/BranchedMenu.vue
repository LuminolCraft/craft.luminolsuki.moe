<!--
  BranchedMenu —— 树枝状折叠目录（TOC / 树形导航）

  移植自 NXUI「Branched Menu」（https://nxui.geoql.in/docs/components/branched-menu，
  注册表源码 https://nxui.geoql.in/r/branched-menu.json）
  原作者 David Haz · MIT + Commons Clause 许可（上游注明 "Ported from React Bits by David Haz"）

  改写要点（相对上游源码）：
  - 类名 branched-menu__* → bm-*（CSS 变量本就是 --bm-*，保持不变）
  - 去掉 Nuxt `<Icon>` 子项图标渲染（本项目 TOC 子项不带图标，icon 字段不再支持）
  - 去掉 DEFAULT_BRANCHED_MENU_ITEMS 演示数据，items 默认为空数组
  - **新增受控 `active` prop**：上游的 active 是纯内部 ref（只有 defaultActive 初值），
    TOC 需要「随阅读进度高亮」——外部传 active 时 watch 同步到内部值，
    内部点击仍走 select（既响应外部，又不锁死交互）
  - 分区头点击：上游只做折叠切换；这里若分区带 value（TOC 的 h2 锚点），
    折叠的同时 emit select，让父组件滚动到该标题
-->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';

export interface BranchedMenuChild {
  value: string;
  label: string;
}

export interface BranchedMenuItem {
  label: string;
  /** 叶子分区的值。默认取 label */
  value?: string;
  /** 带children 的分区可折叠；不带的是叶子，点击即选中 */
  children?: BranchedMenuChild[];
}

interface BranchedMenuProps {
  items?: BranchedMenuItem[];
  /** 初始展开的分区。-1 表示全不展开 */
  defaultOpen?: number | number[];
  /** 初始选中的值。留空取第一个展开分区的第一个子项 */
  defaultActive?: string;
  /** 受控高亮：外部（阅读进度）驱动的当前值 */
  active?: string;
  /** 墨色。闲置文本是它的混色 */
  color?: string;
  /** 活动线条、活动标签与标记的颜色 */
  accentColor?: string;
  /** 导轨、主干与枝杈的颜色 */
  lineColor?: string;
  /** 菜单最大宽度 px。按内容收缩 */
  width?: number;
  /** 子项行高 px */
  rowHeight?: number;
  /** 子行起始缩进 px。枝杈止于此之前 */
  indent?: number;
  /** 主干线 x 位置 px */
  trunk?: number;
  /** 每条枝杈的圆角 px */
  radius?: number;
  /** 线宽 */
  lineWidth?: number;
  /** 子项字号 px。分区头大 1px */
  fontSize?: number;
  /** 高亮线的描绘时长 ms */
  drawDuration?: number;
  /** 分区折叠/展开时长 ms */
  foldDuration?: number;
  class?: string;
}

const PAD = 6;
const MARK = 16;

const props = withDefaults(defineProps<BranchedMenuProps>(), {
  items: () => [],
  defaultOpen: 0,
  defaultActive: '',
  active: '',
  color: 'var(--foreground)',
  accentColor: 'var(--foreground)',
  lineColor: 'color-mix(in oklab, var(--foreground) 24%, var(--background))',
  width: 240,
  rowHeight: 36,
  indent: 40,
  trunk: 14,
  radius: 10,
  lineWidth: 1.5,
  fontSize: 14,
  drawDuration: 400,
  foldDuration: 300,
  class: undefined,
});

const emit = defineEmits<{
  select: [value: string, item: BranchedMenuItem | BranchedMenuChild];
  toggle: [index: number, open: boolean];
}>();

function toSet(open: number | number[]) {
  return new Set(Array.isArray(open) ? open : open >= 0 ? [open] : []);
}

const open = ref(toSet(props.defaultOpen));
function initialActive() {
  if (props.defaultActive) return props.defaultActive;
  const first = props.items.find((it, i) => it.children && open.value.has(i));
  return first?.children?.[0]?.value ?? '';
}
const activeValue = ref(initialActive());

// 受控高亮：阅读进度驱动（内部点击仍通过 select 更新，两边不冲突）。
// 滚动进入某个折叠分区的子标题时自动展开它，让高亮始终可见
watch(
  () => props.active,
  (v) => {
    if (!v) return;
    activeValue.value = v;
    const idx = props.items.findIndex((it) =>
      it.children?.some((kid) => kid.value === v),
    );
    if (idx >= 0 && !open.value.has(idx)) {
      const next = new Set(open.value);
      next.add(idx);
      open.value = next;
    }
  },
);

const navRef = ref<HTMLElement | null>(null);
const markerRef = ref<HTMLSpanElement | null>(null);

const activeSection = computed(() =>
  props.items.findIndex((it) =>
    it.children?.some((kid) => kid.value === activeValue.value),
  ),
);
const markerShown = computed(
  () => activeSection.value >= 0 && open.value.has(activeSection.value),
);

function headAt(i: number) {
  const el = navRef.value?.querySelectorAll('.bm-head')[i];
  return el instanceof HTMLElement ? el : null;
}

function place(glide: boolean) {
  const m = markerRef.value;
  if (!m) return;
  const el = headAt(activeSection.value);
  const on = markerShown.value && el;
  if (!glide) m.style.transition = 'none';
  if (on) m.style.top = `${on.offsetTop + (on.offsetHeight - MARK) / 2}px`;
  m.toggleAttribute('data-on', Boolean(on));
  if (!glide) {
    void m.offsetHeight;
    m.style.transition = '';
  }
}

let firstResize = true;
useResizeObserver(navRef, () => {
  if (firstResize) {
    firstResize = false;
    return;
  }
  place(false);
});
onMounted(() => place(true));
watch(
  [
    activeSection,
    markerShown,
    () => props.items,
    () => props.fontSize,
    () => props.rowHeight,
  ],
  () => place(true),
  { flush: 'post' },
);

function select(value: string, item: BranchedMenuItem | BranchedMenuChild) {
  activeValue.value = value;
  emit('select', value, item);
}

function toggle(i: number) {
  const next = new Set(open.value);
  const isOpen = !next.has(i);
  if (isOpen) next.add(i);
  else next.delete(i);
  open.value = next;
  emit('toggle', i, isOpen);
}

function leafValueOf(item: BranchedMenuItem) {
  return item.value ?? item.label;
}

function onHeadClick(item: BranchedMenuItem, i: number) {
  if (item.children) {
    toggle(i);
    // TOC 场景：分区头本身是 h2 锚点，折叠的同时也选中并让父组件滚动
    if (item.value) select(item.value, item);
  } else {
    select(leafValueOf(item), item);
  }
}

function onChildClick(kid: BranchedMenuChild) {
  select(kid.value, kid);
}

const r = computed(() => Math.min(props.radius, props.rowHeight / 2 - 2));
const endX = computed(() => props.indent - 8);
function rowY(k: number) {
  return PAD + k * props.rowHeight + props.rowHeight / 2;
}
function branchPath(k: number) {
  const t = props.trunk;
  return `M ${t} ${rowY(k) - r.value} A ${r.value} ${r.value} 0 0 0 ${t + r.value} ${rowY(k)} H ${endX.value}`;
}
function reachPath(k: number) {
  const t = props.trunk;
  return `M ${t} 0 V ${rowY(k) - r.value} A ${r.value} ${r.value} 0 0 0 ${t + r.value} ${rowY(k)} H ${endX.value}`;
}
function trunkPath(count: number) {
  return `M ${props.trunk} 0 V ${rowY(count - 1) - r.value}`;
}
function lengthOf(k: number) {
  return (
    rowY(k) -
    r.value +
    (Math.PI * r.value) / 2 +
    (endX.value - props.trunk - r.value)
  );
}
function bodyHeight(kids: BranchedMenuChild[]) {
  return PAD * 2 + kids.length * props.rowHeight;
}
function reachStyle(kid: BranchedMenuChild, k: number) {
  const len = lengthOf(k);
  return {
    strokeDasharray: `${len}`,
    strokeDashoffset: `${kid.value === activeValue.value ? 0 : len}`,
  };
}

const navStyle = computed(() => ({
  '--bm-w': `${props.width}px`,
  '--bm-ink': props.color,
  '--bm-accent': props.accentColor,
  '--bm-line': props.lineColor,
  '--bm-font': `${props.fontSize}px`,
  '--bm-row': `${props.rowHeight}px`,
  '--bm-indent': `${props.indent}px`,
  '--bm-line-w': String(props.lineWidth),
  '--bm-draw': `${props.drawDuration}ms`,
  '--bm-fold': `${props.foldDuration}ms`,
}));
</script>

<template>
  <nav ref="navRef" :class="['bm', props.class]" :style="navStyle">
    <span ref="markerRef" class="bm-marker" aria-hidden="true" />
    <div
      v-for="(item, i) in items"
      :key="item.value ?? item.label"
      class="bm-section"
      :data-open="item.children && open.has(i) ? '' : undefined"
    >
      <button
        type="button"
        class="bm-head"
        :aria-expanded="item.children ? open.has(i) : undefined"
        :aria-current="
          !item.children && leafValueOf(item) === activeValue ? 'true' : undefined
        "
        :data-active="
          !item.children && leafValueOf(item) === activeValue ? '' : undefined
        "
        @click="onHeadClick(item, i)"
      >
        {{ item.label }}
      </button>
      <div
        v-if="item.children"
        class="bm-body"
        :inert="!open.has(i)"
      >
        <div class="bm-fold">
          <div
            class="bm-tree"
            :style="{ height: `${bodyHeight(item.children)}px` }"
          >
            <svg
              class="bm-lines"
              :width="indent"
              :height="bodyHeight(item.children)"
              aria-hidden="true"
            >
              <path
                class="bm-base"
                :d="trunkPath(item.children.length)"
              />
              <path
                v-for="(kid, k) in item.children"
                :key="`base-${kid.value}`"
                class="bm-base"
                :d="branchPath(k)"
              />
              <path
                v-for="(kid, k) in item.children"
                :key="`reach-${kid.value}`"
                class="bm-reach"
                :d="reachPath(k)"
                :style="reachStyle(kid, k)"
              />
            </svg>
            <button
              v-for="kid in item.children"
              :key="kid.value"
              type="button"
              class="bm-item"
              :aria-current="kid.value === activeValue ? 'true' : undefined"
              :data-active="kid.value === activeValue ? '' : undefined"
              :tabindex="open.has(i) ? 0 : -1"
              @click="onChildClick(kid)"
            >
              <span class="bm-label">{{ kid.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.bm {
  --bm-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --bm-muted: color-mix(in srgb, var(--bm-ink) 55%, transparent);

  position: relative;
  display: flex;
  flex-direction: column;
  width: fit-content;
  max-width: min(var(--bm-w), 100%);
  padding-left: 14px;
  color: var(--bm-ink);
  font-family: inherit;
  font-size: var(--bm-font);
  line-height: 1.2;
}

.bm::before {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 0;
  left: 0;
  width: 2px;
  border-radius: 1px;
  background: linear-gradient(
    to bottom,
    var(--bm-line) 0%,
    var(--bm-line) 55%,
    transparent 100%
  );
}

.bm-marker {
  position: absolute;
  top: -1px;
  left: 0;
  z-index: 1;
  width: 2px;
  height: 16px;
  border-radius: 1px;
  background: var(--bm-accent);
  opacity: 0;
  transition:
    top 220ms var(--bm-ease-out),
    opacity 150ms ease;
}

.bm-marker[data-on] {
  opacity: 1;
}

.bm-section {
  display: flex;
  flex-direction: column;
}

.bm-head {
  display: block;
  margin: 0;
  padding: 9px 0;
  border: 0;
  background: none;
  color: var(--bm-muted);
  font: inherit;
  font-size: calc(var(--bm-font) + 1px);
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition: color 200ms ease;
}

.bm-section[data-open] .bm-head,
.bm-head[data-active] {
  color: var(--bm-ink);
}

.bm-head:focus-visible,
.bm-item:focus-visible {
  color: var(--bm-ink);
  outline: 2px solid color-mix(in srgb, var(--bm-accent) 60%, transparent);
  outline-offset: 2px;
  border-radius: 4px;
}

.bm-item:focus-visible {
  outline-offset: -2px;
}

@media (hover: hover) and (pointer: fine) {
  .bm-head:hover {
    color: var(--bm-ink);
  }
}

.bm-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--bm-fold) var(--bm-ease-out);
}

.bm-section[data-open] .bm-body {
  grid-template-rows: 1fr;
}

.bm-fold {
  min-height: 0;
  overflow: hidden;
}

.bm-tree {
  position: relative;
  padding: 6px 0;
  box-sizing: border-box;
}

.bm-lines {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
}

.bm-section[data-open] .bm-lines {
  opacity: 1;
  transition: opacity 250ms ease 100ms;
}

.bm-base,
.bm-reach {
  fill: none;
  stroke-width: var(--bm-line-w);
  stroke-linecap: round;
  stroke-linejoin: round;
}

.bm-base {
  stroke: var(--bm-line);
}

.bm-reach {
  stroke: var(--bm-accent);
  transition: stroke-dashoffset var(--bm-draw) var(--bm-ease-out);
}

.bm-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: var(--bm-row);
  margin: 0;
  padding: 0 0 0 var(--bm-indent);
  border: 0;
  background: none;
  color: var(--bm-muted);
  font: inherit;
  text-align: left;
  cursor: pointer;
  outline: none;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
  transition: color 200ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .bm-item:hover {
    color: var(--bm-ink);
  }
}

.bm-item[data-active] {
  color: var(--bm-accent);
  font-weight: 500;
}

.bm-label {
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .bm-marker {
    transition: opacity 150ms ease;
  }

  .bm-body {
    transition: none;
  }

  .bm-reach {
    transition: none;
  }
}
</style>
