import { type Ref } from 'vue';
import { useGsap } from '@/composables/useGsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASINGS } from '@/gsap';

/**
 * 新闻详情页入场动画。
 *
 * 历史：标题曾用 SplitText 拆字 + `from: 'center'` 逐字弹入（每字 1s），
 * 正文逐段落 stagger 浮现——用户实测「阅读兴趣掉一大半」，整体推翻：
 * 详情页是**阅读场景**，动画只做一次轻快的整块入场，正文内容不做入场
 * （读到哪里哪里才浮现是阅读杀手）。图片画廊保留批量入场，时长收紧。
 */
export function useArticleAnimations(containerRef: Ref<HTMLElement | null>) {
  const { create, reduceMotion } = useGsap({ scope: containerRef });

  const initAnimations = () => {
    create((gsap) => {
      const container = containerRef.value;
      if (!container) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(
          '#news-detail .article-title, .article-meta, .article-cover, .gallery-item',
          { autoAlpha: 1, y: 0, scale: 1 },
        );
      });
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // 标题整块一次到位：不拆字、不加 stagger
        gsap.from('#news-detail .article-title', {
          autoAlpha: 0,
          y: 14,
          duration: 0.35,
          ease: EASINGS.entrance,
          scrollTrigger: {
            trigger: '#news-detail .article-title',
            start: 'top 90%',
            once: true,
          },
        });
        gsap.from('.article-meta, .article-cover', {
          autoAlpha: 0,
          y: 12,
          stagger: 0.05,
          duration: 0.35,
          ease: EASINGS.entrance,
          scrollTrigger: {
            trigger: '#news-detail',
            start: 'top 88%',
            once: true,
          },
        });
        ScrollTrigger.batch('.gallery-item', {
          start: 'top 88%',
          batchMax: 6,
          onEnter: (batch) =>
            gsap.from(batch, {
              autoAlpha: 0,
              y: 24,
              stagger: 0.05,
              duration: 0.35,
              ease: EASINGS.entrance,
              overwrite: true,
            }),
          onLeaveBack: (batch) => gsap.set(batch, { autoAlpha: 1, y: 0, scale: 1 }),
        });
      });
    });
  };

  return { initAnimations };
}
