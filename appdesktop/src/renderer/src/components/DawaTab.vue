<script setup>
import { ref } from 'vue'

const logOutput = ref('')
const isRunning = ref(false)

const DAWA_SCRIPTS = Object.freeze([
  {
    key: 'dawa-gaming-boost',
    title: '🔥 DAWA Ultimate Gaming Boost',
    desc: 'Tắt dịch vụ thừa, giải phóng CPU & RAM cho Game.',
    btnClass: 'btn-primary',
    btnLabel: 'Chạy Script DAWA Boost'
  },
  {
    key: 'dawa-cleaner',
    title: '🧹 DAWA Deep Cache Cleaner',
    desc: 'Xóa file rác Temp, Prefetch, Windows Update cache.',
    btnClass: 'btn-secondary',
    btnLabel: 'Chạy Script Cache Cleaner'
  },
  {
    key: 'dawa-power-plan',
    title: '🔋 Ultimate Power Plan',
    desc: 'Kích hoạt chế độ nguồn điện hiệu năng cao nhất.',
    btnClass: 'btn-secondary',
    btnLabel: 'Chạy Script Power Plan'
  }
])

const runDawaScript = async (scriptKey, description) => {
  isRunning.value = true
  logOutput.value = `[DAWA SCRIPT] Đang thực thi [${scriptKey}] - ${description}...\n`

  try {
    const res = await window.api.runDawaScript(scriptKey)
    if (res.success) {
      logOutput.value += `✅ ${res.message}\n`
      if (res.stepResults) {
        res.stepResults.forEach((step, i) => {
          logOutput.value += `  [${i + 1}] ${step.file} ${step.args}\n`
          if (step.stdout) logOutput.value += `      OUTPUT: ${step.stdout.trim() || '(none)'}\n`
          if (step.stderr) logOutput.value += `      STDERR: ${step.stderr.trim() || '(none)'}\n`
        })
      }
    } else {
      logOutput.value += `❌ ${res.message}\n`
      if (res.stepResults) {
        res.stepResults.forEach((step, i) => {
          logOutput.value += `  [${i + 1}] ${step.file} ${step.args} -> ${step.success ? 'OK' : 'FAIL (code ' + step.code + ')'}\n`
          if (step.stderr) logOutput.value += `      STDERR: ${step.stderr.trim()}\n`
        })
      }
    }
  } catch (err) {
    logOutput.value += `❌ Error: ${err.message}\n`
  } finally {
    isRunning.value = false
  }
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px">
    <div class="dashboard-card">
      <div class="card-header">
        <div class="card-title">
          <div class="card-icon">⚡</div>
          <div>
            <div>TỐI ƯU HỆ THỐNG DAWA OPTIMIZER</div>
            <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
              Các công cụ tinh chỉnh hiệu năng Windows & Game Mode
            </div>
          </div>
        </div>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px">
        Chọn cấu hình tối ưu để thực thi lệnh đã được DAWA ký và whitelist sẵn. Toàn bộ command chạy
        dưới user-mode với quyền đã đăng nhập.
      </p>

      <div class="grid-3">
        <div
          v-for="s in DAWA_SCRIPTS"
          :key="s.key"
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
            <div style="font-weight: 700; color: #fff; font-size: 14px">{{ s.title }}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">
              {{ s.desc }}
            </div>
          </div>
          <button :class="s.btnClass" :disabled="isRunning" @click="runDawaScript(s.key, s.title)">
            {{ s.btnLabel }}
          </button>
        </div>
      </div>
    </div>

    <div class="dashboard-card" style="background-color: #05080e">
      <div
        style="
          font-size: 12px;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-red);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        "
      >
        <span>CONSOLE DAWA SCRIPT EXECUTION LOG</span>
        <span style="font-weight: 400; color: var(--text-dim)">WHITELIST SECURED</span>
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
        >{{ logOutput || 'Sẵn sàng chờ thực thi script DAWA đã được ký...' }}</pre>
    </div>
  </div>
</template>
