<template>
  <div class="users-page">
    <header class="page-head">
      <h1 class="page-title">{{ t('admin.users.title') }}</h1>
      <p class="page-subtitle">{{ t('admin.users.subtitle') }}</p>
    </header>

    <!-- 过滤器：用户名 / 邮箱模糊搜索（边输边搜，防抖后请求后端；样式同审计日志） -->
    <form class="filter-row" @submit.prevent>
      <input
        v-model="searchInput"
        class="input filter-input"
        type="search"
        :placeholder="t('admin.users.filterUsername')"
        :aria-label="t('admin.users.filterUsername')"
      />
      <button v-if="searchInput" type="button" class="btn ghost" @click="clearSearch">
        {{ t('admin.users.clearFilter') }}
      </button>
    </form>

    <div v-if="loading" class="page-loading">{{ t('admin.common.loading') }}</div>

    <template v-else>
      <p v-if="users.length === 0" class="page-empty">
        {{ query ? t('admin.users.filterEmpty') : t('admin.common.empty') }}
      </p>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('admin.users.username') }}</th>
              <th>{{ t('admin.users.email') }}</th>
              <th>{{ t('admin.users.roles') }}</th>
              <th class="th-sort" :aria-sort="sortDir === 'asc' ? 'ascending' : 'descending'">
                <button
                  type="button"
                  class="sort-btn"
                  :title="`${t('admin.users.sortJoined')}（${sortDirLabel}）`"
                  @click="toggleSort"
                >
                  {{ t('admin.users.joined') }}
                  <svg
                    class="sort-icon"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <template v-if="sortDir === 'asc'">
                      <path d="M12 19V5" />
                      <path d="m5 12 7-7 7 7" />
                    </template>
                    <template v-else>
                      <path d="M12 5v14" />
                      <path d="m19 12-7 7-7-7" />
                    </template>
                  </svg>
                  <span class="sr-only">{{ sortDirLabel }}</span>
                </button>
              </th>
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

      <div v-if="hasMore || page > 1" class="pager">
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
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isAppError } from '@/lib/api'
import { normalizePaged } from '@/lib/paged'
import { normalizeAdminUser } from '@/lib/admin-user'
import type { AdminUserListItem } from '@/types/nexus'
import { useGsap } from '@/composables/useGsap'

/**
 * 管理端·用户列表。分页默认 20（减负③）；会话内切页才重新请求，返回列表不缓存（管理数据需新鲜）。
 *
 * 搜索与排序都由后端在 SQL 层完成（`q` / `sort=created_at` / `order`），前端不做本地排序：
 * 本地只能排当前页 20 条，翻页与搜索时顺序会错乱。
 */
const { t, te } = useI18n()
const { create, reduceMotion } = useGsap()

const LIMIT = 20
/** 边输边搜：停止输入多久后才发请求（防抖，避免每敲一个字打一次全表 LIKE）。 */
const SEARCH_DEBOUNCE_MS = 300
/** 最少几个字符才搜：1 个字符命中面太大，等于全表扫描还返回一堆无关用户。 */
const SEARCH_MIN_LENGTH = 2

const loading = ref(true)
const loadingPage = ref(false)
const loadError = ref('')
const users = ref<AdminUserListItem[]>([])
const page = ref(1)
const total = ref<number | undefined>(undefined)
/** 已生效的搜索词（后端 q 参数）；输入框的值先经防抖才写到这里。 */
const query = ref('')
const searchInput = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')

const sortDirLabel = computed(() =>
  sortDir.value === 'asc' ? t('admin.users.sortAsc') : t('admin.users.sortDesc'),
)

let searchTimer: ReturnType<typeof setTimeout> | undefined
/** 请求序号：防抖 + 快速切排序会并发多个请求，只认最后一个的响应，避免乱序覆盖。 */
let requestSeq = 0

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

function buildQuery(nextPage: number): string {
  const params = new URLSearchParams()
  params.set('page', String(nextPage))
  params.set('limit', String(LIMIT))
  params.set('sort', 'created_at')
  params.set('order', sortDir.value)
  if (query.value) params.set('q', query.value)
  return params.toString()
}

async function load(nextPage: number) {
  const seq = ++requestSeq
  const data = await api.get<unknown>(`/admin/users?${buildQuery(nextPage)}`)
  if (seq !== requestSeq) return
  const paged = normalizePaged<unknown>(data)
  users.value = paged.items.map(normalizeAdminUser)
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

/** 应用搜索词：条件变了必须回第 1 页，否则会停在原页码上看到空页。 */
function applySearch(next: string) {
  if (next === query.value) return
  query.value = next
  void go(1)
}

function clearSearch() {
  searchInput.value = ''
}

/** 表头点击：升序 ↔ 降序，排序由后端全局执行，故回到第 1 页。 */
function toggleSort() {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  void go(1)
}

watch(searchInput, (raw) => {
  if (searchTimer) clearTimeout(searchTimer)
  const next = raw.trim()
  // 清空立即恢复无过滤；不足最少长度不请求（保留上一次结果）
  if (next.length === 0) {
    applySearch('')
    return
  }
  if (next.length < SEARCH_MIN_LENGTH) return
  searchTimer = setTimeout(() => applySearch(next), SEARCH_DEBOUNCE_MS)
})

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

.filter-row {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  margin-bottom: 1.4rem;
}

.filter-input {
  width: min(16rem, 100%);
}

/* 可排序表头：th 自身去内边距，点击区交给内部 button（键盘可达） */
.th-sort {
  padding: 0;
}

.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.7rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: color 0.15s ease;
}

.sort-btn:hover {
  color: var(--text-color);
}

.sort-btn:focus-visible {
  outline: 2px solid var(--focus-ring-color, var(--vercel-focus-blue));
  outline-offset: -2px;
}

.sort-icon {
  flex-shrink: 0;
}
</style>
