/**
 * ui-fx —— 角标微交互（Magnetic Corner Brackets）与自定义光标的**唯一开关入口**
 *
 * 想全站关掉：把 enabled 改成 false。
 * 只关角标：frames.enabled = false。只关光标：cursor.enabled = false。
 * 新组件要能框：把它的类名加进 frames.selectors；某些元素不想被框：加进 frames.offSelectors，
 * 或者直接在元素上写 data-fx="off"。
 *
 * 实现见 composables/useUiFx.ts（安装器）；角标几何量公式见
 * composables/useMagneticCornerHover.ts 的 computeCornerGeometry。
 */

export interface UiFxFrameOverride {
  selector: string
  /** 该元素的最小可框尺寸（px），用来放宽文字链接这类小元素 */
  minSize?: number
  /** 磁吸位移上限（px） */
  magnetStrength?: number
  /** 边缘加权倍数 */
  edgeBias?: number
}

export interface UiFxConfig {
  /** 总开关：false = 全站不挂光标与角标 */
  enabled: boolean
  cursor: {
    enabled: boolean
    /** 中心点 */
    dot: boolean
    /** 追踪环 */
    ring: boolean
  }
  frames: {
    enabled: boolean
    /** 命中这些选择器的元素自动获得角标框 */
    selectors: string[]
    /** 命中即跳过（逃生舱） */
    offSelectors: string[]
    /** 一页最多增强多少个元素，超出按 DOM 顺序丢弃并 warn 一次 */
    maxFrames: number
    /** 默认参数 */
    defaults: {
      /**
       * 角臂长度（px）。全站统一，不随元素尺寸缩放 ——
       * 按尺寸缩放会让同排元素的角标大小不一致，观感很廉价。
       */
      maxArm: number
      magnetStrength: number
      edgeBias: number
      /** 元素短边小于该值不成框 */
      minSize: number
    }
    /** 精细覆盖 */
    overrides: UiFxFrameOverride[]
  }
}

export const UI_FX: UiFxConfig = {
  enabled: true,

  cursor: {
    enabled: true,
    dot: true,
    ring: true,
  },

  frames: {
    enabled: true,

    /*
      首批白名单。新增组件只要把类名加进来即可，不需要改任何逻辑。
      刻意不写通配（例如 [class] 全量）：一页会有上百个元素，全包会拖慢首屏。
    */
    selectors: [
      // 首页
      '.status__cell',
      '.demo__item',
      '.compare__col',
      '.gallery__item',
      '.team-row',
      '.team-row__avatar',
      '.team-row__id',
      '.team-row__icon',
      '.team-row__gh',
      '.cta__panel',
      // 通用控件
      '.btn',
      '.tag',
      // 内容卡片（其他页面）
      '.card',
      '.news-card',
      '.archive-item',
      '.forbidden-card',
      '.support-card',
      '.dz-card',
      '.bell-item',
      '.mc-item',
      '.la-item',
      '.admin-nav-item',
      '.auth-btn',
      '.auth-field',
      // 其他页面（Support / News / Rules / Archive）实存类名
      '.vercel-card',
      '.sponsorship-methods > *',
      '.thank-you',
      '.news-card',
      '.news-grid > *',
      '.toolbar-row > *',
      '.archive-section',
      '.rules-card',
      '.markdown-body > pre',
      '.markdown-body > blockquote',
    ],

    offSelectors: [
      '[data-fx="off"]',
      'input',
      'textarea',
      'select',
      'script',
      'style',
      '[contenteditable="true"]',
    ],

    maxFrames: 120,

    defaults: {
      maxArm: 14,
      magnetStrength: 6,
      edgeBias: 2.2,
      minSize: 16,
    },

    /*
      override 只允许调「值不值得框」（minSize）与磁吸幅度（magnetStrength）。
      臂长与间距刻意不开放逐元素覆盖：一旦开放，同一排元素的角标大小就会不一致。
    */
    overrides: [
      { selector: '.team-row__id', minSize: 8 },
      { selector: '.team-row__icon', minSize: 8 },
      { selector: '.team-row__gh', minSize: 8 },
      { selector: '.tag', magnetStrength: 3 },
      { selector: '.btn', magnetStrength: 4 },
      { selector: '.status__cell', magnetStrength: 3 },
      { selector: '.gallery__item', magnetStrength: 5 },
    ],
  },
}

/** 角标框标记属性（元素带这个属性 = 可被框） */
export const UI_FX_FRAME_ATTR = 'data-mcf'
/** 逃生舱属性：data-fx="off" 的元素及其子树不增强 */
export const UI_FX_OFF_ATTR = 'data-fx'
