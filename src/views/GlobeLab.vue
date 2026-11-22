<!--
  GlobeLab —— Three.js 世界球的三版示例（临时对照页，不进导航）

  三个方案共用 components/home/globe/globe-scene.ts 的场景层，差别在「怎么画这颗球」：
  A 昼夜地形球（低模 + 城市灯火 + 大气）
  B 扫描建造球（SVG 现画等高线贴图 + HTML-in-Canvas 文案）
  C 星尘球（粒子 + 指针涟漪）
  选定之后再把它接进首页，这个页面随之删除。
-->
<script setup lang="ts">
import GlobeTerrain from '@/components/home/globe/GlobeTerrain.vue'
import GlobeScan from '@/components/home/globe/GlobeScan.vue'
import GlobeDust from '@/components/home/globe/GlobeDust.vue'
</script>

<template>
  <main class="lab">
    <header class="lab__head">
      <p class="lab__kicker">lab / three.js</p>
      <h1 class="lab__title">三版世界球</h1>
      <p class="lab__lead">
        同一套场景层，三种画法。移动指针看视差：A 有昼夜与城市灯火，B 会从南极扫到北极把地表建起来，
        C 是一颗会跟着指针起涟漪的星尘球。选定一版我再接进首页。
      </p>
    </header>

    <section class="lab__item" aria-label="方案 A">
      <div class="lab__meta">
        <span class="lab__tag">A</span>
        <div>
          <h2>昼夜地形球</h2>
          <p>
            二十面体细分 + fbm 抬升，flatShading 出棱面；夜侧灯火由 <code>dot(法线, 光向)</code>
            自己算显隐；外圈一步 fresnel 大气。
          </p>
        </div>
      </div>
      <div class="lab__stage"><GlobeTerrain /></div>
    </section>

    <section class="lab__item" aria-label="方案 B">
      <div class="lab__meta">
        <span class="lab__tag">B</span>
        <div>
          <h2>扫描建造球</h2>
          <p>
            陆地是 SVG 现画的等高线，栅格化成球面贴图；扫描线以下才算建成，亮暗在 shader 里按
            <code>position.y</code> 切；左下那行字是 <strong>HTML-in-Canvas</strong> 上传成纹理的，
            不是叠在上面的 div。
          </p>
        </div>
      </div>
      <div class="lab__stage"><GlobeScan /></div>
    </section>

    <section class="lab__item" aria-label="方案 C">
      <div class="lab__meta">
        <span class="lab__tag">C</span>
        <div>
          <h2>星尘球</h2>
          <p>
            4.6 万个点铺成球面，亮度按昼夜分界算；指针位置换算成球面一点传进 shader，附近的点沿法线抬起，
            掠过就有涟漪。
          </p>
        </div>
      </div>
      <div class="lab__stage"><GlobeDust /></div>
    </section>

    <p class="lab__foot">三版都是这台机器的实时渲染，不是录屏；离开视口自动停帧。</p>
  </main>
</template>

<style scoped>
.lab {
  max-width: 1180px;
  margin: 0 auto;
  padding: 120px 32px 120px;
}
.lab__kicker {
  margin: 0 0 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary-color);
}
.lab__title {
  margin: 0 0 14px;
  font-size: clamp(1.9rem, 3.4vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-color);
}
.lab__lead {
  margin: 0;
  max-width: 62ch;
  font-size: 1rem;
  line-height: 1.85;
  color: var(--text-secondary);
}
.lab__item {
  margin-top: 72px;
  padding-top: 28px;
  border-top: 1px solid var(--border-color);
}
.lab__meta {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 20px;
}
.lab__tag {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--primary-color) 40%, transparent);
  color: var(--primary-color);
  font-family: var(--font-mono);
  font-size: 12px;
}
.lab__meta h2 {
  margin: 0 0 6px;
  font-size: 1.15rem;
  font-weight: 650;
  color: var(--text-color);
}
.lab__meta p {
  margin: 0;
  max-width: 72ch;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--text-secondary);
}
.lab__meta code {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--primary-color);
}
.lab__stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 620px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: radial-gradient(
    circle at 50% 46%,
    color-mix(in srgb, var(--primary-color) 9%, transparent),
    transparent 68%
  );
  overflow: hidden;
}
.lab__foot {
  margin: 64px 0 0;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  opacity: 0.75;
}

@media (max-width: 860px) {
  .lab {
    padding: 96px 20px 88px;
  }
  .lab__stage {
    aspect-ratio: 4 / 3;
  }
}
</style>
