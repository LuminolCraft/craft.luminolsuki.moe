<template>
    <div class="news-toolbar">
      <div class="news-search">
        <input
          type="search"
          :value="searchQuery"
          :placeholder="t('news.list.searchPlaceholder')"
          @input="$emit('search', ($event.target as HTMLInputElement).value)"
          autocomplete="on"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
        />
        <button type="button" class="btn" @click="$emit('search', searchQuery || '')">
          <i class="fas fa-search"></i>
          <span>{{ t('news.list.searchButton') }}</span>
        </button>
      </div>
  
      <div class="tag-filter" ref="tagFilterRef">
        <button
          type="button"
          class="tag-filter-trigger"
          @click.stop="dropdownOpen = !dropdownOpen"
        >
          <span class="tag-filter-label">{{ t('news.list.tagFilter') }}</span>
          <span class="tag-filter-value">
            <template v-if="selectedTags.length === 0">{{ t('news.list.allTags') }}</template>
            <template v-else>已选 {{ selectedTags.length }} 个</template>
          </span>
          <span class="tag-filter-caret" aria-hidden="true">{{ dropdownOpen ? '▴' : '▾' }}</span>
        </button>
  
        <div v-show="dropdownOpen" class="tag-dropdown" @click.stop>
          <input
            v-model="tagSearch"
            type="search"
            class="tag-dropdown-search"
            placeholder="搜索标签…"
            autocomplete="off"
          />
          <div class="tag-dropdown-list">
            <label v-for="tag in filteredTags" :key="tag" class="tag-option">
              <input
                type="checkbox"
                :checked="selectedTags.includes(tag)"
                @change="$emit('tag-toggle', tag)"
              />
              <span>#{{ tag }}</span>
            </label>
            <p v-if="filteredTags.length === 0" class="tag-empty">无匹配标签</p>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  
  const props = defineProps<{
    selectedTags: string[];
    allTags: string[];
    searchQuery?: string;
  }>();
  
  const emit = defineEmits<{
    (e: 'search', query: string): void;
    (e: 'tag-toggle', tag: string): void;
  }>();
  
  const { t } = useI18n();
  const dropdownOpen = ref(false);
  const tagSearch = ref('');
  const tagFilterRef = ref<HTMLElement | null>(null);
  
  const filteredTags = computed(() => {
    const q = tagSearch.value.trim().toLowerCase();
    if (!q) return props.allTags;
    return props.allTags.filter((tag) => tag.toLowerCase().includes(q));
  });
  
  const onDocClick = (e: MouseEvent) => {
    if (!tagFilterRef.value?.contains(e.target as Node)) {
      dropdownOpen.value = false;
    }
  };
  
  onMounted(() => document.addEventListener('click', onDocClick));
  onUnmounted(() => document.removeEventListener('click', onDocClick));
  </script>
  
  <style scoped>
  /* ============================================================
     NewsSearch 搜索与标签筛选样式（含响应式）
     ============================================================ */
  
  .news-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 16px;
    align-items: flex-start;
    justify-content: center;
    max-width: 900px;
  }
  
  .news-search {
    display: flex;
    flex: 1 1 320px;
    gap: 10px;
    max-width: 520px;
    margin: 0;
  }
  
  .news-search input[type='search'] {
    flex: 1;
    min-width: 0;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    color: var(--text-color);
    background: var(--card-bg);
    box-shadow: var(--vercel-shadow-border, 0 0 0 1px rgba(0, 0, 0, 0.08));
    outline: none;
    min-height: 44px;
  }
  
  .news-search input[type='search']:focus {
    outline: none;
    border-color: var(--button-hover);
    box-shadow: 0 0 0 3px rgba(158, 148, 216, 0.2);
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
    min-width: 44px;
    min-height: 44px;
    transition: background 0.3s, transform 0.3s;
  }
  
  .news-search button:hover {
    background: var(--button-hover);
    transform: translateY(-2px);
  }
  
  .news-search button i {
    font-family: 'Font Awesome 7 Free' !important;
    font-weight: 900 !important;
  }
  
  /* 标签筛选器 */
  .tag-filter {
    position: relative;
    flex: 0 1 240px;
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
  
  .tag-filter-caret {
    color: var(--text-secondary);
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
  
  .tag-option:hover {
    background: rgba(158, 148, 216, 0.06);
  }
  
  .tag-empty {
    margin: 0;
    padding: 16px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
  }
  
  /* ===== 移动端 (<=768px) ===== */
  @media (max-width: 768px) {
    .news-toolbar {
      flex-direction: column;
      align-items: stretch;
    }
  
    .news-search {
      width: 100%;
      max-width: none;
      flex: 1 1 auto;
      flex-direction: column;
      align-items: stretch;
    }
  
    .news-search input[type='search'] {
      width: 100%;
      margin-bottom: 10px;
    }
  
    .news-search button {
      width: 100%;
      justify-content: center;
    }
  
    .tag-filter {
      flex: 1 1 auto;
      width: 100%;
      max-width: none;
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }
  
    .tag-filter select {
      width: 100%;
    }
  }
  </style>