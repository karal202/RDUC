<script setup>
import { ref } from 'vue'

const showConfirmModal = ref(false)
const isExecuting = ref(false)
const statusMessage = ref('')

const handleRestartBIOS = async () => {
  isExecuting.value = true
  statusMessage.value = 'Đang gửi lệnh khởi động lại vào BIOS...'

  try {
    const res = await window.api.restartToBios()
    if (res.success) {
      statusMessage.value = '✅ ' + res.message
    } else {
      statusMessage.value = '❌ ' + res.message
    }
  } catch (err) {
    statusMessage.value = '❌ Lỗi: ' + (err.message || 'Không thể thực thi lệnh')
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
          >
            ⚙️
          </div>
          <div>
            <div style="font-size: 18px">THIẾT LẬP BIOS / UEFI SYSTEM</div>
            <div style="font-size: 12px; font-weight: 400; color: var(--text-muted)">
              Khởi động lại máy tính trực tiếp vào màn hình cấu hình BIOS/UEFI
            </div>
          </div>
        </div>
      </div>

      <div
        style="
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 24px;
          margin-top: 10px;
        "
      >
        <div style="display: flex; align-items: flex-start; gap: 16px">
          <div style="font-size: 32px">🔄</div>
          <div style="flex: 1">
            <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px">
              TỰ ĐỘNG KHỞI ĐỘNG LẠI VÀO BIOS
            </h3>
            <p
              style="
                font-size: 13px;
                color: var(--text-muted);
                line-height: 1.5;
                margin-bottom: 20px;
              "
            >
              Khi bấm nút bên dưới, hệ thống sẽ thực thi lệnh <code>shutdown /r /fw /t 0</code> để
              tự động Reboot máy tính và đi thẳng vào giao diện thiết lập BIOS/UEFI firmware mà
              không cần bấm phím Del hay F2 thủ công khi bật máy.
            </p>

            <button
              class="btn-danger"
              style="padding: 14px 28px; font-size: 15px"
              :disabled="isExecuting"
              @click="showConfirmModal = true"
            >
              🚀 KHỞI ĐỘNG LẠI VÀO BIOS NGAY
            </button>
          </div>
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

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="key-modal" style="max-width: 440px">
        <div style="font-size: 40px; margin-bottom: 12px">⚠️</div>
        <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 8px">
          XÁC NHẬN KHỞI ĐỘNG LẠI MÁY
        </h3>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px">
          Bạn có chắc chắn muốn khởi động lại máy tính để vào cài đặt BIOS ngay bây giờ? Hãy lưu các
          công việc đang làm dở trước khi tiếp tục.
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
            class="btn-danger"
            style="flex: 1; padding: 12px"
            :disabled="isExecuting"
            @click="handleRestartBIOS"
          >
            XÁC NHẬN RS VÀO BIOS
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
