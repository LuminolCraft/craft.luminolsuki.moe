/**
 * 管理端封禁证据上传的压缩参数配置（工程化集中管理）。
 *
 * 为什么集中在这里：AVIF/WebP 的质量参数、视频转码的体积目标等直接影响
 * 5MiB 上限的合规率与编码耗时，把默认值与取值范围收敛到一处，避免散落在
 * 组件与编码库里。弹窗的"压缩设置"面板只允许覆盖 avif / webp 两个子集，
 * 覆盖值持久化到 localStorage['evidence_upload_overrides']（读写均容错，
 * localStorage 不可用时静默回退默认值）。
 */

/** AVIF 静帧重编码参数（透传 @jsquash/avif encode options） */
export interface EvidenceAvifParams {
  /** 质量 1-100：越高越清晰、体积越大；50 为体积与观感的平衡点 */
  quality: number
  /** 编码速度 0-10：越高越快，但同质量下体积略增；6 为常用档 */
  speed: number
  /** 无损模式：开启后忽略 quality，体积显著增大（证据图一般无需开启） */
  lossless: boolean
}

/** WebP 静帧重编码参数（透传 @jsquash/webp encode options） */
export interface EvidenceWebpParams {
  /** 质量 1-100：越高越清晰、体积越大 */
  quality: number
}

/** 视频/GIF → 动画 AVIF 的转码与降体积阶梯参数 */
export interface EvidenceVideoParams {
  /** 动画 AVIF 目标帧率（fps 滤镜）：高帧率保动效，但体积与耗时上升 */
  fps: number
  /** 阶梯降级时分辨率高度下限（px）：为可读性绝不低于该值 */
  minHeight: number
  /** 单产物目标体积（字节）：转码产物超过它才进入降体积阶梯 */
  targetBytes: number
  /** 降体积阶梯最多迭代轮数：轮内依次尝试 升CRF→降分辨率→降fps→升cpu-used */
  maxLadderRounds: number
}

export interface EvidenceUploadConfig {
  avif: EvidenceAvifParams
  webp: EvidenceWebpParams
  /** 原始文件超过该大小时拒绝在浏览器内编码（内存保护），不入队 */
  maxEncodeInputBytes: number
  video: EvidenceVideoParams
}

export const EVIDENCE_UPLOAD_CONFIG: EvidenceUploadConfig = {
  avif: { quality: 50, speed: 6, lossless: false },
  webp: { quality: 80 },
  maxEncodeInputBytes: 10 * 1024 * 1024,
  video: { fps: 60, minHeight: 720, targetBytes: 10 * 1024 * 1024, maxLadderRounds: 3 },
}

/**
 * 面板可覆盖的参数（扁平结构，便于滑杆/开关双向绑定与 localStorage 序列化）。
 * 未设置的字段回退 EVIDENCE_UPLOAD_CONFIG 默认值。
 */
export interface EvidenceUploadOverrides {
  /** AVIF 质量（1-100） */
  avifQuality?: number
  /** AVIF 编码速度（0-10） */
  avifSpeed?: number
  /** AVIF 无损模式 */
  avifLossless?: boolean
  /** WebP 质量（1-100） */
  webpQuality?: number
}

const OVERRIDES_KEY = 'evidence_upload_overrides'

/** 数值覆盖项：非法/越界时夹取到 [min, max]，无法解析回退默认 */
function pickNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** 布尔覆盖项：仅接受 true/false，其余回退默认 */
function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** 合并默认值与用户覆盖值，得到本次编码实际使用的 AVIF 参数 */
export function resolveAvifParams(overrides?: EvidenceUploadOverrides | null): EvidenceAvifParams {
  const d = EVIDENCE_UPLOAD_CONFIG.avif
  return {
    quality: pickNumber(overrides?.avifQuality, d.quality, 1, 100),
    speed: pickNumber(overrides?.avifSpeed, d.speed, 0, 10),
    lossless: pickBoolean(overrides?.avifLossless, d.lossless),
  }
}

/** 合并默认值与用户覆盖值，得到本次编码实际使用的 WebP 参数 */
export function resolveWebpParams(overrides?: EvidenceUploadOverrides | null): EvidenceWebpParams {
  const d = EVIDENCE_UPLOAD_CONFIG.webp
  return {
    quality: pickNumber(overrides?.webpQuality, d.quality, 1, 100),
  }
}

/** 读取 localStorage 中的覆盖值；不可用/损坏/含未知键时静默忽略 */
export function loadEvidenceOverrides(): EvidenceUploadOverrides {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: EvidenceUploadOverrides = {}
    if ('avifQuality' in parsed) out.avifQuality = pickNumber(parsed.avifQuality, EVIDENCE_UPLOAD_CONFIG.avif.quality, 1, 100)
    if ('avifSpeed' in parsed) out.avifSpeed = pickNumber(parsed.avifSpeed, EVIDENCE_UPLOAD_CONFIG.avif.speed, 0, 10)
    if ('avifLossless' in parsed) out.avifLossless = pickBoolean(parsed.avifLossless, EVIDENCE_UPLOAD_CONFIG.avif.lossless)
    if ('webpQuality' in parsed) out.webpQuality = pickNumber(parsed.webpQuality, EVIDENCE_UPLOAD_CONFIG.webp.quality, 1, 100)
    return out
  } catch {
    // localStorage 被禁用 / JSON 损坏：静默回退默认（覆盖值本就是可选增强）
    return {}
  }
}

/** 持久化覆盖值；localStorage 不可用时静默跳过 */
export function saveEvidenceOverrides(overrides: EvidenceUploadOverrides): void {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
  } catch {
    // 同上，忽略写失败
  }
}
