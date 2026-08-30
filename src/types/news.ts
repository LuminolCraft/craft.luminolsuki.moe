export interface NewsItem {
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
  
  export interface CacheStatus {
    isStale: boolean;
    lastUpdate: number | null;
    backgroundRefreshTimer: number | null;
    userActivityTimer: number | null;
  }
  
  export interface SyncResult {
    changed: boolean;
    added: number;
    updated: number;
    deleted: number;
    unchanged: number;
  }