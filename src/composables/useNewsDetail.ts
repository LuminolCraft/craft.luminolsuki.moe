/**
 * 新闻详情（slug 路由 + 旧 id 兼容）
 *
 * 三个状态必须分清：
 * - `loading`：正文与元数据仍在取；
 * - `notFound`：接口明确 404（草稿、已删除、错误链接）——展示「不存在」而不是「加载失败」；
 * - `error`：网络/服务异常——展示可重试的错误态。
 *
 * 旧链接 `/NewsDetail?id=3` 仍可访问：按 id 取到详情后 replace 到 `/news/<slug>`，
 * 保持「一种内容只有一个 URL」，避免分享出去的还是查询串。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { NewsDetail } from '@/types/news'
import { fetchNewsDetail, recordNewsRead } from '@/utils/news/news-api'
import { renderMarkdown } from '@/utils/markdown/renderer'
import { buildTocItems, type TocRenderItem } from '@/utils/markdown/toc'

/** HTML 图片标签 → Markdown 语法（正文里混排 <img> 时统一交给渲染管线）。 */
function convertHtmlImagesToMarkdown(markdown: string): string {
  return markdown.replace(/<img\s+([^>]*?)>/gi, (fullTag) => {
    const srcMatch = fullTag.match(/src=["']([^"']*)["']/i)
    if (!srcMatch) return fullTag
    const src = srcMatch[1]
    const altMatch = fullTag.match(/alt=["']([^"']*)["']/i)
    const alt = altMatch ? altMatch[1] : '图片'
    const titleMatch = fullTag.match(/title=["']([^"']*)["']/i)
    const title = titleMatch && titleMatch[1] ? ` "${titleMatch[1].trim()}"` : ''
    return `![${alt}](${src}${title})`
  })
}

/** 判断是否为「不存在」类错误（后端 NEWS_NOT_FOUND）。 */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'NEWS_NOT_FOUND'
  )
}

export function useNewsDetail() {
  const router = useRouter()

  const item = ref<NewsDetail | null>(null)
  const loading = ref(true)
  const notFound = ref(false)
  const error = ref(false)
  const renderedHtml = ref('')
  const tocItems = ref<TocRenderItem[]>([])
  const readCount = ref<number | null>(null)

  /** 拉取并渲染；`key` 为 slug 或旧 id。 */
  async function load(key: string): Promise<void> {
    loading.value = true
    notFound.value = false
    error.value = false
    renderedHtml.value = ''
    tocItems.value = []
    readCount.value = null

    try {
      const detail = await fetchNewsDetail(key)
      item.value = detail
      document.title = `${detail.title} - LuminolCraft`

      // 阅读计数上报（服务端按访客 + 日去重）：不阻塞正文渲染，失败静默
      void recordNewsRead(detail.id).then((count) => {
        if (count !== null) readCount.value = count
      })

      try {
        const converted = convertHtmlImagesToMarkdown(detail.body)
        const result = await renderMarkdown(converted, window.location.origin)
        renderedHtml.value = result.html
        tocItems.value = buildTocItems(result.toc, 3)
      } catch {
        // 渲染管线异常时降级为纯文本，至少让读者看到内容
        renderedHtml.value = `<p>${detail.body.replace(/\n/g, '<br>')}</p>`
        tocItems.value = []
      }
    } catch (err) {
      item.value = null
      if (isNotFound(err)) {
        notFound.value = true
      } else {
        error.value = true
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 旧链接兼容：`/NewsDetail?id=3` 取到详情后替换成 slug URL。
   * 用 replace 而不是 push，避免返回键回到一个会立刻跳走的地址。
   */
  async function loadLegacyId(id: number): Promise<void> {
    await load(String(id))
    if (item.value) {
      void router.replace({ name: 'news-detail', params: { slug: item.value.slug } })
    }
  }

  return { item, loading, notFound, error, renderedHtml, tocItems, readCount, load, loadLegacyId }
}
