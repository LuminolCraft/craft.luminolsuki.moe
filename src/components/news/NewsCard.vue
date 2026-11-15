<template>
    <article
      class="news-item"
      :class="{
        pinned: item.pinned,
        'has-cover': hasImage,
        'no-cover': !hasImage,
        'list-item': layout === 'list',
        important: item.isImportant,
      }"
      role="button"
      tabindex="0"
      @click="$emit('click', item)"
      @keydown.enter="$emit('click', item)"
      @keydown.space.prevent="$emit('click', item)"
    >
      <div class="news-item-body">
        <h3 class="news-item-title">{{ item.title }}</h3>

        <div class="news-item-meta">
          <span v-if="item.pinned" class="pinned-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="m16 12l2 2v2h-5v6l-1 1l-1-1v-6H6v-2l2-2V5H7V3h10v2h-1zm-7.15 2h6.3L14 12.85V5h-4v7.85z" />
            </svg>
            {{ t('news.card.pinned') }}
          </span>
          <span v-if="item.isImportant" class="important-badge">{{ t('news.card.important') }}</span>
          <span class="meta-category">{{ categoryLabel }}</span>
          <span class="meta-date">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
            </svg>
            {{ formattedDate }}
          </span>
          <span v-if="readCount !== undefined" class="meta-reads">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {{ readCount.toLocaleString('zh-CN') }}
          </span>
          <span class="meta-stats">{{ statsLabel }}</span>
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
        :style="{ backgroundImage: `url('${cleanImageUrl(item.coverUrl)}')` }"
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
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import type { NewsListItem } from '@/types/news'

  const props = defineProps<{
    item: NewsListItem
    maxCardTags?: number
    layout?: 'list' | 'grid'
    /** 阅读次数表（key = 新闻 id）；条目缺失时该卡片不显示次数。 */
    readCounts?: Record<number, number>
  }>()

  defineEmits<{
    click: [item: NewsListItem]
    'tag-click': [tag: string]
  }>()

  const { t } = useI18n()

  const maxCardTags = computed(() => props.maxCardTags ?? 3)
  const readCount = computed(() => props.readCounts?.[props.item.id])
  const hasImage = computed(
    () =>
      !!props.item.coverUrl &&
      /\.(jpe?g|png|gif|webp|avif|bmp|svg|ico|heic|heif|apng|jfif)(?:$|[?#])/i.test(props.item.coverUrl),
  )

  const formattedDate = computed(() =>
    props.item.publishedAt ? new Date(props.item.publishedAt).toLocaleDateString('zh-CN') : '',
  )

  /** 分类显示名走 i18n；未知分类直接显示原值，不吞掉。 */
  const categoryLabel = computed(() => {
    const key = `news.category.${props.item.category}`
    const label = t(key)
    return label === key ? props.item.category : label
  })

  /** 字数与阅读时长（服务端已算好，卡片只做格式化）。 */
  const statsLabel = computed(() =>
    t('news.card.stats', { words: props.item.wordCount, minutes: props.item.readingMinutes }),
  )

  /** 摘要：服务端在 description 为空时已用正文首段兜底，这里只做空值处理。 */
  const excerpt = computed(() => props.item.description || t('news.list.empty.excerpt'))

  const visibleTags = computed(() => props.item.tags?.slice(0, maxCardTags.value) ?? [])

  const cleanImageUrl = (url: string | null | undefined) => (url ? url.replace(/["']/g, '') : '')
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
  .important-badge,
  .meta-category,
  .meta-date,
  .meta-reads,
  .meta-stats {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  /* 阅读数图标与数字同一层次，显式吃主题次级色，深浅主题都不会漂成白色 */
  .meta-reads {
    color: var(--text-secondary, rgba(60, 60, 60, 0.66));
  }

  /* 分类：与标签区分开——分类是「内容性质」，用描边胶囊；标签用实底 */
  .meta-category {
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    border: 1px solid var(--divider-color, rgba(158, 148, 216, 0.35));
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  /* 重要公告：用 accent 色而非 primary，避免与置顶徽标撞色 */
  .important-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    background: color-mix(in srgb, var(--accent-color, #f59e0b) 18%, transparent);
    color: var(--accent-color, #f59e0b);
    font-weight: 700;
    font-size: 0.75rem;
  }

  /* 字数 / 阅读时长：弱化到第三层级，不与日期抢注意力 */
  .meta-stats {
    color: var(--text-secondary);
    opacity: 0.85;
  }

  .news-item.important {
    box-shadow: var(--vercel-shadow-card, 0 4px 16px rgba(0, 0, 0, 0.06)),
      inset 3px 0 0 var(--accent-color, #f59e0b);
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

  /* 列表模式无封面：整行都是正文，不按配图卡的两行截断 */
  .news-item.list-item.no-cover .news-item-body {
    width: 100%;
    max-width: 100%;
  }
  .news-item.list-item.no-cover .news-item-desc {
    -webkit-line-clamp: 5 !important;
    line-clamp: 5 !important;
  }

  :deep(.list-mode) .news-item {
  /* 列表模式：水平排列，封面在右侧 */
  flex-direction: row !important;
  min-height: 180px;
}

:deep(.list-mode) .news-item .news-item-body {
  width: calc(100% - 30% - 1.5rem) !important;
  max-width: calc(100% - 30% - 1.5rem) !important;
  padding: 1.5rem 1.75rem !important;
}

:deep(.list-mode) .news-item .news-item-cover {
  position: absolute !important;
  top: 1rem;
  right: 1rem;
  bottom: 1rem;
  width: 30% !important;
  height: auto !important;
  aspect-ratio: auto !important;
  border-radius: 12px !important;
  flex-shrink: 0;
}

:deep(.grid-mode) .news-item {
  flex-direction: column-reverse !important;
  height: 100% !important;
  min-height: 360px;
}

:deep(.grid-mode) .news-item .news-item-body {
  width: 100% !important;
  max-width: 100% !important;
  padding: 1.25rem 1.25rem !important;
  flex: 1 1 auto;
}

:deep(.grid-mode) .news-item .news-item-cover {
  position: relative !important;
  width: 100% !important;
  aspect-ratio: 2 / 1 !important;
  border-radius: 12px 12px 0 0 !important;
  flex-shrink: 0;
}

/* 移动端列表模式特殊调整（若需要） */
@media (max-width: 768px) {
  :deep(.list-mode) .news-item {
    flex-direction: row !important;
    min-height: auto;
  }
  :deep(.list-mode) .news-item .news-item-body {
    width: calc(100% - 9rem - 0.75rem) !important;
    padding: 0.75rem !important;
  }
  :deep(.list-mode) .news-item .news-item-cover {
    width: 9rem !important;
    top: 0.5rem !important;
    right: 0.5rem !important;
    bottom: 0.5rem !important;
    border-radius: 0.75rem !important;
  }
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