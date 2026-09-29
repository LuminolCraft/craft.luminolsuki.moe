<template>
  <SegmentedControl
    v-model="current"
    class="layout-toggle"
    :options="layoutOptions"
    :aria-label="`${t('news.list.layoutList')} / ${t('news.list.layoutGrid')}`"
  >
    <template #icon-list>
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
      </svg>
    </template>
    <template #icon-grid>
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="currentColor" d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z" />
      </svg>
    </template>
  </SegmentedControl>
</template>

<script setup lang="ts">
/**
 * 新闻列表布局切换：列表 / 网格。
 *
 * 原实现是「按钮 + 下拉面板」两步操作，二选一场景下改成扁平分段选择
 * （smooth-option-switcher 的 N 项适配形态），指示器常驻、切换连续可逆。
 * 对外契约不变：`modelValue` / `update:modelValue`，值域仍为 'list' | 'grid'。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SegmentedControl, { type SegmentedOption } from '@/components/SegmentedControl.vue'

const props = defineProps<{
  modelValue: 'list' | 'grid'
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: 'list' | 'grid'): void
}>()

const { t } = useI18n()

const layoutOptions = computed<SegmentedOption[]>(() => [
  { value: 'list', label: t('news.list.layoutList') },
  { value: 'grid', label: t('news.list.layoutGrid') },
])

const current = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value as 'list' | 'grid'),
})
</script>

<style scoped>
.layout-toggle {
  /* 与工具行其它控件同高（NewsSearch 里的搜索框/标签触发器均为 44px） */
  --seg-height: 44px;
  flex-shrink: 0;
}

/* 窄屏只留图标，避免与标签筛选挤爆同一行 */
@media (max-width: 480px) {
  .layout-toggle :deep(.seg-text) {
    display: none;
  }

  .layout-toggle :deep(.seg-segment) {
    padding: 0 8px;
  }
}
</style>
