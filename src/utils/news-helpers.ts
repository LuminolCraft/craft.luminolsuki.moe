import type { NewsItem } from '@/types/news';

/**
 * 格式化日期
 */
export function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale);
}

/**
 * 清理图片 URL 中的引号
 */
export function cleanImageUrl(url: string | undefined): string {
  return url ? url.replace(/['"]/g, '') : '';
}

/**
 * 判断新闻是否有有效的封面图
 */
export function hasImage(item: NewsItem): boolean {
  const url = item.image?.trim();
  if (!url || url === '""') return false;
  return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url);
}

/**
 * 通用图片加载错误处理器
 */
export function handleImageError(event: Event, fallbackUrl?: string): void {
  const img = event.target as HTMLImageElement;
  img.src = fallbackUrl || 'https://via.placeholder.com/200x150/9e94d8/ffffff?text=图片不可用';
}