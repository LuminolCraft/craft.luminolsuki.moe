<template>
  <div ref="rootRef" class="layout-c-root">
    <!-- 特色区域 -->
    <FeaturesSection :server-online="serverOnline" :online-players="onlinePlayers" />

    <!-- 服务器类型区域 -->
    <ServersSection :server-online="serverOnline" :online-players="onlinePlayers" />

    <!-- 团队区域（动态组件，由 CURRENT_TEAM_STYLE 控制） -->
    <component :is="teamComponent" :key="_resolvedTeam" :server-online="serverOnline" />
  </div>
</template>

<style scoped>
/* ===== 根容器 ===== */
.layout-c-root {
  position: relative;
}
</style>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { Component } from 'vue'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CURRENT_TEAM_STYLE, resolveTeamStyle } from '@/config/home-layout'
import type { ResolvedTeamStyle } from '@/config/home-layout'
import FeaturesSection from './FeaturesSection.vue'
import ServersSection from './ServersSection.vue'
import TeamArtistic from '../team/TeamArtistic.vue'
import TeamCinema from '../team/TeamCinema.vue'
import TeamBento from '../team/TeamBento.vue'

defineProps<{ serverOnline: boolean; onlinePlayers: string }>()

const TEAM_STYLE_COMPONENT_MAP: Record<ResolvedTeamStyle, Component> = {
  artistic: TeamArtistic,
  cinema: TeamCinema,
  bento: TeamBento,
} as const

const _resolvedTeam = resolveTeamStyle(CURRENT_TEAM_STYLE)
const teamComponent = TEAM_STYLE_COMPONENT_MAP[_resolvedTeam]

const rootRef = ref<HTMLElement | null>(null)

onMounted(() => {
  // 各区块自己负责入场编排与 pin；这里只做一次全局刷新，确保首屏高度算准
  requestAnimationFrame(() => ScrollTrigger.refresh())
})

onUnmounted(() => {
  ScrollTrigger.refresh()
})
</script>
