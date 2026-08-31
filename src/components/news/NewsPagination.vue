<template>
    <div v-if="pageCount > 0" class="pagination-wrapper">
      <!-- 移动端简化版分页 -->
      <div class="mobile-pagination">
        <button
          class="pagination-btn-nav"
          :disabled="currentPage === 0"
          @click="$emit('prev')"
          aria-label="上一页"
        >
          <svg width="1em" height="1em" viewBox="0 0 24 24" class="icon-chevron" aria-hidden="true">
            <path fill="currentColor" d="M10.8 12l3.9 3.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-4.6-4.6q-.15-.15-.212-.325T8.425 12t.063-.375t.212-.325l4.6-4.6q.275-.275.7-.275t.7.275t.275.7t-.275.7z"/>
          </svg>
        </button>
  
        <div class="page-indicator">
          <span class="page-current">{{ currentPage + 1 }}</span>
          <span class="page-separator">/</span>
          <span class="page-total">{{ pageCount }}</span>
        </div>
  
        <button
          class="pagination-btn-nav"
          :disabled="currentPage >= pageCount - 1"
          @click="$emit('next')"
          aria-label="下一页"
        >
          <svg width="1em" height="1em" viewBox="0 0 24 24" class="icon-chevron" aria-hidden="true">
            <path fill="currentColor" d="M12.6 12L8.7 8.1q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.6 4.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-4.6 4.6q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7z"/>
          </svg>
        </button>
      </div>
  
      <!-- 桌面端完整版分页 -->
      <div class="desktop-pagination">
        <button
          class="pagination-btn-nav"
          :disabled="currentPage === 0"
          @click="$emit('prev')"
          aria-label="上一页"
        >
          <svg width="1em" height="1em" viewBox="0 0 24 24" class="icon-chevron" aria-hidden="true">
            <path fill="currentColor" d="M10.8 12l3.9 3.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-4.6-4.6q-.15-.15-.212-.325T8.425 12t.063-.375t.212-.325l4.6-4.6q.275-.275.7-.275t.7.275t.275.7t-.275.7z"/>
          </svg>
        </button>
  
        <template v-for="(item, index) in displayedPages" :key="index">
          <button
            v-if="typeof item === 'number'"
            class="pagination-btn-page"
            :class="{ active: currentPage === item - 1 }"
            @click="$emit('go', item - 1)"
            :aria-label="`第 ${item} 页`"
            :aria-current="currentPage === item - 1 ? 'page' : undefined"
          >
            {{ item }}
          </button>
          <span v-else class="pagination-ellipsis">…</span>
        </template>
  
        <button
          class="pagination-btn-nav"
          :disabled="currentPage >= pageCount - 1"
          @click="$emit('next')"
          aria-label="下一页"
        >
          <svg width="1em" height="1em" viewBox="0 0 24 24" class="icon-chevron" aria-hidden="true">
            <path fill="currentColor" d="M12.6 12L8.7 8.1q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.6 4.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-4.6 4.6q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7z"/>
          </svg>
        </button>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { appConfig } from '@/config/app-config';
  
  const props = defineProps<{
    currentPage: number;
    pageCount: number;
  }>();
  
  const emit = defineEmits<{
    prev: [];
    next: [];
    go: [page: number];
  }>();
  
  const { t } = useI18n();
  
  const displayedPages = computed(() => {
    const total = props.pageCount;
    const current = props.currentPage + 1;
    const maxPages = appConfig.newsPagination.maxDisplayedPages || 5;
    const pages: (number | string)[] = [];
  
    if (total <= maxPages) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
  
    pages.push(1);
    const half = Math.floor(maxPages / 2);
  
    if (current <= half + 1) {
      for (let i = 2; i <= Math.min(maxPages - 1, total); i++) pages.push(i);
      if (total > maxPages - 1) { pages.push('…'); pages.push(total); }
    } else if (current >= total - half) {
      pages.push('…');
      for (let i = Math.max(total - maxPages + 2, 2); i <= total; i++) pages.push(i);
    } else {
      pages.push('…');
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push('…');
      pages.push(total);
    }
    return pages;
  });
  </script>
  
  <style scoped>
  /* ============================================================
     NewsPagination 分页样式（Astro 风格）
     ============================================================ */
  
  .pagination-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
    padding: 1rem 0;
    animation: fadeIn 0.3s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  /* -------- 导航按钮 -------- */
  .pagination-btn-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: var(--primary-color, #9e94d8);
    font-size: 1.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  
  .pagination-btn-nav:hover:not(:disabled) {
    background: rgba(158, 148, 216, 0.10);
    transform: scale(1.05);
  }
  
  .pagination-btn-nav:active:not(:disabled) {
    transform: scale(0.85);
  }
  
  .pagination-btn-nav:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  .pagination-btn-nav .icon-chevron {
    font-size: 1.75rem;
    width: 1em;
    height: 1em;
  }
  
  /* -------- 页码按钮 -------- */
  .pagination-btn-page {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: var(--text-secondary, #6b7280);
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  
  .pagination-btn-page:hover:not(.active) {
    background: rgba(158, 148, 216, 0.08);
    transform: scale(1.05);
  }
  
  .pagination-btn-page:active:not(.active) {
    transform: scale(0.85);
  }
  
  .pagination-btn-page.active {
    background: var(--primary-color, #9e94d8);
    color: #fff;
    cursor: default;
    pointer-events: none;
  }
  
  /* -------- 省略号 -------- */
  .pagination-ellipsis {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    color: var(--text-secondary, #6b7280);
    font-size: 1rem;
    flex-shrink: 0;
    user-select: none;
  }
  
  /* -------- 移动端分页 -------- */
  .mobile-pagination {
    display: none;
    align-items: center;
    gap: 0.75rem;
  }
  
  .mobile-pagination .page-indicator {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0 1rem;
    height: 44px;
    border-radius: 12px;
    background: var(--card-bg, #fff);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
  }
  
  .mobile-pagination .page-current {
    font-size: 1rem;
    font-weight: 700;
    color: var(--primary-color, #9e94d8);
  }
  
  .mobile-pagination .page-separator {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }
  
  .mobile-pagination .page-total {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-secondary, #6b7280);
  }
  
  /* -------- 桌面端分页 -------- */
  .desktop-pagination {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  /* ===== 响应式切换 ===== */
  @media (max-width: 768px) {
    .desktop-pagination {
      display: none !important;
    }
  
    .mobile-pagination {
      display: flex !important;
    }
  }
  
  @media (min-width: 769px) {
    .mobile-pagination {
      display: none !important;
    }
  
    .desktop-pagination {
      display: flex !important;
    }
  }
  
  /* ===== 极致小屏 ===== */
  @media (max-width: 480px) {
    .pagination-btn-nav {
      width: 38px;
      height: 38px;
      font-size: 1.5rem;
    }
  
    .pagination-btn-nav .icon-chevron {
      font-size: 1.5rem;
    }
  
    .pagination-btn-page {
      width: 38px;
      height: 38px;
      font-size: 0.875rem;
    }
  
    .pagination-ellipsis {
      width: 38px;
      height: 38px;
      font-size: 0.875rem;
    }
  
    .mobile-pagination .page-indicator {
      height: 38px;
      padding: 0 0.75rem;
    }
  
    .mobile-pagination .page-current,
    .mobile-pagination .page-total {
      font-size: 0.875rem;
    }
  
    .mobile-pagination .page-separator {
      font-size: 0.75rem;
    }
  }
  </style>