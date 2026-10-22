<!--
  AI 消息内容渲染。
  与 MarkdownRenderer 的区别：那个给新闻正文用（v-html，内容来自自己的后台）；
  这个给 AI 输出用，全程文本插值，没有 v-html，注入 <script> 只会显示成文字。
-->
<template>
  <div class="ai-content">
    <template v-for="(block, index) in blocks" :key="index">
      <pre v-if="block.type === 'code'" class="ai-code"><code>{{ block.code }}</code></pre>
      <p v-else-if="block.type === 'heading'" class="ai-heading" :data-level="block.level">
        <AiInlineTokens :tokens="block.tokens" />
      </p>
      <ol v-else-if="block.type === 'list' && block.ordered" class="ai-list">
        <li v-for="(item, i) in block.items" :key="i"><AiInlineTokens :tokens="item" /></li>
      </ol>
      <ul v-else-if="block.type === 'list'" class="ai-list">
        <li v-for="(item, i) in block.items" :key="i"><AiInlineTokens :tokens="item" /></li>
      </ul>
      <p v-else class="ai-para"><AiInlineTokens :tokens="block.tokens" /></p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { parseAiMarkdown } from '@/lib/ai-markdown'
import AiInlineTokens from './AiInlineTokens.vue'

const props = defineProps<{ content: string }>()

// 流式场景每帧都会重算；输入是几十到几百字，解析成本可忽略，
// 比维护增量状态机简单得多，也不会出现「半帧渲染错位」
const blocks = computed(() => parseAiMarkdown(props.content))
</script>

<style scoped>
.ai-content {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  font-size: 0.9375rem;
  line-height: 1.65;
  color: var(--text-color);
  word-break: break-word;
}

.ai-para {
  margin: 0;
}

/* 不带 h1~h6 标签：弹窗/页面里出现大标题会撑破布局，
   视觉层级靠 data-level 调字号即可，语义上这里也不该是文档标题 */
.ai-heading {
  margin: 0.25em 0 0;
  font-weight: var(--font-weight-bold, 600);
  font-size: 1rem;
  line-height: 1.4;
}

.ai-heading[data-level='1'],
.ai-heading[data-level='2'] {
  font-size: 1.0625rem;
}

.ai-list {
  margin: 0;
  padding-left: 1.25em;
  display: flex;
  flex-direction: column;
  gap: 0.2em;
}

.ai-code {
  margin: 0;
  padding: 0.75em 0.85em;
  border-radius: 8px;
  background: var(--border-color, rgba(128, 128, 128, 0.14));
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
  line-height: 1.55;
  white-space: pre-wrap;
}
</style>
