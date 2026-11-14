/**
 * 设置页密码输入控件（`PasswordField.vue`）行为测试。
 *
 * 覆盖：
 * - 默认 `type="password"`，眼睛按钮 `aria-pressed=false` + 文案「显示密码」；
 * - 点击切换为明文且状态反转，再点回密文；
 * - 输入回传 `update:modelValue`；
 * - `label` 的 `for` 指向 input 的 `id`（可点击标签聚焦）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PasswordField from './PasswordField.vue'
import zh from '@/i18n/locales/zh'

const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh } })

function mountField() {
  return mount(PasswordField, {
    props: { id: 'pw-test', label: '新密码', modelValue: '' },
    global: { plugins: [i18n] },
  })
}

const inputOf = (wrapper: VueWrapper) => wrapper.find('input')
const buttonOf = (wrapper: VueWrapper) => wrapper.find('button')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('PasswordField', () => {
  it('默认以密文渲染，按钮标为「显示密码」且未按下', () => {
    const wrapper = mountField()
    expect(inputOf(wrapper).attributes('type')).toBe('password')
    expect(buttonOf(wrapper).attributes('aria-pressed')).toBe('false')
    expect(buttonOf(wrapper).attributes('aria-label')).toBe('显示密码')
  })

  it('点击后切换为明文，再点回密文', async () => {
    const wrapper = mountField()

    await buttonOf(wrapper).trigger('click')
    expect(inputOf(wrapper).attributes('type')).toBe('text')
    expect(buttonOf(wrapper).attributes('aria-pressed')).toBe('true')
    expect(buttonOf(wrapper).attributes('aria-label')).toBe('隐藏密码')

    await buttonOf(wrapper).trigger('click')
    expect(inputOf(wrapper).attributes('type')).toBe('password')
    expect(buttonOf(wrapper).attributes('aria-pressed')).toBe('false')
  })

  it('输入回传 update:modelValue', async () => {
    const wrapper = mountField()
    await inputOf(wrapper).setValue('abc12345')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['abc12345'])
  })

  it('label 的 for 指向 input 的 id', () => {
    const wrapper = mountField()
    expect(wrapper.find('label').attributes('for')).toBe('pw-test')
    expect(inputOf(wrapper).attributes('id')).toBe('pw-test')
  })

  it('disabled 时输入与切换按钮同时禁用', () => {
    const wrapper = mount(PasswordField, {
      props: { id: 'pw-test', label: '新密码', modelValue: '', disabled: true },
      global: { plugins: [i18n] },
    })
    expect(inputOf(wrapper).attributes('disabled')).toBeDefined()
    expect(buttonOf(wrapper).attributes('disabled')).toBeDefined()
  })

  it('revealable=false 时不渲染眼睛按钮，密码恒为密文', () => {
    const wrapper = mount(PasswordField, {
      props: { id: 'pw-current', label: '当前密码', modelValue: '', revealable: false },
      global: { plugins: [i18n] },
    })
    expect(wrapper.find('button').exists()).toBe(false)
    expect(inputOf(wrapper).attributes('type')).toBe('password')
    expect(inputOf(wrapper).classes()).not.toContain('has-reveal')
  })
})
