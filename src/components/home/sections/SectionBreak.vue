<!--
  SectionBreak —— 段落之间的分隔（眉批式）

  为什么不用居中大标语：居中 + 大留白 + PART 标签会让页面像 PPT 分页符，
  读者的眼睛要在空白里找东西。这里换成杂志的做法 —— 一条极淡的虚线，
  左侧一句小字（13px，和正文同一套字体），右侧一个窄图形暗示下一段讲什么。

  高度只有 90px 左右，不打断阅读节奏，也不占一整屏。

  motif：
    'scale'   竖线刻度（计数感，接「处理记录」）
    'dots'    点阵（密度变化，接「人数比例」）
    'contour' 三层闭合曲线（接「地形」）
    'wave'    两条波线（接「时间」）
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    text: string
    motif?: 'scale' | 'dots' | 'contour' | 'wave'
  }>(),
  { motif: 'dots' },
)
</script>

<template>
  <div class="sb">
    <div class="sb__row">
      <p class="sb__text">{{ text }}</p>

      <svg class="sb__motif" viewBox="0 0 180 36" aria-hidden="true">
        <template v-if="motif === 'scale'">
          <g v-for="i in 12" :key="i">
            <line
              :x1="4 + (i - 1) * 15"
              y1="18"
              :x2="4 + (i - 1) * 15"
              :y2="i % 3 === 0 ? 8 : 13"
              class="sb__tick"
            />
          </g>
          <line x1="4" y1="24" x2="170" y2="24" class="sb__base" />
        </template>

        <template v-else-if="motif === 'dots'">
          <circle v-for="i in 9" :key="i" :cx="6 + (i - 1) * 20" cy="18" :r="3.6 - i * 0.28" class="sb__dot" />
        </template>

        <template v-else-if="motif === 'contour'">
          <ellipse cx="90" cy="18" rx="78" ry="13" class="sb__curve" />
          <ellipse cx="90" cy="18" rx="52" ry="8.5" class="sb__curve sb__curve--dim" />
          <ellipse cx="90" cy="18" rx="26" ry="4.5" class="sb__curve sb__curve--dim" />
        </template>

        <template v-else>
          <path d="M 4 22 Q 30 10 56 20 T 108 20 T 160 18" class="sb__curve" />
          <path d="M 4 28 Q 30 18 56 26 T 108 26 T 160 25" class="sb__curve sb__curve--dim" />
        </template>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.sb {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
}
.sb__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding: 26px 0;
  border-top: 1px dashed color-mix(in srgb, var(--text-color) 14%, transparent);
}

.sb__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
  max-width: 58ch;
}
.sb__text::before {
  content: '—';
  margin-right: 10px;
  color: color-mix(in srgb, var(--primary-color) 70%, transparent);
}

.sb__motif {
  flex: 0 0 auto;
  width: 180px;
  height: 36px;
  overflow: visible;
}

.sb__tick,
.sb__base {
  stroke: color-mix(in srgb, var(--primary-color) 45%, transparent);
  stroke-width: 1;
  stroke-linecap: round;
}
.sb__base {
  stroke: color-mix(in srgb, var(--text-color) 16%, transparent);
}

.sb__dot {
  fill: color-mix(in srgb, var(--primary-color) 55%, transparent);
}

.sb__curve {
  fill: none;
  stroke: color-mix(in srgb, var(--primary-color) 50%, transparent);
  stroke-width: 1;
}
.sb__curve--dim {
  opacity: 0.45;
}

@media (max-width: 900px) {
  .sb {
    padding: 0 20px;
  }
  .sb__motif {
    display: none;
  }
  .sb__row {
    padding: 20px 0;
  }
}
</style>
