#!/usr/bin/env bash
#
# 构建 ffmpeg 7.x wasm 核心（含 libaom-av1 编码器 + AVIF muxer）。
#
# 产物 vendored 约定：把构建出的 ffmpeg-core.js / ffmpeg-core.wasm 拷贝到
# public/ffmpeg/，运行时由 src/lib/evidence-image.ts 按固定路径 /ffmpeg/ffmpeg-core.js
# 懒加载（Worker 内动态 import）。核心文件缺失/加载失败时，视频与 GIF 队列项
# 会以结构化失败原因 ffmpeg_missing 呈现，图片路径不受影响。
#
# 依赖：emsdk（本仓库不随附）。安装并激活后通过 EMSDK_PATH 指向其根目录：
#   git clone https://github.com/emscripten-core/emsdk.git ~/emsdk
#   ~/emsdk/emsdk install 3.1.74 && ~/emsdk/emsdk activate 3.1.74
# 用法：
#   EMSDK_PATH=~/emsdk bash scripts/build-ffmpeg-core.sh
#
# 线程模式说明：默认构建单线程核心（-sUSE_PTHREADS=0），无需部署 COOP/COEP 响应头，
# 管理端低频上传场景足够；如需多线程加速，把 SINGLE_THREAD=0 并给站点配置：
#   Cross-Origin-Opener-Policy: same-origin
#   Cross-Origin-Embedder-Policy: require-corp
set -euo pipefail

SINGLE_THREAD=${SINGLE_THREAD:-1}
FFMPEG_VERSION=${FFMPEG_VERSION:-7.1.1}
LIBAOM_VERSION=${LIBAOM_VERSION:-v3.9.1}
EMSDK_PATH=${EMSDK_PATH:-"$HOME/emsdk"}

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/.ffmpeg-build"
OUT_DIR="$ROOT_DIR/public/ffmpeg"

# ---------- 0) emsdk 环境 ----------
if [ ! -f "$EMSDK_PATH/emsdk_env.sh" ]; then
  echo "未找到 emsdk（$EMSDK_PATH）。请先安装，或用 EMSDK_PATH 指向其根目录。" >&2
  exit 1
fi
# shellcheck disable=SC1091
source "$EMSDK_PATH/emsdk_env.sh"
emcc --check

mkdir -p "$BUILD_DIR" "$OUT_DIR"

# ---------- 1) libaom → wasm 静态库 ----------
if [ ! -f "$BUILD_DIR/libaom-install/lib/libaom.a" ]; then
  if [ ! -d "$BUILD_DIR/libaom" ]; then
    git clone --depth 1 --branch "$LIBAOM_VERSION" https://github.com/jbeich/aom.git "$BUILD_DIR/libaom"
  fi
  mkdir -p "$BUILD_DIR/libaom/build"
  cd "$BUILD_DIR/libaom/build"
  emconfigure cmake .. \
    -DCMAKE_INSTALL_PREFIX="$BUILD_DIR/libaom-install" \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=0 \
    -DENABLE_TESTS=0 \
    -DENABLE_TOOLS=0 \
    -DENABLE_EXAMPLES=0 \
    -DENABLE_DOCS=0 \
    -DENABLE_UNIT_TESTS=0 \
    -DENABLE_NASM=0 \
    -DCONFIG_PIC=1 \
    -DCMAKE_C_FLAGS="-O3"
  emmake make -j"$(nproc)"
  emmake make install
else
  echo "libaom 已构建，跳过"
fi

# ---------- 2) ffmpeg configure + make ----------
if [ ! -d "$BUILD_DIR/ffmpeg" ]; then
  git clone --depth 1 --branch "n$FFMPEG_VERSION" https://github.com/FFmpeg/FFmpeg.git "$BUILD_DIR/ffmpeg"
fi
cd "$BUILD_DIR/ffmpeg"

if [ "$SINGLE_THREAD" = "1" ]; then
  THREAD_FLAGS="--disable-pthreads --disable-w32threads --disable-threads"
  PTHREAD_CFLAGS=""
else
  THREAD_FLAGS="--enable-pthreads"
  PTHREAD_CFLAGS="-sUSE_PTHREADS=1 -sPTHREAD_POOL_SIZE=4"
fi

emconfigure ./configure \
  --cc=emcc \
  --cxx=em++ \
  --ar=emar \
  --ranlib=emranlib \
  --nm=llvm-nm \
  --target-os=none \
  --arch=x86_32 \
  --cpu=generic \
  --enable-cross-compile \
  --disable-asm \
  --disable-stripping \
  --disable-programs \
  --disable-doc \
  --disable-debug \
  --disable-network \
  --disable-autodetect \
  --disable-everything \
  --enable-avcodec --enable-avformat --enable-avutil --enable-swscale --enable-swresample \
  --enable-libaom \
  --enable-encoder=libaom-av1 \
  --enable-muxer=avif \
  --enable-demuxer=mov,matroska,webm,gif \
  --enable-decoder=h264,hevc,vp8,vp9,av1,gif \
  --enable-protocol=file \
  --enable-filter=fps --enable-filter=scale --enable-filter=null --enable-filter=format \
  $THREAD_FLAGS \
  --extra-cflags="-O3 $PTHREAD_CFLAGS" \
  --extra-cxxflags="-O3 $PTHREAD_CFLAGS" \
  --extra-ldflags="$PTHREAD_CFLAGS -sALLOW_MEMORY_GROWTH=1"

emmake make -j"$(nproc)"

# ---------- 3) 链接 wasm 核心（ESM 模块化产物） ----------
if [ "$SINGLE_THREAD" = "1" ]; then
  LINK_FLAGS="-sENVIRONMENT=worker -sALLOW_MEMORY_GROWTH=1"
else
  LINK_FLAGS="-sENVIRONMENT=worker,web -sUSE_PTHREADS=1 -sPTHREAD_POOL_SIZE=4 -sALLOW_MEMORY_GROWTH=1"
fi

emcc -o "$OUT_DIR/ffmpeg-core.js" \
  -I. \
  -O3 \
  -sEXPORT_ES6=1 \
  -sMODULARIZE=1 \
  -sEXPORT_NAME=createFFmpegCore \
  -sINITIAL_MEMORY=33554432 \
  -sMAXIMUM_MEMORY=2147483648 \
  -sEXPORTED_RUNTIME_METHODS='[cwrap,ccall,FS,setValue,writeAsciiToMemory]' \
  -sFILESYSTEM=1 \
  $LINK_FLAGS \
  libavcodec/libavcodec.a \
  libavformat/libavformat.a \
  libavutil/libavutil.a \
  libswscale/libswscale.a \
  libswresample/libswresample.a \
  "$BUILD_DIR/libaom-install/lib/libaom.a" \
  -lm

# ---------- 4) 产物核对与部署说明 ----------
ls -lh "$OUT_DIR"
echo "构建完成："
echo "  $OUT_DIR/ffmpeg-core.js"
echo "  $OUT_DIR/ffmpeg-core.wasm"
echo "两个文件已直接写入 public/ffmpeg/（vendored），随站点静态资源一起部署即可；"
echo "运行时按 /ffmpeg/ffmpeg-core.js 懒加载，缺失时视频/GIF 队列项将提示核心未就绪。"
