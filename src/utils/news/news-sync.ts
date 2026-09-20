/**
 * 新闻增量同步计划（纯函数，便于单测；不含网络与 IndexedDB）。
 *
 * 远端 = Nexus 同源代理 `GET /api/v1/news`（见后端 `src/modules/news/`）：
 * - `version`：manifest 指纹（服务端按原始字节算），与本地 `meta.newsVersion`
 *   相同即"整体没变"——此时连正文都不用碰（0 请求增量）；
 * - 每篇 `contentVersion`：正文指纹，用于判断"只改了这一篇"；
 * - `bodiesOmitted`：服务端未内联正文（条数 / 体积超预算），此时按条走
 *   `GET /api/v1/news/:id` 懒加载。
 *
 * 之所以把判定抽成纯函数：缓存增量逻辑过去散在 NewsManager 内部、靠
 * ETag/Last-Modified 双头与"猜指纹"，难测也难查；现在远端直接给出权威版本号，
 * 判定即可脱离 IndexedDB 单测。
 */

/** 远端条目（服务端 `NewsItemView` 的子集，字段可空）。 */
export interface RemoteNewsItem {
  id: number;
  title: string;
  date: string;
  tags?: string[] | null;
  image?: string | null;
  additionalImages?: string[] | null;
  pinned?: boolean | null;
  summary?: string | null;
  updatedAt?: string | null;
  /** 正文地址（服务端同源 `/api/v1/news/:id` 或上游 URL；仅作诊断与指纹用）。 */
  content?: string | null;
  /** 内联正文（服务端未降级时提供）。 */
  markdownContent?: string | null;
  contentVersion?: string | null;
}

/** 远端聚合（服务端 `NewsBundle`）。 */
export interface RemoteNewsBundle {
  version: string;
  generatedAt: number;
  bodiesOmitted: boolean;
  skipped?: number;
  items: RemoteNewsItem[];
}

/** 本地缓存记录的判定字段（IndexedDB `articles` store 的子集）。 */
export interface LocalNewsRecord {
  id: number;
  markdownContent?: string;
  contentFetchedVersion?: string;
  sourceFingerprint?: string;
}

/** 同步计划：`upsert` 需写库、`needBody` 需按条拉正文、`remove` 需删库。 */
export interface SyncPlan {
  /** 远端 manifest 指纹是否与本地记录的一致。 */
  versionChanged: boolean;
  upsert: RemoteNewsItem[];
  remove: number[];
  needBody: number[];
  unchanged: number;
}

/**
 * 元数据指纹（标题/标签/配图/置顶等）：与正文无关，用于判断"索引信息变了"。
 */
export function sourceFingerprintOf(item: RemoteNewsItem): string {
  return JSON.stringify({
    id: item.id,
    title: item.title,
    content: item.content ?? '',
    date: item.date,
    tags: [...(item.tags ?? [])],
    image: item.image ?? '',
    additionalImages: [...(item.additionalImages ?? [])],
    pinned: Boolean(item.pinned),
    updatedAt: item.updatedAt ?? '',
  });
}

/**
 * 正文版本键：优先服务端给的 `contentVersion`（内容哈希），
 * 其次 `updatedAt`，最后退回正文地址 + 元数据指纹。
 */
export function contentVersionKey(item: RemoteNewsItem): string {
  if (item.contentVersion) return `contentVersion:${item.contentVersion}`;
  if (item.updatedAt) return `updatedAt:${item.updatedAt}`;
  return `contentUrl:${item.content ?? ''}`;
}

/**
 * 计算同步计划。
 *
 * - `version` 与本地一致 **且** 每篇都能满足正文要求（内联正文或本地已有正文）
 *   → 全部 unchanged，`upsert`/`needBody` 均为空（热启动 0 正文请求）；
 * - 否则只 upsert 元数据或正文版本变化的条目，并列出仍需拉正文的 id；
 * - 远端已删除的 id 进 `remove`。
 */
export function planSync(input: {
  localVersion: string | null;
  local: LocalNewsRecord[];
  remote: RemoteNewsBundle;
}): SyncPlan {
  const { localVersion, local, remote } = input;
  const localMap = new Map(local.map((item) => [item.id, item]));

  const remoteIds = new Set(remote.items.map((item) => item.id));
  const remove = local.filter((item) => !remoteIds.has(item.id)).map((item) => item.id);

  const plan: SyncPlan = {
    versionChanged: localVersion === null || localVersion !== remote.version,
    upsert: [],
    remove,
    needBody: [],
    unchanged: 0,
  };

  for (const item of remote.items) {
    const cached = localMap.get(item.id);
    const inline = item.markdownContent ?? null;
    const versionKey = contentVersionKey(item);
    const hasLocalBody = Boolean(cached?.markdownContent);
    /**
     * 正文新鲜 = **本地已存正文**且版本对得上。
     *
     * 注意不能因为"服务端这次内联了正文"就判定新鲜：内联正文必须落到 IndexedDB，
     * 否则本地记录的 `markdownContent` 永远为空——列表卡片显示「暂无内容」、
     * 详情页每次都要多打一次单篇请求（线上曾因此表现为「内容加载失败」）。
     */
    const localBodyFresh = hasLocalBody && cached?.contentFetchedVersion === versionKey;
    const metadataChanged =
      !cached || cached.sourceFingerprint === undefined
        ? true
        : cached.sourceFingerprint !== sourceFingerprintOf(item);

    // 本地正文与元数据都新鲜 → 无需写库（manifest 整体版本变化不代表每篇都变了）
    if (localBodyFresh && !metadataChanged) {
      plan.unchanged += 1;
      continue;
    }

    plan.upsert.push(item);
    if (inline === null && !localBodyFresh) plan.needBody.push(item.id);
  }

  // 远端一条都没有（异常响应）时不删本地缓存，避免把页面清空
  if (remote.items.length === 0) plan.remove = [];

  return plan;
}
