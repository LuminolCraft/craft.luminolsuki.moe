import { computed, ref, watch } from 'vue';
import { NewsManager } from '@/utils/news/news-manager';

export function useNewsPagination(newsManager: NewsManager) {
  const currentPage = ref(0);
  const refreshTrigger = ref(0);

  // 同步 manager 的 page
  watch(
    () => newsManager.currentPage,
    (newPage) => { currentPage.value = newPage; }
  );

  const paginatedNews = computed(() => {
    refreshTrigger.value;
    return newsManager.getPaginatedNews();
  });

  const pageCount = computed(() => {
    refreshTrigger.value;
    return newsManager.getPageCount();
  });

  const prevPage = () => {
    if (currentPage.value > 0) {
      currentPage.value--;
      newsManager.currentPage = currentPage.value;
      refreshTrigger.value++;
    }
  };

  const nextPage = () => {
    if (currentPage.value < pageCount.value - 1) {
      currentPage.value++;
      newsManager.currentPage = currentPage.value;
      refreshTrigger.value++;
    }
  };

  const goToPage = (page: number) => {
    currentPage.value = page;
    newsManager.currentPage = page;
    refreshTrigger.value++;
  };

  // 新增：强制刷新分页数据（不改变页码）
  const refresh = () => {
    refreshTrigger.value++;
  };

  return {
    currentPage,
    refreshTrigger,
    paginatedNews,
    pageCount,
    prevPage,
    nextPage,
    goToPage,
    refresh, // 暴露出去
  };
}