<template>
  <div class="markdown-renderer" ref="markdownContainer">
    <div v-html="renderedMarkdown"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import Chart from 'chart.js/auto';

// Props
const props = defineProps<{
  content: string;
}>();

// Refs
const markdownContainer = ref<HTMLElement | null>(null);
const charts = ref<Chart[]>([]);

// 扩展marked渲染器
const renderMathFormulas = (html: string) => {
  // 处理行内数学公式 $...$
  let processedHtml = html.replace(/\$(.*?)\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula, {
        throwOnError: false,
        displayMode: false
      });
    } catch (err) {
      console.error('行内数学公式渲染失败:', err);
      return match;
    }
  });
  
  // 处理块级数学公式 $$...$$
  processedHtml = processedHtml.replace(/\$\$(.*?)\$\$/gs, (match, formula) => {
    try {
      return `<div class="markdown-math-block">
                ${katex.renderToString(formula, {
                  throwOnError: false,
                  displayMode: true
                })}
              </div>`;
    } catch (err) {
      console.error('块级数学公式渲染失败:', err);
      return match;
    }
  });
  
  return processedHtml;
};

// 代码高亮处理
const highlightCode = (code: string, lang: string) => {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(code, { language: lang }).value;
    } catch (err) {
      console.error('代码高亮失败:', err);
    }
  }
  return code;
};

// 扩展代码块，支持图表渲染
const renderChart = (code: string) => {
  try {
    const chartConfig = JSON.parse(code);
    const chartId = `chart-${Math.random().toString(36).substr(2, 9)}`;
    
    // 异步渲染图表
    setTimeout(() => {
      const canvas = document.getElementById(chartId);
      if (canvas) {
        const ctx = (canvas as HTMLCanvasElement).getContext('2d');
        if (ctx) {
          const chart = new Chart(ctx, chartConfig);
          charts.value.push(chart);
        }
      }
    }, 0);
    
    return `<div class="markdown-chart-container">
              <canvas id="${chartId}" class="markdown-chart"></canvas>
            </div>`;
  } catch (err) {
    console.error('图表渲染失败:', err);
    return `<pre class="markdown-pre"><code class="markdown-code">${code}</code></pre>`;
  }
};

// 自定义marked扩展
const markedExtensions = {
  renderer: {
    heading(text: string, level: number) {
      const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h${level} id="${escapedText}" class="markdown-heading">
                ${text}
                <a href="#${escapedText}" class="heading-link">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="heading-icon">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </a>
              </h${level}>`;
    },
    code(code: string, lang: string) {
      // 处理图表渲染
      if (lang === 'chart') {
        return renderChart(code);
      }
      
      // 处理代码高亮
      const highlightedCode = highlightCode(code, lang);
      return `<pre class="markdown-pre"><code class="hljs language-${lang}">${highlightedCode}</code></pre>`;
    },
    table(header: string, body: string) {
      return `<table class="markdown-table">
                <thead>${header}</thead>
                <tbody>${body}</tbody>
              </table>`;
    },
    tablecell(content: string, flags: any) {
      const type = flags.header ? 'th' : 'td';
      const align = flags.align ? `align="${flags.align}"` : '';
      return `<${type} ${align} class="markdown-cell">${content}</${type}>`;
    },
    blockquote(quote: string) {
      return `<blockquote class="markdown-quote">${quote}</blockquote>`;
    },
    list(body: string, ordered: boolean) {
      const type = ordered ? 'ol' : 'ul';
      return `<${type} class="markdown-list">${body}</${type}>`;
    },
    listitem(text: string) {
      return `<li class="markdown-list-item">${text}</li>`;
    },
    link(href: string, title: string, text: string) {
      const titleAttr = title ? `title="${title}"` : '';
      return `<a href="${href}" ${titleAttr} target="_blank" rel="noopener noreferrer" class="markdown-link">${text}</a>`;
    },
    image(href: string, title: string, text: string) {
      const titleAttr = title ? `title="${title}"` : '';
      return `<figure class="markdown-image-container">
                <img src="${href}" alt="${text}" ${titleAttr} class="markdown-image" loading="lazy" />
                <figcaption class="markdown-image-caption">${text}</figcaption>
              </figure>`;
    }
  }
};

// 配置marked选项
marked.use({
  gfm: true,
  breaks: true
});

// 渲染 Markdown 内容
const renderedMarkdown = computed(() => {
  let html = marked.parse(props.content) as string;
  // 处理数学公式
  html = renderMathFormulas(html);
  return html;
});

// 监听内容变化，重新渲染
watch(() => props.content, () => {
  // 销毁旧图表
  charts.value.forEach(chart => chart.destroy());
  charts.value = [];
});

// 组件挂载后初始化
onMounted(() => {
  // 确保图表正确渲染
  if (markdownContainer.value) {
    const chartContainers = markdownContainer.value.querySelectorAll('.markdown-chart-container');
    chartContainers.forEach(container => {
      const canvas = container.querySelector('canvas');
      if (canvas) {
        const chartId = canvas.id;
        const chartConfig = JSON.parse(canvas.textContent || '{}');
        const ctx = (canvas as HTMLCanvasElement).getContext('2d');
        if (ctx) {
          const chart = new Chart(ctx, chartConfig);
          charts.value.push(chart);
        }
      }
    });
  }
});

// 组件卸载前清理
onUnmounted(() => {
  charts.value.forEach(chart => chart.destroy());
  charts.value = [];
});
</script>

<style scoped>
.markdown-renderer {
  font-family: var(--font-primary);
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: var(--text-color);
}

/* 确保markdown渲染的所有子元素都继承正确样式 */
.markdown-renderer h1,
.markdown-renderer h2,
.markdown-renderer h3,
.markdown-renderer h4,
.markdown-renderer h5,
.markdown-renderer h6,
.markdown-renderer p,
.markdown-renderer li,
.markdown-renderer td,
.markdown-renderer th,
.markdown-renderer blockquote,
.markdown-renderer code {
  font-family: inherit;
  color: inherit;
}

/* 特殊元素的字体覆盖 */
.markdown-renderer h1,
.markdown-renderer h2,
.markdown-renderer h3,
.markdown-renderer h4,
.markdown-renderer h5,
.markdown-renderer h6 {
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

.markdown-renderer code {
  font-family: var(--font-primary);
}

/* 标题样式 */
.markdown-heading {
  font-family: var(--font-primary);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-4);
  color: var(--text-color);
  position: relative;
  padding-right: var(--spacing-6);
}

/* 标题样式 */
.markdown-heading {
  font-weight: var(--font-weight-bold);
  line-height: var(--heading-line-height);
  margin-bottom: var(--spacing-4);
  color: var(--text-color);
  position: relative;
  padding-right: var(--spacing-6);
}

.heading-link {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity var(--transition-fast);
  color: var(--text-secondary);
}

.markdown-heading:hover .heading-link {
  opacity: 1;
}

.heading-icon {
  width: 16px;
  height: 16px;
  vertical-align: middle;
}

/* 段落样式 */
.markdown-paragraph {
  margin-bottom: var(--spacing-4);
  color: var(--text-color);
  font-family: var(--font-primary);
}

/* 列表项样式 */
.markdown-list-item {
  color: var(--text-color);
  font-family: var(--font-primary);
}

/* 表格单元格样式 */
.markdown-cell {
  color: var(--text-color);
  font-family: var(--font-primary);
}

/* 代码块样式 */
.markdown-pre {
  background-color: var(--code-background-color);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  margin-bottom: var(--spacing-4);
}

.markdown-code {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  color: var(--text-color);
}

/* 表格样式 */
.markdown-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: var(--spacing-6);
  border: 1px solid var(--table-border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.markdown-table th,
.markdown-table td {
  padding: var(--table-cell-padding);
  border-bottom: 1px solid var(--table-border-color);
  text-align: left;
}

.markdown-table th {
  background-color: rgba(156, 163, 175, 0.05);
  font-weight: var(--font-weight-semibold);
}

.markdown-table tr:hover {
  background-color: var(--table-row-hover-background-color);
}

/* 引用样式 */
.markdown-quote {
  border-left: 4px solid var(--quote-border-color);
  background-color: var(--quote-background-color);
  padding: var(--quote-padding);
  margin: var(--quote-margin);
  font-style: var(--quote-font-style);
  color: var(--text-secondary);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

/* 列表样式 */
.markdown-list {
  margin-bottom: var(--list-margin-bottom);
  padding-left: var(--list-padding-left);
}

.markdown-list-item {
  margin-bottom: var(--list-item-margin-bottom);
  color: var(--text-color);
}

/* 链接样式 */
.markdown-link {
  color: var(--link-color);
  text-decoration: none;
  transition: var(--link-transition);
}

.markdown-link:hover {
  color: var(--link-hover-color);
  text-decoration: underline;
}

/* 图片样式 */
.markdown-image-container {
  margin: var(--spacing-6) 0;
  text-align: center;
}

.markdown-image {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.markdown-image-caption {
  margin-top: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-style: italic;
}

/* 数学公式样式 */
.markdown-math-block {
  margin: var(--spacing-6) 0;
  text-align: center;
  overflow-x: auto;
}

/* 图表样式 */
.markdown-chart-container {
  margin: var(--spacing-6) 0;
  background-color: var(--code-background-color);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
}

.markdown-chart {
  max-width: 100%;
  height: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .markdown-pre {
    padding: var(--spacing-3);
  }
  
  .markdown-table {
    display: block;
    overflow-x: auto;
  }
  
  .markdown-quote {
    padding: var(--spacing-3);
  }
  
  .markdown-list {
    padding-left: var(--spacing-4);
  }
}
</style>