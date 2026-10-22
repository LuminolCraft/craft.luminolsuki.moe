<!--
  AI 悬浮助手（全局小弹窗）。

  定位：只回答「网站怎么用 / 服务器怎么进 / 规则是什么」这类导向问题。
  不给它工具、不给它数据权限——它只能说话，所以注入成功也做不了任何事。
  「引导用户」实现为：它输出站内链接（`/News/38`），用户自己点。

  未登录不显示输入框：AI 额度是公共资源，匿名开放等于给刷子开口子。
-->
<template>
  <div class="ai-root">
    <Transition name="ai-fab">
      <button
        v-if="!open"
        type="button"
        class="ai-fab"
        aria-label="打开 AI 助手"
        @click="openPanel"
      >
        <span class="ai-fab-dot" aria-hidden="true"></span>
        <span class="ai-fab-label">Luminol</span>
      </button>
    </Transition>

    <Transition name="ai-panel">
      <section
        v-if="open"
        class="ai-panel"
        role="dialog"
        aria-modal="false"
        aria-label="Luminol AI 助手"
      >
        <header class="ai-header">
          <div class="ai-title">
            <span class="ai-avatar" aria-hidden="true">L</span>
            <div>
              <strong>Luminol</strong>
              <small>问网站和服务器的事</small>
            </div>
          </div>
          <div class="ai-actions">
            <button
              v-if="auth.isAuthenticated && messages.length > 0"
              type="button"
              class="ai-icon-btn"
              title="清空对话"
              @click="clear"
            >
              清空
            </button>
            <button type="button" class="ai-icon-btn" title="关闭" @click="close">✕</button>
          </div>
        </header>

        <div ref="bodyRef" class="ai-body">
          <div v-if="!auth.isAuthenticated" class="ai-guest">
            <p>登录后才能使用 AI 助手～</p>
            <p class="ai-guest-sub">AI 额度是公共资源，只对已登录的玩家开放。</p>
            <RouterLink class="ai-guest-link" to="/Login" @click="close">去登录</RouterLink>
          </div>

          <template v-else>
            <div v-if="messages.length === 0 && !streaming" class="ai-hint">
              <p>可以问我这些：</p>
              <button
                v-for="item in QUICK_ASKS"
                :key="item"
                type="button"
                class="ai-chip"
                :disabled="sending"
                @click="submitText(item)"
              >
                {{ item }}
              </button>
            </div>

            <div
              v-for="(message, index) in messages"
              :key="index"
              class="ai-bubble"
              :class="message.role === 'user' ? 'ai-bubble--user' : 'ai-bubble--bot'"
            >
              <AiMessageContent v-if="message.role === 'assistant'" :content="message.content" />
              <span v-else class="ai-user-text">{{ message.content }}</span>
            </div>

            <div v-if="streaming" class="ai-bubble ai-bubble--bot">
              <AiMessageContent :content="streaming" />
              <span class="ai-caret" aria-hidden="true"></span>
            </div>

            <div v-if="error" class="ai-error">
              <span>{{ error.message }}</span>
              <button
                v-if="error.status === 429"
                type="button"
                class="ai-retry"
                @click="submitText(lastQuestion)"
              >
                重试
              </button>
            </div>
          </template>
        </div>

        <form v-if="auth.isAuthenticated" class="ai-input" @submit.prevent="submit">
          <textarea
            v-model="draft"
            class="ai-textarea"
            :disabled="sending"
            rows="1"
            maxlength="2000"
            placeholder="问问进服流程、规则、指令…"
            @keydown.enter.exact.prevent="submit"
          ></textarea>
          <button
            v-if="sending"
            type="button"
            class="ai-send ai-send--stop"
            title="停止生成"
            @click="abort"
          >
            停
          </button>
          <button v-else type="submit" class="ai-send" :disabled="!draft.trim()">发送</button>
        </form>
      </section>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AiMessageContent from './AiMessageContent.vue'
import { useAiChat } from '@/composables/useAiChat'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

/** 快捷提问：覆盖最高频的三类「导向型」问题，引导用户先问对方向。 */
const QUICK_ASKS = ['怎么进服务器？', '有哪些规则？', '服务器地址是什么？']

const open = ref(false)
const draft = ref('')
const bodyRef = ref<HTMLElement | null>(null)

const { messages, streaming, sending, error, send, abort, clear } = useAiChat()

const lastQuestion = computed(() => {
  const last = [...messages.value].reverse().find((m) => m.role === 'user')
  return last?.content ?? ''
})

function scrollToBottom(): void {
  void nextTick(() => {
    const el = bodyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

// 流式每帧都会改 streaming，跟着滚底；用户往上翻时会被拽回来，
// 但对话面板本来就该始终显示最新内容，这个取舍可以接受
watch([messages, streaming], scrollToBottom, { deep: true })

function openPanel(): void {
  open.value = true
  scrollToBottom()
}

function close(): void {
  open.value = false
  abort()
}

async function submitText(text: string): Promise<void> {
  if (sending.value) return
  draft.value = ''
  await send(text)
}

function submit(): void {
  if (!draft.value.trim() || sending.value) return
  void submitText(draft.value)
}
</script>

<style scoped>
.ai-root {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 900;
  font-family: var(--font-primary, inherit);
}

/* ---------- 悬浮按钮 ---------- */
.ai-fab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--background-color, #fff);
  color: var(--text-color);
  box-shadow: var(--shadow-md, 0 6px 20px rgba(0, 0, 0, 0.12));
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.ai-fab:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg, 0 10px 28px rgba(0, 0, 0, 0.16));
}

.ai-fab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-color);
}

.ai-fab-label {
  font-size: 0.875rem;
  font-weight: 600;
}

/* ---------- 面板 ---------- */
.ai-panel {
  display: flex;
  flex-direction: column;
  width: min(400px, calc(100vw - 32px));
  height: min(560px, calc(100vh - 120px));
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--background-color, #fff);
  box-shadow: var(--shadow-lg, 0 16px 40px rgba(0, 0, 0, 0.18));
  overflow: hidden;
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
}

.ai-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ai-avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  font-weight: 700;
  font-size: 0.875rem;
}

.ai-title strong {
  display: block;
  font-size: 0.875rem;
  line-height: 1.2;
}

.ai-title small {
  display: block;
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.ai-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ai-icon-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
}

.ai-icon-btn:hover {
  background: var(--border-color);
  color: var(--text-color);
}

/* ---------- 消息区 ---------- */
.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overscroll-behavior: contain;
}

.ai-bubble {
  max-width: 92%;
  padding: 9px 12px;
  border-radius: 12px;
  font-size: 0.9375rem;
  line-height: 1.6;
  word-break: break-word;
}

.ai-bubble--user {
  align-self: flex-end;
  background: var(--primary-color);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.ai-bubble--bot {
  align-self: flex-start;
  background: var(--border-color, rgba(128, 128, 128, 0.12));
  color: var(--text-color);
  border-bottom-left-radius: 4px;
}

.ai-user-text {
  white-space: pre-wrap;
}

/* 流式光标：只有正在生成时出现，让用户知道还在跑 */
.ai-caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--text-color);
  animation: ai-blink 1s step-end infinite;
}

@keyframes ai-blink {
  50% {
    opacity: 0;
  }
}

.ai-hint {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 0.8125rem;
}

.ai-chip {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-color);
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
}

.ai-chip:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.ai-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  font-size: 0.8125rem;
}

.ai-retry {
  flex: none;
  padding: 3px 8px;
  border: 1px solid currentColor;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

/* ---------- 未登录 ---------- */
.ai-guest {
  margin: auto;
  padding: 24px;
  text-align: center;
  color: var(--text-color);
}

.ai-guest-sub {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 0.8125rem;
}

.ai-guest-link {
  display: inline-block;
  margin-top: 14px;
  padding: 8px 18px;
  border-radius: 8px;
  background: var(--primary-color);
  color: #fff;
  font-size: 0.8125rem;
  text-decoration: none;
}

/* ---------- 输入区 ---------- */
.ai-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border-color);
}

.ai-textarea {
  flex: 1;
  max-height: 96px;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: transparent;
  color: var(--text-color);
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: none;
}

.ai-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.ai-send {
  flex: none;
  padding: 9px 16px;
  border: none;
  border-radius: 10px;
  background: var(--primary-color);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.ai-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ai-send--stop {
  background: var(--text-secondary);
}

/* ---------- 过渡 ---------- */
.ai-fab-enter-active,
.ai-fab-leave-active,
.ai-panel-enter-active,
.ai-panel-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.ai-fab-enter-from,
.ai-fab-leave-to,
.ai-panel-enter-from,
.ai-panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

/* ---------- 移动端：铺满可视区，避免输入框被软键盘顶掉 ---------- */
@media (max-width: 640px) {
  .ai-root {
    right: 16px;
    bottom: 16px;
  }

  .ai-panel {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    border: none;
    border-radius: 0;
  }
}
</style>
