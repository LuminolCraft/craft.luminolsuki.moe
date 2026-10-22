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
        aria-label="打开 Luminol 助手"
        @click="openPanel"
      >
        <img :src="AVATAR" alt="" class="ai-fab-avatar" width="32" height="32" />
        <span class="ai-fab-label">Luminol</span>
      </button>
    </Transition>

    <Transition name="ai-panel">
      <section v-if="open" class="ai-panel" role="dialog" aria-label="Luminol AI 助手">
        <header class="ai-header">
          <img :src="AVATAR" alt="Luminol" class="ai-header-avatar" width="28" height="28" />
          <div class="ai-header-text">
            <span class="ai-name">Luminol</span>
            <span class="ai-sub">社区助手</span>
          </div>
          <button
            v-if="auth.isAuthenticated && messages.length > 0"
            type="button"
            class="ai-text-btn"
            @click="clear"
          >
            新对话
          </button>
          <button type="button" class="ai-icon-btn" aria-label="关闭" @click="close">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </header>

        <div ref="bodyRef" class="ai-body">
          <div v-if="!auth.isAuthenticated" class="ai-guest">
            <img :src="AVATAR" alt="" class="ai-guest-avatar" width="64" height="64" />
            <p class="ai-guest-title">登录后就能问我了</p>
            <p class="ai-guest-sub">AI 额度是公共资源，只对已登录的玩家开放。</p>
            <RouterLink class="ai-guest-link" to="/Login" @click="close">去登录</RouterLink>
          </div>

          <template v-else>
            <div v-if="messages.length === 0 && !sending" class="ai-empty">
              <img :src="AVATAR" alt="" class="ai-empty-avatar" width="56" height="56" />
              <p class="ai-empty-title">有什么可以帮你？</p>
              <div class="ai-chips">
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
            </div>

            <div
              v-for="(message, index) in messages"
              :key="index"
              class="ai-msg"
              :class="message.role === 'user' ? 'ai-msg--user' : 'ai-msg--bot'"
            >
              <p v-if="message.role === 'user'" class="ai-user-bubble">{{ message.content }}</p>
              <AiMessageContent v-else :content="message.content" />
            </div>

            <div v-if="sending" class="ai-msg ai-msg--bot">
              <AiMessageContent v-if="streaming" :content="streaming" />
              <div v-else class="ai-typing" aria-label="正在思考">
                <span></span><span></span><span></span>
              </div>
            </div>

            <div v-if="error" class="ai-error">
              <span>{{ error.message }}</span>
              <button
                v-if="error.status === 429 || error.status >= 500"
                type="button"
                class="ai-retry"
                @click="submitText(lastQuestion)"
              >
                重试
              </button>
            </div>
          </template>
        </div>

        <div v-if="auth.isAuthenticated" class="ai-composer">
          <div class="ai-input-wrap" :class="{ 'is-busy': sending }">
            <textarea
              ref="textareaRef"
              v-model="draft"
              class="ai-textarea"
              rows="1"
              maxlength="2000"
              placeholder="问进服流程、规则、指令…"
              @keydown.enter.exact.prevent="submit"
            ></textarea>
            <button
              v-if="sending"
              type="button"
              class="ai-send ai-send--stop"
              aria-label="停止生成"
              @click="abort"
            >
              <span class="ai-stop-square" aria-hidden="true"></span>
            </button>
            <button
              v-else
              type="submit"
              class="ai-send"
              :disabled="!draft.trim()"
              aria-label="发送"
              @click="submit"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M12 19V5M12 5l-6 6M12 5l6 6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
          <p class="ai-disclaimer">Luminol 也会出错，重要信息以公告为准。</p>
        </div>
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

/** 头像：圆形裁切 + 透明底的 AVIF（96px，3.5KB），深浅主题都不出现白角 */
const AVATAR = '/images/luminol-avatar-96.avif'

/** 快捷提问：覆盖最高频的三类「导向型」问题，引导用户先问对方向。 */
const QUICK_ASKS = ['怎么进服务器？', '有哪些规则？', '服务器地址是什么？']

const open = ref(false)
const draft = ref('')
const bodyRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

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

// 输入框随内容增高：多行问题时不让用户在 24px 高的小框里滚
watch(draft, () => {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 108)}px`
})

function openPanel(): void {
  open.value = true
  scrollToBottom()
  void nextTick(() => textareaRef.value?.focus())
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
  padding: 6px 16px 6px 6px;
  border: 1px solid color-mix(in srgb, var(--text-color) 10%, transparent);
  border-radius: 999px;
  background: var(--background-color, #fff);
  color: var(--text-color);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.ai-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
}

.ai-fab-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: block;
}

.ai-fab-label {
  font-size: 0.875rem;
  font-weight: 600;
}

/* ---------- 面板 ---------- */
.ai-panel {
  display: flex;
  flex-direction: column;
  width: min(420px, calc(100vw - 32px));
  height: min(620px, calc(100vh - 120px));
  border: 1px solid color-mix(in srgb, var(--text-color) 10%, transparent);
  border-radius: 18px;
  background: var(--background-color, #fff);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 12px 16px;
}

.ai-header-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex: none;
}

.ai-header-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.25;
}

.ai-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color);
}

.ai-sub {
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.ai-text-btn {
  flex: none;
  padding: 5px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
}

.ai-text-btn:hover {
  background: color-mix(in srgb, var(--text-color) 6%, transparent);
  color: var(--text-color);
}

.ai-icon-btn {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.ai-icon-btn:hover {
  background: color-mix(in srgb, var(--text-color) 6%, transparent);
  color: var(--text-color);
}

/* ---------- 消息区 ---------- */
.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overscroll-behavior: contain;
}

.ai-msg {
  display: flex;
  flex-direction: column;
}

.ai-msg--user {
  align-items: flex-end;
}

.ai-msg--bot {
  align-items: stretch;
}

/* 用户气泡：文本色 7% 叠加，深浅主题共用一套值，不用写两遍 */
.ai-user-bubble {
  max-width: 85%;
  margin: 0;
  padding: 9px 14px;
  border-radius: 18px;
  border-bottom-right-radius: 6px;
  background: color-mix(in srgb, var(--text-color) 7%, transparent);
  color: var(--text-color);
  font-size: 0.9375rem;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 助手消息不套气泡：文字直接铺在背景上，读起来更像对话而不是聊天气泡墙 */
.ai-msg--bot :deep(.ai-content) {
  max-width: 100%;
}

/* 三点加载：比闪烁光标更像「在思考」，也不会让人以为卡住 */
.ai-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 22px;
}

.ai-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: ai-bounce 1.4s infinite ease-in-out both;
}

.ai-typing span:nth-child(1) {
  animation-delay: -0.32s;
}
.ai-typing span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes ai-bounce {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

/* ---------- 空状态 ---------- */
.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: auto;
  padding: 20px 0;
  text-align: center;
}

.ai-empty-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
}

.ai-empty-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
}

.ai-chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 6px;
}

.ai-chip {
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
  border-radius: 12px;
  background: transparent;
  color: var(--text-color);
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.ai-chip:hover:not(:disabled) {
  background: color-mix(in srgb, var(--text-color) 5%, transparent);
}

/* ---------- 未登录 ---------- */
.ai-guest {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: auto;
  padding: 24px 12px;
  text-align: center;
}

.ai-guest-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin-bottom: 4px;
}

.ai-guest-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-color);
}

.ai-guest-sub {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.ai-guest-link {
  margin-top: 8px;
  padding: 9px 20px;
  border-radius: 10px;
  background: var(--text-color);
  color: var(--background-color, #fff);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
}

/* ---------- 错误 ---------- */
.ai-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, #dc2626 10%, transparent);
  color: #dc2626;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.ai-retry {
  flex: none;
  padding: 3px 9px;
  border: 1px solid currentColor;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

/* ---------- 输入区 ---------- */
.ai-composer {
  padding: 8px 16px 12px;
}

.ai-input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 8px 8px 14px;
  border: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
  border-radius: 22px;
  background: var(--background-color, #fff);
  transition: border-color 0.15s ease;
}

.ai-input-wrap:focus-within {
  border-color: color-mix(in srgb, var(--text-color) 30%, transparent);
}

.ai-textarea {
  flex: 1;
  min-height: 24px;
  max-height: 108px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-color);
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.ai-textarea::placeholder {
  color: var(--text-secondary);
}

.ai-send {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--text-color);
  color: var(--background-color, #fff);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.ai-send:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.ai-send--stop {
  background: color-mix(in srgb, var(--text-color) 88%, transparent);
}

.ai-stop-square {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  background: var(--background-color, #fff);
}

.ai-disclaimer {
  margin: 8px 0 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.6875rem;
}

/* ---------- 过渡 ---------- */
.ai-fab-enter-active,
.ai-fab-leave-active,
.ai-panel-enter-active,
.ai-panel-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
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

  .ai-fab-label {
    display: none;
  }

  .ai-fab {
    padding: 6px;
  }
}
</style>
