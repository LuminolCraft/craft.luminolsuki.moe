<template>
  <div ref="shellRef" class="auth-shell">
    <!-- 品牌逃生口：游客/误点用户可随时返回首页（不放 aria-hidden 的 aside 内） -->
    <RouterLink to="/" class="art-brand">
      <img src="https://imagehosting-ez2.pages.dev/images/c25a955166388e1257c23d01c78a62e6.webp" alt="" />
      <span class="art-brand-name"><span class="brand-accent">Luminol</span>Craft</span>
    </RouterLink>
    <aside ref="artRef" class="auth-art" aria-hidden="true">
      <div class="art-layer" data-depth="-14">
        <div class="art-blob art-blob-a"></div>
        <div class="art-blob art-blob-b"></div>
        <div class="art-blob art-blob-c"></div>
      </div>
      <svg class="art-orbit" data-depth="-8" viewBox="0 0 800 800" fill="none">
        <circle class="art-orbit-ring" cx="400" cy="400" r="320" />
        <circle class="art-orbit-ring" cx="400" cy="400" r="222" />
        <ellipse class="art-orbit-ring art-orbit-ring-wide" cx="400" cy="400" rx="380" ry="140" />
      </svg>
      <div class="art-particles">
        <span v-for="i in PARTICLE_COUNT" :key="i" class="art-particle"></span>
      </div>
      <div class="art-layer" data-depth="10">
        <span class="art-word art-word-vertical">LUMINOL</span>
        <span class="art-word art-word-diagonal">NEXUS</span>
      </div>
      <span class="art-tagline" data-depth="16">CRAFT · LUMINOLSUKI.MOE</span>
    </aside>

    <main class="auth-main">
      <div class="auth-content">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useGsap } from '@/composables/useGsap'

const PARTICLE_COUNT = 24

const shellRef = ref<HTMLElement | null>(null)
const artRef = ref<HTMLElement | null>(null)
const { create, reduceMotion } = useGsap({ scope: artRef })

let moveHandler: ((event: MouseEvent) => void) | null = null

onMounted(() => {
  create((g) => {
    const particles = g.utils.toArray<HTMLElement>('.art-particle')

    // reduce-motion：静态构图，仅散布粒子
    if (reduceMotion()) {
      particles.forEach((p) => {
        g.set(p, {
          left: g.utils.random(4, 96) + '%',
          top: g.utils.random(4, 96) + '%',
          opacity: g.utils.random(0.15, 0.6),
        })
      })
      return
    }

    // 光斑漂浮（持续环境动效）
    g.to('.art-blob-a', {
      xPercent: 12,
      yPercent: -9,
      scale: 1.16,
      duration: 16,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    })
    g.to('.art-blob-b', {
      xPercent: -10,
      yPercent: 10,
      scale: 0.92,
      duration: 21,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 1.2,
    })
    g.to('.art-blob-c', {
      xPercent: 7,
      yPercent: 12,
      scale: 1.1,
      duration: 26,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 2.4,
    })

    // 轨道环慢速旋转
    g.to('.art-orbit', {
      rotation: 360,
      duration: 90,
      ease: 'none',
      repeat: -1,
      transformOrigin: '50% 50%',
    })

    // 入场
    g.from('.art-orbit', { autoAlpha: 0, scale: 0.94, duration: 1.6, ease: 'power2.out', delay: 0.1 })
    g.from('.art-word-vertical', { autoAlpha: 0, x: -48, duration: 1.1, ease: 'power3.out', delay: 0.2 })
    g.from('.art-word-diagonal', { autoAlpha: 0, y: 64, duration: 1.2, ease: 'power3.out', delay: 0.35 })
    g.from('.art-tagline', { autoAlpha: 0, duration: 0.9, delay: 0.7 })

    // 粒子散布 + 各自漂移闪烁
    particles.forEach((p, i) => {
      g.set(p, { left: g.utils.random(4, 96) + '%', top: g.utils.random(4, 96) + '%' })
      g.to(p, {
        x: () => g.utils.random(-56, 56),
        y: () => g.utils.random(-56, 56),
        opacity: () => g.utils.random(0.12, 0.85),
        scale: () => g.utils.random(0.5, 1.15),
        duration: () => g.utils.random(3.5, 7.5),
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: i * 0.14,
      })
    })

    // 指针视差：分层深度跟随（连续反馈）
    const layers = g.utils.toArray<HTMLElement>('[data-depth]').map((el) => ({
      x: g.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' }),
      y: g.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' }),
      depth: Number(el.dataset.depth ?? 10),
    }))
    moveHandler = (event) => {
      const rect = artRef.value?.getBoundingClientRect()
      if (!rect) return
      const nx = (event.clientX - rect.left) / rect.width - 0.5
      const ny = (event.clientY - rect.top) / rect.height - 0.5
      layers.forEach((layer) => {
        layer.x(nx * layer.depth)
        layer.y(ny * layer.depth)
      })
    }
    shellRef.value?.addEventListener('mousemove', moveHandler)
  })
})

onUnmounted(() => {
  if (moveHandler) shellRef.value?.removeEventListener('mousemove', moveHandler)
  moveHandler = null
})
</script>

<style scoped>
.auth-shell {
  display: grid;
  grid-template-columns: minmax(0, 11fr) minmax(0, 9fr);
  min-height: 100dvh;
  background: var(--background-color);
}

/* ---------- 左屏：抽象艺术面板 ---------- */
.auth-art {
  position: relative;
  overflow: hidden;
  border-right: 1px solid var(--border-color);
  background:
    radial-gradient(120% 90% at 18% 0%, color-mix(in srgb, var(--primary-color) 15%, transparent), transparent 55%),
    radial-gradient(100% 80% at 92% 100%, color-mix(in srgb, var(--accent-color, #f59e0b) 7%, transparent), transparent 60%),
    var(--background-color);
}

.art-layer {
  position: absolute;
  inset: 0;
  will-change: transform;
}

.art-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
  will-change: transform;
}
.art-blob-a {
  width: 46vmax;
  height: 46vmax;
  top: -18%;
  left: -14%;
  background: radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--primary-color) 46%, transparent), transparent 66%);
  opacity: 0.55;
}
.art-blob-b {
  width: 40vmax;
  height: 40vmax;
  bottom: -22%;
  right: -16%;
  background: radial-gradient(circle at 60% 40%, color-mix(in srgb, #818cf8 34%, transparent), transparent 62%);
  opacity: 0.5;
}
.art-blob-c {
  width: 30vmax;
  height: 30vmax;
  top: 34%;
  left: 38%;
  background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent-color, #f59e0b) 22%, transparent), transparent 64%);
  opacity: 0.32;
}

.art-orbit {
  position: absolute;
  inset: -6%;
  width: 112%;
  height: 112%;
  opacity: 0.5;
  will-change: transform;
}
.art-orbit-ring {
  stroke: color-mix(in srgb, var(--primary-color) 38%, transparent);
  stroke-width: 1;
  stroke-dasharray: 3 14;
  stroke-linecap: round;
}
.art-orbit-ring-wide {
  stroke: color-mix(in srgb, var(--text-color) 18%, transparent);
  stroke-dasharray: none;
}

.art-particles {
  position: absolute;
  inset: 0;
}
.art-particle {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--text-color) 60%, transparent);
  opacity: 0;
  will-change: transform, opacity;
}

.art-word {
  position: absolute;
  font-weight: 700;
  line-height: 1;
  user-select: none;
  pointer-events: none;
  will-change: transform;
}
.art-word-vertical {
  left: 5%;
  top: 12%;
  writing-mode: vertical-rl;
  font-size: clamp(2.6rem, 6.5vw, 6rem);
  letter-spacing: 0.32em;
  color: transparent;
  -webkit-text-stroke: 1.5px color-mix(in srgb, var(--text-color) 30%, transparent);
}
.art-word-diagonal {
  /* 保持完整可见：不能贴出面板边缘（overflow: hidden 会把旋转后的字裁掉） */
  right: 4%;
  bottom: 8%;
  font-size: clamp(3.4rem, 8.5vw, 7.5rem);
  letter-spacing: -0.045em;
  transform: rotate(-8deg);
  background: linear-gradient(118deg, var(--primary-color) 8%, #818cf8 48%, var(--accent-color, #f59e0b) 96%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* ---------- 品牌逃生口（返回首页） ---------- */
.art-brand {
  position: absolute;
  top: 1.5rem;
  left: 5%;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-color);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.art-brand img {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  transition: transform 0.3s ease;
}
.art-brand:hover img {
  transform: rotate(10deg) scale(1.05);
}
.art-brand .brand-accent {
  color: #818cf8;
}

.art-tagline {
  position: absolute;
  left: 6%;
  bottom: 5%;
  font-size: 0.72rem;
  letter-spacing: 0.32em;
  color: var(--text-secondary);
}

/* ---------- 右屏：内容区（非卡片、左对齐错落） ---------- */
.auth-main {
  display: flex;
  align-items: stretch;
  min-height: 100dvh;
}
.auth-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  max-width: 34rem;
  padding: clamp(2.5rem, 6vw, 6rem) clamp(1.75rem, 5vw, 5.5rem);
}

@media (max-width: 896px) {
  .auth-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(210px, 32dvh) auto;
  }
  .auth-art {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  .art-word-vertical {
    /* 竖排 7 字在 210~300px 高的移动端面板内必然溢出，改横排短字 */
    writing-mode: horizontal-tb;
    left: 6%;
    top: 32%;
    font-size: clamp(1.6rem, 7vw, 2.4rem);
    letter-spacing: 0.3em;
  }
  .art-brand {
    top: 1.25rem;
    left: 6%;
  }
  .art-word-diagonal {
    font-size: clamp(2.6rem, 12vw, 4.5rem);
  }
  .art-tagline {
    display: none;
  }
  .auth-main {
    /* 重置桌面 min-height:100dvh，避免 32dvh + 100dvh 的强制滚动；
       grid auto 行由 shell 的 min-height:100dvh 拉伸填满剩余视口 */
    min-height: 0;
  }
  .auth-content {
    max-width: none;
    padding: 1.75rem 1.5rem 2.5rem;
  }
}
</style>
