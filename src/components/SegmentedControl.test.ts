/**
 * `SegmentedControl.vue` 行为与几何令牌测试。
 *
 * 覆盖：
 * - 空选项不抛错且 `--seg-count` 至少为 1（防 `calc(100% / N)` 除零）；
 * - N 项渲染出的 radio 数、指示器宽度令牌与位移令牌正确；
 * - 点击段通过原生 radio 驱动 v-model（`update:modelValue`）；
 * - `disabled` 落到原生 input；
 * - 每个实例的 id / name 唯一（skill 的 scoped-instance 要求）。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import SegmentedControl from './SegmentedControl.vue'

const OPTIONS = [
  { value: 'all', label: '全员' },
  { value: 'user', label: '指定用户' },
  { value: 'multi', label: '多选用户' },
]

function rootVars(wrapper: ReturnType<typeof mount>) {
  const style = wrapper.find('.segmented').attributes('style') ?? ''
  return style
}

describe('SegmentedControl', () => {
  it('无选项时渲染空容器且 --seg-count 不小于 1', () => {
    const wrapper = mount(SegmentedControl, { props: { modelValue: '', options: [] } })
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(0)
    expect(wrapper.find('.segmented').attributes('style')).toContain('--seg-count: 1')
  })

  it('三项：radio 数量、宽度令牌与位移令牌正确', () => {
    const wrapper = mount(SegmentedControl, {
      props: { modelValue: 'multi', options: OPTIONS },
    })
    const inputs = wrapper.findAll('input[type="radio"]')
    expect(inputs).toHaveLength(3)
    expect(rootVars(wrapper)).toContain('--seg-count: 3')
    expect(rootVars(wrapper)).toContain('--seg-index: 2')
    expect((inputs[2]!.element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.find('.seg-indicator').exists()).toBe(true)
  })

  it('未知 modelValue 时指示器退回第 0 段', () => {
    const wrapper = mount(SegmentedControl, {
      props: { modelValue: 'nope', options: OPTIONS },
    })
    expect(rootVars(wrapper)).toContain('--seg-index: 0')
  })

  it('点击段经原生 radio 更新 v-model', async () => {
    const wrapper = mount(SegmentedControl, {
      props: { modelValue: 'all', options: OPTIONS },
    })
    await wrapper.findAll('input[type="radio"]')[1]!.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([['user']])
  })

  it('父组件异步改值时选中态跟随', async () => {
    const wrapper = mount(SegmentedControl, {
      props: { modelValue: 'all', options: OPTIONS },
    })
    await wrapper.setProps({ modelValue: 'multi' })
    expect(rootVars(wrapper)).toContain('--seg-index: 2')
    expect((wrapper.findAll('input[type="radio"]')[2]!.element as HTMLInputElement).checked).toBe(
      true,
    )
  })

  it('disabled 落到每个原生 input', () => {
    const wrapper = mount(SegmentedControl, {
      props: { modelValue: 'all', options: OPTIONS, disabled: true },
    })
    for (const input of wrapper.findAll('input[type="radio"]')) {
      expect((input.element as HTMLInputElement).disabled).toBe(true)
    }
  })

  it('同一应用内两个实例的 id 与 name 不冲突', () => {
    // `useId()` 的应用级计数器只在同一棵树里递增，故必须在同一个 mount 中验证
    const Host = defineComponent({
      components: { SegmentedControl },
      props: { options: { type: Array, required: true } },
      template: `
        <div>
          <SegmentedControl :model-value="'all'" :options="options" />
          <SegmentedControl :model-value="'all'" :options="options" />
        </div>
      `,
    })
    const wrapper = mount(Host, { props: { options: OPTIONS } })
    const groups = wrapper.findAll('.segmented')
    expect(groups).toHaveLength(2)
    const tree = (index: number) => groups[index]!.findAll('input[type="radio"]')
    const firstNames = tree(0).map((i) => i.attributes('name'))
    const secondNames = tree(1).map((i) => i.attributes('name'))
    expect(new Set(firstNames).size).toBe(1)
    expect(firstNames[0]).not.toBe(secondNames[0])
    const firstIds = new Set(tree(0).map((i) => i.attributes('id')))
    const secondIds = new Set(tree(1).map((i) => i.attributes('id')))
    for (const id of firstIds) expect(secondIds.has(id)).toBe(false)
    // label 的 for 必须指向本实例的 input
    for (const label of groups[1]!.findAll('label')) {
      expect(secondIds.has(label.attributes('for'))).toBe(true)
    }
  })
})
