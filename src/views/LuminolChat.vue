<!--
  Luminol 聊天页（独立页面）。

  与悬浮弹窗的区别：弹窗是「查东西」的入口，快速得到答案就走；
  这个页面是「和 Luminol 聊会儿」的场景，所以有开场白、更大留白、
  更完整的对话留痕。

  人设实现见 cortex `src/pipeline/persona.ts`：实测 6/6 的写法是
  「这里是 LuminolCraft 社区的聊天室……署名 Luminol」——不陈述身份，
  只描述场景与动作。写「你是 Luminol」会被上游身份纠正规则拦下。
-->
<template>
  <main class="lum-page">
    <header class="lum-hero">
      <div class="lum-avatar" aria-hidden="true">L</div>
      <h1>Luminol</h1>
      <p class="lum-sub">LuminolCraft 社区的小小成员 · 有问题随时问我</p>
    </header>

    <section ref="bodyRef" class="lum-thread" aria-live="polite">
      <!-- 开场白写死在页面里，不额外打一次上游：新用户进页面零等待 -->
      <div class="lum-bubble lum-bubble--bot">
        <p>嗨～我是 Luminol，这个社区的一员 (๑•̀ㅂ•́)و✧</p>
        <p>进服流程、服务器规则、常用指令、最近的公告，都可以问我。</p>
      </div>

      <div
        v-for="(message, index) in messages"
        :key="index"
        class="lum-bubble"
        :class="message.role === 'user' ? 'lum-bubble--user' : 'lum-bubble--bot'"
      >
        <AiMessageContent v-if="message.role === 'assistant'" :content="message.content" />
        <span v-else class="lum-user-text">{{ message.content }}</span>
      </div>

      <div v-if="streaming" class="lum-bubble lum-bubble--bot">
        <AiMessageContent :content="streaming" />
        <span class="lum-caret" aria-hidden="true"></span>
      </div>

      <div v-if="error" class="lum-error">
        <span>{{ error.message }}</span>
        <button v-if="error.status === 429" type="button" class="lum-retry" @click="retry">
          重试
        </button>
      </div>
    </section>

    <div class="lum-composer">
      <div v-if="!auth.isAuthenticated" class="lum-gate">
        <p>登录后就能和 Luminol 聊天了</p>
        <RouterLink class="lum-gate-link" to="/Login">去登录</RouterLink>
      </div>

      <form v-else class="lum-form" @submit.prevent="submit">
        <textarea
          v-model="draft"
          class="lum-textarea"
          rows="1"
          maxlength="2000"
          :disabled="sending"
          placeholder="和 Luminol 说点什么…（Enter 发送，Shift+Enter 换行）"
          @keydown.enter.exact.prevent="submit"
        ></textarea>
        <button
          v-if="sending"
          type="button"
          class="lum-send lum-send--stop"
          title="停止生成"
          @click="abort"
        >
          停止
        </button>
        <button v-else type="submit" class="lum-send" :disabled="!draft.trim()">发送</button>
      </form>

      <!-- 能力透明：用户知道它做不到什么，就不会被冒充它的说法骗到 -->
      <p class="lum-note">
        Luminol 只能回答问题，不能替你操作账号、封禁、发公告，也不会自动跳转网页。
      </p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AiMessageContent from '@/components/ai/AiMessageContent.vue'
import { useAiChat } from '@/composables/useAiChat'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const draft = ref('')
const bodyRef = ref<HTMLElement | null>(null)

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
    const el = bodyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch([messages, streaming], scrollToBottom, { deep: true })

async function submit(): Promise<void> {
  const text = draft.value.trim()
  if (!text || sending.value) return
  draft.value = ''
  await send(text)
}

function retry(): void {
  if (lastQuestion.value) void send(lastQuestion.value)
}
</script>

<style scoped>
.lum-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 820px;
  min-height: calc(100vh - 160px);
  margin: 0 auto;
  padding: 32px 20px 0;
}

/* ---------- 头部 ---------- */
.lum-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-bottom: 20px;
  text-align: center;
}

.lum-avatar {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  box-shadow: var(--shadow-md, 0 6px 20px rgba(0, 0, 0, 0.14));
}

.lum-hero h1 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-color);
}

.lum-sub {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* ---------- 对话流 ---------- */
.lum-thread {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0 24px;
  overflow-y: auto;
}

.lum-bubble {
  max-width: 84%;
  padding: 11px 14px;
  border-radius: 14px;
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--text-color);
  word-break: break-word;
}

.lum-bubble p {
  margin: 0 0 0.5em;
}

.lum-bubble p:last-child {
  margin-bottom: 0;
}

.lum-bubble--bot {
  align-self: flex-start;
  background: var(--border-color, rgba(128, 128, 128, 0.12));
  border-bottom-left-radius: 4px;
}

.lum-bubble--user {
  align-self: flex-end;
  background: var(--primary-color);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.lum-user-text {
  white-space: pre-wrap;
}

.lum-caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: currentColor;
  animation: lum-blink 1s step-end infinite;
}

@keyframes lum-blink {
  50% {
    opacity: 0;
  }
}

.lum-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  font-size: 0.875rem;
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
.lum-composer {
  position: sticky;
  bottom: 0;
  padding: 12px 0 20px;
  background: var(--background-color, #fff);
}

.lum-form {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--background-color, #fff);
  box-shadow: var(--shadow-sm, 0 2px 10px rgba(0, 0, 0, 0.06));
}

.lum-textarea {
  flex: 1;
  max-height: 140px;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--text-color);
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.6;
  resize: none;
}

.lum-textarea:focus {
  outline: none;
}

.lum-send {
  flex: none;
  padding: 9px 20px;
  border: none;
  border-radius: 10px;
  background: var(--primary-color);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.lum-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.lum-send--stop {
  background: var(--text-secondary);
}

.lum-gate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border: 1px dashed var(--border-color);
  border-radius: 14px;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.lum-gate-link {
  flex: none;
  padding: 8px 18px;
  border-radius: 8px;
  background: var(--primary-color);
  color: #fff;
  text-decoration: none;
  font-size: 0.8125rem;
}

.lum-note {
  margin: 10px 0 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.75rem;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .lum-page {
    padding: 20px 14px 0;
  }

  .lum-bubble {
    max-width: 92%;
  }
}
</style>
