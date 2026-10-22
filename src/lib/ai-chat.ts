/**
 * AI 对话客户端。
 *
 * 不走 axios：SSE 需要逐帧读取 body 流，axios 的响应拦截器会把整个响应
 * 攒完再交给业务（`responseType: 'stream'` 在浏览器里也不可用）。这里用
 * 原生 fetch + ReadableStream，边到边解析。
 *
 * 链路：浏览器 → 同源 `/api/v1/ai/chat`（Cookie 会话）→ nexus 签名转发 → cortex
 * 前端**不持有任何密钥**，也不直连 cortex 域名。
 */
import { API_BASE_URL } from '@/lib/api-base'

export interface AiMessage {
  /** system 由 cortex 降级拼进问题前缀（上游协议没有 system 字段） */
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 对外抛的错误。code 用于前端分支（402 式配额、429 限流、451 内容拦截）。 */
export interface AiChatError extends Error {
  code: string
  status: number
}

function makeError(message: string, code: string, status: number): AiChatError {
  const err = new Error(message) as AiChatError
  err.code = code
  err.status = status
  return err
}

/** 从两种错误体里取用户可读信息：cortex 用 OpenAI 格式，nexus 用统一信封。 */
function parseErrorBody(raw: string): { message: string; code: string } {
  try {
    const body = JSON.parse(raw) as {
      error?: { message?: string; code?: string; type?: string }
    }
    const error = body.error
    if (!error) return { message: 'AI 服务返回了未知错误', code: 'unknown_error' }
    return {
      message: error.message ?? 'AI 服务返回了未知错误',
      code: error.code ?? error.type ?? 'unknown_error',
    }
  } catch {
    return { message: 'AI 服务返回了非预期的响应', code: 'invalid_response' }
  }
}

export interface StreamChatOptions {
  messages: AiMessage[]
  signal?: AbortSignal
  /** 每收到一段增量调用一次。注意内容可能以任意长度切分，不要假设是完整句子。 */
  onDelta: (text: string) => void
}

/**
 * 流式对话。正常结束时 resolve，出错时抛 AiChatError。
 *
 * 中途失败的处理：HTTP 已经是 200（头已经发出去了），服务端只能补一个
 * error 帧再 `[DONE]`。所以这里同时要看帧内容里的 error，不能只看 status。
 */
export async function streamChat(options: StreamChatOptions): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/ai/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify({
        model: 'nhic-agent',
        messages: options.messages,
        stream: true,
        stream_options: { include_usage: true },
      }),
    })
  } catch (err) {
    // 用户主动取消不算故障，保留 AbortError 让上层按取消处理
    if ((err as Error).name === 'AbortError') throw err
    // 原生 fetch 只会抛「Failed to fetch / Load failed」，直接显示给用户等于没说
    throw makeError('网络连接失败，请检查网络后重试', 'network_error', 0)
  }

  if (!res.ok) {
    const { message, code } = parseErrorBody(await res.text())
    throw makeError(message, code, res.status)
  }

  if (!res.body) throw makeError('AI 服务未返回内容', 'empty_body', 502)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE 以空行分帧；末尾可能是不完整的半帧，留在 buffer 里等下一段
      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        boundary = buffer.indexOf('\n\n')

        for (const line of frame.split('\n')) {
          // 冒号开头是 SSE 注释（保活 `: ping`），直接跳过
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload.length === 0) continue
          if (payload === '[DONE]') return

          let chunk: {
            choices?: Array<{ delta?: { content?: string } }>
            error?: { message?: string; code?: string; type?: string }
          }
          try {
            chunk = JSON.parse(payload)
          } catch {
            continue
          }

          // 服务端中途失败会在这里补错误帧
          if (chunk.error) {
            throw makeError(
              chunk.error.message ?? 'AI 服务中断',
              chunk.error.code ?? chunk.error.type ?? 'stream_error',
              500,
            )
          }

          const text = chunk.choices?.[0]?.delta?.content
          if (text) options.onDelta(text)
        }
      }
    }
  } finally {
    // 用户取消时主动断流，避免上游继续生成烧额度
    reader.cancel().catch(() => undefined)
  }
}
