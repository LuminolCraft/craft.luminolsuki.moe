<template>
  <header>
    <section class="news-section" ref="newsSectionRef">
      <div class="intro">
        <h2>{{ t('news.list.title') }}</h2>
        <p>{{ t('news.list.subtitle') }}</p>
      </div>

      <div class="news-toolbar">
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
          <button id="news-search-btn" type="button" class="btn" @click="filterNews">
            <i class="fas fa-search"></i>
            <span>{{ t('news.list.searchButton') }}</span>
          </button>
        </div>

        <div class="tag-filter" ref="tagFilterRef">
          <button
            id="tag-filter-trigger"
            type="button"
            class="tag-filter-trigger"
            @click.stop="tagDropdownOpen = !tagDropdownOpen"
          >
            <span class="tag-filter-label">{{ t('news.list.tagFilter') }}</span>
            <span class="tag-filter-value">
              <template v-if="selectedTags.length === 0">{{ t('news.list.allTags') }}</template>
              <template v-else>已选 {{ selectedTags.length }} 个</template>
            </span>
            <span class="tag-filter-caret" aria-hidden="true">{{ tagDropdownOpen ? '▴' : '▾' }}</span>
          </button>

          <!-- <div v-if="selectedTags.length" class="tag-selected-row">
            <span v-for="tag in selectedTags" :key="tag" class="tag-selected-chip">
              #{{ tag }}
              <button type="button" class="tag-remove" @click="toggleTag(tag)">×</button>
            </span>
            <button type="button" class="tag-clear-all" @click="clearTags">清除</button>
          </div> -->

          <div v-show="tagDropdownOpen" class="tag-dropdown" @click.stop>
            <input
              v-model="tagSearch"
              type="search"
              class="tag-dropdown-search"
              placeholder="搜索标签…"
              autocomplete="off"
            />
            <div class="tag-dropdown-list">
              <label v-for="tag in filteredUniqueTags" :key="tag" class="tag-option">
                <input
                  type="checkbox"
                  :checked="selectedTags.includes(tag)"
                  @change="toggleTag(tag)"
                />
                <span>#{{ tag }}</span>
              </label>
              <p v-if="filteredUniqueTags.length === 0" class="tag-empty">无匹配标签</p>
            </div>
          </div>
        </div>
      </div>

      <div id="news-grid" class="news-grid" v-lenis-scroll>
        <template v-if="isLoading">
          <div
            v-for="n in itemsPerPage"
            :key="'skeleton-' + n"
            class="skeleton-card"
          >
            <div class="skeleton-block skeleton-title"><div class="skeleton-shimmer"></div></div>
            <div class="skeleton-meta">
              <div class="skeleton-block skeleton-date"><div class="skeleton-shimmer"></div></div>
              <div class="skeleton-block skeleton-tag"><div class="skeleton-shimmer"></div></div>
            </div>
            <div class="skeleton-block skeleton-img"><div class="skeleton-shimmer"></div></div>
            <div class="skeleton-content">
              <div class="skeleton-block skeleton-line"><div class="skeleton-shimmer"></div></div>
              <div class="skeleton-block skeleton-line"><div class="skeleton-shimmer"></div></div>
              <div class="skeleton-block skeleton-line"><div class="skeleton-shimmer"></div></div>
            </div>
          </div>
        </template>

        <template v-else>
          <article
            v-for="item in paginatedNews"
            :key="item.id"
            class="news-item"
            :class="{ pinned: !!item.pinned, 'has-cover': hasImage(item) }"
            @click="goToDetail(item)"
          >
            <div class="news-item-body">
              <h3 class="news-item-title">{{ item.title }}</h3>

              <div class="news-item-meta">
                <span v-if="item.pinned" class="pinned-badge">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="m16 12l2 2v2h-5v6l-1 1l-1-1v-6H6v-2l2-2V5H7V3h10v2h-1zm-7.15 2h6.3L14 12.85V5h-4v7.85z" />
                  </svg>
                  置顶
                </span>
                <span class="meta-date">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M5 22q-.825 0-1.412-.587T3 20V6q0-.825.588-1.412T5 4h1V3q0-.425.288-.712T7 2t.713.288T8 3v1h8V3q0-.425.288-.712T17 2t.713.288T18 3v1h1q.825 0 1.413.588T21 6v14q0 .825-.587 1.413T19 22zm0-2h14V10H5zM5 8h14V6H5z" />
                  </svg>
                  {{ new Date(item.date).toLocaleDateString('zh-CN') }}
                </span>
              </div>

              <p class="news-item-desc">{{ getPlainExcerpt(item) }}</p>

              <div v-if="item.tags?.length" class="news-item-tags">
                <span
                  v-for="tag in visibleTags(item.tags)"
                  :key="tag"
                  class="tag-item"
                  @click.stop="toggleTag(tag)"
                >#{{ tag }}</span>
                <span
                  v-if="item.tags.length > maxCardTags"
                  class="tag-item tag-item-more"
                  :title="item.tags.slice(maxCardTags).map((t) => '#' + t).join(' ')"
                >+{{ item.tags.length - maxCardTags }}</span>
              </div>
            </div>

            <div
              v-if="hasImage(item)"
              class="news-item-cover"
              :style="{ backgroundImage: `url('${cleanImageUrl(item.image)}')` }"
            >
              <div class="news-item-cover-mask"></div>
              <div class="news-item-cover-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12.6 12L8.7 8.1q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.6 4.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-4.6 4.6q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7z" />
                </svg>
              </div>
            </div>
          </article>

          <div v-if="loadError" class="error-message">
            <h3>{{ t('news.list.error.title') }}</h3>
            <p>{{ t('news.list.error.description') }}</p>
          </div>
        </template>
      </div>

      <div id="news-pagination" class="news-pagination" v-if="!isLoading && pageCount > 0">
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
          :disabled="currentPage >= pageCount - 1"
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
    margin-top: var(--vercel-space-10, 40px);
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
.news-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 16px;
    align-items: flex-start;
    justify-content: center;
    max-width: 900px;
    margin: 0 auto 32px;
}

.news-search {
    display: flex;
    gap: 10px;
    max-width: 520px;
    margin: 0;
}

.news-search input[type='search'] {
    min-width: 0;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    color: var(--text-color);
    background: var(--card-bg);
    box-shadow: var(--vercel-shadow-border, 0 0 0 1px rgba(0, 0, 0, 0.08));
    outline: none;
}

.news-search button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: none;
    border-radius: 10px;
    background: var(--primary-color);
    color: var(--text-primary, #fff);
    font-size: 14px;
    cursor: pointer;
}

/* 标签筛选器 */
.tag-filter {
    position: relative;
    min-width: 180px;
    margin: 0;
    text-align: left;
    max-width: none;
}

.tag-filter-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    background: var(--card-bg);
    box-shadow: var(--vercel-shadow-border, 0 0 0 1px rgba(0, 0, 0, 0.08));
    color: var(--text-color);
    font-size: 14px;
    cursor: pointer;
}

.tag-filter-label {
    color: var(--text-secondary);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.tag-filter-value {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tag-selected-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
}

.tag-selected-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 9999px;
    background: rgba(158, 148, 216, 0.15);
    color: var(--primary-color, #a78bfa);
    font-size: 12px;
}

.tag-remove,
.tag-clear-all {
    border: none;
    background: none;
    cursor: pointer;
    color: inherit;
    font-size: 12px;
}

.tag-dropdown {
    position: absolute;
    z-index: 40;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    border-radius: 12px;
    background: var(--card-bg);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14);
    overflow: hidden;
}

.tag-dropdown-search {
    width: calc(100% - 16px);
    margin: 8px;
    padding: 8px 12px;
    border: none;
    border-radius: 8px;
    background: rgba(158, 148, 216, 0.08);
    color: var(--text-color);
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
}

.tag-dropdown-list {
    max-height: 240px;
    overflow-y: auto;
    padding: 0 8px 8px;
}

.tag-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 6px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
}

.tag-empty {
    margin: 0;
    padding: 16px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
}

/* 新闻网格 - Vercel Card Grid */
.news-grid {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 900px;
    margin: 0 auto;
}

.news-item {
    --cover-width: 30%;
    position: relative;
    display: flex;
    flex-direction: column-reverse;
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    background: var(--card-bg);
    box-shadow: var(--vercel-shadow-card, 0 4px 16px rgba(0, 0, 0, 0.06));
    min-height: 0;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    flex-shrink: 0;
}

.news-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--vercel-shadow-hover, 0 10px 28px rgba(0, 0, 0, 0.1));
}

.news-item.pinned {
    box-shadow: var(--vercel-shadow-card, 0 4px 16px rgba(0, 0, 0, 0.06)),
        inset 3px 0 0 var(--primary-color);
}

.news-item-body {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    width: 100%;
    padding: 1.25rem;
    min-height: 0;
}

.news-item-title {
    position: relative;
    margin: 0 0 0.75rem;
    font-size: clamp(1.15rem, 2.5vw, 1.5rem);
    font-weight: 700;
    line-height: 1.35;
    color: var(--text-color);
    transition: color 0.2s ease;
}

.news-item:hover .news-item-title {
    color: var(--primary-color);
}

.news-item-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    margin-bottom: 0.75rem;
    color: var(--text-secondary);
    font-size: 0.8125rem;
    font-weight: 500;
}

.pinned-badge,
.meta-date {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
}

.pinned-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    background: rgba(158, 148, 216, 0.18);
    color: var(--primary-color);
    font-weight: 700;
    font-size: 0.75rem;
}

.news-item-desc {
    margin: 0;
    flex: 1;
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--text-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.news-item-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: auto;
    padding-top: 0.85rem;
}

.tag-item {
    display: inline-flex;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    background: rgba(158, 148, 216, 0.12);
    color: var(--primary-color, #a78bfa);
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s ease;
    text-decoration: none;
}

.tag-item:hover {
    background: var(--primary-color);
    color: #fff;
}

.tag-item-more {
    opacity: 0.75;
    cursor: default;
}
.tag-item-more:hover {
    background: rgba(158, 148, 216, 0.12);
    color: var(--primary-color, #a78bfa);
}

.news-item-cover {
    position: relative;
    width: 100%;
    aspect-ratio: 2 / 1;
    background-size: cover;
    background-position: center;
    overflow: hidden;
    flex-shrink: 0;
}

/* 无封面：正文自己决定高度，不被封面规则影响 */
.news-item:not(.has-cover) {
    flex-direction: column;
}
.news-item:not(.has-cover) .news-item-body {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 1.25rem 1.5rem;
}

.news-item-body {
    min-width: 0;
    flex: 1 1 auto;
}

.news-item-desc {
    min-width: 0;
    max-width: 100%;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    word-break: break-word;
}

.news-item-cover-mask {
    position: absolute;
    inset: 0;
    z-index: 1;
    transition: background 0.2s ease;
    pointer-events: none;
}

.news-item:hover .news-item-cover-mask {
    background: rgba(0, 0, 0, 0.28);
}

.news-item-cover-icon {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    opacity: 0;
    transform: scale(0.6);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
}

.news-item:hover .news-item-cover-icon {
    opacity: 1;
    transform: scale(1);
}

/* ===== 桌面端 (>=768px) 卡片布局 ===== */
@media (min-width: 768px) {
    /* 有图：左文右图 */
    .news-item.has-cover {
        min-height: 200px;
    }

    .news-item.has-cover .news-item-body {
        width: calc(100% - var(--cover-width) - 1.5rem);
        max-width: calc(100% - var(--cover-width) - 1.5rem);
        padding: 1.5rem 1.75rem;
    }

    .news-item.has-cover .news-item-cover {
        position: absolute;
        top: 1rem;
        right: 1rem;
        bottom: 1rem;
        width: var(--cover-width);
        height: auto;
        aspect-ratio: auto;
        border-radius: 12px;
        flex-shrink: 0;
    }

    /* 标题左侧竖条装饰（桌面端） */
    .news-item-title {
        padding-left: 0.85rem;
    }

    .news-item-title::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0.35em;
        width: 4px;
        height: 1.15rem;
        border-radius: 4px;
        background: var(--primary-color);
    }

    /* 无图：不要 min-height */
    .news-item:not(.has-cover) {
        min-height: 0;
    }

    .news-item:not(.has-cover) .news-item-body {
        width: 100%;
        max-width: 100%;
        padding: 1.5rem 1.75rem;
    }
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
    import { useRouter, useRoute } from 'vue-router';
    import { useI18n } from 'vue-i18n';
    import { marked } from 'marked';
    import gsap from 'gsap';
    import { ScrollTrigger } from 'gsap/ScrollTrigger';
    import { useLastViewedCookie } from '../composables/useLastViewedCookie';
    import LastViewedPopup from '../components/LastViewedPopup.vue';
    import CookieConsentBanner from '../components/CookieConsentBanner.vue';
    import { appConfig } from '../config/app-config';
    import { EASINGS, STAGGERS, DURATIONS } from '@/gsap';
    import type { LocationQueryRaw } from 'vue-router';
    import { NewsManager } from '@/utils/news/news-manager';
    import type { NewsItem } from '@/types/news';
    
    gsap.registerPlugin(ScrollTrigger);
    
    export default defineComponent({
      name: 'News',
      components: { LastViewedPopup, CookieConsentBanner },
    
      setup() {
        const router = useRouter();
        const route = useRoute();
        const { t } = useI18n();
        const { setLastViewedNews } = useLastViewedCookie();
        const newsManager = new NewsManager();
    
        const searchQuery = ref('');
        /** 多标签，对应 URL ?tags=a,b,c */
        const selectedTags = ref<string[]>([]);
        const tagDropdownOpen = ref(false);
        const tagSearch = ref('');
        const tagFilterRef = ref<HTMLElement | null>(null);
        const currentPage = ref(0);
        const loadError = ref(false);
        const refreshTrigger = ref(0);
        const isLoading = ref(true);
        const newsSectionRef = ref<HTMLElement | null>(null);
    
        const itemsPerPage = computed(() => newsManager.itemsPerPage);
        const isSyncing = computed(() => newsManager.isSyncing);
    
        watch(
          () => newsManager.currentPage,
          (newPage) => {
            currentPage.value = newPage;
          },
        );
    
        watch(
          () => newsManager.loadError,
          (newError) => {
            loadError.value = newError;
          },
        );
    
      const uniqueTags = computed(() => {
        refreshTrigger.value;
        return newsManager.getUniqueTags(newsManager.allNewsWithContent);
      });
    
      const filteredUniqueTags = computed(() => {
        const q = tagSearch.value.trim().toLowerCase();
        if (!q) return uniqueTags.value;
        return uniqueTags.value.filter((tag) => tag.toLowerCase().includes(q));
      });

      const filterNews = () => {
        newsManager.filterNews(selectedTags.value, searchQuery.value);
        refreshTrigger.value++;
        syncTagsToUrl(selectedTags.value);
      };

      const toggleTag = (tag: string) => {
        const set = new Set(selectedTags.value);
        if (set.has(tag)) set.delete(tag);
        else set.add(tag);
        selectedTags.value = Array.from(set);
        filterNews();
      };

      const clearTags = () => {
        selectedTags.value = [];
        filterNews();
      };

      const onDocClick = (e: MouseEvent) => {
        if (!tagFilterRef.value?.contains(e.target as Node)) {
          tagDropdownOpen.value = false;
        }
      };

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
            for (let i = Math.max(total - maxPages + 2, 2); i <= total; i++) {
              pages.push(i);
            }
          } else {
            pages.push('...');
            for (let i = current - 1; i <= current + 1; i++) pages.push(i);
            pages.push('...');
            pages.push(total);
          }
    
          return pages;
        });
    
        /** 从 URL ?tags=a,b,c 解析 */
        const parseTagsFromQuery = (): string[] => {
          const q = route.query.tags;
          if (q == null || q === '') return [];
          const raw = Array.isArray(q) ? q.join(',') : String(q);
          return raw
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        };
    
        /** 把选中标签写回 URL（replace，不堆历史） */
        const syncTagsToUrl = (tags: string[]) => {
          const nextQuery: LocationQueryRaw = { ...route.query };
                
          if (tags.length > 0) {
            nextQuery.tags = tags.join(',');
          } else {
            delete nextQuery.tags;
          }
        
          const current =
            typeof route.query.tags === 'string'
              ? route.query.tags
              : Array.isArray(route.query.tags)
                ? route.query.tags.filter(Boolean).join(',')
                : '';
          const next = tags.join(',');
          if (current === next) return;
        
          router.replace({ query: nextQuery });
        };
        
    
    
        // 浏览器前进/后退：从 URL 恢复筛选
        watch(
          () => route.query.tags,
          () => {
            const fromUrl = parseTagsFromQuery();
            const same =
              fromUrl.length === selectedTags.value.length &&
              fromUrl.every((t) => selectedTags.value.includes(t));
            if (same) return;
            selectedTags.value = fromUrl;
            newsManager.filterNews(selectedTags.value, searchQuery.value);
            refreshTrigger.value++;
          },
        );
    
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
    
        const IMAGE_EXT_RE =
          /\.(?:jpe?g|png|gif|webp|avif|bmp|svg|ico|heic|heif|apng|jfif)(?:$|[?#])/i;

        const hasImage = (item: NewsItem) => {
          const url = cleanImageUrl(item.image);
          if (!url) return false;
        
          // 相对路径或同源路径
          if (url.startsWith('/') || url.startsWith('./')) {
            return IMAGE_EXT_RE.test(url);
          }
        
          try {
            const u = new URL(url);
            // 只接受 http(s)
            if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
          
            // 路径或完整 href 里带常见图片后缀（含 avif / webp）
            if (IMAGE_EXT_RE.test(u.pathname) || IMAGE_EXT_RE.test(url)) return true;
          
            // 部分图床无后缀，但带明显图片参数（可选）
            if (/[?&](?:format|fm)=(jpg|jpeg|png|gif|webp|avif)\b/i.test(u.search)) {
              return true;
            }
          
            return false;
          } catch {
            // 不是合法 URL，再试一次纯字符串匹配
            return IMAGE_EXT_RE.test(url);
          }
        };
    
        const renderShortContent = (item: NewsItem) => {
          const shortContent = item.summary || item.markdownContent || '暂无内容';
          const trimmed =
            shortContent.length > 100
              ? `${shortContent.substring(0, 100)}...`
              : shortContent;
    
          if (typeof marked !== 'undefined') {
            return marked.parse(trimmed);
          }
    
          return newsManager.simpleMarkdownRender(trimmed);
        };
  
        const maxCardTags = 3;
        
        const getPlainExcerpt = (item: NewsItem, maxLen = 120) => {
          // 有 summary 优先，避免拿整篇 md
          const raw = (item.summary || item.markdownContent || '').toString();

          const plain = raw
            // 代码块
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`[^`\n]*`/g, ' ')
            // Markdown 图片（含标题、跨行）
            .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
            .replace(/!\[[^\]]*\]\[[^\]]*\]/g, ' ')
            // HTML 图片 / 媒体
            .replace(/<img\b[^>]*>/gi, ' ')
            .replace(/<video\b[\s\S]*?<\/video>/gi, ' ')
            .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, ' ')
            // 其余 HTML 标签
            .replace(/<\/?[^>]+>/g, ' ')
            // Markdown 链接保留文字
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
            // 引用图床 / 超长 URL（防止撑破布局）
            .replace(/https?:\/\/\S+/gi, ' ')
            // 标题/列表等标记
            .replace(/^#{1,6}\s+/gm, ' ')
            .replace(/^\s*[-*+>\d.]+\s+/gm, ' ')
            .replace(/[*_~|]+/g, ' ')
            // 空白归一
            .replace(/\s+/g, ' ')
            .trim();

          if (!plain) return '暂无内容';
          return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain;
        };

        const visibleTags = (tags: string[]) => tags.slice(0, maxCardTags);

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
    
              mm.add(
                {
                  isDesktop: '(min-width: 769px)',
                  isMobile: '(max-width: 768px)',
                  reduceMotion: '(prefers-reduced-motion: reduce)',
                },
                (context) => {
                  const reduceMotion = context.conditions?.reduceMotion;
                  if (reduceMotion) return;
    
                  gsap.to('.skeleton-shimmer', {
                    xPercent: 100,
                    repeat: -1,
                    yoyo: true,
                    ease: EASINGS.smooth,
                    duration: 1.5,
                  });
                },
              );
            }, newsSectionRef.value);
          }
    
          try {
            await newsManager.initializeApp();
          } catch (error) {
            console.error('初始化新闻失败:', error);
            loadError.value = newsManager.loadError;
          } finally {
            isLoading.value = false;
          }

          document.addEventListener('click', onDocClick);
          selectedTags.value = parseTagsFromQuery();
          // 首次应用筛选时不要再无意义写 URL 也行；filterNews 内会 sync
          newsManager.filterNews(selectedTags.value, searchQuery.value);
          refreshTrigger.value++;
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
    
            const reduceMotion = window.matchMedia(
              '(prefers-reduced-motion: reduce)',
            ).matches;
    
            if (reduceMotion) {
              gsap.set('.skeleton-card', { autoAlpha: 0 });
              gsap.set('.news-item', { autoAlpha: 1 });
              return;
            }
    
            tl.to('.skeleton-card', { autoAlpha: 0, duration: DURATIONS.exit }).fromTo(
              '.news-item',
              { autoAlpha: 0, y: 20 },
              {
                autoAlpha: 1,
                y: 0,
                stagger: STAGGERS.cards,
                duration: DURATIONS.entrance,
              },
              '+=0.05',
            );
          }
        });
    
        onUnmounted(() => {
          document.removeEventListener('click', onDocClick);
          newsManager.dispose();
          ctx?.revert();
          mm?.revert();
        });
    
        return {
        searchQuery,
        selectedTags,
        currentPage,
        uniqueTags,
        filteredUniqueTags,
        tagDropdownOpen,
        tagSearch,
        tagFilterRef,
        paginatedNews,
        pageCount,
        displayedPages,
        loadError,
        isLoading,
        isSyncing,
        newsSectionRef,
        itemsPerPage,
        maxCardTags,
        getPlainExcerpt,
        visibleTags,
        filterNews,
        toggleTag,
        clearTags,
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