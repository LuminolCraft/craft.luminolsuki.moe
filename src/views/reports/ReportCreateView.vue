<script setup lang="ts">
/**
 * 提交举报（`/report`）。
 *
 * 流程：先 `POST /me/reports` 建单拿到 id，再逐个把附件上传到
 * `POST /me/reports/:id/evidence`。这样失败的附件只丢单张，不会让整条举报回滚
 * （附件本来就是可选项），前端给出"举报已提交，附件可重新上传"的提示。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, isAppError } from '@/lib/api'
import { useToastStore } from '@/stores/toast'
import EvidenceDrop from '@/components/reports/EvidenceDrop.vue'
import type {
  CreateReportInput,
  MyReport,
  ReportCategory,
  ReportEvidenceItem,
} from '@/types/nexus'
import type { AppError } from '@/types/auth'

const { t } = useI18n()
const router = useRouter()
const toast = useToastStore()

const CATEGORIES: ReportCategory[] = ['cheat', 'steal', 'grief', 'insult', 'spam', 'exploit', 'other']

const targetPlayerName = ref('')
const category = ref<ReportCategory>('cheat')
const description = ref('')
const linkUrl = ref('')
const items = ref<ReportEvidenceItem[]>([])
const submitting = ref(false)
const errorText = ref('')
/** 已建单但附件未传完时保留 id，允许"只重传附件" */
const createdReportId = ref<string | null>(null)

const canSubmit = computed(
  () =>
    !submitting.value &&
    /^[A-Za-z0-9_]{3,16}$/.test(targetPlayerName.value.trim()) &&
    description.value.trim().length >= 10,
)

function errorMessage(e: unknown): string {
  if (isAppError(e)) {
    const code = (e as AppError).code
    if (code === 'REPORT_DUPLICATE_PENDING') return t('reports.errors.duplicate')
    if (code === 'RATE_LIMITED') return t('reports.errors.rateLimited')
    if (code === 'VALIDATION_ERROR') return t('reports.errors.validation')
    return e.message || t('reports.errors.generic')
  }
  return t('reports.errors.generic')
}

async function uploadEvidence(reportId: string) {
  let failed = 0
  for (const item of items.value) {
    try {
      await api.upload(`/me/reports/${reportId}/evidence`, item.blob, {
        filename: item.name,
        fields:
          item.setId !== undefined
            ? {
                setId: item.setId,
                ...(item.setIndex !== undefined ? { setIndex: String(item.setIndex) } : {}),
              }
            : undefined,
      })
    } catch {
      failed += 1
    }
  }
  return failed
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  errorText.value = ''
  try {
    const payload: CreateReportInput = {
      targetPlayerName: targetPlayerName.value.trim(),
      category: category.value,
      description: description.value.trim(),
      ...(linkUrl.value.trim() ? { linkUrl: linkUrl.value.trim() } : {}),
    }
    const created = await api.post<MyReport>('/me/reports', payload)
    createdReportId.value = created.id

    const failed = await uploadEvidence(created.id)
    if (failed > 0) {
      toast.error(t('reports.errors.evidencePartial', { n: failed }))
    } else {
      toast.success(t('reports.submitted'))
    }
    await router.push('/me/reports')
  } catch (e) {
    errorText.value = errorMessage(e)
  } finally {
    submitting.value = false
  }
}

/** 举报单已建、仅附件失败时：只重传附件 */
async function retryEvidence() {
  if (!createdReportId.value) return
  submitting.value = true
  try {
    const failed = await uploadEvidence(createdReportId.value)
    if (failed > 0) toast.error(t('reports.errors.evidencePartial', { n: failed }))
    else {
      toast.success(t('reports.submitted'))
      await router.push('/me/reports')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="report-page">
    <header class="page-head">
      <h1 class="page-title">{{ t('reports.create.title') }}</h1>
      <p class="page-subtitle">{{ t('reports.create.subtitle') }}</p>
    </header>

    <form class="report-form" @submit.prevent="submit">
      <label class="field">
        <span class="label">{{ t('reports.create.target') }}</span>
        <input
          v-model="targetPlayerName"
          class="input"
          type="text"
          maxlength="16"
          autocomplete="off"
          :placeholder="t('reports.create.targetPlaceholder')"
        />
        <span class="hint">{{ t('reports.create.targetHint') }}</span>
      </label>

      <label class="field">
        <span class="label">{{ t('reports.create.category') }}</span>
        <select v-model="category" class="input">
          <option v-for="value in CATEGORIES" :key="value" :value="value">
            {{ t(`reports.category.${value}`) }}
          </option>
        </select>
      </label>

      <label class="field">
        <span class="label">{{ t('reports.create.description') }}</span>
        <textarea
          v-model="description"
          class="input textarea"
          rows="5"
          maxlength="2000"
          :placeholder="t('reports.create.descriptionPlaceholder')"
        />
        <span class="hint">{{ t('reports.create.descriptionHint') }}</span>
      </label>

      <div class="field">
        <span class="label">{{ t('reports.create.evidence') }}</span>
        <EvidenceDrop :max="3" :disabled="submitting" @update:items="items = $event" />
        <span class="hint">{{ t('reports.create.evidenceHint') }}</span>
      </div>

      <label class="field">
        <span class="label">{{ t('reports.create.link') }}</span>
        <input
          v-model="linkUrl"
          class="input"
          type="url"
          maxlength="500"
          placeholder="https://"
        />
        <span class="hint">{{ t('reports.create.linkHint') }}</span>
      </label>

      <p v-if="errorText" class="form-error">{{ errorText }}</p>

      <div class="report-actions">
        <button type="submit" class="btn" :disabled="!canSubmit">
          {{ submitting ? t('reports.create.submitting') : t('reports.create.submit') }}
        </button>
        <button
          v-if="createdReportId && items.length > 0"
          type="button"
          class="btn ghost"
          :disabled="submitting"
          @click="retryEvidence"
        >
          {{ t('reports.create.retryEvidence') }}
        </button>
      </div>

      <p class="hint">{{ t('reports.create.privacy') }}</p>
    </form>
  </section>
</template>

<style scoped>
@import '../admin/admin-shared.css';

.report-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}
.report-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 24px;
}
.report-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
