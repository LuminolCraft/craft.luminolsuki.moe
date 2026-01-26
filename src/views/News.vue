<template>
      <header>
        <section class="news-section">
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
          <!-- 缓存状态指示器 -->
          <div id="cache-status-indicator" class="cache-status-indicator">
            <span v-html="cacheStatusText"></span>
            <button
              v-if="cacheStatus.isStale"
              @click="forceRefresh"
              style="margin-left: 10px; padding: 2px 8px; font-size: 12px;"
            >
              {{ t('news.list.error.forceRefresh') }}
            </button>
            <button
              v-else-if="loadError"
              @click="retryDataLoad"
              style="margin-left: 10px; padding: 2px 8px; font-size: 12px;"
            >
              {{ t('news.list.error.retry') }}
            </button>
          </div>
          <div id="news-grid" class="news-grid">
            <div
              v-for="item in paginatedNews"
              :key="item.id"
              class="news-item"
              :class="{ pinned: !!item.pinned, 'no-image': !hasImage(item) }"
              @click="goToDetail(item.id)"
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
          </div>
          <div id="news-pagination" class="news-pagination">
            <button
              class="pagination-btn"
              :disabled="currentPage === 0"
              @click="prevPage"
            >
              {{ t('news.list.pagination.prev') }}
            </button>
            <button
              v-for="page in pageCount"
              :key="page"
              class="pagination-btn"
              :class="{ active: currentPage === page - 1 }"
              @click="goToPage(page - 1)"
            >
              {{ page }}
            </button>
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
    </template>
    
    <style scoped>
    @import '../styles/desktop/news-styles.css';
    @import '../styles/mobile/news-mobile.css';
    </style>
    
    <script lang="ts">
    import { defineComponent, ref, onMounted, onUnmounted, computed, watch } from 'vue';
    import { useRouter } from 'vue-router';
    import { useI18n } from 'vue-i18n';
    import { marked } from 'marked'; // 假设已安装 marked 或通过 CDN 加载
    import debounce from 'lodash/debounce'; // 假设使用 lodash 的 debounce
    
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
    
    interface CacheStatus {
  isStale: boolean;
  lastUpdate: number | null;
  backgroundRefreshTimer: NodeJS.Timeout | number | null;
  userActivityTimer: number | null;
}
    
    // NewsManager 类转换为 TypeScript
    class NewsManager {
      currentPage = 0;
      itemsPerPage = window.innerWidth <= 768 ? 3 : 6;
      filteredNews: NewsItem[] | null = null;
      allNewsWithContent: NewsItem[] = [];
      NEWS_STORAGE_KEY = 'session_news_data';
      CACHE_DURATION = 2 * 60 * 60 * 1000; // 2小时
      STALE_DURATION = 30 * 60 * 1000; // 30分钟
      BACKGROUND_REFRESH_INTERVAL = 10 * 60 * 1000; // 10分钟
      USER_ACTIVE_THRESHOLD = 5 * 60 * 1000; // 5分钟
      GITHUB_RAW_BASE = 'https://luminolcraft-news.pages.dev/';
      GITEJSON_URL = 'https://luminolcraft-news.pages.dev/news.json';
      SITE_DOMAIN = window.location.hostname || '';
      errorLogged = new Set<string>();
      cacheStatus: CacheStatus = {
        isStale: false,
        lastUpdate: null,
        backgroundRefreshTimer: null,
        userActivityTimer: null,
      };
      isRetrying = false;
      loadError = false;
    
      constructor() {
        this.init();
      }
    
      debugLog(...args: any[]) {
        if ((window as any).debugMode) {
          console.log(...args);
        }
      }
    
      init() {
        this.initFromStorage();
        this.initMarked();
        this.initEventListeners();
        this.initSmartCache();
        this.setupCleanup();
      }
    
      setupCleanup() {
        window.addEventListener('beforeunload', () => {
          if (this.cacheStatus.backgroundRefreshTimer) {
            clearInterval(this.cacheStatus.backgroundRefreshTimer);
          }
        });
      }
    
      initSmartCache() {
        this.setupBackgroundRefresh();
        this.setupUserActivityTracking();
        this.updateCacheStatus();
      }
    
      setupBackgroundRefresh() {
        if (this.cacheStatus.backgroundRefreshTimer) {
          clearInterval(this.cacheStatus.backgroundRefreshTimer);
        }
        this.cacheStatus.backgroundRefreshTimer = setInterval(() => {
          this.checkAndRefreshCache();
        }, this.BACKGROUND_REFRESH_INTERVAL);
        this.debugLog(
          '🔄 后台刷新已启动，间隔:',
          this.BACKGROUND_REFRESH_INTERVAL / 1000 / 60 + '分钟'
        );
      }
    
      setupUserActivityTracking() {
        const activityEvents = [
          'mousedown',
          'mousemove',
          'keypress',
          'scroll',
          'touchstart',
        ];
        activityEvents.forEach((event) => {
          document.addEventListener(
            event,
            () => {
              this.updateUserActivity();
            },
            { passive: true }
          );
        });
        this.debugLog('👤 用户活跃度跟踪已启动');
      }
    
      updateUserActivity() {
        this.cacheStatus.userActivityTimer = Date.now();
        if (this.cacheStatus.isStale) {
          this.debugLog('👤 检测到用户活跃，缓存已过期，触发刷新');
          this.refreshCacheInBackground().catch((error) => {
            this.debugLog('❌ 用户活跃触发刷新失败:', error.message);
          });
        }
      }
    
      async checkAndRefreshCache() {
        const now = Date.now();
        const lastUpdate = this.cacheStatus.lastUpdate || 0;
        const timeSinceUpdate = now - lastUpdate;
        if (timeSinceUpdate > this.STALE_DURATION) {
          this.cacheStatus.isStale = true;
          const timeSinceActivity = now - (this.cacheStatus.userActivityTimer || 0);
          if (timeSinceActivity < this.USER_ACTIVE_THRESHOLD) {
            this.debugLog('🔄 用户活跃且缓存过期，立即刷新');
            await this.refreshCacheInBackground();
          }
        }
      }
    
      async refreshCacheInBackground() {
        try {
          this.debugLog('🔄 开始后台刷新缓存...');
          const response = await fetch(this.GITEJSON_URL, {
            cache: 'no-store',
            headers: {
              'User-Agent': 'LuminolCraft-News/1.0',
              Accept: 'application/json',
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (this.validateNewsData(data)) {
              await this.preloadMarkdownContent(data);
              this.cacheStatus.isStale = false;
              this.cacheStatus.lastUpdate = Date.now();
              localStorage.setItem('news-cache', JSON.stringify(data));
              localStorage.setItem(
                'news-cache-timestamp',
                this.cacheStatus.lastUpdate.toString()
              );
              this.debugLog('✅ 后台缓存刷新成功');
            } else {
              this.debugLog('❌ 数据验证失败，跳过缓存更新');
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.debugLog('❌ 后台缓存刷新失败:', errorMessage);
        }
      }
    
      validateNewsData(data: any): data is NewsItem[] {
        if (!Array.isArray(data)) {
          this.debugLog('❌ 数据格式错误：不是数组');
          return false;
        }
        if (data.length > 1000) {
          this.debugLog('❌ 数据量过大，可能存在攻击');
          return false;
        }
        for (const item of data) {
          if (!item || typeof item !== 'object') {
            this.debugLog('❌ 新闻项格式错误');
            return false;
          }
          if (!item.id || !item.title || !item.content) {
            this.debugLog('❌ 新闻项缺少必要字段');
            return false;
          }
          if (item.title.length > 200 || item.content.length > 10000) {
            this.debugLog('❌ 新闻项字段过长');
            return false;
          }
          if (this.containsXSS(item.title) || this.containsXSS(item.content)) {
            this.debugLog('❌ 检测到潜在XSS攻击');
            return false;
          }
        }
        return true;
      }
    
      containsXSS(text: string): boolean {
        if (typeof text !== 'string') return false;
        const decodedText = text
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&#x2F;/g, '/')
          .replace(/&amp;/g, '&');
        const xssPatterns = [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript\s*:/gi,
          /vbscript\s*:/gi,
          /data\s*:\s*text\/html/gi,
          /on\w+\s*=/gi,
          /<iframe[^>]*>/gi,
          /<object[^>]*>/gi,
          /<embed[^>]*>/gi,
          /<link[^>]*>/gi,
          /<meta[^>]*>/gi,
          /<style[^>]*>.*?<\/style>/gi,
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
        return xssPatterns.some((pattern) =>
          pattern.test(text) || pattern.test(decodedText)
        );
      }
    
      async forceRefresh() {
        this.debugLog('🔄 用户触发强制刷新');
        this.cacheStatus.isStale = true;
        await this.refreshCacheInBackground();
      }
    
      async retryDataLoad() {
        if (this.isRetrying) {
          this.debugLog('⚠️ 重试操作正在进行中，跳过重复调用');
          return;
        }
        this.isRetrying = true;
        this.debugLog('🔄 用户触发数据重试加载');
        try {
          localStorage.removeItem('news-cache');
          localStorage.removeItem('news-cache-timestamp');
          localStorage.removeItem('news-full-cache');
          localStorage.removeItem('news-full-cache-timestamp');
          sessionStorage.removeItem(this.NEWS_STORAGE_KEY);
          this.allNewsWithContent = [];
          this.filteredNews = null;
          this.currentPage = 0;
          this.debugLog('🧹 缓存已清除，状态已重置');
          await this.initializeApp();
          this.debugLog('📊 初始化完成，数据量:', this.allNewsWithContent.length);
          this.isRetrying = false;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.debugLog('❌ 数据重试加载失败:', errorMessage);
          this.isRetrying = false;
        }
      }
    
      updateCacheStatus() {
        const timestamp = localStorage.getItem('news-cache-timestamp');
        if (timestamp) {
          this.cacheStatus.lastUpdate = parseInt(timestamp);
          const now = Date.now();
          const timeSinceUpdate = now - this.cacheStatus.lastUpdate;
          this.cacheStatus.isStale = timeSinceUpdate > this.STALE_DURATION;
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
    
      simpleMarkdownRender(text: string): string {
        if (!text) return '';
        const escapeHtml = (unsafe: string) => {
          return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };
        const html = escapeHtml(text)
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
            if (!this.isValidUrl(href)) {
              return escapeHtml(text);
            }
            const isExternal =
              !href.startsWith('/') &&
              !href.includes(this.SITE_DOMAIN) &&
              !href.startsWith('#');
            const svgIcon = isExternal
              ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>'
              : '';
            return `<a href="${escapeHtml(href)}" class="${
              isExternal ? 'external-link' : ''
            }" ${isExternal ? 'rel="noopener noreferrer"' : ''}>${escapeHtml(
              text
            )}${svgIcon}</a>`;
          });
        return '<p>' + html + '</p>';
      }
    
      isValidUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        try {
          const urlObj = new URL(url);
          if (urlObj.protocol !== 'https:') return false;
          const allowedDomains = [
            'luminolcraft-news.pages.dev',
            'raw.githubusercontent.com',
            'github.com',
            'cdn.jsdelivr.net',
            'cdnjs.cloudflare.com',
            'cdn-font.hyperos.mi.com',
          ];
          if (!allowedDomains.includes(urlObj.hostname)) return false;
          const dangerousPaths = ['../', './', '//', '\\'];
          if (dangerousPaths.some((path) => urlObj.pathname.includes(path)))
            return false;
          return true;
        } catch (e) {
          return false;
        }
      }
    
      initMarked() {
        if (typeof marked === 'undefined') {
          console.warn('marked 库未加载，使用简化渲染器作为备用方案');
          return false;
        }
        this.debugLog('marked 库加载成功，版本:', (marked as any).version || '未知');
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
    
      initEventListeners() {
        window.addEventListener(
          'resize',
          debounce(() => {
            this.itemsPerPage = window.innerWidth <= 768 ? 3 : 6;
          }, 200)
        );
      }
    
      convertGitHubUrlToCloudflare(contentUrl: string): string | null {
        if (!contentUrl.startsWith('http')) {
          return `${this.GITHUB_RAW_BASE}${contentUrl}`;
        }
        if (contentUrl.includes('raw.githubusercontent.com/LuminolCraft/news.json')) {
          const path = contentUrl.split(
            'raw.githubusercontent.com/LuminolCraft/news.json'
          )[1];
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
        this.debugLog('📚 预加载 Markdown 内容...', {
          itemCount: newsData.length,
          baseUrl: this.GITHUB_RAW_BASE,
        });
        const now = Date.now();
        const cached = localStorage.getItem('news-full-cache');
        const timestamp = localStorage.getItem('news-full-cache-timestamp');
        if (cached && timestamp && now - parseInt(timestamp) < this.CACHE_DURATION) {
          this.allNewsWithContent = JSON.parse(cached);
          this.debugLog('🗄️ 使用缓存的完整新闻数据');
          sessionStorage.setItem(
            this.NEWS_STORAGE_KEY,
            JSON.stringify(this.allNewsWithContent)
          );
          return;
        }
        for (const item of newsData) {
          const fullContentUrl = this.convertGitHubUrlToCloudflare(item.content);
          if (fullContentUrl === null) {
            this.debugLog(`跳过新闻 ${item.id}: 不支持的URL格式`);
            item.markdownContent = '内容不可用';
            continue;
          }
          try {
            const response = await fetch(fullContentUrl, { cache: 'no-store' });
            if (!response.ok)
              throw new Error(
                `无法加载: ${fullContentUrl} (状态: ${response.status})`
              );
            const markdownContent = await response.text();
            item.markdownContent = markdownContent || '暂无内容';
            item.additionalImages =
              item.additionalImages?.filter((url) => url && url.trim() !== '') ||
              [];
          } catch (error) {
            console.error(`❌ 预加载新闻 ${item.id} 失败:`, error);
            item.markdownContent = '内容加载失败';
          }
        }
        this.allNewsWithContent = newsData;
        localStorage.setItem(
          'news-full-cache',
          JSON.stringify(this.allNewsWithContent)
        );
        localStorage.setItem('news-full-cache-timestamp', now.toString());
        sessionStorage.setItem(
          this.NEWS_STORAGE_KEY,
          JSON.stringify(this.allNewsWithContent)
        );
        this.debugLog('新闻数据加载完成并缓存到sessionStorage');
      }
    
      getUniqueTags(newsData: NewsItem[]): string[] {
        const tagsSet = new Set<string>();
        newsData.forEach((item) => {
          if (item.tags && Array.isArray(item.tags)) {
            item.tags.forEach((tag) => tagsSet.add(tag));
          }
        });
        return Array.from(tagsSet);
      }
    
      filterNews(tag: string, query: string): NewsItem[] {
        this.debugLog('筛选条件:', { tag, query });
        const filtered = this.allNewsWithContent.filter((item) => {
          const matchesTag = !tag || (item.tags && item.tags.includes(tag));
          const dateStr = item.date
            ? new Date(item.date).toLocaleDateString('zh-CN')
            : '';
          const matchesQuery =
            !query ||
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.markdownContent &&
              item.markdownContent.toLowerCase().includes(query)) ||
            dateStr.toLowerCase().includes(query);
          return matchesTag && matchesQuery;
        });
        this.debugLog('筛选结果:', { filteredNewsCount: filtered.length });
        this.filteredNews = filtered;
        this.currentPage = 0;
        return filtered;
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
        this.loadError = false;
        try {
          this.debugLog('📡 正在加载新闻数据...', {
            url: this.GITEJSON_URL,
          });
          const response = await this.safeFetch(this.GITEJSON_URL, {
            cache: 'no-store',
          });
          this.debugLog('📡 API响应状态:', {
            status: response.status,
            ok: response.ok,
          });
          if (!response.ok) {
            throw new Error(
              `无法加载 news.json: ${response.status} - ${response.statusText}`
            );
          }
          const data: NewsItem[] = await response.json();
          if (!this.validateNewsData(data)) {
            throw new Error('数据验证失败，可能存在安全风险');
          }
          this.debugLog('✅ news.json 加载成功:', {
            itemCount: data.length,
          });
          localStorage.setItem('news-cache', JSON.stringify(data));
          localStorage.setItem(
            'news-cache-timestamp',
            new Date().getTime().toString()
          );
          this.cacheStatus.lastUpdate = Date.now();
          this.cacheStatus.isStale = false;
          await this.preloadMarkdownContent(data);
        } catch (error) {
          console.error('初始化加载 news.json 失败:', (error as Error).message);
          this.loadError = true;
        }
      }
    
      getPaginatedNews(): NewsItem[] {
        let newsData =
          this.filteredNews !== null ? this.filteredNews : this.allNewsWithContent;
        newsData = newsData.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        const start = this.currentPage * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return newsData.slice(start, end);
      }
    
      getPageCount(): number {
        const totalItems =
          this.filteredNews !== null
            ? this.filteredNews.length
            : this.allNewsWithContent.length;
        return Math.ceil(totalItems / this.itemsPerPage);
      }
    }
    
      // Vue 组件
    export default defineComponent({
      name: 'News',
      setup() {
        const router = useRouter();
        const { t } = useI18n();
        const newsManager = new NewsManager();
        const searchQuery = ref('');
        const selectedTag = ref('');
        const currentPage = ref(newsManager.currentPage);
        const loadError = ref(newsManager.loadError);
        const cacheStatus = ref(newsManager.cacheStatus);
        const refreshTrigger = ref(0); // 用于触发响应式更新
    
        // 同步 newsManager.currentPage 到 currentPage ref
        watch(() => newsManager.currentPage, (newPage) => {
          currentPage.value = newPage;
        });
    
        // 同步 newsManager.loadError 到 loadError ref
        watch(() => newsManager.loadError, (newError) => {
          loadError.value = newError;
        });
    
        // 同步 newsManager.cacheStatus 到 cacheStatus ref
        watch(() => newsManager.cacheStatus, (newStatus) => {
          cacheStatus.value = { ...newStatus };
        }, { deep: true });
    
        const uniqueTags = computed(() =>
          newsManager.getUniqueTags(newsManager.allNewsWithContent)
        );
    
        const paginatedNews = computed(() => {
          // 使用 refreshTrigger 来触发重新计算
          refreshTrigger.value;
          return newsManager.getPaginatedNews();
        });
    
        const pageCount = computed(() => {
          refreshTrigger.value;
          return newsManager.getPageCount();
        });
    
        const cacheStatusText = computed(() => {
          refreshTrigger.value;
          if (newsManager.loadError) {
            return `<span style="color: #ff6b6b;">❌ 数据加载失败</span>`;
          }
          if (newsManager.cacheStatus.isStale) {
            return `<span style="color: #ff6b6b;"><i class="fa-jelly-fill fa-regular fa-triangle-exclamation"></i> 数据可能不是最新</span>`;
          }
          const minutesAgo = Math.floor(
            (Date.now() - (newsManager.cacheStatus.lastUpdate || 0)) / 60000
          );
          return `<span style="color: #51cf66;">✔ 数据已更新 ${minutesAgo}分钟前</span>`;
        });
    
        const filterNews = () => {
          newsManager.filterNews(selectedTag.value, searchQuery.value.toLowerCase().trim());
          refreshTrigger.value++; // 触发响应式更新
        };
    
        const prevPage = () => {
          if (currentPage.value > 0) {
            currentPage.value--;
            newsManager.currentPage = currentPage.value;
            refreshTrigger.value++; // 触发响应式更新
          }
        };
    
        const nextPage = () => {
          if (currentPage.value < pageCount.value - 1) {
            currentPage.value++;
            newsManager.currentPage = currentPage.value;
            refreshTrigger.value++; // 触发响应式更新
          }
        };
    
        const goToPage = (page: number) => {
          currentPage.value = page;
          newsManager.currentPage = page;
          refreshTrigger.value++; // 触发响应式更新
        };
    
        const goToDetail = (id: number) => {
          router.push({ name: 'newsdetail', query: { id: id.toString() } });
        };
    
        const hasImage = (item: NewsItem) => {
          return (
            item.image &&
            item.image.trim() !== '' &&
            item.image !== '""' &&
            cleanImageUrl(item.image).match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)$/i)
          );
        };
    
        const cleanImageUrl = (url: string | undefined) => {
          return url ? url.replace(/['"]/g, '') : '';
        };
    
        const renderShortContent = (item: NewsItem) => {
          const shortContent = item.markdownContent
            ? item.markdownContent.substring(0, 100) + '...'
            : '暂无内容';
          if (typeof marked !== 'undefined') {
            return marked.parse(shortContent);
          } else {
            return newsManager.simpleMarkdownRender(shortContent);
          }
        };
    
        const forceRefresh = async () => {
          await newsManager.forceRefresh();
          refreshTrigger.value++; // 触发响应式更新
          filterNews();
        };
    
        const retryDataLoad = async () => {
          loadError.value = false;
          await newsManager.retryDataLoad();
          refreshTrigger.value++; // 触发响应式更新
          filterNews();
        };
    
        onMounted(async () => {
          await newsManager.initializeApp();
          refreshTrigger.value++; // 触发响应式更新
          filterNews();
          newsManager.initMarked();
        });
    
        onUnmounted(() => {
          // 清理定时器等
          if (newsManager.cacheStatus.backgroundRefreshTimer) {
            clearInterval(newsManager.cacheStatus.backgroundRefreshTimer);
          }
        });
    
        return {
          searchQuery,
          selectedTag,
          currentPage,
          uniqueTags,
          paginatedNews,
          pageCount,
          cacheStatusText,
          loadError,
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
          cacheStatus, // 用于 v-if
          t
        };
      },
    });
</script>