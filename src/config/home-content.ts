/**
 * 首页共享内容
 *
 * 只放「首页独有、多个区块共用」的文案与素材；团队成员名单在 config/team-members.ts，
 * 角色文案走 i18n 的 home.team.roles.*，不要在这里再抄一份。
 */

/** 官方交流群（Hero 与 CTA 共用） */
export const QQ_GROUP = 'https://qm.qq.com/q/M29Eyniu8S'

/** Java 版服务器地址（Hero 的「服务器地址」按钮复制它） */
export const SERVER_ADDRESS = 'craft.luminolsuki.moe'

/** 实机截图池：Hero 轮播、截图带、对比区都从这里取 */
export const SHOTS = [
  '/images/Image_1764466849.avif',
  '/images/Image_1764467382.avif',
  '/images/Image_1764468583.avif',
  '/images/Image_1764468914.avif',
  '/images/Image_1764392636.avif',
  '/images/Image_1764468731.avif',
  '/images/Image_1764465651.avif',
  '/images/3cda066bccaefea3eb268d4ca10f018a.webp',
  '/images/Image_585018650004905.webp',
  '/images/Image_585012522922876.webp',
  '/images/Image_585000138805953.webp',
  '/images/Image_669234245588716.webp',
  '/images/Image_669226165759604.webp',
  '/images/Image_669218057352159.webp',
  '/images/Image_669214276923463.webp',
  '/images/Image_669203224465863.webp',
  '/images/Image_669202127295447.webp',
  '/images/Image_669192564244096.webp',
  '/images/Image_669027140045097.webp',
  '/images/Image_585061010780930.webp',
  '/images/9ae17d2b-8fb3-4f05-8a75-48c40de55bd0.webp',
  '/images/Image_669276986426772.webp',
]

/** 取第 n 张截图（循环取模，永远返回 string，避开 noUncheckedIndexedAccess 的 string | undefined） */
export function shotAt(n: number): string {
  const total = SHOTS.length
  if (total === 0) return ''
  return SHOTS[((n % total) + total) % total] as string
}

export interface DemoStage {
  index: string
  eyebrow: string
  title: string
  desc: string
  image: string
}

/** 滚动演示区的四段文案与配图 */
export const demoStages: DemoStage[] = [
  {
    index: '01',
    eyebrow: '纯净生存',
    title: '原版该有的样子',
    desc: '仅保留 /tpa、/home、/rtp 等基础指令并设冷却；不限制红石，不更改原版特性，没有圈地插件。',
    image: shotAt(5),
  },
  {
    index: '02',
    eyebrow: '综合生存',
    title: 'RPG、科技与领地',
    desc: '融合 RPG 生存、技能系统与粘液科技；领地系统保护你的建造，死亡不掉落。',
    image: shotAt(11),
  },
  {
    index: '03',
    eyebrow: '规则与安全',
    title: '管理依规，处罚有据',
    desc: '严禁外挂与破坏他人建筑；服务器记录必要操作日志用于安全审计与违规追溯。',
    image: shotAt(17),
  },
  {
    index: '04',
    eyebrow: '世界与建造',
    title: '主世界难，末地宽',
    desc: '主世界不开启死亡不掉落，强化生存挑战的真实感；下界与末地开启该功能，平衡探索风险。',
    image: shotAt(20),
  },
]
