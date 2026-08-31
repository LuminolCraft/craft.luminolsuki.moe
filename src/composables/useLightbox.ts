import { ref, computed, nextTick, onMounted, onUnmounted, type Ref } from 'vue';
import { Flip } from 'gsap/Flip';
import { useGsap } from '@/composables/useGsap';
import { DURATIONS, EASINGS } from '@/gsap';

export function useLightbox(images: Ref<string[]>) {
  const visible = ref(false);
  const currentIndex = ref(0);
  const currentImage = computed(() => images.value[currentIndex.value] || '');
  const flipState = ref<ReturnType<typeof Flip.getState> | null>(null);
  const lightboxImageRef = ref<HTMLImageElement | null>(null);
  const FLIP_ID = 'news-lightbox-img';
  const { reduceMotion } = useGsap();

  const hasPrevious = computed(() => currentIndex.value > 0);
  const hasNext = computed(() => currentIndex.value < images.value.length - 1);

  const open = async (index: number, event: MouseEvent) => {
    // 🔒 防御：无图或已打开则忽略
    if (!images.value.length || visible.value) return;
    if (index < 0 || index >= images.value.length) return;

    currentIndex.value = index;
    const target = event.currentTarget as HTMLElement | null;
    const thumbImg = target?.querySelector('img') as HTMLImageElement | null;

    if (thumbImg) {
      thumbImg.setAttribute('data-flip-id', FLIP_ID);
      flipState.value = Flip.getState(thumbImg);
      thumbImg.removeAttribute('data-flip-id');
    }

    visible.value = true;
    document.body.style.overflow = 'hidden';

    if (flipState.value && lightboxImageRef.value) {
      await nextTick();
      Flip.from(flipState.value, {
        duration: DURATIONS.slow,
        ease: EASINGS.smooth,
        absolute: true,
        targets: lightboxImageRef.value,
      });
    }
  };

  const close = () => {
    // 1. 立即关闭，停止交互
    visible.value = false;
    document.body.style.overflow = '';

    // 2. 如果有 flip 状态且未减少动画，执行反向动画
    if (lightboxImageRef.value && flipState.value && !reduceMotion()) {
      const closingState = Flip.getState(lightboxImageRef.value);
      const thumbs = document.querySelectorAll<HTMLImageElement>('.gallery-item img');
      const thumbImg = thumbs[currentIndex.value] ?? null;
      if (thumbImg) {
        thumbImg.setAttribute('data-flip-id', FLIP_ID);
        nextTick(() => {
          Flip.from(closingState, {
            targets: thumbImg,
            duration: DURATIONS.slow,
            ease: EASINGS.smooth,
            absoluteOnLeave: true,
            onComplete: () => {
              thumbImg.removeAttribute('data-flip-id');
              flipState.value = null;
            },
          });
        });
      } else {
        flipState.value = null;
      }
    } else {
      flipState.value = null;
    }
  };

  const prev = () => {
    if (hasPrevious.value) currentIndex.value--;
  };

  const next = () => {
    if (hasNext.value) currentIndex.value++;
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (!visible.value) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && hasPrevious.value) prev();
    else if (e.key === 'ArrowRight' && hasNext.value) next();
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
    document.body.style.overflow = '';
    flipState.value = null;
  });

  return {
    visible,
    currentIndex,
    currentImage,
    lightboxImageRef,   // 直接暴露给模板绑定
    hasPrevious,
    hasNext,
    open,
    close,
    prev,
    next,
  };
}