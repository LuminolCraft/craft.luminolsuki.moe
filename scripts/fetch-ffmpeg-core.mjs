#!/usr/bin/env node
/**
 * 拉取 / 校验 ffmpeg wasm 核心（视频证据转码的唯一前提）。
 *
 * 背景（审计 P0-1）：核心文件此前**从未入库**，`public/ffmpeg/` 与 `dist/ffmpeg/`
 * 都不存在，于是视频/GIF 路径 100% 返回 `ffmpeg_missing`——这条分支实际上从上线
 * 起就是死代码。核心由 `scripts/build-ffmpeg-core.sh` 从源码编译（emsdk + libaom
 * + FFmpeg 7.1.1，产物 25–35MB），不适合进版本库（公开仓库不该背这个体积），
 * 因此改为构建期拉取。
 *
 * 核心怎么来：`.github/workflows/build-ffmpeg-core.yml`（手动触发或打
 * `ffmpeg-core-v*` tag）在 ubuntu-latest 上用 emsdk 编一次 libaom + FFmpeg 7，
 * 产物挂到 Release。把 Release 直链配到下面前四个环境变量即可。
 *
 * 用法：
 *   FFMPEG_CORE_URL=https://.../ffmpeg-core.js \
 *   FFMPEG_CORE_WASM_URL=https://.../ffmpeg-core.wasm \
 *   FFMPEG_CORE_SHA256_URL=<ffmpeg-core.js 的 sha256> \
 *   FFMPEG_CORE_WASM_SHA256_URL=<ffmpeg-core.wasm 的 sha256> \
 *   node scripts/fetch-ffmpeg-core.mjs
 *
 * 已有产物时直接跳过（本地编译过就无需下载）。缺失且未配置 URL 时：
 * - 默认 **只警告不失败**（站点其它功能照常部署，视频证据项在 UI 上明确提示
 *   "核心未就绪"并由 `probeFfmpegCore` 挡住）；
 * - 设 `FFMPEG_CORE_STRICT=1` 则硬失败。上线视频功能前应当打开它，避免又出现
 *   "分支存在但从不可用"的静默缺陷。
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'ffmpeg')

const TARGETS = [
  {
    file: 'ffmpeg-core.js',
    url: process.env.FFMPEG_CORE_URL,
    sha256: process.env.FFMPEG_CORE_SHA256,
  },
  {
    file: 'ffmpeg-core.wasm',
    url: process.env.FFMPEG_CORE_WASM_URL,
    sha256: process.env.FFMPEG_CORE_WASM_SHA256,
  },
]

const STRICT = process.env.FFMPEG_CORE_STRICT === '1'

function log(message) {
  console.log(`[ffmpeg-core] ${message}`)
}

async function download(target) {
  const res = await fetch(target.url)
  if (!res.ok) throw new Error(`${target.file} 下载失败：HTTP ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (target.sha256 && actual !== target.sha256.toLowerCase()) {
    throw new Error(`${target.file} sha256 不匹配：期望 ${target.sha256}，实际 ${actual}`)
  }
  if (!target.sha256) {
    log(`警告：${target.file} 未提供 sha256，已跳过完整性校验（实际 ${actual}）`)
  }
  writeFileSync(join(OUT_DIR, target.file), bytes)
  log(`${target.file} 已写入（${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB）`)
}

async function main() {
  const missing = TARGETS.filter((t) => !existsSync(join(OUT_DIR, t.file)))
  if (missing.length === 0) {
    log('产物已存在，跳过下载')
    return
  }

  const downloadable = missing.filter((t) => !!t.url)
  if (downloadable.length !== missing.length) {
    const message =
      `缺少 ${missing.map((t) => t.file).join(' / ')}，且未配置下载地址。` +
      '视频 / GIF 证据将不可用（图片路径不受影响）。' +
      '配置 FFMPEG_CORE_URL 与 FFMPEG_CORE_WASM_URL（建议同时给 sha256）后重跑；' +
      '或本地执行 scripts/build-ffmpeg-core.sh 生成。'
    if (STRICT) throw new Error(message)
    log(`警告：${message}`)
    return
  }

  mkdirSync(OUT_DIR, { recursive: true })
  for (const target of downloadable) {
    await download(target)
  }
}

main().catch((err) => {
  console.error(`[ffmpeg-core] ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
