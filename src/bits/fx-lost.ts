/**
 * WebGL context 丢失的上报通道。
 *
 * 为什么要单独一个模块：`<script setup>` 里**不允许 ES 导出**，
 * InjectionKey 必须放在普通 ts 文件里，否则编译直接报错。
 *
 * 为什么用 provide/inject 而不是 emit：
 * WebGL 组件是作为**插槽内容**渲染的，它的 `emit('lost')` 会发给调用处那个组件
 * （例如 HeroSection），门控容器 `BitsFxGate` 根本收不到 —— 表现为 `lost` 恒为 false，
 * context 丢了之后画布继续留在 DOM 里当黑块。inject 这条链路才是真正生效的。
 */
import type { InjectionKey } from 'vue'

/** 上报「这个实例的 WebGL context 已丢失」（只降级该实例，不影响其他实例） */
export const BITS_FX_LOST: InjectionKey<() => void> = Symbol('bits-fx-lost')
