/**
 * evidence-image 纯逻辑单测：入队守卫、参数合并、降体积阶梯顺序、avis 探测分发。
 * jsdom 无真实编码器，不测真实编码——jsquash 动态 import 用 vi.mock 拦截，
 * 浏览器全局（OffscreenCanvas / createImageBitmap / ImageDecoder）用 vi.stubGlobal 伪造。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EVIDENCE_UPLOAD_CONFIG, resolveAvifParams, resolveWebpParams } from '@/config/evidence-upload'
import {
  canEncodeInBrowser,
  detectAvifKind,
  frameGridSize,
  planFrameTimes,
  planLadder,
  prepareEvidenceFile,
  randomSetId,
  VIDEO_CRF_MAX,
  type LadderOptions,
  type VideoEncodeParams,
} from './evidence-image'

// 编码产物固定 64 字节 ArrayBuffer；decode 返回最小 ImageData 形状
vi.mock('@jsquash/avif', () => ({
  encode: vi.fn(async () => new ArrayBuffer(64)),
  decode: vi.fn(async () => ({ data: new Uint8Array(16), width: 2, height: 2 })),
}))
vi.mock('@jsquash/webp', () => ({
  encode: vi.fn(async () => new ArrayBuffer(64)),
  decode: vi.fn(async () => ({ data: new Uint8Array(16), width: 2, height: 2 })),
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

/** 伪造编码所需的浏览器全局（canEncodeInBrowser 守卫 + 帧绘制） */
function stubCanvasGlobals() {
  vi.stubGlobal('createImageBitmap', async () => ({ width: 2, height: 2, close: () => {} }))
  const fakeCtx = {
    drawImage: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(16), width: 2, height: 2 }),
  }
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext() {
        return fakeCtx
      }
    },
  )
}

/** 伪造 ImageDecoder：frameCount 决定 avis 动画/静帧分发 */
function stubImageDecoder(frameCount: number) {
  vi.stubGlobal(
    'ImageDecoder',
    class {
      tracks = { ready: Promise.resolve(), selectedTrack: { frameCount } }
      async decode() {
        return { image: { displayWidth: 2, displayHeight: 2, close: () => {} } }
      }
      close() {}
    },
  )
}

describe('入队守卫', () => {
  it('未知类型 → unsupported_type（不依赖编码能力也要能判类型）', async () => {
    stubCanvasGlobals()
    const file = new File([new ArrayBuffer(8)], 'a.bmp', { type: 'image/bmp' })
    expect(await prepareEvidenceFile(file)).toEqual({ ok: false, reason: 'unsupported_type' })
  })

  it('原始文件超过 maxEncodeInputBytes → too_large（体积判定先行，拒绝入队）', async () => {
    const file = new File([new ArrayBuffer(EVIDENCE_UPLOAD_CONFIG.maxEncodeInputBytes + 1)], 'big.png', {
      type: 'image/png',
    })
    expect(await prepareEvidenceFile(file)).toEqual({ ok: false, reason: 'too_large' })
  })

  it('缺 OffscreenCanvas/createImageBitmap → environment', async () => {
    // jsdom 默认没有这两个 API，直接调用即为环境失败
    expect(canEncodeInBrowser()).toBe(false)
    const file = new File([new ArrayBuffer(8)], 'a.png', { type: 'image/png' })
    expect(await prepareEvidenceFile(file)).toEqual({ ok: false, reason: 'environment' })
  })
})

describe('参数合并（overrides 覆盖 config 默认）', () => {
  it('overrides 全覆盖', () => {
    expect(resolveAvifParams({ avifQuality: 80, avifSpeed: 2, avifLossless: true })).toEqual({
      quality: 80,
      speed: 2,
      lossless: true,
    })
    expect(resolveWebpParams({ webpQuality: 60 })).toEqual({ quality: 60 })
  })

  it('缺省回退 config 默认', () => {
    expect(resolveAvifParams()).toEqual(EVIDENCE_UPLOAD_CONFIG.avif)
    expect(resolveWebpParams({})).toEqual(EVIDENCE_UPLOAD_CONFIG.webp)
  })

  it('越界/非法值夹取到合法区间而不是透传', () => {
    expect(resolveAvifParams({ avifQuality: 500 }).quality).toBe(100)
    expect(resolveAvifParams({ avifSpeed: -3 }).speed).toBe(0)
    // 非布尔值一律回退默认（防 localStorage 篡改）
    expect(resolveAvifParams({ avifLossless: 1 as unknown as boolean }).lossless).toBe(
      EVIDENCE_UPLOAD_CONFIG.avif.lossless,
    )
  })
})

describe('降体积阶梯 planLadder（固定顺序：CRF → 分辨率 → fps → cpu-used）', () => {
  const opts: LadderOptions = {
    targetBytes: 1000,
    minHeight: 720,
    fpsMin: 12,
    crfMax: VIDEO_CRF_MAX,
    presetMax: 8,
    maxRounds: 10,
  }
  const base: VideoEncodeParams = { crf: 30, width: 1920, height: 1080, fps: 60, preset: 4 }

  it('超目标 → 先升 CRF（降质量），其余参数不动', () => {
    expect(planLadder(base, 2000, 0, opts)).toEqual({ ...base, crf: 35 })
  })

  it('CRF 到上限后 → 等比降分辨率', () => {
    const next = planLadder({ ...base, crf: VIDEO_CRF_MAX }, 2000, 1, opts)
    expect(next).toEqual({ crf: VIDEO_CRF_MAX, width: 1440, height: 810, fps: 60, preset: 4 })
  })

  it('高度触及 minHeight 下限（900 → 720），宽度等比修正', () => {
    const next = planLadder({ ...base, crf: VIDEO_CRF_MAX, width: 1600, height: 900 }, 2000, 2, opts)
    expect(next).toMatchObject({ height: 720, width: 1280 })
  })

  it('分辨率已到 720p 下限后 → 降 fps', () => {
    const next = planLadder({ ...base, crf: VIDEO_CRF_MAX, width: 1280, height: 720 }, 2000, 2, opts)
    expect(next).toMatchObject({ height: 720, fps: 30 })
  })

  it('fps 到下限后 → 升 -cpu-used', () => {
    const next = planLadder({ ...base, crf: VIDEO_CRF_MAX, width: 1280, height: 720, fps: 12 }, 2000, 3, opts)
    expect(next).toMatchObject({ fps: 12, preset: 5 })
  })

  it('阶梯全部用尽 → null（调用方收尾并标记 overTarget）', () => {
    const exhausted: VideoEncodeParams = {
      crf: VIDEO_CRF_MAX,
      width: 1280,
      height: 720,
      fps: 12,
      preset: 8,
    }
    expect(planLadder(exhausted, 2000, 4, opts)).toBeNull()
  })

  it('未超目标体积不动', () => {
    expect(planLadder(base, opts.targetBytes, 0, opts)).toBeNull()
  })

  it('maxLadderRounds 截断：round 计满即停止迭代', () => {
    expect(planLadder(base, 2000, 3, { ...opts, maxRounds: 3 })).toBeNull()
    expect(planLadder(base, 2000, 2, { ...opts, maxRounds: 3 })).not.toBeNull()
  })
})

describe('avis 探测分发（mock ImageDecoder）', () => {
  it('frameCount > 1 → animated', async () => {
    stubImageDecoder(3)
    expect(await detectAvifKind(new ArrayBuffer(8))).toBe('animated')
  })

  it('frameCount = 1 → static', async () => {
    stubImageDecoder(1)
    expect(await detectAvifKind(new ArrayBuffer(8))).toBe('static')
  })

  it('无 ImageDecoder 能力 → 按静帧处理', async () => {
    expect(await detectAvifKind(new ArrayBuffer(8))).toBe('static')
  })
})

describe('prepareEvidenceFile 按探测结果分发', () => {
  it('静帧 AVIF → 单产出', async () => {
    stubCanvasGlobals()
    stubImageDecoder(1)
    const file = new File([new ArrayBuffer(8)], 'a.avif', { type: 'image/avif' })
    const result = await prepareEvidenceFile(file)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const first = result.items[0]
      expect(result.items).toHaveLength(1)
      expect(first?.blob.type).toBe('image/avif')
      expect(first?.encodedSize).toBe(64)
      expect(first?.originalSize).toBe(8)
    }
  })

  it('动画 AVIF（avis）→ 逐帧拆分为 N 个静帧产物', async () => {
    stubCanvasGlobals()
    stubImageDecoder(3)
    const file = new File([new ArrayBuffer(8)], 'anim.avif', { type: 'image/avif' })
    const result = await prepareEvidenceFile(file)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items).toHaveLength(3)
      for (const item of result.items) {
        expect(item.blob.type).toBe('image/avif')
        expect(item.encodedSize).toBe(64)
      }
    }
  })

  it('WebP 保格式重编码 → 单产出 image/webp', async () => {
    stubCanvasGlobals()
    const file = new File([new ArrayBuffer(8)], 'a.webp', { type: 'image/webp' })
    const result = await prepareEvidenceFile(file)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const first = result.items[0]
      expect(result.items).toHaveLength(1)
      expect(first?.blob.type).toBe('image/webp')
    }
  })
})

describe('随机命名', () => {
  it('setId 满足后端 ^[A-Za-z0-9_-]{6,64}$ 且两次生成不相同', () => {
    const a = randomSetId()
    const b = randomSetId()
    expect(a).toMatch(/^[A-Za-z0-9_-]{6,64}$/)
    expect(b).toMatch(/^[A-Za-z0-9_-]{6,64}$/)
    expect(a).not.toBe(b)
  })
})

describe('视频抽帧（不依赖 ffmpeg 的原生路径）', () => {
  it('抽帧时间点均匀落在 (0, duration) 开区间内，避开首尾', () => {
    const times = planFrameTimes(90)
    expect(times.length).toBe(9)
    expect(Math.min(...times)).toBeGreaterThan(0)
    expect(Math.max(...times)).toBeLessThan(90)
    // 单调递增
    for (let i = 1; i < times.length; i++) {
      expect(times[i] as number).toBeGreaterThan(times[i - 1] as number)
    }
    // 90 秒 / 10 等分 → 第一帧 9 秒
    expect(times[0]).toBeCloseTo(9, 5)
  })

  it('时长无效或过短时退化为单帧，不抛错', () => {
    expect(planFrameTimes(Number.NaN)).toEqual([0])
    expect(planFrameTimes(0)).toEqual([0])
    expect(planFrameTimes(0.4)).toEqual([0])
  })

  it('抽帧数量受 maxFrames 约束且不超过 9', () => {
    expect(planFrameTimes(120, 3).length).toBe(3)
    expect(planFrameTimes(120, 99).length).toBe(9)
    expect(planFrameTimes(120, 0).length).toBe(1)
  })

  it('网格尺寸：1 帧单格、9 帧 3×3，且宽高随列数变化', () => {
    const one = frameGridSize(1)
    expect(one.cols).toBe(1)
    expect(one.rows).toBe(1)

    const nine = frameGridSize(9)
    expect(nine.cols).toBe(3)
    expect(nine.rows).toBe(3)
    // 3 列 3 行：3*480 + 4*8
    expect(nine.width).toBe(3 * 480 + 4 * 8)
    expect(nine.height).toBe(3 * 270 + 4 * 8)

    const two = frameGridSize(2)
    expect(two.cols).toBe(2)
    expect(two.rows).toBe(1)

    // 超过上限时按 9 帧算，不会因调用方传错而无限放大画布
    expect(frameGridSize(50).rows).toBe(3)
  })
})

describe('体积预算常量与后端上限的一致性', () => {
  it('编码收敛目标必须小于后端 5MiB 硬上限', () => {
    // 回归：曾把 targetBytes 设成 10MiB，产物被判"达标"后仍被后端 413
    expect(EVIDENCE_UPLOAD_CONFIG.video.targetBytes).toBeLessThan(5 * 1024 * 1024)
  })

  it('阶梯轮数足够走完 CRF 区间（步长 5、30→55 需 5 轮）', () => {
    expect(EVIDENCE_UPLOAD_CONFIG.video.maxLadderRounds).toBeGreaterThanOrEqual(5)
  })

  it('输入上限不小于 10MiB（否则手机短视频会被直接拒收）', () => {
    expect(EVIDENCE_UPLOAD_CONFIG.maxEncodeInputBytes).toBeGreaterThanOrEqual(10 * 1024 * 1024)
  })
})
