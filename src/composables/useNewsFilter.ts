import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { LocationQueryRaw } from 'vue-router';
import { NewsManager } from '@/utils/news/news-manager';

export function useNewsFilter(newsManager: NewsManager) {
  const route = useRoute();
  const router = useRouter();

  const searchQuery = ref('');
  const selectedTags = ref<string[]>([]);
  const refreshTrigger = ref(0);

  // 从 URL 解析标签
  const parseTagsFromQuery = (): string[] => {
    const q = route.query.tags;
    if (q == null || q === '') return [];
    const raw = Array.isArray(q) ? q.join(',') : String(q);
    return raw.split(',').map((t) => t.trim()).filter(Boolean);
  };

  // 同步标签到 URL
  const syncTagsToUrl = (tags: string[]) => {
    const nextQuery: LocationQueryRaw = { ...route.query };
    if (tags.length > 0) {
      nextQuery.tags = tags.join(',');
    } else {
      delete nextQuery.tags;
    }
    const current = typeof route.query.tags === 'string'
      ? route.query.tags
      : Array.isArray(route.query.tags)
        ? route.query.tags.filter(Boolean).join(',')
        : '';
    if (current === tags.join(',')) return;
    router.replace({ query: nextQuery });
  };

  const filterNews = () => {
    newsManager.filterNews(selectedTags.value, searchQuery.value);
    refreshTrigger.value++;
    syncTagsToUrl(selectedTags.value);
  };

  const toggleTag = (tag: string) => {
    const set = new Set(selectedTags.value);
    if (set.has(tag)) set.delete(tag);
    else set.add(tag);
    selectedTags.value = Array.from(set);
    filterNews();
  };

  const clearTags = () => {
    selectedTags.value = [];
    filterNews();
  };

  // 监听 URL 变化恢复筛选状态
  watch(
    () => route.query.tags,
    () => {
      const fromUrl = parseTagsFromQuery();
      const same = fromUrl.length === selectedTags.value.length &&
        fromUrl.every((t) => selectedTags.value.includes(t));
      if (same) return;
      selectedTags.value = fromUrl;
      newsManager.filterNews(selectedTags.value, searchQuery.value);
      refreshTrigger.value++;
    }
  );

  // 唯一标签列表
  const uniqueTags = computed(() => {
    refreshTrigger.value;
    return newsManager.getUniqueTags(newsManager.allNewsWithContent);
  });

  return {
    searchQuery,
    selectedTags,
    refreshTrigger,
    uniqueTags,
    filterNews,
    toggleTag,
    clearTags,
    parseTagsFromQuery,
    syncTagsToUrl,
  };
}