<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Sparkles, Download, ExternalLink, RotateCcw, AlertTriangle, X } from 'lucide-vue-next'

const props = defineProps({
  versionInfo: {
    type: Object,
    required: true,
    default: () => ({
      currentVersion: '1.0.0',
      latestVersion: '1.0.1',
      downloadUrl: '',
      releaseNotes: '',
      mandatory: false
    })
  }
})

const emit = defineEmits(['close'])

const isDownloading = ref(false)
const downloadPercent = ref(0)
const updateDownloaded = ref(false)
const updateError = ref('')
let unsubs = []

onMounted(() => {
  if (window.api?.onUpdateProgress) {
    const unsubProgress = window.api.onUpdateProgress((progress) => {
      isDownloading.value = true
      downloadPercent.value = progress.percent || 0
    })
    unsubs.push(unsubProgress)
  }

  if (window.api?.onUpdateDownloaded) {
    const unsubDownloaded = window.api.onUpdateDownloaded(() => {
      isDownloading.value = false
      downloadPercent.value = 100
      updateDownloaded.value = true
    })
    unsubs.push(unsubDownloaded)
  }

  if (window.api?.onUpdateError) {
    const unsubError = window.api.onUpdateError((errMsg) => {
      isDownloading.value = false
      updateError.value = beautifyUpdateError(errMsg)
    })
    unsubs.push(unsubError)
  }
})

onUnmounted(() => {
  unsubs.forEach((unsub) => {
    if (typeof unsub === 'function') unsub()
  })
  unsubs = []
})

function beautifyUpdateError(rawMessage) {
  const msg = String(rawMessage || '')
  if (msg.includes('latest.yml') || msg.includes('404')) {
    return 'Bản cập nhật trên GitHub chưa có file thông tin phiên bản. Hãy dùng nút "Tải File Cài Đặt (.EXE)" bên dưới để cập nhật thủ công (tốc độ tương đương).'
  }
  if (msg.toLowerCase().includes('dev') || msg.includes('isDev')) {
    return 'Môi trường dev không hỗ trợ cập nhật tự động. Vui lòng dùng nút "Tải File Cài Đặt (.EXE)" bên dưới.'
  }
  if (msg.toLowerCase().includes('authentication') || msg.toLowerCase().includes('token')) {
    return 'Không thể xác thực tải bản cập nhật. Hãy dùng nút "Tải File Cài Đặt (.EXE)" bên dưới để tải thủ công.'
  }
  return 'Không thể tải bản cập nhật tự động. Hãy dùng nút "Tải File Cài Đặt (.EXE)" bên dưới.'
}

const handleStartAutoUpdate = async () => {
  updateError.value = ''
  isDownloading.value = true
  downloadPercent.value = 5

  try {
    const res = await window.api?.startAutoUpdate?.()
    if (!res?.success) {
      updateError.value = beautifyUpdateError(res?.isDev ? 'dev' : res?.message || '')
      isDownloading.value = false
    }
  } catch (err) {
    isDownloading.value = false
    updateError.value = beautifyUpdateError(err?.message || '')
  }
}

const handleOpenDownloadPage = async () => {
  try {
    await window.api?.openDownloadUrl?.(props.versionInfo.downloadUrl)
  } catch (err) {
    console.error('Failed to open download url:', err)
  }
}

const handleQuitAndInstall = () => {
  window.api?.quitAndInstall?.()
}
</script>

<template>
  <div class="modal-overlay update-modal-overlay">
    <div class="key-modal update-modal-box">
      <!-- Close Button (if not mandatory) -->
      <button
        v-if="!props.versionInfo.mandatory"
        type="button"
        class="modal-close-btn"
        aria-label="Đóng"
        @click="emit('close')"
      >
        <X :size="16" />
      </button>

      <!-- Modal Header Icon -->
      <div class="update-icon-glow">
        <Sparkles :size="32" :stroke-width="2.2" class="sparkle-anim" />
      </div>

      <h3 class="update-title">ĐÃ CÓ PHIÊN BẢN MỚI!</h3>
      <p class="update-subtitle">
        Ứng dụng Dawa Optimizer đã phát hành bản cập nhật mới với nhiều cải tiến và tối ưu.
      </p>

      <!-- Version Compare Pill -->
      <div class="version-compare-row">
        <div class="ver-badge current">
          <span>Hiện tại</span>
          <strong>v{{ props.versionInfo.currentVersion || '1.0.0' }}</strong>
        </div>
        <span class="ver-arrow">➜</span>
        <div class="ver-badge latest">
          <span>Mới nhất</span>
          <strong>v{{ props.versionInfo.latestVersion || '1.0.1' }}</strong>
        </div>
      </div>

      <!-- Release Notes Box -->
      <div class="release-notes-card">
        <div class="release-notes-heading">NỘI DUNG BẢN CẬP NHẬT</div>
        <p class="release-notes-content">
          {{
            props.versionInfo.releaseNotes ||
            'Tối ưu hiệu năng, sửa lỗi kết nối WebSocket thời gian thực và đồng bộ giao diện Cyberpunk mới.'
          }}
        </p>
      </div>

      <!-- Progress Bar (when downloading) -->
      <div v-if="isDownloading" class="update-progress-wrap">
        <div class="update-progress-label">
          <span>Đang tải bản cập nhật...</span>
          <strong>{{ downloadPercent }}%</strong>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill fill-cyan" :style="{ width: `${downloadPercent}%` }"></div>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="updateError" class="update-error-text">
        <AlertTriangle :size="14" />
        <span>{{ updateError }}</span>
      </div>

      <!-- Actions Toolbar -->
      <div class="update-actions">
        <!-- Ready to restart -->
        <button
          v-if="updateDownloaded"
          type="button"
          class="btn-primary btn-update-primary"
          @click="handleQuitAndInstall"
        >
          <RotateCcw :size="15" :stroke-width="2" />
          <span>CÀI ĐẶT &amp; KHỞI ĐỘNG LẠI NGAY</span>
        </button>

        <!-- Start Auto Download -->
        <button
          v-else
          type="button"
          class="btn-primary btn-update-primary"
          :disabled="isDownloading"
          @click="handleStartAutoUpdate"
        >
          <Download :size="15" :stroke-width="2" />
          <span>{{ isDownloading ? 'ĐANG TẢI BẢN MỚI...' : 'CẬP NHẬT TỰ ĐỘNG' }}</span>
        </button>

        <!-- Direct Web Download .EXE -->
        <button
          type="button"
          class="btn-secondary btn-update-secondary"
          title="Tải trực tiếp file cài đặt Setup .exe từ web"
          @click="handleOpenDownloadPage"
        >
          <ExternalLink :size="15" :stroke-width="2" />
          <span>Tải File Cài Đặt (.EXE)</span>
        </button>

        <!-- Close / Later -->
        <button
          v-if="!props.versionInfo.mandatory"
          type="button"
          class="btn-ghost-cancel"
          @click="emit('close')"
        >
          Để sau
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.update-modal-overlay {
  z-index: 9999;
}

.update-modal-box {
  max-width: 480px;
  position: relative;
  text-align: center;
  padding: 28px 24px;
}

.modal-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  background: transparent;
  border: 0;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 160ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.update-icon-glow {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(0, 240, 255, 0.12);
  color: var(--accent-cyan);
  border: 1px solid rgba(0, 240, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 0 24px rgba(0, 240, 255, 0.25);
}

.sparkle-anim {
  animation: pulse-spin 3s ease-in-out infinite alternate;
}

@keyframes pulse-spin {
  0% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.08);
    opacity: 1;
    filter: drop-shadow(0 0 6px var(--accent-cyan));
  }
}

.update-title {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.01em;
  margin-bottom: 6px;
}

.update-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 20px;
}

.version-compare-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border-color);
}

.ver-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.ver-badge span {
  font-size: 11px;
  color: var(--text-muted);
}
.ver-badge.current strong {
  color: #94a3b8;
  font-family: var(--font-mono);
}
.ver-badge.latest strong {
  color: #34d399;
  font-family: var(--font-mono);
  font-weight: 800;
}
.ver-arrow {
  color: var(--accent-cyan);
  font-size: 12px;
}

.release-notes-card {
  text-align: left;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 20px;
}
.release-notes-heading {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--accent-cyan);
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}
.release-notes-content {
  font-size: 12.5px;
  color: #cbd5e1;
  line-height: 1.5;
}

.update-progress-wrap {
  margin-bottom: 18px;
}
.update-progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  color: var(--accent-cyan);
  font-family: var(--font-mono);
  margin-bottom: 4px;
}

.update-error-text {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.55;
  color: #fecdd3;
  text-align: left;
  background: rgba(244, 63, 94, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  max-height: 120px;
  overflow-y: auto;
  word-break: break-word;
}
.update-error-text svg {
  margin-top: 2px;
  flex-shrink: 0;
  color: #fb7185;
}

.update-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-update-primary {
  width: 100%;
  padding: 13px;
  font-size: 14px;
  font-weight: 700;
}

.btn-update-secondary {
  width: 100%;
  padding: 11px;
  font-size: 13px;
}

.btn-ghost-cancel {
  background: transparent;
  border: 0;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 6px;
  transition: color 160ms ease;
}
.btn-ghost-cancel:hover {
  color: #fff;
}
</style>
