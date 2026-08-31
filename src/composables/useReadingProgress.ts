import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGsap } from './useGsap';

export function useReadingProgress(
  articleRef: Ref<HTMLElement | null>,
  progressBarRef: Ref<HTMLElement | null>,
  options?: { useScrollTrigger?: boolean }
) {
  let cleanup: (() => void) | null = null;

  const initScrollTrigger = () => {
    const { create } = useGsap({ scope: articleRef });
    create((gsap) => {
      const bar = progressBarRef.value;
      const article = articleRef.value;
      if (!bar || !article) return;
      gsap.set(bar, { transformOrigin: 'left center', scaleX: 0 });
      ScrollTrigger.create({
        trigger: article,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        scroller: document.documentElement,
        onUpdate: (self) => {
          gsap.to(bar, { scaleX: self.progress, duration: 0.1, overwrite: true });
        },
      });
    });
    cleanup = () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  };

  const initEventBased = () => {
    const updateProgress = () => {
      const article = articleRef.value;
      const bar = progressBarRef.value;
      if (!article || !bar) return;
      const rect = article.getBoundingClientRect();
      const totalHeight = article.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const maxScroll = Math.max(1, totalHeight - windowHeight);
      const progress = Math.min(1, scrolled / maxScroll);
      bar.style.transform = `scaleX(${progress})`;
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateProgress();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    cleanup = () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateProgress);
    };
  };

  onMounted(() => {
    if (options?.useScrollTrigger !== false) {
      initScrollTrigger();
    } else {
      initEventBased();
    }
  });

  onUnmounted(() => {
    cleanup?.();
  });
}