<!--
  行内 token 渲染。
  全部走文本插值，不产生 HTML 字符串——这是 AI 输出防 XSS 的全部依据。
-->
<template>
  <template v-for="(token, index) in tokens" :key="index">
    <strong v-if="token.type === 'strong'">{{ token.value }}</strong>
    <code v-else-if="token.type === 'code'" class="ai-inline-code">{{ token.value }}</code>
    <a
      v-else-if="token.type === 'link'"
      :href="token.href"
      class="ai-link"
      target="_blank"
      rel="noopener noreferrer nofollow"
      >{{ token.value }}</a
    >
    <template v-else>{{ token.value }}</template>
  </template>
</template>

<script setup lang="ts">
import type { InlineToken } from '@/lib/ai-markdown'

defineProps<{ tokens: InlineToken[] }>()
</script>

<style scoped>
.ai-inline-code {
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--border-color, rgba(128, 128, 128, 0.18));
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92em;
}

.ai-link {
  color: var(--link-color, var(--primary-color));
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}
</style>
