<script setup>
import { ref } from 'vue'
import {
  Settings,
  RotateCcw,
  AlertTriangle,
  Rocket,
  HardDrive,
  ShieldCheck,
  Play
} from 'lucide-vue-next'

const showBiosModal = ref(false)
const showNtfsModal = ref(false)
const isExecuting = ref(false)
const biosStatus = ref('')
const ntfsStatus = ref('')

const handleRestartBIOS = async () => {
  isExecuting.value = true
  biosStatus.value = 'Đang gửi lệnh khởi động lại vào BIOS...'

  try {
    const res = await window.api.runDawaScript('bios-bat')
    if (res.success) {
      biosStatus.value = '✅ ' + res.message
    } else {
      biosStatus.value = '❌ ' + res.message
    }
  } catch (err) {
    biosStatus.value = '❌ Lỗi: ' + (err.message || 'Không thể thực thi lệnh')
  } finally {
    isExecuting.value = false
    showBiosModal.value = false
  }
}

const handleRunNTFS = async () => {
  isExecuting.value = true
  ntfsStatus.value = 'Đang kích hoạt script NTFS...'

  try {
    const res = await window.api.runDawaScript('ntfs-bat')
    ntfsStatus.value = res.success ? '✅ ' + res.message : '❌ ' + res.message
  } catch (err) {
    ntfsStatus.value = '❌ Lỗi: ' + (err.message || 'Không thể thực thi file NTFS.bat')
  } finally {
    isExecuting.value = false
    showNtfsModal.value = false
  }
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px">
    <!-- BIOS Reboot Card -->
    <div class="dashboard-card">
      <div class="card-header">
        <div class="card-title">
          <div class="card-icon"><Settings :size="18" :stroke-width="2" /></div>
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
          <div class="bios-reactor-icon">
            <div class="bios-reactor-aura"></div>
            <RotateCcw :size="30" :stroke-width="2" class="bios-spin-icon" />
          </div>
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
              @click="showBiosModal = true"
            >
              <Rocket :size="16" :stroke-width="2" />
              <span>KHỞI ĐỘNG LẠI VÀO BIOS NGAY</span>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="biosStatus"
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
        {{ biosStatus }}
      </div>
    </div>

    <!-- NTFS Section (Placed directly under BIOS box) -->
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
            <div style="font-size: 18px">QUẢN LÝ HỆ THỐNG TỆP NTFS</div>
            <div style="font-size: 12px; font-weight: 400; color: var(--text-muted)">
              Công cụ kiểm tra, cấu hình nén và tối ưu hệ thống tệp NTFS
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
          padding: 24px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-color);
          border-radius: 10px;
        "
      >
        <ShieldCheck
          :size="30"
          :stroke-width="1.8"
          style="color: var(--accent-cyan); flex-shrink: 0; margin-top: 2px"
        />
        <div style="flex: 1">
          <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px">
            NTFS SYSTEM AUTO CHECK &amp; TWEAKS
          </h3>
          <p
            style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px"
          >
            Kích hoạt script NTFS để bật lại NTFS compression và tự kiểm tra sau khi máy khởi động
            lại, đảm bảo tính toàn vẹn và tối ưu phân mảnh tệp tin trên Windows.
          </p>
          <button
            class="btn-primary"
            style="padding: 13px 24px; font-size: 14px"
            :disabled="isExecuting"
            @click="showNtfsModal = true"
          >
            <Play :size="15" :stroke-width="2" />
            <span>CHẠY SCRIPT NTFS TỐI ƯU</span>
          </button>
        </div>
      </div>

      <div
        v-if="ntfsStatus"
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
        {{ ntfsStatus }}
      </div>
    </div>

    <!-- BIOS Confirmation Modal -->
    <div v-if="showBiosModal" class="modal-overlay">
      <div class="key-modal" style="max-width: 440px">
        <div style="font-size: 40px; margin-bottom: 12px; color: var(--accent-amber)">
          <AlertTriangle :size="40" :stroke-width="2" fill="currentColor" fill-opacity="0.18" />
        </div>
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
            @click="showBiosModal = false"
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

    <!-- NTFS Confirmation Modal -->
    <div v-if="showNtfsModal" class="modal-overlay">
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
            @click="showNtfsModal = false"
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
