<!--
  CompareSection —— 双服务器对比

  两栏都是 Vue Bits「BorderGlow」卡片：默认两栏**完全中性同规格**，
  光只在 hover / focus-within 时出现（并列结构里常驻色彩差会被读成「右栏推荐」）。
  图片的缩放入场仍由 useHomeAnimations 的 [data-compare-img] 统一处理。
-->
<script setup lang="ts">
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import BorderGlow from '@/components/bits/BorderGlow.vue'
import AccordionGallery from '@/components/bits/AccordionGallery.vue'
import ImageSkeleton from '@/components/common/ImageSkeleton.vue'
import { useBitsTokens } from '@/bits/bits-tokens'
import { shotAt } from '@/config/home-content'

const tokens = useBitsTokens()

/**
 * 综合生存的四大维度：手风琴画廊放在 compare 区块底部全宽展示。
 * 图片在 public/images/worlds/（已随构建就位）。
 */
const WORLD_ITEMS = [
  {
    image: shotAt(2),
    label: '资源世界',
    description: '主世界的冒险之旅，随机传送到安全位置。适合资源收集，定期重置。',
    alt: '资源世界：主世界的冒险之旅，适合资源收集，定期重置',
  },
  {
    image: shotAt(6),
    label: '地狱领域',
    description: '危险的下界世界，寻找稀有材料与战利品。中等难度区域，死亡掉落，请谨慎进入。',
    alt: '地狱领域：危险的下界世界，寻找稀有材料与战利品',
  },
  {
    image: shotAt(10),
    label: '末地维度',
    description: '神秘的末地领域，挑战末影龙与探索浮空岛。高难度挑战区域，死亡掉落，请谨慎进入。',
    alt: '末地维度：挑战末影龙与探索浮空岛',
  },
  {
    image: shotAt(14),
    label: '桃园',
    description: '和平的建造天堂，安家立业、自由创造和展示作品。永远不会重置，但需在菜单购买居住权。',
    alt: '桃园：和平的建造天堂，全家置业、自由创造',
  }
]

/**
 * 四大维度的文字介绍（重点内容，图片只是氛围占位，用户后续自行替换）。
 * access: 'tp' = 游戏内可点击传送；'indirect' = 无法直接前往。
 */
const WORLD_NOTES = [
  {
    name: '资源世界',
    desc: '主世界的冒险之旅，随机传送到安全位置。适合资源收集，定期重置。',
    level: '所有人',
    access: 'tp' as const,
  },
  {
    name: '地狱领域',
    desc: '危险的下界世界，寻找稀有材料与战利品。中等难度区域，该世界死亡掉落，请谨慎进入。',
    level: '中等难度',
    access: 'indirect' as const,
  },
  {
    name: '末地维度',
    desc: '神秘的末地领域，挑战末影龙与探索浮空岛。高难度挑战区域，该世界死亡掉落，请谨慎进入。',
    level: '高难度',
    access: 'indirect' as const,
  },
  {
    name: '桃园',
    desc: '和平的建造天堂，安家立业、自由创造和展示作品。建家的地方，永远不会重置；但禁止挖矿和采集资源，需在菜单购买居住权。',
    level: '所有人',
    access: 'tp' as const,
  },
]

/**
 * `glowColor` 是 **HSL 三元组**（`"H S L"`），不是 hex —— 传 hex 会 fallback 成 `40 80 80`（黄绿）。
 * - 左栏：中性灰 `0 0 55`（两套主题都用 55；70 在 #010102 上接近白光，会被读成「激活」）
 * - 右栏：项目紫 `255 92 76`（= #a78bfa 的 HSL）/ 深色 `260 60 65`（= #9370db）
 * 两栏靠**强度**区分（0.45 vs 0.80），不引入第三种色相。
 *
 * 光只出现在「边框沿线 + 外侧一圈」：`fillOpacity 0.02`（卡片内部几乎不填色，
 * 否则整块淡紫会读成「这张卡被选中了」）、`glowRadius 24`（收窄外发光）。
 * `edgeSensitivity 0` 让 hover 整卡即亮 —— 上游要求指针贴近边缘才亮，
 * 但用户把鼠标停在卡片中央是常见行为，那时不亮会以为没效果。
 */
const LEFT_GLOW = '0 0 55'
const RIGHT_GLOW = tokens.isDark ? '260 60 65' : '255 92 76'
</script>

<template>
  <section class="compare">
    <div class="wrap">
      <div class="compare__grid">
        <MagneticCornerFrame class="compare__col">
          <BorderGlow
            class="compare__card"
            :glow-color="LEFT_GLOW"
            :glow-intensity="0.45"
            :glow-radius="24"
            :fill-opacity="0.02"
            :edge-sensitivity="0"
            background-color="var(--card-bg)"
            :border-radius="16"
          >
            <div class="compare__figure compare__figure--wide">
              <ImageSkeleton
                data-compare-img
                class="compare__img"
                :src="shotAt(8)"
                alt="纯净生存服务器画面"
              />
            </div>
            <p class="eyebrow compare__eyebrow">纯净模式</p>
            <h3 class="h3">纯净生存</h3>
            <p class="body">
              保持原版手感与红石机制，只补齐必要的便利指令。没有地皮、没有圈地、没有花哨加成，
              你造出来的每一块砖都属于你自己。
            </p>
            <div class="hairline" aria-hidden="true" />
            <ul class="tags">
              <li class="tag">原版特性</li>
              <li class="tag">下界末地保护</li>
              <li class="tag">无圈地插件</li>
            </ul>
          </BorderGlow>
        </MagneticCornerFrame>

        <MagneticCornerFrame class="compare__col">
          <BorderGlow
            class="compare__card"
            :glow-color="RIGHT_GLOW"
            :glow-intensity="0.8"
            :glow-radius="24"
            :fill-opacity="0.02"
            :edge-sensitivity="0"
            background-color="var(--card-bg)"
            :border-radius="16"
          >
            <div class="compare__figure compare__figure--tall">
              <ImageSkeleton
                data-compare-img
                class="compare__img"
                :src="shotAt(13)"
                alt="综合生存服务器画面"
              />
            </div>
            <p class="eyebrow compare__eyebrow">综合模式</p>
            <h3 class="h3">综合生存</h3>
            <p class="body">
              在生存的基础上加入 RPG 副本、技能树与粘液科技，用领地系统保护你的建造，
              死亡不掉落，适合长线养成与团队协作。
            </p>
            <div class="hairline" aria-hidden="true" />
            <ul class="tags">
              <li class="tag">RPG 副本</li>
              <li class="tag">粘液科技</li>
              <li class="tag">领地保护</li>
            </ul>
          </BorderGlow>
        </MagneticCornerFrame>
      </div>

      <!-- 综合生存四大维度：hover 展开的手风琴画廊 -->
      <div class="compare__worlds">
        <p class="eyebrow compare__worlds-eyebrow">综合生存 · 四大维度</p>
        <AccordionGallery
          :items="WORLD_ITEMS"
          trigger="hover"
          show-labels
          :height="320"
          :radius="12"
          :gap="8"
          :default-index="0"
          accent-color="var(--primary-color)"
          text-color="#ffffff"
          overlay-color="#060010"
          aria-label="综合生存服务器四大维度预览"
        />

        <!-- 文字介绍是这部分的重点：图片只是占位氛围 -->
         
        <!-- <div class="compare__worlds-notes">
          <div v-for="note in WORLD_NOTES" :key="note.name" class="compare__worlds-note">
            <h4 class="compare__worlds-name">{{ note.name }}</h4>
            <p class="compare__worlds-desc">{{ note.desc }}</p>
            <p class="compare__worlds-meta">
              <span class="compare__worlds-level">推荐等级：{{ note.level }}</span>
              <span
                class="compare__worlds-access"
                :class="note.access === 'tp' ? 'is-tp' : 'is-indirect'"
              >
                {{ note.access === 'tp' ? '» 点击传送 «' : '» 无法直接前往 «' }}
              </span>
            </p>
          </div>
        </div> -->
      </div>
    </div>
  </section>
</template>

<style scoped>
.compare__worlds {
  margin-top: 48px;
}

.compare__worlds-notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.compare__worlds-note {
  padding: 20px 22px;
  border-radius: 12px;
  background: var(--surface-2, var(--card-bg));
  box-shadow: var(--shadow-border, rgba(0, 0, 0, 0.08) 0 0 0 1px);
}

.compare__worlds-name {
  margin: 0 0 8px;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--text-color);
}

.compare__worlds-desc {
  margin: 0 0 12px;
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--text-secondary);
}

.compare__worlds-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  font-size: 0.8125rem;
}

.compare__worlds-level {
  color: var(--text-secondary);
}

.compare__worlds-access {
  font-weight: 500;
}

.compare__worlds-access.is-tp {
  color: var(--primary-color);
}

.compare__worlds-access.is-indirect {
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .compare__worlds-notes {
    grid-template-columns: 1fr;
  }
}

.compare__worlds-eyebrow {
  margin: 0 0 16px;
}
</style>
