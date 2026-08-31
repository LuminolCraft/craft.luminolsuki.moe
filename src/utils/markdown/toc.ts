/**
 * TOC（文章目录）工具函数
 *
 * 负责将从 Markdown 中提取的原始标题列表转换为结构化的 TOC 数据，
 * 并提供渲染、滚动监听、活动项高亮等功能。
 */

// ---------- 类型定义 ----------

/** 从 Markdown 中提取的原始标题项 */
export interface TocItem {
  /** 标题锚点 id */
  id: string
  /** 标题纯文本 */
  text: string
  /** 标题层级（1-6） */
  depth: number
  /** 在文档中的顺序索引 */
  index: number
}

/** 用于渲染的结构化 TOC 项 */
export interface TocRenderItem {
  id: string
  text: string
  /** 相对深度（0 = 最浅层，1 = 次层，2 = 更深层） */
  depthLevel: 0 | 1 | 2
  /** 徽章类型：index = 数字编号，dot = 圆点，dot-sm = 小圆点 */
  badgeKind: 'index' | 'dot' | 'dot-sm'
  /** 数字编号（仅 badgeKind === 'index' 时有效） */
  badgeIndex?: number
  /** 标签样式：primary = 主标题样式，secondary = 次级标题样式 */
  labelStyle: 'primary' | 'secondary'
}

// ---------- TOC 数据处理 ----------

/**
 * 将原始标题列表转换为结构化的渲染数据
 *
 * 处理逻辑：
 * 1. 计算最小深度作为基准
 * 2. 过滤掉超过 maxLevel 层的标题
 * 3. 为每个标题分配深度级别（0/1/2）和徽章类型
 * 4. 最浅层标题分配数字编号
 *
 * @param items - 原始标题列表
 * @param maxLevel - 最大显示层级数（默认 3，即显示 h1-h3 或 h2-h4）
 */
export function buildTocItems(items: TocItem[], maxLevel = 3): TocRenderItem[] {
  if (!items || items.length === 0) return []

  // 计算最小深度
  let minDepth = 6
  for (const item of items) {
    minDepth = Math.min(minDepth, item.depth)
  }

  // 过滤：只显示 minDepth 到 minDepth + maxLevel - 1 层
  const filtered = items.filter((item) => item.depth < minDepth + maxLevel)

  const result: TocRenderItem[] = []
  let indexCounter = 1

  for (const item of filtered) {
    const relativeDepth = item.depth - minDepth
    const depthLevel: 0 | 1 | 2 =
      relativeDepth === 0 ? 0 : relativeDepth === 1 ? 1 : 2

    let badgeKind: 'index' | 'dot' | 'dot-sm'
    let badgeIndex: number | undefined

    if (relativeDepth === 0) {
      badgeKind = 'index'
      badgeIndex = indexCounter++
    } else if (relativeDepth === 1) {
      badgeKind = 'dot'
    } else {
      badgeKind = 'dot-sm'
    }

    result.push({
      id: item.id,
      text: item.text,
      depthLevel,
      badgeKind,
      badgeIndex,
      labelStyle: relativeDepth <= 1 ? 'primary' : 'secondary',
    })
  }

  return result
}

// ---------- 滚动监听与活动项检测 ----------

/**
 * 创建 TOC 滚动监听器
 *
 * 使用 IntersectionObserver 监听标题元素的可见性，
 * 当某个标题进入视口时，将对应的 TOC 项标记为活动状态。
 *
 * @param container - 包含文章内容的 DOM 元素
 * @param tocItems - TOC 项列表
 * @param onActiveChange - 活动项变化回调
 * @param offset - 触发偏移量（px），默认 100
 * @returns 清理函数
 */
export function createTocObserver(
  container: HTMLElement,
  tocItems: TocRenderItem[],
  onActiveChange: (activeId: string | null) => void,
  offset = 100,
): () => void {
  if (!container || tocItems.length === 0) return () => {}

  const headingElements: Map<string, Element> = new Map()
  for (const item of tocItems) {
    const el = container.querySelector(`#${CSS.escape(item.id)}`)
    if (el) {
      headingElements.set(item.id, el)
    }
  }

  if (headingElements.size === 0) return () => {}

  // 使用 IntersectionObserver 检测标题可见性
  let currentActiveId: string | null = null

  const observer = new IntersectionObserver(
    (entries) => {
      // 找到最靠近视口顶部的可见标题
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visibleEntries.length > 0) {
          const topEntry = visibleEntries[0]!
          const id = topEntry.target.getAttribute('id')
          if (id && id !== currentActiveId) {
            currentActiveId = id
            onActiveChange(id)
          }
        }
    },
    {
      rootMargin: `-${offset}px 0px -70% 0px`,
      threshold: [0, 1],
    },
  )

  headingElements.forEach((el) => observer.observe(el))

  // 兜底：滚动时检查最近的标题（解决 IntersectionObserver 在某些边界情况下不触发的问题）
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null
  const handleScroll = () => {
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      let closestId: string | null = null
      let closestDistance = Infinity

      headingElements.forEach((el, id) => {
        const rect = el.getBoundingClientRect()
        const distance = Math.abs(rect.top - offset)
        if (rect.top <= offset + 50 && distance < closestDistance) {
          closestDistance = distance
          closestId = id
        }
      })

      if (closestId && closestId !== currentActiveId) {
        currentActiveId = closestId
        onActiveChange(closestId)
      }
    }, 50)
  }

  window.addEventListener('scroll', handleScroll, { passive: true })

  return () => {
    observer.disconnect()
    window.removeEventListener('scroll', handleScroll)
    if (scrollTimeout) clearTimeout(scrollTimeout)
  }
}

/**
 * 平滑滚动到指定标题
 *
 * @param id - 标题元素 id
 * @param offset - 滚动偏移量（px），默认 80
 */
export function scrollToHeading(id: string, offset = 80): void {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({
    top,
    behavior: 'smooth',
  })
}
