<template>
  <section class="news-section" ref="newsSectionRef">
    <div class="intro">
      <h2>{{ t('news.list.title') }}</h2>
      <p>{{ t('news.list.subtitle') }}</p>
    </div>

    <!-- 工具栏：使用 NewsSearch 的插槽放置布局切换 -->
    <div class="toolbar-row">
      <NewsSearch
        :selected-tags="selectedTags"
        :all-tags="uniqueTags"
        :search-query="searchQuery"
        @search="onSearch"
        @tag-toggle="handleTagToggle"
      >
        <!-- 通过插槽将布局切换按钮放入 NewsSearch 内部 -->
        <template #extra-controls>
          <LayoutToggle v-model="layoutMode" />
        </template>
      </NewsSearch>
    </div>

    <div
      id="news-grid"
      class="news-grid"
      :class="[layoutMode === 'list' ? 'list-mode' : 'grid-mode', { 'cover-left': coverPosition === 'left' }]"
      v-lenis-scroll
    >
      <template v-if="isLoading">
        <NewsSkeleton :count="newsManager.itemsPerPage" />
      </template>

      <template v-else>
        <NewsCard
          v-for="item in paginatedNews"
          :key="item.id"
          :item="item"
          @click="goToDetail"
          @tag-click="handleTagToggle"
        />
        <div v-if="loadError" class="error-message">
          <h3>{{ t('news.list.error.title') }}</h3>
          <p>{{ t('news.list.error.description') }}</p>
        </div>
      </template>
    </div>

    <NewsPagination
      :current-page="currentPage"
      :page-count="pageCount"
      @prev="prevPage"
      @next="nextPage"
      @go="goToPage"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMediaQuery } from '@vueuse/core';
import { useLastViewedCookie } from '@/composables/useLastViewedCookie';
import { useNewsData } from '@/composables/useNewsData';
import { useNewsFilter } from '@/composables/useNewsFilter';
import { useNewsPagination } from '@/composables/useNewsPagination';
import NewsSearch from '@/components/news/NewsSearch.vue';
import NewsCard from '@/components/news/NewsCard.vue';
import NewsPagination from '@/components/news/NewsPagination.vue';
import NewsSkeleton from '@/components/news/NewsSkeleton.vue';
import LayoutToggle from '@/components/news/LayoutToggle.vue';
import type { NewsItem } from '@/types/news';

const { t } = useI18n();
const router = useRouter();
const { setLastViewedNews } = useLastViewedCookie();

// ========== 布局模式 ==========
const STORAGE_KEY = 'news_layout_mode';
const isMobile = useMediaQuery('(max-width: 768px)');

// 默认模式：桌面 list，移动端 grid
const defaultMode = computed(() => (isMobile.value ? 'grid' : 'list'));

// 用户偏好（从 localStorage 读取，若无则用默认）
const layoutMode = ref<'list' | 'grid'>(
  (localStorage.getItem(STORAGE_KEY) as 'list' | 'grid') || defaultMode.value
);

// 监听模式变化，存 localStorage
watch(layoutMode, (newVal) => {
  localStorage.setItem(STORAGE_KEY, newVal);
});

// 封面位置（可由配置控制，这里暂时写死为 'right'，参考 Astro 的 coverPosition）
const coverPosition = ref<'left' | 'right'>('right');

// ========== 数据层 ==========
const { newsManager, isLoading, loadError, initialize, animateCards } = useNewsData();
const newsSectionRef = ref<HTMLElement | null>(null);

// ========== 筛选层 ==========
const { searchQuery, selectedTags, uniqueTags, filterNews, toggleTag, parseTagsFromQuery } =
  useNewsFilter(newsManager);

// ========== 分页层 ==========
const {
  currentPage,
  paginatedNews,
  pageCount,
  prevPage: _prevPage,
  nextPage: _nextPage,
  goToPage: _goToPage,
  refresh,
} = useNewsPagination(newsManager);

const prevPage = () => { _prevPage(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
const nextPage = () => { _nextPage(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
const goToPage = (page: number) => { _goToPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };

// ========== 搜索与标签 ==========
const onSearch = (query: string) => {
  searchQuery.value = query;
  filterNews();
  refresh();
};
const handleTagToggle = (tag: string) => {
  toggleTag(tag);
  refresh();
};

// ========== 跳转详情 ==========
const goToDetail = (item: NewsItem) => {
  setLastViewedNews(item.id, item.title);
  router.push({ name: 'newsdetail', query: { id: item.id.toString() } });
};

// ========== 生命周期 ==========
onMounted(async () => {
  await initialize();
  await nextTick();

  const urlTags = parseTagsFromQuery();
  if (urlTags.length) {
    selectedTags.value = urlTags;
  }
  filterNews();
  refresh();
  await animateCards(newsSectionRef.value);
});

watch(isLoading, async (newVal, oldVal) => {
  if (oldVal && !newVal && !loadError.value) {
    await animateCards(newsSectionRef.value);
  }
});
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
}
</style>