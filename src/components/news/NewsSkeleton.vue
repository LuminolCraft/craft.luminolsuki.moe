<template>
    <div v-for="n in count" :key="'skeleton-' + n" class="skeleton-card">
      <div class="skeleton-block skeleton-title"><div class="skeleton-shimmer"></div></div>
      <div class="skeleton-meta">
        <div class="skeleton-block skeleton-date"><div class="skeleton-shimmer"></div></div>
        <div class="skeleton-block skeleton-tag"><div class="skeleton-shimmer"></div></div>
      </div>
      <div class="skeleton-block skeleton-img"><div class="skeleton-shimmer"></div></div>
      <div class="skeleton-content">
        <div class="skeleton-block skeleton-line"><div class="skeleton-shimmer"></div></div>
        <div class="skeleton-block skeleton-line"><div class="skeleton-shimmer"></div></div>
        <div class="skeleton-block skeleton-line"><div class="skeleton-shimmer"></div></div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  defineProps<{ count: number }>();
  </script>
  
  <style scoped>
  /* ============================================================
     NewsSkeleton 骨架加载样式
     ============================================================ */
  
  .skeleton-card {
    background: var(--card-bg);
    border-radius: var(--vercel-radius-comfortable);
    box-shadow: var(--vercel-shadow-card);
    position: relative;
    overflow: hidden;
  }
  
  .skeleton-block {
    background: var(--skeleton-block-bg);
    border-radius: var(--vercel-radius-subtle);
    position: relative;
    overflow: hidden;
  }
  
  .skeleton-title {
    height: 24px;
    width: 70%;
    margin: 20px 20px 12px;
  }
  
  .skeleton-meta {
    display: flex;
    gap: 12px;
    padding: 0 20px 16px;
  }
  
  .skeleton-date {
    height: 14px;
    width: 80px;
  }
  
  .skeleton-tag {
    height: 18px;
    width: 50px;
    border-radius: 9999px;
  }
  
  .skeleton-img {
    width: 100%;
    height: 180px;
    margin-top: 12px;
    border-radius: 0;
  }
  
  .skeleton-content {
    padding: 16px 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .skeleton-line {
    height: 12px;
  }
  
  .skeleton-line:nth-child(1) {
    width: 100%;
  }
  
  .skeleton-line:nth-child(2) {
    width: 90%;
  }
  
  .skeleton-line:nth-child(3) {
    width: 60%;
  }
  
  .skeleton-shimmer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, var(--skeleton-shimmer-color), transparent);
    transform: translateX(-100%);
    will-change: transform;
  }
  </style>