/**
 * `LayoutToggle.vue`（新闻列表 列表/网格 切换）测试。
 *
 * 改造后不再是「按钮 + 下拉面板」，而是扁平分段选择：
 * - 对外契约不变：`modelValue` / `update:modelValue`，值域 'list' | 'grid'；
 * - 下拉残留（aria-haspopup / .toggle-dropdown）必须消失；
 * - 文案来自 i18n（原为硬编码中文）。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import LayoutToggle from './LayoutToggle.vue'
import zh from '@/i18n/locales/zh'

const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh } })

function mountToggle(modelValue: 'list' | 'grid') {
  return mount(LayoutToggle, { props: { modelValue }, global: { plugins: [i18n] } })
}

describe('LayoutToggle（列表 / 网格 分段选择）', () => {
  it('渲染两段原生 radio，文案取自 i18n', () => {
    const wrapper = mountToggle('list')
    const inputs = wrapper.findAll('input[type="radio"]')
    expect(inputs).toHaveLength(2)
    expect(wrapper.text()).toContain('列表')
    expect(wrapper.text()).toContain('网格')
    expect((inputs[0]!.element as HTMLInputElement).checked).toBe(true)
  })

  it('不再有下拉面板残留', () => {
    const wrapper = mountToggle('list')
    expect(wrapper.find('.toggle-dropdown').exists()).toBe(false)
    expect(wrapper.find('[aria-haspopup]').exists()).toBe(false)
    expect(wrapper.find('.layout-toggle-btn').exists()).toBe(false)
  })

  it('选中另一段时发出 update:modelValue', async () => {
    const wrapper = mountToggle('list')
    await wrapper.findAll('input[type="radio"]')[1]!.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([['grid']])
  })

  it('父组件改值后选中态跟随', async () => {
    const wrapper = mountToggle('list')
    await wrapper.setProps({ modelValue: 'grid' })
    expect((wrapper.findAll('input[type="radio"]')[1]!.element as HTMLInputElement).checked).toBe(
      true,
    )
  })
})
