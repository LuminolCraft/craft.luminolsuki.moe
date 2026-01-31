<template>
  <div class="language-switcher">
    <div class="language-container">
      <button 
        class="language-btn" 
        :class="{ active: currentLocale === 'zh' }"
        @click="changeLocale('zh')"
        :aria-label="t('common.switchToChinese')"
      >
        <span class="language-text">{{ t('language.zh') }}</span>
      </button>
      <button 
        class="language-btn" 
        :class="{ active: currentLocale === 'en' }"
        @click="changeLocale('en')"
        :aria-label="t('common.switchToEnglish')"
      >
        <span class="language-text">{{ t('language.en') }}</span>
      </button>
    </div>
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
  margin-left: auto;
}

.language-container {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 3px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.language-container:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.language-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 16px;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.language-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.language-btn:hover::before {
  opacity: 1;
}

.language-btn:hover {
  color: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}

.language-btn.active {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15));
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.language-btn.active::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ffffff, transparent);
  border-radius: 2px;
}

.language-text {
  position: relative;
  z-index: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .language-switcher {
    margin: 0 auto;
    margin-bottom: 16px;
  }

  .language-container {
    padding: 2px;
  }

  .language-btn {
    padding: 5px 12px;
    font-size: 0.8rem;
  }
}
</style>
