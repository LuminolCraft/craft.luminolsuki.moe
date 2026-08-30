/*
 * src/utils/news-cache.ts
 *
 * 新闻本地持久化层：IndexedDB
 * - 每篇新闻独立存储，更新一篇不会重写全部缓存
 * - manifest 元数据单独存储
 * - 支持数据库升级
 */

export interface NewsItemCacheBase {
    id: number;
    title: string;
    content: string;
    markdownContent?: string;
    date: string;
    tags: string[];
    image?: string;
    additionalImages?: string[];
    pinned?: boolean;
    updatedAt?: string;
    contentVersion?: string;
    summary?: string;
  }
  
  export interface CachedNewsItem extends NewsItemCacheBase {
    cacheVersion: 1;
    cachedAt: number;
    sourceFingerprint: string;
    /** 最后一次成功拉取正文时对应的版本；正文失败时保持旧值，以便下一次继续重试。 */
    contentFetchedVersion?: string;
  }
  
  export interface NewsMeta {
    key: string;
    value: unknown;
  }
  
  const DB_NAME = 'luminolcraft-news';
  const DB_VERSION = 1;
  const ARTICLES_STORE = 'articles';
  const META_STORE = 'meta';
  
  function requestToPromise<T = undefined>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  }
  
  function transactionDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
  }
  
  export class NewsCacheDB {
    private dbPromise: Promise<IDBDatabase>;
  
    constructor() {
      this.dbPromise = this.open();
    }
  
    private open(): Promise<IDBDatabase> {
      if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB is not available in this browser'));
      }
  
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
  
        request.onupgradeneeded = () => {
          const db = request.result;
  
          if (!db.objectStoreNames.contains(ARTICLES_STORE)) {
            db.createObjectStore(ARTICLES_STORE, { keyPath: 'id' });
          }
  
          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE, { keyPath: 'key' });
          }
        };
  
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => db.close();
          resolve(db);
        };
  
        request.onerror = () => {
          reject(request.error ?? new Error('Failed to open IndexedDB'));
        };
      });
    }
  
    async getAllArticles(): Promise<CachedNewsItem[]> {
      const db = await this.dbPromise;
      const tx = db.transaction(ARTICLES_STORE, 'readonly');
      const request = tx.objectStore(ARTICLES_STORE).getAll();
      return requestToPromise(request);
    }
  
    async getArticle(id: number): Promise<CachedNewsItem | undefined> {
      const db = await this.dbPromise;
      const tx = db.transaction(ARTICLES_STORE, 'readonly');
      const request = tx.objectStore(ARTICLES_STORE).get(id);
      return requestToPromise(request);
    }
  
    async putArticle(article: CachedNewsItem): Promise<void> {
      const db = await this.dbPromise;
      const tx = db.transaction(ARTICLES_STORE, 'readwrite');
      tx.objectStore(ARTICLES_STORE).put(article);
      await transactionDone(tx);
    }
  
    async putArticles(articles: CachedNewsItem[]): Promise<void> {
      if (articles.length === 0) return;
  
      const db = await this.dbPromise;
      const tx = db.transaction(ARTICLES_STORE, 'readwrite');
      const store = tx.objectStore(ARTICLES_STORE);
  
      for (const article of articles) {
        store.put(article);
      }
  
      await transactionDone(tx);
    }
  
    async deleteArticle(id: number): Promise<void> {
      const db = await this.dbPromise;
      const tx = db.transaction(ARTICLES_STORE, 'readwrite');
      tx.objectStore(ARTICLES_STORE).delete(id);
      await transactionDone(tx);
    }
  
    async deleteArticles(ids: number[]): Promise<void> {
      if (ids.length === 0) return;
  
      const db = await this.dbPromise;
      const tx = db.transaction(ARTICLES_STORE, 'readwrite');
      const store = tx.objectStore(ARTICLES_STORE);
  
      for (const id of ids) {
        store.delete(id);
      }
  
      await transactionDone(tx);
    }
  
    async clear(): Promise<void> {
      const db = await this.dbPromise;
      const tx = db.transaction([ARTICLES_STORE, META_STORE], 'readwrite');
      tx.objectStore(ARTICLES_STORE).clear();
      tx.objectStore(META_STORE).clear();
      await transactionDone(tx);
    }
  
    async getMeta<T = unknown>(key: string): Promise<T | undefined> {
      const db = await this.dbPromise;
      const tx = db.transaction(META_STORE, 'readonly');
      const request = tx.objectStore(META_STORE).get(key);
      const result = await requestToPromise<NewsMeta | undefined>(request);
      return result?.value as T | undefined;
    }
  
    async setMeta(key: string, value: unknown): Promise<void> {
      const db = await this.dbPromise;
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put({ key, value } satisfies NewsMeta);
      await transactionDone(tx);
    }
  
    async deleteMeta(key: string): Promise<void> {
      const db = await this.dbPromise;
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).delete(key);
      await transactionDone(tx);
    }
  }
  