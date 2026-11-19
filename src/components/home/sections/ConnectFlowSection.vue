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
    key: 'bind',
    title: '绑定账号',
    desc: '网站账号与 Minecraft 账号绑定，成功后自动写入白名单。',
    action: { label: '去绑定', to: '/settings/minecraft', external: false },
    highlight: false,
  },
  {
    no: '2',
    key: 'join group',
    title: '进群拿地址',
    desc: '服务器地址只在群内发放（群号 993953379），群公告自取。',
    action: { label: '进 QQ 群', to: QQ_GROUP, external: true },
    highlight: true,
  },
  {
    no: '3',
    key: 'connect',
    title: '进服',
    desc: '把群里的地址粘进客户端「多人游戏」，用已绑定的角色名进入。',
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

      <div class="lp-card lp-card--ticks connect__panel" data-reveal>
        <div class="connect__pills">
          <span class="lp-chip lp-chip--plain">v 26.3</span>
          <span class="lp-chip lp-chip--plain">Folia hard-fork</span>
          <span class="lp-chip lp-chip--ok">ONLINE</span>
          <span class="lp-chip lp-chip--brand">白名单 · 需账号绑定</span>
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
              <span v-else class="lp-chip lp-chip--plain connect__tag">地址自取 · 无需等待</span>
            </div>
          </li>
        </ol>

        <p class="connect__note">
          没绑定账号会被防火墙直接拒绝。纯净生存只对白名单开放；地址不在网站公开，进 QQ 群自取。
          想玩粘液科技 / 领地 / RPG 副本请走「综合生存」。
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.connect__panel {
  padding: 22px;
}

/* 面板顶部胶囊行：版本 / 分支 / 状态 / 准入，一眼交代服务器规格 */
.connect__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.connect__steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  list-style: none;
  padding: 0;
  margin: 0;
}

/* typography.css 给 ol li 设了 decimal，继承关不掉，必须在 li 上直接清 */
.connect__step {
  list-style: none;
}

/* 内层卡：比外层面板低一档的表面，紧凑而不是「大卡片」 */
.connect__card {
  height: 100%;
  padding: 18px 18px 16px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--primary-color) 4%, transparent);
  display: flex;
  flex-direction: column;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

@media (hover: hover) {
  .connect__step:hover .connect__card {
    border-color: color-mix(in srgb, var(--primary-color) 45%, var(--border-color));
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
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
.connect__action,
.connect__tag {
  align-self: flex-start;
}

/* 第 2 步：唯一需要玩家离开站点的动作，做成渐变实卡 */
.connect .connect__card--hl {
  background-color: transparent;
  background-image: linear-gradient(
    135deg,
    var(--primary-color),
    color-mix(in srgb, var(--primary-color) 52%, #2a1b4d)
  );
  border-color: transparent;
  box-shadow: 0 16px 38px -20px color-mix(in srgb, var(--primary-color) 70%, transparent);
}
.connect .connect__card--hl .connect__no,
.connect .connect__card--hl .connect__sep,
.connect .connect__card--hl .connect__key,
.connect .connect__card--hl .connect__card-title,
.connect .connect__card--hl .connect__card-desc {
  color: #fff;
}
.connect .connect__card--hl .connect__key,
.connect .connect__card--hl .connect__sep {
  opacity: 0.8;
}

.connect__note {
  margin: 16px 2px 0;
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--text-secondary);
  opacity: 0.85;
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
