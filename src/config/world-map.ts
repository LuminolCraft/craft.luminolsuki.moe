/**
 * 世界地图地标（坐标基于 SVG viewBox 1000 × 480）。
 *
 * ⚠️ 名称与位置目前是示意：按公告里提过的运河 / 红石试验田 / 高铁，加上
 * 常规生存服配置补出来的地标，不是实测坐标。等拿到俯视截图后按比例替换这里即可，
 * 组件不需要动。
 */

export interface Landmark {
  id: string
  name: string
  x: number
  y: number
  tag: string
  note: string
  /** 标签放哪一侧，避免压到等高线或相邻标签 */
  side: 'left' | 'right'
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'spawn',
    name: '出生点',
    x: 500,
    y: 232,
    tag: '中心',
    note: '所有人落地的地方。半径两百格内不许建私宅，只放公共设施与指示牌。',
    side: 'right',
  },
  {
    id: 'town',
    name: '主城',
    x: 588,
    y: 196,
    tag: '公共',
    note: '出生点东北侧，仓库、交易所与告示墙集中在这里，材料按类分箱。',
    side: 'right',
  },
  {
    id: 'canal',
    name: '运河口',
    x: 444,
    y: 300,
    tag: '工程',
    note: '从出生点往北的主水道起点，靠船运把矿石从矿区带回主城。',
    side: 'left',
  },
  {
    id: 'redstone',
    name: '红石试验田',
    x: 636,
    y: 272,
    tag: '工程',
    note: '东侧空地，玩家自行搭的红石装置与农场，坏了不修也没人管 —— 属于公共试验场。',
    side: 'right',
  },
  {
    id: 'rail',
    name: '高铁',
    x: 388,
    y: 194,
    tag: '交通',
    note: '西侧出发的高架线，从主城一路铺到矿区，中途三个站点。',
    side: 'left',
  },
  {
    id: 'mine',
    name: '矿区',
    x: 676,
    y: 158,
    tag: '资源',
    note: '公开矿洞，不设领地。挖完不回填，塌方了自己绕路。',
    side: 'right',
  },
  {
    id: 'harbor',
    name: '港口',
    x: 486,
    y: 352,
    tag: '交通',
    note: '运河南端，停船与卸货的地方，也是跨海去远处的起点。',
    side: 'right',
  },
  {
    id: 'arena',
    name: '竞技场',
    x: 356,
    y: 292,
    tag: '活动',
    note: '活动时开放，平时空着。PVP 只在开场期间生效，场外一律关闭。',
    side: 'left',
  },
]
