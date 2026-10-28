<!--
  ImageSkeleton —— 图片骨架占位 + 加载完成渐显

  淡入模式移植自 Vue Bits「FadeContent」
  (https://vue-bits.dev/components/fade-content，MIT + Commons Clause)：
  上游用 ScrollTrigger 进视口后播 `autoAlpha 0→1 + blur(10px)→0`（gsap，power2.out）；
  这里把触发器从「进视口」换成「img @load」，因为图片骨架要的是
  「加载中占位 shimmer、加载完成才渐显」，而不是「可见就播」。

  其余改写：
  - 占位块复用项目 NewsSkeleton 的骨架语言（--skeleton-block-bg + 45° shimmer 扫光），
    两处骨架观感一致
  - prefers-reduced-motion 下不做 blur 淡入，@load 后直接置位
  - will-change 只在动画进行期间存在，播完即移除
  - 加载失败（@error）emit('error') 给父组件保留原有处理，占位停止扫光
  - 缓存图（img.complete）首帧直接显示，不播无意义的淡入
-->
<script setup lang="ts">
import { gsap } from 'gsap'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface ImageSkeletonProps {
  src: string
  alt?: string
  /** 首屏关键图传 true：不 lazy 且可 fetchpriority=high */
  eager?: boolean
}

withDefaults(defineProps<ImageSkeletonProps>(), {
  alt: '',
  eager: false,
})

const emit = defineEmits<{ error: [event: Event] }>()

const imgRef = ref<HTMLImageElement | null>(null)
const loaded = ref(false)
const failed = ref(false)
const animating = ref(false)

let played = false

function reveal(): void {
  if (played) return
  played = true
  loaded.value = true

  const el = imgRef.value
  if (!el) return

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return

  animating.value = true
  gsap.fromTo(
    el,
    { autoAlpha: 0, filter: 'blur(10px)' },
    {
      autoAlpha: 1,
      filter: 'blur(0px)',
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => {
        animating.value = false
        gsap.set(el, { clearProps: 'filter,will-change' })
      },
    }
  )
}

function onLoad(): void {
  reveal()
}

function onError(e: Event): void {
  failed.value = true
  emit('error', e)
}

/** 缓存命中时 complete 已为 true，不播淡入 */
onMounted(() => {
  const el = imgRef.value
  if (el && el.complete && el.naturalWidth > 0) {
    played = true
    loaded.value = true
  }
})

onBeforeUnmount(() => {
  if (imgRef.value) gsap.killTweensOf(imgRef.value)
})

const rootClass = computed(() => ({
  'is-loaded': loaded.value,
  'is-failed': failed.value,
}))
</script>

<template>
  <div class="img-skeleton" :class="rootClass">
    <img
      ref="imgRef"
      class="img-skeleton__img"
      :class="{ 'is-animating': animating }"
      :src="src"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      @load="onLoad"
      @error="onError"
    />
    <div v-if="!loaded" class="img-skeleton__shimmer" aria-hidden="true" />
  </div>
</template>

<style scoped>
.img-skeleton {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 与 NewsSkeleton 同一套骨架令牌 */
.img-skeleton__shimmer {
  position: absolute;
  inset: 0;
  background: var(--skeleton-block-bg, rgba(0, 0, 0, 0.06));
  overflow: hidden;
}

.img-skeleton__shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--primary-color, #a78bfa) 14%, transparent),
    transparent
  );
  animation: img-skeleton-sweep 1.4s ease-in-out infinite;
}

.is-failed .img-skeleton__shimmer {
  animation: none;
}

.is-failed .img-skeleton__shimmer::after {
  animation: none;
  opacity: 0;
}

.img-skeleton__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 加载完成前藏住破图图标；gsap 的 autoAlpha 会接管 inline opacity */
  visibility: hidden;
}

.is-loaded .img-skeleton__img {
  visibility: visible;
}

.img-skeleton__img.is-animating {
  will-change: opacity, filter;
}

@keyframes img-skeleton-sweep {
  100% {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .img-skeleton__shimmer::after {
    animation: none;
  }
}
</style>
