<!--
  Luminol 聊天页（独立页面）。

  与悬浮弹窗的区别：弹窗是「查东西」的入口，快速得到答案就走；
  这个页面是「和 Luminol 聊会儿」的场景，所以有开场白话术、更大留白、
  更完整的对话留痕。

  人设实现见 cortex `src/pipeline/persona.ts`：实测 6/6 的写法是
  「这里是 LuminolCraft 社区的聊天室……署名 Luminol」——不陈述身份，
  只描述场景与动作。写「你是 Luminol」会被上游身份纠正规则拦下。
-->
<template>
  <main class="lum-page">
    <section ref="threadRef" class="lum-thread">
      <!-- 空状态：头像 + 一句招呼 + 建议提问 -->
      <div v-if="messages.length === 0 && !sending" class="lum-empty">
        <img :src="AVATAR" alt="Luminol" class="lum-empty-avatar" width="88" height="88" />
        <h1 class="lum-empty-title">今天想聊点什么？</h1>
        <p class="lum-empty-sub">
          我是 Luminol，LuminolCraft 社区的一员。<br />进服流程、服务器规则、常用指令、最近的公告，都可以问我。
        </p>
        <div class="lum-suggestions">
          <button
            v-for="item in SUGGESTIONS"
            :key="item"
            type="button"
            class="lum-suggestion"
            :disabled="sending"
            @click="sendText(item)"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <!-- 对话流 -->
      <template v-else>
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="lum-row"
          :class="message.role === 'user' ? 'lum-row--user' : 'lum-row--bot'"
        >
          <img
            v-if="message.role === 'assistant'"
            :src="AVATAR"
            alt=""
            class="lum-avatar"
            width="28"
            height="28"
          />
          <p v-if="message.role === 'user'" class="lum-bubble">{{ message.content }}</p>
          <div v-else class="lum-text"><AiMessageContent :content="message.content" /></div>
        </div>

        <div v-if="sending" class="lum-row lum-row--bot">
          <img :src="AVATAR" alt="" class="lum-avatar" width="28" height="28" />
          <div v-if="streaming" class="lum-text"><AiMessageContent :content="streaming" /></div>
          <div v-else class="lum-typing" aria-label="正在思考">
            <span></span><span></span><span></span>
          </div>
        </div>
      </template>

      <div v-if="error" class="lum-error">
        <span>{{ error.message }}</span>
        <button
          v-if="error.status === 429 || error.status >= 500"
          type="button"
          class="lum-retry"
          @click="retry"
        >
          重试
        </button>
      </div>
    </section>

    <footer class="lum-footer">
      <div v-if="!auth.isAuthenticated" class="lum-gate">
        <span>登录后就能和 Luminol 聊天了</span>
        <RouterLink class="lum-gate-link" to="/Login">去登录</RouterLink>
      </div>

      <template v-else>
        <div class="lum-input-wrap">
          <textarea
            ref="textareaRef"
            v-model="draft"
            class="lum-textarea"
            rows="1"
            maxlength="2000"
            placeholder="给 Luminol 发消息…"
            @keydown.enter.exact.prevent="submit"
          ></textarea>
          <button
            v-if="sending"
            type="button"
            class="lum-send lum-send--stop"
            aria-label="停止生成"
            @click="abort"
          >
            <span class="lum-stop-square" aria-hidden="true"></span>
          </button>
          <button
            v-else
            type="submit"
            class="lum-send"
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
        <!-- 能力透明：用户知道它做不到什么，就不会被冒充它的说法骗到 -->
        <p class="lum-disclaimer">
          Luminol 也会出错，重要信息以公告为准。它不能操作账号、封禁或发布内容。
        </p>
      </template>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AiMessageContent from '@/components/ai/AiMessageContent.vue'
import { useAiChat } from '@/composables/useAiChat'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

/** 圆形裁切 + 透明底的 AVIF，深浅主题都不出现白角 */
const AVATAR = '/images/luminol-avatar-256.avif'

const SUGGESTIONS = ['怎么进服务器？', '服务器有哪些规则？', '常用指令有哪些？', '最近有什么公告？']

const draft = ref('')
const threadRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

/**
 * 人设提示。刻意不写「你是 Luminol」——实测那会触发上游的身份纠正，
 * 回复变成「我是…学生通用智能体」。只描述场景与语气，模型自然代入。
 */
const SYSTEM_PROMPT =
  '这里是 LuminolCraft 社区的聊天室。你用轻松活泼的语气回答，回应时署名 Luminol。'

const { messages, streaming, sending, error, send, abort } = useAiChat({
  systemPrompt: SYSTEM_PROMPT,
})

const lastQuestion = computed(() => {
  const last = [...messages.value].reverse().find((m) => m.role === 'user')
  return last?.content ?? ''
})

function scrollToBottom(): void {
  void nextTick(() => {
    const el = threadRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch([messages, streaming], scrollToBottom, { deep: true })

// 输入框随内容增高
watch(draft, () => {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
})

async function sendText(text: string): Promise<void> {
  if (sending.value) return
  await send(text)
  scrollToBottom()
}

function submit(): void {
  const text = draft.value.trim()
  if (!text || sending.value) return
  draft.value = ''
  void sendText(text)
}

function retry(): void {
  if (lastQuestion.value) void sendText(lastQuestion.value)
}
</script>

<style scoped>
.lum-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  /* 给固定导航栏让位（与其他页面一致的 --space-20 = 80px） */
  padding-top: var(--space-20, 80px);
  background: var(--background-color);
}

/* ---------- 对话流 ---------- */
.lum-thread {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 8px 20px 24px;
  overflow-y: auto;
}

.lum-row {
  display: flex;
  gap: 12px;
}

.lum-row--user {
  justify-content: flex-end;
}

.lum-row--bot {
  align-items: flex-start;
}

.lum-avatar {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  margin-top: 2px;
}

.lum-text {
  flex: 1;
  min-width: 0;
  padding-top: 3px;
}

/* 用户气泡：文本色 7% 叠加，深浅主题共用一套值 */
.lum-bubble {
  max-width: 78%;
  margin: 0;
  padding: 10px 16px;
  border-radius: 18px;
  border-bottom-right-radius: 6px;
  background: color-mix(in srgb, var(--text-color) 7%, transparent);
  color: var(--text-color);
  font-size: 0.9375rem;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 三点加载 */
.lum-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding-top: 4px;
}

.lum-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: lum-bounce 1.4s infinite ease-in-out both;
}

.lum-typing span:nth-child(1) {
  animation-delay: -0.32s;
}
.lum-typing span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes lum-bounce {
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
.lum-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 0;
  text-align: center;
}

.lum-empty-avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
}

.lum-empty-title {
  margin: 6px 0 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.lum-empty-sub {
  margin: 0;
  max-width: 460px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.75;
}

.lum-suggestions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 520px;
  margin-top: 12px;
}

.lum-suggestion {
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
  border-radius: 14px;
  background: transparent;
  color: var(--text-color);
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.lum-suggestion:hover:not(:disabled) {
  background: color-mix(in srgb, var(--text-color) 5%, transparent);
  border-color: color-mix(in srgb, var(--text-color) 22%, transparent);
}

/* ---------- 错误 ---------- */
.lum-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, #dc2626 10%, transparent);
  color: #dc2626;
  font-size: 0.875rem;
  line-height: 1.5;
}

.lum-retry {
  flex: none;
  padding: 3px 10px;
  border: 1px solid currentColor;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

/* ---------- 输入区 ---------- */
.lum-footer {
  position: sticky;
  bottom: 0;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 8px 20px 20px;
  background: var(--background-color);
}

.lum-input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 8px 8px 18px;
  border: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
  border-radius: 24px;
  background: var(--background-color);
  transition: border-color 0.15s ease;
}

.lum-input-wrap:focus-within {
  border-color: color-mix(in srgb, var(--text-color) 30%, transparent);
}

.lum-textarea {
  flex: 1;
  min-height: 26px;
  max-height: 160px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-color);
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.lum-textarea::placeholder {
  color: var(--text-secondary);
}

.lum-send {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: var(--text-color);
  color: var(--background-color);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.lum-send:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.lum-send--stop {
  background: color-mix(in srgb, var(--text-color) 88%, transparent);
}

.lum-stop-square {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: var(--background-color);
}

.lum-gate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
  border-radius: 18px;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.lum-gate-link {
  flex: none;
  padding: 8px 18px;
  border-radius: 10px;
  background: var(--text-color);
  color: var(--background-color);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 600;
}

.lum-disclaimer {
  margin: 10px 0 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.6875rem;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .lum-thread {
    padding: 8px 14px 20px;
    gap: 18px;
  }

  .lum-footer {
    padding: 8px 14px 14px;
  }

  .lum-empty-title {
    font-size: 1.25rem;
  }

  .lum-suggestions {
    grid-template-columns: 1fr;
  }

  .lum-bubble {
    max-width: 88%;
  }
}
</style>
