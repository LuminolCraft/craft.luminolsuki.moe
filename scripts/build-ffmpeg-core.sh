#!/usr/bin/env bash
#
# 构建 ffmpeg wasm 核心（libaom-av1 编码器 + avif muxer），产物写入 public/ffmpeg/。
#
# 产物用途：src/lib/evidence-image.ts 的「GIF / MP4 / WebM → 动画 AVIF」路径。
# 核心缺失时该路径返回 ffmpeg_missing，并自动降级为原生抽帧（静态 AVIF 证据图）。
#
# 为什么走 Docker：@ffmpeg/ffmpeg 0.12 的 core 必须由 ffmpegwasm 官方那套构建产出
# （修补过的 fftools + bind.js 胶水 + 只导出 _ffmpeg/_malloc/_abort），自己用 emcc
# 链静态库得不到可加载的模块。详见 scripts/ffmpeg-core/Dockerfile 顶部说明。
#
# 依赖：Docker（含 buildx）。本机没有也能用——CI 的 build-ffmpeg-core workflow
# 会跑同一条命令，产物挂到 Release 后由构建期自动下载（见 scripts/fetch-ffmpeg-core.mjs）。
#
# 用法：
#   bash scripts/build-ffmpeg-core.sh
#   FFMPEGWASM_REF=v0.12.10 AOM_VERSION=v3.6.1 bash scripts/build-ffmpeg-core.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/public/ffmpeg"
CONTEXT_DIR="$ROOT_DIR/scripts/ffmpeg-core"

if ! command -v docker >/dev/null 2>&1; then
  echo "未找到 docker。本地构建需要 Docker；也可以用 CI（Actions → build-ffmpeg-core）。" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

ARGS=()
[ -n "${FFMPEGWASM_REF:-}" ] && ARGS+=(--build-arg "FFMPEGWASM_REF=$FFMPEGWASM_REF")
[ -n "${AOM_VERSION:-}" ] && ARGS+=(--build-arg "AOM_VERSION=$AOM_VERSION")

echo "构建 ffmpeg 核心（首次约 30–50 分钟，之后有层缓存会快很多）…"
docker buildx build \
  --file "$CONTEXT_DIR/Dockerfile" \
  --output "type=local,dest=$TMP_DIR" \
  "${ARGS[@]}" \
  "$CONTEXT_DIR"

mkdir -p "$OUT_DIR"
cp "$TMP_DIR/ffmpeg-core.js" "$OUT_DIR/ffmpeg-core.js"
cp "$TMP_DIR/ffmpeg-core.wasm" "$OUT_DIR/ffmpeg-core.wasm"

# 自检：编进去了才算可用（Dockerfile 里已查一次，这里防产物被替换/截断）
if ! grep -qa 'libaom-av1' "$OUT_DIR/ffmpeg-core.wasm"; then
  echo "产物不含 libaom-av1 编码器，AVIF 转码不可用。" >&2
  exit 1
fi

ls -lh "$OUT_DIR/ffmpeg-core.js" "$OUT_DIR/ffmpeg-core.wasm"
echo
echo "完成。两个文件已写入 public/ffmpeg/（该目录不进版本库）："
echo "  $OUT_DIR/ffmpeg-core.js"
echo "  $OUT_DIR/ffmpeg-core.wasm"
echo
echo "若要给 CI/Netlify 用，把它们上传到 Release，再配置："
echo "  FFMPEG_CORE_URL / FFMPEG_CORE_WASM_URL"
echo "  FFMPEG_CORE_SHA256 / FFMPEG_CORE_WASM_SHA256"
echo "  FFMPEG_CORE_STRICT=1"
