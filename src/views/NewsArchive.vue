<template>
  <section class="news-archive">
    <div class="archive-intro">
      <h1>{{ t('news.archive.title') }}</h1>
      <p>{{ t('news.archive.subtitle') }}</p>
    </div>

    <div v-if="loading" class="archive-state">{{ t('news.archive.loading') }}</div>

    <div v-else-if="error" class="archive-state">
      <p>{{ t('news.archive.error') }}</p>
      <button type="button" class="archive-retry" @click="load">{{ t('news.archive.retry') }}</button>
    </div>

    <div v-else-if="groups.length === 0" class="archive-state">{{ t('news.archive.empty') }}</div>

    <div v-else class="archive-timeline">
      <section v-for="group in groups" :key="group.month" class="archive-month">
        <h2 class="archive-month-title">
          <span class="archive-month-label">{{ group.month }}</span>
          <span class="archive-month-count">{{ t('news.archive.count', { count: group.items.length }) }}</span>
        </h2>

        <ul class="archive-list">
          <li v-for="item in group.items" :key="item.id" class="archive-item">
            <router-link :to="{ name: 'news-detail', params: { slug: item.slug } }" class="archive-link">
              <span class="archive-date">{{ formatDay(item.publishedAt) }}</span>
              <span class="archive-item-title">{{ item.title }}</span>
              <span class="archive-category">{{ categoryLabel(item.category) }}</span>
              <span class="archive-words">{{ t('news.card.stats', { words: item.wordCount, minutes: item.readingMinutes }) }}</span>
            </router-link>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NewsCategory, NewsListItem } from '@/types/news'
import { fetchNewsList } from '@/utils/news/news-api'

const { t } = useI18n()

const items = ref<NewsListItem[]>([])
const loading = ref(true)
const error = ref(false)

/** 归档一次取满（当前 39 篇；超过一页时这里会退化为「最近 50 篇」，需接分页）。 */
const ARCHIVE_LIMIT = 50

interface MonthGroup {
  month: string
  items: NewsListItem[]
}

/** 按 `YYYY-MM` 分组，组内按发布时间倒序（服务端已排好，这里只做分桶）。 */
const groups = computed<MonthGroup[]>(() => {
  const buckets = new Map<string, NewsListItem[]>()
  for (const item of items.value) {
    if (!item.publishedAt) continue
    const month = new Date(item.publishedAt).toISOString().slice(0, 7)
    const bucket = buckets.get(month)
    if (bucket) bucket.push(item)
    else buckets.set(month, [item])
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, groupItems]) => ({ month, items: groupItems }))
})

/** 分类显示名（未知分类回落原值）。 */
function categoryLabel(category: NewsCategory): string {
  const key = `news.category.${category}`
  const label = t(key)
  return label === key ? category : label
}

/** 只显示「月-日」，月份已由分组标题给出。 */
function formatDay(publishedAt: number | null): string {
  if (!publishedAt) return ''
  const date = new Date(publishedAt)
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function load(): Promise<void> {
  loading.value = true
  error.value = false
  try {
    const data = await fetchNewsList({ page: 1, limit: ARCHIVE_LIMIT })
    items.value = data.items
  } catch {
    error.value = true
    items.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.news-archive {
  max-width: 900px;
  margin: 0 auto;
  padding: 96px 24px 64px;
}

.archive-intro {
  margin-bottom: 40px;
}

.archive-intro h1 {
  margin: 0 0 8px;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: var(--letter-spacing-tight, -0.02em);
  color: var(--text-color);
}

.archive-intro p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1.6;
}

.archive-state {
  padding: 48px 0;
  text-align: center;
  color: var(--text-secondary);
}

.archive-retry {
  margin-top: 12px;
  min-height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 10px;
  background: var(--primary-color);
  color: #fff;
  font-family: inherit;
  cursor: pointer;
}

.archive-month {
  margin-bottom: 32px;
}

.archive-month-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--divider-color, rgba(158, 148, 216, 0.25));
}

.archive-month-label {
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-color);
  font-variant-numeric: tabular-nums;
}

.archive-month-count {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.archive-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.archive-link {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
  transition: background 0.2s ease;
}

.archive-link:hover,
.archive-link:focus-visible {
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
  outline: none;
}

.archive-date {
  flex: 0 0 auto;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.archive-item-title {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--text-color);
  font-size: 0.9375rem;
  overflow-wrap: anywhere;
}

.archive-category {
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid var(--divider-color, rgba(158, 148, 216, 0.35));
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.archive-words {
  flex: 0 0 auto;
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.85;
}

@media (max-width: 768px) {
  .news-archive {
    padding: 80px 16px 48px;
  }

  .archive-link {
    flex-wrap: wrap;
    gap: 6px 10px;
  }

  .archive-item-title {
    flex-basis: 100%;
    order: -1;
  }

  .archive-words {
    display: none;
  }
}
</style>
