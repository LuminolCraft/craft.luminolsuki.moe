import { describe, expect, it } from 'vitest'
import { parseAiMarkdown, parseInline } from './ai-markdown'

/** 把 Block 压成一段纯文本，便于断言「内容在不在、顺序对不对」。 */
function flatten(blocks: ReturnType<typeof parseAiMarkdown>): string {
  return blocks
    .map((block) => {
      if (block.type === 'code') return block.code
      if (block.type === 'list') return block.items.map((i) => i.map((t) => t.value).join('')).join('|')
      return block.tokens.map((t) => t.value).join('')
    })
    .join('\n')
}

describe('parseAiMarkdown', () => {
  it('普通段落', () => {
    const blocks = parseAiMarkdown('你好呀，我是 Luminol。')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.type).toBe('paragraph')
  })

  it('空行分段', () => {
    const blocks = parseAiMarkdown('第一段\n\n第二段')
    expect(blocks).toHaveLength(2)
    expect(blocks.every((b) => b.type === 'paragraph')).toBe(true)
  })

  it('围栏代码块保留语言标记与原文', () => {
    const blocks = parseAiMarkdown('说明：\n```bash\n/v 123456\n```')
    const code = blocks.find((b) => b.type === 'code')
    expect(code).toBeDefined()
    if (code?.type === 'code') {
      expect(code.lang).toBe('bash')
      expect(code.code).toBe('/v 123456')
    }
  })

  it('未闭合围栏当代码块渲染（流式生成中常见）', () => {
    const blocks = parseAiMarkdown('看这个：\n```js\nconst a = 1')
    const code = blocks.find((b) => b.type === 'code')
    expect(code).toBeDefined()
    if (code?.type === 'code') expect(code.code).toContain('const a = 1')
  })

  it('无序列表与有序列表分开成块', () => {
    const unordered = parseAiMarkdown('- 第一项\n- 第二项')
    expect(unordered[0]?.type).toBe('list')
    if (unordered[0]?.type === 'list') {
      expect(unordered[0].ordered).toBe(false)
      expect(unordered[0].items).toHaveLength(2)
    }

    const ordered = parseAiMarkdown('1. 先绑定账号\n2. 再进服核验')
    if (ordered[0]?.type === 'list') {
      expect(ordered[0].ordered).toBe(true)
      expect(ordered[0].items).toHaveLength(2)
    }
  })

  it('标题识别为 heading', () => {
    const blocks = parseAiMarkdown('## 进服步骤')
    expect(blocks[0]?.type).toBe('heading')
  })

  it('粗体与行内代码', () => {
    const tokens = parseInline('用 **正版启动器** 运行 `/v 123456`')
    expect(tokens.some((t) => t.type === 'strong' && t.value === '正版启动器')).toBe(true)
    expect(tokens.some((t) => t.type === 'code' && t.value === '/v 123456')).toBe(true)
  })

  it('站内链接保留为 link', () => {
    const tokens = parseInline('详见 [常用指令](/News/1)')
    const link = tokens.find((t) => t.type === 'link')
    expect(link).toBeDefined()
    if (link?.type === 'link') expect(link.href).toBe('/News/1')
  })

  it('站外链接降级为纯文本（不可点）', () => {
    const tokens = parseInline('点 [这里](https://evil.com/login) 登录')
    expect(tokens.some((t) => t.type === 'link')).toBe(false)
    expect(tokens.some((t) => t.type === 'text' && t.value === '这里')).toBe(true)
  })

  it('<script> 只会变成文字，不产生 HTML', () => {
    const blocks = parseAiMarkdown('<script>alert(1)</script>')
    // 全部是 text token，渲染层用插值输出，浏览器不会执行
    expect(blocks[0]?.type).toBe('paragraph')
    expect(flatten(blocks)).toContain('<script>')
    const tokens = blocks[0]?.type === 'paragraph' ? blocks[0].tokens : []
    expect(tokens.every((t) => t.type === 'text')).toBe(true)
  })

  it('公式里的 $ 不会被误当解析语法（原样保留）', () => {
    const blocks = parseAiMarkdown('价格是 $5 起')
    expect(flatten(blocks)).toContain('$5')
  })
})
