<template>
  <div class="color-scheme-switcher">
    <button 
      v-for="scheme in colorSchemes" 
      :key="scheme.id"
      :class="{ active: currentScheme === scheme.id }"
      @click="switchScheme(scheme.id)"
      :style="{ backgroundColor: scheme.primary }"
      :title="t(scheme.nameKey)"
    >
      {{ t(scheme.nameKey) }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface ColorScheme {
  id: string;
  nameKey: string;
  primary: string;
}

const colorSchemes: ColorScheme[] = [
  { id: 'tech-purple', nameKey: 'colorScheme.techPurple', primary: '#8b5cf6' },
  { id: 'ocean-blue', nameKey: 'colorScheme.oceanBlue', primary: '#3b82f6' },
  { id: 'forest-green', nameKey: 'colorScheme.forestGreen', primary: '#10b981' }
];

const currentScheme = ref(localStorage.getItem('colorScheme') || 'tech-purple');

const switchScheme = (schemeId: string) => {
  currentScheme.value = schemeId;
  document.documentElement.setAttribute('data-color-scheme', schemeId);
  localStorage.setItem('colorScheme', schemeId);
};

onMounted(() => {
  document.documentElement.setAttribute('data-color-scheme', currentScheme.value);
});
</script>

<style scoped>
.color-scheme-switcher {
  display: flex;
  gap: 8px;
  margin: 0 10px;
}

.color-scheme-switcher button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.8;
  min-width: 80px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.color-scheme-switcher button:hover {
  opacity: 1;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.color-scheme-switcher button.active {
  opacity: 1;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border: 2px solid white;
}

@media (max-width: 768px) {
  .color-scheme-switcher {
    margin: 10px 0;
    justify-content: center;
  }
  
  .color-scheme-switcher button {
    min-width: 60px;
    padding: 6px 10px;
    font-size: 12px;
  }
}
</style>