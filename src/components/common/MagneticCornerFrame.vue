<!--
  MagneticCornerFrame — Magnetic Cursor + Corner Brackets 的包装组件

  用法：把任意内容包进来，鼠标进入后四个 L 形定位角展开，并随鼠标产生克制的磁吸位移。
  被包裹的元素本身不位移、不缩放、不加阴影——运动对象只有四个角。

  实现见 @/composables/useMagneticCornerHover；本组件只负责渲染四个角并把 DOM 交给它。
  角标是 aria-hidden 的绝对定位装饰层，不参与布局流，不改变任何现有间距。
  prefers-reduced-motion：角标仍出现，但跳过位移 / 错峰 / 磁吸；粗指针（pointer: coarse）：不显示角标。
-->
<template>
  <div
    ref="rootRef"
    class="magnetic-corner-frame"
    :style="{
      '--corner-arm': `${armLength}px`,
      '--corner-accent': accentColor || 'var(--accent, #a78bfa)',
    }"
  >
    <slot />

    <span
      v-for="key in CORNER_KEYS"
      :key="key"
      :ref="(el) => setCornerRef(key, el as HTMLElement | null)"
      class="magnetic-corner-frame__corner"
      :class="`magnetic-corner-frame__corner--${key}`"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  CORNER_KEYS,
  supportsMagneticCorner,
  useMagneticCornerHover,
} from '@/composables/useMagneticCornerHover'

// 微调点：padding 角标外扩距离 · armLength 角臂长度 · magnetStrength 磁吸上限 · edgeBias 边缘加权
// 说明：class 不声明为 prop，靠 attrs 直接落到根节点，使用方可以自由控制布局（flex / grid / 撑满）
const props = withDefaults(
  defineProps<{
    /** 角标相对元素边缘的外扩距离（px） */
    padding?: number
    /** 角臂长度（px），由 --corner-arm 驱动 */
    armLength?: number
    /** 磁吸位移上限（px） */
    magnetStrength?: number
    /** 边缘加权倍数：越大，鼠标靠边时吸得越紧、居中时越安静 */
    edgeBias?: number
    /** 是否在键盘 focus 时也进入锁定态 */
    activeOnFocus?: boolean
    /** 角标激活色，留空则取 var(--accent) */
    accentColor?: string
  }>(),
  {
    padding: 8,
    armLength: 18,
    magnetStrength: 6,
    edgeBias: 2.2,
    activeOnFocus: true,
    accentColor: '',
  },
)

const rootRef = ref<HTMLElement | null>(null)
/**
 * 角元素集合刻意用普通数组而不是 ref()：
 * 模板里的 :ref 回调在每次渲染后都会执行，写进响应式状态会反过来触发重渲染，
 * 形成 "Maximum recursive updates exceeded"。这里只在 onMounted 读取一次。
 */
const cornerEls: Array<HTMLElement | undefined> = []

const { bind } = useMagneticCornerHover({
  padding: props.padding,
  magnetStrength: props.magnetStrength,
  edgeBias: props.edgeBias,
  activeOnFocus: props.activeOnFocus,
  accentColor: props.accentColor,
})

/** v-for + :ref 每次更新都会调用；按 key 写入固定槽位，保证顺序与 CORNER_KEYS 一致 */
function setCornerRef(key: (typeof CORNER_KEYS)[number], el: HTMLElement | null): void {
  if (!el) return
  const index = CORNER_KEYS.indexOf(key)
  if (index < 0) return
  cornerEls[index] = el
}

onMounted(() => {
  const root = rootRef.value
  if (!root || !supportsMagneticCorner()) return

  const corners = cornerEls.filter((el): el is HTMLElement => el !== undefined)
  if (corners.length !== CORNER_KEYS.length) return

  bind(root, new Map<HTMLElement, HTMLElement[]>([[root, corners]]))
})
</script>

<style scoped>
.magnetic-corner-frame {
  position: relative;
  --corner-active: 0;
  --corner-color: var(--ink, #171717);
  --corner-stroke: color-mix(
    in srgb,
    var(--corner-accent, #a78bfa) calc(var(--corner-active) * 100%),
    var(--corner-color)
  );
}

/* 角标层：绝对定位、不参与布局；JS 负责写入 transform 与 autoAlpha */
.magnetic-corner-frame__corner {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--corner-arm, 18px);
  height: var(--corner-arm, 18px);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  border-color: var(--corner-stroke);
  will-change: transform, opacity;
}

.magnetic-corner-frame__corner--tl {
  border-top: 1px solid;
  border-left: 1px solid;
}

.magnetic-corner-frame__corner--tr {
  border-top: 1px solid;
  border-right: 1px solid;
}

.magnetic-corner-frame__corner--bl {
  border-bottom: 1px solid;
  border-left: 1px solid;
}

.magnetic-corner-frame__corner--br {
  border-bottom: 1px solid;
  border-right: 1px solid;
}

/* 只有精确指针才显示角标 */
@media (pointer: coarse), (hover: none) {
  .magnetic-corner-frame__corner {
    display: none;
  }
}

/* 布局辅助类：包装层默认是块级盒子，这三个类让它在行内场景里不破坏原有排版 */
.magnetic-corner-frame.mcf-row {
  display: flex;
  align-items: center;
  gap: inherit;
}

/* 让包装层贴合内部控件宽度，用于按钮、进度条这类不该被拉满的元素 */
.magnetic-corner-frame.mcf-inline {
  display: inline-block;
  width: fit-content;
}

/* 让包装层撑满父级，用于网格单元、对比栏这类需要占满的元素 */
.magnetic-corner-frame.mcf-fill {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
}

.magnetic-corner-frame.mcf-fill > :deep(*) {
  min-width: 0;
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .magnetic-corner-frame__corner {
    will-change: auto;
  }
}
</style>
