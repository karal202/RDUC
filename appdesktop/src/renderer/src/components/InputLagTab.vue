<script setup>
import { ref } from 'vue'
import { MousePointer2, Keyboard, Play } from 'lucide-vue-next'

const logOutput = ref('')
const isRunning = ref(false)
const selectedMouseQueue  = ref('mouse-queue-22')
const selectedKeyQueue    = ref('keyboard-queue-22')

const MOUSE_QUEUE_OPTIONS = [
  { value: 'mouse-queue-10',      label: 'Data Queue Size: 10 Decimal' },
  { value: 'mouse-queue-20',      label: 'Data Queue Size: 20 Decimal' },
  { value: 'mouse-queue-22',      label: 'Data Queue Size: 22 Decimal' },
  { value: 'mouse-queue-25',      label: 'Data Queue Size: 25 Decimal' },
  { value: 'mouse-queue-default', label: 'Data Queue Size: Default Windows' }
]
const KEY_QUEUE_OPTIONS = [
  { value: 'keyboard-queue-10',      label: 'Data Queue Size: 10 Decimal' },
  { value: 'keyboard-queue-15',      label: 'Data Queue Size: 15 Decimal' },
  { value: 'keyboard-queue-20',      label: 'Data Queue Size: 20 Decimal' },
  { value: 'keyboard-queue-22',      label: 'Data Queue Size: 22 Decimal' },
  { value: 'keyboard-queue-25',      label: 'Data Queue Size: 25 Decimal' },
  { value: 'keyboard-queue-default', label: 'Data Queue Size: Default Windows' }
]

const run = async (scriptKey, description, options = {}) => {
  if (isRunning.value) return
  isRunning.value = true
  logOutput.value = `[INPUT LAG] Dang thuc thi [${scriptKey}] - ${description}...\n`
  try {
    const res = await window.api.runDawaScript(scriptKey, options)
    if (res.success) {
      logOutput.value += `OK ${res.message}\n`
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

const applyMouseQueue = () => {
  const opt = MOUSE_QUEUE_OPTIONS.find(o => o.value === selectedMouseQueue.value)
  runProfile(selectedMouseQueue.value, opt?.label || selectedMouseQueue.value)
}
const applyKeyQueue = () => {
  const opt = KEY_QUEUE_OPTIONS.find(o => o.value === selectedKeyQueue.value)
  runProfile(selectedKeyQueue.value, opt?.label || selectedKeyQueue.value)
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px">
    <!-- Header -->
    <div class="dashboard-card">
      <div class="card-header">
        <div class="card-title">
          <div class="card-icon" style="background-color: rgba(245, 158, 11, 0.15); color: var(--accent-amber)">
            <MousePointer2 :size="18" :stroke-width="2" />
          </div>
          <div>
            <div>TOI UU CHUOT & BAN PHIM (INPUT LAG)</div>
            <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
              Data Queue Size từ thư mục Input Lag
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mouse Queue Size -->
    <div class="dashboard-card">
      <div class="card-header" style="margin-bottom:12px">
        <div class="card-title">
          <div class="card-icon" style="background-color:rgba(167,139,250,0.15);color:#a78bfa">
            <MousePointer2 :size="18" :stroke-width="2" />
          </div>
          <div>
            <div>MOUSE DATA QUEUE SIZE</div>
            <div style="font-size:11px;font-weight:400;color:var(--text-muted)">
              resources/scripts/Input Lag/Mouse/DataQueueSize
            </div>
          </div>
        </div>
      </div>
      <div class="reg-row" style="border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.05)">
        <select v-model="selectedMouseQueue" class="reg-select" :disabled="isRunning">
          <option v-for="opt in MOUSE_QUEUE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <button class="btn-primary" :disabled="isRunning" @click="applyMouseQueue">
          <Play :size="13" :stroke-width="2.2" /><span>Ap dung</span>
        </button>
      </div>
    </div>

    <!-- Keyboard Queue Size -->
    <div class="dashboard-card">
      <div class="card-header" style="margin-bottom:12px">
        <div class="card-title">
          <div class="card-icon" style="background-color:rgba(96,165,250,0.15);color:#60a5fa">
            <Keyboard :size="18" :stroke-width="2" />
          </div>
          <div>
            <div>KEYBOARD DATA QUEUE SIZE</div>
            <div style="font-size:11px;font-weight:400;color:var(--text-muted)">
              resources/scripts/Input Lag/Keyboard/DataQueueSize
            </div>
          </div>
        </div>
      </div>
      <div class="reg-row" style="border-color:rgba(96,165,250,0.3);background:rgba(96,165,250,0.05)">
        <select v-model="selectedKeyQueue" class="reg-select" :disabled="isRunning">
          <option v-for="opt in KEY_QUEUE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <button class="btn-primary" :disabled="isRunning" @click="applyKeyQueue">
          <Play :size="13" :stroke-width="2.2" /><span>Ap dung</span>
        </button>
      </div>
    </div>

    <!-- Log Console -->
    <div class="dashboard-card" style="background-color:#05080e">
      <div style="font-size:12px;font-weight:700;font-family:var(--font-mono);color:var(--accent-amber);margin-bottom:8px">
        CONSOLE INPUT LAG LOG OUTPUT
      </div>
      <pre style="font-family:var(--font-mono);font-size:12px;color:#6ee7b7;background:#000;padding:14px;border-radius:6px;min-height:120px;white-space:pre-wrap;overflow-y:auto;border:1px solid rgba(255,255,255,0.08);margin:0"
        >{{ logOutput || 'San sang cho thuc thi script Input Lag...' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.reg-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(22,119,255,0.25);
  border-radius: 10px;
  background: rgba(22,119,255,0.05);
}
.reg-select {
  flex: 1;
  padding: 9px 12px;
  color: #e2e8f0;
  font: 500 12px/1.2 var(--font-mono, ui-monospace, monospace);
  background: #0d1526;
  border: 1px solid rgba(96,165,250,0.3);
  border-radius: 8px;
  outline: none;
  max-height: 180px;
  overflow-y: auto;
}
.reg-select:focus { border-color: #60a5fa; }
.reg-select:disabled { opacity: 0.6; }
</style>
