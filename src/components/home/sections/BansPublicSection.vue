<!--
  BansPublicSection —— 封禁公示（对外脱敏）

  数据：GET /api/v1/bans/public（nexus 脱敏视图，只返回 username / type / reason / status）。
  接口未就绪或请求失败时回落到内置示例，页面不空档。

  安全：这一层拿不到 uuid（接口本身不下发），组件 public 模式也不渲染任何内部字段。
  皮肤：styles/desktop/home-sections.css 的 .lp-*，此处只写布局。
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BanListTable from '@/components/admin/BanListTable.vue'
import { API_BASE_URL } from '@/lib/api-base'
import type { Ban } from '@/types/nexus'

type PublicBanRaw = {
  username: string
  type: string
  reason: string
  status: 'active' | 'expired' | 'revoked'
  /** 到期时间（epoch ms）；null/缺省 = 永久。公示页要显示这一列 */
  expiresAt?: number | null
}

const day = (s: string) => new Date(`${s}T00:00:00+08:00`).getTime()

/** 兜底示例：取自 2026-09-14 封禁公告（已在库中，仅用于接口未就绪时占位） */
const FALLBACK: PublicBanRaw[] = [
  { username: 'Soade900', type: 'minecraft', reason: '偷盗他人物品', status: 'active', expiresAt: null },
  { username: 'Tents', type: 'minecraft', reason: '破坏他人建筑', status: 'active', expiresAt: null },
  {
    username: 'tfuxutftutuxd',
    type: 'minecraft',
    reason: '未经他人允许击败他人，破坏他人建筑',
    status: 'active',
    expiresAt: null,
  },
  { username: 'configscript', type: 'minecraft', reason: '偷盗他人物品', status: 'active', expiresAt: null },
  { username: '917878', type: 'minecraft', reason: '破坏他人建筑', status: 'active', expiresAt: null },
  {
    username: 'GmorYF',
    type: 'minecraft',
    reason: '破坏出生点美观',
    status: 'expired',
    expiresAt: day('2026-09-28'),
  },
  {
    username: 'lisy',
    type: 'minecraft',
    reason: '影响其他玩家正常游玩，且蓄意破坏玩家建筑',
    status: 'revoked',
    expiresAt: day('2026-09-20'),
  },
  {
    username: 'Bot_TnT123',
    type: 'minecraft',
    reason: '破坏服务器建筑',
    status: 'expired',
    expiresAt: day('2026-09-11'),
  },
]

const bans = ref<Ban[]>([])
const loading = ref(true)

/** 公开状态 → 组件内部判断所需的时间戳（组件只看 revokedAt / expiresAt） */
function toBanRow(raw: PublicBanRaw, i: number): Ban {
  return {
    id: `public-${i}-${raw.username}`,
    minecraftAccountId: null,
    minecraftUsername: raw.username,
    minecraftUuid: null,
    type: raw.type,
    reason: raw.reason,
    // 有真实到期时间就用真实值；接口未就绪时的兜底数据按状态推断
    expiresAt: raw.expiresAt !== undefined ? raw.expiresAt : raw.status === 'active' ? null : 1,
    revokedAt: raw.status === 'revoked' ? 1 : null,
  }
}

function apply(list: PublicBanRaw[]) {
  bans.value = list.map(toBanRow)
}

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/bans/public?limit=20`)
    if (!res.ok) throw new Error(`http ${res.status}`)
    const json = (await res.json()) as { data?: { items?: PublicBanRaw[] } } | PublicBanRaw[]
    const data = Array.isArray(json) ? json : (json.data?.items ?? [])
    apply(data.length ? data : FALLBACK)
  } catch {
    apply(FALLBACK)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="lp-sec bans-public" aria-labelledby="bans-public-title">
    <div class="lp-wrap">
      <header class="bans-public__head" data-reveal>
        <div>
          <p class="lp-kicker">transparency / 公示</p>
          <h2 id="bans-public-title" class="lp-title">封禁公示</h2>
          <p class="lp-lead bans-public__lead">
            处理结果公开可查。这里只显示角色名与处罚理由 —— 不展示 UUID、账号 id
            或任何可被冒用的身份信息。
          </p>
        </div>
        <a class="bans-public__more" href="/rules">查看服务器规则</a>
      </header>

      <div class="lp-card bans-public__panel" data-reveal>
        <BanListTable :bans="bans" mode="public" :loading="loading" :page-size="6" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.bans-public__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.bans-public__lead {
  margin-bottom: 0;
}
.bans-public__more {
  flex: 0 0 auto;
  margin-bottom: 6px;
  font-size: 12.5px;
  font-family: var(--font-mono);
  color: var(--primary-color);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--primary-color) 40%, transparent);
  padding-bottom: 2px;
}
.bans-public__panel {
  margin-top: 32px;
  padding: 22px 24px 18px;
}

@media (max-width: 900px) {
  .bans-public__head {
    flex-direction: column;
    align-items: flex-start;
  }
  .bans-public__panel {
    margin-top: 24px;
    padding: 16px 14px 12px;
  }
}
</style>
