<!--
  DriftWall — 漂移截图墙（Gallery 桌面档）
  移植自 Vue Bits「DriftWall」(https://vue-bits.dev/components/drift-wall)
  原作者 David Haz · MIT + Commons Clause 许可

  改写要点：
  - 去 Tailwind：24 个任意值里约 14 个是 `var(--dw-*)` 透传，其余（`absolute inset-0`、
    `w-[calc(...)]`、`group-[.is-active]/tile:...` 那一串状态类）全部翻成 scoped CSS 的真实规则
  - **删掉硬编码的深色底 `bg-[#0b0b12]`**，改 `var(--dw-bg)`（调用点传 `var(--background-color)`），
    否则浅色主题会露出深色块
  - **copies 公式改写**：上游 `ceil(H*3/copyHeight)+2` 在 62vh 下会把 12 张复制成 4 份 = 48 个 <img>。
    改成 `min(3, max(2, ceil(H/copyHeight)+1))`，典型 2 份 = 24 个 <img>，上限 36
  - **瓦片改真 `<button>`**：上游是 `div[tabindex="0"][role="button"]`，12 张会变成 24-36 个
    可聚焦的空按钮。现在**每个唯一图恰好一个可聚焦副本**（`liveCopies` 指向盖住窗口的那一份，
    其余副本 `tabindex="-1"` + `aria-hidden`，但**保留点击** —— 视口里显示的往往正是副本，
    用 inert 会连点击一起禁掉）。Tab 站数恒为 12，且落点必然在窗内
  - **键盘可达性（WCAG 2.4.11）**：容器 `overflow: clip`；`focusin` 时立刻暂停整面墙并按源索引
    高亮，同时向上层 emit `focus-tile` —— 上层会把墙换成**静态网格**（12 张全部可见可聚焦）。
    为什么不做「位移停靠」：轨道是周期结构，offset 只有 `[0, copyHeight)` 一格自由度，
    实测「把一个具体节点精确挪进窗」残留 120–570px，不可靠；换布局是确定性的。
    语义副本按「瓦片与可见窗重叠最多」动态归属（`liveCopies`），保证第一次 Tab 落下时
    焦点就在窗内，切换前不会出现「焦点环在屏幕外」的 1 帧。
  - `recentPointerDown`（350ms）跳过停靠：点击引起的 focus 不该让墙走一下。
    不用 hover / `:focus-visible` 判（Safari 有一帧延迟，会造成偶发不执行）
  - 漂移只由**三条列轨道的 transform** 驱动（单 rAF），瓦片自己不做 animation
  - 新增 `paused` prop：门控判离屏/页面隐藏时 cancelAnimationFrame，回屏原地 resume
-->
<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type CSSProperties,
  type ComponentPublicInstance,
} from 'vue'

export interface DriftWallItem {
  image: string
  title?: string
}

interface DriftWallProps {
  items?: DriftWallItem[]
  columns?: number
  tileWidth?: number
  tileHeight?: number
  gap?: number
  radius?: number
  tilt?: number
  turn?: number
  roll?: number
  perspective?: number
  depth?: number
  speed?: number
  direction?: 'up' | 'down'
  variance?: number
  parallax?: number
  pauseOnHover?: boolean
  lift?: number
  fade?: number
  dim?: number
  grayscale?: boolean
  overlayColor?: string
  /** 瓦片底色（上游硬编码 #0b0b12，这里必须跟随主题） */
  tileBackground?: string
  /**
   * 统一遮罩的不透明度（上游硬编码 0.42）。
   * 遮罩的作用是让非激活瓦片「退后」、激活时移除，但在浅色主题里
   * `白色遮罩 0.42 + 整体 opacity 0.55` 会把截图洗到几乎看不见，需要按主题分别给值。
   */
  overlayOpacity?: number
  /** 门控暂停：true 时停 rAF，false 原地恢复 */
  paused?: boolean
  className?: string
  style?: CSSProperties
}

interface ColumnMeta {
  copyHeight: number
  copies: number
}

interface RenderTile {
  id: string
  item: DriftWallItem
  /** 源索引（0-based）：data-index / aria-label / 点击回调都用它，不要用 DOM 顺序 */
  index: number
  copyIndex: number
}

interface RenderColumn {
  column: number
  /** 按副本分组：copy 0 承载语义（可聚焦），其余 aria-hidden + tabindex -1 */
  copies: RenderTile[][]
}

const props = withDefaults(defineProps<DriftWallProps>(), {
  items: () => [],
  columns: 3,
  tileWidth: 300,
  tileHeight: 188,
  gap: 22,
  radius: 2,
  tilt: 9,
  turn: -8,
  roll: 0,
  perspective: 1500,
  depth: 140,
  speed: 10,
  direction: 'up',
  variance: 0.4,
  parallax: 0.6,
  pauseOnHover: true,
  lift: 10,
  fade: 0.55,
  dim: 0.55,
  grayscale: false,
  overlayColor: 'var(--background-color)',
  tileBackground: 'var(--background-color)',
  overlayOpacity: 0.42,
  paused: false,
  className: '',
  style: undefined,
})

const emit = defineEmits<{
  /** 点击瓦片：传出**源索引**与原始事件（lightbox 需要 currentTarget 里的 img 做 Flip） */
  pick: [index: number, event: MouseEvent]
  /** 键盘聚焦到某张截图（源索引）：上层据此切到静态网格，保证金可见 */
  'focus-tile': [index: number]
}>()

/** 点击后多久内忽略 focusin（点击引起的 focus 不该改变暂停态） */
const POINTER_FOCUS_GRACE_MS = 350

const mod = (value: number, span: number): number => ((value % span) + span) % span

const columnFactor = (index: number, variance: number): number => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1
  return 1 + variance * pseudo
}

const containerRef = ref<HTMLDivElement | null>(null)
const planeRef = ref<HTMLDivElement | null>(null)
const trackRefs = ref<(HTMLDivElement | null)[]>([])

const setTrackRef = (el: Element | ComponentPublicInstance | null, index: number): void => {
  trackRefs.value[index] = el as HTMLDivElement | null
}

const containerHeight = ref(600)
/**
 * 激活态用**源索引**而不是节点 id：
 * 同一张图在副本里有多份，节点级的激活只会亮在屏幕外的那一份上
 * （copy 0 的轨道位置可能永远落在可见窗之外，见 onTileFocus 的注释），
 * 按源索引归属能保证「用户聚焦的那张图」在当前画面里一定是高亮的。
 */
const activeIndex = ref<number | null>(null)
/**
 * 键盘焦点的「源索引」。与 activeIndex 分开是为了让**可见副本**也能画出焦点环：
 * 焦点落在 copy 0 的节点上时，该节点本身可能在可见窗口之外（轨道位置决定，见下），
 * 所以环按源索引画在所有副本上，用户看到的就是「这一张图」被框住。
 */
const focusIndex = ref<number | null>(null)
/**
 * 每列**当前承载语义**的副本序号（哪一份正盖住可见窗口）。
 *
 * 为什么必须是动态的：轨道有周期（`copies × copyHeight`），offset 只有 `[0, copyHeight)`
 * 这一格自由度，所以「固定在 copy 0」时，靠近轨道头部的那几张在数学上**永远无法被移到窗内**
 * （实测 12 个里有 4 个无论怎么停靠都出窗）。而「语义跟着可见的那一份走」既保证 Tab 落点可见，
 * 也保证停靠只需要很小的位移；代价是每 ~84 秒才写一次 DOM。
 */
const liveCopies = ref<number[]>([0, 0, 0])
/** 键盘焦点是否在墙内（整墙暂停，不是只停聚焦那一列） */
const wallFocused = ref(false)

let offsets: number[] = []
let velocities: number[] = []
let hoveredCol = -1
let wallHovered = false
const pointer = { x: 0, y: 0 }
const pointerDamped = { x: 0, y: 0 }
let lastTs: number | null = null
let raf = 0
let recentPointerDown = false
let pointerGraceTimer: number | null = null

const columnItems = computed<DriftWallItem[][]>(() => {
  const cols: DriftWallItem[][] = Array.from({ length: props.columns }, () => [])
  props.items.forEach((item, i) => cols[i % props.columns]?.push(item))
  return cols.map((col) => (col.length ? col : props.items.slice(0, 1)))
})

const columnMeta = computed<ColumnMeta[]>(() => {
  const unit = props.tileHeight + props.gap
  return columnItems.value.map((col) => {
    const copyHeight = Math.max(unit, col.length * unit)
    // 上游是 ceil(H*3/copyHeight)+2（62vh 下 = 4 份，12 张变 48 个 img）；
    // 这里按「刚好盖住容器 + 1 份余量」算，并封顶 3 份
    const copies = Math.min(3, Math.max(2, Math.ceil(containerHeight.value / copyHeight) + 1))
    return { copyHeight, copies }
  })
})

const baseVelocities = computed<number[]>(() => {
  const dirSign = props.direction === 'up' ? 1 : -1
  return columnItems.value.map((_, c) => {
    const altSign = c % 2 === 0 ? 1 : -1
    return props.speed * columnFactor(c, props.variance) * dirSign * altSign
  })
})

const renderColumns = computed<RenderColumn[]>(() =>
  columnItems.value.map((col, c) => {
    const copyCount = columnMeta.value[c]?.copies ?? 0
    const copies: RenderTile[][] = []
    for (let copyIndex = 0; copyIndex < copyCount; copyIndex += 1) {
      copies.push(
        col.map((item, itemIndex) => ({
          id: `${c}-${copyIndex}-${itemIndex}`,
          item,
          index: itemIndex * props.columns + c,
          copyIndex,
        })),
      )
    }
    return { column: c, copies }
  }),
)

watch(
  () => [columnMeta.value, columnItems.value],
  () => {
    offsets = columnMeta.value.map((meta, c) => meta.copyHeight * ((c * 0.37) % 1))
    velocities = columnItems.value.map(() => 0)
  },
  { immediate: true },
)

const applyPlaneTransform = (px: number, py: number): void => {
  const plane = planeRef.value
  if (!plane) return
  plane.style.transform =
    'translate(-50%, -50%) scale(1.18) ' +
    `rotateX(${props.tilt + py}deg) rotateY(${props.turn + px}deg) rotateZ(${props.roll}deg) ` +
    `translateZ(${-props.depth}px)`
}

const animate = (ts: number): void => {
  if (lastTs === null) lastTs = ts
  const dt = Math.min(0.05, Math.max(0, ts - lastTs) / 1000)
  lastTs = ts

  const maxTilt = props.parallax * 8
  const targetX = pointer.x * maxTilt
  const targetY = -pointer.y * maxTilt
  const damp = 1 - Math.exp(-dt / 0.12)
  pointerDamped.x += (targetX - pointerDamped.x) * damp
  pointerDamped.y += (targetY - pointerDamped.y) * damp
  applyPlaneTransform(pointerDamped.x, pointerDamped.y)

  const paused = (wallHovered && props.pauseOnHover) || wallFocused.value

  for (let c = 0; c < trackRefs.value.length; c += 1) {
    const meta = columnMeta.value[c]
    if (!meta) continue

    const factor = paused || hoveredCol === c ? 0 : 1
    const target = (baseVelocities.value[c] ?? 0) * factor
    const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28))
    velocities[c] = (velocities[c] ?? 0) + (target - (velocities[c] ?? 0)) * ease
    offsets[c] = mod((offsets[c] ?? 0) + (velocities[c] ?? 0) * dt, meta.copyHeight)

    // 语义副本 = **瓦片与可见窗重叠最多**的那一份。
    // 不能只看「窗口中心落在哪一份」：每份副本里瓦片只占前 n×unit，尾部是空的，
    // 窗口经常落在某一份的空白尾部 + 下一份的头部（实测按中心取会选错一整份）。
    const winStart = offsets[c] ?? 0
    const winEnd = winStart + containerHeight.value
    let nextLive = 0
    let bestOverlap = -1
    for (let k = 0; k < meta.copies; k += 1) {
      const tileStart = k * meta.copyHeight
      const tileEnd = tileStart + (meta.copyHeight - props.gap)
      const overlap = Math.min(winEnd, tileEnd) - Math.max(winStart, tileStart)
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        nextLive = k
      }
    }
    if (liveCopies.value[c] !== nextLive) {
      const next = [...liveCopies.value]
      next[c] = nextLive
      liveCopies.value = next
    }

    const el = trackRefs.value[c]
    if (el) el.style.transform = `translate3d(0, ${-(offsets[c] ?? 0)}px, 0)`
  }

  raf = requestAnimationFrame(animate)
}

const tryStart = (): void => {
  if (props.paused || raf !== 0) return
  lastTs = null
  raf = requestAnimationFrame(animate)
}

const tryStop = (): void => {
  if (raf !== 0) {
    cancelAnimationFrame(raf)
    raf = 0
  }
  lastTs = null
}

const activate = (tileIndex: number, column: number): void => {
  hoveredCol = column
  activeIndex.value = tileIndex
}

const release = (): void => {
  hoveredCol = -1
  activeIndex.value = null
}

const handlePointerMove = (e: PointerEvent): void => {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return
  if (props.parallax > 0) {
    pointer.x = (e.clientX - rect.left) / rect.width - 0.5
    pointer.y = (e.clientY - rect.top) / rect.height - 0.5
  }
  const hit = document.elementFromPoint(e.clientX, e.clientY)
  const tile = hit?.closest?.('[data-index]') as HTMLElement | null
  if (!tile) return
  const idx = Number(tile.dataset.index)
  if (idx === activeIndex.value) return
  hoveredCol = Number(tile.dataset.col)
  activeIndex.value = idx
}

const handlePointerEnter = (): void => {
  wallHovered = true
}

const handlePointerLeaveWall = (): void => {
  wallHovered = false
  pointer.x = 0
  pointer.y = 0
  release()
}

function onPointerDown(): void {
  recentPointerDown = true
  if (pointerGraceTimer !== null) window.clearTimeout(pointerGraceTimer)
}

function onPointerUp(): void {
  if (pointerGraceTimer !== null) window.clearTimeout(pointerGraceTimer)
  pointerGraceTimer = window.setTimeout(() => {
    recentPointerDown = false
    pointerGraceTimer = null
  }, POINTER_FOCUS_GRACE_MS)
}

/**
 * 键盘焦点进入瓦片：暂停整面墙 + 按源索引高亮，并通知上层（上层会把墙换成静态网格，
 * 让 12 张图全部可见 —— 周期轨道上「把某一个节点精确挪进窗」在数学上做不到，
 * 实测残留 120–570px，所以改用布局切换这个确定性方案）。
 */
function onTileFocus(event: FocusEvent): void {
  if (recentPointerDown) return

  const tile = (event.target as HTMLElement | null)?.closest?.('[data-tile-id]') as HTMLElement | null
  if (!tile) return

  wallFocused.value = true
  activeIndex.value = Number(tile.dataset.index)
  focusIndex.value = Number(tile.dataset.index)
  hoveredCol = Number(tile.dataset.col)

  emit('focus-tile', Number(tile.dataset.index))
}

/** 焦点离开整面墙才恢复漂移；不回弹，从当前位置继续 */
function onWallFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null
  if (next && containerRef.value?.contains(next)) return
  wallFocused.value = false
  focusIndex.value = null
  release()
}

function onPick(tile: RenderTile, event: MouseEvent): void {
  emit('pick', tile.index, event)
}

let ro: ResizeObserver | null = null

onMounted(() => {
  const el = containerRef.value
  if (!el) return
  containerHeight.value = el.getBoundingClientRect().height || 600
  ro = new ResizeObserver(([entry]) => {
    containerHeight.value = entry?.contentRect.height || 600
  })
  ro.observe(el)
  tryStart()
})

const stopPausedWatch = watch(
  () => props.paused,
  (paused) => {
    if (paused) tryStop()
    else tryStart()
  },
)

onUnmounted(() => {
  stopPausedWatch()
  tryStop()
  ro?.disconnect()
  ro = null
  if (pointerGraceTimer !== null) window.clearTimeout(pointerGraceTimer)
  pointerGraceTimer = null
})

const maskStyle =
  'radial-gradient(ellipse 78% 82% at 50% 46%, #000 var(--dw-edge), transparent 100%), ' +
  'linear-gradient(to top, #000 var(--dw-edge), transparent 100%)'

const cssVars = computed<CSSProperties>(
  () =>
    ({
      '--dw-tile-w': `${props.tileWidth}px`,
      '--dw-tile-h': `${props.tileHeight}px`,
      '--dw-gap': `${props.gap}px`,
      '--dw-radius': `${props.radius}px`,
      '--dw-lift': `${props.lift}px`,
      '--dw-dim': props.dim,
      '--dw-gray': props.grayscale ? 1 : 0,
      '--dw-overlay': props.overlayColor,
      '--dw-overlay-opacity': props.overlayOpacity,
      '--dw-bg': props.tileBackground,
      '--dw-edge': `${Math.max(0, (1 - props.fade) * 100)}%`,
      perspective: `${props.perspective}px`,
      perspectiveOrigin: '50% 50%',
      WebkitMaskImage: maskStyle,
      maskImage: maskStyle,
      WebkitMaskComposite: 'source-in',
      maskComposite: 'intersect',
      ...(props.style ?? {}),
    }) as CSSProperties,
)
</script>

<template>
  <div
    ref="containerRef"
    class="drift-wall"
    :class="className"
    :style="cssVars"
    role="group"
    aria-label="服务器截图墙"
    @pointermove="handlePointerMove"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeaveWall"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @focusout="onWallFocusOut"
  >
    <div ref="planeRef" class="drift-wall__plane">
      <div v-for="colData in renderColumns" :key="`col-${colData.column}`" class="drift-wall__col">
        <div
          :ref="(el: Element | ComponentPublicInstance | null) => setTrackRef(el, colData.column)"
          class="drift-wall__track"
        >
          <div
            v-for="(copy, copyIndex) in colData.copies"
            :key="`copy-${colData.column}-${copyIndex}`"
            class="drift-wall__copy"
            :aria-hidden="copyIndex === (liveCopies[colData.column] ?? 0) ? undefined : 'true'"
          >
            <button
              v-for="tile in copy"
              :key="tile.id"
              type="button"
              class="drift-wall__tile"
              :class="{
                'is-active': activeIndex === tile.index,
                'is-focused': focusIndex === tile.index,
              }"
              :tabindex="copyIndex === (liveCopies[colData.column] ?? 0) ? 0 : -1"
              :aria-label="
                copyIndex === (liveCopies[colData.column] ?? 0)
                  ? `查看第 ${tile.index + 1} 张截图`
                  : undefined
              "
              :data-tile-id="tile.id"
              :data-col="colData.column"
              :data-index="tile.index"
              @focus="onTileFocus"
              @pointerenter="activate(tile.index, colData.column)"
              @pointerleave="release"
              @click="onPick(tile, $event)"
            >
              <span class="drift-wall__inner">
                <img
                  class="drift-wall__img"
                  :src="tile.item.image"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                />
                <span class="drift-wall__overlay" aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 容器：overflow 必须是 clip —— hidden 拦不住程序化 scrollIntoView，会把整页横向滚走 */
.drift-wall {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: clip;
}

.drift-wall__plane {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: row;
  transform-origin: 50% 50%;
  transform-style: preserve-3d;
  will-change: transform;
}

.drift-wall__col {
  position: relative;
  width: calc(var(--dw-tile-w) + var(--dw-gap));
  transform-style: preserve-3d;
}

.drift-wall__track,
.drift-wall__copy {
  display: flex;
  flex-direction: column;
  transform-style: preserve-3d;
  will-change: transform;
}

/* 瓦片是真 button：先做一遍按钮重置，再接上游的 3D 规则 */
.drift-wall__tile {
  position: relative;
  display: block;
  flex: 0 0 auto;
  width: 100%;
  height: calc(var(--dw-tile-h) + var(--dw-gap));
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  outline: none;
  transform-style: preserve-3d;
  -webkit-tap-highlight-color: transparent;
}

.drift-wall__inner {
  position: absolute;
  inset: calc(var(--dw-gap) / 2);
  display: block;
  overflow: hidden;
  background: var(--dw-bg, var(--background-color));
  border-radius: var(--dw-radius);
  opacity: var(--dw-dim);
  transform: translateZ(0);
  transition:
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.drift-wall__tile.is-active .drift-wall__inner,
.drift-wall__tile:focus-visible .drift-wall__inner {
  opacity: 1;
  transform: translateZ(var(--dw-lift));
  box-shadow: 0 24px 60px -18px rgba(0, 0, 0, 0.7);
}

/* 焦点环画在未变换的内层，避免被 3D 透视切变。
   `.is-focused` 按源索引应用到所有副本：焦点所在的 DOM 节点可能在可见窗口之外，
   真正看得见的是同一张图的另一份副本，环要跟着「这张图」而不是某个节点。 */
.drift-wall__tile:focus-visible .drift-wall__inner,
.drift-wall__tile.is-focused .drift-wall__inner {
  box-shadow:
    0 24px 60px -18px rgba(0, 0, 0, 0.7),
    0 0 0 2px var(--focus-ring-color, #8b5cf6);
}

.drift-wall__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  filter: grayscale(var(--dw-gray)) saturate(0.92);
  transition: filter 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.drift-wall__tile.is-active .drift-wall__img,
.drift-wall__tile:focus-visible .drift-wall__img {
  filter: grayscale(0) saturate(1.05);
}

.drift-wall__overlay {
  position: absolute;
  inset: 0;
  background: var(--dw-overlay);
  opacity: var(--dw-overlay-opacity, 0.42);
  pointer-events: none;
  transition: opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.drift-wall__tile.is-active .drift-wall__overlay,
.drift-wall__tile:focus-visible .drift-wall__overlay {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .drift-wall__inner,
  .drift-wall__img,
  .drift-wall__overlay {
    transition: none;
  }
}
</style>
