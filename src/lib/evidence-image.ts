/**
 * 封禁证据图/视频的浏览器端重编码核心。
 *
 * 硬性约束：任何路径都不存在"原文件直传"——所有入队文件先重编码再上传：
 * - JPEG / PNG          → 静帧 AVIF（createImageBitmap 解码 + @jsquash/avif 编码）
 * - WebP                → 静帧 WebP（保格式，@jsquash/webp decode → encode）
 * - AVIF（静帧）        → 静帧 AVIF（@jsquash/avif decode → encode）
 * - AVIF（动画 avis）   → 逐帧拆分为 N 个静帧 AVIF（多产出，明示丢动效）
 * - GIF / MP4 / WebM    → 动画 AVIF（ffmpeg wasm 核心，libaom-av1，单产出）
 *
 * 后端只接受 image/avif 与 image/webp、单文件 ≤5MiB，因此把体积合规压力
 * 全部放在编码器上。失败一律返回结构化 reason，由调用方映射 i18n 文案；
 * jsquash / ffmpeg 均为动态 import，图片路径不加载 ffmpeg，测试环境
 * （jsdom 无编码器）也不会在 import 阶段炸掉。
 */
import {
  EVIDENCE_MAX_BYTES,
  EVIDENCE_TARGET_BYTES,
  EVIDENCE_UPLOAD_CONFIG,
  resolveAvifParams,
  resolveWebpParams,
  type EvidenceAvifParams,
  type EvidenceUploadOverrides,
  type EvidenceWebpParams,
} from '@/config/evidence-upload'

// ---------- 结构化失败原因（组件按 reason 映射 i18n） ----------

export type EvidenceFailureReason =
  | 'unsupported_type' // 类型不在受理清单（后端也只收 avif/webp）
  | 'too_large' // 原始文件超过 maxEncodeInputBytes，浏览器内编码不可行
  | 'environment' // 缺 createImageBitmap / OffscreenCanvas 等编码能力
  | 'ffmpeg_missing' // ffmpeg wasm 核心未部署或加载失败（仅影响视频/GIF 项）
  | 'output_too_large' // 重编码产物仍超过 5MiB 上传上限
  | 'no_video_track' // 视频里没有画面轨（纯音频 / 解码失败），抽帧不可行
  | 'encode_failed' // 编码器抛错 / 产物为空

export interface EvidenceEncodedItem {
  /** 编码产物（上传时以 evi_{token}.avif 等随机文件名 multipart 提交） */
  blob: Blob
  originalSize: number
  encodedSize: number
  /** 仅视频路径：降体积阶梯用尽仍超 targetBytes 时为 true（尽力而为的产物） */
  overTarget?: boolean
}

export type EvidenceResult =
  | { ok: true; items: EvidenceEncodedItem[] }
  | { ok: false; reason: EvidenceFailureReason }

/** prepareEvidenceFile 的进度钩子（仅动画/视频路径有真实百分比） */
export interface PrepareHooks {
  onProgress?: (percent: number) => void
}

// ---------- ffmpeg wasm 核心（产物由 scripts/build-ffmpeg-core.sh 构建并 vendored 到 public/ffmpeg/） ----------

const FFMPEG_CORE_BASE = '/ffmpeg/'

/** ffmpeg 核心缺失/加载失败的结构化错误（区别于一般编码失败） */
class FfmpegCoreMissingError extends Error {
  constructor() {
    super(`ffmpeg core not available under ${FFMPEG_CORE_BASE}`)
    this.name = 'FfmpegCoreMissingError'
  }
}

/**
 * 轻量探测核心文件是否已部署到 `public/ffmpeg/`（用于弹窗提前提示，不发大请求）。
 *
 * 不能只看 `res.ok`：站点用 `/* → /index.html 200` 做 SPA 兜底，**缺失的
 * /ffmpeg/ffmpeg-core.js 也会返回 200**（内容是 HTML），于是"核心未就绪"
 * 的提示永远不出现，用户只能逐项失败后才知道。这里改为同时校验 content-type
 * 是 JavaScript（含 text/javascript、application/javascript）。
 */
let ffmpegProbeResult: boolean | null = null

export async function probeFfmpegCore(): Promise<boolean> {
  if (ffmpegProbeResult !== null) return ffmpegProbeResult
  try {
    const res = await fetch(`${FFMPEG_CORE_BASE}ffmpeg-core.js`, { method: 'HEAD' })
    if (!res.ok) return false
    const type = (res.headers.get('content-type') || '').toLowerCase()
    ffmpegProbeResult = type.includes('javascript')
    return ffmpegProbeResult
  } catch {
    ffmpegProbeResult = false
    return false
  }
}

// ---------- 随机命名（统一 evi_{randomToken}.{ext}；setId 需匹配 ^[A-Za-z0-9_-]{6,64}$） ----------

const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const SET_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** 浏览器端随机 token：优先 crypto.getRandomValues（密码学随机，避免可猜测文件名） */
export function randomToken(length = 12): string {
  const bytes = new Uint8Array(length)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  let out = ''
  for (let i = 0; i < length; i++) out += TOKEN_ALPHABET[(bytes[i] ?? 0) % TOKEN_ALPHABET.length]
  return out
}

/** 证据产物文件名：evi_{token}.{ext}；拆帧序列带帧号 evi_{token}_f{nnn}.{ext}（帧号三位补零，如 f001） */
export function evidenceFileName(ext: string, index?: number): string {
  const token = randomToken()
  return index === undefined
    ? `evi_${token}.${ext}`
    : `evi_${token}_f${String(index).padStart(3, '0')}.${ext}`
}

/** 拆帧序列的 setId：set_{24 位随机}，满足后端 ^[A-Za-z0-9_-]{6,64}$ */
export function randomSetId(): string {
  const bytes = new Uint8Array(24)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  let out = 'set_'
  for (let i = 0; i < bytes.length; i++) out += SET_ID_ALPHABET[(bytes[i] ?? 0) % SET_ID_ALPHABET.length]
  return out
}

// ---------- 环境守卫 ----------

/**
 * 当前浏览器是否具备浏览器内编码能力（OffscreenCanvas + createImageBitmap）。
 * 不满足时弹窗应禁用上传并提示更换最新版 Chrome / Edge。
 */
export function canEncodeInBrowser(): boolean {
  return (
    typeof globalThis.createImageBitmap === 'function' &&
    typeof globalThis.OffscreenCanvas === 'function'
  )
}

// ---------- 解码辅助 ----------

/** Blob → ArrayBuffer：优先原生 arrayBuffer()，兜底 FileReader（老内核/测试环境无该方法） */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('read blob failed'))
    reader.readAsArrayBuffer(blob)
  })
}

/** 位图/视频帧 → ImageData（统一走 OffscreenCanvas 2d） */
function frameToImageData(frame: VideoFrame | ImageBitmap): ImageData {
  const width = 'displayWidth' in frame ? frame.displayWidth : frame.width
  const height = 'displayHeight' in frame ? frame.displayHeight : frame.height
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2d context unavailable')
  ctx.drawImage(frame as CanvasImageSource, 0, 0)
  return ctx.getImageData(0, 0, width, height)
}

/** 从任意图片文件解码出 ImageData（JPEG/PNG 路径） */
async function imageDataFromFile(file: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(file)
  try {
    return frameToImageData(bitmap)
  } finally {
    bitmap.close()
  }
}

// ---------- 编码辅助（产物为空视作失败） ----------

async function encodeAvif(imageData: ImageData, params: EvidenceAvifParams): Promise<Blob> {
  const { encode } = await import('@jsquash/avif')
  const buffer = await encode(imageData, {
    quality: params.quality,
    speed: params.speed,
    lossless: params.lossless,
  })
  const blob = new Blob([buffer], { type: 'image/avif' })
  if (blob.size === 0) throw new Error('avif encoder produced empty output')
  return blob
}

/** 静帧质量阶梯：默认参数仍超预算时逐级降质量，最多两档（再多画质不可接受） */
const STATIC_AVIF_QUALITY_FALLBACKS = [40, 32] as const
const STATIC_WEBP_QUALITY_FALLBACKS = [65, 50] as const

/**
 * 静帧 AVIF 编码 + 体积预算收敛。
 *
 * 之前静帧路径完全没有体积校验（`output_too_large` 是个从未产生的死类型），
 * 超大图或开启 lossless 时会完整编码一遍才被调用方以 5MiB 拒绝——玩家侧白等
 * 白耗电。这里在编码后就按 4.5MiB 逐级降质量；仍超则交由调用方返回
 * `output_too_large`。
 */
async function encodeAvifWithinBudget(
  imageData: ImageData,
  params: EvidenceAvifParams,
): Promise<Blob> {
  let blob = await encodeAvif(imageData, params)
  for (const quality of STATIC_AVIF_QUALITY_FALLBACKS) {
    if (blob.size <= EVIDENCE_TARGET_BYTES) break
    blob = await encodeAvif(imageData, {
      ...params,
      // lossless 会忽略 quality，必须显式关掉才能进入体积阶梯
      lossless: false,
      quality: Math.min(params.quality, quality),
    })
  }
  return blob
}

/** 静帧 WebP 编码 + 体积预算收敛（同 AVIF，只降 quality）。 */
async function encodeWebpWithinBudget(
  imageData: ImageData,
  params: EvidenceWebpParams,
): Promise<Blob> {
  let blob = await encodeWebp(imageData, params)
  for (const quality of STATIC_WEBP_QUALITY_FALLBACKS) {
    if (blob.size <= EVIDENCE_TARGET_BYTES) break
    blob = await encodeWebp(imageData, { quality: Math.min(params.quality, quality) })
  }
  return blob
}

/** 后缀 → MIME 兜底表（部分安卓选择器 / 三方 App 分享过来的 File.type 为空） */
const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

/**
 * 归一化输入 MIME。
 *
 * 处理三件真实世界的破事：
 * - `image/jpg`（非标准写法，但确实有上传源这么标）；
 * - `image/apng`（动图 PNG，取首帧即可，走 PNG 路径）；
 * - `File.type` 为空（安卓选择器 / 微信分享）→ 按扩展名兜底。
 * 注意 `.mov`（iPhone 录屏）是 ffmpeg 路径能处理的，之前 MIME 白名单没放行。
 */
function normalizeInputMime(file: File | Blob): string {
  const raw = (file.type || '').toLowerCase()
  if (raw === 'image/jpg') return 'image/jpeg'
  if (raw === 'image/apng') return 'image/png'
  if (raw) return raw
  const name = (file as File).name ?? ''
  const dot = name.lastIndexOf('.')
  if (dot < 0) return ''
  return EXTENSION_MIME_MAP[name.slice(dot + 1).toLowerCase()] ?? ''
}

async function encodeWebp(imageData: ImageData, params: EvidenceWebpParams): Promise<Blob> {
  const { encode } = await import('@jsquash/webp')
  const buffer = await encode(imageData, { quality: params.quality })
  const blob = new Blob([buffer], { type: 'image/webp' })
  if (blob.size === 0) throw new Error('webp encoder produced empty output')
  return blob
}

// ---------- AVIF 静帧/动画探测与分发 ----------

export type AvifKind = 'static' | 'animated'

/**
 * 用 ImageDecoder 探测 AVIF 序列类型：动画序列（ftyp 主品牌 avis）的
 * selectedTrack.frameCount > 1。探测能力缺失（老浏览器）时按静帧处理。
 */
export async function detectAvifKind(buffer: ArrayBuffer): Promise<AvifKind> {
  const count = await avifFrameCount(buffer)
  return count > 1 ? 'animated' : 'static'
}

async function avifFrameCount(buffer: ArrayBuffer): Promise<number> {
  if (typeof globalThis.ImageDecoder !== 'function') return 1
  const decoder = new ImageDecoder({ data: buffer, type: 'image/avif' })
  try {
    await decoder.tracks.ready
    return decoder.tracks.selectedTrack?.frameCount ?? 1
  } catch {
    // 探测失败按静帧走，后续 decode/encode 失败会给出 encode_failed
    return 1
  }
}

/** 逐帧解码动画 AVIF → ImageData[]（每帧独立重编码，丢动效） */
/**
 * 拆帧上限：20 帧。
 *
 * 一帧 1080p 的 ImageData 是 ~8MB（1920×1080×4B），300 帧的长动图会直接吃掉
 * 2.4GB —— 移动端必崩。20 帧足够表达"发生了什么"（每帧还会各占一个上传请求，
 * 太多也会撞限流）。超出部分直接丢弃，调用方按 items.length 如实展示。
 */
const MAX_ANIMATED_FRAMES = 20

/**
 * 解码动画 AVIF 的帧序列。
 *
 * 单帧解码失败只跳过该帧、不整组失败：此前的实现把整个循环放在一个 try 里，
 * 第 50 帧坏掉会让前面 49 帧已编码的成果全部丢掉。
 */
async function decodeAvifFrames(buffer: ArrayBuffer): Promise<ImageData[]> {
  const decoder = new ImageDecoder({ data: buffer, type: 'image/avif' })
  const frames: ImageData[] = []
  try {
    await decoder.tracks.ready
    const total = decoder.tracks.selectedTrack?.frameCount ?? 1
    const count = Math.min(total, MAX_ANIMATED_FRAMES)
    for (let i = 0; i < count; i++) {
      try {
        const { image } = await decoder.decode({ frameIndex: i })
        try {
          frames.push(frameToImageData(image))
        } finally {
          image.close()
        }
      } catch {
        // 坏帧跳过（缺帧比整组失败好）
      }
    }
    return frames
  } finally {
    decoder.close()
  }
}

// ---------- 视频降体积阶梯（纯函数，可单测） ----------

export interface VideoEncodeParams {
  /** libaom-av1 CRF（0-63，越高体积越小、质量越低）——阶梯第①级 */
  crf: number
  /** 目标宽度（px，偶数） */
  width: number
  /** 目标高度（px，偶数）——阶梯第②级等比下调，下限 video.minHeight */
  height: number
  /** 目标帧率——阶梯第③级下调 */
  fps: number
  /** libaom-av1 -cpu-used 实时档位（越高越快、压缩率越差）——阶梯第④级 */
  preset: number
}

export interface LadderOptions {
  /** 目标体积（字节）：产物超过它才继续降 */
  targetBytes: number
  /** 高度下限：绝不低于该值 */
  minHeight: number
  /** fps 下限 */
  fpsMin: number
  /** CRF 上限 */
  crfMax: number
  /** -cpu-used 上限 */
  presetMax: number
  /** 最多迭代轮数（超过即收尾，用尽仍超标记 overTarget） */
  maxRounds: number
}

// 阶梯步进调参（算法内部常量：起始 CRF / 档位与各级步长、下限）
export const VIDEO_CRF_START = 30
export const VIDEO_CRF_MAX = 55
export const VIDEO_CRF_STEP = 5
export const VIDEO_PRESET_START = 4
export const VIDEO_PRESET_MAX = 8
export const VIDEO_PRESET_STEP = 1
export const VIDEO_FPS_MIN = 12
/** 分辨率每轮等比缩放系数（0.75 ≈ 面积减半，单轮体积约对半） */
export const VIDEO_HEIGHT_SCALE = 0.75

/** 偶数化（libaom yuv420p 要求宽高为偶数） */
function evenize(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2)
}

/**
 * 降体积阶梯：依据上一轮产物体积决定下一轮编码参数。
 * 固定顺序 ① 升 CRF → ② 等比降分辨率（高度下限 minHeight）→ ③ 降 fps →
 * ④ 升 -cpu-used；每级用尽才动下一级。
 * 返回 null 表示无需/无法继续（未超目标、轮数用尽或阶梯耗尽）——调用方以
 * 当前参数收尾并据最终体积标记 overTarget。
 */
export function planLadder(
  params: VideoEncodeParams,
  lastSize: number,
  round: number,
  opts: LadderOptions,
): VideoEncodeParams | null {
  if (lastSize <= opts.targetBytes) return null
  if (round >= opts.maxRounds) return null
  // ① 升 CRF（降质量）
  if (params.crf < opts.crfMax) {
    return { ...params, crf: Math.min(opts.crfMax, params.crf + VIDEO_CRF_STEP) }
  }
  // ② 等比降分辨率（高度下限 opts.minHeight）
  if (params.height > opts.minHeight) {
    const nextHeight = Math.max(opts.minHeight, Math.round(params.height * VIDEO_HEIGHT_SCALE))
    const nextWidth = evenize((params.width * nextHeight) / params.height)
    return { ...params, width: nextWidth, height: nextHeight }
  }
  // ③ 降 fps（对半，直到下限）
  if (params.fps > opts.fpsMin) {
    return { ...params, fps: Math.max(opts.fpsMin, Math.round(params.fps / 2)) }
  }
  // ④ 升 -cpu-used
  if (params.preset < opts.presetMax) {
    return { ...params, preset: Math.min(opts.presetMax, params.preset + VIDEO_PRESET_STEP) }
  }
  return null
}

// ---------- ffmpeg 转码（GIF / MP4 / WebM → 动画 AVIF，单产出） ----------

export interface TranscodeOutcome {
  blob: Blob
  /** 阶梯用尽仍超 targetBytes 时为 true */
  overTarget: boolean
}

/**
 * 用 ffmpeg wasm 核心把动图/视频转成动画 AVIF。超 targetBytes 时按
 * planLadder 阶梯迭代重编码（最多 maxRounds 轮）。
 * 核心未部署/加载失败抛 FfmpegCoreMissingError，由调用方映射为
 * reason 'ffmpeg_missing'（仅影响视频/GIF 项，图片路径不受影响）。
 */
export async function transcodeToAnimatedAvif(
  file: File | Blob,
  params: VideoEncodeParams,
  opts: LadderOptions,
  onProgress?: (percent: number) => void,
): Promise<TranscodeOutcome> {
  // 先轻量探测核心是否部署，缺失时给出结构化失败而不是笼统 encode_failed
  if (!(await probeFfmpegCore())) throw new FfmpegCoreMissingError()

  const [{ FFmpeg }, { fetchFile }, { default: classWorkerURL }] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
    import('@ffmpeg/ffmpeg/worker?worker&url'),
  ])

  const ffmpeg = new FFmpeg()
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      const pct = Math.round(progress * 100)
      onProgress(Math.max(0, Math.min(100, pct)))
    })
  }
  try {
    await ffmpeg.load({
      classWorkerURL,
      coreURL: `${FFMPEG_CORE_BASE}ffmpeg-core.js`,
      wasmURL: `${FFMPEG_CORE_BASE}ffmpeg-core.wasm`,
    })
  } catch {
    ffmpeg.terminate()
    // 加载失败（核心损坏/版本不匹配等）同样按"核心未就绪"呈现
    throw new FfmpegCoreMissingError()
  }

  const ext = file instanceof File && file.type === 'video/webm' ? 'webm' : file instanceof File && file.type === 'image/gif' ? 'gif' : 'mp4'
  const inputName = `in.${ext}`
  const outputName = 'out.avif'

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))
    let current: VideoEncodeParams = { ...params }
    let round = 0
    let bytes: Uint8Array
    while (true) {
      const code = await ffmpeg.exec([
        '-i',
        inputName,
        // 丢掉音轨。证据只需要画面，而 avif muxer 本身不支持音频；不显式 -an 时
        // ffmpeg 会为输入里的音轨挑默认编码器，核心若没编音频编码器就直接失败。
        '-an',
        '-vf',
        `fps=${current.fps},scale=${current.width}:${current.height}`,
        '-c:v',
        'libaom-av1',
        '-crf',
        String(current.crf),
        '-cpu-used',
        String(current.preset),
        '-pix_fmt',
        'yuv420p',
        // -y 不可省：阶梯第二轮写的是同一个 out.avif，MEMFS 里已存在，
        // ffmpeg 在非 tty 下遇到已存在文件会直接 "File exists. Exiting."
        // 并以非 0 退出，降分辨率 / 降帧率两级永远走不到。
        '-y',
        outputName,
      ])
      if (code !== 0) throw new Error(`ffmpeg exec failed (exit ${code})`)
      const data = await ffmpeg.readFile(outputName)
      if (typeof data === 'string') throw new Error('unexpected text read for binary output')
      bytes = data
      const next = planLadder(current, bytes.byteLength, round, opts)
      if (!next) break
      current = next
      round++
    }
    // 产物校验：必须是 ftyp 主品牌为 avis 的动画 AVIF（字节 8-11）
    assertAnimatedAvif(bytes)
    return {
      // 拷贝为 ArrayBuffer 背靠的 Uint8Array（BlobPart 类型要求，且与原 buffer 解耦）
      blob: new Blob([new Uint8Array(bytes)], { type: 'image/avif' }),
      overTarget: bytes.byteLength > opts.targetBytes,
    }
  } finally {
    // Worker 用完即毁：wasm 核心体积大，常驻无意义；下次转码重新 load
    ffmpeg.terminate()
  }
}

function assertAnimatedAvif(bytes: Uint8Array): void {
  if (bytes.length < 12) throw new Error('avif output too small')
  const at = (i: number) => bytes[i] ?? 0
  const type = String.fromCharCode(at(4), at(5), at(6), at(7))
  const brand = String.fromCharCode(at(8), at(9), at(10), at(11))
  if (type !== 'ftyp' || brand !== 'avis') {
    throw new Error(`not an animated avif (brand=${brand})`)
  }
}

// ---------- 视频/GIF 入口 ----------

/** 读取视频元数据尺寸（失败时返回 0，由调用方兜底） */
async function videoDimensions(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve({ width: video.videoWidth, height: video.videoHeight })
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('video metadata load failed'))
    }
    video.src = url
  })
}

/** 抽帧网格的列数与单格尺寸（3 列，480×270 单格 → 3×3 时约 1464×880） */
const FRAME_GRID_COLS = 3
const FRAME_CELL_WIDTH = 480
const FRAME_CELL_HEIGHT = 270
const FRAME_CELL_GAP = 8
/** 最多抽 9 帧：再多对reviewer 没增量，只徒增体积 */
const FRAME_GRID_MAX = 9
/** 单次 seek 的超时：视频卡住时不能把整条队列挂死 */
const SEEK_TIMEOUT_MS = 5000
const METADATA_TIMEOUT_MS = 8000

/**
 * 计算抽帧时间点（纯函数，便于单测）。
 *
 * 均匀落在 (0, duration) 开区间内：0 秒往往是黑帧/片头，duration 处 seek 在
 * 部分容器上不触发 `seeked`，两头都要避开。无有效时长时退化为单个 0 秒。
 */
export function planFrameTimes(duration: number, maxFrames = FRAME_GRID_MAX): number[] {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  if (safeDuration < 1) return [0]
  const count = Math.max(1, Math.min(maxFrames, FRAME_GRID_MAX))
  const times: number[] = []
  for (let i = 0; i < count; i++) {
    times.push((safeDuration * (i + 1)) / (count + 1))
  }
  return times
}

/** 计算网格画布尺寸（纯函数）：列数按帧数收敛，行数向上取整。 */
export function frameGridSize(
  frameCount: number,
): { cols: number; rows: number; width: number; height: number } {
  const count = Math.max(1, Math.min(frameCount, FRAME_GRID_MAX))
  const cols = Math.min(FRAME_GRID_COLS, count)
  const rows = Math.ceil(count / cols)
  return {
    cols,
    rows,
    width: cols * FRAME_CELL_WIDTH + (cols + 1) * FRAME_CELL_GAP,
    height: rows * FRAME_CELL_HEIGHT + (rows + 1) * FRAME_CELL_GAP,
  }
}

/** 秒 → mm:ss（烧在帧角上，便于处置时定位时间点） */
function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/** 等待事件或超时（事件先到则清掉定时器，避免泄漏） */
function waitForEvent(target: EventTarget, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      target.removeEventListener(event, onDone)
      reject(new Error(`timeout waiting ${event}`))
    }, timeoutMs)
    function onDone() {
      clearTimeout(timer)
      resolve()
    }
    target.addEventListener(event, onDone, { once: true })
  })
}

/**
 * 视频 → 原生抽帧合成一张证据图（**不依赖 ffmpeg wasm**）。
 *
 * 为什么需要这条路：自建 ffmpeg 核心（25–35MB，需 emsdk 从源码编译）在本项目
 * 从未入库，缺核心时视频路径 100% 返回 `ffmpeg_missing` —— 等于视频证据从来没
 * 可用过。把"能用"押在一个 35MB 的构建产物上不划算，而浏览器**本来就能解码
 * 视频**：`<video>` + canvas 取帧，硬件解码、零下载、移动端也能跑。
 *
 * 产物是**一张静态 AVIF 网格**（最多 9 帧，每帧角上烧时间戳），不是动画：
 * - 对处置更有用——一眼看完整个时间线，不用等动画播完；
 * - 体积可控（一般几十到几百 KB），不会撞后端 5MiB 上限；
 * - 顺带剥掉音频（证据只需要画面）。
 *
 * 有声有画的长视频仍可走 ffmpeg 路径（核心存在时优先用它出动画 AVIF）。
 */
async function prepareVideoViaFrames(
  file: File | Blob,
  hooks?: PrepareHooks,
): Promise<EvidenceResult> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'metadata'
  video.src = url

  try {
    await waitForEvent(video, 'loadedmetadata', METADATA_TIMEOUT_MS)

    const duration = Number.isFinite(video.duration) ? video.duration : 0
    if (!video.videoWidth || !video.videoHeight) return { ok: false, reason: 'no_video_track' }

    const times = planFrameTimes(duration)
    const { cols, width, height } = frameGridSize(times.length)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return { ok: false, reason: 'environment' }
    ctx.fillStyle = '#0b0b0f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < times.length; i++) {
      const t = times[i] as number
      video.currentTime = t
      // seeked 可能因关键帧稀疏而延迟；超时视为该帧失败，继续其余帧
      await waitForEvent(video, 'seeked', SEEK_TIMEOUT_MS)
      hooks?.onProgress?.(Math.round(((i + 1) / times.length) * 90))

      const col = i % cols
      const row = Math.floor(i / cols)
      const dx = FRAME_CELL_GAP + col * (FRAME_CELL_WIDTH + FRAME_CELL_GAP)
      const dy = FRAME_CELL_GAP + row * (FRAME_CELL_HEIGHT + FRAME_CELL_GAP)

      // cover 适配：保持比例填满单元格，多出来的部分裁掉
      const scale = Math.max(FRAME_CELL_WIDTH / video.videoWidth, FRAME_CELL_HEIGHT / video.videoHeight)
      const sw = FRAME_CELL_WIDTH / scale
      const sh = FRAME_CELL_HEIGHT / scale
      const sx = (video.videoWidth - sw) / 2
      const sy = (video.videoHeight - sh) / 2
      ctx.drawImage(video, sx, sy, sw, sh, dx, dy, FRAME_CELL_WIDTH, FRAME_CELL_HEIGHT)

      // 时间戳：半透明底 + 白字，压在任何画面上都可读
      const label = formatSeconds(t)
      ctx.font = '600 20px ui-sans-serif, system-ui, sans-serif'
      const textWidth = ctx.measureText(label).width
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
      ctx.fillRect(dx + 8, dy + 8, textWidth + 14, 30)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, dx + 15, dy + 30)
    }

    hooks?.onProgress?.(95)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const blob = await encodeAvifWithinBudget(imageData, resolveAvifParams(null))
    if (blob.size > EVIDENCE_MAX_BYTES) return { ok: false, reason: 'output_too_large' }
    hooks?.onProgress?.(100)
    return { ok: true, items: [{ blob, originalSize: file.size, encodedSize: blob.size }] }
  } catch {
    return { ok: false, reason: 'encode_failed' }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

/**
 * GIF 无 ffmpeg 时的降级：取首帧转静态 AVIF。
 *
 * 动图会丢动效，但比"直接拒绝"好——调用方会把这一项标为已就绪，用户在
 * UI 上看到的是静态图。浏览器对 GIF 的 `createImageBitmap` 只返回首帧。
 */
async function prepareGifFirstFrame(file: File | Blob): Promise<EvidenceResult> {
  try {
    const imageData = await imageDataFromFile(file)
    const blob = await encodeAvifWithinBudget(imageData, resolveAvifParams(null))
    if (blob.size > EVIDENCE_MAX_BYTES) return { ok: false, reason: 'output_too_large' }
    return { ok: true, items: [{ blob, originalSize: file.size, encodedSize: blob.size }] }
  } catch {
    return { ok: false, reason: 'encode_failed' }
  }
}

async function prepareMediaViaFfmpeg(
  file: File | Blob,
  hooks?: PrepareHooks,
): Promise<EvidenceResult> {
  const cfg = EVIDENCE_UPLOAD_CONFIG.video
  const dims = await videoDimensions(file).catch(() => ({ width: 0, height: 0 }))
  const initial: VideoEncodeParams = {
    crf: VIDEO_CRF_START,
    preset: VIDEO_PRESET_START,
    // 元数据读取失败兜底 720p；奇数边偶数化（yuv420p 要求）
    width: evenize(dims.width || 1280),
    height: evenize(dims.height || 720),
    fps: cfg.fps,
  }
  try {
    const outcome = await transcodeToAnimatedAvif(
      file,
      initial,
      {
        targetBytes: cfg.targetBytes,
        minHeight: cfg.minHeight,
        fpsMin: VIDEO_FPS_MIN,
        crfMax: VIDEO_CRF_MAX,
        presetMax: VIDEO_PRESET_MAX,
        maxRounds: cfg.maxLadderRounds,
      },
      hooks?.onProgress,
    )
    if (outcome.blob.size === 0) return { ok: false, reason: 'encode_failed' }
    return {
      ok: true,
      items: [
        {
          blob: outcome.blob,
          originalSize: file.size,
          encodedSize: outcome.blob.size,
          overTarget: outcome.overTarget,
        },
      ],
    }
  } catch (e) {
    if (e instanceof FfmpegCoreMissingError) return { ok: false, reason: 'ffmpeg_missing' }
    return { ok: false, reason: 'encode_failed' }
  }
}

// ---------- 总入口 ----------

/**
 * 证据文件预处理总入口：按 MIME 路由到对应重编码路径。
 * 任何路径都不存在原文件直传；拆帧动画返回 items.length > 1。
 */
export async function prepareEvidenceFile(
  file: File | Blob,
  overrides?: EvidenceUploadOverrides | null,
  hooks?: PrepareHooks,
): Promise<EvidenceResult> {
  const cfg = EVIDENCE_UPLOAD_CONFIG
  // 体积先行：超过内存保护上限直接拒绝入队（此时类型未知也无妨）
  if (file.size > cfg.maxEncodeInputBytes) return { ok: false, reason: 'too_large' }
  if (!canEncodeInBrowser()) return { ok: false, reason: 'environment' }

  // 归一化：image/jpg、image/apng、空 type（安卓/微信分享）都要能进对应分支
  const type = normalizeInputMime(file)
  const avifParams = resolveAvifParams(overrides)
  const webpParams = resolveWebpParams(overrides)

  try {
    switch (type) {
      // JPEG / PNG → 静帧 AVIF
      case 'image/jpeg':
      case 'image/png': {
        const imageData = await imageDataFromFile(file)
        const blob = await encodeAvifWithinBudget(imageData, avifParams)
        if (blob.size > EVIDENCE_MAX_BYTES) return { ok: false, reason: 'output_too_large' }
        return { ok: true, items: [{ blob, originalSize: file.size, encodedSize: blob.size }] }
      }

      // WebP → 保格式重编码
      case 'image/webp': {
        const { decode } = await import('@jsquash/webp')
        const imageData = await decode(await blobToArrayBuffer(file))
        if (!imageData) return { ok: false, reason: 'encode_failed' }
        const blob = await encodeWebpWithinBudget(imageData, webpParams)
        if (blob.size > EVIDENCE_MAX_BYTES) return { ok: false, reason: 'output_too_large' }
        return { ok: true, items: [{ blob, originalSize: file.size, encodedSize: blob.size }] }
      }

      // AVIF：先探测是否动画序列；静帧 decode→encode，动画逐帧拆分
      case 'image/avif': {
        const buffer = await blobToArrayBuffer(file)
        const kind = await detectAvifKind(buffer)
        if (kind === 'static') {
          const { decode } = await import('@jsquash/avif')
          const imageData = await decode(buffer)
          if (!imageData) return { ok: false, reason: 'encode_failed' }
          const blob = await encodeAvifWithinBudget(imageData, avifParams)
          if (blob.size > EVIDENCE_MAX_BYTES) return { ok: false, reason: 'output_too_large' }
          return { ok: true, items: [{ blob, originalSize: file.size, encodedSize: blob.size }] }
        }
        const frames = await decodeAvifFrames(buffer)
        if (frames.length === 0) return { ok: false, reason: 'encode_failed' }
        const items: EvidenceEncodedItem[] = []
        for (let i = 0; i < frames.length; i++) {
          hooks?.onProgress?.(Math.round(((i + 1) / frames.length) * 100))
          const frame = frames[i]
          if (!frame) continue
          try {
            // 每帧单独兜体积：单帧超限就跳过，不让它把整组上传拖挂
            const blob = await encodeAvifWithinBudget(frame, avifParams)
            if (blob.size > EVIDENCE_MAX_BYTES) continue
            items.push({ blob, originalSize: file.size, encodedSize: blob.size })
          } catch {
            // 单帧编码失败跳过
          }
        }
        if (items.length === 0) return { ok: false, reason: 'encode_failed' }
        return { ok: true, items }
      }

      // GIF / MP4 / WebM → ffmpeg 动画 AVIF
      case 'image/gif':
      case 'video/mp4':
      case 'video/webm':
      // iPhone 录屏是 .mov / quicktime；m4v 是部分安卓相机的容器。两者的
      // demuxer 在自建 ffmpeg 核心里已启用（--enable-demuxer=mov），
      // 之前只是 MIME 白名单没放行。
      case 'video/quicktime': {
        // 核心存在 → 走 ffmpeg 出动画 AVIF（保动效）；核心缺失 → 原生抽帧兜底。
        // 后者不下载任何 wasm，浏览器硬解视频，移动端也能跑。
        if (await probeFfmpegCore()) return await prepareMediaViaFfmpeg(file, hooks)
        if (type === 'image/gif') return await prepareGifFirstFrame(file)
        return await prepareVideoViaFrames(file, hooks)
      }

      default:
        return { ok: false, reason: 'unsupported_type' }
    }
  } catch {
    // 编码器抛错 / 产物为空统一按 encode_failed 呈现
    return { ok: false, reason: 'encode_failed' }
  }
}
