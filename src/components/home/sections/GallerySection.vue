<!--
  GallerySection —— 服务器截图带

  三种形态（容器挂 `data-gallery-mode`，门禁/验收都读它）：
  - `wall`：桌面 + 正常设备 → Vue Bits「DriftWall」，12 张精选在 3 条列轨道上漂移（单 rAF）
  - `rail`：< 900px → 22 张单列 `scroll-snap-type: x mandatory`（原生滚动，零 JS / 零 rAF）
  - `grid`：reduced-motion 或低端硬件 → 12 张静态 3 列网格（无漂移、无裁切、全部可见可聚焦）

  出口：任意瓦片点击 → `useLightbox`（传全部 22 张），键盘 Tab 到瓦片时墙会用最小位移把它送进视野。
-->
<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import DriftWall from '@/components/bits/DriftWall.vue'
import BitsFxGate from '@/bits/BitsFxGate.vue'
import ImageSkeleton from '@/components/common/ImageSkeleton.vue'
import { useFxMode, useFxNarrow, useFxQuality } from '@/bits/bits-motion'
import { useBitsTokens } from '@/bits/bits-tokens'
import { useLightbox } from '@/composables/useLightbox'
import { SHOTS } from '@/config/home-content'

type GalleryMode = 'wall' | 'rail' | 'grid'

/** 壁画只用前 12 张精选；lightbox 仍是全部 22 张 */
const WALL_COUNT = 12

const tokens = useBitsTokens()
const css3dMode = useFxMode('css3d')
const quality = useFxQuality()
const narrow = useFxNarrow()

/**
 * 键盘进入壁画时切静态网格（**已与设计/体验确认过的方案，不要再改回「位移停靠」**）。
 *
 * 为什么必须换布局而不能「把瓦片挪进窗」：
 * - 轨道是周期结构：`translate3d(0, -offset)`，`offset` 被 mod 到 `[0, copyHeight)`，
 *   只有**一格自由度**；副本间隔 = copyHeight（840px），而可见窗高度 = 558px（62vh @900）
 * - 于是「某一份副本的头部」和「上一份的尾部」必然同时占窗，对某个**具体节点**来说，
 *   能让它进窗的 offset 区间可能是**空集**：固定 copy 0 时，靠近轨道头部的前 1–2 张永远进不来
 * - 实测（逐个 focus 12 个可聚焦瓦片）：4–10 张始终在窗外，残留 120–570px；
 *   试过最短路径插值 / 按瓦片局部缩放换算 / 迭代补 3 轮，最好也只到 4 张出窗
 * 结论：位移停靠在数学上不可行，而焦点环落在屏幕外违反 WCAG 2.4.11，
 * 所以改成「布局切换」这个确定性方案（12 张全部可见、全部可聚焦）。
 */
const keyboardMode = ref(false)

const galleryMode = computed<GalleryMode>(() => {
  if (keyboardMode.value) return 'grid'
  if (css3dMode.value !== 'live') return 'grid'
  if (quality.value === 'low') return 'grid'
  if (narrow.value) return 'rail'
  return 'wall'
})

const gridButtons: Array<HTMLButtonElement | null> = []

function setGridButton(el: Element | null, i: number): void {
  gridButtons[i] = el as HTMLButtonElement | null
}

/** 切换布局期间忽略 focusout：壁画卸载会把焦点丢给 body，否则会立刻弹回壁画 */
let switchingLayout = false

/** 等网格按钮真正挂载（切换带 150ms 过渡，nextTick 时可能还没渲染出来） */
async function waitForGridButton(index: number): Promise<HTMLButtonElement | null> {
  for (let i = 0; i < 25; i += 1) {
    const btn = gridButtons[index]
    if (btn) return btn
    await new Promise((resolve) => window.setTimeout(resolve, 20))
  }
  return null
}

/** DriftWall 的键盘焦点 → 换网格并把焦点交接到同一张图（源索引即壁画的数组下标） */
async function onWallFocusTile(index: number): Promise<void> {
  switchingLayout = true
  keyboardMode.value = true
  await nextTick()
  const btn = await waitForGridButton(index)
  btn?.focus()
  // 焦点交接后把目标滚进视口（Lenis 接管滚动时，程序化 focus 不一定会滚动）
  btn?.scrollIntoView({ block: 'center' })
  switchingLayout = false
}

/** 焦点整体离开截图带之后再恢复壁画 */
function onSectionFocusOut(event: FocusEvent): void {
  if (switchingLayout) return
  const next = event.relatedTarget as Node | null
  const section = event.currentTarget as HTMLElement | null
  // relatedTarget 为空 = 焦点被丢给 body（多半是布局切换中），保持当前布局
  if (!next || section?.contains(next)) return
  keyboardMode.value = false
}

const wallShots = SHOTS.slice(0, WALL_COUNT)
const wallItems = wallShots.map((image, i) => ({ image, title: `服务器截图 ${i + 1}` }))

/** 壁画索引 → 源索引（前 12 张时相等，但仍然显式算，避免以后换精选静默错位） */
const sourceIndex = (i: number): number => SHOTS.indexOf(wallShots[i] ?? '')

const allShots = ref<string[]>([...SHOTS])
const lightbox = useLightbox(allShots)

function openShot(index: number, event: MouseEvent): void {
  void lightbox.open(index, event)
}

function closeLightbox(): void {
  lightbox.close()
}
</script>

<template>
  <section class="gallery" :data-gallery-mode="galleryMode" @focusout="onSectionFocusOut">
    <div class="wrap">
      <header class="section-head" data-reveal>
        <div class="section-head__text">
          <p class="eyebrow">实机画面</p>
          <h2 class="h2">服务器长什么样</h2>
          <p class="lead">游戏内截图，来自纯净生存、综合生存与活动服。</p>
        </div>
        <MagneticCornerFrame class="mcf-inline" :padding="7" :arm-length="12">
          <p class="gallery__meta">{{ SHOTS.length }} 张实机截图 · 持续更新</p>
        </MagneticCornerFrame>
      </header>
    </div>

    <div class="wrap">
      <!-- 键盘用户可以直接跳过整片截图（12 个可聚焦瓦片） -->
      <a class="gallery__skip" href="#compare">跳过截图</a>

      <!-- 三档之间用 150ms opacity 交叉：键盘切档时避免整块画面硬跳 -->
      <Transition name="gallery-swap" mode="out-in">
      <!-- 桌面：DriftWall -->
      <div v-if="galleryMode === 'wall'" key="wall" class="gallery__stage">
        <BitsFxGate kind="css3d" name="gallery-wall" :fill="false">
          <template #default="{ active, mount }">
            <DriftWall
              v-if="mount"
              class="gallery__wall"
              :items="wallItems"
              :paused="!active"
              :columns="3"
              :tile-width="300"
              :tile-height="188"
              :gap="22"
              :radius="2"
              :tilt="9"
              :turn="-8"
              :roll="0"
              :perspective="1500"
              :depth="140"
              :speed="10"
              :variance="0.4"
              direction="up"
              :parallax="0.3"
              pause-on-hover
              :lift="10"
              :fade="0.32"
              :dim="tokens.isDark ? 0.62 : 1"
              :overlay-opacity="tokens.isDark ? 0.26 : 0.1"
              :grayscale="false"
              overlay-color="var(--background-color)"
              tile-background="var(--background-color)"
              @pick="openShot"
              @focus-tile="onWallFocusTile"
            />
          </template>
          <template #fallback>
            <!-- 门控判 static（理论上已被 galleryMode 拦下，这里只是兜底不留空白） -->
            <div class="gallery__grid">
              <button
                v-for="(src, i) in wallShots"
                :key="src"
                :ref="(el) => setGridButton(el as Element | null, i)"
                type="button"
                class="gallery__cell gallery-item"
                :aria-label="`查看第 ${sourceIndex(i) + 1} 张截图`"
                @click="openShot(sourceIndex(i), $event)"
              >
                <ImageSkeleton :src="src" alt="" />
              </button>
            </div>
          </template>
        </BitsFxGate>
      </div>

      <!-- 窄屏：22 张单列 scroll-snap（不复用 [...SHOTS, ...SHOTS]，那是 44 张） -->
      <div v-else-if="galleryMode === 'rail'" key="rail" class="gallery__rail">
        <button
          v-for="(src, i) in SHOTS"
          :key="`rail-${src}`"
          type="button"
          class="gallery__rail-item gallery-item"
          :aria-label="`查看第 ${i + 1} 张截图`"
          @click="openShot(i, $event)"
        >
          <ImageSkeleton :src="src" alt="" />
        </button>
      </div>

      <!-- reduced-motion / 低端 / 键盘：静态 3 列网格 -->
      <div v-else key="grid" class="gallery__grid">
        <button
          v-for="(src, i) in wallShots"
          :key="`grid-${src}`"
          :ref="(el) => setGridButton(el as Element | null, i)"
          type="button"
          class="gallery__cell gallery-item"
          :aria-label="`查看第 ${sourceIndex(i) + 1} 张截图`"
          @click="openShot(sourceIndex(i), $event)"
        >
          <ImageSkeleton :src="src" alt="" />
        </button>
      </div>
      </Transition>
    </div>

    <!-- Lightbox：全部 22 张 -->
    <div
      v-if="lightbox.visible.value"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="截图预览"
      @click="closeLightbox"
    >
      <button class="lightbox__close" type="button" aria-label="关闭预览" @click.stop="closeLightbox">
        ×
      </button>
      <button
        v-if="lightbox.hasPrevious.value"
        class="lightbox__nav lightbox__nav--prev"
        type="button"
        aria-label="上一张"
        @click.stop="lightbox.prev"
      >
        ‹
      </button>
      <button
        v-if="lightbox.hasNext.value"
        class="lightbox__nav lightbox__nav--next"
        type="button"
        aria-label="下一张"
        @click.stop="lightbox.next"
      >
        ›
      </button>
      <img
        :ref="(el) => { lightbox.lightboxImageRef.value = el as HTMLImageElement | null }"
        class="lightbox__image"
        data-flip-id="news-lightbox-img"
        :src="lightbox.currentImage.value || ''"
        alt=""
      />
    </div>
  </section>
</template>
