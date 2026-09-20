/**
 * 新闻增量同步判定单测（`news-sync.ts`，纯函数）。
 *
 * 覆盖：整体版本未变（热启动零写库/零正文请求）、单篇正文版本变化、
 * 元数据变化、远端删除、服务端降级（bodiesOmitted → needBody）、
 * 空远端保护（不误删本地缓存）。
 */
import { describe, expect, it } from 'vitest'
import {
  type LocalNewsRecord,
  type RemoteNewsBundle,
  contentVersionKey,
  planSync,
  sourceFingerprintOf,
} from './news-sync'

function remoteItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: '第一篇',
    date: '2026-09-20',
    tags: ['公告'],
    content: '/api/v1/news/1',
    contentVersion: 'v1',
    markdownContent: '# hello',
    ...overrides,
  }
}

function bundle(overrides: Partial<RemoteNewsBundle> = {}): RemoteNewsBundle {
  return {
    version: 'ver-1',
    generatedAt: 1_700_000_000_000,
    bodiesOmitted: false,
    items: [remoteItem()],
    ...overrides,
  }
}

function localOf(item: ReturnType<typeof remoteItem>): LocalNewsRecord {
  return {
    id: item.id as number,
    markdownContent: (item.markdownContent as string) ?? undefined,
    contentFetchedVersion: contentVersionKey(item as never),
    sourceFingerprint: sourceFingerprintOf(item as never),
  }
}

describe('planSync', () => {
  it('版本一致 + 正文新鲜 + 元数据未变 → 空计划（热启动零请求）', () => {
    const item = remoteItem()
    const plan = planSync({ localVersion: 'ver-1', local: [localOf(item)], remote: bundle() })
    expect(plan.versionChanged).toBe(false)
    expect(plan.upsert).toEqual([])
    expect(plan.needBody).toEqual([])
    expect(plan.remove).toEqual([])
    expect(plan.unchanged).toBe(1)
  })

  it('首次同步（本地无记录）→ upsert 且内联正文时不额外请求正文', () => {
    const plan = planSync({ localVersion: null, local: [], remote: bundle() })
    expect(plan.versionChanged).toBe(true)
    expect(plan.upsert.map((i) => i.id)).toEqual([1])
    expect(plan.needBody).toEqual([]) // markdownContent 已内联
  })

  it('服务端降级（bodiesOmitted，无内联正文）→ 进 needBody', () => {
    const remote = bundle({ bodiesOmitted: true, items: [remoteItem({ markdownContent: null })] })
    const plan = planSync({ localVersion: null, local: [], remote })
    expect(plan.needBody).toEqual([1])
  })

  it('本地已有同版本正文 → 即使整体版本变了也不重复拉正文（不写库、不重拉）', () => {
    // 本地正文版本 = contentVersion:v1（与远端一致）；本次远端未内联正文
    const cachedItem = remoteItem({ markdownContent: '# cached' })
    const remoteNoInline = remoteItem({ markdownContent: null })
    const plan = planSync({
      localVersion: 'ver-0',
      local: [localOf(cachedItem)],
      remote: bundle({ version: 'ver-2', items: [remoteNoInline] }),
    })
    expect(plan.needBody).toEqual([])
    expect(plan.unchanged).toBe(1)
  })

  it('单篇 contentVersion 变化 → 只 upsert 该篇，并重新拉正文', () => {
    const oldItem = remoteItem({ contentVersion: 'v0' })
    const newItem = remoteItem({ contentVersion: 'v2', markdownContent: null })
    const plan = planSync({
      localVersion: 'ver-1',
      local: [localOf(oldItem)],
      remote: bundle({ version: 'ver-2', items: [newItem] }),
    })
    expect(plan.upsert.map((i) => i.id)).toEqual([1])
    expect(plan.needBody).toEqual([1])
  })

  it('元数据变化（标题/标签）→ upsert 但不重拉正文', () => {
    const oldItem = remoteItem()
    const renamed = remoteItem({ title: '改过的标题' })
    const plan = planSync({
      localVersion: 'ver-1',
      local: [localOf(oldItem)],
      remote: bundle({ version: 'ver-2', items: [renamed] }),
    })
    expect(plan.upsert.map((i) => i.id)).toEqual([1])
    expect(plan.needBody).toEqual([])
  })

  it('服务端内联了正文但本地没有正文 → 仍须 upsert 把正文落库（回归：详情页「内容加载失败」）', () => {
    // 本地有元数据记录但没有 markdownContent（线上事故时的缓存形态）
    const item = remoteItem()
    const brokenLocal: LocalNewsRecord = {
      id: item.id,
      contentFetchedVersion: undefined,
      sourceFingerprint: sourceFingerprintOf(item as never),
    }
    const plan = planSync({
      localVersion: 'ver-1',
      local: [brokenLocal],
      remote: bundle(),
    })
    expect(plan.upsert.map((i) => i.id)).toEqual([1])
    expect(plan.needBody).toEqual([]) // 内联正文已够用，不必再打单篇接口
  })

  it('远端已删除的条目 → remove', () => {
    const plan = planSync({
      localVersion: 'ver-1',
      local: [{ id: 99, markdownContent: '# old', contentFetchedVersion: 'x' }],
      remote: bundle(),
    })
    expect(plan.remove).toEqual([99])
  })

  it('远端空列表（异常响应）→ 不删本地缓存', () => {
    const plan = planSync({
      localVersion: 'ver-1',
      local: [{ id: 99, markdownContent: '# old' }],
      remote: bundle({ items: [] }),
    })
    expect(plan.remove).toEqual([])
  })
})
