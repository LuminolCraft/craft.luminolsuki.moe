/**
 * AI 对话状态（弹窗与独立页共用同一份逻辑）。
 *
 * 为什么不放 Pinia：对话是页面级临时状态，刷新即丢；放全局 store 反而要
 * 处理「切页面要不要保留」的问题。真要跨设备保留历史，那属于服务端会话
 * 持久化（cortex 的 chat_sessions），不是前端 store 该管的事。
 */
import { ref } from 'vue'
import { streamChat, type AiChatError, type AiMessage } from '@/lib/ai-chat'

/** 单次请求最多带上多少条历史。上游上下文有限，全量带过去只会被忽略或撑爆。 */
const MAX_HISTORY = 8

export interface UseAiChatOptions {
  /** 人设提示。放在 system 里，cortex 会降级拼进问题前缀。 */
  systemPrompt?: string
}

export function useAiChat(options: UseAiChatOptions = {}) {
  const messages = ref<AiMessage[]>([])
  /** 正在流式接收的内容。与 messages 分开存，避免每帧都改动数组触发全列表重渲染 */
  const streaming = ref('')
  const sending = ref(false)
  const error = ref<AiChatError | null>(null)

  let controller: AbortController | null = null

  function abort(): void {
    controller?.abort()
    controller = null
  }

  async function send(text: string): Promise<void> {
    const question = text.trim()
    if (question.length === 0 || sending.value) return

    // 上限 2000 字与 cortex 的输入限制一致：超了会在服务端被拒，
    // 前端先截断能给出更清楚的提示
    const clipped = question.slice(0, 2000)
    messages.value.push({ role: 'user', content: clipped })
    sending.value = true
    streaming.value = ''
    error.value = null

    const history = messages.value.slice(-MAX_HISTORY)
    // system 走标准 role，不用 user 冒充——cortex 会把 system 拼进问题前缀，
    // 用 user 塞进去会被当成用户的另一个提问
    const payload: AiMessage[] = options.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }, ...history]
      : history

    controller = new AbortController()

    try {
      await streamChat({
        messages: payload,
        signal: controller.signal,
        onDelta: (delta) => {
          streaming.value += delta
        },
      })
      if (streaming.value.length > 0) {
        messages.value.push({ role: 'assistant', content: streaming.value })
      }
      streaming.value = ''
    } catch (err) {
      const chatError = err as AiChatError
      // 用户主动取消不算错误；已收到的部分保留，比整段丢掉有用
      if (chatError.name === 'AbortError') {
        if (streaming.value.length > 0) {
          messages.value.push({ role: 'assistant', content: streaming.value })
        }
        streaming.value = ''
        return
      }
      error.value = chatError
      if (streaming.value.length > 0) {
        messages.value.push({ role: 'assistant', content: streaming.value })
      }
      streaming.value = ''
    } finally {
      sending.value = false
      controller = null
    }
  }

  function clear(): void {
    abort()
    messages.value = []
    streaming.value = ''
    error.value = null
    sending.value = false
  }

  return { messages, streaming, sending, error, send, abort, clear }
}
