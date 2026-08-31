<template>
    <div class="layout-toggle-wrapper">
      <button
        class="layout-toggle-btn"
        @click="toggleDropdown"
        aria-haspopup="true"
        :aria-expanded="dropdownOpen"
        aria-label="切换布局模式"
      >
        <!-- 当前模式图标 -->
        <svg v-if="modelValue === 'list'" width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/>
        </svg>
        <span class="toggle-label">{{ modelValue === 'list' ? '列表' : '网格' }}</span>
        <span class="toggle-caret" aria-hidden="true">{{ dropdownOpen ? '▴' : '▾' }}</span>
      </button>
  
      <!-- 下拉面板 -->
      <div
        v-show="dropdownOpen"
        class="toggle-dropdown"
        @click.stop
      >
        <div class="dropdown-item" :class="{ active: modelValue === 'list' }" @click="setMode('list')">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
          </svg>
          <span>列表模式</span>
        </div>
        <div class="dropdown-item" :class="{ active: modelValue === 'grid' }" @click="setMode('grid')">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/>
          </svg>
          <span>网格模式</span>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue';
  
  const props = defineProps<{
    modelValue: 'list' | 'grid';
  }>();
  
  const emit = defineEmits<{
    (e: 'update:modelValue', value: 'list' | 'grid'): void;
  }>();
  
  const dropdownOpen = ref(false);
  const toggleBtn = ref<HTMLElement | null>(null);
  
  const toggleDropdown = () => {
    dropdownOpen.value = !dropdownOpen.value;
  };
  
  const setMode = (mode: 'list' | 'grid') => {
    emit('update:modelValue', mode);
    dropdownOpen.value = false;
  };
  
  // 点击外部关闭下拉
  const onClickOutside = (e: MouseEvent) => {
    if (toggleBtn.value && !toggleBtn.value.contains(e.target as Node)) {
      dropdownOpen.value = false;
    }
  };
  
  onMounted(() => {
    document.addEventListener('click', onClickOutside);
  });
  
  onUnmounted(() => {
    document.removeEventListener('click', onClickOutside);
  });
  </script>
  
  <style scoped>
  .layout-toggle-wrapper {
    position: relative;
    display: inline-block;
  }
  
  .layout-toggle-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px 8px 12px;
    border: none;
    border-radius: 10px;
    background: var(--card-bg);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
    color: var(--text-color);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px;
  }
  
  .layout-toggle-btn:hover {
    background: rgba(158, 148, 216, 0.08);
  }
  
  .layout-toggle-btn svg {
    flex-shrink: 0;
  }
  
  .toggle-label {
    min-width: 32px;
  }
  
  .toggle-caret {
    color: var(--text-secondary);
    font-size: 12px;
    margin-left: 4px;
  }
  
  /* 下拉面板 */
  .toggle-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 160px;
    background: var(--card-bg);
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14);
    overflow: hidden;
    z-index: 50;
    padding: 6px 0;
  }
  
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.15s ease;
    color: var(--text-color);
    font-size: 14px;
  }
  
  .dropdown-item:hover {
    background: rgba(158, 148, 216, 0.06);
  }
  
  .dropdown-item.active {
    background: rgba(158, 148, 216, 0.12);
    color: var(--primary-color);
  }
  
  .dropdown-item svg {
    flex-shrink: 0;
    color: currentColor;
  }
  </style>