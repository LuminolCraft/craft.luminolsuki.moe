<template>
  <div
    class="segmented"
    :class="{ 'segmented--dark': isDarkTheme }"
    :style="{ '--seg-count': optionCount, '--seg-index': activeIndex }"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <!-- 原生 radio 放在视觉层之前，保持与参考实现相同的 DOM 结构（顺序本身不参与样式匹配） -->
    <input
      v-for="option in options"
      :id="inputId(option.value)"
      :key="`input-${option.value}`"
      v-model="selected"
      class="seg-input"
      type="radio"
      :name="groupName"
      :value="option.value"
      :disabled="disabled"
    />

    <div class="seg-track" aria-hidden="true">
      <div class="seg-indicator"></div>
    </div>

    <div class="seg-content">
      <label
        v-for="option in options"
        :key="`label-${option.value}`"
        class="seg-segment"
        :for="inputId(option.value)"
      >
        <span
          v-if="$slots[`icon-${option.value}`]"
          class="seg-icon"
          aria-hidden="true"
        >
          <slot :name="`icon-${option.value}`" />
        </span>
        <span class="seg-text">{{ option.label }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 分段选择控件（smooth-option-switcher 项目适配，扁平 N 项形态）。
 *
 * 结构沿用参考实现：原生 radio 前置兄弟 + 常驻指示器 + 覆盖层标签，切换只改
 * 指示器的 translateX，选中态由 CSS 按原生 checked 驱动，动效全在 CSS。
 * 与参考的差异：指示器宽度为内轨 `100% / N`，位移为 `index × 100%` 自身宽度
 * （参考记录的是 N=2 且指示器占 `50%` 的特例）；视觉全部取自本项目 token。
 * 图标由父组件按需通过 `#icon-<value>` 具名插槽提供，避免运行时模板编译。
 */
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

export interface SegmentedOption {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: SegmentedOption[]
  disabled?: boolean
  ariaLabel?: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const uid = useId()
const groupName = `seg-${uid}`

/** 选项数至少为 1，避免 `calc(100% / var(--seg-count))` 除零 */
const optionCount = computed(() => Math.max(1, props.options.length))

/**
 * 本地镜像用于原生 radio 的 `checked` 绑定。不能直接把 `modelValue` 交给
 * `v-model`：父组件异步改值时原生 `checked` 复位不可靠，会与 DOM 选中态脱节。
 * 这里只在值变化时同步，保证父组件的受控语义优先。
 */
const selected = ref(props.modelValue)

watch(
  () => props.modelValue,
  (value) => {
    if (value !== selected.value) selected.value = value
  },
  { flush: 'sync' },
)

watch(selected, (value) => {
  if (value !== props.modelValue) emit('update:modelValue', value)
})

const activeIndex = computed(() => {
  const index = props.options.findIndex((option) => option.value === selected.value)
  return index < 0 ? 0 : index
})

function inputId(value: string): string {
  return `${groupName}-${value}`
}

/**
 * 暗色主题标记。本项目亮/暗由 `html[data-theme]` 切换（TocToggles 写入），
 * 且 Vercel 灰阶 token 不随主题翻转，所以未选中文字需要在暗色下换用主题变量。
 * 监听属性变化而不是只在挂载时读一次，主题切换后无需重挂载。
 */
const isDarkTheme = ref(false)
let themeObserver: MutationObserver | null = null

function syncTheme(): void {
  isDarkTheme.value = document.documentElement.getAttribute('data-theme') === 'dark'
}

onMounted(() => {
  syncTheme()
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(syncTheme)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  }
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<style scoped>
/* ============================================================
   分段选择（持久指示器 + CSS 过渡）
   几何：内轨等分 → 指示器宽 1/N、位移 index × 自身宽度
   ============================================================ */

.segmented {
  position: relative;
  display: block;
  min-width: 0;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: var(--vercel-radius-standard, 6px);
  background: var(--card-bg);
  isolation: isolate;
}

/* ----- 原生 radio：视觉隐藏但保持可聚焦与 AT 可达 ----- */
.seg-input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

/* ----- 轨道 + 常驻指示器 ----- */
.seg-track {
  /* inset 与容器 padding 相同：让百分比宽度以内轨为基准，标签中心才与指示器中心重合 */
  position: absolute;
  inset: 3px;
  pointer-events: none;
}

.seg-indicator {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  width: calc(100% / var(--seg-count, 2));
  border-radius: var(--vercel-radius-subtle, 4px);
  background: color-mix(in srgb, var(--primary-color) 16%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 32%, transparent);
  transform: translateX(calc(var(--seg-index, 0) * 100%));
  transition: transform 0.5s cubic-bezier(0.34, 0.96, 0.6, 0.99);
  will-change: transform;
}

.seg-content {
  position: relative;
  display: flex;
  align-items: stretch;
  height: var(--seg-height, 38px);
}

.seg-segment {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 0 10px;
  border-radius: var(--vercel-radius-subtle, 4px);
  /* 未选中文字：暗色下回退到 Vercel 灰阶。`--text-secondary` 在亮色下带 alpha
     （#3c3c3ca8，实测约 2.8:1），作为表单控件的常驻文字对比度偏低 */
  color: var(--seg-idle-text, var(--vercel-gray-500, #666666));
  font-size: 0.84rem;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  user-select: none;
  transition: color 0.25s cubic-bezier(0.34, 0.96, 0.6, 0.99);
}

.seg-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
}

.segmented :deep(.seg-icon svg) {
  display: block;
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.seg-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ----- 选中态：由原生 checked 驱动，JS 不改动视觉 -----
   注意：**不要**用链式兄弟选择器 `.seg-input:checked ~ .seg-content .seg-segment`。
   本机 Chrome 154 实测该选择器会同时命中全部段（两个 label 的 computed color
   都被改写成选中色）。改用在容器上用 `:has()` 按 input 顺序定位同名段：
   行为等价、不再依赖 radios 与视觉层的兄弟顺序（radios 仍作为前置兄弟保留，
   保持与参考实现一致的结构）。 */
.segmented:has(.seg-input:nth-of-type(1):checked) .seg-content .seg-segment:nth-of-type(1),
.segmented:has(.seg-input:nth-of-type(2):checked) .seg-content .seg-segment:nth-of-type(2),
.segmented:has(.seg-input:nth-of-type(3):checked) .seg-content .seg-segment:nth-of-type(3),
.segmented:has(.seg-input:nth-of-type(4):checked) .seg-content .seg-segment:nth-of-type(4) {
  color: var(--text-color);
  font-weight: 600;
}

/* ----- 焦点：indicator 用 transform，故焦点环画在轨道内且不被裁切 ----- */
.segmented:has(.seg-input:focus-visible) .seg-track {
  border-radius: var(--vercel-radius-subtle, 4px);
  box-shadow:
    inset 0 0 0 2px var(--focus-ring-color, var(--vercel-focus-blue)),
    0 0 0 2px var(--vercel-ring-color, rgba(147, 197, 253, 0.5));
}

/* ----- 禁用 ----- */
.segmented:has(.seg-input:disabled) {
  opacity: 0.55;
}

.segmented:has(.seg-input:disabled) .seg-segment {
  cursor: not-allowed;
}

/* ----- 无障碍与强制色兜底 ----- */
/* 暗色主题下 Vercel 灰阶 token 不翻转，而 `--text-secondary` 在暗色里被映射成与
   主文字同色（theme-colors.css 的既有怪癖），两者都压不住对比需求。这里显式取
   暗色次要文字（`--bases-dark-text-light-2`，带 alpha），保证选中/未选中肉眼可分。 */
.segmented--dark {
  --seg-idle-text: var(--bases-dark-text-light-2, #c8c8c8a8);
}

@media (prefers-reduced-motion: reduce) {
  /* !important 是必要的：theme-colors.css 的全局
     `transition-duration: 0.01ms !important` 会把过渡压到 1e-05s 而不是 0s */
  .seg-indicator,
  .seg-segment {
    transition: none !important;
  }
}

@media (forced-colors: active) {
  .seg-indicator {
    background: Highlight;
    box-shadow: none;
    forced-color-adjust: none;
  }

  .segmented:has(.seg-input:nth-of-type(1):checked) .seg-content .seg-segment:nth-of-type(1),
  .segmented:has(.seg-input:nth-of-type(2):checked) .seg-content .seg-segment:nth-of-type(2),
  .segmented:has(.seg-input:nth-of-type(3):checked) .seg-content .seg-segment:nth-of-type(3),
  .segmented:has(.seg-input:nth-of-type(4):checked) .seg-content .seg-segment:nth-of-type(4) {
    color: HighlightText;
  }
}
</style>
