import { marked } from 'marked';

/**
 * Markdown / 链接安全相关工具。
 * 不持有缓存状态，可被 NewsManager 与页面直接调用。
 */

const DEFAULT_ALLOWED_DOMAINS = new Set([
  'luminolcraft-news.pages.dev',
  'raw.githubusercontent.com',
  'github.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'cdn-font.hyperos.mi.com',
]);

export function escapeAttribute(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** 粗粒度 XSS 检测（标题、摘要等纯文本字段用） */
export function containsXSS(text: string): boolean {
  if (typeof text !== 'string') return false;

  const decodedText = text
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2f;/gi, '/')
    .replace(/&amp;/gi, '&');

  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /data\s*:\s*text\/html/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /<style[^>]*>[\s\S]*?<\/style>/gi,
    /expression\s*\(/gi,
    /url\s*\(/gi,
    /@import/gi,
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /document\.write/gi,
    /innerHTML\s*=/gi,
    /outerHTML\s*=/gi,
  ];

  return xssPatterns.some(
    (pattern) => pattern.test(text) || pattern.test(decodedText),
  );
}

export function isValidUrl(
  url: string,
  siteDomain = '',
  allowedDomains: Set<string> = DEFAULT_ALLOWED_DOMAINS,
): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    if (url.startsWith('#') || url.startsWith('/')) return true;

    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') return false;

    // 本站域名始终允许
    if (siteDomain && urlObj.hostname === siteDomain) return true;

    if (!allowedDomains.has(urlObj.hostname)) return false;

    const dangerousPaths = ['../', './', '//', '\\'];
    if (dangerousPaths.some((path) => urlObj.pathname.includes(path))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/** marked link token 文本提取 */
export function parseTokens(tokens: any[]): string {
  if (!Array.isArray(tokens)) return '';

  return tokens
    .map((token) => {
      if (token?.type === 'text' || token?.type === 'codespan') {
        return token.text || '';
      }
      if (token?.tokens) {
        return parseTokens(token.tokens);
      }
      return token?.text || '';
    })
    .join('');
}

/**
 * 配置全局 marked renderer（安全链接 + 外链图标）。
 * 返回是否配置成功。
 */
export function initMarked(siteDomain?: string): boolean {
  if (typeof marked === 'undefined') {
    console.warn('marked 库未加载');
    return false;
  }

  const domain =
    siteDomain ??
    (typeof window !== 'undefined' ? window.location.hostname || '' : '');

  const renderer = new marked.Renderer();

  renderer.link = ({ href, title, tokens }: any) => {
    const text = parseTokens(tokens);
    const isValidHref = typeof href === 'string' && href.trim() !== '';

    if (!isValidHref || !isValidUrl(href, domain)) {
      return text;
    }

    const isExternal =
      !href.startsWith('/') &&
      !href.includes(domain) &&
      !href.startsWith('#');

    const safeTitle =
      title && title !== 'undefined'
        ? ` title="${escapeAttribute(title)}"`
        : '';

    const svgIcon = isExternal
      ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 18px; height: 18px; margin-left: 8px; vertical-align: sub;" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>'
      : '';

    return `<a href="${escapeAttribute(href)}"${safeTitle} class="${
      isExternal ? 'external-link' : ''
    }" ${isExternal ? 'rel="noopener noreferrer"' : ''}>${text}${svgIcon}</a>`;
  };

  marked.setOptions({ renderer });
  return true;
}

/** marked 不可用时的极简降级渲染（先转义再套简单语法） */
export function simpleMarkdownRender(text: string): string {
  if (!text) return '';

  const html = escapeHtml(text)
    .replace(/^### (.*)$/gim, '<h3>$1</h3>')
    .replace(/^## (.*)$/gim, '<h2>$1</h2>')
    .replace(/^# (.*)$/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<p>${html}</p>`;
}

/** 列表摘要：优先 summary，截断后渲染 */
export function renderShortContent(
  item: {
    summary?: string;
    markdownContent?: string;
  },
  maxLen = 100,
): string {
  const shortContent = item.summary || item.markdownContent || '暂无内容';
  const trimmed =
    shortContent.length > maxLen
      ? `${shortContent.substring(0, maxLen)}...`
      : shortContent;

  if (typeof marked !== 'undefined') {
    return marked.parse(trimmed) as string;
  }

  return simpleMarkdownRender(trimmed);
}