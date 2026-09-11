<script setup>
import { ref } from 'vue'
import { RotateCcw, Gamepad2, Briefcase, Play } from 'lucide-vue-next'

const logOutput = ref('')
const isRunning = ref(false)
const selectedRestoreScript = ref('restore-gamer-services')

const RESTORE_SCRIPT_OPTIONS = [
  { value: 'restore-gamer-services', label: 'Disable Services For Gamers Restore' },
  { value: 'restore-professional-services', label: 'Disable Services For Professionals Restore' }
]

const run = async (scriptKey, description, options = {}) => {
  if (isRunning.value) return
  isRunning.value = true
  logOutput.value = `[RESTORE] Dang thuc thi [${scriptKey}] - ${description}...\n`
  try {
    const res = await window.api.runDawaScript(scriptKey, options)
    if (res.success) {
      logOutput.value += `OK ${res.message}\n`
      if (res.stepResults) res.stepResults.forEach((s, i) => {
        logOutput.value += `  [${i + 1}] ${s.file} ${s.args}\n`
        if (s.stdout) logOutput.value += `      ${s.stdout.trim()}\n`
      })
    } else {
      logOutput.value += `NG ${res.message}\n`
    }
  } catch (err) {
    logOutput.value += `Error: ${err.message}\n`
  } finally {
    isRunning.value = false
  }
}

const runProfile = (key, label) => run('registry-profile', label, { profile: key })

const applyRestoreScript = () => {
  const opt = RESTORE_SCRIPT_OPTIONS.find(o => o.value === selectedRestoreScript.value)
  runProfile(selectedRestoreScript.value, opt?.label || selectedRestoreScript.value)
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px">
    <div class="dashboard-card">
      <div class="card-header">
        <div class="card-title">
          <div
            class="card-icon"
            style="background-color: rgba(156, 163, 175, 0.2); color: var(--text-main)"
          >
            <RotateCcw :size="18" :stroke-width="2" />
          </div>
          <div>
            <div>KHÔI PHỤC MẶC ĐỊNH (RESTORE DEFAULT)</div>
            <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
              Khôi Phục Cài Đặt Services Từ Thư Mục Restore
            </div>
          </div>
        </div>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px">
        Khôi phục các dịch vụ Windows về trạng thái mặc định từ thư mục resources/scripts/Restore.
      </p>

      <div class="grid-3">
        <div
          style="
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 12px;
          "
        >
          <div>
            <div class="cyber-tool-header">
              <div class="cyber-icon-badge violet-glow">
                <Gamepad2 :size="17" :stroke-width="2.2" />
              </div>
              <div style="font-weight: 700; color: #fff; font-size: 14px">Restore Gamer Services</div>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px">
              Khôi phục các dịch vụ đã bị tắt cho Game thủ về mặc định.
            </div>
          </div>
          <button
            class="btn-secondary"
            :disabled="isRunning"
            @click="runProfile('restore-gamer-services', 'Disable Services For Gamers Restore')"
          >
            <Play :size="13" :stroke-width="2.2" />
            <span>Chạy Script Restore Gamer</span>
          </button>
        </div>

        <div
          style="
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 12px;
          "
        >
          <div>
            <div class="cyber-tool-header">
              <div class="cyber-icon-badge cyan-glow">
                <Briefcase :size="17" :stroke-width="2.2" />
              </div>
              <div style="font-weight: 700; color: #fff; font-size: 14px">
                Restore Professional Services
              </div>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px">
              Khôi phục các dịch vụ đã bị tắt cho Professional về mặc định.
            </div>
          </div>
          <button
            class="btn-secondary"
            :disabled="isRunning"
            @click="runProfile('restore-professional-services', 'Disable Services For Professionals Restore')"
          >
            <Play :size="13" :stroke-width="2.2" />
            <span>Chạy Script Restore Professional</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Restore Script Selection -->
    <div class="dashboard-card">
      <div class="card-header" style="margin-bottom: 12px">
        <div class="card-title">
          <div class="card-icon" style="background-color: rgba(22, 119, 255, 0.15); color: #60a5fa">
            <RotateCcw :size="18" :stroke-width="2" />
          </div>
          <div>
            <div>RESTORE SCRIPTS</div>
            <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
              resources/scripts/Restore
            </div>
          </div>
        </div>
      </div>
      <div class="reg-row" style="border-color: rgba(22, 119, 255, 0.3); background: rgba(22, 119, 255, 0.05)">
        <select v-model="selectedRestoreScript" class="reg-select" :disabled="isRunning">
          <option v-for="opt in RESTORE_SCRIPT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <button class="btn-primary" :disabled="isRunning" @click="applyRestoreScript">
          <Play :size="13" :stroke-width="2.2" /><span>Áp dụng</span>
        </button>
      </div>
    </div>

    <!-- Log Console -->
    <div class="dashboard-card" style="background-color: #05080e">
      <div
        style="
          font-size: 12px;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--text-muted);
          margin-bottom: 8px;
        "
      >
        CONSOLE RESTORE LOG OUTPUT
      </div>
      <pre
        style="
          font-family: var(--font-mono);
          font-size: 12px;
          color: #6ee7b7;
          background: #000;
          padding: 14px;
          border-radius: 6px;
          min-height: 120px;
          white-space: pre-wrap;
          overflow-y: auto;
          border: 1px solid rgba(255, 255, 255, 0.08);
        "
        >{{ logOutput || 'Sẵn sàng chờ thực thi script Restore...' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.reg-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(22, 119, 255, 0.25);
  border-radius: 10px;
  background: rgba(22, 119, 255, 0.05);
}
.reg-select {
  flex: 1;
  padding: 9px 12px;
  color: #e2e8f0;
  font: 500 12px/1.2 var(--font-mono, ui-monospace, monospace);
  background: #0d1526;
  border: 1px solid rgba(96, 165, 250, 0.3);
  border-radius: 8px;
  outline: none;
  max-height: 180px;
  overflow-y: auto;
}
.reg-select:focus { border-color: #60a5fa; }
.reg-select:disabled { opacity: 0.6; }
</style>
