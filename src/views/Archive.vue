<template>
    <div ref="archiveRef" class="archive-page">
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGsap } from '@/composables/useGsap'
import { EASINGS, DURATIONS, STAGGERS } from '@/gsap'

const archiveRef = ref<HTMLElement | null>(null)
const { create } = useGsap({ scope: archiveRef })

onMounted(() => {
  create((g) => {
    const mm = g.matchMedia()
    mm.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        if (context.conditions?.reduceMotion) {
          g.set('.archive-item', { autoAlpha: 1, y: 0 })
          return
        }

        ScrollTrigger.batch('.archive-item', {
          start: 'top 85%',
          batchMax: 8,
          onEnter: (batch) =>
            g.from(batch, {
              autoAlpha: 0,
              y: 30,
              stagger: STAGGERS.list,
              duration: DURATIONS.entrance,
              ease: EASINGS.entrance,
              overwrite: true,
            }),
          onLeaveBack: (batch) => g.set(batch, { autoAlpha: 1, y: 0 }),
        })
      },
    )
  })
})
</script>

<style scoped>
.archive-page {
    padding: var(--space-20) 0;
}

.archive-item {
    will-change: transform, opacity;
}
</style>
