<script setup lang="ts">
/**
 * 举报附件上传队列（玩家侧）。
 *
 * 与 `admin/BansView.vue` 的证据队列同源（同一套 `prepareEvidenceFile` 重编码管线），
 * 但有两个刻意的差异：
 * 1. **不读 localStorage 压缩覆盖参数**：那是管理端面板的调试项，玩家入口继承
 *    管理员的 lossless 设置只会白耗手机 CPU；
 * 2. **并发闸**：图片最多 2 个、视频最多 1 个同时编码。没有闸时选 10 张 12MP
 *    照片会同时持有 ImageBitmap + canvas + ImageData 三份（约 1.4GB），移动端
 *    标签页会被系统直接杀掉。
 *
 * 上传由父组件做（先把举报单建出来拿到 id，再逐个 POST 附件），本组件只负责
 * "把原始文件变成合规的 AVIF/WebP" 并暴露 ready 项。
 */
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { prepareEvidenceFile, probeFfmpegCore, type EvidenceFailureReason } from '@/lib/evidence-image'
import { EVIDENCE_MAX_BYTES } from '@/config/evidence-upload'
import type { ReportEvidenceItem } from '@/types/nexus'

interface QueueRow {
  key: string
  file: File
  status: 'pending' | 'compressing' | 'ready' | 'failed'
  progress: number
  previewUrl: string | null
  /** 已编码产物（拆帧会产出多帧，这里按帧展开成多行） */
  outputs: ReportEvidenceItem[]
  reason: EvidenceFailureReason | null
  isVideo: boolean
}

const props = withDefaults(defineProps<{ max?: number; disabled?: boolean }>(), {
  max: 3,
  disabled: false,
})

const emit = defineEmits<{ 'update:items': [items: ReportEvidenceItem[]] }>()

const { t } = useI18n()

const rows = reactive<QueueRow[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const ffmpegReady = ref<boolean | null>(null)
const dragging = ref(false)

/** 并发闸：图片 2、视频 1（视频走 ffmpeg wasm，同时两个必然 OOM） */
const MAX_CONCURRENT_IMAGE = 2
const MAX_CONCURRENT_VIDEO = 1
let runningImage = 0
let runningVideo = 0

/** 待调度队列（FIFO） */
const pendingFiles: Array<{ key: string; file: File }> = []

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime'

const readyItems = computed<ReportEvidenceItem[]>(() =>
  rows.filter((r) => r.status === 'ready').flatMap((r) => r.outputs),
)

const busy = computed(() => rows.some((r) => r.status === 'compressing' || r.status === 'pending'))

function syncItems() {
  emit('update:items', readyItems.value)
}

function isVideoFile(file: File): boolean {
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('video/')) return true
  if (type === 'image/gif') return true
  // 空 type 的文件（安卓选择器）：按扩展名兜底
  const name = file.name.toLowerCase()
  return /\.(mp4|webm|mov|m4v|gif)$/.test(name)
}

function reasonKey(reason: EvidenceFailureReason): string {
  return `reports.evidence.reason.${reason}`
}

function addFiles(files: FileList | File[]) {
  if (props.disabled) return
  const list = Array.from(files)
  const room = props.max - rows.length
  for (const file of list.slice(0, Math.max(0, room))) {
    const key = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    rows.push({
      key,
      file,
      status: 'pending',
      progress: 0,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      outputs: [],
      reason: null,
      isVideo: isVideoFile(file),
    })
    pendingFiles.push({ key, file })
  }
  void drain()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files) addFiles(input.files)
  // 允许重复选择同一文件
  input.value = ''
}

function onPaste(event: ClipboardEvent) {
  if (props.disabled) return
  const items = event.clipboardData?.items
  if (!items) return
  const files: File[] = []
  for (const item of items) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (file) files.push(file)
  }
  if (files.length > 0) {
    event.preventDefault()
    addFiles(files)
  }
}

function onDrop(event: DragEvent) {
  dragging.value = false
  if (props.disabled) return
  const files = event.dataTransfer?.files
  if (files && files.length > 0) addFiles(files)
}

/** 调度：按并发上限从待调度队列取任务 */
async function drain() {
  while (pendingFiles.length > 0) {
    const nextIndex = pendingFiles.findIndex((p) => {
      const video = isVideoFile(p.file)
      return video ? runningVideo < MAX_CONCURRENT_VIDEO : runningImage < MAX_CONCURRENT_IMAGE
    })
    if (nextIndex < 0) return
    const [job] = pendingFiles.splice(nextIndex, 1)
    if (!job) return
    const video = isVideoFile(job.file)
    if (video) runningVideo += 1
    else runningImage += 1
    void process(job.key, job.file, video)
  }
}

async function process(key: string, file: File, isVideo: boolean) {
  const row = rows.find((r) => r.key === key)
  try {
    if (!row) return
    row.status = 'compressing'

    // 视频要先确认 ffmpeg 核心就绪，否则白转一圈才报 ffmpeg_missing
    if (isVideo) {
      if (ffmpegReady.value === null) ffmpegReady.value = await probeFfmpegCore()
      if (!ffmpegReady.value) {
        row.status = 'failed'
        row.reason = 'ffmpeg_missing'
        return
      }
    }

    const result = await prepareEvidenceFile(file, null, {
      onProgress: (percent) => {
        row.progress = percent
      },
    })
    if (!result.ok) {
      row.status = 'failed'
      row.reason = result.reason
      return
    }

    // 拆帧序列：多帧共享同一 setId，setIndex 递增（后端按此回放）
    const setId = result.items.length > 1 ? `set_${Math.random().toString(36).slice(2, 18)}` : undefined
    row.outputs = result.items.map((item, index) => ({
      blob: item.blob,
      name: `evi_${Date.now().toString(36)}${index > 0 ? `_f${String(index).padStart(3, '0')}` : ''}.${
        item.blob.type === 'image/webp' ? 'webp' : 'avif'
      }`,
      setId,
      setIndex: setId ? index : undefined,
    }))

    if (result.items.some((i) => i.encodedSize > EVIDENCE_MAX_BYTES)) {
      row.status = 'failed'
      row.reason = 'output_too_large'
      return
    }
    row.status = 'ready'
    syncItems()
  } catch {
    if (row) {
      row.status = 'failed'
      row.reason = 'encode_failed'
    }
  } finally {
    if (row) row.progress = 100
    if (isVideo) runningVideo = Math.max(0, runningVideo - 1)
    else runningImage = Math.max(0, runningImage - 1)
    void drain()
  }
}

/** 失败项一键重试：保留原文件，重新入队（不再占新的名额） */
function retry(key: string) {
  const row = rows.find((r) => r.key === key)
  if (!row || props.disabled) return
  row.status = 'pending'
  row.reason = null
  row.outputs = []
  row.progress = 0
  pendingFiles.push({ key, file: row.file })
  void drain()
}

function remove(key: string) {
  const index = rows.findIndex((r) => r.key === key)
  if (index < 0) return
  const [row] = rows.splice(index, 1)
  if (row?.previewUrl) URL.revokeObjectURL(row.previewUrl)
  const pendingIndex = pendingFiles.findIndex((p) => p.key === key)
  if (pendingIndex >= 0) pendingFiles.splice(pendingIndex, 1)
  syncItems()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

onUnmounted(() => {
  for (const row of rows) {
    if (row.previewUrl) URL.revokeObjectURL(row.previewUrl)
  }
})

/** 父组件提交成功后清空队列（同时释放预览 URL） */
function clear() {
  for (const row of rows) {
    if (row.previewUrl) URL.revokeObjectURL(row.previewUrl)
  }
  rows.splice(0, rows.length)
  syncItems()
}

defineExpose({ clear })
</script>

<template>
  <div
    class="evidence-drop"
    :class="{ 'evidence-drop--dragging': dragging, 'evidence-drop--disabled': disabled }"
    @paste="onPaste"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <div class="evidence-drop__hint">
      <button
        type="button"
        class="btn ghost"
        :disabled="disabled || rows.length >= max"
        @click="fileInput?.click()"
      >
        {{ t('reports.evidence.pick') }}
      </button>
      <span class="dim">{{ t('reports.evidence.hint', { max }) }}</span>
      <input
        ref="fileInput"
        class="evidence-drop__input"
        type="file"
        multiple
        :accept="ACCEPT"
        @change="onFileChange"
      />
    </div>

    <ul v-if="rows.length > 0" class="evidence-drop__list">
      <li v-for="row in rows" :key="row.key" class="evidence-row">
        <img
          v-if="row.previewUrl"
          :src="row.previewUrl"
          class="evidence-row__thumb"
          :alt="row.file.name"
        />
        <div v-else class="evidence-row__thumb evidence-row__thumb--video">
          {{ row.isVideo ? t('reports.evidence.video') : '—' }}
        </div>

        <div class="evidence-row__body">
          <div class="evidence-row__name">{{ row.file.name }}</div>
          <div class="evidence-row__meta dim">
            <span>{{ formatSize(row.file.size) }}</span>
            <span v-if="row.status === 'compressing'">{{ row.progress }}%</span>
            <span v-else-if="row.status === 'ready'" class="ok">
              {{ t('reports.evidence.ready') }}
              <template v-if="row.outputs.length > 1">
                · {{ t('reports.evidence.frames', { n: row.outputs.length }) }}
              </template>
            </span>
            <span v-else-if="row.status === 'failed'" class="err">
              {{ t(reasonKey(row.reason ?? 'encode_failed')) }}
            </span>
            <span v-else>{{ t('reports.evidence.queued') }}</span>
          </div>
        </div>

        <div class="evidence-row__actions">
          <button
            v-if="row.status === 'failed'"
            type="button"
            class="link-btn"
            :disabled="disabled"
            @click="retry(row.key)"
          >
            {{ t('reports.evidence.retry') }}
          </button>
          <button
            type="button"
            class="link-btn"
            :disabled="disabled || row.status === 'compressing'"
            @click="remove(row.key)"
          >
            {{ t('reports.evidence.remove') }}
          </button>
        </div>
      </li>
    </ul>

    <p v-if="busy" class="hint">{{ t('reports.evidence.processing') }}</p>
  </div>
</template>

<style scoped>
.evidence-drop {
  border: 1px dashed var(--border-color);
  border-radius: 10px;
  padding: 12px;
  background: var(--card-bg);
  transition: border-color 0.15s ease;
}
.evidence-drop--dragging {
  border-color: var(--primary-color);
}
.evidence-drop--disabled {
  opacity: 0.6;
}
.evidence-drop__hint {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.evidence-drop__input {
  display: none;
}
.evidence-drop__list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.evidence-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.evidence-row__thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--border-color);
  flex: 0 0 auto;
}
.evidence-row__thumb--video {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-secondary);
}
.evidence-row__body {
  min-width: 0;
  flex: 1 1 auto;
}
.evidence-row__name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.evidence-row__meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
}
.evidence-row__actions {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}
.ok {
  color: var(--success-color, #16a34a);
}
.err {
  color: var(--error-color);
}
.dim {
  color: var(--text-secondary);
  font-size: 12px;
}
.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
