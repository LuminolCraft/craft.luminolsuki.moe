<script setup lang="ts">
/**
 * 我的举报（`/me/reports`）。
 *
 * 只读列表：状态徽标 + 结案说明（后端 `resolutionMessage`，对举报人可见的
 * 那一份；内部备注与投票明细后端根本不下发）。
 */
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isAppError } from '@/lib/api'
import type { MyReport } from '@/types/nexus'

const { t } = useI18n()

const items = ref<MyReport[]>([])
const loading = ref(true)
const errorText = ref('')
const page = ref(1)
const total = ref(0)
const limit = 20

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const data = await api.get<{ items: MyReport[]; total: number }>(
      `/me/reports?page=${page.value}&limit=${limit}`,
    )
    items.value = data.items ?? []
    total.value = data.total ?? 0
  } catch (e) {
    errorText.value = isAppError(e) ? (e.message || t('reports.errors.generic')) : t('reports.errors.generic')
  } finally {
    loading.value = false
  }
}

function statusKey(status: string): string {
  return `reports.status.${status}`
}

function formatTime(ms: number | null): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleString()
}

onMounted(load)
</script>

<template>
  <section class="report-page">
    <header class="page-head">
      <h1 class="page-title">{{ t('reports.mine.title') }}</h1>
      <p class="page-subtitle">{{ t('reports.mine.subtitle') }}</p>
    </header>

    <p v-if="errorText" class="form-error">{{ errorText }}</p>
    <p v-else-if="loading" class="hint">{{ t('reports.common.loading') }}</p>
    <p v-else-if="items.length === 0" class="hint">{{ t('reports.mine.empty') }}</p>

    <ul v-else class="report-list">
      <li v-for="item in items" :key="item.id" class="report-card">
        <div class="report-card__head">
          <span class="status-badge" :data-status="item.status">
            {{ t(statusKey(item.status)) }}
          </span>
          <span class="report-card__target">{{ item.targetPlayerName }}</span>
          <span class="dim">{{ t(`reports.category.${item.category}`) }}</span>
          <span class="dim report-card__time">{{ formatTime(item.createdAt) }}</span>
        </div>
        <p class="report-card__desc">{{ item.description }}</p>
        <p v-if="item.resolutionMessage" class="report-card__resolution">
          {{ t('reports.mine.resolution') }}：{{ item.resolutionMessage }}
        </p>
        <p class="dim report-card__meta">
          {{ t('reports.mine.evidenceCount', { n: item.evidence.length }) }}
          <template v-if="item.evidence.length > 0">
            · {{ t('reports.mine.evidenceKept') }}
          </template>
        </p>
      </li>
    </ul>

    <div v-if="total > limit" class="pager">
      <button class="btn ghost" :disabled="page <= 1" @click="(page -= 1), load()">
        {{ t('reports.common.prev') }}
      </button>
      <span class="dim">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button
        class="btn ghost"
        :disabled="page * limit >= total"
        @click="(page += 1), load()"
      >
        {{ t('reports.common.next') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
@import '../admin/admin-shared.css';

.report-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}
.report-list {
  list-style: none;
  padding: 0;
  margin: 24px 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.report-card {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  padding: 14px 16px;
}
.report-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.report-card__target {
  font-weight: 600;
}
.report-card__time {
  margin-left: auto;
}
.report-card__desc {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
}
.report-card__resolution {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text-color);
}
.report-card__meta {
  margin: 8px 0 0;
  font-size: 12px;
}
.dim {
  color: var(--text-secondary);
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}
</style>
