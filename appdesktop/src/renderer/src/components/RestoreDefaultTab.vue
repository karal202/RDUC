<script setup>
import { ref } from 'vue'
import {
  RotateCcw,
  Gamepad2,
  Briefcase,
  Play,
  ShieldCheck,
  Check,
  Copy,
  Trash2,
  Terminal,
  Printer,
  Info,
  HardDrive,
  ToggleLeft,
  ToggleRight,
  Loader2
} from 'lucide-vue-next'
import { useScriptRunner } from '../composables/useScriptRunner'

const { runScript, isActionRunning } = useScriptRunner()

const logOutput = ref('')
const isRunning = ref(false)
const copied = ref(false)
const selectedRestoreScript = ref('restore-gamer-services')

// Toggle states for Enable/Disable
const extremeDriversEnabled = ref(false)
const extremeGamerServicesEnabled = ref(false)

const RESTORE_SCRIPT_OPTIONS = [
  {
    value: 'restore-gamer-services',
    label: 'Khôi phục Dịch vụ Game thủ (Disable Services For Gamers Restore)',
    desc: 'Bật lại Xbox Live, Game Bar, Bluetooth, Windows Audio Enhancements...'
  },
  {
    value: 'restore-professional-services',
    label: 'Khôi phục Dịch vụ Văn phòng (Disable Services For Professionals Restore)',
    desc: 'Bật lại Print Spooler (Máy in), Hyper-V, SMB File Sharing, Windows Update...'
  }
]

const run = async (scriptKey, description, options = {}) => {
  if (isRunning.value || isActionRunning(scriptKey)) return
  isRunning.value = true
  const time = new Date().toLocaleTimeString()
  logOutput.value += `[${time}] [RESTORE] Đang thực thi [${scriptKey}] - ${description}...\n`
  try {
    const res = await runScript(scriptKey, description, options)
    if (res?.success) {
      logOutput.value += `✅ ${res.message}\n`
      if (res.stepResults) {
        res.stepResults.forEach((s, i) => {
          logOutput.value += `  [Bước ${i + 1}] ${s.file} ${s.args || ''}\n`
          if (s.stdout) logOutput.value += `      > ${s.stdout.trim()}\n`
          if (s.stderr) logOutput.value += `      ! ${s.stderr.trim()}\n`
        })
      }
      logOutput.value += '✨ Đã khôi phục dịch vụ về trạng thái mặc định thành công.\n'
    } else {
      logOutput.value += `❌ ${res?.message || 'Thất bại'}\n`
    }
  } catch (err) {
    logOutput.value += `❌ Lỗi: ${err.message || err}\n`
  } finally {
    isRunning.value = false
  }
}

const runProfile = (key, label) => run('registry-profile', label, { profile: key })

const applyRestoreScript = () => {
  const opt = RESTORE_SCRIPT_OPTIONS.find((o) => o.value === selectedRestoreScript.value)
  runProfile(selectedRestoreScript.value, opt?.label || selectedRestoreScript.value)
}

const resetRamConfig = () => {
  run('ram-optimization', 'Khôi phục cấu hình RAM về mặc định Windows', { profile: 'reset' })
}

const copyLog = async () => {
  if (!logOutput.value) return
  try {
    await navigator.clipboard.writeText(logOutput.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // ignore
  }
}

const clearLog = () => {
  logOutput.value = ''
}

const toggleExtremeDrivers = async () => {
  const key = extremeDriversEnabled.value ? 'disable-extreme-drivers' : 'enable-extreme-drivers'
  const desc = extremeDriversEnabled.value ? 'Disable Extreme Drivers' : 'Enable Extreme Drivers'
  await run(key, desc)
  if (logOutput.value.includes('✅')) {
    extremeDriversEnabled.value = !extremeDriversEnabled.value
  }
}

const toggleExtremeGamerServices = async () => {
  const key = extremeGamerServicesEnabled.value
    ? 'disable-extreme-gamer-services'
    : 'enable-extreme-gamer-services'
  const desc = extremeGamerServicesEnabled.value
    ? 'Disable Extreme Gamer Services'
    : 'Enable Extreme Gamer Services'
  await run(key, desc)
  if (logOutput.value.includes('✅')) {
    extremeGamerServicesEnabled.value = !extremeGamerServicesEnabled.value
  }
}
</script>

<template>
  <div class="restore-page">
    <!-- Header Telemetry Banner -->
    <header class="restore-header-card">
      <div class="restore-header-main">
        <div class="restore-badge-pill">
          <ShieldCheck :size="13" class="text-purple-400" />
          <span>SYSTEM INTEGRITY & ROLLBACK</span>
        </div>
        <h1 class="restore-main-title">Khôi Phục Mặc Định (System Restore)</h1>
        <p class="restore-main-desc">
          Hoàn tác các tinh chỉnh và kích hoạt lại các dịch vụ hệ thống Windows về trạng thái ban
          đầu một cách an toàn.
        </p>
      </div>
      <div class="restore-telemetry-row">
        <div class="restore-tele-chip">
          <ShieldCheck :size="12" class="text-emerald-400" />
          <span>ROLLBACK: <strong>READY</strong></span>
        </div>
        <div class="restore-tele-chip">
          <HardDrive :size="12" class="text-blue-400" />
          <span>DATA INTEGRITY: <strong>SAFE</strong></span>
        </div>
      </div>
    </header>

    <!-- Safety Guarantee Box -->
    <div class="restore-safety-banner">
      <div class="restore-safety-icon">
        <ShieldCheck :size="24" stroke-width="2.2" />
      </div>
      <div class="restore-safety-content">
        <h3 class="restore-safety-title">CAM KẾT AN TOÀN TUYỆT ĐỐI</h3>
        <p class="restore-safety-desc">
          Các thao tác tại đây chỉ bật lại các tiến trình dịch vụ (Services) và giá trị Registry gốc
          của Microsoft Windows. Quá trình này <strong>không xóa file</strong>,
          <strong>không làm mất ứng dụng</strong> hay dữ liệu cá nhân của bạn.
        </p>
      </div>
    </div>

    <!-- SECTION 1: EXTREME REG TOGGLES -->
    <section class="restore-card">
      <div class="restore-card-head">
        <div class="restore-section-tag" style="--c: #f59e0b">
          <ShieldCheck :size="13" />
          <span>EXTREME REG</span>
        </div>
        <h2 class="restore-card-title">Extreme Reg Drivers & Services</h2>
        <p class="restore-card-sub">Bật/Tắt Extreme Reg Drivers và Services For Gamers</p>
      </div>

      <div class="restore-grid-2">
        <!-- Extreme Drivers Toggle -->
        <div class="restore-toggle-card" style="--c: #f59e0b">
          <div class="restore-toggle-header">
            <div class="restore-toggle-icon">
              <HardDrive :size="22" stroke-width="2.2" />
            </div>
            <div class="restore-toggle-info">
              <h3 class="restore-toggle-title">Extreme Drivers</h3>
              <p class="restore-toggle-desc">
                Bật/Tắt Tcpip6, Beep, NdisVirtualBus, NetBIOS drivers
              </p>
            </div>
          </div>
          <button
            type="button"
            class="restore-toggle-btn"
            :class="{ active: extremeDriversEnabled }"
            :disabled="
              isActionRunning('enable-extreme-drivers') ||
              isActionRunning('disable-extreme-drivers') ||
              isRunning
            "
            @click="toggleExtremeDrivers"
          >
            <Loader2
              v-if="
                isActionRunning('enable-extreme-drivers') ||
                isActionRunning('disable-extreme-drivers')
              "
              :size="18"
              class="spin"
            />
            <template v-else>
              <ToggleLeft v-if="!extremeDriversEnabled" :size="18" />
              <ToggleRight v-else :size="18" />
            </template>
            <span>{{
              isActionRunning('enable-extreme-drivers') ||
              isActionRunning('disable-extreme-drivers')
                ? 'ĐANG XỬ LÝ...'
                : extremeDriversEnabled
                  ? 'Đã bật'
                  : 'Đã tắt'
            }}</span>
          </button>
        </div>

        <!-- Extreme Gamer Services Toggle -->
        <div class="restore-toggle-card" style="--c: #a855f7">
          <div class="restore-toggle-header">
            <div class="restore-toggle-icon">
              <Gamepad2 :size="22" stroke-width="2.2" />
            </div>
            <div class="restore-toggle-info">
              <h3 class="restore-toggle-title">Extreme Gamer Services</h3>
              <p class="restore-toggle-desc">
                Bật/Tắt 100+ services cho game thủ (Xbox, Defender, Bluetooth...)
              </p>
            </div>
          </div>
          <button
            type="button"
            class="restore-toggle-btn"
            :class="{ active: extremeGamerServicesEnabled }"
            :disabled="
              isActionRunning('enable-extreme-gamer-services') ||
              isActionRunning('disable-extreme-gamer-services') ||
              isRunning
            "
            @click="toggleExtremeGamerServices"
          >
            <Loader2
              v-if="
                isActionRunning('enable-extreme-gamer-services') ||
                isActionRunning('disable-extreme-gamer-services')
              "
              :size="18"
              class="spin"
            />
            <template v-else>
              <ToggleLeft v-if="!extremeGamerServicesEnabled" :size="18" />
              <ToggleRight v-else :size="18" />
            </template>
            <span>{{
              isActionRunning('enable-extreme-gamer-services') ||
              isActionRunning('disable-extreme-gamer-services')
                ? 'ĐANG XỬ LÝ...'
                : extremeGamerServicesEnabled
                  ? 'Đã bật'
                  : 'Đã tắt'
            }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- SECTION 2: CORE RESTORE CARDS -->
    <section class="restore-card">
      <div class="restore-card-head">
        <div class="restore-section-tag" style="--c: #a855f7">
          <RotateCcw :size="13" />
          <span>SERVICES ROLLBACK</span>
        </div>
        <h2 class="restore-card-title">Hồ Sơ Khôi Phục Dịch Vụ Cốt Lõi</h2>
        <p class="restore-card-sub">Lựa chọn cấu hình dịch vụ cần hoàn tác về cài đặt xuất xưởng</p>
      </div>

      <div class="restore-grid-3">
        <!-- Gamer Services Restore -->
        <div class="restore-item-card" style="--c: #a855f7">
          <div class="restore-item-top">
            <div class="restore-icon-box">
              <Gamepad2 :size="22" stroke-width="2.2" />
            </div>
            <span class="restore-pill-badge">GAMER ROLLBACK</span>
          </div>

          <div class="restore-item-body">
            <h3 class="restore-item-title">Khôi Phục Dịch Vụ Game Thủ</h3>
            <p class="restore-item-desc">
              Bật lại các dịch vụ Windows Defender, Xbox Live Auth Manager, Game DVR, Bluetooth
              Device và hiệu ứng âm thanh Audio Enhancements.
            </p>
          </div>

          <div class="restore-tags-list">
            <span>Xbox Live</span>
            <span>Defender</span>
            <span>Bluetooth</span>
            <span>Game Bar</span>
          </div>

          <button
            type="button"
            class="restore-action-btn"
            :disabled="isActionRunning('registry-profile') || isRunning"
            @click="runProfile('restore-gamer-services', 'Khôi phục dịch vụ Game thủ')"
          >
            <Loader2 v-if="isActionRunning('registry-profile')" :size="14" class="spin" />
            <Play v-else :size="14" class="fill-current" />
            <span>{{
              isActionRunning('registry-profile') ? 'ĐANG KHÔI PHỤC...' : 'Khôi phục Dịch vụ Game'
            }}</span>
          </button>
        </div>

        <!-- Professional Services Restore -->
        <div class="restore-item-card" style="--c: #06b6d4">
          <div class="restore-item-top">
            <div class="restore-icon-box">
              <Briefcase :size="22" stroke-width="2.2" />
            </div>
            <span class="restore-pill-badge">OFFICE ROLLBACK</span>
          </div>

          <div class="restore-item-body">
            <h3 class="restore-item-title">Khôi Phục Dịch Vụ Văn Phòng</h3>
            <p class="restore-item-desc">
              Bật lại dịch vụ máy in (Print Spooler), chia sẻ tệp mạng nội bộ (SMB), máy ảo Hyper-V,
              Remote Desktop và tự động Windows Update.
            </p>
          </div>

          <div class="restore-tags-list">
            <span>Print Spooler</span>
            <span>Hyper-V</span>
            <span>SMB Sharing</span>
            <span>Update</span>
          </div>

          <button
            type="button"
            class="restore-action-btn"
            :disabled="isActionRunning('registry-profile') || isRunning"
            @click="runProfile('restore-professional-services', 'Khôi phục dịch vụ Chuyên nghiệp')"
          >
            <Loader2 v-if="isActionRunning('registry-profile')" :size="14" class="spin" />
            <Play v-else :size="14" class="fill-current" />
            <span>{{
              isActionRunning('registry-profile') ? 'ĐANG KHÔI PHỤC...' : 'Khôi phục Dịch vụ Office'
            }}</span>
          </button>
        </div>

        <!-- RAM Cache Reset -->
        <div class="restore-item-card" style="--c: #22c55e">
          <div class="restore-item-top">
            <div class="restore-icon-box">
              <HardDrive :size="22" stroke-width="2.2" />
            </div>
            <span class="restore-pill-badge">MEMORY ROLLBACK</span>
          </div>

          <div class="restore-item-body">
            <h3 class="restore-item-title">Khôi Phục Bộ Nhớ RAM Mặc Định</h3>
            <p class="restore-item-desc">
              Trả lại các thông số phân bổ Paging File và quản lý bộ nhớ đệm RAM Cache về giá trị
              mặc định của Windows.
            </p>
          </div>

          <div class="restore-tags-list">
            <span>Paging File</span>
            <span>Standby List</span>
            <span>Working Set</span>
          </div>

          <button
            type="button"
            class="restore-action-btn"
            :disabled="isActionRunning('ram-optimization') || isRunning"
            @click="resetRamConfig"
          >
            <Loader2 v-if="isActionRunning('ram-optimization')" :size="14" class="spin" />
            <Play v-else :size="14" class="fill-current" />
            <span>{{
              isActionRunning('ram-optimization') ? 'ĐANG KHÔI PHỤC...' : 'Khôi phục Cấu Hình RAM'
            }}</span>
          </button>
        </div>
      </div>

      <!-- Quick Registry Script Selector -->
      <div class="restore-selector-box">
        <div class="restore-selector-info">
          <RotateCcw :size="16" class="text-purple-400" />
          <span>Thực thi trực tiếp file script phục hồi cấu hình (.reg):</span>
        </div>
        <div class="restore-selector-row">
          <select
            v-model="selectedRestoreScript"
            class="restore-select-control"
            :disabled="isRunning"
          >
            <option v-for="opt in RESTORE_SCRIPT_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <button
            type="button"
            class="restore-select-btn"
            :disabled="isActionRunning('registry-profile') || isRunning"
            @click="applyRestoreScript"
          >
            <Loader2 v-if="isActionRunning('registry-profile')" :size="13" class="spin" />
            <Play v-else :size="13" class="fill-current" />
            <span>{{ isActionRunning('registry-profile') ? 'ĐANG CHẠY...' : 'Chạy Script' }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- SECTION 2: GUIDELINES -->
    <section class="restore-card">
      <div class="restore-card-head">
        <div class="restore-section-tag" style="--c: #3b82f6">
          <Info :size="13" />
          <span>USAGE GUIDELINES</span>
        </div>
        <h2 class="restore-card-title">Khi Nào Bạn Cần Sử Dụng Khôi Phục?</h2>
        <p class="restore-card-sub">
          Các tình huống phổ biến nên sử dụng chức năng hoàn tác dịch vụ
        </p>
      </div>

      <div class="restore-tips-grid">
        <div class="restore-tip-card">
          <div class="restore-tip-icon" style="--c: #06b6d4">
            <Printer :size="18" />
          </div>
          <div>
            <strong class="restore-tip-title">Cần in ấn hoặc kết nối máy in văn phòng</strong>
            <p class="restore-tip-desc">
              Chạy <em>Khôi phục Dịch vụ Văn phòng</em> để kích hoạt lại Print Spooler và TCP/IP
              Port Monitor.
            </p>
          </div>
        </div>

        <div class="restore-tip-card">
          <div class="restore-tip-icon" style="--c: #a855f7">
            <RotateCcw :size="18" />
          </div>
          <div>
            <strong class="restore-tip-title">Cần cài đặt bản cập nhật Windows Update mới</strong>
            <p class="restore-tip-desc">
              Khôi phục lại dịch vụ cập nhật để Windows Update có thể tải và cài đặt các bản vá bảo
              mật hệ thống.
            </p>
          </div>
        </div>

        <div class="restore-tip-card">
          <div class="restore-tip-icon" style="--c: #22c55e">
            <Gamepad2 :size="18" />
          </div>
          <div>
            <strong class="restore-tip-title">Kết nối tay cầm chơi game Bluetooth bị lỗi</strong>
            <p class="restore-tip-desc">
              Chạy <em>Khôi phục Dịch vụ Game thủ</em> để bật lại các dịch vụ Bluetooth Support
              Service và Audio Gateway.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: CONSOLE TERMINAL -->
    <section class="restore-console-card">
      <div class="restore-console-header">
        <div class="restore-console-title">
          <Terminal :size="14" class="text-purple-400" />
          <span>RESTORE LOG & AUDIT REPORT</span>
          <div class="restore-live-indicator" :class="{ running: isRunning }">
            <span class="restore-live-dot" />
            <span>{{ isRunning ? 'ĐANG THỰC THI...' : 'SẴN SÀNG' }}</span>
          </div>
        </div>
        <div class="restore-console-actions">
          <button
            type="button"
            class="restore-tool-btn"
            title="Sao chép log"
            :disabled="!logOutput"
            @click="copyLog"
          >
            <Check v-if="copied" :size="13" class="text-green-400" />
            <Copy v-else :size="13" />
            <span>{{ copied ? 'Đã chép' : 'Sao chép' }}</span>
          </button>
          <button
            type="button"
            class="restore-tool-btn"
            title="Xóa console"
            :disabled="!logOutput"
            @click="clearLog"
          >
            <Trash2 :size="13" />
            <span>Xóa log</span>
          </button>
        </div>
      </div>
      <pre class="restore-terminal-view">{{
        logOutput || 'Sẵn sàng chờ thực thi lệnh khôi phục dịch vụ mặc định của hệ thống...'
      }}</pre>
    </section>
  </div>
</template>

<style scoped>
.restore-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 24px;
  max-width: 1560px;
  margin: 0 auto;
}

/* Header Banner */
.restore-header-card {
  position: relative;
  overflow: hidden;
  padding: 22px 26px;
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    rgba(168, 85, 247, 0.12) 0%,
    rgba(14, 20, 36, 0.85) 50%,
    rgba(6, 182, 212, 0.08) 100%
  );
  border: 1px solid rgba(168, 85, 247, 0.25);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.restore-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.3);
  color: #c084fc;
  font: 700 10.5px/1 var(--font-mono);
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.restore-main-title {
  font:
    800 24px/1.15 'Archivo',
    sans-serif;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}

.restore-main-desc {
  font-size: 13px;
  color: rgba(226, 232, 240, 0.72);
  max-width: 720px;
  line-height: 1.5;
  margin: 0;
}

.restore-telemetry-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.restore-tele-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font: 500 11px var(--font-mono);
  color: #94a3b8;
}

.restore-tele-chip strong {
  color: #f8fafc;
  font-weight: 700;
}

/* Safety Banner */
.restore-safety-banner {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 20px;
  border-radius: 14px;
  background: rgba(34, 197, 94, 0.06);
  border: 1px solid rgba(34, 197, 94, 0.25);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.restore-safety-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
  flex-shrink: 0;
}

.restore-safety-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.restore-safety-title {
  font: 700 13.5px var(--font-mono);
  color: #4ade80;
  letter-spacing: 0.05em;
  margin: 0;
}

.restore-safety-desc {
  font-size: 12.5px;
  color: #cbd5e1;
  margin: 0;
  line-height: 1.5;
}

.restore-safety-desc strong {
  color: #ffffff;
}

/* Base Card */
.restore-card {
  position: relative;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.78) 0%, rgba(10, 15, 29, 0.72) 100%);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 18px;
  padding: 22px;
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
}

.restore-card-head {
  margin-bottom: 18px;
}

.restore-section-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--c) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
  color: var(--c);
  font: 700 10px var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.restore-card-title {
  font:
    700 18px/1.2 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0;
}

.restore-card-sub {
  font-size: 12.5px;
  color: #94a3b8;
  margin: 4px 0 0;
  line-height: 1.45;
}

/* Restore 2-Col Grid */
.restore-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

/* Restore 3-Col Grid */
.restore-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* Toggle Card */
.restore-toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.07);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.restore-toggle-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--c) 50%, transparent);
  background: color-mix(in srgb, var(--c) 5%, rgba(15, 23, 42, 0.6));
}

.restore-toggle-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}

.restore-toggle-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--c) 16%, transparent);
  color: var(--c);
  border: 1px solid color-mix(in srgb, var(--c) 32%, transparent);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--c) 20%, transparent);
  flex-shrink: 0;
}

.restore-toggle-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.restore-toggle-title {
  font:
    700 14px 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0;
}

.restore-toggle-desc {
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.4;
  margin: 0;
}

.restore-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.6);
  color: #94a3b8;
  font: 600 12px var(--font-sans);
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
}

.restore-toggle-btn:hover:not(:disabled) {
  border-color: var(--c);
  color: var(--c);
  background: color-mix(in srgb, var(--c) 10%, rgba(15, 23, 42, 0.6));
}

.restore-toggle-btn.active {
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 20%, rgba(15, 23, 42, 0.6));
  color: var(--c);
}

.restore-toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.restore-item-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  padding: 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.07);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.restore-item-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--c) 50%, transparent);
  background: color-mix(in srgb, var(--c) 5%, rgba(15, 23, 42, 0.6));
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.4),
    0 0 24px color-mix(in srgb, var(--c) 15%, transparent);
}

.restore-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.restore-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--c) 16%, transparent);
  color: var(--c);
  border: 1px solid color-mix(in srgb, var(--c) 32%, transparent);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--c) 20%, transparent);
}

.restore-pill-badge {
  font: 700 9.5px var(--font-mono);
  padding: 3px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  letter-spacing: 0.06em;
}

.restore-item-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.restore-item-title {
  font:
    700 15px 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0;
}

.restore-item-desc {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.restore-tags-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.restore-tags-list span {
  font: 600 10px var(--font-mono);
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.restore-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--c) 90%, #000 10%),
    color-mix(in srgb, var(--c) 65%, #000 35%)
  );
  color: #ffffff;
  font:
    700 12.5px 'Archivo',
    sans-serif;
  cursor: pointer;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--c) 30%, transparent);
  transition: all 0.25s ease;
}

.restore-action-btn:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
}

.restore-action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.restore-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Selector Box */
.restore-selector-box {
  margin-top: 16px;
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.restore-selector-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #cbd5e1;
}

.restore-selector-row {
  display: flex;
  gap: 12px;
}

.restore-select-control {
  flex: 1;
  padding: 9px 12px;
  background: #090e1a;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  color: #f1f5f9;
  font: 500 12.5px var(--font-sans);
  outline: none;
  cursor: pointer;
}

.restore-select-control:focus {
  border-color: #a855f7;
}

.restore-select-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 18px;
  border-radius: 8px;
  border: 1px solid rgba(168, 85, 247, 0.5);
  background: rgba(168, 85, 247, 0.2);
  color: #ffffff;
  font: 700 12px var(--font-sans);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.restore-select-btn:hover:not(:disabled) {
  background: rgba(168, 85, 247, 0.35);
}

.restore-select-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tips Grid */
.restore-tips-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.restore-tip-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.restore-tip-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--c) 14%, transparent);
  color: var(--c);
  flex-shrink: 0;
}

.restore-tip-title {
  display: block;
  font:
    600 13px 'Archivo',
    sans-serif;
  color: #f1f5f9;
  margin-bottom: 4px;
}

.restore-tip-desc {
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.45;
  margin: 0;
}

.restore-tip-desc em {
  font-style: normal;
  color: #60a5fa;
}

/* Console Section */
.restore-console-card {
  border-radius: 14px;
  background: #040711;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.5);
}

.restore-console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.025);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.restore-console-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 700 11px var(--font-mono);
  color: #cbd5e1;
  letter-spacing: 0.06em;
}

.restore-live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.1);
  font-size: 9.5px;
  color: #94a3b8;
}

.restore-live-indicator.running {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}

.restore-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.restore-live-indicator.running .restore-live-dot {
  background: #a855f7;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  0% {
    opacity: 0.4;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.restore-console-actions {
  display: flex;
  gap: 8px;
}

.restore-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font: 500 11px var(--font-mono);
  cursor: pointer;
  transition: all 0.2s ease;
}

.restore-tool-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.restore-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.restore-terminal-view {
  margin: 0;
  padding: 14px 16px;
  font: 500 12px/1.65 var(--font-mono);
  color: #c084fc;
  background: #02040a;
  min-height: 100px;
  max-height: 220px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1024px) {
  .restore-grid-3 {
    grid-template-columns: 1fr;
  }
  .restore-tips-grid {
    grid-template-columns: 1fr;
  }
}

@keyframes rotate-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: rotate-spin 1s linear infinite;
}
</style>
