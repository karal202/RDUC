<script setup>
import { ref } from 'vue'
import { BatteryCharging, Gamepad2, Sparkles, Play } from 'lucide-vue-next'

const logOutput = ref('')
const isRunning = ref(false)

const DAWA_SCRIPTS = Object.freeze([
  {
    key: 'dawa-gaming-boost',
    title: 'DAWA Ultimate Gaming Boost',
    icon: Gamepad2,
    desc: 'Tắt dịch vụ thừa, giải phóng CPU & RAM cho Game.',
    btnClass: 'btn-primary',
    btnLabel: 'Chạy Script DAWA Boost'
  },
  {
    key: 'dawa-cleaner',
    title: 'DAWA Deep Cache Cleaner',
    icon: Sparkles,
    desc: 'Xóa file rác Temp, Prefetch, Windows Update cache.',
    btnClass: 'btn-secondary',
    btnLabel: 'Chạy Script Cache Cleaner'
  },
  {
    key: 'dawa-power-plan',
    title: 'Ultimate Power Plan',
    icon: BatteryCharging,
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
  <div class="dawa-optimizer-page">
    <section class="dashboard-card dawa-script-panel">
      <div class="dawa-section-heading dawa-script-heading">
        <div>
          <span class="eyebrow">CẤU HÌNH TỐI ƯU</span>
          <h3>Công cụ DAWA</h3>
          <p>Chọn cấu hình tối ưu đã được ký và whitelist sẵn.</p>
        </div>
        <span class="script-security">WHITELIST SECURED</span>
      </div>
      <div class="grid-3">
        <div v-for="s in DAWA_SCRIPTS" :key="s.key" class="dawa-loadout">
          <div>
            <div class="dawa-loadout-icon" :class="`reactor-${s.key}`">
              <span class="reactor-aura"></span>
              <component :is="s.icon" :size="20" :stroke-width="1.9" class="reactor-core-icon" />
            </div>
            <div class="dawa-loadout-title">{{ s.title }}</div>
            <div class="dawa-loadout-desc">{{ s.desc }}</div>
          </div>
          <button :class="s.btnClass" :disabled="isRunning" @click="runDawaScript(s.key, s.title)">
            <Play :size="13" :stroke-width="2.2" class="btn-play-icon" />
            {{ s.btnLabel }}
          </button>
        </div>
      </div>
    </section>

    <div class="dashboard-card dawa-console" style="background-color: #05080e">
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
