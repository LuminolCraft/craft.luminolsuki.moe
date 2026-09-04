/**
 * Unified Markdown 渲染管线
 *
 * 基于 unified + remark + rehype 的客户端 Markdown 渲染器。
 * 替代原有的 marked + 正则替换方案，解决数学公式误匹配等问题。
 *
 * 管线顺序：
 *   Markdown 源码
 *   → remark-parse (mdast)
 *   → remark-gfm (表格、删除线、任务列表等)
 *   → remark-math (数学公式节点)
 *   → remark-directive (:::note 等指令)
 *   → remark-rehype (mdast → hast)
 *   → rehype-slug (标题 id)
 *   → rehype-autolink-headings (标题锚点链接)
 *   → rehype-katex (数学公式渲染)
 *   → rehype-highlight (代码高亮)
 *   → rehype-sanitize (XSS 白名单过滤)
 *   → rehype-stringify (HTML 字符串)
 */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import type { Root, Element, ElementContent } from 'hast'
import type { TocItem } from './toc'

// ---------- rehype-sanitize 白名单扩展 ----------
// 允许 KaTeX 生成的 MathML 元素和属性
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // KaTeX MathML 元素
    math: ['display', 'xmlns'],
    mi: ['mathvariant'],
    mo: ['fence', 'separator', 'stretchy', 'symmetric', 'lspace', 'rspace'],
    mn: [],
    mtext: [],
    mrow: [],
    mfrac: ['linethickness'],
    msqrt: [],
    mroot: [],
    msup: [],
    msub: [],
    msubsup: [],
    munder: [],
    mover: [],
    munderover: [],
    mmultiscripts: [],
    mtable: ['columnalign', 'rowspacing', 'columnspacing'],
    mtr: [],
    mtd: ['columnalign'],
    mspace: ['width', 'height'],
    mstyle: ['displaystyle', 'scriptlevel', 'mathcolor', 'mathsize'],
    mpadded: ['width', 'height', 'depth', 'lspace', 'voffset'],
    mphantom: [],
    menclose: ['notation'],
    maction: ['actiontype'],
    semantics: [],
    annotation: ['encoding'],
    // highlight.js 代码高亮
    span: [
      ...(defaultSchema.attributes?.span || []),
      'className',
    ],
    // 标题锚点（过滤 defaultSchema 中限定值的 className 条目，否则自定义 class 会被过滤为空）
    a: [
      ...(defaultSchema.attributes?.a || []).filter(
        (entry) => !(Array.isArray(entry) && entry[0] === 'className'),
      ),
      'className', 'ariaLabel', 'title', 'target', 'rel',
    ],
    // 图片 - 修复：显式包含 src 和 alt，同时保留 loading、decoding 和 title
    img: [
      ...(defaultSchema.attributes?.img || []),
      'src',      // 关键修复
      'alt',      // 关键修复
      'title',
      'loading',
      'decoding',
      'className',
    ],
    // 代码块
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className'],
    // 表格
    table: [...(defaultSchema.attributes?.table || []), 'className'],
    thead: [...(defaultSchema.attributes?.thead || []), 'className'],
    tbody: [...(defaultSchema.attributes?.tbody || []), 'className'],
    tr: [...(defaultSchema.attributes?.tr || []), 'className'],
    th: [...(defaultSchema.attributes?.th || []), 'className', 'align'],
    td: [...(defaultSchema.attributes?.td || []), 'className', 'align'],
    // 引用
    blockquote: [...(defaultSchema.attributes?.blockquote || []), 'className'],
    // 列表
    ul: [...(defaultSchema.attributes?.ul || []), 'className'],
    ol: [...(defaultSchema.attributes?.ol || []), 'className'],
    li: [...(defaultSchema.attributes?.li || []), 'className'],
    // 段落
    p: [...(defaultSchema.attributes?.p || []), 'className'],
    // 标题
    h1: [...(defaultSchema.attributes?.h1 || []), 'className', 'id'],
    h2: [...(defaultSchema.attributes?.h2 || []), 'className', 'id'],
    h3: [...(defaultSchema.attributes?.h3 || []), 'className', 'id'],
    h4: [...(defaultSchema.attributes?.h4 || []), 'className', 'id'],
    h5: [...(defaultSchema.attributes?.h5 || []), 'className', 'id'],
    h6: [...(defaultSchema.attributes?.h6 || []), 'className', 'id'],
    // 通用
    div: [...(defaultSchema.attributes?.div || []), 'className'],
    figure: [...(defaultSchema.attributes?.figure || []), 'className'],
    figcaption: [...(defaultSchema.attributes?.figcaption || []), 'className'],
    hr: [...(defaultSchema.attributes?.hr || []), 'className'],
    strong: [...(defaultSchema.attributes?.strong || []), 'className'],
    em: [...(defaultSchema.attributes?.em || []), 'className'],
    del: [...(defaultSchema.attributes?.del || []), 'className'],
    sup: [...(defaultSchema.attributes?.sup || []), 'className'],
    sub: [...(defaultSchema.attributes?.sub || []), 'className'],
    br: [...(defaultSchema.attributes?.br || []), 'className'],
    // 外链图标 SVG（静态注入，无用户输入）
    svg: [
      'className', 'viewBox', 'fill', 'stroke', 'strokeWidth',
      'strokeLinecap', 'strokeLinejoin', 'xmlns', 'ariaHidden', 'width', 'height',
    ],
    path: ['d'],
    polyline: ['points'],
    line: ['x1', 'y1', 'x2', 'y2'],
  },
  // 允许的标签
  tagNames: [
    ...(defaultSchema.tagNames || []),
    // KaTeX MathML
    'math', 'mi', 'mo', 'mn', 'mtext', 'mrow', 'mfrac', 'msqrt', 'mroot',
    'msup', 'msub', 'msubsup', 'munder', 'mover', 'munderover',
    'mmultiscripts', 'mtable', 'mtr', 'mtd', 'mspace', 'mstyle',
    'mpadded', 'mphantom', 'menclose', 'maction', 'semantics', 'annotation',
    // 语义化
    'figure', 'figcaption', 'article', 'aside', 'details', 'summary',
    'mark', 'time', 'abbr',
    // 外链图标 SVG
    'svg', 'path', 'polyline', 'line',
  ],
}

// ---------- TOC 提取插件 ----------
// 在 rehype 阶段遍历 hast 树，提取 h1-h6 标题信息
function rehypeExtractToc(tocItems: TocItem[]) {
  return (tree: Root) => {
    let index = 0
    visit(tree, 'element', (node: Element) => {
      if (!/^h[1-6]$/.test(node.tagName)) return
      const depth = parseInt(node.tagName.charAt(1), 10)
      const id = (node.properties?.id as string) || ''
      if (!id) return
      // 提取标题纯文本（跳过 heading-anchor 锚点图标，避免提取到 # 号）
      let text = ''
      const extractText = (children: ElementContent[]) => {
        for (const child of children) {
          if (child.type === 'text') {
            text += child.value
          } else if (child.type === 'element' && child.children) {
            // 跳过 rehype-autolink-headings 追加的锚点链接
            const childClass = child.properties?.className as string | string[] | undefined
            const classList = Array.isArray(childClass)
              ? childClass
              : typeof childClass === 'string'
                ? childClass.split(/\s+/)
                : []
            if (classList.includes('heading-anchor') || classList.includes('heading-anchor-icon')) {
              continue
            }
            extractText(child.children)
          }
        }
      }
      extractText(node.children)
      tocItems.push({
        id,
        text: text.trim(),
        depth,
        index: index++,
      })
    })
  }
}

// ---------- 外部链接处理插件 ----------
// 为外部链接添加 target="_blank"、rel="noopener noreferrer"，并在链接末尾注入外链 SVG 图标

// 外链图标（静态节点，随 rehypeExternalLinks 复用）
function createExternalLinkIcon(): Element {
  return {
    type: 'element',
    tagName: 'svg',
    properties: {
      className: ['external-link-icon'],
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ariaHidden: 'true',
    },
    children: [
      {
        type: 'element',
        tagName: 'path',
        properties: { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' },
        children: [],
      },
      {
        type: 'element',
        tagName: 'polyline',
        properties: { points: '15 3 21 3 21 9' },
        children: [],
      },
      {
        type: 'element',
        tagName: 'line',
        properties: { x1: '10', y1: '14', x2: '21', y2: '3' },
        children: [],
      },
    ],
  }
}

function rehypeExternalLinks(siteUrl?: string) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return
      const href = node.properties?.href as string
      if (!href || typeof href !== 'string') return
      if (!href.startsWith('http://') && !href.startsWith('https://')) return
      // 跳过本站链接
      if (siteUrl) {
        try {
          if (new URL(href).host === new URL(siteUrl).host) return
        } catch {
          /* ignore */
        }
      }
      node.properties.target = '_blank'
      node.properties.rel = ['noopener', 'noreferrer']
      // 添加外链标识类名
      const existingClass = node.properties.className as string | string[] | undefined
      const classList = Array.isArray(existingClass)
        ? existingClass
        : existingClass
          ? [existingClass]
          : []
      if (!classList.includes('external-link')) {
        classList.push('external-link')
        node.properties.className = classList
      }
      // 在链接文本后追加外链 SVG 图标（避免重复注入）
      const hasIcon = node.children.some(
        (child) => child.type === 'element' && child.tagName === 'svg',
      )
      if (!hasIcon) {
        node.children.push(createExternalLinkIcon())
      }
    })
  }
}

// ---------- 图片 figure 包装插件 ----------
// 带有效 alt 文本的图片自动包裹为 figure + figcaption
// alt 为空或本身是 URL（图床默认的 ![url](url) 格式）时不生成图注，避免链接露出
function isUrlLike(value: string): boolean {
  return (
    /^https?:\/\//i.test(value) ||
    /^www\./i.test(value) ||
    /^[-\w.]+\.[a-z]{2,}(\/|$|\?|#|:)/i.test(value)
  )
}

function rehypeFigure() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index: number | undefined, parent: Element | Root | undefined) => {
      if (node.tagName !== 'img') return
      if (!parent || index === undefined) return
      const alt = ((node.properties?.alt as string) || '').trim()
      const src = (node.properties?.src as string) || ''
      // 无有效描述文字：不生成图注，也无需 figure 包裹
      if (!alt || alt === src || isUrlLike(alt)) return
      // 跳过已经在 figure 中的图片
      if (parent.type === 'element' && parent.tagName === 'figure') return
      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['md-figure'] },
        children: [
          { ...node },
          {
            type: 'element',
            tagName: 'figcaption',
            properties: { className: ['md-figcaption'] },
            children: [{ type: 'text', value: alt }],
          },
        ],
      }
      parent.children[index] = figure
    })
  }
}

// ---------- 渲染结果类型 ----------
export interface RenderResult {
  html: string
  toc: TocItem[]
}

// ---------- 主渲染函数 ----------
let processor: ReturnType<typeof createProcessor> | null = null

function createProcessor(siteUrl?: string) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: {
        className: ['heading-anchor'],
        ariaLabel: 'Link to this section',
      },
      content: {
        type: 'element',
        tagName: 'span',
        properties: { className: ['heading-anchor-icon'] },
        children: [{ type: 'text', value: '#' }],
      },
    })
    .use(rehypeKatex, {
      throwOnError: false,
      strict: false,
    })
    .use(rehypeHighlight, {
      detect: true,
      ignoreMissing: true,
    })
    .use(rehypeExternalLinks, siteUrl)
    .use(rehypeFigure)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
}

/**
 * 渲染 Markdown 为 HTML，同时提取 TOC
 *
 * @param markdown - Markdown 源码
 * @param siteUrl - 站点 URL，用于判断内外链
 * @returns 渲染结果（HTML + TOC 列表）
 */
export async function renderMarkdown(
  markdown: string,
  siteUrl?: string,
): Promise<RenderResult> {
  if (!processor) {
    processor = createProcessor(siteUrl)
  }
  const toc: TocItem[] = []
  // 克隆处理器并添加 TOC 提取插件
  const proc = processor().use(rehypeExtractToc, toc)
  const file = await proc.process(markdown)
  return {
    html: String(file),
    toc,
  }
}

/**
 * 同步渲染 Markdown（仅用于简单场景，不推荐）
 */
export function renderMarkdownSync(markdown: string, siteUrl?: string): RenderResult {
  if (!processor) {
    processor = createProcessor(siteUrl)
  }
  const toc: TocItem[] = []
  const proc = processor().use(rehypeExtractToc, toc)
  const file = proc.processSync(markdown)
  return {
    html: String(file),
    toc,
  }
}

export function convertHtmlImagesToMarkdown(markdown: string): string {
  return markdown.replace(/<img\s+([^>]*?)>/gi, (fullTag) => {
    const srcMatch = fullTag.match(/src=["']([^"']*)["']/i);
    if (!srcMatch) return fullTag;
    const src = srcMatch[1];
    const altMatch = fullTag.match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : '图片';
    const titleMatch = fullTag.match(/title=["']([^"']*)["']/i);
    const title = titleMatch?.[1] ? ` "${titleMatch[1].trim()}"` : '';
    return `![${alt}](${src}${title})`;
  });
}