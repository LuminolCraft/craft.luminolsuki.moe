<!--
  ConnectFlowSection —— 三步进服

  玩家看完在线状态后第一个问题就是「我怎么才能进来」，所以紧跟 StatusSection。
  三步卡：绑定账号 → 进群拿地址 → 进服。服务器地址不在页面出现（白名单 + 群内发放）。

  视觉：玻璃卡 + 项目自有 MagneticCornerFrame（四角 L 形角标，hover 展开）+
  主色染色投影；第 2 步是渐变实卡，因为它是唯一需要玩家跳出去做的动作。
  皮肤来自 styles/desktop/home-sections.css 的 .lp-*，此处只写布局。
-->
<script setup lang="ts">
import { QQ_GROUP } from '@/config/home-content'

const STEPS = [
  {
    no: '01',
    key: 'bind',
    title: '绑定账号',
    desc: '网站账号与 Minecraft 账号绑定，成功后系统自动写入白名单，通常 1 分钟内生效。',
    action: { label: '去绑定', to: '/settings/minecraft', external: false },
    highlight: false,
  },
  {
    no: '02',
    key: 'join',
    title: '进群拿地址',
    desc: '服务器地址只在群内发放，不在网站公开。进群后在群公告自取。',
    action: { label: '进 QQ 群', to: QQ_GROUP, external: true },
    highlight: true,
  },
  {
    no: '03',
    key: 'connect',
    title: '进服',
    desc: '把群公告里的地址填进客户端「多人游戏」，用已绑定的角色名进入。',
    action: null,
    highlight: false,
  },
] as const
</script>

<template>
  <section class="lp-sec connect" aria-labelledby="connect-title">
    <div class="lp-wrap">
      <header data-reveal>
        <p class="lp-kicker">onboarding / 三步</p>
        <h2 id="connect-title" class="lp-title">怎么进来</h2>
        <p class="lp-lead">纯净生存是白名单服，没绑定账号会被防火墙直接拒绝。三步走完就能进。</p>
      </header>

      <ol class="connect__steps">
        <li v-for="step in STEPS" :key="step.key" class="connect__step" data-reveal>
          <div class="lp-card lp-card--ticks connect__card" :class="{ 'connect__card--hl': step.highlight }">
              <div class="connect__top">
                <span class="connect__no">{{ step.no }}</span>
                <span class="lp-chip lp-chip--plain connect__key">{{ step.key }}</span>
              </div>
              <h3 class="connect__card-title">{{ step.title }}</h3>
              <p class="connect__card-desc">{{ step.desc }}</p>

              <a
                v-if="step.action"
                class="lp-btn connect__action"
                :class="step.highlight ? 'lp-btn--primary' : 'lp-btn--ghost'"
                :href="step.action.to"
                :target="step.action.external ? '_blank' : undefined"
                :rel="step.action.external ? 'noopener' : undefined"
              >
                {{ step.action.label }}
              </a>
              <span v-else class="lp-chip lp-chip--plain connect__tag">地址自取 · 无需等待</span>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.connect__steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.connect__step {
  height: 100%;
}

.connect__card {
  height: 100%;
  padding: 26px 26px 24px;
  display: flex;
  flex-direction: column;
  transition:
    border-color 0.25s,
    transform 0.25s,
    box-shadow 0.25s;
}

@media (hover: hover) {
  .connect__step:hover .connect__card {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--primary-color) 48%, var(--glass-border));
    box-shadow:
      0 26px 54px -26px color-mix(in srgb, var(--primary-color) 50%, transparent),
      0 10px 26px -18px color-mix(in srgb, var(--text-color) 26%, transparent);
  }
}

.connect__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.connect__no {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--primary-color);
}
.connect__key {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 10px;
}
.connect__card-title {
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-color);
  margin: 0 0 8px;
}
.connect__card-desc {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 20px;
  flex: 1;
}
.connect__action {
  align-self: flex-start;
}

/* 第 2 步：唯一需要玩家离开站点的动作，做成渐变实卡。
   选择器带上 .connect 前缀，特异性高于全局 .home-page .lp-card，
   否则卡片底色会把渐变盖掉、白字全看不见。 */
.connect .connect__card--hl {
  background-color: transparent;
  background-image: linear-gradient(
    135deg,
    var(--primary-color),
    color-mix(in srgb, var(--primary-color) 52%, #2a1b4d)
  );
  border-color: transparent;
  box-shadow:
    0 26px 60px -26px color-mix(in srgb, var(--primary-color) 85%, transparent),
    0 8px 24px -18px color-mix(in srgb, var(--text-color) 30%, transparent);
}
.connect .connect__card--hl .connect__no {
  color: rgba(255, 255, 255, 0.85);
}
.connect .connect__card--hl .connect__key {
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.35);
  background-color: rgba(255, 255, 255, 0.14);
}
.connect .connect__card--hl .connect__card-title,
.connect .connect__card--hl .connect__card-desc {
  color: #fff;
}
.connect__tag {
  align-self: flex-start;
}

/* 渐变卡上的角标要反过来用白，否则紫底 + 紫色角标看不见 */
.connect .connect__card--hl::before,
.connect .connect__card--hl::after {
  border-color: rgba(255, 255, 255, 0.55);
}

@media (max-width: 900px) {
  .connect__steps {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .connect__card {
    transition: none;
  }
}
</style>
