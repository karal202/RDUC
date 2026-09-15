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
    const res = await window.api.executeFeature('bios-bat')
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
    const res = await window.api.executeFeature('ntfs-bat')
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
  <div class="bios-page">
    <!-- BIOS Reboot Card -->
    <div class="pg-card pg-tile">
      <header class="pg-card-head">
        <div class="pg-section-meta"><Settings :size="13" /><span>BIOS/UEFI</span></div>
        <h2 class="pg-title">Thiết lập BIOS / UEFI System</h2>
        <p class="pg-subtitle">Khởi động lại máy tính trực tiếp vào màn hình cấu hình BIOS/UEFI</p>
      </header>

      <div class="pg-bios-content">
        <div class="pg-bios-icon">
          <div class="pg-bios-aura"></div>
          <RotateCcw :size="32" :stroke-width="2" class="pg-bios-spin" />
        </div>
        <div class="pg-bios-info">
          <h3 class="pg-bios-title">TỰ ĐỘNG KHỞI ĐỘNG LẠI VÀO BIOS</h3>
          <p class="pg-bios-desc">
            Khi bấm nút bên dưới, hệ thống sẽ thực thi lệnh <code>shutdown /r /fw /t 0</code> để tự
            động Reboot máy tính và đi thẳng vào giao diện thiết lập BIOS/UEFI firmware mà không cần
            bấm phím Del hay F2 thủ công khi bật máy.
          </p>
          <button
            class="pg-action-btn pg-danger-btn"
            :disabled="isExecuting"
            @click="showBiosModal = true"
          >
            <Rocket :size="16" class="pg-play" />
            <span>KHỞI ĐỘNG LẠI VÀO BIOS NGAY</span>
          </button>
        </div>
      </div>

      <div v-if="biosStatus" class="pg-status-box">
        {{ biosStatus }}
      </div>
    </div>

    <!-- NTFS Section -->
    <div class="pg-card pg-tile">
      <header class="pg-card-head">
        <div class="pg-section-meta" style="--c: var(--accent-cyan)">
          <HardDrive :size="13" /><span>NTFS</span>
        </div>
        <h2 class="pg-title">Quản lý hệ thống tệp NTFS</h2>
        <p class="pg-subtitle">Công cụ kiểm tra, cấu hình nén và tối ưu hệ thống tệp NTFS</p>
      </header>

      <div class="pg-ntfs-content">
        <div class="pg-ntfs-icon">
          <ShieldCheck :size="32" :stroke-width="1.8" style="color: var(--accent-cyan)" />
        </div>
        <div class="pg-ntfs-info">
          <h3 class="pg-ntfs-title">NTFS SYSTEM AUTO CHECK & TWEAKS</h3>
          <p class="pg-ntfs-desc">
            Kích hoạt script NTFS để bật lại NTFS compression và tự kiểm tra sau khi máy khởi động
            lại, đảm bảo tính toàn vẹn và tối ưu phân mảnh tệp tin trên Windows.
          </p>
          <button
            class="pg-action-btn"
            style="--c: var(--accent-cyan)"
            :disabled="isExecuting"
            @click="showNtfsModal = true"
          >
            <Play :size="15" class="pg-play" />
            <span>CHẠY SCRIPT NTFS TỐI ƯU</span>
          </button>
        </div>
      </div>

      <div v-if="ntfsStatus" class="pg-status-box">
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

<style scoped>
.bios-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 22px 28px;
  max-width: 1560px;
  margin: 0 auto;
}

.pg-card {
  position: relative;
  background: linear-gradient(180deg, rgba(14, 20, 36, 0.82), rgba(9, 14, 26, 0.68));
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 20px;
  padding: 22px;
  backdrop-filter: blur(26px) saturate(150%);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
  box-shadow:
    0 18px 60px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.pg-tile {
  position: relative;
  overflow: hidden;
}

.pg-tile::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(
    420px circle at var(--spot-x, 100%) var(--spot-y, 0%),
    rgba(22, 119, 255, 0.14),
    transparent 60%
  );
  opacity: 0.9;
}

.pg-card-head {
  position: relative;
  z-index: 1;
  margin-bottom: 18px;
}

.pg-section-meta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(22, 119, 255, 0.1);
  color: #60a5fa;
  font:
    600 11px/1 'JetBrains Mono',
    ui-monospace,
    monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 10px;
  border: 1px solid rgba(22, 119, 255, 0.2);
}

.pg-title {
  margin: 0;
  font:
    800 22px/1.1 'Archivo',
    sans-serif;
  letter-spacing: -0.01em;
  color: #fff;
}

.pg-subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(148, 163, 184, 0.78);
  line-height: 1.55;
}

.pg-bios-content,
.pg-ntfs-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 24px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.pg-bios-icon,
.pg-ntfs-icon {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 158, 11, 0.12);
  color: var(--accent-amber);
}

.pg-ntfs-icon {
  background: rgba(0, 240, 255, 0.12);
  color: var(--accent-cyan);
}

.pg-bios-aura {
  position: absolute;
  inset: -8px;
  border-radius: 20px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.3), transparent 70%);
  animation: pg-pulse 2s ease-in-out infinite;
}

@keyframes pg-pulse {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

.pg-bios-spin {
  animation: pg-spin 8s linear infinite;
}

@keyframes pg-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.pg-bios-info,
.pg-ntfs-info {
  flex: 1;
}

.pg-bios-title,
.pg-ntfs-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.pg-bios-desc,
.pg-ntfs-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 20px;
}

.pg-action-btn {
  --c: #1677ff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--c) 36%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--c) 94%, #000 0%),
    color-mix(in srgb, var(--c) 70%, #000 30%)
  );
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.28s ease;
  box-shadow:
    0 10px 28px color-mix(in srgb, var(--c) 30%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.pg-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.pg-action-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.985);
}

.pg-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pg-danger-btn {
  --c: #ef4444;
}

.pg-play {
  stroke-width: 2.2;
}

.pg-status-box {
  position: relative;
  z-index: 1;
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.6);
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--accent-cyan);
  border: 1px solid var(--border-color);
}
</style>
