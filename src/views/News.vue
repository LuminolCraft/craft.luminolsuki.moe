<template>
      <header>
        <section class="news-section" ref="newsSectionRef">
          <div class="intro">
            <h2>{{ t('news.list.title') }}</h2>
            <p>{{ t('news.list.subtitle') }}</p>
          </div>
          <div class="news-search">
            <input
              type="search"
              id="news-search-input"
              v-model="searchQuery"
              :placeholder="t('news.list.searchPlaceholder')"
              @input="filterNews"
              autocomplete="on"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
            />
            <button id="news-search-btn" @click="filterNews" class="btn">
              <i class="fas fa-search"></i> {{ t('news.list.searchButton') }}
            </button>
          </div>
          <div class="tag-filter">
            <label for="tag-select">{{ t('news.list.tagFilter') }}</label>
            <select id="tag-select" v-model="selectedTag" @change="filterNews">
              <option value="">{{ t('news.list.allTags') }}</option>
              <option v-for="tag in uniqueTags" :key="tag" :value="tag">
                {{ tag }}
              </option>
            </select>
          </div>
          <div id="news-grid" class="news-grid">
            <template v-if="isLoading">
              <div
                v-for="n in itemsPerPage"
                :key="'skeleton-' + n"
                class="skeleton-card"
              >
                <!-- 标题占位 -->
                <div class="skeleton-block skeleton-title"><div class="skeleton-shimmer"></div></div>
                <!-- 元数据占位 -->
                <div class="skeleton-meta">
                  <div class="skeleton-block skeleton-date"><div class="skeleton-shimmer"></div></div>
                  <div class="skeleton-block skeleton-tag"><div class="skeleton-shimmer"></div></div>
                </div>
                <!-- 图片占位 -->
                <div class="skeleton-block skeleton-img"><div class="skeleton-shimmer"></div></div>
                <!-- 内容占位 -->
                <div class="skeleton-content">
                  <div class="skeleton-block skeleton-line"><div class="skeleton-shimmer"></div></div>
                  <div class="skeleton-block skeleton-line"><div class="skeleton-shimmer"></div></div>
                  <div class="skeleton-block skeleton-line"><div class="skeleton-shimmer"></div></div>
                </div>
              </div>
            </template>
            <template v-else>
              <div
                v-for="item in paginatedNews"
                :key="item.id"
                class="news-item"
                :class="{ pinned: !!item.pinned, 'no-image': !hasImage(item) }"
                @click="goToDetail(item)"
              >
                <h3>
                  <template v-if="item.pinned">
                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 384 512" style="vertical-align: middle; margin-right: 8px;">
                      <path d="M32 32C32 14.3 46.3 0 64 0L320 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-29.5 0 10.3 134.1c37.1 21.2 65.8 56.4 78.2 99.7l3.8 13.4c2.8 9.7 .8 20-5.2 28.1S362 352 352 352L32 352c-10 0-19.5-4.7-25.5-12.7s-8-18.4-5.2-28.1L5 297.8c12.4-43.3 41-78.5 78.2-99.7L93.5 64 64 64C46.3 64 32 49.7 32 32zM160 400l64 0 0 112c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-112z" fill="#bfb4f3" stroke="#f2eefc" stroke-width="2.5"/>
                    </svg>
                    {{ item.title }}
                  </template>
                  <template v-else>
                    {{ item.title }}
                  </template>
                </h3>
                <div class="news-meta">
                  <span class="news-date">{{
                    new Date(item.date).toLocaleDateString('zh-CN')
                  }}</span>
                  <div class="news-tags">
                    <span v-for="tag in item.tags" :key="tag" class="tag">{{
                      tag
                    }}</span>
                  </div>
                </div>
                <div
                  v-if="hasImage(item)"
                  class="news-img"
                  :style="hasImage(item) ? { backgroundImage: `url('${cleanImageUrl(item.image)}')` } : {}"
                ></div>
                <div class="news-content" v-html="renderShortContent(item)"></div>
              </div>
              <div v-if="loadError" class="error-message">
                <h3>{{ t('news.list.error.title') }}</h3>
                <p>{{ t('news.list.error.description') }}</p>
              </div>
            </template>
          </div>
          <div id="news-pagination" class="news-pagination" v-if="!isLoading">
            <button
              class="pagination-btn"
              :disabled="currentPage === 0"
              @click="prevPage"
            >
              {{ t('news.list.pagination.prev') }}
            </button>
            <template v-for="(item, index) in displayedPages" :key="index">
              <button
                v-if="typeof item === 'number'"
                class="pagination-btn"
                :class="{ active: currentPage === item - 1 }"
                @click="goToPage(item - 1)"
              >
                {{ item }}
              </button>
              <span v-else class="pagination-ellipsis">{{ item }}</span>
            </template>
            <button
              class="pagination-btn"
              :disabled="currentPage === pageCount - 1"
              @click="nextPage"
            >
              {{ t('news.list.pagination.next') }}
            </button>
          </div>
        </section>
      </header>
      <!-- <LastViewedPopup />
      <CookieConsentBanner />
       -->
    </template>
    
    <style scoped>
    @import '../styles/desktop/news-styles.css';
    @import '../styles/mobile/news-mobile.css';

    /* Vercel Design System - News Page (保留原有背景色) */

    .news-section {
        max-width: var(--vercel-container-max-width);
        margin: 0 auto;
        padding: 0 var(--spacing-4);
    }

    /* 页面标题区域 - Vercel Typography */
    .intro {
        text-align: center;
        margin-bottom: var(--vercel-space-10, 40px);
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

    /* 搜索区域 - Vercel Input Style */
    .news-search {
        display: flex;
        gap: var(--vercel-space-3, 12px);
        margin-bottom: var(--vercel-space-6, 24px);
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }

    .news-search input[type="search"] {
        flex: 1;
        padding: 10px 14px;
        border-radius: var(--vercel-radius-standard);
        font-family: var(--vercel-font-family, var(--font-primary));
        font-size: 14px;
        font-weight: var(--vercel-weight-normal);
        color: var(--text-color);
        background: var(--card-bg);
        box-shadow: var(--vercel-shadow-border);
        transition: all var(--vercel-duration-fast) var(--vercel-ease-out);
        outline: none;
        border: none;
    }

    .news-search input[type="search"]:focus {
        box-shadow: var(--vercel-shadow-border), 0 0 0 3px rgba(147, 197, 253, 0.15);
    }

    .news-search input[type="search"]::placeholder {
        color: var(--text-secondary);
    }

    .news-search button {
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
        line-height: 1.43;
        border: none;
        cursor: pointer;
        transition: all var(--vercel-duration-fast) var(--vercel-ease-out);
        box-shadow: var(--vercel-shadow-border);
    }

    .news-search button:hover {
        transform: translateY(-1px);
        box-shadow: var(--vercel-shadow-hover);
    }

    /* 标签筛选器 */
    .tag-filter {
        text-align: center;
        margin-bottom: var(--vercel-space-8, 32px);
    }

    .tag-filter label {
        display: block;
        font-size: 13px;
        font-weight: var(--vercel-weight-medium);
        color: var(--text-secondary);
        margin-bottom: var(--vercel-space-2, 8px);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .tag-filter select {
        padding: 10px 14px;
        border-radius: var(--vercel-radius-standard);
        font-family: var(--vercel-font-family, var(--font-primary));
        font-size: 14px;
        font-weight: var(--vercel-weight-normal);
        color: var(--text-color);
        background: var(--card-bg);
        box-shadow: var(--vercel-shadow-border);
        border: none;
        cursor: pointer;
        outline: none;
        min-width: 200px;
        transition: all var(--vercel-duration-fast) var(--vercel-ease-out);
    }

    .tag-filter select:focus {
        box-shadow: var(--vercel-shadow-border), 0 0 0 3px rgba(147, 197, 253, 0.15);
    }

    /* 新闻网格 - Vercel Card Grid */
    .news-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: var(--vercel-space-6, 24px);
        margin-top: var(--vercel-space-8, 32px);
    }

    /* 新闻卡片 - Vercel Style */
    .news-item {
        background: var(--card-bg);
        border-radius: var(--vercel-radius-comfortable);
        overflow: hidden;
        box-shadow: var(--vercel-shadow-card);
        transition: all var(--vercel-duration-fast) var(--vercel-ease-out);
        cursor: pointer;
        position: relative;
        border: none;
    }

    .news-item:hover {
        transform: translateY(-2px);
        box-shadow: var(--vercel-shadow-hover);
    }

    .news-item.pinned {
        border-left: 3px solid var(--primary-color);
    }

    .news-item h3 {
        font-size: 1.25rem;
        font-weight: var(--vercel-weight-semibold);
        line-height: var(--vercel-leading-normal);
        letter-spacing: var(--vercel-tracking-normal);
        color: var(--text-color);
        padding: var(--vercel-space-5, 20px) var(--vercel-space-5, 20px) var(--vercel-space-3, 12px);
        margin: 0;
    }

    /* 新闻元数据 - Vercel Caption Style */
    .news-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 var(--vercel-space-5, 20px) var(--vercel-space-4, 16px);
        gap: var(--vercel-space-3, 12px);
    }

    .news-date {
        font-size: 13px;
        font-weight: var(--vercel-weight-medium);
        color: var(--text-secondary);
        letter-spacing: var(--vercel-tracking-none);
    }

    /* 新闻标签 - Vercel Badge Style */
    .news-tags {
        display: flex;
        gap: var(--vercel-space-2, 8px);
        flex-wrap: wrap;
    }

    .tag {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: var(--vercel-radius-pill, 9999px);
        background: var(--glass-bg, rgba(158, 148, 216, 0.12));
        color: var(--primary-color, #a78bfa);
        font-size: 11px;
        font-weight: var(--vercel-weight-medium, 500);
        letter-spacing: 0.02em;
        transition: all var(--vercel-duration-fast, 150ms) var(--vercel-ease-out, ease-out);
    }

    .news-item:hover .tag {
        background: var(--primary-color, #a78bfa);
        color: var(--white, #ffffff);
    }

    /* 新闻图片 */
    .news-img {
        width: 100%;
        height: 180px;
        background-size: cover;
        background-position: center;
        margin-top: var(--vercel-space-3, 12px);
    }

    /* 新闻内容预览 */
    .news-content {
        padding: var(--vercel-space-4, 16px) var(--vercel-space-5, 20px) var(--vercel-space-5, 20px);
        font-size: 14px;
        font-weight: var(--vercel-weight-normal);
        line-height: var(--vercel-leading-relaxed);
        color: var(--text-secondary);
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
    }

    /* 分页组件 - Vercel Style */
    .news-pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--vercel-space-2, 8px);
        margin-top: var(--vercel-space-12, 48px);
        padding: var(--vercel-space-6, 24px) 0;
    }

    .pagination-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
        padding: 0 12px;
        border-radius: var(--vercel-radius-subtle);
        font-family: var(--vercel-font-family, var(--font-primary));
        font-size: 14px;
        font-weight: var(--vercel-weight-medium);
        color: var(--text-color);
        background: transparent;
        border: 1px solid var(--glass-border);
        cursor: pointer;
        transition: all var(--vercel-duration-fast) var(--vercel-ease-out);
    }

    .pagination-btn:hover:not(:disabled) {
        background: var(--card-bg);
        transform: translateY(-1px);
        box-shadow: var(--vercel-shadow-subtle);
    }

    .pagination-btn.active {
        background: var(--primary-color);
        color: var(--text-primary);
        border-color: var(--primary-color);
    }

    .pagination-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .pagination-ellipsis {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        color: var(--text-secondary);
        font-size: 14px;
    }

    /* 错误消息 - Vercel Card Style */
    .error-message {
        grid-column: 1 / -1;
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
        letter-spacing: var(--vercel-tracking-normal);
    }

    .error-message p {
        font-size: 14px;
        color: var(--text-secondary);
        line-height: var(--vercel-leading-relaxed);
    }

    /* 骨架卡片 - Skeleton Card */
    .skeleton-card {
        background: var(--card-bg);
        border-radius: var(--vercel-radius-comfortable);
        box-shadow: var(--vercel-shadow-card);
        position: relative;
        overflow: hidden;
    }

    .skeleton-block {
        background: var(--skeleton-block-bg);
        border-radius: var(--vercel-radius-subtle);
        position: relative;
        overflow: hidden;
    }

    .skeleton-title {
        height: 24px;
        width: 70%;
        margin: 20px 20px 12px;
    }

    .skeleton-meta {
        display: flex;
        gap: 12px;
        padding: 0 20px 16px;
    }

    .skeleton-date {
        height: 14px;
        width: 80px;
    }

    .skeleton-tag {
        height: 18px;
        width: 50px;
        border-radius: 9999px;
    }

    .skeleton-img {
        width: 100%;
        height: 180px;
        margin-top: 12px;
        border-radius: 0;
    }

    .skeleton-content {
        padding: 16px 20px 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .skeleton-line {
        height: 12px;
    }

    .skeleton-line:nth-child(1) {
        width: 100%;
    }

    .skeleton-line:nth-child(2) {
        width: 90%;
    }

    .skeleton-line:nth-child(3) {
        width: 60%;
    }

    .skeleton-shimmer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, var(--skeleton-shimmer-color), transparent);
        transform: translateX(-100%);
        will-change: transform;
    }

    /* 响应式设计 */
    @media (max-width: 768px) {
        .news-section {
            padding: 0 var(--spacing-3);
        }

        .intro {
            padding: var(--vercel-space-8, 32px) 0;
            margin-bottom: var(--vercel-space-8, 32px);
        }

        .news-search {
            flex-direction: column;
        }

        .news-grid {
            grid-template-columns: 1fr;
            gap: var(--vercel-space-4, 16px);
        }

        .news-pagination {
            flex-wrap: wrap;
            gap: var(--vercel-space-2, 6px);
        }
    }

    @media (max-width: 480px) {
        .intro h2 {
            font-size: 1.75rem;
            letter-spacing: var(--vercel-tracking-tight);
        }

        .tag-filter select {
            width: 100%;
            min-width: unset;
        }
    }
    </style>
    
<script lang="ts">
  import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
  computed,
  watch,
  nextTick,
} from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { marked } from 'marked';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLastViewedCookie } from '../composables/useLastViewedCookie';
import LastViewedPopup from '../components/LastViewedPopup.vue';
import CookieConsentBanner from '../components/CookieConsentBanner.vue';
import debounce from 'lodash/debounce';
import { appConfig } from '../config/app-config';
import { EASINGS, STAGGERS, DURATIONS } from '@/gsap';
import { NewsCacheDB, type CachedNewsItem } from '@/utils/news-cache';

  gsap.registerPlugin(ScrollTrigger);

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
  /** 推荐由服务端提供。用于精确识别正文是否发生变化。 */
  updatedAt?: string;
  /** 推荐由服务端提供。优先级高于 updatedAt。 */
  contentVersion?: string;
  /** 推荐用于列表摘要，避免为了搜索/列表而提前拉全文。 */
  summary?: string;
  }

  interface CacheStatus {
  isStale: boolean;
  lastUpdate: number | null;
  backgroundRefreshTimer: number | null;
  userActivityTimer: number | null;
  }

  interface SyncResult {
  changed: boolean;
  added: number;
  updated: number;
  deleted: number;
  unchanged: number;
  }


  class NewsManager {
  currentPage = 0;
  itemsPerPage = window.innerWidth <= 768
    ? appConfig.newsPagination.mobileItemsPerPage
    : appConfig.newsPagination.desktopItemsPerPage;

  filteredNews: NewsItem[] | null = null;
  allNewsWithContent: NewsItem[] = [];

  private readonly db = new NewsCacheDB();
  private readonly NEWS_STORAGE_KEY = 'session_news_data'; // 兼容旧版本的清理入口，不再作为主缓存

  // 正常同步最短间隔。focus / online / visibilitychange 不会无限打请求。
  private readonly MIN_SYNC_INTERVAL = 10 * 60 * 1000;

  // 页面持续打开时的后台检查周期。
  private readonly BACKGROUND_REFRESH_INTERVAL = 10 * 60 * 1000;

  // 首屏冷缓存时最多同时下载多少篇正文。
  private readonly CONTENT_CONCURRENCY = 6;

  // 内容请求超时。
  private readonly REQUEST_TIMEOUT = 15_000;

  // 防止多次同步并发。
  private syncPromise: Promise<SyncResult> | null = null;

  // 仅用于 UI 触发刷新后的防抖。
  cacheStatus: CacheStatus = {
    isStale: true,
    lastUpdate: null,
    backgroundRefreshTimer: null,
    userActivityTimer: null,
  };

  isRetrying = false;
  loadError = false;
  hasUsableCache = false;
  isSyncing = false;

  private readonly GITHUB_RAW_BASE = 'https://luminolcraft-news.pages.dev/';
  private readonly GITEJSON_URL = 'https://luminolcraft-news.pages.dev/news.json';
  private readonly SITE_DOMAIN = window.location.hostname || '';

  // 为了 onUnmounted 能精确移除监听器。
  private boundVisibilityHandler: (() => void) | null = null;
  private boundOnlineHandler: (() => void) | null = null;
  private boundFocusHandler: (() => void) | null = null;
  private boundResizeHandler: (() => void) | null = null;
  private resizeDebounced: ReturnType<typeof debounce> | null = null;
  private initialized = false;

  constructor() {
    this.initMarked();
  }

  debugLog(...args: unknown[]) {
    if ((window as Window & { debugMode?: boolean }).debugMode) {
      console.log('[News]', ...args);
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // 先恢复本地缓存，让首屏不依赖网络。
    await this.restoreCache();
    this.updateCacheStatusFromMeta();
    this.initEventListeners();
    this.setupSmartRefresh();
  }

  private async migrateLegacyCache(): Promise<void> {
    const candidates: unknown[] = [];
    const legacyKeys = ['news-full-cache', this.NEWS_STORAGE_KEY, 'news-cache'];

    for (const key of legacyKeys) {
      try {
        const raw = key === this.NEWS_STORAGE_KEY
          ? sessionStorage.getItem(key)
          : localStorage.getItem(key);

        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) candidates.push(...parsed);
      } catch {
        // 忽略损坏的旧缓存，不能影响正常启动。
      }
    }

    if (candidates.length === 0) return;

    const valid = candidates.filter((item): item is NewsItem => this.validateNewsData([item]));
    if (valid.length === 0) return;

    const deduped = new Map<number, NewsItem>();
    for (const item of valid) {
      deduped.set(item.id, item);
    }

    const now = Date.now();
    const migrated: CachedNewsItem[] = Array.from(deduped.values()).map((item) => {
      const fingerprint = this.getSourceFingerprint(item);
      const contentVersion = this.getContentVersionKey(item);
      return {
        ...item,
        cacheVersion: 1,
        cachedAt: now,
        sourceFingerprint: fingerprint,
        contentFetchedVersion: item.markdownContent ? contentVersion : undefined,
      };
    });

    await this.db.putArticles(migrated);
    await this.db.setMeta('migratedLegacyCacheAt', now);

    for (const key of ['news-full-cache', 'news-full-cache-timestamp', 'news-cache', 'news-cache-timestamp']) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }

    try {
      sessionStorage.removeItem(this.NEWS_STORAGE_KEY);
    } catch {
      // ignore
    }

    this.debugLog(`♻️ 已迁移 ${migrated.length} 篇旧新闻缓存到 IndexedDB`);
  }

  private async updateCacheStatusFromMeta(): Promise<void> {
    try {
      const lastSuccessfulSync = await this.db.getMeta<number>('lastSuccessfulSync');
      this.cacheStatus.lastUpdate = typeof lastSuccessfulSync === 'number'
        ? lastSuccessfulSync
        : null;

      const lastUpdate = this.cacheStatus.lastUpdate;
      this.cacheStatus.isStale = !lastUpdate || Date.now() - lastUpdate >= this.MIN_SYNC_INTERVAL;
    } catch (error) {
      this.debugLog('读取缓存状态失败:', error);
      this.cacheStatus.isStale = true;
    }
  }

  private async restoreCache(): Promise<void> {
    try {
      let cached = await this.db.getAllArticles();

      // 第一次升级到新缓存架构时，尽量把旧 localStorage/sessionStorage 缓存迁移进 IndexedDB，
      // 避免用户因为升级而再次下载所有旧新闻。
      if (cached.length === 0) {
        await this.migrateLegacyCache();
        cached = await this.db.getAllArticles();
      }

      const valid = cached
        .filter((item) => this.validateCachedNewsItem(item))
        .map((item) => this.stripInternalCacheFields(item));

      valid.sort(this.sortNews);
      this.allNewsWithContent = valid;
      this.hasUsableCache = valid.length > 0;

      if (valid.length > 0) {
        this.debugLog(`📦 从 IndexedDB 恢复 ${valid.length} 篇新闻`);
      } else {
        this.debugLog('📦 IndexedDB 暂无新闻缓存');
      }

      // 清掉旧版本 sessionStorage，避免旧架构再次污染状态。
      try {
        sessionStorage.removeItem(this.NEWS_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
    } catch (error) {
      // IndexedDB 故障不能阻止网络加载。
      this.debugLog('IndexedDB 恢复失败，将直接使用网络:', error);
      this.allNewsWithContent = [];
      this.hasUsableCache = false;
    }
  }

  private validateCachedNewsItem(item: unknown): item is CachedNewsItem {
    if (!item || typeof item !== 'object') return false;

    const value = item as Partial<CachedNewsItem>;

    return (
      typeof value.id === 'number' &&
      typeof value.title === 'string' &&
      typeof value.content === 'string' &&
      typeof value.date === 'string' &&
      Array.isArray(value.tags) &&
      typeof value.cachedAt === 'number' &&
      typeof value.sourceFingerprint === 'string' &&
      (value.contentFetchedVersion === undefined || typeof value.contentFetchedVersion === 'string')
    );
  }

  private stripInternalCacheFields(item: CachedNewsItem): NewsItem {
    const {
      cacheVersion: _cacheVersion,
      cachedAt: _cachedAt,
      sourceFingerprint: _sourceFingerprint,
      ...news
    } = item;
    return news;
  }

  private setupSmartRefresh(): void {
    if (this.cacheStatus.backgroundRefreshTimer) {
      window.clearInterval(this.cacheStatus.backgroundRefreshTimer);
    }

    this.cacheStatus.backgroundRefreshTimer = window.setInterval(() => {
      void this.syncIfNeeded('timer');
    }, this.BACKGROUND_REFRESH_INTERVAL);
  }

  private initEventListeners(): void {
    this.boundVisibilityHandler = () => {
      if (!document.hidden) {
        void this.syncIfNeeded('visibility');
      }
    };

    this.boundOnlineHandler = () => {
      void this.syncIfNeeded('online', true);
    };

    this.boundFocusHandler = () => {
      void this.syncIfNeeded('focus');
    };

    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    window.addEventListener('online', this.boundOnlineHandler);
    window.addEventListener('focus', this.boundFocusHandler);

    this.resizeDebounced = debounce(() => {
      this.itemsPerPage = window.innerWidth <= 768
        ? appConfig.newsPagination.mobileItemsPerPage
        : appConfig.newsPagination.desktopItemsPerPage;

      const maxPage = Math.max(0, this.getPageCount() - 1);
      if (this.currentPage > maxPage) {
        this.currentPage = maxPage;
      }
    }, 200);

    this.boundResizeHandler = () => {
      this.resizeDebounced?.();
    };

    window.addEventListener('resize', this.boundResizeHandler, { passive: true });
  }

  dispose(): void {
    if (this.cacheStatus.backgroundRefreshTimer) {
      window.clearInterval(this.cacheStatus.backgroundRefreshTimer);
      this.cacheStatus.backgroundRefreshTimer = null;
    }

    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }

    if (this.boundOnlineHandler) {
      window.removeEventListener('online', this.boundOnlineHandler);
      this.boundOnlineHandler = null;
    }

    if (this.boundFocusHandler) {
      window.removeEventListener('focus', this.boundFocusHandler);
      this.boundFocusHandler = null;
    }

    if (this.boundResizeHandler) {
      window.removeEventListener('resize', this.boundResizeHandler);
      this.boundResizeHandler = null;
    }

    this.resizeDebounced?.cancel?.();
    this.resizeDebounced = null;
  }

  /**
   * 核心：只在达到同步间隔时发起同步。
   * force=true 只跳过本地间隔检查，仍然不会并发同步。
   */
  async syncIfNeeded(reason: string, force = false): Promise<SyncResult | null> {
    const lastUpdate = this.cacheStatus.lastUpdate ?? 0;
    const elapsed = Date.now() - lastUpdate;

    if (!force && elapsed < this.MIN_SYNC_INTERVAL) {
      this.debugLog(`⏭️ ${reason}: ${Math.round((this.MIN_SYNC_INTERVAL - elapsed) / 1000)} 秒后才需要同步`);
      return null;
    }

    return this.syncNews(force, reason);
  }

  /**
   * 真正执行增量同步。
   * 服务器新闻项必须尽量提供 contentVersion 或 updatedAt。
   * 如果两者均不存在，则退化为元数据 fingerprint 比较。
   */
  async syncNews(force = false, reason = 'manual'): Promise<SyncResult> {
    if (this.syncPromise) {
      this.debugLog('♻️ 已经有同步任务在运行，复用当前 Promise');
      return this.syncPromise;
    }

    this.syncPromise = this.performSync(force, reason)
      .finally(() => {
        this.syncPromise = null;
      });

    return this.syncPromise;
  }

  private async performSync(force: boolean, reason: string): Promise<SyncResult> {
    this.isSyncing = true;
    this.loadError = false;

    const result: SyncResult = {
      changed: false,
      added: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
    };

    try {
      this.debugLog(`🔄 开始增量同步 reason=${reason}, force=${force}`);

      // cache:no-cache 允许浏览器复用 HTTP cache，同时向服务器验证资源是否更新。
      // 不使用 no-store，因为那会主动绕过浏览器 HTTP 缓存。
      const response = await this.safeFetch(this.GITEJSON_URL, {
        cache: force ? 'reload' : 'no-cache',
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.status === 304) {
        // 理论上 fetch 通常会由浏览器把 304 合并成 200；保留此分支以防代理层直接返回 304。
        this.cacheStatus.lastUpdate = Date.now();
        this.cacheStatus.isStale = false;
        await this.db.setMeta('lastSuccessfulSync', this.cacheStatus.lastUpdate);
        this.debugLog('✅ Manifest 304 Not Modified');
        return result;
      }

      if (!response.ok) {
        throw new Error(`news.json 请求失败: ${response.status} ${response.statusText}`);
      }

      const remoteData: unknown = await response.json();
      if (!this.validateNewsData(remoteData)) {
        throw new Error('news.json 数据验证失败');
      }

      const cachedItems = await this.db.getAllArticles();
      const cachedMap = new Map<number, CachedNewsItem>(cachedItems.map((item) => [item.id, item]));
      const remoteMap = new Map<number, NewsItem>(remoteData.map((item) => [item.id, item]));

      // 1) 删除服务器已经不存在的新闻
      const deletedIds: number[] = [];
      for (const cached of cachedItems) {
        if (!remoteMap.has(cached.id)) {
          deletedIds.push(cached.id);
        }
      }

      if (deletedIds.length > 0) {
        await this.db.deleteArticles(deletedIds);
        result.deleted = deletedIds.length;
        result.changed = true;
      }

      // 2) 区分“索引/元数据变化”和“正文变化”。
      // 只有正文版本变化时才请求 Markdown；标题、标签、置顶等变化只写入本地数据库。
      const candidates: Array<{
        remote: NewsItem;
        cached?: CachedNewsItem;
        contentNeedsUpdate: boolean;
      }> = [];

      for (const remote of remoteData) {
        const cached = cachedMap.get(remote.id);

        if (!cached) {
          candidates.push({
            remote,
            contentNeedsUpdate: true,
          });
          continue;
        }

        const manifestFingerprint = this.getSourceFingerprint(remote);
        const manifestChanged = manifestFingerprint !== cached.sourceFingerprint;
        const contentVersion = this.getContentVersionKey(remote);
        const contentNeedsUpdate =
          !cached.markdownContent ||
          cached.contentFetchedVersion !== contentVersion;

        if (!manifestChanged && !contentNeedsUpdate) {
          result.unchanged++;
          continue;
        }

        candidates.push({
          remote,
          cached,
          contentNeedsUpdate,
        });
      }

      if (candidates.length > 0) {
        const concurrency = Math.max(1, Math.min(this.CONTENT_CONCURRENCY, candidates.length));
        let cursor = 0;

        const worker = async () => {
          while (true) {
            const index = cursor++;
            if (index >= candidates.length) return;
          
            const candidate = candidates[index];
            if (!candidate) return;
          
            const { remote, cached, contentNeedsUpdate } = candidate;
            const resultItem = await this.updateOneArticle(remote, cached, contentNeedsUpdate);
          
            if (resultItem.updated) {
              result.updated++;
              if (!cached) result.added++;
              result.changed = true;
            }
          
            if (resultItem.article) {
              await this.db.putArticle(resultItem.article);
            }
          }
        };

        await Promise.all(Array.from({ length: concurrency }, () => worker()));
      }

      // 3) 同步成功后再从数据库生成内存快照。
      const freshCache = await this.db.getAllArticles();
      freshCache.sort(this.sortNews);
      this.allNewsWithContent = freshCache.map((item) => this.stripInternalCacheFields(item));
      this.hasUsableCache = this.allNewsWithContent.length > 0;

      // 4) 最后一步才更新“成功时间”，防止中途失败却被认为成功。
      this.cacheStatus.lastUpdate = Date.now();
      this.cacheStatus.isStale = false;
      await this.db.setMeta('lastSuccessfulSync', this.cacheStatus.lastUpdate);

      // 保存 manifest 的 HTTP 元数据，方便排障/诊断；请求本身仍交给浏览器 HTTP cache 管理。
      await this.db.setMeta('manifestETag', response.headers.get('ETag'));
      await this.db.setMeta('manifestLastModified', response.headers.get('Last-Modified'));
      await this.db.setMeta('manifestSyncedAt', this.cacheStatus.lastUpdate);

      this.filteredNews = null;
      this.ensureCurrentPageValid();

      this.debugLog('✅ 增量同步完成:', result);
      return result;
    } catch (error) {
      this.cacheStatus.isStale = true;
      this.loadError = !this.hasUsableCache;

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.debugLog(`❌ 同步失败 (${reason}):`, errorMessage);

      // 网络失败时绝不清掉旧缓存。
      if (!this.hasUsableCache) {
        throw error;
      }

      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  private async updateOneArticle(
    remote: NewsItem,
    cached: CachedNewsItem | undefined,
    contentNeedsUpdate: boolean,
  ): Promise<{ updated: boolean; article: CachedNewsItem | null }> {
    let markdownContent = cached?.markdownContent;
    let contentFetchedVersion = cached?.contentFetchedVersion;
    const sourceFingerprint = this.getSourceFingerprint(remote);
    const contentVersion = this.getContentVersionKey(remote);

    // 只有确定正文版本发生变化时才访问 Markdown。
    if (contentNeedsUpdate) {
      const markdownUrl = this.convertGitHubUrlToCloudflare(remote.content);

      if (!markdownUrl) {
        this.debugLog(`⚠️ 新闻 ${remote.id} content URL 无法转换`);
      } else {
        try {
          const response = await this.safeFetch(markdownUrl, {
            cache: 'no-cache',
            headers: {
              Accept: 'text/markdown,text/plain;q=0.9,*/*;q=0.8',
            },
          });

          if (!response.ok) {
            throw new Error(`Markdown ${response.status} ${response.statusText}`);
          }

          markdownContent = await response.text();
          contentFetchedVersion = contentVersion;
        } catch (error) {
          this.debugLog(`⚠️ 新闻 ${remote.id} 正文拉取失败，保留旧正文，下一次继续重试:`, error);
        }
      }
    }

    const article: CachedNewsItem = {
      ...remote,
      markdownContent,
      cacheVersion: 1,
      cachedAt: Date.now(),
      sourceFingerprint,
      contentFetchedVersion,
    };

    return {
      updated: true,
      article,
    };
  }

  private getContentVersionKey(item: NewsItem): string {
    if (item.contentVersion) return `contentVersion:${item.contentVersion}`;
    if (item.updatedAt) return `updatedAt:${item.updatedAt}`;
    return `contentUrl:${item.content}`;
  }

  /**
   * 注意：没有 contentVersion/updatedAt 时，这个 fingerprint 无法检测“同一个 content URL 的 Markdown 被原地修改”。
   * 因此生产环境强烈建议服务器至少提供 updatedAt，最好提供 contentVersion/hash。
   */
  private getSourceFingerprint(item: NewsItem): string {
    const normalized = {
      id: item.id,
      title: item.title,
      content: item.content,
      date: item.date,
      tags: [...(item.tags || [])],
      image: item.image ?? '',
      additionalImages: [...(item.additionalImages || [])],
      pinned: Boolean(item.pinned),
      updatedAt: item.updatedAt ?? '',
      contentVersion: item.contentVersion ?? '',
      summary: item.summary ?? '',
    };

    return JSON.stringify(normalized);
  }

  /** 强制刷新：不清缓存，只立即验证 manifest。 */
  async forceRefresh(): Promise<SyncResult> {
    this.debugLog('🔄 用户触发强制刷新');
    return this.syncNews(true, 'manual-force');
  }

  /** 重试：不删除任何缓存。 */
  async retryDataLoad(): Promise<void> {
    if (this.isRetrying) return;

    this.isRetrying = true;
    this.loadError = false;

    try {
      await this.syncNews(true, 'retry');
    } catch (error) {
      this.loadError = !this.hasUsableCache;
      this.debugLog('❌ 数据重试失败:', error);
    } finally {
      this.isRetrying = false;
    }
  }

  /** 用户手动清空本地新闻缓存时才调用。正常重试绝对不要调用。 */
  async clearNewsCache(): Promise<void> {
    await this.db.clear();
    this.allNewsWithContent = [];
    this.filteredNews = null;
    this.currentPage = 0;
    this.cacheStatus.lastUpdate = null;
    this.cacheStatus.isStale = true;
    this.hasUsableCache = false;
  }

  validateNewsData(data: unknown): data is NewsItem[] {
    if (!Array.isArray(data)) return false;
    if (data.length > 1000) return false;

    for (const rawItem of data) {
      if (!rawItem || typeof rawItem !== 'object') return false;

      const item = rawItem as Partial<NewsItem>;

      if (
        typeof item.id !== 'number' ||
        !Number.isSafeInteger(item.id) ||
        item.id <= 0 ||
        typeof item.title !== 'string' ||
        item.title.length === 0 ||
        item.title.length > 200 ||
        typeof item.content !== 'string' ||
        item.content.length === 0 ||
        item.content.length > 2000 ||
        typeof item.date !== 'string' ||
        !Array.isArray(item.tags) ||
        item.tags.some((tag) => typeof tag !== 'string')
      ) {
        return false;
      }

      if (typeof item.markdownContent === 'string' && item.markdownContent.length > 100_000) {
        return false;
      }

      if (item.updatedAt !== undefined && typeof item.updatedAt !== 'string') return false;
      if (item.contentVersion !== undefined && typeof item.contentVersion !== 'string') return false;
      if (item.summary !== undefined && typeof item.summary !== 'string') return false;

      if (this.containsXSS(item.title) || this.containsXSS(item.summary ?? '')) {
        return false;
      }
    }

    return true;
  }

  containsXSS(text: string): boolean {
    if (typeof text !== 'string') return false;

    const decodedText = text
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;/gi, "'")
      .replace(/&#x2f;/gi, '/')
      .replace(/&amp;/gi, '&');

    const xssPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /javascript\s*:/gi,
      /vbscript\s*:/gi,
      /data\s*:\s*text\/html/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi,
      /<style[^>]*>[\s\S]*?<\/style>/gi,
      /expression\s*\(/gi,
      /url\s*\(/gi,
      /@import/gi,
      /eval\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
      /document\.write/gi,
      /innerHTML\s*=/gi,
      /outerHTML\s*=/gi,
    ];

    return xssPatterns.some((pattern) => pattern.test(text) || pattern.test(decodedText));
  }

  initMarked() {
    if (typeof marked === 'undefined') {
      console.warn('marked 库未加载');
      return false;
    }

    const renderer = new marked.Renderer();

    renderer.link = ({ href, title, tokens }: any) => {
      const text = this.parseTokens(tokens);
      const isValidHref = typeof href === 'string' && href.trim() !== '';

      if (!isValidHref || !this.isValidUrl(href)) {
        return text;
      }

      const isExternal =
        !href.startsWith('/') &&
        !href.includes(this.SITE_DOMAIN) &&
        !href.startsWith('#');

      const safeTitle = title && title !== 'undefined'
        ? ` title="${this.escapeAttribute(title)}"`
        : '';

      const svgIcon = isExternal
        ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 18px; height: 18px; margin-left: 8px; vertical-align: sub;" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>'
        : '';

      return `<a href="${this.escapeAttribute(href)}"${safeTitle} class="${isExternal ? 'external-link' : ''}" ${isExternal ? 'rel="noopener noreferrer"' : ''}>${text}${svgIcon}</a>`;
    };

    marked.setOptions({ renderer });
    return true;
  }

  parseTokens(tokens: any[]): string {
    if (!Array.isArray(tokens)) return '';

    return tokens.map((token) => {
      if (token?.type === 'text' || token?.type === 'codespan') {
        return token.text || '';
      }
      if (token?.tokens) {
        return this.parseTokens(token.tokens);
      }
      return token?.text || '';
    }).join('');
  }

  private escapeAttribute(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  simpleMarkdownRender(text: string): string {
    if (!text) return '';

    const escapeHtml = (unsafe: string) => unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const html = escapeHtml(text)
      .replace(/^### (.*)$/gim, '<h3>$1</h3>')
      .replace(/^## (.*)$/gim, '<h2>$1</h2>')
      .replace(/^# (.*)$/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  }

  isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;

    try {
      if (url.startsWith('#') || url.startsWith('/')) return true;

      const urlObj = new URL(url);
      if (urlObj.protocol !== 'https:') return false;

      const allowedDomains = new Set([
        'luminolcraft-news.pages.dev',
        'raw.githubusercontent.com',
        'github.com',
        'cdn.jsdelivr.net',
        'cdnjs.cloudflare.com',
        'cdn-font.hyperos.mi.com',
      ]);

      if (!allowedDomains.has(urlObj.hostname)) return false;

      const dangerousPaths = ['../', './', '//', '\\'];
      if (dangerousPaths.some((path) => urlObj.pathname.includes(path))) return false;

      return true;
    } catch {
      return false;
    }
  }

  convertGitHubUrlToCloudflare(contentUrl: string): string | null {
    if (!contentUrl || typeof contentUrl !== 'string') return null;

    if (!contentUrl.startsWith('http')) {
      return `${this.GITHUB_RAW_BASE}${contentUrl.replace(/^\/+/, '')}`;
    }

    if (contentUrl.includes('raw.githubusercontent.com/LuminolCraft/news.json')) {
      const marker = 'raw.githubusercontent.com/LuminolCraft/news.json';
      const path = contentUrl.split(marker)[1];

      if (!path) return contentUrl;

      const cleanPath = path.replace('/refs/heads/main', '').replace(/^\/+/, '');
      return `${this.GITHUB_RAW_BASE}${cleanPath}`;
    }

    if (contentUrl.includes('raw.githubusercontent.com/LuminolMC/Luminol')) {
      this.debugLog('检测到 LuminolMC 仓库 URL，跳过加载:', contentUrl);
      return null;
    }

    return contentUrl;
  }

  async safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: '*/*',
          ...options.headers,
        },
      });

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`请求超时: ${url}`);
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  filterNews(tag: string, query: string): NewsItem[] {
    const normalizedQuery = query.toLowerCase().trim();

    const filtered = this.allNewsWithContent.filter((item) => {
      const matchesTag = !tag || item.tags?.includes(tag);
      const dateStr = item.date ? new Date(item.date).toLocaleDateString('zh-CN') : '';

      const searchableText = [
        item.title,
        item.summary ?? '',
        item.markdownContent ?? '',
        item.tags?.join(' ') ?? '',
        dateStr,
      ].join(' ').toLowerCase();

      return matchesTag && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });

    this.filteredNews = filtered;
    this.currentPage = 0;
    return filtered;
  }

  getUniqueTags(newsData: NewsItem[] = this.allNewsWithContent): string[] {
    const set = new Set<string>();
    for (const item of newsData) {
      for (const tag of item.tags || []) {
        set.add(tag);
      }
    }
    return Array.from(set);
  }

  getPaginatedNews(): NewsItem[] {
    const source = this.filteredNews !== null ? this.filteredNews : this.allNewsWithContent;
    const sorted = [...source].sort(this.sortNews);
    const start = this.currentPage * this.itemsPerPage;
    return sorted.slice(start, start + this.itemsPerPage);
  }

  getPageCount(): number {
    const totalItems = this.filteredNews !== null
      ? this.filteredNews.length
      : this.allNewsWithContent.length;

    return Math.ceil(totalItems / this.itemsPerPage);
  }

  private ensureCurrentPageValid(): void {
    const pageCount = this.getPageCount();
    if (pageCount <= 0) {
      this.currentPage = 0;
      return;
    }
    this.currentPage = Math.min(this.currentPage, pageCount - 1);
  }

  private readonly sortNews = (a: NewsItem, b: NewsItem): number => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  };

  /** 为兼容旧组件代码保留的别名。 */
  async initializeApp(): Promise<void> {
    await this.init();

    // 有缓存：立即允许页面显示，再后台同步。
    if (this.hasUsableCache) {
      void this.syncIfNeeded('initial');
      return;
    }

    // 无缓存：首次启动必须等待网络同步。
    try {
      await this.syncNews(true, 'initial-cold-start');
    } catch {
      this.loadError = true;
      throw new Error('没有本地缓存且新闻服务暂时不可用');
    }
  }
  }

  export default defineComponent({
  name: 'News',
  components: { LastViewedPopup, CookieConsentBanner },

  setup() {
    const router = useRouter();
    const { t } = useI18n();
    const { setLastViewedNews } = useLastViewedCookie();
    const newsManager = new NewsManager();

    const searchQuery = ref('');
    const selectedTag = ref('');
    const currentPage = ref(0);
    const loadError = ref(false);
    const refreshTrigger = ref(0);
    const isLoading = ref(true);
    const newsSectionRef = ref<HTMLElement | null>(null);

    const itemsPerPage = computed(() => newsManager.itemsPerPage);
    const isSyncing = computed(() => newsManager.isSyncing);

    watch(() => newsManager.currentPage, (newPage) => {
      currentPage.value = newPage;
    });

    watch(() => newsManager.loadError, (newError) => {
      loadError.value = newError;
    });

    const uniqueTags = computed(() =>
      newsManager.getUniqueTags(newsManager.allNewsWithContent),
    );

    const paginatedNews = computed(() => {
      refreshTrigger.value;
      return newsManager.getPaginatedNews();
    });

    const pageCount = computed(() => {
      refreshTrigger.value;
      return newsManager.getPageCount();
    });

    const displayedPages = computed(() => {
      refreshTrigger.value;

      const total = pageCount.value;
      const current = currentPage.value + 1;
      const maxPages = appConfig.newsPagination.maxDisplayedPages;
      const pages: (number | string)[] = [];

      if (total <= maxPages) {
        for (let i = 1; i <= total; i++) pages.push(i);
        return pages;
      }

      pages.push(1);
      const half = Math.floor(maxPages / 2);

      if (current <= half + 1) {
        for (let i = 2; i <= Math.min(maxPages - 1, total); i++) pages.push(i);
        if (total > maxPages - 1) {
          pages.push('...');
          pages.push(total);
        }
      } else if (current >= total - half) {
        pages.push('...');
        for (let i = Math.max(total - maxPages + 2, 2); i <= total; i++) pages.push(i);
      } else {
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }

      return pages;
    });

    const filterNews = () => {
      newsManager.filterNews(selectedTag.value, searchQuery.value);
      refreshTrigger.value++;
    };

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

    const goToDetail = (item: NewsItem) => {
      setLastViewedNews(item.id, item.title);
      router.push({ name: 'newsdetail', query: { id: item.id.toString() } });
    };

    const cleanImageUrl = (url: string | undefined) => {
      return url ? url.replace(/["']/g, '') : '';
    };

    const hasImage = (item: NewsItem) => {
      const url = cleanImageUrl(item.image);
      return Boolean(
        url &&
        /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url),
      );
    };

    const renderShortContent = (item: NewsItem) => {
      // 后端提供 summary 时优先使用 summary；旧数据继续使用 markdownContent。
      const shortContent = item.summary || item.markdownContent || '暂无内容';
      const trimmed = shortContent.length > 100
        ? `${shortContent.substring(0, 100)}...`
        : shortContent;

      if (typeof marked !== 'undefined') {
        return marked.parse(trimmed);
      }

      return newsManager.simpleMarkdownRender(trimmed);
    };

    const forceRefresh = async () => {
      await newsManager.forceRefresh();
      refreshTrigger.value++;
      filterNews();
    };

    const retryDataLoad = async () => {
      await newsManager.retryDataLoad();
      refreshTrigger.value++;
      filterNews();
      loadError.value = newsManager.loadError;
    };

    let ctx: gsap.Context | undefined;
    let mm: gsap.MatchMedia | undefined;

    onMounted(async () => {
      await nextTick();

      if (newsSectionRef.value) {
        ctx = gsap.context(() => {
          mm = gsap.matchMedia();

          mm.add({
            isDesktop: '(min-width: 769px)',
            isMobile: '(max-width: 768px)',
            reduceMotion: '(prefers-reduced-motion: reduce)',
          }, (context) => {
            const reduceMotion = context.conditions?.reduceMotion;
            if (reduceMotion) return;

            gsap.to('.skeleton-shimmer', {
              xPercent: 100,
              repeat: -1,
              yoyo: true,
              ease: EASINGS.smooth,
              duration: 1.5,
            });
          });
        }, newsSectionRef.value);
      }

      try {
        // 初始化会先恢复 IndexedDB。
        // 有缓存时会立即结束，不等待后台网络同步。
        await newsManager.initializeApp();
      } catch (error) {
        console.error('初始化新闻失败:', error);
        loadError.value = newsManager.loadError;
      } finally {
        isLoading.value = false;
      }

      refreshTrigger.value++;
      filterNews();
      newsManager.initMarked();
    });

    watch(isLoading, async (newVal, oldVal) => {
      if (oldVal && !newVal && !loadError.value) {
        await nextTick();
        if (!newsSectionRef.value) return;

        const tl = gsap.timeline({
          defaults: { ease: EASINGS.entrance },
          onComplete: () => {
            mm?.revert();
          },
        });

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reduceMotion) {
          gsap.set('.skeleton-card', { autoAlpha: 0 });
          gsap.set('.news-item', { autoAlpha: 1 });
          return;
        }

        tl.to('.skeleton-card', { autoAlpha: 0, duration: DURATIONS.exit })
          .fromTo('.news-item',
            { autoAlpha: 0, y: 20 },
            { autoAlpha: 1, y: 0, stagger: STAGGERS.cards, duration: DURATIONS.entrance },
            '+=0.05',
          );
      }
    });

    onUnmounted(() => {
      newsManager.dispose();
      ctx?.revert();
      mm?.revert();
    });

    return {
      searchQuery,
      selectedTag,
      currentPage,
      uniqueTags,
      paginatedNews,
      pageCount,
      displayedPages,
      loadError,
      isLoading,
      isSyncing,
      newsSectionRef,
      itemsPerPage,
      filterNews,
      prevPage,
      nextPage,
      goToPage,
      goToDetail,
      hasImage,
      cleanImageUrl,
      renderShortContent,
      forceRefresh,
      retryDataLoad,
      newsManager,
      t,
    };
  },
  });
</script>
