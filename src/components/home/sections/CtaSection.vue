<!--
  CtaSection —— 结尾的行动号召

  底部是一条**纯 CSS 地平线光带**（30vh）：淡紫的水平辉光 + 一条柔和的「地平线」亮带，
  顶部用 mask 淡出，不占满屏、不形成独立色块。

  为什么这里没有 WebGL：`GradientWaves` 在 1440×~270 这种极端画幅下，raymarch 出的波面
  会被拉得很宽很扁 —— 无论怎么调 `waveScale / fogDepth / zoom`，看起来都是「一团发光的紫雾」
  而不是「浪」。设计侧的判据是不接受「用一块脏色块换一点动效」，所以这一层用静态 CSS 表达，
  把 WebGL 预算让给 Hero（全站只剩 1 个 context）。

  正文的进入动画由 useHomeAnimations 的 [data-reveal] 统一处理。
-->
<script setup lang="ts">
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import { QQ_GROUP } from '@/config/home-content'
</script>

<template>
  <section class="cta">
    <div class="cta__waves" aria-hidden="true" />

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
