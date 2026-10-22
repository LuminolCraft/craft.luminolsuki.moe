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
      <div v-if="!open" class="ai-dock" @mouseenter="showQuick" @mouseleave="hideQuick">
        <div class="ai-quick" aria-hidden="true">
          <button
            v-for="(item, index) in QUICK_ASKS"
            :key="item"
            :ref="(el) => setChipRef(el, index)"
            type="button"
            class="ai-quick-chip"
            tabindex="-1"
            @click="quickAsk(item)"
          >
            {{ item }}
          </button>
        </div>
        <button type="button" class="ai-fab" aria-label="打开 Luminol 助手" @click="openPanel">
          <img :src="AVATAR" alt="" class="ai-fab-avatar" width="32" height="32" />
          <span class="ai-fab-label">Luminol</span>
        </button>
      </div>
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
          <button
            type="button"
            class="ai-icon-btn"
            aria-label="在整页打开"
            title="在整页打开"
            @click="openFullPage"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
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
import { computed, nextTick, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import gsap from 'gsap'
import AiMessageContent from './AiMessageContent.vue'
import { useAiChat } from '@/composables/useAiChat'
import { useAuthStore } from '@/stores/auth'
import { EASINGS } from '@/gsap/config/easings'

const auth = useAuthStore()
const router = useRouter()

/** 头像：圆形裁切 + 透明底的 AVIF（96px，3.5KB），深浅主题都不出现白角 */
const AVATAR = '/images/luminol-avatar-96.avif'

/** 快捷提问：覆盖最高频的三类「导向型」问题，引导用户先问对方向。 */
const QUICK_ASKS = ['怎么进服务器？', '有哪些规则？', '服务器地址是什么？']

const open = ref(false)
const draft = ref('')
const bodyRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const chipEls: Array<HTMLElement | null> = []

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

/* ---------- hover 快捷提问气泡（Vue Bits「BubbleMenu」的改写） ---------- */

// 微调点：QUICK_IN / QUICK_OUT 弹出与收回时长（秒）· QUICK_STAGGER 逐个间隔（秒）
const QUICK_IN = 0.45
const QUICK_OUT = 0.16
const QUICK_STAGGER = 0.06

/** 触屏没有 hover、reduced-motion 不做弹出动画：两种情况都不启用 */
const hoverFx = ref(false)

/** 气泡当前是否处于展开态；面板打开时 dock 卸载，要复位 */
let quickShown = false

function setChipRef(el: Element | ComponentPublicInstance | null, index: number): void {
  chipEls[index] = (el as HTMLElement | null) ?? null
}

function showQuick(): void {
  if (!hoverFx.value || quickShown) return
  quickShown = true
  const chips = chipEls.filter((el): el is HTMLElement => el !== null)
  if (chips.length === 0) return
  gsap.killTweensOf(chips)
  // 逐个弹出 + 随机抖角，back.out 过冲是 BubbleMenu 的标志手感
  gsap.fromTo(
    chips,
    { opacity: 0, scale: 0, y: 6 },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      pointerEvents: 'auto',
      rotation: () => gsap.utils.random(-7, 7),
      duration: QUICK_IN,
      ease: EASINGS.bounce,
      stagger: QUICK_STAGGER,
    },
  )
}

function hideQuick(): void {
  if (!hoverFx.value) return
  quickShown = false
  const chips = chipEls.filter((el): el is HTMLElement => el !== null)
  if (chips.length === 0) return
  gsap.killTweensOf(chips)
  gsap.to(chips, {
    opacity: 0,
    scale: 0,
    y: 6,
    pointerEvents: 'none',
    duration: QUICK_OUT,
    ease: 'power2.in',
    stagger: 0.03,
  })
}

function openPanel(): void {
  open.value = true
  quickShown = false
  scrollToBottom()
  void nextTick(() => textareaRef.value?.focus())
}

/** 点气泡 = 开面板并直接把问题发出去（与面板内快捷提问行为一致）；游客只开面板 */
function quickAsk(text: string): void {
  openPanel()
  if (auth.isAuthenticated) void submitText(text)
}

function close(): void {
  open.value = false
  abort()
}

/** 整页对话：弹窗收起（正在收的流会中断），整页那边是独立的一段对话 */
function openFullPage(): void {
  close()
  void router.push('/Luminol')
}

onMounted(() => {
  hoverFx.value =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

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

/* ---------- 悬浮按钮 + 快捷提问气泡 ---------- */
.ai-dock {
  position: relative;
}

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

/* 快捷提问气泡：hover 悬浮按钮时以弹簧曲线逐个弹出（弧形排在左上方）。
   仅精确指针设备启用；触屏直接 display:none，面板内仍有同款快捷提问。 */
.ai-quick-chip {
  position: absolute;
  z-index: 1;
  padding: 7px 12px;
  border: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
  border-radius: 999px;
  background: var(--background-color, #fff);
  color: var(--text-color);
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  opacity: 0;
  transform: scale(0);
  pointer-events: none;
  transition: background 0.15s ease;
}

.ai-quick-chip:hover {
  background: color-mix(in srgb, var(--text-color) 6%, transparent);
}

.ai-quick-chip:nth-child(1) {
  right: calc(100% + 14px);
  bottom: 2px;
}

.ai-quick-chip:nth-child(2) {
  right: calc(100% + 32px);
  bottom: 40px;
}

.ai-quick-chip:nth-child(3) {
  right: calc(100% + 66px);
  bottom: 72px;
}

@media (hover: none), (pointer: coarse) {
  .ai-quick-chip {
    display: none;
  }
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
/* 面板从悬浮按钮角落弹起/收回：进出场都带 back 类过冲，transform-origin 对准按钮 */
.ai-panel-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.46s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ai-panel-leave-active {
  transition:
    opacity 0.2s ease-in,
    transform 0.3s cubic-bezier(0.36, 0, 0.66, -0.56);
}

.ai-panel-enter-from {
  opacity: 0;
  transform: translateY(26px) scale(0.86);
}

.ai-panel-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.9);
}

.ai-panel-enter-active,
.ai-panel-leave-active {
  transform-origin: 100% 100%;
}

.ai-fab-enter-active,
.ai-fab-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.ai-fab-enter-from,
.ai-fab-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .ai-panel-enter-active,
  .ai-panel-leave-active {
    transition: opacity 0.16s ease;
  }

  .ai-panel-enter-from,
  .ai-panel-leave-to {
    transform: none;
  }
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

  /* 全屏面板做角落缩放没有意义，退化为纯淡入淡出 */
  .ai-panel-enter-active,
  .ai-panel-leave-active {
    transition: opacity 0.18s ease;
  }

  .ai-panel-enter-from,
  .ai-panel-leave-to {
    transform: none;
  }

  .ai-fab-label {
    display: none;
  }

  .ai-fab {
    padding: 6px;
  }
}
</style>
