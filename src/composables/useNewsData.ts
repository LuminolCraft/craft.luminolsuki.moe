import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { NewsManager } from '@/utils/news/news-manager';
import gsap from 'gsap';
import { EASINGS, STAGGERS, DURATIONS } from '@/gsap';

export function useNewsData() {
  const newsManager = new NewsManager();
  const isLoading = ref(true);
  const loadError = ref(false);
  const isSyncing = ref(false);

  const initialize = async () => {
    try {
      await newsManager.initializeApp();
    } catch (error) {
      console.error('初始化新闻失败:', error);
      loadError.value = newsManager.loadError;
    } finally {
      isLoading.value = false;
    }
    newsManager.initMarked();
  };

  const forceRefresh = async () => {
    await newsManager.forceRefresh();
    loadError.value = newsManager.loadError;
  };

  const retryDataLoad = async () => {
    await newsManager.retryDataLoad();
    loadError.value = newsManager.loadError;
  };

  // 动画入场
  const animateCards = async (container: HTMLElement | null) => {
    if (!container) return;
    await nextTick();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      gsap.set('.skeleton-card', { autoAlpha: 0 });
      gsap.set('.news-item', { autoAlpha: 1 });
      return;
    }

    const tl = gsap.timeline({
      defaults: { ease: EASINGS.entrance },
    });

    tl.to('.skeleton-card', { autoAlpha: 0, duration: DURATIONS.exit })
      .fromTo(
        '.news-item',
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, stagger: STAGGERS.cards, duration: DURATIONS.entrance },
        '+=0.05'
      );
  };

  onUnmounted(() => {
    newsManager.dispose();
  });

  return {
    newsManager,
    isLoading,
    loadError,
    isSyncing,
    initialize,
    forceRefresh,
    retryDataLoad,
    animateCards,
  };
}