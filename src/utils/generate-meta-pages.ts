/**
 * 构建后为每个路由与每条新闻生成带专属 meta 的静态 HTML。
 *
 * 为什么存在：SPA 只有一份 index.html，标题全站通用、描述是空壳占位——
 * 社交平台与 IM 分享链接时预览一片难看。vite build 之后跑本脚本，在
 * `dist/<路径>/index.html` 生成带真实 meta 的副本（复用同一份 SPA 引导，
 * 浏览器打开后 Vue Router 照常接管渲染，抓取器则读到真实的标题/摘要/封面）。
 *
 * 数据源：
 * - 静态路由的文案在 PAGE_META 里手写（站点文案改动时同步这里）；
 * - 新闻从生产 API 拉取（构建机可达）；API 失败时降级为只生成静态路由页，
 *   构建不能因为新闻接口挂了而失败。
 */
import fs from 'fs'
import path from 'path'

const SITE = 'https://craft.luminolsuki.moe'
const DIST = path.resolve('dist')
/** 无封面新闻的默认分享图（站点 logo）。 */
const DEFAULT_OG_IMAGE = 'https://imagehosting-ez2.pages.dev/images/c25a955166388e1257c23d01c78a62e6.webp'

const SITE_NAME = 'LuminolCraft'

interface PageMeta {
  title: string
  description: string
  image?: string
  type?: 'website' | 'article'
}

/** 静态路由的分享文案（与 i18n 的 zh 文案对齐，站点文案改动时同步这里）。 */
const PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: `${SITE_NAME} 服务器 - 加入我们的冒险`,
    description: '由热情的管理员和玩家社区共建的 Minecraft 公益服：纯净生存与综合生存双服，无付费特权，长期稳定运行。',
  },
  '/SimpleRules': {
    title: `服务器规则（简洁版） - ${SITE_NAME}`,
    description: 'LuminolCraft 服务器规则速览：保护他人、禁止偷窃与破坏、作弊封禁。进入服务器前请先阅读。',
  },
  '/Support': {
    title: `支持我们 - ${SITE_NAME}`,
    description: 'LuminolCraft 是免费公益服，你的支持是我们长期运营的动力。',
  },
  '/news': {
    title: `服务器新闻 - ${SITE_NAME}`,
    description: '发现 LuminolCraft 的最新动态与社区精彩故事：更新、公告、活动与处罚公示。',
  },
  '/news/archive': {
    title: `新闻归档 - ${SITE_NAME}`,
    description: '按月份浏览 LuminolCraft 的全部新闻与公告。',
  },
  '/Monitoring': {
    title: `服务器监控 - ${SITE_NAME}`,
    description: '实时查看 LuminolCraft 各服务器的在线状态与玩家数。',
  },
}

interface NewsItem {
  slug: string
  title: string
  description: string
  coverUrl: string | null
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 描述压到单行并截断——og:description 太长会被社交平台整段丢弃。 */
function clamp(value: string, max = 160): string {
  const single = value.replace(/\s+/g, ' ').trim()
  return single.length <= max ? single : `${single.slice(0, max - 1)}…`
}

/** 在 SPA 壳上替换标题并注入分享 meta；只动 <head>，正文不动。 */
function injectMeta(baseHtml: string, meta: PageMeta, urlPath: string): string {
  const title = escapeHtmlAttr(meta.title)
  const description = escapeHtmlAttr(clamp(meta.description))
  const image = escapeHtmlAttr(meta.image ?? DEFAULT_OG_IMAGE)
  const url = escapeHtmlAttr(`${SITE}${urlPath}`)
  const type = meta.type ?? 'website'

  const block = [
    `<meta name="description" content="${description}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<link rel="canonical" href="${url}" />`,
  ].join('\n    ')

  return baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace('</title>', `</title>\n    ${block}`)
}

/** 生成 <路由>/index.html（根路径直接覆写 dist/index.html）。 */
function writePage(baseHtml: string, urlPath: string, meta: PageMeta): void {
  const html = injectMeta(baseHtml, meta, urlPath)
  const target =
    urlPath === '/' ? path.join(DIST, 'index.html') : path.join(DIST, urlPath, 'index.html')
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, html, 'utf8')
}

async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch(`${SITE}/api/v1/news?limit=50`, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`新闻接口 ${res.status}`)
  const payload = (await res.json()) as { data?: { items?: NewsItem[] } }
  return payload.data?.items ?? []
}

async function generate(): Promise<void> {
  const baseHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')

  // 静态路由
  let staticCount = 0
  for (const [urlPath, meta] of Object.entries(PAGE_META)) {
    writePage(baseHtml, urlPath, meta)
    staticCount += 1
  }

  // 新闻详情：article 类型 + 封面图
  let newsCount = 0
  try {
    const items = await fetchNews()
    for (const item of items) {
      writePage(
        baseHtml,
        `/news/${item.slug}`,
        {
          title: `${item.title} - ${SITE_NAME} 新闻`,
          description: item.description || item.title,
          image: item.coverUrl ?? undefined,
          type: 'article',
        },
      )
      newsCount += 1
    }
  } catch (err) {
    console.warn(`[meta-pages] 新闻 meta 生成降级（接口不可达）：${err instanceof Error ? err.message : String(err)}`)
  }

  console.log(`Meta pages generated: ${staticCount} static + ${newsCount} news`)
}

generate()
