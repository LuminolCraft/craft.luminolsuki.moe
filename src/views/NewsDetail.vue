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

/* Vercel Design System - News Detail Page (保留原有背景色) */

.news-detail-section {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--vercel-space-12, 48px) var(--spacing-4);
}

/* 新闻详情标题 - Vercel Typography */
#news-detail h2 {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: var(--vercel-weight-semibold);
    line-height: var(--vercel-leading-snug);
    letter-spacing: var(--vercel-tracking-tighter);
    color: var(--text-color);
    margin-bottom: var(--vercel-space-4, 16px);
}

/* 新闻日期 - Vercel Caption Style */
.news-date {
    font-size: 14px;
    font-weight: var(--vercel-weight-medium);
    color: var(--text-secondary);
    margin-bottom: var(--vercel-space-3, 12px);
    letter-spacing: var(--vercel-tracking-none);
}

/* 新闻标签 - Vercel Badge Style */
.news-tags {
    display: flex;
    gap: var(--vercel-space-2, 8px);
    flex-wrap: wrap;
    margin-bottom: var(--vercel-space-6, 24px);
}

.tag {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: var(--vercel-radius-pill, 9999px);
    background: var(--glass-bg, rgba(158, 148, 216, 0.12));
    color: var(--primary-color, #a78bfa);
    font-size: 13px;
    font-weight: var(--vercel-weight-medium, 500);
    letter-spacing: 0.02em;
    transition: all var(--vercel-duration-fast, 150ms) var(--vercel-ease-out, ease-out);
}

.tag:hover {
    background: var(--primary-color, #a78bfa);
    color: var(--white, #ffffff);
}

/* 新闻图片 */
.news-img {
    width: 100%;
    height: 400px;
    border-radius: var(--vercel-radius-image);
    background-size: cover;
    background-position: center;
    margin-bottom: var(--vercel-space-8, 32px);
    box-shadow: var(--vercel-shadow-card);
}

/* 新闻内容 - Vercel Typography（普通容器，不做滚动） */
.news-content {
    font-size: 1.125rem;
    font-weight: var(--vercel-weight-normal);
    line-height: var(--vercel-leading-relaxed);
    color: var(--text-color);
    margin-bottom: var(--vercel-space-10, 40px);
}

.news-content :is(h1, h2, h3, h4, h5, h6) {
    font-weight: var(--vercel-weight-semibold);
    line-height: var(--vercel-leading-snug);
    letter-spacing: var(--vercel-tracking-tight);
    color: var(--text-color);
    margin-top: var(--vercel-space-8, 32px);
    margin-bottom: var(--vercel-space-4, 16px);
}

.news-content p {
    margin-bottom: var(--vercel-space-4, 16px);
}

.news-content a {
    color: var(--link-color);
    text-decoration: none;
    transition: all var(--vercel-duration-fast) var(--vercel-ease-out);
}

.news-content a:hover {
    color: var(--link-hover-color);
    text-decoration: underline;
}

.news-content code {
    font-family: var(--vercel-mono-family, var(--font-mono));
    font-size: 0.9em;
    background: rgba(158, 148, 216, 0.1);
    padding: 2px 6px;
    border-radius: var(--vercel-radius-micro);
    color: var(--text-color);
}

.news-content pre {
    background: var(--card-bg);
    border-radius: var(--vercel-radius-comfortable);
    padding: var(--vercel-space-5, 20px);
    overflow-x: auto;
    margin: var(--vercel-space-6, 24px) 0;
    box-shadow: var(--vercel-shadow-border);
}

.news-content pre code {
    background: transparent;
    padding: 0;
    border-radius: 0;
}

/* =============================================
   Table 样式 - table 自身作为独立滚动容器
   超出部分隐藏 + 水平/垂直滚动条
   ============================================= */

.news-content > table,
.news-content table {
    /* 核心：table 作为滚动容器 */
    display: block;

    /* 尺寸约束 - 关键！确保不溢出父容器 */
    width: auto;
    max-width: 100% !important;  /* 强制：不超过 .news-content 宽度 */
    max-height: 60vh !important;   /* 最大高度，超出显示垂直滚动条 */

    /* 滚动行为 - 超出内容隐藏，显示滚动条 */
    overflow-x: auto !important;     /* 水平滚动 */
    overflow-y: auto !important;     /* 垂直滚动 */
    -webkit-overflow-scrolling: touch;

    /* Firefox 滚动条样式 */
    scrollbar-width: thin;
    scrollbar-color: var(--primary-color) transparent;
    scrollbar-gutter: stable;

    /* 表格基础样式 */
    border-collapse: collapse;
    margin: var(--vercel-space-6, 24px) 0;
    font-size: 14px;
    box-shadow: var(--vercel-shadow-border);
    border-radius: var(--vercel-radius-comfortable);
}

/* thead 样式 */
.news-content thead {
    background: var(--card-bg);
    display: table-header-group; /* 保持正常表格头组布局 */
}

.news-content thead tr {
    display: table-row;
}

/* tbody 样式 */
.news-content tbody {
    display: table-row-group; /* 保持正常表格体组布局 */
}

.news-content tbody tr {
    display: table-row;
}

/* th/td 单元格样式 */
.news-content th,
.news-content td {
    display: table-cell; /* 保持单元格布局 */
    padding: var(--vercel-space-3, 12px) var(--vercel-space-4, 16px);
    text-align: left;
    border-bottom: 1px solid var(--glass-border);
    color: var(--text-color);

    /* 防止单元格无限撑开表格 */
    max-width: 180px;        /* 限制单列最大宽度 */
    min-width: 70px;         /* 最小宽度 */
    word-wrap: break-word;      /* 长单词换行 */
    overflow-wrap: break-word;  /* 同上 */
    white-space: normal;         /* 允许换行 */
    vertical-align: top;
}

.news-content th {
    font-weight: var(--vercel-weight-semibold);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    background: rgba(158, 148, 216, 0.05);
}

.news-content tbody tr:hover {
    background: rgba(158, 148, 216, 0.08);
}

.news-content tbody tr:last-child td {
    border-bottom: none;
}

/* Webkit 浏览器自定义滚动条样式 - 应用到 table 元素 */
.news-content > table::-webkit-scrollbar,
.news-content table::-webkit-scrollbar {
    width: 8px;   /* 垂直滚动条宽度 */
    height: 8px;  /* 水平滚动条高度 */
}

.news-content > table::-webkit-scrollbar-track,
.news-content table::-webkit-scrollbar-track {
    background: transparent;
    border-radius: var(--vercel-radius-pill);
}

.news-content > table::-webkit-scrollbar-thumb,
.news-content table::-webkit-scrollbar-thumb {
    background: var(--primary-color);
    border-radius: var(--vercel-radius-pill);
    opacity: 0.6;
}

.news-content > table::-webkit-scrollbar-thumb:hover,
.news-content table::-webkit-scrollbar-thumb:hover {
    background: var(--button-hover);
    opacity: 1;
}

.news-content > table::-webkit-scrollbar-corner,
.news-content table::-webkit-scrollbar-corner {
    background: transparent;
}

/* Firefox 滚动条样式已在上面通过 scrollbar-width 和 scrollbar-color 设置 */

.news-content blockquote {
    border-left: 3px solid var(--primary-color);
    padding-left: var(--vercel-space-5, 20px);
    margin: var(--vercel-space-6, 24px) 0;
    color: var(--text-secondary);
    font-style: italic;
}

.news-content ul,
.news-content ol {
    padding-left: var(--vercel-space-6, 24px);
    margin-bottom: var(--vercel-space-4, 16px);
}

.news-content li {
    margin-bottom: var(--vercel-space-2, 8px);
    line-height: var(--vercel-leading-relaxed);
}

/* 图片画廊 - Vercel Grid Style */
.gallery-section {
    margin-top: var(--vercel-space-10, 40px);
    padding-top: var(--vercel-space-8, 32px);
    border-top: 1px solid var(--glass-border);
}

.gallery-section h3 {
    font-size: 1.5rem;
    font-weight: var(--vercel-weight-semibold);
    line-height: var(--vercel-leading-normal);
    letter-spacing: var(--vercel-tracking-normal);
    color: var(--text-color);
    margin-bottom: var(--vercel-space-6, 24px);
}

.gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: var(--vercel-space-4, 16px);
}

.gallery-item {
    aspect-ratio: 16 / 9;
    border-radius: var(--vercel-radius-comfortable);
    overflow: hidden;
    cursor: pointer;
    box-shadow: var(--vercel-shadow-border);
    transition: all var(--vercel-duration-fast) var(--vercel-ease-out);
}

.gallery-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--vercel-shadow-hover);
}

.gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--vercel-duration-slow) var(--vercel-ease-out);
}

.gallery-item:hover img {
    transform: scale(1.05);
}

.empty-message {
    text-align: center;
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: var(--vercel-weight-normal);
    padding: var(--vercel-space-6, 24px);
}

/* 返回按钮 - Vercel Button Style */
.back-to-news {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: var(--vercel-radius-standard);
    background: var(--primary-color);
    color: var(--text-primary);
    font-family: var(--vercel-font-family, var(--font-primary));
    font-size: 14px;
    font-weight: var(--vercel-weight-medium);
    text-decoration: none;
    margin-top: var(--vercel-space-8, 32px);
    transition: all var(--vercel-duration-fast) var(--vercel-ease-out);
    box-shadow: var(--vercel-shadow-border);
}

.back-to-news:hover {
    transform: translateY(-1px);
    box-shadow: var(--vercel-shadow-hover);
    background: var(--button-hover);
}

/* 加载和错误状态 - Vercel Card Style */
.loading-message,
.error-message {
    text-align: center;
    padding: var(--vercel-space-10, 40px) var(--vercel-space-5, 20px);
    background: var(--card-bg);
    border-radius: var(--vercel-radius-comfortable);
    box-shadow: var(--vercel-shadow-card);
    max-width: 600px;
    margin: var(--vercel-space-8, 32px) auto;
}

.error-message h3 {
    font-size: 1.25rem;
    font-weight: var(--vercel-weight-semibold);
    color: var(--error-color);
    margin-bottom: var(--vercel-space-3, 12px);
    letter-spacing: var(--vercel-tracking-normal);
}

.error-message p {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: var(--vercel-leading-relaxed);
    margin-bottom: var(--vercel-space-4, 16px);
}

.error-message button,
.error-message .back-to-news {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: var(--vercel-radius-standard);
    background: var(--primary-color);
    color: var(--text-primary);
    font-family: var(--vercel-font-family, var(--font-primary));
    font-size: 14px;
    font-weight: var(--vercel-weight-medium);
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: all var(--vercel-duration-fast) var(--vercel-ease-out);
    box-shadow: var(--vercel-shadow-border);
}

.error-message button:hover,
.error-message .back-to-news:hover {
    transform: translateY(-1px);
    box-shadow: var(--vercel-shadow-hover);
}

/* Lightbox - Vercel Overlay Style */
.lightbox {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(23, 23, 23, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: vercel-fadeIn var(--vercel-duration-fast) var(--vercel-ease-out);
}

.lightbox-image {
    max-width: 90%;
    max-height: 90vh;
    object-fit: contain;
    border-radius: var(--vercel-radius-image);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
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
    background: var(--card-bg);
    border-radius: var(--vercel-radius-circle);
    color: var(--text-color);
    font-size: 28px;
    cursor: pointer;
    transition: all var(--vercel-duration-fast) var(--vercel-ease-out);
    box-shadow: var(--vercel-shadow-border);
}

.lightbox-close:hover,
.lightbox-prev:hover,
.lightbox-next:hover {
    background: var(--primary-color);
    color: var(--text-primary);
    transform: scale(1.1);
}

.lightbox-close {
    top: 20px;
    right: 20px;
}

.lightbox-prev {
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
}

.lightbox-next {
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
}

.lightbox-prev:hover,
.lightbox-next:hover {
    transform: translateY(-50%) scale(1.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
    .news-detail-section {
        padding: var(--vercel-space-8, 32px) var(--spacing-3);
    }

    #news-detail h2 {
        font-size: 2rem;
        letter-spacing: var(--vercel-tracking-tight);
    }

    .news-img {
        height: 250px;
    }

    .gallery-grid {
        grid-template-columns: 1fr;
    }

    .lightbox-close,
    .lightbox-prev,
    .lightbox-next {
        width: 36px;
        height: 36px;
        font-size: 24px;
    }
}

@media (max-width: 480px) {
    .news-detail-section {
        padding: var(--vercel-space-6, 24px) var(--spacing-2);
    }

    #news-detail h2 {
        font-size: 1.75rem;
    }

    .news-content {
        font-size: 1rem;
    }
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
    renderer.link = ({ href, title, tokens }: any) => {
      const text = this.parseTokens(tokens);
      const isValidHref = typeof href === 'string' && href.trim() !== '';
      const isExternal =
        isValidHref &&
        !href.startsWith('/') &&
        !href.includes(this.SITE_DOMAIN) &&
        !href.startsWith('#');
      const svgIcon = isExternal
        ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 18px; height: 18px; margin-left: 8px; vertical-align: sub;" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>`
        : '';
      if (!isValidHref) return text;
      const titleAttr = title && title !== 'undefined' ? `title="${title}"` : '';
      return `<a href="${href}" ${titleAttr} class="${
        isExternal ? 'external-link' : ''
      }">${text}${svgIcon}</a>`;
    };
    marked.setOptions({ renderer });
    return true;
  }

  parseTokens(tokens: any[]): string {
    if (!tokens || !Array.isArray(tokens)) return '';
    return tokens.map((token: any) => {
      if (token.type === 'text' || token.type === 'codespan') {
        return token.text || '';
      } else if (token.type === 'strong' || token.type === 'em') {
        return this.parseTokens(token.tokens);
      } else if (token.type === 'link') {
        return this.parseTokens(token.tokens);
      } else if (token.type === 'image') {
        return token.text || '';
      }
      return '';
    }).join('');
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
