<script setup>
import { ref } from 'vue'
import { AlertTriangle, HardDrive, Play, ShieldCheck } from 'lucide-vue-next'

const showConfirmModal = ref(false)
const isExecuting = ref(false)
const statusMessage = ref('')

const handleRunNTFS = async () => {
  isExecuting.value = true
  statusMessage.value = 'Đang kích hoạt script NTFS...'

  try {
    const res = await window.api.runDawaScript('ntfs-bat')
    statusMessage.value = res.success ? '✅ ' + res.message : '❌ ' + res.message
  } catch (err) {
    statusMessage.value = '❌ Lỗi: ' + (err.message || 'Không thể thực thi file NTFS.bat')
  } finally {
    isExecuting.value = false
    showConfirmModal.value = false
  }
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px">
    <div class="dashboard-card">
      <div class="card-header">
        <div class="card-title">
          <div
            class="card-icon"
            style="background-color: rgba(0, 240, 255, 0.15); color: var(--accent-cyan)"
          >
            <HardDrive :size="18" :stroke-width="2" />
          </div>
          <div>
            <div>QUẢN LÝ NTFS</div>
            <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
              Công cụ kiểm tra và quản lý hệ thống tệp NTFS
            </div>
          </div>
        </div>
      </div>

      <div
        style="
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-top: 10px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        "
      >
        <ShieldCheck :size="28" :stroke-width="1.8" style="color: var(--accent-cyan)" />
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px">
            NTFS SYSTEM TOOLS
          </h3>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5">
            Kích hoạt script NTFS để bật lại NTFS compression và tự kiểm tra sau khi máy khởi động
            lại.
          </p>
          <button
            class="btn-primary"
            style="margin-top: 16px; padding: 12px 20px"
            :disabled="isExecuting"
            @click="showConfirmModal = true"
          >
            <Play :size="15" :stroke-width="2" />
            <span>CHẠY SCRIPT NTFS</span>
          </button>
        </div>
      </div>

      <div
        v-if="statusMessage"
        style="
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.6);
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--accent-cyan);
          border: 1px solid var(--border-color);
        "
      >
        {{ statusMessage }}
      </div>
    </div>

    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="key-modal" style="max-width: 440px">
        <div style="font-size: 40px; margin-bottom: 12px; color: var(--accent-amber)">
          <AlertTriangle :size="40" :stroke-width="2" fill="currentColor" fill-opacity="0.18" />
        </div>
        <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 8px">
          XÁC NHẬN KÍCH HOẠT NTFS
        </h3>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px">
          Script sẽ thay đổi cấu hình NTFS và tự khởi động lại máy sau 10 giây. Hãy lưu công việc
          trước khi tiếp tục.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center">
          <button
            class="btn-secondary"
            style="flex: 1; padding: 12px"
            @click="showConfirmModal = false"
          >
            HỦY BỎ
          </button>
          <button
            class="btn-primary"
            style="flex: 1; padding: 12px"
            :disabled="isExecuting"
            @click="handleRunNTFS"
          >
            XÁC NHẬN CHẠY
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
