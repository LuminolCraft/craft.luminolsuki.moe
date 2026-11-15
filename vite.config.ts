import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8', timeout: 3000 }).trim()
  } catch {
    return 'dev'
  }
}

const appVersion = process.env.COMMIT_REF
  || process.env.CF_PAGES_COMMIT_SHA
  || process.env.GIT_COMMIT
  || getGitHash()

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    vue(),
    vueDevTools(),
  ],
  worker: {
    // @jsquash/avif 与 @ffmpeg/ffmpeg 的 wasm worker 内部含动态 import（代码分割），
    // 默认 iife 格式不支持，必须产出 ESM worker（type: 'module'）
    format: 'es',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    // 优化构建输出
    minify: 'terser',
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'vue-i18n', 'pinia'],
          'markdown': ['marked'],
          'highlight': ['highlight.js'],
        },
      },
    },
    // 启用CSS代码分割
    cssCodeSplit: true,
    // 生成sourcemap
    sourcemap: false,
  },
  // 开发服务器配置
  server: {
    // 显式绑 IPv4 loopback。省略时 vite 监听 'localhost'，Node 按 hosts 解析顺序
    // 只绑到 ::1（netstat 可见仅 [::1]:51640）——走 IPv4 的连接全部被拒。
    // 另外代理开 TUN 模式时，`localhost` 的 DNS 解析可能被 fake-ip 劫持
    // （Firefox 自带 DoH 更容易命中），解析成假 IP 后连接根本到不了本机。
    // IP 字面量不经过 DNS，两层问题都绕开。访问地址固定用 http://127.0.0.1:51640
    host: '127.0.0.1',
    port: 51640,
    open: true,
  },
})
