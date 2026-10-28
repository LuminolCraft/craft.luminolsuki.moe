<!--
  BitsFxGate — WebGL / CSS3D 组件的统一门控容器

  解决的问题：
  1. 不该建 context 的环境（无 WebGL / reduced-motion / 省流量 / 窄屏）**根本不挂载**子组件，
     而不是「先挂载再判断」 —— 后者会在低端设备上白付 200-400ms 的 shader 编译
  2. 不在视口内的 WebGL 组件必须停 rAF，但不销毁 context（销毁重建几十毫秒且可能失败）
  3. 页面切到后台时同样停 rAF
  4. context 丢失只降级**当前实例**（provide/inject，见 fx-lost.ts），不影响别的 canvas

  契约（写死在注释里，防止日后被改成"任何情况都不许重建"）：
  - 跨模式边界（live ↔ static）**允许**销毁重建，且必须能切回来（RM 开关 / 跨 900px / GPU 丢失）
  - 同一模式内的离屏/回屏**禁止** dispose，只 cancelAnimationFrame + resume
  - `document.hidden` 不是 mode 变化，只走 paused

  插槽：
  - 默认插槽：`{ active, mount, quality }`
      · `mount`   —— 可以挂载 WebGL 组件了（首次进入预取范围，首屏 Hero 首帧即挂）
      · `active`  —— 应该跑动画（视口内 + 页面可见 + 档位 live），WebGL 组件取反传给 `paused`
      · `quality` —— 'high' | 'low'，低端硬件只降 dpr，不砍构图
  - `#fallback` 命名插槽：`mode !== 'live'` 或 context 丢失时**只**渲染它

  测试钩子（门禁用，见 tools/home-check）：
  `data-fx-layer` / `data-fx-mode` / `data-fx-quality` / `data-fx-lost` / `data-fx-fallback`
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref } from 'vue'
import { BITS_FX_LOST } from './fx-lost'
import { useFxMode, useFxQuality, type FxKind, type FxMode } from './bits-motion'

const props = withDefaults(
  defineProps<{
    kind: FxKind
    /** 外部强制覆盖（调试用）；不传则内部按 useFxMode(kind) 响应式推导 */
    mode?: FxMode
    /** 测试/调试标识，落到 data-fx-layer 上 */
    name?: string
    /**
     * 是否铺满父级定位容器（默认 true）。
     * false 时改用文档流高度 —— CSS3D 类容器（Gallery 壁画）要自己决定高度。
     */
    fill?: boolean
  }>(),
  { mode: undefined, name: 'fx', fill: true },
)

defineSlots<{
  default?: (props: { active: boolean; mount: boolean; quality: 'high' | 'low' }) => unknown
  fallback?: () => unknown
}>()

const autoMode = useFxMode(() => props.kind)
const quality = useFxQuality()
const resolvedMode = computed<FxMode>(() => props.mode ?? autoMode.value)

/**
 * context 是否丢失（实例级）。
 * 不可回滚：这是驱动/显存状态，不是模式状态 —— 跨 mode 变化也不重置，
 * 否则用户关掉 RM 再打开时，坏掉的 canvas 会「假装好了」再黑一次。
 */
const lost = ref(false)
provide(BITS_FX_LOST, () => {
  lost.value = true
})

const showLive = computed(() => resolvedMode.value === 'live' && !lost.value)
const showFallback = computed(() => !showLive.value && resolvedMode.value !== 'off')

const rootRef = ref<HTMLElement | null>(null)
/** 是否在视口（含 240px 预取范围）内 */
const intersecting = ref(false)
/** 是否曾进入视口：一旦进入就保持挂载，避免反复建/销 context */
const everIntersected = ref(false)
/** 页面是否可见（切后台时停渲染，但不算 mode 变化） */
const pageVisible = ref(true)

const active = computed(
  () => showLive.value && intersecting.value && pageVisible.value,
)
const shouldMount = computed(() => showLive.value && everIntersected.value)

let io: IntersectionObserver | null = null

function onVisibilityChange(): void {
  pageVisible.value = !document.hidden
}

onMounted(() => {
  pageVisible.value = !document.hidden
  document.addEventListener('visibilitychange', onVisibilityChange)

  if (!showLive.value) return

  if (typeof IntersectionObserver === 'undefined' || !rootRef.value) {
    intersecting.value = true
    everIntersected.value = true
    return
  }

  io = new IntersectionObserver(
    ([entry]) => {
      const visible = entry?.isIntersecting ?? false
      intersecting.value = visible
      if (visible) everIntersected.value = true
    },
    { rootMargin: '240px 0px', threshold: 0 },
  )
  io.observe(rootRef.value)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  io?.disconnect()
  io = null
})

defineExpose({ active, shouldMount, mode: resolvedMode, quality })
</script>

<template>
  <div
    ref="rootRef"
    class="bits-fx-gate"
    :class="{ 'bits-fx-gate--flow': !props.fill }"
    :data-fx-layer="name"
    :data-fx-mode="resolvedMode"
    :data-fx-quality="showLive ? quality : ''"
    :data-fx-lost="lost ? 'true' : 'false'"
    :data-fx-fallback="showFallback ? 'true' : 'false'"
  >
    <slot v-if="showLive" :active="active" :mount="shouldMount" :quality="quality" />
    <slot v-else-if="showFallback" name="fallback" />
  </div>
</template>

<style scoped>
/* 两个分支同一个 box：live ↔ static 切换不改高度（不产生 CLS） */
.bits-fx-gate {
  position: absolute;
  inset: 0;
}

/* fill=false：改为文档流高度（Gallery 壁画自己定义高度） */
.bits-fx-gate--flow {
  position: relative;
  inset: auto;
}

.bits-fx-gate:not(.bits-fx-gate--flow) :slotted(*) {
  display: block;
  width: 100%;
  height: 100%;
}

.bits-fx-gate--flow :slotted(*) {
  display: block;
  width: 100%;
}
</style>
