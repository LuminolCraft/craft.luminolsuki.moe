import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 全站消息提示（SwipeToast 队列）。
 *
 * 只做「一件事一个提示」的轻量队列：最多同屏 3 条，超出挤掉最旧的一条。
 * 颜色不写死，由 ToastHost 映射到当前主题的 CSS 变量，深浅色自动跟随。
 */
export type ToastVariant = 'info' | 'success' | 'error'

export interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
  /** 毫秒；0 表示直到用户手动关闭 */
  duration: number
}

export interface ToastInput {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

/** 同屏上限：再多会盖住页面内容，且读不完 */
const MAX_VISIBLE = 3
/** 默认停留时长：够读两行，又不至于赖着不走 */
const DEFAULT_DURATION = 4000

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([])
  let seq = 0

  function push(input: ToastInput): number {
    const item: ToastItem = {
      id: (seq += 1),
      title: input.title,
      description: input.description,
      variant: input.variant ?? 'info',
      duration: input.duration ?? DEFAULT_DURATION,
    }
    items.value = [...items.value, item].slice(-MAX_VISIBLE)
    return item.id
  }

  function remove(id: number) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  function clear() {
    items.value = []
  }

  const info = (title: string, description?: string, duration?: number) =>
    push({ title, description, variant: 'info', duration })
  const success = (title: string, description?: string, duration?: number) =>
    push({ title, description, variant: 'success', duration })
  const error = (title: string, description?: string, duration?: number) =>
    push({ title, description, variant: 'error', duration })

  return { items, push, remove, clear, info, success, error }
})
