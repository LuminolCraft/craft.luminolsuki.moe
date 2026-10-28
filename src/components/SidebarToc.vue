<!--
  SidebarToc —— 文章目录侧栏（BranchedMenu 版）

  原版是自绘的平铺列表（badge + 缩进 + 滑动高亮条）；
  现在换成 Vue Bits 系「BranchedMenu」树枝目录：
  - h2（depthLevel 0）→ 分区头（可折叠，点击滚动到 h2）
  - h3/h4（depthLevel 1/2）→ 分区下的子项（BranchedMenu 只有两级，h4 与 h3 同层渲染）
  - 高亮随阅读进度：沿用 createTocObserver 的 IntersectionObserver + 滚动兜底，
    把当前章节 id 通过受控 `active` prop 传给 BranchedMenu（进入折叠分区会自动展开）
-->
<template>
  <div v-if="tocItems.length > 0" class="sidebar-toc">
    <!-- 标题栏 -->
    <div class="toc-widget-title">
      <span class="toc-widget-name">{{ title }}</span>
    </div>
    <!-- 内容区 -->
    <div class="toc-collapse-wrapper">
      <div class="toc-scroll-container custom-scrollbar">
        <BranchedMenu
          :items="menuItems"
          :default-open="allOpenIndices"
          :active="activeId ?? ''"
          :width="248"
          :row-height="34"
          :font-size="13"
          color="var(--text-color)"
          accent-color="var(--primary-color)"
          line-color="color-mix(in srgb, var(--text-color) 18%, transparent)"
          @select="handleSelect"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { TocRenderItem } from '@/utils/markdown/toc'
import { createTocObserver, scrollToHeading } from '@/utils/markdown/toc'
import BranchedMenu, {
  type BranchedMenuItem,
} from '@/components/bits/BranchedMenu.vue'

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

const activeId = ref<string | null>(null)
let cleanupObserver: (() => void) | null = null
let isUserInteracting = false
let updateTimer: ReturnType<typeof setTimeout> | null = null
let lastActiveId: string | null = null

/**
 * 平铺的 tocItems → BranchedMenu 的两级结构。
 * depthLevel 0 起一个新分区并收集后续 1/2 级作为 children；
 * 分区内没有子级（连续 h2）就渲染成叶子；
 * 文章若以 h3 开头（没有前置 h2），该条目降级为叶子分区。
 */
const menuItems = computed<BranchedMenuItem[]>(() => {
  const result: BranchedMenuItem[] = []
  let current: { label: string; value: string; children: BranchedMenuItem['children'] } | null =
    null

  const flush = () => {
    if (!current) return
    if (current.children && current.children.length > 0) {
      result.push({ label: current.label, value: current.value, children: current.children })
    } else {
      result.push({ label: current.label, value: current.value })
    }
    current = null
  }

  for (const item of props.tocItems) {
    if (item.depthLevel === 0) {
      flush()
      current = { label: item.text, value: item.id, children: [] }
    } else if (current) {
      current.children!.push({ value: item.id, label: item.text })
    } else {
      result.push({ label: item.text, value: item.id })
    }
  }
  flush()
  return result
})

/** 所有分区默认展开 */
const allOpenIndices = computed(() => menuItems.value.map((_, i) => i))

/** 让当前高亮项在目录滚动容器里保持可见（等待 DOM 更新后按视口差值滚动） */
function scrollTocContainerTo() {
  void nextTick(() => {
    const container = document.querySelector<HTMLElement>(
      '.sidebar-toc .toc-scroll-container',
    )
    if (!container) return
    const activeEl = container.querySelector<HTMLElement>('[data-active]')
    if (!activeEl) return
    const cRect = container.getBoundingClientRect()
    const aRect = activeEl.getBoundingClientRect()
    const delta = aRect.top + aRect.height / 2 - (cRect.top + cRect.height / 2)
    if (Math.abs(delta) > 40)
      container.scrollBy({ top: delta, behavior: 'smooth' })
  })
}

function handleSelect(id: string) {
  if (updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }
  isUserInteracting = true
  activeId.value = id
  emit('active-change', id)
  scrollToHeading(id, props.scrollOffset)
  scrollTocContainerTo()
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
  padding: 0.5rem 4px 0.5rem 0;
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

@media (max-width: 1200px) {
  .sidebar-toc {
    display: none;
  }
}
</style>
