<!--
  ConnectFlowSection —— 三步进服

  玩家看完在线状态后第一个问题就是「我怎么才能进来」，所以紧跟 StatusSection。
  布局对齐参考页：**一个外层面板包住三步卡**，卡内紧凑（编号 + 标题 + 一句说明 + 按钮），
  而不是三张各自独立的大卡。

  服务器地址不在页面出现（白名单 + 群内发放）。
  皮肤：home-sections.css 的 .lp-card / .lp-btn / .lp-chip。
-->
<script setup lang="ts">
import { QQ_GROUP } from '@/config/home-content'

const STEPS = [
  {
    no: '1',
    key: 'join group',
    title: '进 QQ 群',
    desc: '群号 993953379。进群后在群公告里找服务器地址。',
    action: { label: '进 QQ 群', to: QQ_GROUP, external: true },
    highlight: true,
  },
  {
    no: '2',
    key: 'get ip',
    title: '复制服务器地址',
    desc: '群公告里有服务器 IP，先复制下来，进服时要用。',
    action: null,
    highlight: false,
  },
  {
    no: '3',
    key: 'register',
    title: '注册网站账号',
    desc: '用网站账号跟进服后的绑定、封禁查询都要靠它。',
    action: { label: '去注册', to: '/register', external: false },
    highlight: false,
  },
  {
    no: '4',
    key: 'bind in game',
    title: '进服绑定游戏账号',
    desc: '用群里的地址进服，按游戏内提示完成绑定，绑定后自动加白。',
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
        <p class="lp-lead">纯净生存是白名单服，没绑定游戏账号会被防火墙直接拒绝。四步走完就能进。</p>
      </header>

      <div class="lp-card lp-card--ticks connect__panel" data-reveal>
        <div class="connect__meta">
          <span>v 26.3</span>
          <span class="connect__dot">·</span>
          <span>Folia hard-fork</span>
          <span class="connect__dot">·</span>
          <span>白名单准入</span>
          <span class="connect__dot">·</span>
          <span class="connect__live"><i aria-hidden="true" />ONLINE</span>
        </div>

        <ol class="connect__steps">
          <li v-for="step in STEPS" :key="step.key" class="connect__step">
            <div class="connect__card" :class="{ 'connect__card--hl': step.highlight }">
              <div class="connect__top">
                <span class="connect__no">{{ step.no }}</span>
                <span class="connect__sep">/</span>
                <span class="connect__key">{{ step.key }}</span>
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
              <span v-else class="connect__tag">地址自取 · 无需等待</span>
            </div>
          </li>
        </ol>

        <p class="connect__note">
          没绑定游戏账号会被防火墙直接拒绝。顺序是：进群拿地址 → 注册网站账号 → 进服按提示绑定。
          绑定成功后自动加白；想玩粘液科技 / 领地 / RPG 副本请走「综合生存」。
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.connect__panel {
  padding: 22px;
}

/* 面板顶部规格行：一行等宽小字 + 分隔点，不用胶囊标签 */
.connect__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: var(--text-secondary);
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-color);
}
.connect__dot {
  opacity: 0.35;
}
.connect__live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #12a150;
  letter-spacing: 0.06em;
}
.connect__live i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
}

.connect__steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  list-style: none;
  padding: 0;
  margin: 0;
}

/* typography.css 给 ol li 设了 decimal，继承关不掉，必须在 li 上直接清 */
.connect__step {
  list-style: none;
}

/* 内层卡：与外层面板同刻度的小圆角，透明底 + 1px 边框，不做彩色块 */
.connect__card {
  height: 100%;
  padding: 18px 18px 16px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  display: flex;
  flex-direction: column;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

@media (hover: hover) {
  .connect__step:hover .connect__card {
    border-color: color-mix(in srgb, var(--primary-color) 55%, var(--border-color));
  }
}

.connect__top {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 10px;
}
.connect__no {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--primary-color);
}
.connect__sep {
  font-family: var(--font-mono);
  font-size: 11px;
  opacity: 0.4;
}
.connect__key {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
  opacity: 0.75;
}

.connect__card-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-color);
  margin: 0 0 6px;
}
.connect__card-desc {
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--text-secondary);
  margin: 0 0 14px;
  flex: 1;
}
.connect__action {
  align-self: flex-start;
}

.connect__tag {
  align-self: flex-start;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  opacity: 0.85;
}

/* 第 2 步：唯一需要玩家离开站点的动作。用主色描边 + 极淡底强调，
   不再整块渐变实心（那是「胶囊/色块」观感的主要来源）。 */
.connect .connect__card--hl {
  border-color: var(--primary-color);
  background-color: color-mix(in srgb, var(--primary-color) 7%, transparent);
}
.connect .connect__card--hl .connect__no,
.connect .connect__card--hl .connect__key {
  color: var(--primary-color);
}
.connect .connect__card--hl .connect__sep {
  color: var(--primary-color);
  opacity: 0.5;
}

.connect__note {
  margin: 16px 2px 0;
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--text-secondary);
  opacity: 0.85;
}

@media (max-width: 1080px) {
  .connect__steps {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .connect__panel {
    padding: 16px;
  }
  .connect__steps {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .connect__card {
    transition: none;
  }
}
</style>
