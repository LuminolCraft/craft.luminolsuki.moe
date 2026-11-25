# 构建 @ffmpeg/ffmpeg 0.12 能直接加载的 ffmpeg-core，并额外打开 libaom-av1 + avif muxer。
#
# 为什么不能自己用 emcc 链接静态库（旧脚本的做法，已废弃）：
#   @ffmpeg/ffmpeg 的 core 不只是一个 ffmpeg 库聚合体，它还要求
#   ① 上游**修补过**的 fftools（把 main 改名成 ffmpeg，可重复调用）；
#   ② `src/bind/ffmpeg/bind.js` 这套 JS 胶水（--pre-js 注入）；
#   ③ 只导出 `_ffmpeg / _malloc / _abort`（见 src/bind/ffmpeg/export.js）。
#   缺任何一项，`ffmpeg.load()` 就会失败或 `exec()` 不可用。
#
# 所以这里复用 ffmpegwasm 官方构建脚本（钉 tag），只做两件事不同：
#   1. 多编一个 libaom，并在 configure 时 `--enable-libaom --enable-encoder=libaom-av1 --enable-muxer=avif`；
#   2. 跳过 x264 / x265 / libvpx / lame / theora / vorbis / opus / libass / zimg 等
#      与「视频转 AVIF」无关的库（省 1 小时以上构建时间）。
#
# 产物：ffmpeg-core.js（ESM）+ ffmpeg-core.wasm，由 scripts/build-ffmpeg-core.sh 取出。
FROM emscripten/emsdk:3.1.40 AS build

# 上游 tag：必须与 @ffmpeg/ffmpeg 版本配套（本项目装的是 ^0.12.15，配套 core 为 0.12.10）
ARG FFMPEGWASM_REF=v0.12.10
# FFmpeg 版本：ffmpegwasm 的 src/fftools 补丁是按 n5.1.4 打的，不能改
ARG FFMPEG_VERSION=n5.1.4
# libaom：选与 emsdk 3.1.40 同期的版本，避免新版 C 要求过高
ARG AOM_VERSION=v3.6.1

ENV INSTALL_DIR=/opt \
    EM_PKG_CONFIG_PATH=/opt/lib/pkgconfig:/emsdk/upstream/emscripten/system/lib/pkgconfig \
    PKG_CONFIG_PATH=/opt/lib/pkgconfig:/emsdk/upstream/emscripten/system/lib/pkgconfig \
    CFLAGS="-I/opt/include" \
    CXXFLAGS="-I/opt/include" \
    LDFLAGS="-L/opt/lib" \
    FFMPEG_ST=1

ENV EM_TOOLCHAIN_FILE=$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake

RUN apt-get update && apt-get install -y --no-install-recommends \
      pkg-config autoconf automake libtool ragel git cmake ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 上游构建脚本 + bind / fftools 补丁（钉 tag，避免上游漂移导致产物不兼容）
RUN git clone --depth 1 --branch "$FFMPEGWASM_REF" https://github.com/ffmpegwasm/ffmpeg.wasm /ffmpegwasm

# ---------- 1) libaom（AV1 编码器） ----------
# 不复用 upstream 的 build/aom.sh：它不传 -DCMAKE_BUILD_TYPE，而 aom 的
# build/cmake/compiler_tests.cmake 会执行 `string(TOUPPER ${CMAKE_BUILD_TYPE} config)`，
# 变量为空时参数不足直接 CMake Error（"Configuring incomplete"）。显式给 Release 即可。
#
# aom 的 CMake 也不产出 pkg-config 文件，而 ffmpeg 的 configure 靠 pkg-config 探测
# libaom，所以另外 COPY 一份 aom.pc 进去（值必须真实，否则链接阶段找不到 -laom）。
RUN git clone --depth 1 --branch "$AOM_VERSION" https://aomedia.googlesource.com/aom /aom \
    && mkdir -p /aom/cmbuild && cd /aom/cmbuild \
    && emcmake cmake .. \
         -DCMAKE_BUILD_TYPE=Release \
         -DCMAKE_INSTALL_PREFIX="$INSTALL_DIR" \
         -DCMAKE_TOOLCHAIN_FILE="$EM_TOOLCHAIN_FILE" \
         -DBUILD_SHARED_LIBS=0 \
         -DAOM_TARGET_CPU=generic \
         -DCONFIG_RUNTIME_CPU_DETECT=0 \
         -DCONFIG_WEBM_IO=0 \
         -DENABLE_DOCS=0 \
         -DENABLE_TESTS=0 \
         -DENABLE_EXAMPLES=0 \
         -DENABLE_TOOLS=0 \
         -DAOM_EXTRA_C_FLAGS="-I$INSTALL_DIR/include" \
         -DAOM_EXTRA_CXX_FLAGS="-I$INSTALL_DIR/include" \
    && emmake make -j"$(nproc)" install

COPY aom.pc /opt/lib/pkgconfig/aom.pc

RUN test -f /opt/lib/libaom.a && test -f /opt/include/aom/aom.h

# ---------- 2) FFmpeg（只启用证据链路需要的组件） ----------
RUN git clone --depth 1 --branch "$FFMPEG_VERSION" https://github.com/FFmpeg/FFmpeg.git /ffmpeg \
    && cp /ffmpegwasm/build/ffmpeg.sh /ffmpeg/build.sh \
    && cp -r /ffmpegwasm/src/bind /ffmpegwasm/src/fftools /ffmpeg/src/ \
    && cd /ffmpeg && bash build.sh \
         --disable-everything \
         --enable-libaom \
         --enable-encoder=libaom-av1 \
         --enable-muxer=avif \
         --enable-demuxer=mov,matroska,webm,gif,image2 \
         --enable-decoder=h264,hevc,vp8,vp9,av1,gif,png,mjpeg \
         --enable-protocol=file \
         --enable-filter=fps,scale,format,null

# ---------- 3) 链接 wasm 核心（ESM，@ffmpeg/ffmpeg 0.12 要 ESM） ----------
# ffmpeg-wasm.sh 里硬编码了 -sUSE_SDL=2；虽然本项目 --disable-programs 用不到 SDL，
# 但该 flag 会让 emcc 去下 sdl2 port，提前 build 掉避免链接阶段才失败。
RUN embuilder build sdl2

RUN mkdir -p /ffmpeg/dist/esm \
    && cp /ffmpegwasm/build/ffmpeg-wasm.sh /ffmpeg/build-wasm.sh \
    && cd /ffmpeg && bash build-wasm.sh \
         -laom -lm \
         -sEXPORT_ES6 \
         -o dist/esm/ffmpeg-core.js

# 产物自检：编码器与 muxer 必须真的编进去了，否则前端会「加载成功但转码失败」
RUN grep -qa 'libaom-av1' /ffmpeg/dist/esm/ffmpeg-core.wasm \
    && test -s /ffmpeg/dist/esm/ffmpeg-core.js \
    && ls -lh /ffmpeg/dist/esm/

FROM scratch AS exportor
COPY --from=build /ffmpeg/dist/esm/ffmpeg-core.js /ffmpeg-core.js
COPY --from=build /ffmpeg/dist/esm/ffmpeg-core.wasm /ffmpeg-core.wasm
