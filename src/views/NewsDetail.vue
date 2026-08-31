<template>
  <div class="news-detail-page">
    <!-- 阅读进度条 -->
    <div class="reading-progress">
      <span ref="progressBarRef" class="reading-progress-bar"></span>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-message">{{ t('news.detail.loading') }}</div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-message">
      <h3>{{ t('news.detail.error.title') }}</h3>
      <p>{{ error }}</p>
      <button @click="retryLoad" class="retry-btn">{{ t('news.detail.error.retry') }}</button>
    </div>

    <!-- 主内容区：文章 + 侧边 TOC -->
    <div v-else-if="newsItem" class="news-detail-layout">
      <!-- 文章主体 -->
      <article ref="articleRef" id="news-detail" class="news-article">
        <!-- 标题 -->
        <h2 class="article-title">
          <template v-if="newsItem.pinned">
            <svg class="pinned-icon" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 384 512">
              <path d="M32 32C32 14.3 46.3 0 64 0L320 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-29.5 0 10.3 134.1c37.1 21.2 65.8 56.4 78.2 99.7l3.8 13.4c2.8 9.7 .8 20-5.2 28.1S362 352 352 352L32 352c-10 0-19.5-4.7-25.5-12.7s-8-18.4-5.2-28.1L5 297.8c12.4-43.3 41-78.5 78.2-99.7L93.5 64 64 64C46.3 64 32 49.7 32 32zM160 400l64 0 0 112c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-112z" fill="#bfb4f3" stroke="#f2eefc" stroke-width="2.5"/>
            </svg>
          </template>
          {{ newsItem.title }}
        </h2>

        <!-- 元信息：日期 + 标签 -->
        <div class="article-meta">
          <span class="article-date">{{ formatDate(newsItem.date, locale) }}</span>
          <div class="article-tags">
            <span
              v-for="tag in newsItem.tags"
              :key="tag"
              class="tag"
              role="button"
              tabindex="0"
              @click="goToTag(tag)"
              @keydown.enter="goToTag(tag)"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- 封面图 -->
        <div
          v-if="hasImage(newsItem)"
          class="article-cover"
          :style="{ backgroundImage: `url('${cleanImageUrl(newsItem.image)}')` }"
        ></div>

        <!-- 文章正文（unified 渲染） -->
        <div class="article-content markdown-body" v-html="renderedHtml"></div>

        <!-- 附加图片画廊 -->
        <div v-if="newsItem.additionalImages && newsItem.additionalImages.length > 0" class="gallery-section">
          <h3 class="gallery-title">{{ t('news.detail.additionalImages') }}</h3>
          <div class="gallery-grid">
            <div
              v-for="(imgUrl, index) in newsItem.additionalImages"
              :key="index"
              class="gallery-item"
              @click="lightbox.open(index, $event)"
            >
              <img :src="imgUrl" :alt="t('news.detail.additionalImages') + ' ' + (index + 1)" @error="handleImageError" loading="lazy" />
            </div>
          </div>
        </div>

        <!-- 返回按钮 -->
        <router-link to="/News" class="back-to-news">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          {{ t('news.detail.backToList') }}
        </router-link>
      </article>

      <!-- 侧边栏：文章目录 -->
      <aside class="news-sidebar">
        <SidebarToc
          :toc-items="tocItems"
          :content-container="articleRef"
          :title="t('news.detail.tocTitle')"
          :scroll-offset="120"
        />
      </aside>
    </div>

    <!-- 未找到 -->
    <div v-else class="error-message">
      <h3>{{ t('news.detail.error.title') }}</h3>
      <p>{{ t('news.detail.error.notFound') }}</p>
      <router-link to="/News" class="back-to-news">{{ t('news.detail.backToList') }}</router-link>
    </div>

    <!-- Lightbox  🔧 修改点1：增加安全条件 -->
    <div v-if="lightbox.visible && newsItem?.additionalImages?.length" class="lightbox" @click="lightbox.close">
      <span class="lightbox-close" @click.stop="lightbox.close">×</span>
      <span v-if="lightbox.hasPrevious" class="lightbox-prev" @click.stop="lightbox.prev">‹</span>
      <span v-if="lightbox.hasNext" class="lightbox-next" @click.stop="lightbox.next">›</span>
      <img
        ref="lightbox.lightboxImageRef"
        class="lightbox-image"
        data-flip-id="news-lightbox-img"
        :src="lightbox.currentImage.value || ''"
        @error="handleLightboxImageError"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import SidebarToc from '@/components/SidebarToc.vue';
import { useNewsDetail } from '@/composables/useNewsDetail';
import { useLightbox } from '@/composables/useLightbox';
import { useReadingProgress } from '@/composables/useReadingProgress';
import { useArticleAnimations } from '@/composables/useArticleAnimations';
import { formatDate, hasImage, cleanImageUrl, handleImageError } from '@/utils/news-helpers';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();

// 1. 数据加载
const newsId = computed(() => {
  const id = route.query.id;
  if (!id) return null;
  const idStr = Array.isArray(id) ? id[0] : id;
  if (!idStr) return null;
  const parsed = parseInt(idStr, 10);
  return isNaN(parsed) ? null : parsed;
});

const {
  loading,
  error,
  newsItem,
  renderedHtml,
  tocItems,
  loadNews,
  retryLoad: retry
} = useNewsDetail();

// 2. 文章元素引用
const articleRef = ref<HTMLElement | null>(null);
const progressBarRef = ref<HTMLElement | null>(null);
// 🔧 修改点2：删除多余的 lightboxImageRef
// const lightboxImageRef = ref<HTMLImageElement | null>(null);

// 3. 阅读进度条
useReadingProgress(articleRef, progressBarRef, { useScrollTrigger: true });

// 4. 入场动画
const { initAnimations } = useArticleAnimations(articleRef);
watch(
  [loading, articleRef],
  ([isLoading, el]) => {
    if (!isLoading && el) {
      nextTick(() => initAnimations());
    }
  },
  { immediate: true }
);

// 5. Lightbox
const additionalImages = computed(() => newsItem.value?.additionalImages || []);
const lightbox = useLightbox(additionalImages);

// Lightbox 图片错误处理器
const handleLightboxImageError = (event: Event) => {
  handleImageError(event, 'https://via.placeholder.com/300x200/9e94d8/ffffff?text=图片不可用');
};

// 6. 工具函数
const goToTag = (tag: string) => {
  router.push({ name: 'News', query: { tags: tag } });
};

const retryLoad = () => {
  if (newsId.value !== null) retry(newsId.value);
};

// 7. 加载数据
onMounted(() => {
  if (newsId.value !== null) loadNews(newsId.value);
});

watch(
  () => route.query.id,
  async (newId) => {
    if (newId) {
      const idStr = Array.isArray(newId) ? newId[0] : newId;
      if (idStr) {
        const id = parseInt(idStr, 10);
        if (!isNaN(id)) await loadNews(id);
      }
    }
  }
);
</script>

<style scoped>
/* ========== 页面布局 ========== */
.news-detail-page {
  min-height: 100vh;
  padding-top: 80px;
}

.news-detail-layout {
  display: flex;
  gap: 48px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 32px;
}

/* ========== 文章主体 ========== */
.news-article {
  flex: 1;
  min-width: 0;
  max-width: 820px;
}

/* 标题 */
.article-title {
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text-color, #171717);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

html[data-theme='dark'] .article-title {
  color: var(--text-color, #f2eefc);
}

.pinned-icon {
  flex-shrink: 0;
}

/* 元信息 */
.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--glass-border, rgba(158, 148, 216, 0.3));
}

.article-date {
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-secondary, rgba(60, 60, 60, 0.66));
}

.article-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: var(--radius-pill, 9999px);
  background: var(--glass-bg, rgba(158, 148, 216, 0.12));
  color: var(--primary-color, #a78bfa);
  font-size: 0.8125rem;
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag:hover {
  background: var(--primary-color, #a78bfa);
  color: #fff;
  transform: translateY(-1px);
}

/* 封面图 */
.article-cover {
  width: 100%;
  height: 380px;
  border-radius: var(--radius-image, 12px);
  background-size: cover;
  background-position: center;
  margin-bottom: 32px;
  box-shadow: var(--shadow-card, 0 4px 12px rgba(0, 0, 0, 0.1));
}

/* 正文内容 */
.article-content {
  font-size: 1.0625rem;
  line-height: 1.75;
  color: var(--text-color, #171717);
  margin-bottom: 40px;
}

html[data-theme='dark'] .article-content {
  color: var(--text-color, #f2eefc);
}

/* ========== 侧边栏 ========== */
.news-sidebar {
  flex-shrink: 0;
  width: 280px;
  padding-top: 20px;
}

/* ========== 画廊 ========== */
.gallery-section {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--glass-border, rgba(158, 148, 216, 0.3));
}

.gallery-title {
  font-size: 1.375rem;
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-color, #171717);
  margin-bottom: 20px;
}

html[data-theme='dark'] .gallery-title {
  color: var(--text-color, #f2eefc);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.gallery-item {
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-comfortable, 8px);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-border, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px);
  transition: all 0.3s ease;
}

.gallery-item:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover, 0 8px 24px rgba(0, 0, 0, 0.15));
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.gallery-item:hover img {
  transform: scale(1.06);
}

/* ========== 返回按钮 ========== */
.back-to-news {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-standard, 6px);
  background: var(--primary-color, #a78bfa);
  color: #fff;
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium, 500);
  text-decoration: none;
  margin-top: 32px;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-border, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px);
}

.back-to-news:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover, 0 6px 20px rgba(0, 0, 0, 0.15));
  background: var(--button-hover, #c4b5fd);
  color: #fff;
  text-decoration: none;
}

/* ========== 加载/错误状态 ========== */
.loading-message,
.error-message {
  text-align: center;
  padding: 60px 24px;
  background: var(--card-bg, rgba(255, 255, 255, 0.8));
  border-radius: var(--radius-comfortable, 8px);
  box-shadow: var(--shadow-card, 0 4px 12px rgba(0, 0, 0, 0.1));
  max-width: 600px;
  margin: 80px auto;
}

.error-message h3 {
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold, 600);
  color: var(--error-color, #dc3545);
  margin-bottom: 12px;
}

.error-message p {
  font-size: 0.875rem;
  color: var(--text-secondary, rgba(60, 60, 60, 0.66));
  margin-bottom: 20px;
}

.retry-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: var(--radius-standard, 6px);
  background: var(--primary-color, #a78bfa);
  color: #fff;
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium, 500);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: var(--button-hover, #c4b5fd);
  transform: translateY(-1px);
}

/* ========== Lightbox ========== */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 15, 20, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-image {
  max-width: 90%;
  max-height: 88vh;
  object-fit: contain;
  border-radius: var(--radius-image, 12px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
}

.lightbox-close,
.lightbox-prev,
.lightbox-next {
  position: absolute;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg, rgba(255, 255, 255, 0.9));
  border-radius: 50%;
  color: var(--text-color, #171717);
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.lightbox-close:hover,
.lightbox-prev:hover,
.lightbox-next:hover {
  background: var(--primary-color, #a78bfa);
  color: #fff;
  transform: scale(1.1);
}

.lightbox-close {
  top: 24px;
  right: 24px;
}

.lightbox-prev {
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
}

.lightbox-next {
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
}

.lightbox-prev:hover,
.lightbox-next:hover {
  transform: translateY(-50%) scale(1.1);
}

/* ========== 阅读进度条 ========== */
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.05);
}

html[data-theme='dark'] .reading-progress {
  background: rgba(255, 255, 255, 0.05);
}

.reading-progress-bar {
  display: block;
  height: 100%;
  width: 100%;
  background: var(--primary-gradient, linear-gradient(135deg, #9e94d8 0%, #b6ade6 100%));
  transform-origin: left center;
  will-change: transform;
}

/* ========== 响应式 ========== */
@media (max-width: 1200px) {
  .news-sidebar {
    display: none;
  }

  .news-detail-layout {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .news-detail-page {
    padding-top: 70px;
  }

  .news-detail-layout {
    padding: 0 16px;
    gap: 0;
  }

  .article-cover {
    height: 220px;
  }

  .article-content {
    font-size: 1rem;
    line-height: 1.7;
  }

  .gallery-grid {
    grid-template-columns: 1fr;
  }

  .lightbox-close,
  .lightbox-prev,
  .lightbox-next {
    width: 36px;
    height: 36px;
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .news-detail-layout {
    padding: 0 12px;
  }

  .article-title {
    font-size: 1.625rem;
  }

  .article-meta {
    gap: 10px;
  }
}
</style>