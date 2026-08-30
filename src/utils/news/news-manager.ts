import debounce from 'lodash/debounce';
import { marked } from 'marked';
import { appConfig } from '@/config/app-config';
import { NewsCacheDB, type CachedNewsItem } from '@/utils/news/news-cache';
import { renderShortContent } from '@/utils/news/news-markdown';
// renderShortContent(item)
import type { NewsItem, CacheStatus, SyncResult } from '@/types/news';



export class NewsManager {
  currentPage = 0;
  itemsPerPage =
    typeof window !== 'undefined' && window.innerWidth <= 768
      ? appConfig.newsPagination.mobileItemsPerPage
      : appConfig.newsPagination.desktopItemsPerPage;

  filteredNews: NewsItem[] | null = null;
  allNewsWithContent: NewsItem[] = [];

  private readonly db = new NewsCacheDB();
  private readonly NEWS_STORAGE_KEY = 'session_news_data';

  /** 正常同步最短间隔。focus / online / visibilitychange 不会无限打请求。 */
  private readonly MIN_SYNC_INTERVAL = 10 * 60 * 1000;

  /** 页面持续打开时的后台检查周期。 */
  private readonly BACKGROUND_REFRESH_INTERVAL = 10 * 60 * 1000;

  /** 首屏冷缓存时最多同时下载多少篇正文。 */
  private readonly CONTENT_CONCURRENCY = 6;

  /** 内容请求超时。 */
  private readonly REQUEST_TIMEOUT = 15_000;

  /** 防止多次同步并发。 */
  private syncPromise: Promise<SyncResult> | null = null;

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
  private readonly SITE_DOMAIN =
    typeof window !== 'undefined' ? window.location.hostname || '' : '';

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
    if (
      typeof window !== 'undefined' &&
      (window as Window & { debugMode?: boolean }).debugMode
    ) {
      console.log('[News]', ...args);
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // 先恢复本地缓存，让首屏不依赖网络。
    await this.restoreCache();
    await this.updateCacheStatusFromMeta();
    this.initEventListeners();
    this.setupSmartRefresh();
  }

  private async migrateLegacyCache(): Promise<void> {
    const candidates: unknown[] = [];
    const legacyKeys = ['news-full-cache', this.NEWS_STORAGE_KEY, 'news-cache'];

    for (const key of legacyKeys) {
      try {
        const raw =
          key === this.NEWS_STORAGE_KEY
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

    const valid = candidates.filter((item): item is NewsItem =>
      this.validateNewsData([item]),
    );
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

    for (const key of [
      'news-full-cache',
      'news-full-cache-timestamp',
      'news-cache',
      'news-cache-timestamp',
    ]) {
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
      this.cacheStatus.lastUpdate =
        typeof lastSuccessfulSync === 'number' ? lastSuccessfulSync : null;

      const lastUpdate = this.cacheStatus.lastUpdate;
      this.cacheStatus.isStale =
        !lastUpdate || Date.now() - lastUpdate >= this.MIN_SYNC_INTERVAL;
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
      (value.contentFetchedVersion === undefined ||
        typeof value.contentFetchedVersion === 'string')
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
      this.itemsPerPage =
        window.innerWidth <= 768
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
      this.debugLog(
        `⏭️ ${reason}: ${Math.round((this.MIN_SYNC_INTERVAL - elapsed) / 1000)} 秒后才需要同步`,
      );
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

    this.syncPromise = this.performSync(force, reason).finally(() => {
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
      const cachedMap = new Map<number, CachedNewsItem>(
        cachedItems.map((item) => [item.id, item]),
      );
      const remoteMap = new Map<number, NewsItem>(
        remoteData.map((item) => [item.id, item]),
      );

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
          !cached.markdownContent || cached.contentFetchedVersion !== contentVersion;

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
        const concurrency = Math.max(
          1,
          Math.min(this.CONTENT_CONCURRENCY, candidates.length),
        );
        let cursor = 0;

        const worker = async () => {
          while (true) {
            const index = cursor++;
            if (index >= candidates.length) return;

            const candidate = candidates[index];
            if (!candidate) return;

            const { remote, cached, contentNeedsUpdate } = candidate;
            const resultItem = await this.updateOneArticle(
              remote,
              cached,
              contentNeedsUpdate,
            );

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
      this.allNewsWithContent = freshCache.map((item) =>
        this.stripInternalCacheFields(item),
      );
      this.hasUsableCache = this.allNewsWithContent.length > 0;

      // 4) 最后一步才更新“成功时间”，防止中途失败却被认为成功。
      this.cacheStatus.lastUpdate = Date.now();
      this.cacheStatus.isStale = false;
      await this.db.setMeta('lastSuccessfulSync', this.cacheStatus.lastUpdate);

      // 保存 manifest 的 HTTP 元数据，方便排障/诊断；请求本身仍交给浏览器 HTTP cache 管理。
      await this.db.setMeta('manifestETag', response.headers.get('ETag'));
      await this.db.setMeta(
        'manifestLastModified',
        response.headers.get('Last-Modified'),
      );
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
          this.debugLog(
            `⚠️ 新闻 ${remote.id} 正文拉取失败，保留旧正文，下一次继续重试:`,
            error,
          );
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
   * 注意：没有 contentVersion/updatedAt 时，这个 fingerprint 无法检测
   * “同一个 content URL 的 Markdown 被原地修改”。
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
        item.tags.some((tag: unknown) => typeof tag !== 'string')
      ) {
        return false;
      }

      if (
        typeof item.markdownContent === 'string' &&
        item.markdownContent.length > 100_000
      ) {
        return false;
      }

      if (item.updatedAt !== undefined && typeof item.updatedAt !== 'string') return false;
      if (item.contentVersion !== undefined && typeof item.contentVersion !== 'string') {
        return false;
      }
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

    return xssPatterns.some(
      (pattern) => pattern.test(text) || pattern.test(decodedText),
    );
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

      const safeTitle =
        title && title !== 'undefined'
          ? ` title="${this.escapeAttribute(title)}"`
          : '';

      const svgIcon = isExternal
        ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 18px; height: 18px; margin-left: 8px; vertical-align: sub;" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>'
        : '';

      return `<a href="${this.escapeAttribute(href)}"${safeTitle} class="${
        isExternal ? 'external-link' : ''
      }" ${isExternal ? 'rel="noopener noreferrer"' : ''}>${text}${svgIcon}</a>`;
    };

    marked.setOptions({ renderer });
    return true;
  }

  parseTokens(tokens: any[]): string {
    if (!Array.isArray(tokens)) return '';

    return tokens
      .map((token) => {
        if (token?.type === 'text' || token?.type === 'codespan') {
          return token.text || '';
        }
        if (token?.tokens) {
          return this.parseTokens(token.tokens);
        }
        return token?.text || '';
      })
      .join('');
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

    const escapeHtml = (unsafe: string) =>
      unsafe
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

  /**
   * 筛选新闻。
   * tag 支持单个字符串或字符串数组（多标签为 OR：命中任一即可）。
   * 空数组 / 空字符串表示不按标签筛选。
   */
  filterNews(tag: string | string[], query: string): NewsItem[] {
    const tags = Array.isArray(tag) ? tag.filter(Boolean) : tag ? [tag] : [];
    const normalizedQuery = query.toLowerCase().trim();

    const filtered = this.allNewsWithContent.filter((item) => {
      const matchesTag =
        tags.length === 0 || tags.some((t) => item.tags?.includes(t));

      const dateStr = item.date
        ? new Date(item.date).toLocaleDateString('zh-CN')
        : '';

      const searchableText = [
        item.title,
        item.summary ?? '',
        item.markdownContent ?? '',
        item.tags?.join(' ') ?? '',
        dateStr,
      ]
        .join(' ')
        .toLowerCase();

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
    const source =
      this.filteredNews !== null ? this.filteredNews : this.allNewsWithContent;
    const sorted = [...source].sort(this.sortNews);
    const start = this.currentPage * this.itemsPerPage;
    return sorted.slice(start, start + this.itemsPerPage);
  }

  getPageCount(): number {
    const totalItems =
      this.filteredNews !== null
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

  /** 列表页完整初始化（恢复缓存 + 事件监听 + 智能刷新）。 */
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

  /** 详情页：按 id 取一条（可能还没有 markdownContent）。 */
  getNewsById(id: number): NewsItem | undefined {
    return this.allNewsWithContent.find((item) => item.id === id);
  }

  /** 详情页：只恢复缓存，不挂监听、不启后台刷新。 */
  async restoreCachePublic(): Promise<void> {
    await this.restoreCache();
    await this.updateCacheStatusFromMeta();
  }

  /**
   * 详情页专用：确保某篇正文已拉取。
   * 有缓存正文则直接返回；没有则请求 Markdown 并写回 IndexedDB。
   */
  async ensureArticleContent(id: number): Promise<NewsItem | null> {
    if (this.allNewsWithContent.length === 0) {
      await this.restoreCachePublic();
    }

    let item = this.getNewsById(id);
    if (!item) {
      try {
        await this.syncNews(true, 'detail-miss');
      } catch {
        // 有旧缓存仍继续
      }
      item = this.getNewsById(id);
    }
    if (!item) return null;

    if (item.markdownContent) return item;

    const markdownUrl = this.convertGitHubUrlToCloudflare(item.content);
    if (!markdownUrl) {
      item.markdownContent = '内容不可用';
      return item;
    }

    try {
      const response = await this.safeFetch(markdownUrl, {
        cache: 'no-cache',
        headers: { Accept: 'text/markdown,text/plain;q=0.9,*/*;q=0.8' },
      });
      if (!response.ok) throw new Error(`Markdown ${response.status}`);

      const markdownContent = await response.text();
      item.markdownContent = markdownContent || '暂无内容';

      const contentVersion = this.getContentVersionKey(item);
      await this.db.putArticle({
        ...item,
        cacheVersion: 1,
        cachedAt: Date.now(),
        sourceFingerprint: this.getSourceFingerprint(item),
        contentFetchedVersion: contentVersion,
      } as CachedNewsItem);

      const idx = this.allNewsWithContent.findIndex((n) => n.id === id);
      if (idx >= 0) this.allNewsWithContent[idx] = { ...item };
    } catch (e) {
      this.debugLog(`详情正文拉取失败 id=${id}`, e);
      item.markdownContent = item.markdownContent || '内容加载失败';
    }

    return item;
  }
}