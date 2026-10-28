import { ref } from 'vue';
import { NewsManager } from '@/utils/news/news-manager';
import { renderMarkdown } from '@/utils/markdown/renderer';
import { buildTocItems, type TocRenderItem } from '@/utils/markdown/toc';
import type { NewsItem } from '@/types/news';

// ---------- 新增：HTML 图片转 Markdown 语法 ----------
function convertHtmlImagesToMarkdown(markdown: string): string {
  return markdown.replace(/<img\s+([^>]*?)>/gi, (fullTag) => {
    const srcMatch = fullTag.match(/src=["']([^"']*)["']/i);
    if (!srcMatch) return fullTag;
    const src = srcMatch[1];
    const altMatch = fullTag.match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : '图片';
    const titleMatch = fullTag.match(/title=["']([^"']*)["']/i);
    const title = titleMatch && titleMatch[1] ? ` "${titleMatch[1].trim()}"` : '';
    return `![${alt}](${src}${title})`;
  });
}

export function useNewsDetail() {
  const newsManager = new NewsManager();
  const loading = ref(true);
  const error = ref<string | null>(null);
  const newsItem = ref<NewsItem | null>(null);
  const renderedHtml = ref('');
  const tocItems = ref<TocRenderItem[]>([]);
  /** 阅读次数（详情页 CountUp 动画目标）；上报失败 / 未返回前为 null，不显示。 */
  const readCount = ref<number | null>(null);

  const loadNews = async (id: number) => {
    try {
      loading.value = true;
      error.value = null;
      renderedHtml.value = '';
      tocItems.value = [];
      readCount.value = null;

      await newsManager.restoreCachePublic();
      const item = await newsManager.ensureArticleContent(id);
      if (!item) {
        // 新闻不存在（已被删除 / id 非法）：不是加载错误，交给视图的 notFound 分支渲染
        newsItem.value = null;
        loading.value = false;
        return;
      }
      newsItem.value = item;
      document.title = `${item.title} - LuminolCraft`;

      // 阅读计数上报（服务端按访客 + 日去重）：不阻塞正文渲染，失败静默
      void newsManager.recordRead(id).then((count) => {
        if (count !== null) readCount.value = count;
      });

      if (item.markdownContent) {
        try {
          // 🔥 关键：先转换 HTML 图片标签为标准 Markdown 语法
          const converted = convertHtmlImagesToMarkdown(item.markdownContent);
          const result = await renderMarkdown(converted, window.location.origin);
          renderedHtml.value = result.html;
          tocItems.value = buildTocItems(result.toc, 3);
        } catch (err) {
          console.error('Markdown 渲染失败:', err);
          // 降级：纯文本显示
          renderedHtml.value = `<p>${item.markdownContent.replace(/\n/g, '<br>')}</p>`;
          tocItems.value = [];
        }
      }

      loading.value = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      error.value = `加载失败: ${message}`;
      loading.value = false;
    }
  };

  const retryLoad = (id: number) => loadNews(id);

  return {
    loading,
    error,
    newsItem,
    renderedHtml,
    tocItems,
    readCount,
    loadNews,
    retryLoad,
  };
}