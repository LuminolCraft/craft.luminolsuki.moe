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
  role: 'user' | 'assistant'
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
  const res = await fetch(`${API_BASE_URL}/api/v1/ai/chat`, {
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

/**
 * 链接白名单。
 *
 * AI 输出是公网不可信内容：注入一个 `https://fake-luminol.com/login` 配合
 * 「点此登录」的话术，用户会点。所以只放行站内相对路径与自有域名，
 * 其余一律渲染成不可点的纯文本——这是防钓鱼的核心，不是可选项。
 */
const ALLOWED_HOSTS = ['luminolsuki.moe', 'narcssu.top']

export function isAllowedAiUrl(href: string | undefined): boolean {
  if (!href) return false
  const value = href.trim()
  if (value.length === 0) return false

  // 相对路径：必须以单个 / 开头（`//evil.com` 是协议相对 URL，会跳出站外）
  if (value.startsWith('/')) return !value.startsWith('//')

  // 锚点与查询串，仍在当前页内
  if (value.startsWith('#') || value.startsWith('?')) return true

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false

  const host = url.hostname.toLowerCase()
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}
