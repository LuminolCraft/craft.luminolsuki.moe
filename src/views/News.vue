<template>
  <section class="news-section" ref="newsSectionRef">
    <div class="intro">
      <h2>{{ t('news.list.title') }}</h2>
      <p>{{ t('news.list.subtitle') }}</p>
    </div>

    <!-- 工具栏：搜索 / 分类 / 仅看重要 / 布局切换 -->
    <div class="toolbar-row">
      <NewsSearch
        :selected-tags="selectedTags"
        :all-tags="allTags"
        :search-query="query.q ?? ''"
        @search="onSearch"
        @tag-toggle="onTagToggle"
      >
        <template #extra-controls>
          <div class="extra-controls">
            <label class="category-filter">
              <span class="filter-label">{{ t('news.filter.category') }}</span>
              <select
                class="category-select"
                :value="query.category ?? ''"
                @change="onCategoryChange"
              >
                <option value="">{{ t('news.filter.categoryAll') }}</option>
                <option v-for="item in categories" :key="item.category" :value="item.category">
                  {{ categoryLabel(item.category) }}（{{ item.count }}）
                </option>
              </select>
            </label>
          </div>
        </template>
      </NewsSearch>
      <LayoutToggle v-model="layoutMode" />
    </div>

    <!-- 当前筛选概览：让「为什么只剩这几条」可见，并给一键清除 -->
    <div v-if="hasActiveFilter" class="active-filter">
      <span class="active-filter-text">
        {{ t('news.filter.active', { count: total }) }}
        <template v-if="query.category">· {{ categoryLabel(query.category) }}</template>
        <template v-if="query.tag?.length">· {{ query.tag.map((t) => '#' + t).join('　') }}</template>
        <template v-if="query.q">· “{{ query.q }}”</template>
        <template v-if="query.important">· {{ t('news.filter.importantOnly') }}</template>
      </span>
      <button type="button" class="active-filter-reset" @click="resetFilters">
        {{ t('news.filter.reset') }}
      </button>
    </div>

    <div
      id="news-grid"
      class="news-grid"
      :class="[layoutMode === 'list' ? 'list-mode' : 'grid-mode', { 'cover-left': coverPosition === 'left' }]"
      v-lenis-scroll
    >
      <template v-if="loading">
        <NewsSkeleton :count="query.limit" />
      </template>

      <template v-else-if="error">
        <div class="error-message">
          <h3>{{ t('news.list.error.title') }}</h3>
          <p>{{ t('news.list.error.description') }}</p>
          <button type="button" class="retry-btn" @click="reload">{{ t('news.list.error.retry') }}</button>
        </div>
      </template>

      <template v-else-if="items.length === 0">
        <div class="empty-message">
          <h3>{{ t('news.list.empty.title') }}</h3>
          <p>{{ t('news.list.empty.description') }}</p>
          <button v-if="hasActiveFilter" type="button" class="retry-btn" @click="resetFilters">
            {{ t('news.filter.reset') }}
          </button>
        </div>
      </template>

      <template v-else>
        <RevealCard
          v-for="(item, index) in items"
          :key="item.id"
          :delay="Math.min(index, 8) * 0.06"
        >
          <GlareHover bare width="100%" height="100%" :glare-opacity="0.3" :transition-duration="700">
            <NewsCard
              :item="item"
              :layout="layoutMode"
              :read-counts="readCounts"
              @click="goToDetail"
              @tag-click="onTagToggle"
            />
          </GlareHover>
        </RevealCard>
      </template>
    </div>

    <NewsPagination
      v-if="!loading && !error && items.length > 0"
      :current-page="currentPage"
      :page-count="totalPages"
      @prev="prevPage"
      @next="nextPage"
      @go="goTo"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMediaQuery } from '@vueuse/core'
import { useLastViewedCookie } from '@/composables/useLastViewedCookie'
import { useNewsData } from '@/composables/useNewsData'
import { useNewsFilter } from '@/composables/useNewsFilter'
import { useNewsPagination } from '@/composables/useNewsPagination'
import NewsSearch from '@/components/news/NewsSearch.vue'
import NewsCard from '@/components/news/NewsCard.vue'
import RevealCard from '@/components/common/RevealCard.vue'
import NewsPagination from '@/components/news/NewsPagination.vue'
import NewsSkeleton from '@/components/news/NewsSkeleton.vue'
import LayoutToggle from '@/components/news/LayoutToggle.vue'
import GlareHover from '@/components/bits/GlareHover.vue'
import { fetchNewsCategories, fetchNewsTags } from '@/utils/news/news-api'
import type { NewsCategory, NewsCategoryCount, NewsListItem } from '@/types/news'

const { t } = useI18n()
const router = useRouter()
const { setLastViewedNews } = useLastViewedCookie()

// ========== 布局模式（纯展示偏好，存 localStorage 即可，不进 URL） ==========
const STORAGE_KEY = 'news_layout_mode'
const isMobile = useMediaQuery('(max-width: 768px)')
const defaultMode = computed<'list' | 'grid'>(() => (isMobile.value ? 'grid' : 'list'))
const layoutMode = ref<'list' | 'grid'>(
  (localStorage.getItem(STORAGE_KEY) as 'list' | 'grid' | null) ?? defaultMode.value,
)
watch(layoutMode, (value) => localStorage.setItem(STORAGE_KEY, value))
/** 微调点：封面位置（列表模式）。当前固定右侧，需要切左侧改这里。 */
const coverPosition = ref<'left' | 'right'>('right')

// ========== 数据 / 筛选 / 分页 ==========
const { query, items, total, totalPages, loading, error, readCounts, reload } = useNewsData()
const { setCategory, toggleTag, setSearch, reset } = useNewsFilter()
const { currentPage, goTo, prevPage, nextPage } = useNewsPagination(totalPages)

const categories = ref<NewsCategoryCount[]>([])
const allTags = ref<string[]>([])
const newsSectionRef = ref<HTMLElement | null>(null)

/** 标签选择状态来自 URL（单选）。 */
const selectedTags = computed(() => query.value.tag ?? [])
const hasActiveFilter = computed(
  () => Boolean(query.value.category || query.value.tag?.length || query.value.q || query.value.important),
)

/** 分类显示名（未知分类回落原值）。 */
function categoryLabel(category: NewsCategory): string {
  const key = `news.category.${category}`
  const label = t(key)
  return label === key ? category : label
}

// ========== 交互 ==========
/** 微调点：搜索防抖交给 NewsSearch 内部，这里只接收最终值。 */
function onSearch(value: string): void {
  setSearch(value)
}

function onTagToggle(tag: string): void {
  toggleTag(tag)
}

function onCategoryChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  setCategory(value ? (value as NewsCategory) : undefined)
}

function resetFilters(): void {
  reset()
}

// ========== 跳转详情 ==========
function goToDetail(item: NewsListItem): void {
  setLastViewedNews(item.id, item.title)
  void router.push({ name: 'news-detail', params: { slug: item.slug } })
}

// ========== 生命周期 ==========
onMounted(async () => {
  // 分类与标签是筛选选项，失败不影响列表主流程（选项为空即可）
  const [categoryList, tagList] = await Promise.all([
    fetchNewsCategories().catch(() => []),
    fetchNewsTags().catch(() => []),
  ])
  categories.value = categoryList
  allTags.value = tagList.map((item) => item.tag)
})
</script>

<style scoped>
/* ===== 导入基础样式 ===== */
@import '../styles/desktop/news-styles.css';

.news-section {
  max-width: var(--vercel-container-max-width);
  margin: 0 auto;
  padding: 0 var(--spacing-4);
}

.intro {
  text-align: center;
  margin: var(--vercel-space-10, 40px) 0;
  padding: var(--vercel-space-12, 48px) 0;
}

.intro h2 {
  font-size: clamp(2rem, 4vw, 2.5rem);
  font-weight: var(--vercel-weight-semibold);
  line-height: var(--vercel-leading-snug);
  letter-spacing: var(--vercel-tracking-tighter);
  color: var(--text-color);
  margin-bottom: var(--vercel-space-4, 16px);
}

.intro p {
  font-size: var(--vercel-body-large);
  font-weight: var(--vercel-weight-normal);
  line-height: var(--vercel-leading-loose);
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
}

/* ===== 工具栏行 ===== */
.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
  max-width: 900px;
  margin: 0 auto 32px;
}

/* ===== 网格容器 ===== */
.news-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
  transition: all 0.3s ease;
}

/* 网格模式 */
.news-grid.grid-mode {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  max-width: 1200px;
}

/* 列表模式（flex 列） */
.news-grid.list-mode {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===== 列表模式下通过 :deep() 控制 NewsCard 布局 ===== */
.news-grid.list-mode :deep(.news-item) {
  flex-direction: row !important;
  min-height: 180px;
}
.news-grid.list-mode :deep(.news-item .news-item-body) {
  width: calc(100% - 30% - 1.5rem) !important;
  max-width: calc(100% - 30% - 1.5rem) !important;
  padding: 1.5rem 1.75rem !important;
}
.news-grid.list-mode :deep(.news-item .news-item-cover) {
  position: absolute !important;
  top: 1rem;
  right: 1rem;
  bottom: 1rem;
  width: 30% !important;
  height: auto !important;
  aspect-ratio: auto !important;
  border-radius: 12px !important;
  flex-shrink: 0;
}
/* 列表模式无封面：没有配图占位，正文占满整行 */
.news-grid.list-mode :deep(.news-item:not(.has-cover) .news-item-body) {
  width: 100% !important;
  max-width: 100% !important;
  padding: 1.5rem 1.75rem !important;
}
/* 列表模式封面在左侧（通过父容器 .cover-left 控制） */
.news-grid.list-mode.cover-left :deep(.news-item .news-item-cover) {
  right: auto !important;
  left: 1rem !important;
}
.news-grid.list-mode.cover-left :deep(.news-item .news-item-body) {
  margin-left: auto !important;
  padding: 1.5rem 1.75rem 1.5rem 2.5rem !important;
  width: calc(100% - 30% - 1.5rem) !important;
}
/* 无封面时左封面位置无意义，正文回到整行 */
.news-grid.list-mode.cover-left :deep(.news-item:not(.has-cover) .news-item-body) {
  margin-left: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  padding: 1.5rem 1.75rem !important;
}

/* 网格模式 */
.news-grid.grid-mode :deep(.news-item) {
  flex-direction: column-reverse !important;
  height: 100% !important;
  min-height: 360px;
}
.news-grid.grid-mode :deep(.news-item .news-item-body) {
  width: 100% !important;
  max-width: 100% !important;
  padding: 1.25rem 1.25rem !important;
  flex: 1 1 auto;
}
.news-grid.grid-mode :deep(.news-item .news-item-cover) {
  position: relative !important;
  width: 100% !important;
  aspect-ratio: 2 / 1 !important;
  border-radius: 12px 12px 0 0 !important;
  flex-shrink: 0;
}

/* ===== 移动端列表模式调整 ===== */
@media (max-width: 768px) {
  .news-grid.list-mode :deep(.news-item) {
    flex-direction: row !important;
    min-height: auto;
  }
  .news-grid.list-mode :deep(.news-item .news-item-body) {
    width: calc(100% - 9rem - 0.75rem) !important;
    padding: 0.75rem !important;
  }
  .news-grid.list-mode :deep(.news-item:not(.has-cover) .news-item-body) {
    width: 100% !important;
    max-width: 100% !important;
    padding: 1rem !important;
  }
  .news-grid.list-mode :deep(.news-item .news-item-cover) {
    width: 9rem !important;
    top: 0.5rem !important;
    right: 0.5rem !important;
    bottom: 0.5rem !important;
    border-radius: 0.75rem !important;
  }
  .news-grid.list-mode.cover-left :deep(.news-item .news-item-cover) {
    right: auto !important;
    left: 0.5rem !important;
  }
  .news-grid.list-mode.cover-left :deep(.news-item .news-item-body) {
    margin-left: auto !important;
    padding: 0.75rem 0.75rem 0.75rem 1rem !important;
    width: calc(100% - 9rem - 0.75rem) !important;
  }
  .news-grid.list-mode.cover-left :deep(.news-item:not(.has-cover) .news-item-body) {
    margin-left: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 1rem !important;
  }

  .news-grid.grid-mode {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  .news-section {
    padding: 30px 15px;
  }

  .intro {
    padding: 32px 0;
    margin-bottom: 32px;
  }
  .intro h2 {
    font-size: 24px;
  }
  .intro p {
    font-size: 14px;
  }

  /* ----- 工具栏垂直排列 ----- */
  .toolbar-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 0 4px;
    margin-bottom: 24px;
  }

  /* 布局切换按钮只显示图标，文字隐藏 */
  .toolbar-row :deep(.layout-toggle-btn .toggle-label) {
    display: none;
  }
  .toolbar-row :deep(.layout-toggle-btn) {
    padding: 8px 12px;
    min-height: 40px;
    justify-content: center;
    width: 100%;
  }
  .toolbar-row :deep(.toggle-dropdown) {
    right: auto;
    left: 0;
    width: 100%;
  }

  /* ----- 网格容器调整 ----- */
  .news-grid {
    gap: 16px;
    max-height: none;
  }
  .news-grid.grid-mode {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  /* 列表模式下的卡片调整（已有） */
  .news-grid.list-mode :deep(.news-item) {
    flex-direction: row !important;
    min-height: auto;
  }
  .news-grid.list-mode :deep(.news-item .news-item-body) {
    width: calc(100% - 9rem - 0.75rem) !important;
    padding: 0.75rem !important;
  }
  .news-grid.list-mode :deep(.news-item:not(.has-cover) .news-item-body) {
    width: 100% !important;
    max-width: 100% !important;
    padding: 1rem !important;
  }
  .news-grid.list-mode :deep(.news-item .news-item-cover) {
    width: 9rem !important;
    top: 0.5rem !important;
    right: 0.5rem !important;
    bottom: 0.5rem !important;
    border-radius: 0.75rem !important;
  }
  .news-grid.list-mode.cover-left :deep(.news-item .news-item-cover) {
    right: auto !important;
    left: 0.5rem !important;
  }
  .news-grid.list-mode.cover-left :deep(.news-item .news-item-body) {
    margin-left: auto !important;
    padding: 0.75rem 0.75rem 0.75rem 1rem !important;
    width: calc(100% - 9rem - 0.75rem) !important;
  }
  .news-grid.list-mode.cover-left :deep(.news-item:not(.has-cover) .news-item-body) {
    margin-left: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 1rem !important;
  }
}

/* ===== 筛选控件（分类 / 仅看重要） ===== */
.extra-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.category-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.filter-label {
  white-space: nowrap;
}

.category-select {
  height: 38px;
  padding: 0 32px 0 12px;
  border: 1px solid var(--divider-color, rgba(158, 148, 216, 0.3));
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-color);
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  appearance: none;
  /* 微调点：下拉箭头用内联 SVG，避免额外图标依赖 */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.category-select:hover,
.category-select:focus-visible {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 18%, transparent);
}

/* ===== 当前筛选概览 ===== */
.active-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  max-width: 1200px;
  margin: 0 auto 16px;
  padding: 10px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  border: 1px solid var(--divider-color, rgba(158, 148, 216, 0.25));
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.active-filter-reset {
  border: none;
  background: transparent;
  color: var(--primary-color);
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
}

.active-filter-reset:hover {
  background: color-mix(in srgb, var(--primary-color) 14%, transparent);
}

/* ===== 空态 / 错误态 ===== */
.empty-message,
.error-message {
  grid-column: 1 / -1;
  text-align: center;
  padding: 64px 24px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px solid var(--divider-color, rgba(158, 148, 216, 0.25));
}

.empty-message h3,
.error-message h3 {
  margin: 0 0 8px;
  font-size: 1.125rem;
  color: var(--text-color);
}

.empty-message p,
.error-message p {
  margin: 0 0 16px;
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.retry-btn {
  min-height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 10px;
  background: var(--primary-color);
  color: #fff;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s ease;
}

.retry-btn:hover {
  background: var(--button-hover);
}

@media (max-width: 768px) {
  .extra-controls {
    width: 100%;
    justify-content: space-between;
    gap: 8px;
  }

  .category-filter {
    flex: 1 1 auto;
  }

  .category-select {
    flex: 1 1 auto;
    height: 42px;
  }

}
</style>