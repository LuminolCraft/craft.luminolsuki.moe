/**
 * AI 输出的 Markdown 解析。
 *
 * 为什么不用现成的 MarkdownRenderer：那个组件是给新闻正文用的（`v-html` +
 * 无 sanitize，因为新闻内容来自自己的后台）。AI 输出是从公网不可信来源来的
 * 文本，一旦 `v-html` 就是 XSS。
 *
 * 所以这里走另一条路：**解析成结构化 token，用 Vue 模板插值渲染**——
 * 全程不产生 HTML 字符串，`<script>` 只会被当成文字显示。代价是只支持
 * Markdown 的一个子集（代码块 / 标题 / 列表 / 粗体 / 行内代码 / 链接），
 * 但 AI 回复用不到更多。
 *
 * 流式友好：围栏未闭合（``` 出现但还没等来收尾）也当代码块渲染，
 * 否则生成代码时用户会看到内容在「普通文本 ↔ 代码块」之间反复跳。
 */
import { isAllowedAiUrl } from './ai-chat'

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'code'; value: string }
  /** href 已过白名单；不合法的链接会在解析阶段降级为 text，不会走到这里 */
  | { type: 'link'; value: string; href: string }

export type Block =
  | { type: 'code'; lang: string; code: string }
  | { type: 'heading'; level: number; tokens: InlineToken[] }
  | { type: 'list'; ordered: boolean; items: InlineToken[][] }
  | { type: 'paragraph'; tokens: InlineToken[] }

interface FenceSegment {
  kind: 'text' | 'code'
  text: string
  lang: string
}

/** 按 ``` 围栏切段；不闭合的围栏把剩余内容整体当作代码块。 */
function splitByFence(input: string): FenceSegment[] {
  const segments: FenceSegment[] = []
  const pattern = /```([\w+#-]*)\r?\n?/g
  let cursor = 0
  let match = pattern.exec(input)

  while (match !== null) {
    const start = match.index
    if (start > cursor) {
      segments.push({ kind: 'text', text: input.slice(cursor, start), lang: '' })
    }

    const lang = match[1] ?? ''
    const bodyStart = start + match[0].length
    const close = input.indexOf('```', bodyStart)

    if (close === -1) {
      // 流式未闭合：剩余全部是代码，先渲染再说
      segments.push({ kind: 'code', text: input.slice(bodyStart), lang })
      return segments
    }

    segments.push({ kind: 'code', text: input.slice(bodyStart, close), lang })
    cursor = close + 3
    pattern.lastIndex = cursor
    match = pattern.exec(input)
  }

  if (cursor < input.length) {
    segments.push({ kind: 'text', text: input.slice(cursor), lang: '' })
  }
  return segments
}

const INLINE_PATTERN = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\([^()\s]+\))/g

/** 行内解析。链接不在白名单时降级为纯文本（不可点），而不是丢弃内容。 */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let cursor = 0

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0
    if (index > cursor) tokens.push({ type: 'text', value: text.slice(cursor, index) })

    const raw = match[0]
    if (raw.startsWith('`')) {
      tokens.push({ type: 'code', value: raw.slice(1, -1) })
    } else if (raw.startsWith('**')) {
      tokens.push({ type: 'strong', value: raw.slice(2, -2) })
    } else {
      const labelEnd = raw.indexOf('](')
      const label = raw.slice(1, labelEnd)
      const href = raw.slice(labelEnd + 2, -1)
      tokens.push(
        isAllowedAiUrl(href)
          ? { type: 'link', value: label, href }
          : { type: 'text', value: label },
      )
    }
    cursor = index + raw.length
  }

  if (cursor < text.length) tokens.push({ type: 'text', value: text.slice(cursor) })
  return tokens.length > 0 ? tokens : [{ type: 'text', value: '' }]
}

const LIST_PATTERN = /^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/

/** 把一段无围栏文本解析成段落 / 标题 / 列表。 */
function parseTextBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.split(/\r?\n/)

  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    blocks.push({ type: 'paragraph', tokens: parseInline(paragraph.join(' ')) })
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    blocks.push({ type: 'list', ordered: list.ordered, items: list.items.map(parseInline) })
    list = null
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.length === 0) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = HEADING_PATTERN.exec(trimmed)
    if (heading) {
      flushParagraph()
      flushList()
      const level = (heading[1] ?? '#').length
      blocks.push({ type: 'heading', level, tokens: parseInline(heading[2] ?? '') })
      continue
    }

    const item = LIST_PATTERN.exec(line)
    if (item) {
      flushParagraph()
      const ordered = Boolean(item[2])
      if (list && list.ordered !== ordered) flushList()
      if (!list) list = { ordered, items: [] }
      list.items.push(item[3] ?? '')
      continue
    }

    // 列表项内的续行并入最后一项，避免长条目被拆成独立段落
    if (list && list.items.length > 0) {
      list.items[list.items.length - 1] += ` ${trimmed}`
      continue
    }

    flushList()
    paragraph.push(trimmed)
  }

  flushParagraph()
  flushList()
  return blocks
}

export function parseAiMarkdown(input: string): Block[] {
  const blocks: Block[] = []
  for (const segment of splitByFence(input)) {
    if (segment.kind === 'code') {
      blocks.push({ type: 'code', lang: segment.lang, code: segment.text.replace(/\n$/, '') })
    } else {
      blocks.push(...parseTextBlocks(segment.text))
    }
  }
  return blocks
}
