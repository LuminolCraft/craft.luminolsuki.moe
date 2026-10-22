/**
 * 会话 ID 往返：AI 的多轮记忆全靠它，断一次就等于换个人来答。
 *
 * 用假的 fetch 而不是真网络：要验证的是「首轮不带 → 收到响应头 → 后续带上」
 * 这条链路，跟真实后端无关。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamChat, type AiMessage } from './ai-chat'

function sseStream(): Response {
  const body = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      controller.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"你好"}}]}\n\n'))
      controller.enqueue(enc.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'X-Cortex-Session-Id': 'sess-from-server' },
  })
}

function captureFetch() {
  const calls: Array<{ headers: Headers }> = []
  const spy = vi.fn(async (_url: string, init?: RequestInit) => {
    calls.push({ headers: new Headers(init?.headers) })
    return sseStream()
  })
  vi.stubGlobal('fetch', spy)
  return calls
}

const MSG: AiMessage[] = [{ role: 'user', content: '你好' }]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('streamChat 会话 ID', () => {
  it('首轮不带 X-Session-Id', async () => {
    const calls = captureFetch()
    await streamChat({ messages: MSG, onDelta: () => {} })
    expect(calls[0]?.headers.get('X-Session-Id')).toBeNull()
  })

  it('收到响应头里的会话 ID 并回调出去', async () => {
    captureFetch()
    let received: string | null = null
    let text = ''
    await streamChat({
      messages: MSG,
      onSessionId: (id) => {
        received = id
      },
      onDelta: (delta) => {
        text += delta
      },
    })
    expect(received).toBe('sess-from-server')
    expect(text).toBe('你好')
  })

  it('后续轮次带上已有会话 ID', async () => {
    const calls = captureFetch()
    await streamChat({ messages: MSG, sessionId: 'sess-existing', onDelta: () => {} })
    expect(calls[0]?.headers.get('X-Session-Id')).toBe('sess-existing')
  })
})
