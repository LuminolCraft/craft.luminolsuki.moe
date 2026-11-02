<template>
    <Navbar />
    <div class="not-found-page">
        <!-- 背景：Vue Bits「Dither」像素抖动（OGL shader），与 Minecraft 像素美学契合。
             主题紫低对比绘制，pointer-events 关闭、读屏不可见。 -->
        <div class="bg-dither" aria-hidden="true">
            <Dither
                :color="tokens.isDark ? tokens.primary : tokens.primaryDeep"
                :bg-color="tokens.canvas"
                :enable-mouse-interaction="false"
                :pixel-size="3"
                :fade="tokens.isDark ? 0.28 : 0.3"
                :color-num="tokens.isDark ? 4 : 24"
                :bias="tokens.isDark ? 0.2 : 0"
            />
        </div>

        <!-- 纸条母版：移出视口、仅用于快照成纹理（PaperCrumple 只吃图片）。
             纸色/字色写死（#fdfdfd / #1a1a1a），不跟主题翻转 —— 纸永远是纸。
             尺寸固定 420×260：快照拿的是 offsetWidth，不能用百分比宽度。 -->
        <div ref="noteRef" class="nf-note" aria-hidden="true">
            <div class="nf-note__head">
                <span class="nf-note__brand">LUMINOLCRAFT</span>
                <span class="nf-note__stamp">已作废</span>
            </div>
            <div class="nf-note__body">
                <p class="nf-note__code">404</p>
                <p class="nf-note__title">这张纸作废了</p>
                <p class="nf-note__desc">你要找的页面不存在，或者已经被管理员移走了。</p>
            </div>
            <div class="nf-note__foot">
                <span>NOT FOUND</span>
                <span>ERR_PAGE_GONE</span>
            </div>
        </div>

        <div class="nf-layout">
            <!-- 左列（row 1）：404 文案 -->
            <div class="nf-copy">
                <!-- 404 大字：ParticleText 粒子聚集 + 鼠标推斥。
                     canvas 对读屏不可见，组件模板自带 sr-only 文本兜底。 -->
                <div class="error-code">
                    <ParticleText
                        text="404"
                        :font-size="'clamp(4.5rem, 10vw, 7rem)'"
                        :font-weight="700"
                        :particle-size="3"
                        :density="3"
                        glow
                        trigger="mount"
                        :color="tokens.isDark ? tokens.primary : tokens.primaryDeep"
                        highlight-color="#c4b5fd"
                    />
                </div>
                <p class="error-description">{{ t('404.description') }}</p>
            </div>

            <!-- 右列：揉纸主视觉（跨两行） -->
            <div class="nf-paper" :class="{ 'nf-paper--dark': tokens.isDark }">
                <PaperCrumple
                    v-if="paperSrc"
                    class="nf-paper__stage"
                    :src="paperSrc"
                    :alt="paperAlt"
                    :width="paperW"
                    :height="paperH"
                    :scene-height="paperSceneHeight"
                    release-behavior="stay"
                    :crumple-amount="0.84"
                    :fold-count="7"
                    :wrinkle-depth="0.55"
                    :detail="56"
                    :seed="7"
                    :shadow="true"
                    :shadow-opacity="tokens.isDark ? 0.34 : 0.2"
                    :paper-color="tokens.isDark ? '#e2dfe9' : '#fdfdfd'"
                    :drag-radius="9999"
                    :throw-momentum="0.22"
                    @state-change="onPaperState"
                />
                <!-- 快照未就绪时的低调占位：不铺白底，只留虚线框 -->
                <div v-else class="nf-paper__placeholder" aria-hidden="true">
                    <span>正在准备纸条…</span>
                </div>
                <p v-if="paperSrc" class="nf-paper__hint">{{ paperHint }}</p>
            </div>

            <!-- 左列（row 2）：动作区 -->
            <div class="nf-actions">
                <div class="error-actions">
                    <a href="/" class="btn-back-home vercel-btn vercel-btn-primary">{{ t('404.backhome') }}</a>
                </div>
                <!-- 逃跑按钮：躲满 patience 次后 relent 停下，抓到显示彩蛋文案 -->
                <div class="dodge-area">
                    <DodgeField
                        :taunts="TAUNTS"
                        :ink-color="tokens.primary"
                        contrast-color="#18181b"
                        :patience="4"
                        :field-height="130"
                    >
                        <template #default="{ caught, gave }">
                            <button type="button" class="btn-reward" :class="{ 'btn-reward--caught': caught }">
                                {{ caught ? '什么都没有😛' : gave ? '好吧…' : '领取神秘奖励' }}
                            </button>
                        </template>
                    </DodgeField>
                </div>
            </div>
        </div>
    </div>
    <Footer />
</template>


<style scoped>
/* 注意：不能用全局已有的 .container 类名（responsive.css 里是 max-width:1200px
   的版心容器），否则背景画布不满屏 */
.not-found-page {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    /* 导航栏是 position: fixed; height: 64px，不占流 —— 顶部留出来，
       否则窄屏内容一多就会被导航压住 404 字 */
    padding-top: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.bg-dither {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
}

/* ---------- 布局：桌面两列（文案 / 纸条），窄屏单列 ---------- */

.nf-layout {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    grid-template-areas:
        'copy paper'
        'actions paper';
    align-items: center;
    column-gap: clamp(32px, 5vw, 72px);
    row-gap: clamp(20px, 3vw, 40px);
    width: min(1080px, 100%);
    padding: var(--space-10) var(--space-5);
}

.nf-copy {
    grid-area: copy;
    min-width: 0;
}

.nf-paper {
    grid-area: paper;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    min-width: 0;
    width: 100%;
    /* 纸面就绪后淡入，避免快照完成瞬间硬切 */
    animation: nf-fade-in 320ms var(--ease-out, ease-out) both;
}

.nf-actions {
    grid-area: actions;
    min-width: 0;
}

@keyframes nf-fade-in {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

/* 粒子字容器：canvas 需要固定高度（对应 clamp 最大 7rem 的字号再加采样余量），
   否则测量为 0 高、粒子不渲染 */
.error-code {
    height: clamp(5.5rem, 12vw, 8.5rem);
    margin: 0 0 var(--space-4) 0;
}

.error-description {
    font-size: var(--font-size-body-large);
    font-weight: 400;
    line-height: 1.80;
    /* 往正文色靠 18%：纯 secondary 灰压在抖动纹理上偏虚 */
    color: color-mix(in srgb, var(--text-color) 82%, var(--text-secondary));
    margin: 0;
    will-change: transform, opacity;
}

.error-actions {
    display: flex;
}

/* ---------- 揉纸主视觉 ---------- */

.nf-paper__stage {
    width: 100%;
}

/* 深色主题：黑投影压在黑底上等于没有，纸会像一张贴纸糊在页面上。
   做法是①用一圈极淡冷光把纸从黑底里托起来 ②把纸面亮度压到 0.92 免得刺眼
   ③提示文案提高对比度。纸本身仍是纸（不改成深色纸），只是光影跟着主题走。 */
.nf-paper--dark {
    position: relative;
    isolation: isolate;
}

.nf-paper--dark::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: radial-gradient(52% 46% at 50% 47%, rgb(255 255 255 / 10%), transparent 72%);
}

.nf-paper--dark .nf-paper__stage {
    /* 滤镜放在容器上：组件内部会给 canvas 写 inline filter（投影），直接改 canvas 会被盖掉。
       顺序有意义：先压亮度，再沿纸的剪影镀一圈极淡的轮廓光（黑底上这是唯一能让纸
       脱离背景的手段，矩形 box-shadow 对不规则的纸形无效），最后补一层地面接触阴影。 */
    filter: brightness(0.92) saturate(0.95) drop-shadow(0 0 1.5px rgb(255 255 255 / 30%))
        drop-shadow(0 16px 34px rgb(0 0 0 / 55%));
}

.nf-paper--dark .nf-paper__hint {
    color: color-mix(in srgb, var(--text-color) 66%, transparent);
}

.nf-paper__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: min(360px, 88%);
    aspect-ratio: 420 / 260;
    border: 1px dashed color-mix(in srgb, var(--text-color) 18%, transparent);
    border-radius: 4px;
    color: color-mix(in srgb, var(--text-color) 45%, transparent);
    font-size: 0.8rem;
    letter-spacing: 0.04em;
}

.nf-paper__hint {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.6;
    color: color-mix(in srgb, var(--text-color) 52%, transparent);
    text-align: center;
}

/* ---------- 纸条母版（快照源，永远在视口外） ---------- */

.nf-note {
    position: fixed;
    top: 0;
    left: -10000px;
    width: 420px;
    height: 260px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 24px 28px;
    background: #fdfdfd;
    color: #1a1a1a;
    font-family: var(--font-primary);
    pointer-events: none;
}

.nf-note__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 1px solid rgb(26 26 26 / 0.85);
}

.nf-note__brand {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.2em;
}

.nf-note__stamp {
    padding: 2px 8px;
    border: 2px solid #1a1a1a;
    border-radius: 2px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.24em;
    transform: rotate(-6deg);
    opacity: 0.55;
}

.nf-note__body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 0;
}

.nf-note__code {
    margin: 0;
    font-size: 58px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.03em;
}

.nf-note__title {
    margin: 8px 0 0;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.4;
}

.nf-note__desc {
    margin: 0;
    font-size: 12.5px;
    font-weight: 400;
    line-height: 1.7;
    opacity: 0.62;
}

.nf-note__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 10px;
    border-top: 1px dashed rgb(26 26 26 / 0.3);
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 500;
    letter-spacing: 0.16em;
    opacity: 0.55;
}

/* ---------- 按钮 ---------- */

.btn-back-home:hover::before {
  left: 100%;
}

.btn-back-home::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left var(--duration-slow) var(--ease-out);
}

.btn-back-home {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 32px;
    background: var(--vercel-black);
    color: var(--vercel-white);
    text-decoration: none;
    border-radius: var(--vercel-radius-standard, 6px);
    font-size: var(--vercel-font-size-button, 0.875rem);
    font-weight: 500;
    line-height: 1.43;
    letter-spacing: 0;
    transition: box-shadow 150ms ease-out;
    box-shadow: var(--shadow-border);
    position: relative;
    overflow: hidden;
    will-change: transform, opacity;
}

.btn-back-home:hover {
    box-shadow: var(--shadow-hover);
}

.btn-back-home:focus-visible {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: 2px;
}

.btn-back-home:active {
    box-shadow: var(--shadow-border);
}

/* 逃跑按钮的自定义按钮样式（DodgeField 自定义插槽，样式由调用方负责）。
   ink 为主题紫；caught 态由 DodgeField 的 caught slot prop 驱动 */
.dodge-area {
    width: min(340px, 100%);
    margin: var(--space-5) 0 0;
}

.btn-reward {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 10px 24px;
    border: 1px solid color-mix(in srgb, var(--df-ink, var(--primary-color)) 50%, transparent);
    border-radius: 9999px;
    /* 实底混色（而非半透明），保证在抖动纹理背景上仍可读 */
    background: color-mix(in srgb, var(--df-ink, var(--primary-color)) 14%, var(--background-color, #fff));
    color: var(--text-color);
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.4;
    cursor: pointer;
    user-select: none;
    touch-action: manipulation;
    transition:
        background-color 220ms ease,
        color 220ms ease,
        border-color 220ms ease;
}

.btn-reward--caught {
    background: var(--df-ink, var(--primary-color));
    border-color: var(--df-ink, var(--primary-color));
    color: #18181b;
}

.btn-reward:focus-visible {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: 2px;
}

/* ---------- 窄屏：单列，文案 → 纸条 → 按钮 ---------- */

@media (max-width: 768px) {
    .nf-layout {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
            'copy'
            'paper'
            'actions';
        justify-items: center;
        text-align: center;
        padding: var(--space-8) var(--space-4);
    }

    .nf-copy,
    .nf-actions {
        width: 100%;
    }

    .error-code {
        height: clamp(4.5rem, 18vw, 6rem);
    }

    .error-description {
        font-size: var(--font-size-body);
    }

    .error-actions {
        justify-content: center;
    }

    .dodge-area {
        margin: var(--space-4) auto 0;
    }

    .btn-back-home {
        padding: 10px 24px;
        font-size: var(--vercel-font-size-button, 0.875rem);
    }
}

@media (prefers-reduced-motion: reduce) {
    .nf-paper {
        animation: none;
    }
}
</style>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGsap } from '@/composables/useGsap'
import { DURATIONS } from '@/gsap'
import { snapshotToDataUrl } from '@/utils/dom-snapshot'
import Dither from '@/components/bits/Dither.vue'
import ParticleText from '@/components/bits/ParticleText.vue'
import DodgeField from '@/components/bits/DodgeField.vue'
// three.js 那套（PaperCrumple）单独切一个块异步来：404 的文案与按钮先出，
// 纸面随后到，不让 650KB 的 WebGL 代码压在首屏
const PaperCrumple = defineAsyncComponent(() => import('@/components/bits/PaperCrumple.vue'))
import type { PaperCrumpleState } from '@/components/bits/PaperCrumple.vue'
import { useBitsTokens } from '@/bits/bits-tokens'
import Navbar from '../components/Navbar.vue'

const { t } = useI18n()
const { create } = useGsap()
const tokens = useBitsTokens()

// 逃跑按钮的中文 taunts：自定义插槽下由 slot 模板消费（caught / gave 态文案）
const TAUNTS = ['领取神秘奖励', '再试试', '快抓住了', '差一点点', '好吧…']

/* ---------- 揉纸：母版快照 → 纹理 ---------- */

const NOTE_W = 420
const NOTE_H = 260

const noteRef = ref<HTMLElement | null>(null)
const paperSrc = ref('')
const paperState = ref<PaperCrumpleState>('flat')

const paperAlt = '一张写着 404 的「已作废」纸条，可以按住揉皱'

/** 响应式两档：桌面 420×260 纸 / 520 舞台；窄屏 340×210 纸 / 380 舞台 */
const narrowQuery = window.matchMedia?.('(max-width: 768px)')
const isNarrow = ref(narrowQuery?.matches ?? false)
const onNarrowChange = (event: MediaQueryListEvent) => {
  isNarrow.value = event.matches
}

const paperW = computed(() => (isNarrow.value ? 340 : 420))
const paperH = computed(() => (isNarrow.value ? 210 : 260))
const paperSceneHeight = computed(() => (isNarrow.value ? 340 : 460))

const paperHint = computed(() => {
  switch (paperState.value) {
    case 'holding':
      return '继续按住…'
    case 'crumpled':
      return '扔到哪儿就停在哪儿 · 双击展平归位'
    case 'creased':
      return '揉过痕的纸，展不平了'
    default:
      return '按住揉皱 · 拖起来甩出去 · 双击展平归位'
  }
})

function onPaperState(next: PaperCrumpleState): void {
  paperState.value = next
}

/**
 * 只做一次：字体落地后把母版 DOM 快照成 PNG 纹理。
 * 不随 resize 重算（重算会连同 PaperCrumple 的揉皱状态一起重置）。
 */
async function preparePaper(): Promise<void> {
  const el = noteRef.value
  if (!el) return
  try {
    performance.mark('nf-snapshot-start')
    await document.fonts.ready
    paperSrc.value = await snapshotToDataUrl(el, {
      width: NOTE_W,
      height: NOTE_H,
      scale: 2,
      background: '#fdfdfd',
    })
    performance.mark('nf-paper-src')
  } catch (error) {
    // 快照失败就退回纯文案版 404（页面功能不受影响）
    console.warn('[NotFound] 纸条快照失败，保留纯文案版本', error)
  }
}

onMounted(() => {
  performance.mark('nf-404-mounted')
  narrowQuery?.addEventListener('change', onNarrowChange)
  void preparePaper()

  create((g) => {
    g.set('.error-description, .btn-back-home', { autoAlpha: 0 })

    const mm = g.matchMedia()

    // reduceMotion: simple fade-in only
    mm.add('(prefers-reduced-motion: reduce)', () => {
      g.set('.error-description, .btn-back-home', { autoAlpha: 1 })
    })

    // normal animation（404 大字由 ParticleText 自带的 mount 聚集动画负责）
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      g.timeline()
        .fromTo('.error-description',
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: DURATIONS.entrance },
        )
        .fromTo('.btn-back-home',
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: DURATIONS.entrance },
        '-=0.2')
    })
  })
})

onBeforeUnmount(() => {
  narrowQuery?.removeEventListener('change', onNarrowChange)
})
</script>
