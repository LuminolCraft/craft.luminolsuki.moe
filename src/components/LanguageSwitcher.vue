<template>
  <div class="language-switcher">
    <button 
      class="language-btn" 
      :class="{ active: currentLocale === 'zh' }"
      @click="changeLocale('zh')"
      :aria-label="t('common.switchToChinese')"
    >
      {{ t('language.zh') }}
    </button>
    <span class="language-divider">|</span>
    <button 
      class="language-btn" 
      :class="{ active: currentLocale === 'en' }"
      @click="changeLocale('en')"
      :aria-label="t('common.switchToEnglish')"
    >
      {{ t('language.en') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, t } = useI18n()
const currentLocale = computed(() => locale.value)

const changeLocale = (newLocale: string) => {
  // 更新语言
  locale.value = newLocale
  // 保存到localStorage，实现缓存机制
  localStorage.setItem('locale', newLocale)
}
</script>

<style scoped>
.language-switcher {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-left: auto;
}

.language-btn {
  background: transparent;
  border: none;
  color: var(--white);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.language-btn:hover {
  background: var(--glass-bg);
  color: var(--button-hover);
}

.language-btn.active {
  background: var(--glass-bg);
  color: var(--button-hover);
  font-weight: var(--font-weight-medium);
}

.language-divider {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .language-switcher {
    margin: 0 auto;
    margin-bottom: var(--spacing-4);
  }
}
</style>
