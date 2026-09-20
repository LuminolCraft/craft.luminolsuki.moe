import debounce from 'lodash/debounce';
import { marked } from 'marked';
import { appConfig } from '@/config/app-config';
import { API_BASE_URL } from '@/lib/api-base';
import { NewsCacheDB, type CachedNewsItem } from '@/utils/news/news-cache';
import { renderShortContent } from '@/utils/news/news-markdown';
import {
  type RemoteNewsBundle,
  type RemoteNewsItem,
  contentVersionKey,
  planSync,
  sourceFingerprintOf,
} from '@/utils/news/news-sync';
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

  /** 变更订阅者集合（见 onChange / notifyChange）。 */
  private readonly changeHandlers = new Set<() => void>();

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

  /**
   * 新闻远端 = Nexus 同源代理（`src/modules/news/news.service.ts`）：
   * 一次请求拿到 manifest 指纹 + 全部条目（未降级时正文内联），
   * 不再直连 luminolcraft-news.pages.dev / raw.githubusercontent.com。
   */
  private readonly NEWS_API_URL = `${API_BASE_URL}/api/v1/news`;
  private readonly NEWS_ITEM_URL = (id: number): string => `${API_BASE_URL}/api/v1/news/${id}`;

  /** 本地记录的远端 manifest 指纹（`meta.newsVersion`）；null = 尚未同步过。 */
  private manifestVersion: string | null = null;
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

  private async updateCacheStatusFromMeta(): Promise<void> {
    try {
      const lastSuccessfulSync = await this.db.getMeta<number>('lastSuccessfulSync');
      this.cacheStatus.lastUpdate =
        typeof lastSuccessfulSync === 'number' ? lastSuccessfulSync : null;

      const lastUpdate = this.cacheStatus.lastUpdate;
      this.cacheStatus.isStale =
        !lastUpdate || Date.now() - lastUpdate >= this.MIN_SYNC_INTERVAL;

      // 远端 manifest 指纹（Nexus 代理给出）：与本地一致即可跳过整轮同步
      const version = await this.db.getMeta<string>('newsVersion');
      this.manifestVersion = typeof version === 'string' && version !== '' ? version : null;
    } catch (error) {
      this.debugLog('读取缓存状态失败:', error);
      this.cacheStatus.isStale = true;
    }
  }

  private async restoreCache(): Promise<void> {
    try {
      const cached = await this.db.getAllArticles();

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

      // 同源 Nexus 代理：`cache: no-cache` 允许浏览器复用 HTTP cache 并回源校验，
      // 同时带上本地 manifest 指纹（If-None-Match）→ 未变时服务端直接 304。
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.manifestVersion) headers['If-None-Match'] = `"${this.manifestVersion}"`;
      const response = await this.safeFetch(this.NEWS_API_URL, {
        cache: force ? 'reload' : 'no-cache',
        headers,
      });

      if (response.status === 304) {
        // 版本未变：不碰正文、不重写缓存，只刷新"最近成功时间"
        this.cacheStatus.lastUpdate = Date.now();
        this.cacheStatus.isStale = false;
        await this.db.setMeta('lastSuccessfulSync', this.cacheStatus.lastUpdate);
        result.unchanged = this.allNewsWithContent.length;
        this.debugLog('✅ Manifest 304 Not Modified');
        return result;
      }

      if (!response.ok) {
        throw new Error(`新闻接口请求失败: ${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as { data?: RemoteNewsBundle };
      const remote = payload?.data;
      if (!remote || !Array.isArray(remote.items) || typeof remote.version !== 'string') {
        throw new Error('新闻接口数据验证失败');
      }

      // 逐条校验：坏条目跳过而不是整组拒绝（服务端已过滤一遍，这里兜底）
      const remoteItems = this.filterValidNewsItems(remote.items);
      const bundle: RemoteNewsBundle = { ...remote, items: remoteItems };

      const cachedItems = await this.db.getAllArticles();
      const cachedMap = new Map<number, CachedNewsItem>(
        cachedItems.map((item) => [item.id, item]),
      );
      const plan = planSync({
        localVersion: this.manifestVersion,
        local: cachedItems,
        remote: bundle,
      });

      // 1) 删除远端已经不存在的新闻
      if (plan.remove.length > 0) {
        await this.db.deleteArticles(plan.remove);
        result.deleted = plan.remove.length;
        result.changed = true;
      }
      result.unchanged = plan.unchanged;

      // 2) 只处理"元数据或正文版本变化"的条目；正文优先用响应内联内容，
      //    服务端降级（bodiesOmitted）时才按条走 GET /api/v1/news/:id。
      const needBody = new Set(plan.needBody);
      const candidates = plan.upsert.map((item) => ({
        remote: item,
        cached: cachedMap.get(item.id),
        needBody: needBody.has(item.id),
      }));

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

            const resultItem = await this.updateOneArticle(
              candidate.remote,
              candidate.cached,
              candidate.needBody,
            );

            if (resultItem.updated) {
              result.updated++;
              if (!candidate.cached) result.added++;
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

      // 记录远端 manifest 指纹：下次同步用它做 304 / 整体跳过判定
      this.manifestVersion = bundle.version;
      await this.db.setMeta('newsVersion', bundle.version);

      this.filteredNews = null;
      this.ensureCurrentPageValid();

      // 有实际变化才通知视图（304 / 全部 unchanged 时不惊动页面）
      if (result.changed) this.notifyChange();

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

  /**
   * 写入单篇：正文优先用同步响应里的内联内容（服务端未降级时）；
   * 仅当 `needBody`（服务端 bodiesOmitted，或本地还没有正文）时才按条请求
   * `GET /api/v1/news/:id`。
   */
  private async updateOneArticle(
    remote: RemoteNewsItem,
    cached: CachedNewsItem | undefined,
    needBody: boolean,
  ): Promise<{ updated: boolean; article: CachedNewsItem | null }> {
    let markdownContent = remote.markdownContent ?? cached?.markdownContent;
    let contentFetchedVersion = cached?.contentFetchedVersion;
    const sourceFingerprint = sourceFingerprintOf(remote);
    const contentVersion = contentVersionKey(remote);

    if (remote.markdownContent != null) {
      // 内联正文：直接落库，无需额外请求
      contentFetchedVersion = contentVersion;
    } else if (needBody && !markdownContent) {
      const fetched = await this.fetchArticleBody(remote.id);
      if (fetched !== null) {
        markdownContent = fetched;
        contentFetchedVersion = contentVersion;
      }
    }

    const article: CachedNewsItem = {
      ...this.toNewsItem(remote),
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

  /** 远端条目 → 本地 `NewsItem`（`content` 缺失时落空串，保持既有类型契约）。 */
  private toNewsItem(remote: RemoteNewsItem): NewsItem {
    return {
      id: remote.id,
      title: remote.title,
      content: remote.content ?? '',
      markdownContent: remote.markdownContent ?? undefined,
      date: remote.date,
      tags: remote.tags ?? [],
      image: remote.image ?? undefined,
      additionalImages: remote.additionalImages ?? undefined,
      pinned: remote.pinned ?? undefined,
      updatedAt: remote.updatedAt ?? undefined,
      contentVersion: remote.contentVersion ?? undefined,
      summary: remote.summary ?? undefined,
    };
  }

  /** 按条拉正文（同源 `GET /api/v1/news/:id`）；失败返回 null，保留旧正文下次再试。 */
  private async fetchArticleBody(id: number): Promise<string | null> {
    try {
      const response = await this.safeFetch(this.NEWS_ITEM_URL(id), {
        cache: 'no-cache',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`news item ${response.status} ${response.statusText}`);
      }
      const payload = (await response.json()) as {
        data?: { markdownContent?: string | null };
      };
      const markdown = payload?.data?.markdownContent;
      if (typeof markdown !== 'string') {
        this.debugLog(`⚠️ 新闻 ${id} 正文缺失`);
        return null;
      }
      return markdown;
    } catch (error) {
      this.debugLog(`⚠️ 新闻 ${id} 正文拉取失败，保留旧正文，下一次继续重试:`, error);
      return null;
    }
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

  /**
   * 逐条校验远端条目（**坏条跳过**，不再整组拒绝）。
   *
   * 旧的 `validateNewsData` 是"任一条不合法 → 全量拒绝"，一条脏数据就能把
   * 整个新闻页清空（见 BACKEND-PRIVATE.md 4.1 记录的缺陷）；服务端
   * `src/modules/news/news.schema.ts` 已先过滤一遍，这里是前端兜底。
   */
  filterValidNewsItems(data: unknown[]): RemoteNewsItem[] {
    const valid: RemoteNewsItem[] = [];

    for (const rawItem of data.slice(0, 1000)) {
      if (!rawItem || typeof rawItem !== 'object') continue;

      const item = rawItem as Partial<RemoteNewsItem>;

      if (
        typeof item.id !== 'number' ||
        !Number.isSafeInteger(item.id) ||
        item.id <= 0 ||
        typeof item.title !== 'string' ||
        item.title.length === 0 ||
        item.title.length > 200 ||
        typeof item.date !== 'string' ||
        (item.tags !== undefined && item.tags !== null && !Array.isArray(item.tags)) ||
        (Array.isArray(item.tags) && item.tags.some((tag) => typeof tag !== 'string'))
      ) {
        this.debugLog(`⚠️ 跳过形状非法的新闻条目 id=${String(item.id)}`);
        continue;
      }

      if (
        typeof item.markdownContent === 'string' &&
        item.markdownContent.length > 100_000
      ) {
        this.debugLog(`⚠️ 跳过正文超限的新闻条目 id=${item.id}`);
        continue;
      }

      if (item.updatedAt != null && typeof item.updatedAt !== 'string') continue;
      if (item.contentVersion != null && typeof item.contentVersion !== 'string') continue;
      if (item.summary != null && typeof item.summary !== 'string') continue;

      if (this.containsXSS(item.title) || this.containsXSS(item.summary ?? '')) {
        this.debugLog(`⚠️ 跳过含 XSS 特征的新闻条目 id=${item.id}`);
        continue;
      }

      valid.push(item as RemoteNewsItem);
    }

    return valid;
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
      // force：每次进列表页都做一次"条件校验"（带 If-None-Match，未变即 304、零正文下载）。
      // 不能只靠 MIN_SYNC_INTERVAL —— 那会让"刚发布新闻"的访客最多 10 分钟内看不到新内容。
      void this.syncIfNeeded('initial', true);
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

  /**
   * 订阅"本地新闻数据已变化"（同步写入新条目 / 删稿后触发）。
   *
   * 为什么需要：`allNewsWithContent` 等字段是普通类字段、**非响应式**，后台同步
   * 完成后视图不会自己重算；页面必须据此重新筛选/重取分页，否则新新闻要等用户
   * 手动翻页或再刷一次才出现。返回取消订阅函数（页面卸载时调用）。
   */
  onChange(handler: () => void): () => void {
    this.changeHandlers.add(handler);
    return () => {
      this.changeHandlers.delete(handler);
    };
  }

  private notifyChange(): void {
    for (const handler of this.changeHandlers) {
      try {
        handler();
      } catch (error) {
        this.debugLog('变更通知处理失败:', error);
      }
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

    // 正文按条取：同源 `GET /api/v1/news/:id`（服务端聚合未内联时才走到这里）
    const markdownContent = await this.fetchArticleBody(id);
    if (markdownContent === null) {
      item.markdownContent = item.markdownContent || '内容加载失败';
      return item;
    }

    item.markdownContent = markdownContent || '暂无内容';
    const remote: RemoteNewsItem = {
      id: item.id,
      title: item.title,
      date: item.date,
      tags: item.tags,
      image: item.image ?? null,
      additionalImages: item.additionalImages ?? null,
      pinned: item.pinned ?? null,
      summary: item.summary ?? null,
      updatedAt: item.updatedAt ?? null,
      content: item.content,
      contentVersion: item.contentVersion ?? null,
    };
    await this.db.putArticle({
      ...item,
      cacheVersion: 1,
      cachedAt: Date.now(),
      sourceFingerprint: sourceFingerprintOf(remote),
      contentFetchedVersion: contentVersionKey(remote),
    } as CachedNewsItem);

    const idx = this.allNewsWithContent.findIndex((n) => n.id === id);
    if (idx >= 0) this.allNewsWithContent[idx] = { ...item };

    return item;
  }
}