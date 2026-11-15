/**
 * 新闻分页（`NewsPagination.vue`）行为测试。
 *
 * 重点回归：页码是 1-based（与 `useNewsPagination.goTo` 同口径）。
 * 历史 bug：组件按 0-based 处理、emit 传 `item - 1`，而 goTo 会丢弃 < 1 的页码，
 * 导致「点第 1 页无反应」、以及第 2 页时点「2」错跳到第 1 页。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NewsPagination from './NewsPagination.vue'

/** 桌面端页码按钮（按可见文本定位，规避省略号 span） */
function pageButton(wrapper: ReturnType<typeof mount>, label: number) {
  return wrapper.findAll('.pagination-btn-page').find((b) => b.text() === String(label))!
}

describe('NewsPagination', () => {
  it('第 1 页：上一页禁用，「1」为当前页高亮', () => {
    const wrapper = mount(NewsPagination, { props: { currentPage: 1, pageCount: 5 } })
    const nav = wrapper.findAll('.pagination-btn-nav')
    expect(nav[0]!.attributes('disabled')).toBeDefined()
    expect(pageButton(wrapper, 1).classes()).toContain('active')
    expect(pageButton(wrapper, 1).attributes('aria-current')).toBe('page')
  })

  it('第 2 页点击「1」→ emit go(1)（回归：不能传 0）', async () => {
    const wrapper = mount(NewsPagination, { props: { currentPage: 2, pageCount: 5 } })
    await pageButton(wrapper, 1).trigger('click')
    expect(wrapper.emitted('go')).toEqual([[1]])
  })

  it('点击第 3 页 → emit go(3)，且只有第 3 页高亮', async () => {
    const wrapper = mount(NewsPagination, { props: { currentPage: 1, pageCount: 5 } })
    await pageButton(wrapper, 3).trigger('click')
    expect(wrapper.emitted('go')).toEqual([[3]])

    await wrapper.setProps({ currentPage: 3 })
    expect(pageButton(wrapper, 3).classes()).toContain('active')
    expect(pageButton(wrapper, 1).classes()).not.toContain('active')
  })

  it('末页：下一页禁用', () => {
    const wrapper = mount(NewsPagination, { props: { currentPage: 5, pageCount: 5 } })
    const nav = wrapper.findAll('.pagination-btn-nav')
    expect(nav[1]!.attributes('disabled')).toBeDefined()
  })

  it('移动端指示器显示 1-based 页码（不是 currentPage + 1）', () => {
    const wrapper = mount(NewsPagination, { props: { currentPage: 2, pageCount: 7 } })
    expect(wrapper.find('.mobile-pagination .page-current').text()).toBe('2')
    expect(wrapper.find('.mobile-pagination .page-total').text()).toBe('7')
  })
})
