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
    port: 51640,
    open: true,
  },
})
