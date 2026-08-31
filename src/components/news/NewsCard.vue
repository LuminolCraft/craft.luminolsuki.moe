<template>
    <article
      class="news-item"
      :class="{ pinned: !!item.pinned, 'has-cover': hasImage }"
      @click="$emit('click', item)"
    >
      <div class="news-item-body">
        <h3 class="news-item-title">{{ item.title }}</h3>
  
        <div class="news-item-meta">
          <span v-if="item.pinned" class="pinned-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="m16 12l2 2v2h-5v6l-1 1l-1-1v-6H6v-2l2-2V5H7V3h10v2h-1zm-7.15 2h6.3L14 12.85V5h-4v7.85z" />
            </svg>
            置顶
          </span>
          <span class="meta-date">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M5 22q-.825 0-1.412-.587T3 20V6q0-.825.588-1.412T5 4h1V3q0-.425.288-.712T7 2t.713.288T8 3v1h8V3q0-.425.288-.712T17 2t.713.288T18 3v1h1q.825 0 1.413.588T21 6v14q0 .825-.587 1.413T19 22zm0-2h14V10H5zM5 8h14V6H5z" />
            </svg>
            {{ formattedDate }}
          </span>
        </div>
  
        <p class="news-item-desc">{{ excerpt }}</p>
  
        <div v-if="item.tags?.length" class="news-item-tags">
          <span
            v-for="tag in visibleTags"
            :key="tag"
            class="tag-item"
            @click.stop="$emit('tag-click', tag)"
          >#{{ tag }}</span>
          <span
            v-if="item.tags.length > maxCardTags"
            class="tag-item tag-item-more"
            :title="item.tags.slice(maxCardTags).map((t) => '#' + t).join(' ')"
          >+{{ item.tags.length - maxCardTags }}</span>
        </div>
      </div>
  
      <div
        v-if="hasImage"
        class="news-item-cover"
        :style="{ backgroundImage: `url('${cleanImageUrl(item.image)}')` }"
      >
        <div class="news-item-cover-mask"></div>
        <div class="news-item-cover-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.6 12L8.7 8.1q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.6 4.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-4.6 4.6q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7z" />
          </svg>
        </div>
      </div>
    </article>
  </template>
  
  <script setup lang="ts">
  import { computed } from 'vue';
  import type { NewsItem } from '@/types/news';
  
  const props = defineProps<{
    item: NewsItem;
    maxCardTags?: number;
  }>();
  
  const emit = defineEmits<{
    click: [item: NewsItem];
    'tag-click': [tag: string];
  }>();
  
  const maxCardTags = computed(() => props.maxCardTags ?? 3);
  const hasImage = computed(() => !!props.item.image && /\.(jpe?g|png|gif|webp|avif|bmp|svg|ico|heic|heif|apng|jfif)(?:$|[?#])/i.test(props.item.image));
  
  const formattedDate = computed(() =>
    new Date(props.item.date).toLocaleDateString('zh-CN')
  );
  
  const excerpt = computed(() => {
    const raw = (props.item.summary || props.item.markdownContent || '').toString();
    const plain = raw
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`\n]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/!\[[^\]]*\]\[[^\]]*\]/g, ' ')
      .replace(/<img\b[^>]*>/gi, ' ')
      .replace(/<video\b[\s\S]*?<\/video>/gi, ' ')
      .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, ' ')
      .replace(/<\/?[^>]+>/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/^#{1,6}\s+/gm, ' ')
      .replace(/^\s*[-*+>\d.]+\s+/gm, ' ')
      .replace(/[*_~|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!plain) return '暂无内容';
    const maxLen = 120;
    return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain;
  });
  
  const visibleTags = computed(() => props.item.tags?.slice(0, maxCardTags.value) ?? []);
  
  const cleanImageUrl = (url: string | undefined) => (url ? url.replace(/["']/g, '') : '');
  </script>
  
  <style scoped>
  /* ============================================================
     NewsCard 卡片样式（含桌面端 + 移动端响应式）
     ============================================================ */
  
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
    border: 1px solid rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  
  .news-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
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
    min-width: 0;
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
    overflow-wrap: anywhere;
    word-break: break-word;
    max-width: 100%;
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
    cursor: pointer;
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
  
  /* 无封面：正文自己决定高度 */
  .news-item:not(.has-cover) {
    flex-direction: column;
  }
  .news-item:not(.has-cover) .news-item-body {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 1.25rem 1.5rem;
  }
  
  /* ===== 桌面端 (>=768px) ===== */
  @media (min-width: 768px) {
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
  
    .news-item:not(.has-cover) {
      min-height: 0;
    }
  
    .news-item:not(.has-cover) .news-item-body {
      width: 100%;
      max-width: 100%;
      padding: 1.5rem 1.75rem;
    }
  }
  
  /* ===== 移动端 (<768px) ===== */
  @media (max-width: 767px) {
    .news-item {
      min-height: 360px;
      border-radius: 12px;
      flex-direction: column-reverse !important;
    }
  
    .news-item:active {
      transform: scale(0.98);
    }
  
    .news-item .news-item-cover {
      width: 100% !important;
      aspect-ratio: 2 / 1 !important;
      position: relative !important;
      top: auto !important;
      right: auto !important;
      bottom: auto !important;
      left: auto !important;
      border-radius: 12px 12px 0 0 !important;
      flex-shrink: 0;
      min-height: 0;
    }
  
    .news-item .news-item-body {
      width: 100% !important;
      max-width: 100% !important;
      padding: 1.25rem 1.25rem 1.25rem 1.25rem !important;
      flex: 1 1 auto;
      min-height: 0;
    }
  
    .news-item-title {
      font-size: 1.25rem !important;
      line-height: 1.4 !important;
      padding-left: 0 !important;
      margin-bottom: 0.65rem !important;
    }
    .news-item-title::before {
      display: none !important;
    }
  
    .news-item-meta {
      font-size: 0.75rem !important;
      gap: 0.4rem 0.75rem !important;
      margin-bottom: 0.6rem !important;
    }
  
    .pinned-badge {
      font-size: 0.7rem !important;
      padding: 0.15rem 0.45rem !important;
    }
  
    .news-item-desc {
      font-size: 0.9rem !important;
      line-height: 1.6 !important;
      -webkit-line-clamp: 2 !important;
      line-clamp: 2 !important;
      flex: 0 1 auto;
      margin-bottom: 0.5rem;
    }
  
    .news-item-tags {
      padding-top: 0.65rem !important;
      gap: 0.3rem !important;
      margin-top: auto;
    }
  
    .tag-item {
      font-size: 0.7rem !important;
      padding: 0.15rem 0.55rem !important;
    }
  
    .news-item:not(.has-cover) {
      flex-direction: column !important;
      min-height: auto !important;
    }
    .news-item:not(.has-cover) .news-item-body {
      padding: 1.25rem 1.25rem !important;
    }
  }
  
  /* 极致小屏 (<=480px) */
  @media (max-width: 480px) {
    .news-item {
      min-height: 300px;
      border-radius: 10px;
    }
  
    .news-item .news-item-body {
      padding: 1rem 1rem 1rem 1rem !important;
    }
  
    .news-item-title {
      font-size: 1.1rem !important;
      margin-bottom: 0.5rem !important;
    }
  
    .news-item-meta {
      font-size: 0.7rem !important;
      gap: 0.3rem 0.5rem !important;
      margin-bottom: 0.4rem !important;
    }
  
    .news-item-desc {
      font-size: 0.85rem !important;
      -webkit-line-clamp: 2 !important;
      line-clamp: 2 !important;
    }
  
    .news-item-tags {
      padding-top: 0.5rem !important;
      gap: 0.25rem !important;
    }
  
    .tag-item {
      font-size: 0.65rem !important;
      padding: 0.1rem 0.45rem !important;
    }
  
    .news-item .news-item-cover {
      aspect-ratio: 2 / 1 !important;
      border-radius: 10px 10px 0 0 !important;
    }
  }

  
  </style>