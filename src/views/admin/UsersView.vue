<template>
  <div class="users-page">
    <header class="page-head">
      <h1 class="page-title">{{ t('admin.users.title') }}</h1>
      <p class="page-subtitle">{{ t('admin.users.subtitle') }}</p>
    </header>

    <div v-if="loading" class="page-loading">{{ t('admin.common.loading') }}</div>

    <template v-else>
      <p v-if="users.length === 0" class="page-empty">{{ t('admin.common.empty') }}</p>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('admin.users.username') }}</th>
              <th>{{ t('admin.users.email') }}</th>
              <th>{{ t('admin.users.roles') }}</th>
              <th>{{ t('admin.users.joined') }}</th>
              <th class="th-actions"><span class="sr-only">{{ t('admin.common.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td class="td-strong">{{ u.username }}</td>
              <td class="td-dim">{{ u.email || '—' }}</td>
              <td>
                <span v-for="r in u.roles ?? []" :key="r" class="role-badge">{{ r }}</span>
                <span v-if="!u.roles?.length" class="td-dim">—</span>
              </td>
              <td class="td-dim">{{ formatDate(u.createdAt) }}</td>
              <td class="td-actions">
                <RouterLink :to="`/admin/users/${u.id}`" class="row-link">{{ t('admin.users.detail') }}</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="hasMore" class="pager">
        <button type="button" class="pager-btn" :disabled="page <= 1 || loadingPage" @click="go(page - 1)">
          {{ t('admin.common.prev') }}
        </button>
        <span class="pager-label">{{ t('admin.common.pageOf', { page }) }}</span>
        <button type="button" class="pager-btn" :disabled="!hasMore || loadingPage" @click="go(page + 1)">
          {{ t('admin.common.next') }}
        </button>
      </div>
    </template>

    <p v-if="loadError" class="page-error" role="alert">{{ loadError }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isAppError } from '@/lib/api'
import { normalizePaged } from '@/lib/paged'
import type { AdminUserListItem } from '@/types/nexus'
import { useGsap } from '@/composables/useGsap'

/**
 * 管理端·用户列表。分页默认 20（减负③）；会话内切页才重新请求，返回列表不缓存（管理数据需新鲜）。
 */
const { t, te } = useI18n()
const { create, reduceMotion } = useGsap()

const LIMIT = 20

const loading = ref(true)
const loadingPage = ref(false)
const loadError = ref('')
const users = ref<AdminUserListItem[]>([])
const page = ref(1)
const total = ref<number | undefined>(undefined)

const hasMore = computed(() => {
  if (typeof total.value === 'number') return page.value * LIMIT < total.value
  // 后端未给 total：返回满页则假定还有下一页
  return users.value.length === LIMIT
})

function errorText(e: unknown): string {
  if (isAppError(e)) {
    const map: Record<string, string> = {
      FORBIDDEN: 'admin.common.errForbidden',
      PERMISSION_DENIED: 'admin.common.errForbidden',
      NETWORK_ERROR: 'admin.common.errNetwork',
      RATE_LIMITED: 'admin.common.errRateLimited',
      VALIDATION_ERROR: 'admin.common.errValidation',
    }
    const key = map[e.code]
    if (key && te(key)) return t(key)
  }
  return t('admin.common.errGeneric')
}

async function load(nextPage: number) {
  const data = await api.get<unknown>(`/admin/users?page=${nextPage}&limit=${LIMIT}`)
  const paged = normalizePaged<AdminUserListItem>(data)
  users.value = paged.items
  total.value = paged.total
  page.value = nextPage
}

async function go(nextPage: number) {
  loadingPage.value = true
  loadError.value = ''
  try {
    await load(nextPage)
  } catch (e) {
    loadError.value = errorText(e)
  } finally {
    loadingPage.value = false
  }
}

function formatDate(ts?: number): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString()
}

onMounted(async () => {
  create((g) => {
    if (reduceMotion()) return
    g.from('.users-page > *', { autoAlpha: 0, y: 16, duration: 0.5, ease: 'power3.out', stagger: 0.06, clearProps: 'all' })
  })
  try {
    await load(1)
  } catch (e) {
    loadError.value = errorText(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
@import './admin-shared.css';
</style>
