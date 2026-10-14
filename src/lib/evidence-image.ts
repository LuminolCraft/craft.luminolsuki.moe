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

/** 轻量探测核心文件是否已部署到 public/ffmpeg/（用于弹窗提前提示，不发大请求） */
export async function probeFfmpegCore(): Promise<boolean> {
  try {
    const res = await fetch(`${FFMPEG_CORE_BASE}ffmpeg-core.js`, { method: 'HEAD' })
    return res.ok
  } catch {
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

/** 证据产物文件名：evi_{token}.{ext}；拆帧序列带序号 evi_{token}_{index}.{ext} */
export function evidenceFileName(ext: string, index?: number): string {
  const token = randomToken()
  return index === undefined ? `evi_${token}.${ext}` : `evi_${token}_${index}.${ext}`
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
async function decodeAvifFrames(buffer: ArrayBuffer): Promise<ImageData[]> {
  const decoder = new ImageDecoder({ data: buffer, type: 'image/avif' })
  try {
    await decoder.tracks.ready
    const count = decoder.tracks.selectedTrack?.frameCount ?? 1
    const frames: ImageData[] = []
    for (let i = 0; i < count; i++) {
      const { image } = await decoder.decode({ frameIndex: i })
      try {
        frames.push(frameToImageData(image))
      } finally {
        image.close()
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

  const type = file.type.toLowerCase()
  const avifParams = resolveAvifParams(overrides)
  const webpParams = resolveWebpParams(overrides)

  try {
    switch (type) {
      // JPEG / PNG → 静帧 AVIF
      case 'image/jpeg':
      case 'image/png': {
        const imageData = await imageDataFromFile(file)
        const blob = await encodeAvif(imageData, avifParams)
        return { ok: true, items: [{ blob, originalSize: file.size, encodedSize: blob.size }] }
      }

      // WebP → 保格式重编码
      case 'image/webp': {
        const { decode } = await import('@jsquash/webp')
        const imageData = await decode(await blobToArrayBuffer(file))
        const blob = await encodeWebp(imageData, webpParams)
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
          const blob = await encodeAvif(imageData, avifParams)
          return { ok: true, items: [{ blob, originalSize: file.size, encodedSize: blob.size }] }
        }
        const frames = await decodeAvifFrames(buffer)
        const items: EvidenceEncodedItem[] = []
        for (let i = 0; i < frames.length; i++) {
          hooks?.onProgress?.(Math.round(((i + 1) / frames.length) * 100))
          const frame = frames[i]
          if (!frame) continue
          const blob = await encodeAvif(frame, avifParams)
          items.push({ blob, originalSize: file.size, encodedSize: blob.size })
        }
        return { ok: true, items }
      }

      // GIF / MP4 / WebM → ffmpeg 动画 AVIF
      case 'image/gif':
      case 'video/mp4':
      case 'video/webm':
        return await prepareMediaViaFfmpeg(file, hooks)

      default:
        return { ok: false, reason: 'unsupported_type' }
    }
  } catch {
    // 编码器抛错 / 产物为空统一按 encode_failed 呈现
    return { ok: false, reason: 'encode_failed' }
  }
}
