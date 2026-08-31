<template>
  <section class="news-section" ref="newsSectionRef">
    <div class="intro">
      <h2>{{ t('news.list.title') }}</h2>
      <p>{{ t('news.list.subtitle') }}</p>
    </div>

    <!-- 搜索栏只放一次 -->
    <NewsSearch
      :selected-tags="selectedTags"
      :all-tags="uniqueTags"
      :search-query="searchQuery"
      @search="onSearch"
      @tag-toggle="handleTagToggle"
    />

    <div id="news-grid" class="news-grid" v-lenis-scroll>
      <template v-if="isLoading">
        <NewsSkeleton :count="newsManager.itemsPerPage" />
      </template>

      <template v-else>
        <!-- 渲染新闻卡片列表 -->
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
import { ref, onMounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useLastViewedCookie } from '@/composables/useLastViewedCookie';
import { useNewsData } from '@/composables/useNewsData';
import { useNewsFilter } from '@/composables/useNewsFilter';
import { useNewsPagination } from '@/composables/useNewsPagination';
import NewsSearch from '@/components/news/NewsSearch.vue';
import NewsCard from '@/components/news/NewsCard.vue';
import NewsPagination from '@/components/news/NewsPagination.vue';
import NewsSkeleton from '@/components/news/NewsSkeleton.vue';
import type { NewsItem } from '@/types/news';

const { t } = useI18n();
const router = useRouter();
const { setLastViewedNews } = useLastViewedCookie();
const newsSectionRef = ref<HTMLElement | null>(null);

// ========== 数据层 ==========
const { newsManager, isLoading, loadError, initialize, animateCards } = useNewsData();

// ========== 筛选层 ==========
const { searchQuery, selectedTags, uniqueTags, filterNews, toggleTag, parseTagsFromQuery } =
  useNewsFilter(newsManager);

// ========== 分页层 ==========
// 解构时使用别名，避免与后续包装函数重名
const {
  currentPage,
  paginatedNews,
  pageCount,
  prevPage: _prevPage,
  nextPage: _nextPage,
  goToPage: _goToPage,
  refresh,
} = useNewsPagination(newsManager);

// 包装分页函数，添加滚动到顶部
const prevPage = () => {
  _prevPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const nextPage = () => {
  _nextPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const goToPage = (page: number) => {
  _goToPage(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

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
    // filterNews 已经在内部调用了
  }
  // 无论如何，都调用一次 filterNews 确保刷新
  filterNews(); // 如果已经调用过，不会重复（filterNews 内部有去重？没有，但可以加个判断）
  // 但 filterNews 会调用 syncTagsToUrl，可能改变 URL，所以需要小心
  // 更好的办法是直接增加 refreshTrigger
  // 但 filterNews 也会做筛选，如果不需要筛选，可以只增加 refreshTrigger
  // 我们可以暴露 refreshTrigger 或提供一个 refreshTags 方法
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
/* ============================================================
   News 页面布局样式
   ============================================================ */
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

.news-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.error-message {
  text-align: center;
  padding: var(--vercel-space-10, 40px);
  background: var(--card-bg);
  border-radius: var(--vercel-radius-comfortable);
  box-shadow: var(--vercel-shadow-card);
}

.error-message h3 {
  font-size: 1.25rem;
  font-weight: var(--vercel-weight-semibold);
  color: var(--text-color);
  margin-bottom: var(--vercel-space-3, 12px);
}

/* ===== 移动端 (<=768px) ===== */
@media (max-width: 768px) {
  .news-section {
    padding: 30px 15px;
  }

  .intro {
    padding: var(--vercel-space-8, 32px) 0;
    margin-bottom: var(--vercel-space-8, 32px);
  }

  .intro h2 {
    font-size: 24px;
  }

  .intro p {
    font-size: 14px;
  }

  .news-grid {
    gap: var(--vercel-space-4, 16px);
    max-height: none;
  }
}
</style>