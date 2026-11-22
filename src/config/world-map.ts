/**
 * 世界地图地标（坐标基于 SVG viewBox 1000 × 480，等实际地形图重绘后再换回 1000 × 800）。
 *
 * 地形骨架见 lib/contour.ts：同一套 1000 × 480 坐标，首页小图与全屏地图共用。
 * 实名只有出生点与第一落脚点；其余黄圈位置是玩家建筑群，名目待定，
 * 确认后只改这里，组件不用动。
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

const NOTE = '玩家自建的建筑群。'

export const LANDMARKS: Landmark[] = [
  {
    id: 'spawn',
    name: '出生点',
    x: 463,
    y: 140,
    tag: '起点',
    note: '所有人落地的小屋，一切坐标由这里起算。',
    side: 'right',
  },
  {
    id: 'base',
    name: '第一落脚点',
    x: 611,
    y: 217,
    tag: '据点',
    note: '最早的营地，铺了整片石台当家底。后来的路都从这里往外修。',
    side: 'right',
  },
  {
    id: 's1',
    name: '玩家聚落 · 一',
    x: 384,
    y: 81,
    tag: '聚落',
    note: '出生点西北的樱花树林，环绕着几处白墙小屋。',
    side: 'right',
  },
  {
    id: 's2',
    name: '玩家聚落 · 二',
    x: 532,
    y: 109,
    tag: '聚落',
    note: '出生点东北的圆形建筑群，在图上一眼能认出来。',
    side: 'right',
  },
  {
    id: 's3',
    name: '玩家聚落 · 三',
    x: 616,
    y: 98,
    tag: '聚落',
    note: `更北面的方形建筑群，带红顶。${NOTE}`,
    side: 'right',
  },
  {
    id: 's4',
    name: '玩家聚落 · 四',
    x: 468,
    y: 207,
    tag: '聚落',
    note: '出生点正南的农田与建筑群，傍着水道。',
    side: 'left',
  },
  {
    id: 's5',
    name: '玩家聚落 · 五',
    x: 373,
    y: 227,
    tag: '聚落',
    note: '出生点西南的林间小聚落。',
    side: 'left',
  },
  {
    id: 's6',
    name: '玩家聚落 · 六',
    x: 486,
    y: 302,
    tag: '聚落',
    note: '最南端临水的深色屋顶建筑群。',
    side: 'right',
  },
]
