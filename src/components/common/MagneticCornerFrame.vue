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
    data-mcf=""
    :data-mcf-max-arm="armLength > 0 ? armLength : undefined"
    :data-mcf-gap="padding > 0 ? padding : undefined"
    :style="{ '--corner-accent': accentColor || 'var(--accent, #a78bfa)' }"
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
  useMagneticCornerFrame,
} from '@/composables/useMagneticCornerHover'

// 微调点：padding 角标外扩距离 · armLength 角臂长度
// 两者只写进根节点的 data-mcf-max-arm / data-mcf-gap，由共享管理器在 hover 时读取；
// 所以同一页面上每个包装层都能用自己的值，不受「管理器单例」影响。
// 说明：class 不声明为 prop，靠 attrs 直接落到根节点，使用方可以自由控制布局（flex / grid / 撑满）
withDefaults(
  defineProps<{
    /** 角标相对元素边缘的外扩距离（px）。传 0 表示用全站默认值 8 */
    padding?: number
    /** 角臂长度（px）。传 0 表示用全站默认值 14；不低于 8 */
    armLength?: number
    /** 是否在键盘 focus 时也进入锁定态 */
    activeOnFocus?: boolean
    /** 角标激活色，留空则取 var(--accent) */
    accentColor?: string
  }>(),
  {
    padding: 0,
    armLength: 0,
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

const { attach } = useMagneticCornerFrame()

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

  // 登记到共享注册表：与 useUiFx 的自动增强共用同一份 frames，互不覆盖
  attach(root, corners)
})
</script>

<style scoped>
/*
  布局中性化：包装层不设置 display / width / height。
  块级盒子在 grid 与 flex 容器里会被自动拉伸，不会改变原有排版；
  唯一的例外是行内场景（按钮、进度条），用 .mcf-inline 明确声明。
*/
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
  /* inset 归零：即使父级被改成 flex/grid，角也不会被拉伸成横条 */
  inset: auto;
  top: 0;
  left: 0;
  flex: 0 0 auto;
  box-sizing: border-box;
  /* 角是装饰层：绝不吃指针命中，否则 elementFromPoint 会命中角自己 */
  pointer-events: none;
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

/*
  唯一的布局辅助类：让包装层贴合内部控件宽度。
  只给按钮、进度条这类「不该被拉满」的行内场景用。
  网格单元 / 对比栏不需要辅助类：块级盒子本来就会被拉伸。
*/
.magnetic-corner-frame.mcf-inline {
  display: inline-block;
  width: fit-content;
}

@media (prefers-reduced-motion: reduce) {
  .magnetic-corner-frame__corner {
    will-change: auto;
  }
}
</style>
