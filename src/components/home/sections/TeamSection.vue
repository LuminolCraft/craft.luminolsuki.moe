<!--
  TeamSection —— 管理团队

  名单来自 config/team-members.ts（全站共用一份），角色名走 i18n 的 home.team.roles.*，
  组件里不再硬编码任何成员或角色文案。
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticCornerFrame from '@/components/common/MagneticCornerFrame.vue'
import { useGsap } from '@/composables/useGsap'
import { contributors } from '@/config/team-members'

gsap.registerPlugin(ScrollTrigger)

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)

const { create } = useGsap({ scope: rootRef })

function roleLabel(roleKey: string): string {
  return t(`home.team.roles.${roleKey}`)
}

onMounted(() => {
  create(() => {
    if (!listEl.value) return
    gsap.from(listEl.value, {
      y: 24,
      autoAlpha: 0,
      duration: 0.6,
      ease: 'power3.out',
      scrollTrigger: { trigger: listEl.value, start: 'top 80%', once: true },
    })
  })
})
</script>

<template>
  <section ref="rootRef" class="team">
    <div class="wrap">
      <header class="section-head" data-reveal>
        <div class="section-head__text">
          <p class="eyebrow">管理团队</p>
          <h2 class="h2">六个人在维持它运转</h2>
          <p class="lead">从服务端维护到活动策划，全部由玩家志愿者承担。</p>
        </div>
      </header>

      <div ref="listEl" class="team__list">
        <div
          v-for="(member, i) in contributors"
          :key="member.name"
          class="team__item"
          :class="{ 'is-offset': i % 2 === 1 }"
        >
          <MagneticCornerFrame class="team-row">
            <div class="team-row__inner">
              <span class="team-row__idx">{{ String(i + 1).padStart(2, '0') }}</span>

              <img
                class="team-row__avatar"
                :src="member.avatar"
                :alt="member.name"
                width="56"
                height="56"
                loading="lazy"
              />

              <div class="team-row__id">
                <div class="team-row__name-row">
                  <span class="team-row__name">{{ member.name }}</span>
                  <span v-if="member.isOwner" class="team-row__owner">OWNER</span>
                </div>
                <div class="team-row__role">{{ roleLabel(member.roleKey) }}</div>
              </div>

              <div v-if="member.extraLinks?.length" class="team-row__links">
                <a
                  v-for="link in member.extraLinks"
                  :key="link.href"
                  class="team-row__icon"
                  :href="link.href"
                  :aria-label="
                    link.type === 'qq'
                      ? `通过 QQ 联系 ${member.name}`
                      : `发送邮件给 ${member.name}`
                  "
                  :title="link.type === 'qq' ? 'QQ' : 'Email'"
                  target="_blank"
                  rel="noopener"
                >
                  <svg
                    v-if="link.type === 'qq'"
                    viewBox="0 0 20 20"
                    width="16"
                    height="16"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M10 1.6c-2.6 0-4.3 1.9-4.3 4.4 0 .6-.2 1-.6 1.5-.9 1.2-1.5 2.6-1.5 4.2 0 .8.2 1.4.5 1.6.3.2.6 0 .9-.5.2-.4.4-.9.5-1.3.4 1 .9 1.7 1.5 2.2-.6.3-1 .7-1 1.1 0 .7 1.6 1.2 3.5 1.2s3.5-.5 3.5-1.2c0-.4-.4-.8-1-1.1.6-.5 1.1-1.2 1.5-2.2.1.4.3.9.5 1.3.3.5.6.7.9.5.3-.2.5-.8.5-1.6 0-1.6-.6-3-1.5-4.2-.4-.5-.6-.9-.6-1.5 0-2.5-1.7-4.4-4.3-4.4Z"
                    />
                  </svg>
                  <svg v-else viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M2.5 4.5h15c.6 0 1 .4 1 1v9c0 .6-.4 1-1 1h-15c-.6 0-1-.4-1-1v-9c0-.6.4-1 1-1Zm7.5 6.1L3.6 6v8.5h12.8V6L10 10.6Zm0-1.7L16.4 5.5H3.6L10 8.9Z"
                    />
                  </svg>
                </a>
              </div>

              <a class="team-row__gh" :href="member.githubHref" target="_blank" rel="noopener">
                {{ member.githubLabel }}
              </a>
            </div>
          </MagneticCornerFrame>
        </div>
      </div>
    </div>
  </section>
</template>
