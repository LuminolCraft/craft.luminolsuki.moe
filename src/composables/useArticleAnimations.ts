import { type Ref } from 'vue';
import { useGsap } from '@/composables/useGsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { EASINGS, DURATIONS, STAGGERS } from '@/gsap';

export function useArticleAnimations(containerRef: Ref<HTMLElement | null>) {
  const { create, reduceMotion } = useGsap({ scope: containerRef });

  const initAnimations = () => {
    create((gsap) => {
      const container = containerRef.value;
      if (!container) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(
          '#news-detail .article-title, .article-meta, .article-cover, #news-detail .article-content > *, .gallery-item',
          { autoAlpha: 1, y: 0, yPercent: 0, rotateZ: 0, scale: 1 },
        );
      });
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const titleSplit = new SplitText('#news-detail .article-title', {
          type: 'chars,words',
        });
        gsap.from(titleSplit.chars, {
          yPercent: 120,
          autoAlpha: 0,
          rotateZ: 6,
          stagger: STAGGERS.parallaxChars,
          duration: DURATIONS.slow,
          ease: EASINGS.heroReveal,
          scrollTrigger: {
            trigger: '#news-detail .article-title',
            start: 'top 85%',
            once: true,
          },
        });
        gsap.from('.article-meta, .article-cover', {
          autoAlpha: 0,
          y: 20,
          stagger: 0.1,
          duration: DURATIONS.entrance,
          ease: EASINGS.entrance,
          scrollTrigger: {
            trigger: '#news-detail',
            start: 'top 75%',
            once: true,
          },
        });
        gsap.from('#news-detail .article-content > *', {
          autoAlpha: 0,
          y: 30,
          stagger: STAGGERS.list,
          duration: DURATIONS.entrance,
          ease: EASINGS.entrance,
          scrollTrigger: {
            trigger: '.article-content',
            start: 'top 80%',
            once: true,
          },
        });
        ScrollTrigger.batch('.gallery-item', {
          start: 'top 85%',
          batchMax: 6,
          onEnter: (batch) =>
            gsap.from(batch, {
              autoAlpha: 0,
              y: 40,
              scale: 0.9,
              stagger: 0.08,
              duration: DURATIONS.entrance,
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