<!--
  CtaSection —— 结尾的行动号召

  纯静态内容；进入动画由 useHomeAnimations 的 [data-reveal] 统一处理。
-->
<script setup lang="ts">
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import { QQ_GROUP } from '@/config/home-content'
</script>

<template>
  <section class="cta">
    <div class="wrap">
      <div data-reveal>
        <MagneticCornerFrame>
          <div class="cta__panel">
            <div class="cta__text">
              <h2 class="h2">现在就能进来</h2>
              <p class="lead">Java 版，无需正版账号。进群拿到地址，我们在世界里见。</p>
            </div>
            <MagneticCornerFrame class="mcf-inline" :padding="6" :arm-length="14">
              <a class="btn btn--primary" :href="QQ_GROUP" target="_blank" rel="noopener">
                加入交流群
              </a>
            </MagneticCornerFrame>
          </div>
        </MagneticCornerFrame>
      </div>
    </div>
  </section>
</template>
