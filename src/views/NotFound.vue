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
        <div class="not-found-content">
            <!-- 404 大字：ParticleText 粒子聚集 + 鼠标推斥。
                 canvas 对读屏不可见，组件模板自带 sr-only 文本兜底。 -->
            <div class="error-code">
                <ParticleText
                    text="404"
                    :font-size="'clamp(5rem, 12vw, 8rem)'"
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
                    :field-height="150"
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
    <Footer />
</template>


<style scoped>
/* 注意：不能用全局已有的 .container 类名（responsive.css 里是 max-width:1200px
   的版心容器），否则背景画布不满屏 */
.not-found-page {
    position: relative;
    min-height: 100vh;
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

.not-found-content {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: var(--space-10) var(--space-5);
}

/* 粒子字容器：canvas 需要固定高度（对应 clamp 最大 8rem 的字号再加采样余量），
   否则测量为 0 高、粒子不渲染 */
.error-code {
    height: clamp(6.5rem, 14vw, 9.5rem);
    margin: 0 0 var(--space-6) 0;
}

.error-description {
    font-size: var(--font-size-body-large);
    font-weight: 400;
    line-height: 1.80;
    /* 往正文色靠 18%：纯 secondary 灰压在抖动纹理上偏虚 */
    color: color-mix(in srgb, var(--text-color) 82%, var(--text-secondary));
    margin: 0 0 var(--space-10) 0;
    will-change: transform, opacity;
}

.error-actions {
    display: flex;
    justify-content: center;
}

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
    width: min(360px, 100%);
    margin: var(--space-6) auto 0;
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

@media (max-width: 768px) {
    .not-found-content {
        padding: var(--space-8) var(--space-4);
    }

    .error-code {
        height: clamp(5.5rem, 16vw, 7rem);
    }

    .error-description {
        font-size: var(--font-size-body);
    }

    .btn-back-home {
        padding: 10px 24px;
        font-size: var(--vercel-font-size-button, 0.875rem);
    }
}
</style>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGsap } from '@/composables/useGsap'
import { DURATIONS } from '@/gsap'
import Dither from '@/components/bits/Dither.vue'
import ParticleText from '@/components/bits/ParticleText.vue'
import DodgeField from '@/components/bits/DodgeField.vue'
import { useBitsTokens } from '@/bits/bits-tokens'
import Navbar from '../components/Navbar.vue'

const { t } = useI18n()
const { create } = useGsap()
const tokens = useBitsTokens()

// 逃跑按钮的中文 taunts：自定义插槽下由 slot 模板消费（caught / gave 态文案）
const TAUNTS = ['领取神秘奖励', '再试试', '快抓住了', '差一点点', '好吧…']

onMounted(() => {
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
</script>
