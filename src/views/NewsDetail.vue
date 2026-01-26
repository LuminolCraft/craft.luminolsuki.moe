<template>
  <div>
    <section class="news-detail-section">
      <div v-if="loading" class="loading-message">{{ t('news.detail.loading') }}</div>
      <div v-else-if="error" class="error-message">
        <h3>{{ t('news.detail.error.title') }}</h3>
        <p>{{ error }}</p>
        <button @click="retryLoad" style="margin-top: 10px; padding: 8px 16px;">{{ t('news.detail.error.retry') }}</button>
      </div>
      <div v-else-if="newsItem" id="news-detail">
        <h2>
          <template v-if="newsItem.pinned">
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 384 512" style="vertical-align: middle; margin-right: 8px;">
              <path d="M32 32C32 14.3 46.3 0 64 0L320 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-29.5 0 10.3 134.1c37.1 21.2 65.8 56.4 78.2 99.7l3.8 13.4c2.8 9.7 .8 20-5.2 28.1S362 352 352 352L32 352c-10 0-19.5-4.7-25.5-12.7s-8-18.4-5.2-28.1L5 297.8c12.4-43.3 41-78.5 78.2-99.7L93.5 64 64 64C46.3 64 32 49.7 32 32zM160 400l64 0 0 112c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-112z" fill="#bfb4f3" stroke="#f2eefc" stroke-width="2.5"/>
            </svg>
            {{ newsItem.title }}
          </template>
          <template v-else>
            {{ newsItem.title }}
          </template>
        </h2>
        <div class="news-date">{{ formatDate(newsItem.date) }}</div>
        <div class="news-tags">
          <span v-for="tag in newsItem.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
        <div
          v-if="hasImage(newsItem)"
          class="news-img"
          :style="hasImage(newsItem) ? { backgroundImage: `url('${cleanImageUrl(newsItem.image)}')` } : {}"
        ></div>
        <div class="news-content" v-html="renderedContent"></div>
        <div v-if="newsItem.additionalImages && newsItem.additionalImages.length > 0" class="gallery-section">
          <h3>{{ t('news.detail.additionalImages') }}</h3>
          <div class="gallery-grid">
            <div
              v-for="(imgUrl, index) in newsItem.additionalImages"
              :key="index"
              class="gallery-item"
              @click="openLightbox(imgUrl, index)"
            >
              <img :src="imgUrl" :alt="t('news.detail.additionalImages') + ' ' + (index + 1)" @error="handleImageError" loading="lazy" />
            </div>
          </div>
        </div>
        <div v-else class="gallery-section">
          <h3>{{ t('news.detail.additionalImages') }}</h3>
          <div class="gallery-grid">
            <p class="empty-message">{{ t('news.detail.noImages') }}</p>
          </div>
        </div>
      </div>
      <div v-else class="error-message">
        <h3>{{ t('news.detail.error.title') }}</h3>
        <p>{{ t('news.detail.error.notFound') }}</p>
        <router-link to="/News" class="back-to-news">{{ t('news.detail.backToList') }}</router-link>
      </div>
      <router-link v-if="newsItem" to="/News" class="back-to-news">{{ t('news.detail.backToList') }}</router-link>
    </section>

    <!-- Lightbox -->
    <div v-if="lightboxVisible" class="lightbox" @click="closeLightbox">
      <span class="lightbox-close" @click.stop="closeLightbox">×</span>
      <span v-if="hasPreviousImage" class="lightbox-prev" @click.stop="prevImage">‹</span>
      <span v-if="hasNextImage" class="lightbox-next" @click.stop="nextImage">›</span>
      <img class="lightbox-image" :src="currentLightboxImage" alt="Lightbox image" @error="handleLightboxImageError" />
    </div>

  </div>
</template>

<style scoped>
@import '../styles/desktop/news-detail-styles.css';
@import '../styles/mobile/news-detail-mobile.css';

.loading-message,
.error-message {
  text-align: center;
  padding: 40px 20px;
}

.error-message h3 {
  color: #ff6b6b;
  margin-bottom: 10px;
}

.back-to-news {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 20px;
  background-color: var(--primary-color, #6366f1);
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.back-to-news:hover {
  background-color: var(--primary-hover-color, #4f46e5);
}
</style>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { marked } from 'marked';
import Navbar from '../components/Navbar.vue';
import Footer from '../components/Footer.vue';

// 类型定义
interface NewsItem {
  id: number;
  title: string;
  content: string;
  markdownContent?: string;
  date: string;
  tags: string[];
  image?: string;
  additionalImages?: string[];
  pinned?: boolean;
}

// 复用 NewsManager 的核心逻辑
class NewsDetailManager {
  allNewsWithContent: NewsItem[] = [];
  NEWS_STORAGE_KEY = 'session_news_data';
  CACHE_DURATION = 2 * 60 * 60 * 1000; // 2小时
  GITHUB_RAW_BASE = 'https://luminolcraft-news.pages.dev/';
  GITEJSON_URL = 'https://luminolcraft-news.pages.dev/news.json';
  SITE_DOMAIN = window.location.hostname || '';

  debugLog(...args: any[]) {
    if ((window as any).debugMode) {
      console.log(...args);
    }
  }

  initFromStorage() {
    const stored = sessionStorage.getItem(this.NEWS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: NewsItem[] = JSON.parse(stored);
        if (this.validateNewsData(parsed)) {
          this.allNewsWithContent = parsed;
          this.debugLog('从sessionStorage恢复新闻数据');
        } else {
          sessionStorage.removeItem(this.NEWS_STORAGE_KEY);
        }
      } catch (e) {
        console.error('解析sessionStorage数据失败', e);
        sessionStorage.removeItem(this.NEWS_STORAGE_KEY);
      }
    }
  }

  validateNewsData(data: any): data is NewsItem[] {
    if (!Array.isArray(data)) return false;
    if (data.length > 1000) return false;
    for (const item of data) {
      if (!item || typeof item !== 'object') return false;
      if (!item.id || !item.title || !item.content) return false;
    }
    return true;
  }

  convertGitHubUrlToCloudflare(contentUrl: string): string | null {
    if (!contentUrl.startsWith('http')) {
      return `${this.GITHUB_RAW_BASE}${contentUrl}`;
    }
    if (contentUrl.includes('raw.githubusercontent.com/LuminolCraft/news.json')) {
      const path = contentUrl.split('raw.githubusercontent.com/LuminolCraft/news.json')[1];
      if (!path) {
        return contentUrl;
      }
      const cleanPath = path.replace('/refs/heads/main', '');
      return `${this.GITHUB_RAW_BASE}${cleanPath}`;
    }
    if (contentUrl.includes('raw.githubusercontent.com/LuminolMC/Luminol')) {
      this.debugLog('检测到LuminolMC仓库URL，跳过加载:', contentUrl);
      return null;
    }
    return contentUrl;
  }

  async preloadMarkdownContent(newsData: NewsItem[]) {
    const now = Date.now();
    const cached = localStorage.getItem('news-full-cache');
    const timestamp = localStorage.getItem('news-full-cache-timestamp');
    if (cached && timestamp && now - parseInt(timestamp) < this.CACHE_DURATION) {
      this.allNewsWithContent = JSON.parse(cached);
      this.debugLog('🗄️ 使用缓存的完整新闻数据');
      sessionStorage.setItem(this.NEWS_STORAGE_KEY, JSON.stringify(this.allNewsWithContent));
      return;
    }
    for (const item of newsData) {
      const fullContentUrl = this.convertGitHubUrlToCloudflare(item.content);
      if (fullContentUrl === null) {
        item.markdownContent = '内容不可用';
        continue;
      }
      try {
        const response = await fetch(fullContentUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`无法加载: ${fullContentUrl} (状态: ${response.status})`);
        const markdownContent = await response.text();
        item.markdownContent = markdownContent || '暂无内容';
        item.additionalImages = item.additionalImages?.filter((url) => url && url.trim() !== '') || [];
      } catch (error) {
        console.error(`❌ 预加载新闻 ${item.id} 失败:`, error);
        item.markdownContent = '内容加载失败';
      }
    }
    this.allNewsWithContent = newsData;
    localStorage.setItem('news-full-cache', JSON.stringify(this.allNewsWithContent));
    localStorage.setItem('news-full-cache-timestamp', now.toString());
    sessionStorage.setItem(this.NEWS_STORAGE_KEY, JSON.stringify(this.allNewsWithContent));
  }

  async safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json, text/plain, */*',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw error;
    }
  }

  async initializeApp() {
    try {
      this.debugLog('📡 正在加载新闻数据...');
      const response = await this.safeFetch(this.GITEJSON_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`无法加载 news.json: ${response.status} - ${response.statusText}`);
      }
      const data: NewsItem[] = await response.json();
      if (!this.validateNewsData(data)) {
        throw new Error('数据验证失败，可能存在安全风险');
      }
      this.debugLog('✅ news.json 加载成功');
      await this.preloadMarkdownContent(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('初始化加载 news.json 失败:', errorMessage);
      throw error;
    }
  }

  getNewsById(id: number): NewsItem | undefined {
    return this.allNewsWithContent.find((item) => item.id === id);
  }

  initMarked() {
    if (typeof marked === 'undefined') {
      console.warn('marked 库未加载');
      return false;
    }
    const renderer = new (marked.Renderer as any)();
    renderer.link = (href: string, title: string, text: string) => {
      const isValidHref = typeof href === 'string' && href.trim() !== '';
      const isExternal =
        isValidHref &&
        !href.startsWith('/') &&
        !href.includes(this.SITE_DOMAIN) &&
        !href.startsWith('#');
      const svgIcon = isExternal
        ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>`
        : '';
      if (!isValidHref) return text;
      return `<a href="${href}" ${title ? `title="${title}"` : ''} class="${
        isExternal ? 'external-link' : ''
      }">${text}${svgIcon}</a>`;
    };
    marked.setOptions({ renderer });
    return true;
  }
}

export default defineComponent({
  name: 'NewsDetail',
  components: {
    Navbar,
    Footer,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { t, locale } = useI18n();
    const newsManager = new NewsDetailManager();
    const loading = ref(true);
    const error = ref<string | null>(null);
    const newsItem = ref<NewsItem | null>(null);
    const lightboxVisible = ref(false);
    const currentLightboxImage = ref('');
    const currentLightboxIndex = ref(0);

    const newsId = computed(() => {
      const id = route.query.id;
      if (!id) return null;
      const idStr = Array.isArray(id) ? id[0] : id;
      if (!idStr) return null;
      const parsed = parseInt(idStr);
      return isNaN(parsed) ? null : parsed;
    });

    const renderedContent = computed(() => {
      if (!newsItem.value?.markdownContent) return '暂无内容';
      if (typeof marked !== 'undefined') {
        return marked.parse(newsItem.value.markdownContent);
      }
      return newsItem.value.markdownContent;
    });

    const hasPreviousImage = computed(() => {
      if (!newsItem.value?.additionalImages) return false;
      return currentLightboxIndex.value > 0;
    });

    const hasNextImage = computed(() => {
      if (!newsItem.value?.additionalImages) return false;
      return currentLightboxIndex.value < newsItem.value.additionalImages!.length - 1;
    });

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString(locale.value);
    };

    const hasImage = (item: NewsItem) => {
      return (
        item.image &&
        item.image.trim() !== '' &&
        item.image !== '""' &&
        cleanImageUrl(item.image).match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)
      );
    };

    const cleanImageUrl = (url: string | undefined) => {
      return url ? url.replace(/['"]/g, '') : '';
    };

    const handleImageError = (event: Event) => {
      const img = event.target as HTMLImageElement;
      img.src = 'https://via.placeholder.com/200x150/9e94d8/ffffff?text=附加图片不可用';
    };

    const handleLightboxImageError = (event: Event) => {
      const img = event.target as HTMLImageElement;
      img.src = 'https://via.placeholder.com/300x200/9e94d8/ffffff?text=图片不可用';
    };

    const openLightbox = (imgUrl: string, index: number) => {
      currentLightboxImage.value = imgUrl;
      currentLightboxIndex.value = index;
      lightboxVisible.value = true;
      document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
      lightboxVisible.value = false;
      document.body.style.overflow = '';
    };

    const prevImage = () => {
      if (!newsItem.value?.additionalImages || !hasPreviousImage.value) return;
      currentLightboxIndex.value--;
      const images = newsItem.value.additionalImages;
      const imageUrl = images?.[currentLightboxIndex.value];
      if (imageUrl && typeof imageUrl === 'string') {
        currentLightboxImage.value = imageUrl;
      }
    };

    const nextImage = () => {
      if (!newsItem.value?.additionalImages || !hasNextImage.value) return;
      currentLightboxIndex.value++;
      const images = newsItem.value.additionalImages;
      const imageUrl = images?.[currentLightboxIndex.value];
      if (imageUrl && typeof imageUrl === 'string') {
        currentLightboxImage.value = imageUrl;
      }
    };

    const retryLoad = async () => {
      error.value = null;
      loading.value = true;
      await loadNews();
    };

    const loadNews = async () => {
      try {
        loading.value = true;
        error.value = null;
        newsManager.initFromStorage();
        if (newsManager.allNewsWithContent.length === 0) {
          await newsManager.initializeApp();
        }
        const id = newsId.value;
        if (!id) {
          error.value = t('news.detail.error.invalidId');
          loading.value = false;
          return;
        }
        const item = newsManager.getNewsById(id);
        if (!item) {
          error.value = t('news.detail.error.notFound');
          loading.value = false;
          return;
        }
        newsItem.value = item;
        // 设置页面标题
        document.title = `${item.title} - LuminolCraft`;
        // 初始化 marked
        newsManager.initMarked();
        // 初始化代码高亮
        await nextTick();
        initCodeHighlight();
        loading.value = false;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        error.value = `加载失败: ${errorMessage}`;
        loading.value = false;
      }
    };

    const initCodeHighlight = () => {
      // 等待 highlight.js 加载
      if (typeof (window as any).hljs !== 'undefined') {
        setTimeout(() => {
          (window as any).hljs.highlightAll();
        }, 100);
      } else {
        // 如果 highlight.js 未加载，尝试加载
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
        script.onload = () => {
          // 加载语言支持
          const languages = ['gradle', 'bash', 'shell', 'yaml', 'json', 'xml', 'javascript', 'java', 'python', 'css', 'sql'];
          languages.forEach((lang) => {
            const langScript = document.createElement('script');
            langScript.src = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/${lang}.min.js`;
            document.head.appendChild(langScript);
          });
          setTimeout(() => {
            (window as any).hljs.highlightAll();
          }, 500);
        };
        document.head.appendChild(script);
        // 加载样式
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
        document.head.appendChild(link);
      }
    };

    // 监听路由变化
    watch(
      () => route.query.id,
      async () => {
        await loadNews();
      }
    );

    // 键盘事件处理
    const handleKeydown = (event: KeyboardEvent) => {
      if (!lightboxVisible.value) return;
      if (event.key === 'Escape') {
        closeLightbox();
      } else if (event.key === 'ArrowLeft' && hasPreviousImage.value) {
        prevImage();
      } else if (event.key === 'ArrowRight' && hasNextImage.value) {
        nextImage();
      }
    };

    onMounted(async () => {
      await loadNews();
      document.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    });

    return {
      t,
      loading,
      error,
      newsItem,
      renderedContent,
      lightboxVisible,
      currentLightboxImage,
      hasPreviousImage,
      hasNextImage,
      formatDate,
      hasImage,
      cleanImageUrl,
      handleImageError,
      handleLightboxImageError,
      openLightbox,
      closeLightbox,
      prevImage,
      nextImage,
      retryLoad,
    };
  },
});
</script>
