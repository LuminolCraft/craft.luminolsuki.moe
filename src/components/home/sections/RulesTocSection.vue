<!--
  RulesTocSection —— 规则速览（sticky 目录 + 编号章节）

  首页不铺长文：左侧 sticky 目录给「有什么」，右侧只展开一节给「长什么样」，
  全文仍在 /rules。目录项用编号方块 + 主色高亮当前项。

  无障碍：目录是 nav + 按钮列表，当前项标 aria-current；皮肤来自 home-sections.css。
-->
<script setup lang="ts">
import { computed, ref } from 'vue'

const SECTIONS = [
  { no: '1', title: '入服前必读', desc: '账号绑定、白名单与客户端版本要求。' },
  { no: '2', title: '账号绑定与白名单', desc: '三步完成绑定，绑定后自动加白。' },
  { no: '3', title: '纯净服玩法边界', desc: '允许与禁止的红石、刷怪与自动化。' },
  { no: '4', title: '违规处理与申诉', desc: '封禁梯度、公示口径与申诉渠道。' },
] as const

const activeNo = ref('2')
const active = computed(() => SECTIONS.find((s) => s.no === activeNo.value) ?? SECTIONS[1])
</script>

<template>
  <section class="lp-sec rules-toc" aria-labelledby="rules-toc-title">
    <div class="lp-wrap">
      <header data-reveal>
        <p class="lp-kicker">docs / 规则</p>
        <h2 id="rules-toc-title" class="lp-title">规则速览</h2>
        <p class="lp-lead">四节读完就知道什么能做、什么会被处理。全文在规则页。</p>
      </header>

      <div class="rules-toc__grid">
        <nav class="lp-card rules-toc__nav" aria-label="规则目录" data-reveal>
          <p class="rules-toc__nav-label">目录</p>
          <ul>
            <li v-for="s in SECTIONS" :key="s.no">
              <button
                type="button"
                class="rules-toc__item"
                :aria-current="activeNo === s.no ? 'true' : undefined"
                @click="activeNo = s.no"
              >
                <span class="rules-toc__no">{{ s.no }}</span>
                <span>{{ s.title }}</span>
              </button>
            </li>
          </ul>
          <p class="rules-toc__updated">
            最后更新<br />
            <span>2026-11-19</span>
          </p>
        </nav>

        <div class="lp-card rules-toc__body" data-reveal>
          <div class="rules-toc__body-head">
            <span class="rules-toc__body-no">{{ active.no }}</span>
            <h3 class="rules-toc__body-title">{{ active.title }}</h3>
          </div>
          <p class="rules-toc__body-desc">{{ active.desc }}</p>

          <div class="rules-toc__code">
            <div class="rules-toc__code-head">
              <span>绑定流程 · 三步</span>
              <span class="lp-chip lp-chip--brand rules-toc__lang">text</span>
            </div>
            <pre><code><span class="ln">1</span>登录网站 → 个人设置 → Minecraft 账号
<span class="ln">2</span>获取绑定码，在游戏内聊天发送
<span class="ln">3</span>加白后进 QQ 群，群公告取服务器地址</code></pre>
          </div>

          <a class="rules-toc__link" href="/rules">阅读完整规则 →</a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rules-toc__grid {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  align-items: start;
}

/* —— 目录：sticky —— */
.rules-toc__nav {
  position: sticky;
  top: 88px;
  padding: 18px 16px;
}
.rules-toc__nav-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
  opacity: 0.8;
  margin: 0 0 12px;
}
.rules-toc__nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rules-toc__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
}
.rules-toc__no {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  background: color-mix(in srgb, var(--primary-color) 16%, transparent);
  color: var(--primary-color);
  flex: 0 0 auto;
}
.rules-toc__item[aria-current='true'] {
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  color: var(--primary-color);
  font-weight: 550;
}
.rules-toc__item[aria-current='true'] .rules-toc__no {
  background: var(--primary-color);
  color: #fff;
}
@media (hover: hover) {
  .rules-toc__item:hover {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    color: var(--text-color);
  }
}
.rules-toc__updated {
  margin: 16px 0 0;
  padding-top: 14px;
  border-top: 1px solid var(--border-color);
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-secondary);
  opacity: 0.85;
}
.rules-toc__updated span {
  font-family: var(--font-mono);
}

/* —— 正文卡 —— */
.rules-toc__body {
  padding: 26px 28px;
}
.rules-toc__body-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.rules-toc__body-no {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--primary-color);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  flex: 0 0 auto;
}
.rules-toc__body-title {
  font-size: 1.3rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-color);
  margin: 0;
}
.rules-toc__body-desc {
  font-size: 0.95rem;
  line-height: 1.75;
  color: var(--text-secondary);
  margin: 0 0 18px;
}

.rules-toc__code {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--text-color) 4%, transparent);
}
.rules-toc__code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--text-color) 3%, transparent);
}
.rules-toc__lang {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.rules-toc__code pre {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--text-secondary);
}
.rules-toc__code .ln {
  display: inline-block;
  width: 16px;
  opacity: 0.45;
  user-select: none;
}
.rules-toc__link {
  display: inline-block;
  margin-top: 18px;
  font-size: 13px;
  font-family: var(--font-mono);
  color: var(--primary-color);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--primary-color) 40%, transparent);
  padding-bottom: 2px;
}

@media (max-width: 900px) {
  .rules-toc__grid {
    grid-template-columns: 1fr;
  }
  .rules-toc__nav {
    position: static;
  }
  .rules-toc__body {
    padding: 20px 18px;
  }
}
</style>
