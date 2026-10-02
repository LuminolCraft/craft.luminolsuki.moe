<!--
  CompareSection —— 双服务器对比

  纯静态内容：图片的缩放入场由 useHomeAnimations 的 [data-compare-img] 统一处理。
-->
<script setup lang="ts">
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import { shotAt } from '@/config/home-content'
</script>

<template>
  <section class="compare">
    <div class="wrap">
      <div class="compare__grid">
        <MagneticCornerFrame class="compare__col">
          <div class="compare__figure compare__figure--wide">
            <img
              data-compare-img
              :src="shotAt(8)"
              alt="纯净生存服务器画面"
              width="1600"
              height="1000"
              loading="lazy"
            />
          </div>
          <p class="eyebrow compare__eyebrow">纯净模式</p>
          <h3 class="h3">纯净生存</h3>
          <p class="body">
            保持原版手感与红石机制，只补齐必要的便利指令。没有地皮、没有圈地、没有花哨加成，
            你造出来的每一块砖都属于你自己。
          </p>
          <div class="hairline" aria-hidden="true" />
          <ul class="tags">
            <li class="tag">原版特性</li>
            <li class="tag">下界末地保护</li>
            <li class="tag">无圈地插件</li>
          </ul>
        </MagneticCornerFrame>

        <MagneticCornerFrame class="compare__col">
          <div class="compare__figure compare__figure--tall">
            <img
              data-compare-img
              :src="shotAt(13)"
              alt="综合生存服务器画面"
              width="1600"
              height="1120"
              loading="lazy"
            />
          </div>
          <p class="eyebrow compare__eyebrow">综合模式</p>
          <h3 class="h3">综合生存</h3>
          <p class="body">
            在生存的基础上加入 RPG 副本、技能树与粘液科技，用领地系统保护你的建造，
            死亡不掉落，适合长线养成与团队协作。
          </p>
          <div class="hairline" aria-hidden="true" />
          <ul class="tags">
            <li class="tag">RPG 副本</li>
            <li class="tag">粘液科技</li>
            <li class="tag">领地保护</li>
          </ul>
        </MagneticCornerFrame>
      </div>
    </div>
  </section>
</template>
