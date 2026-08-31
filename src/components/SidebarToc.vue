<template>
  <div v-if="tocItems.length > 0" class="sidebar-toc">
    <!-- 标题栏 -->
    <div class="toc-widget-title">
      <span class="toc-widget-name">{{ title }}</span>
    </div>
    <!-- 内容区 -->
    <div class="toc-collapse-wrapper">
      <div class="toc-scroll-container custom-scrollbar">
        <div class="toc-content" ref="tocContentRef">
          <a
            v-for="item in tocItems"
            :key="item.id"
            :href="`#${item.id}`"
            class="toc-item"
            :class="[
              `toc-level-${item.depthLevel}`,
              { 'toc-active': activeId === item.id },
            ]"
            :data-heading-id="item.id"
            :aria-label="item.text"
            :title="item.text"
            @click.prevent="handleClick(item.id)"
          >
            <div class="toc-badge" :class="{ 'toc-badge-index': item.badgeKind === 'index' }">
              <template v-if="item.badgeKind === 'index'">{{ item.badgeIndex }}</template>
              <template v-else>
                <span class="toc-badge-dot" :class="{ 'toc-badge-dot-sm': item.badgeKind === 'dot-sm' }"></span>
              </template>
            </div>
            <div class="toc-label" :class="item.labelStyle === 'primary' ? 'toc-label-primary' : 'toc-label-secondary'">
              {{ item.text }}
            </div>
          </a>
          <div
            v-if="activeId"
            class="toc-active-indicator"
            :style="indicatorStyle"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { TocRenderItem } from '@/utils/markdown/toc'
import { createTocObserver, scrollToHeading } from '@/utils/markdown/toc'

interface Props {
  tocItems: TocRenderItem[]
  contentContainer?: HTMLElement | null
  title?: string
  scrollOffset?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: '文章目录',
  scrollOffset: 100,
})

const emit = defineEmits<{
  (e: 'active-change', id: string | null): void
}>()

const tocContentRef = ref<HTMLElement | null>(null)
const activeId = ref<string | null>(null)
let cleanupObserver: (() => void) | null = null
let isUserInteracting = false
let updateTimer: ReturnType<typeof setTimeout> | null = null
let lastActiveId: string | null = null

const indicatorStyle = computed(() => {
  if (!activeId.value || !tocContentRef.value) {
    return { opacity: 0, top: '0px', height: '0px' }
  }
  const activeEl = tocContentRef.value.querySelector(
    `.toc-item[data-heading-id="${CSS.escape(activeId.value)}"]`,
  ) as HTMLElement | null
  if (!activeEl) {
    return { opacity: 0, top: '0px', height: '0px' }
  }
  return {
    opacity: 1,
    top: `${activeEl.offsetTop}px`,
    height: `${activeEl.offsetHeight}px`,
  }
})

function scrollTocContainerTo(id: string) {
  if (!tocContentRef.value) return
  const activeEl = tocContentRef.value.querySelector(
    `.toc-item[data-heading-id="${CSS.escape(id)}"]`,
  )
  if (!activeEl) return
  const container = tocContentRef.value
  const itemTop = (activeEl as HTMLElement).offsetTop
  const itemHeight = (activeEl as HTMLElement).offsetHeight
  const containerHeight = container.clientHeight
  const targetTop = itemTop - containerHeight / 2 + itemHeight / 2
  container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
}

function handleClick(id: string) {
  if (updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }
  isUserInteracting = true
  activeId.value = id
  emit('active-change', id)
  scrollToHeading(id, props.scrollOffset)
  scrollTocContainerTo(id)
  setTimeout(() => {
    isUserInteracting = false
  }, 600)
}

function initObserver() {
  if (cleanupObserver) {
    cleanupObserver()
    cleanupObserver = null
  }
  if (!props.contentContainer || props.tocItems.length === 0) return
  cleanupObserver = createTocObserver(
    props.contentContainer,
    props.tocItems,
    (id) => {
      if (isUserInteracting || id === lastActiveId || !id) return
      if (updateTimer) {
        clearTimeout(updateTimer)
        updateTimer = null
      }
      updateTimer = setTimeout(() => {
        lastActiveId = id
        activeId.value = id
        emit('active-change', id)
        updateTimer = null
      }, 150)
    },
    props.scrollOffset,
  )
}

watch(
  () => [props.tocItems, props.contentContainer],
  () => {
    nextTick(() => initObserver())
  },
  { deep: true },
)

onMounted(() => {
  nextTick(() => initObserver())
})

onUnmounted(() => {
  if (cleanupObserver) {
    cleanupObserver()
    cleanupObserver = null
  }
  if (updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }
})
</script>

<style scoped>
.sidebar-toc {
  position: sticky;
  top: 100px;
  max-height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toc-widget-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 1rem 0 0.5rem 2rem;
  font-size: var(--font-size-body, 1.125rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-color, #171717);
}
html[data-theme='dark'] .toc-widget-title {
  color: var(--text-color, #f2eefc);
}
.toc-widget-title::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 5.5px;
  width: 4px;
  height: 16px;
  border-radius: 4px;
  background: var(--primary-color, #a78bfa);
}
.toc-widget-name {
  letter-spacing: -0.02em;
}

.toc-collapse-wrapper {
  flex: 1;
  overflow: hidden;
  padding: 0 1rem 1rem;
}
.toc-scroll-container {
  position: relative;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}
.toc-scroll-container.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.toc-scroll-container.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.toc-scroll-container.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--glass-border, rgba(158, 148, 216, 0.3));
  border-radius: 4px;
}
.toc-scroll-container.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color, #a78bfa);
}
.toc-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toc-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-standard, 6px);
  text-decoration: none;
  color: var(--text-secondary, rgba(60, 60, 60, 0.66));
  transition: all 0.2s ease;
  cursor: pointer;
  z-index: 1;
}
html[data-theme='dark'] .toc-item {
  color: var(--text-secondary, rgba(200, 200, 200, 0.66));
}
.toc-item:hover {
  background: var(--glass-bg, rgba(255, 255, 255, 0.6));
  color: var(--text-color, #171717);
}
html[data-theme='dark'] .toc-item:hover {
  background: var(--glass-bg, rgba(24, 24, 30, 0.6));
  color: var(--text-color, #f2eefc);
}
.toc-item.toc-active {
  color: var(--primary-color, #a78bfa);
  font-weight: var(--font-weight-medium, 500);
  background: transparent; /* 新增 */
}
.toc-level-0 {
  padding-left: 4px;
}
.toc-level-1 {
  padding-left: 28px;
}
.toc-level-2 {
  padding-left: 52px;
}

.toc-badge {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  margin-top: 1px;
  font-size: var(--font-size-caption, 0.75rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-secondary, rgba(60, 60, 60, 0.66));
}
html[data-theme='dark'] .toc-badge {
  color: var(--text-secondary, rgba(200, 200, 200, 0.66));
}
.toc-item.toc-active .toc-badge {
  color: var(--primary-color, #a78bfa);
}
.toc-badge-index {
  background: var(--glass-bg, rgba(255, 255, 255, 0.6));
  border: 1px solid var(--glass-border, rgba(158, 148, 216, 0.3));
  border-radius: var(--radius-pill, 9999px);
  padding: 0 6px;
}
html[data-theme='dark'] .toc-badge-index {
  background: var(--glass-bg, rgba(24, 24, 30, 0.6));
}
.toc-item.toc-active .toc-badge-index {
  background: var(--primary-color, #a78bfa);
  color: #fff;
  border-color: var(--primary-color, #a78bfa);
}
.toc-badge-dot {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.6;
}
.toc-badge-dot-sm {
  width: 4px;
  height: 4px;
}
.toc-item.toc-active .toc-badge-dot {
  opacity: 1;
}

.toc-label {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-button, 0.875rem);
  line-height: 1.5;
  word-break: break-word;
  overflow-wrap: break-word;
}
.toc-label-primary {
  font-weight: var(--font-weight-medium, 500);
}
.toc-label-secondary {
  font-size: var(--font-size-caption, 0.75rem);
  opacity: 0.85;
}

.toc-active-indicator {
  position: absolute;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--primary-color, #a78bfa);
  transition: top 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s ease;
  z-index: 0;
  pointer-events: none;
  will-change: top, height;
}

@media (max-width: 1200px) {
  .sidebar-toc {
    display: none;
  }
}
</style>