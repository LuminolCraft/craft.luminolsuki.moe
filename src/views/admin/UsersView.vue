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
        @input="onSearchInput"
        @keydown.enter.prevent="searchNow"
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
                  :class="{ busy: loadingPage }"
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
import { computed, onMounted, ref } from 'vue'
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
 *
 * 排序切换延迟优化（SWR 缓存 + 反向预取）：page1 结果按 `方向|搜索词` 缓存在组件内存
 * （不落 localStorage）。点击排序命中缓存先渲染（瞬时），随后后台重验拉最新数据覆盖，
 * 保证最终一致；首屏加载后静默预取反向排序 page1，让第一次点击也命中。
 */
const { t, te } = useI18n()
const { create, reduceMotion } = useGsap()

const LIMIT = 20
/** 边输边搜：停止输入多久后才发请求（防抖，避免每敲一个字打一次全表 LIKE）。 */
const SEARCH_DEBOUNCE_MS = 300
/** 最少几个字符才搜：1 个字符命中面太大，等于全表扫描还返回一堆无关用户。 */
const SEARCH_MIN_LENGTH = 2
/** SWR 缓存条数上限：asc/desc × 最近几个搜索词，超出淘汰最旧（每条仅 20 行，内存可控）。 */
const CACHE_MAX = 4

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

/** page1 SWR 缓存：key = `方向|搜索词`。仅存组件内存，刷新即清。 */
const page1Cache = new Map<string, { items: AdminUserListItem[]; total?: number }>()

function cacheKey(dir: 'asc' | 'desc', q: string): string {
  return `${dir}|${q}`
}

/** 写缓存并淘汰最旧（Map 迭代序即插入序）。 */
function putCache(key: string, entry: { items: AdminUserListItem[]; total?: number }) {
  page1Cache.delete(key)
  page1Cache.set(key, entry)
  if (page1Cache.size > CACHE_MAX) {
    const oldest = page1Cache.keys().next().value
    if (oldest !== undefined) page1Cache.delete(oldest)
  }
}

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

function buildQuery(nextPage: number, dir: 'asc' | 'desc' = sortDir.value, q: string = query.value): string {
  const params = new URLSearchParams()
  params.set('page', String(nextPage))
  params.set('limit', String(LIMIT))
  params.set('sort', 'created_at')
  params.set('order', dir)
  if (q) params.set('q', q)
  return params.toString()
}

/** 应用分页响应到表格；page1 同时写缓存并触发反向预取（用请求发出时的 dir/q，避免竞态串数据）。 */
function applyPage(data: unknown, nextPage: number, dir: 'asc' | 'desc', q: string) {
  const paged = normalizePaged<unknown>(data)
  const items = paged.items.map(normalizeAdminUser)
  users.value = items
  total.value = paged.total
  page.value = nextPage
  if (nextPage === 1) {
    putCache(cacheKey(dir, q), { items, total: paged.total })
    void prefetchOpposite(dir, q)
  }
}

async function load(nextPage: number) {
  const seq = ++requestSeq
  const dirAtReq = sortDir.value
  const qAtReq = query.value
  const data = await api.get<unknown>(`/admin/users?${buildQuery(nextPage, dirAtReq, qAtReq)}`)
  if (seq !== requestSeq) return
  applyPage(data, nextPage, dirAtReq, qAtReq)
}

/** 命中缓存后的后台重验：静默拉最新数据覆盖表格与缓存，失败保留缓存渲染，下次操作重试。 */
async function revalidate() {
  const seq = ++requestSeq
  const dirAtReq = sortDir.value
  const qAtReq = query.value
  try {
    const data = await api.get<unknown>(`/admin/users?${buildQuery(1, dirAtReq, qAtReq)}`)
    if (seq !== requestSeq) return
    applyPage(data, 1, dirAtReq, qAtReq)
  } catch {
    /* 重验失败静默：缓存值已在渲染，后端仍为准 */
  }
}

/** 静默预取反向排序 page1 入缓存，让下次点击排序直接命中。不触碰表格与 requestSeq。 */
async function prefetchOpposite(dir: 'asc' | 'desc', q: string) {
  const opp = dir === 'asc' ? 'desc' : 'asc'
  const key = cacheKey(opp, q)
  if (page1Cache.has(key)) return
  try {
    const data = await api.get<unknown>(`/admin/users?${buildQuery(1, opp, q)}`)
    if (page1Cache.has(key)) return
    const paged = normalizePaged<unknown>(data)
    putCache(key, { items: paged.items.map(normalizeAdminUser), total: paged.total })
  } catch {
    /* 预取失败不影响主流程 */
  }
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

/** 防抖排期：清空立即恢复无过滤；不足最少长度不请求（保留上一次结果）。 */
function scheduleSearch(raw: string) {
  if (searchTimer) clearTimeout(searchTimer)
  const next = raw.trim()
  if (next.length === 0) {
    applySearch('')
    return
  }
  if (next.length < SEARCH_MIN_LENGTH) return
  searchTimer = setTimeout(() => applySearch(next), SEARCH_DEBOUNCE_MS)
}

/**
 * 直接读输入框原始值，而不是只 watch `searchInput`。
 *
 * 中文 / 日文输入法组合期间，Vue 的 `v-model` 会跳过 input 事件（组合态未提交
 * 就不写回 ref），只靠 watcher 会表现为「边输边搜毫无反应，点了别处让输入框
 * 失焦提交组合后才搜一次」。
 */
function onSearchInput(e: Event) {
  scheduleSearch((e.target as HTMLInputElement).value)
}

/** 回车立即搜（跳过防抖）：输完按回车应马上出结果。 */
function searchNow() {
  if (searchTimer) clearTimeout(searchTimer)
  const next = searchInput.value.trim()
  if (next.length === 0) {
    applySearch('')
    return
  }
  if (next.length < SEARCH_MIN_LENGTH) return
  applySearch(next)
}

function clearSearch() {
  searchInput.value = ''
  if (searchTimer) clearTimeout(searchTimer)
  applySearch('')
}

/**
 * 表头点击：升序 ↔ 降序。排序仍由后端全局执行，故回到第 1 页。
 * 命中缓存先渲染（requestSeq 自增使在途翻页请求失效），后台重验保鲜；未命中走正常加载。
 */
function toggleSort() {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  const hit = page1Cache.get(cacheKey(sortDir.value, query.value))
  if (hit) {
    requestSeq++
    users.value = hit.items
    total.value = hit.total
    page.value = 1
    loadError.value = ''
    void revalidate()
  } else {
    void go(1)
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

/* 未命中缓存走网络加载期间：图标降透明度示意进行中（命中缓存瞬时渲染，不会出现此态） */
.sort-btn.busy .sort-icon {
  opacity: 0.35;
}
</style>
