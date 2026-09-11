<script setup>
import { ref } from 'vue'
import { Globe, Zap, RefreshCw, Radio, FileCode2, Play } from 'lucide-vue-next'

const logOutput = ref('')
const isRunning = ref(false)
const selectedNetworkReg = ref('network-full-tweaks')

const NETWORK_REG_OPTIONS = [
  { value: 'network-full-tweaks', label: 'Network Tweaks (Full TCP/IP)' },
  { value: 'network-fast-send', label: 'Fast Send Datagram Threshold' },
  { value: 'network-tcp-ping', label: 'ACK Ticks & ACK Frequency' },
  { value: 'network-ack-ticks', label: 'AckTicksandAckFrequency.reg' },
  { value: 'network-dns', label: 'DNS.cmd' },
  { value: 'network-fast-send-reg', label: 'FastSendDatagramThreshold.reg' },
  { value: 'network-tweaks-reg', label: 'Network Tweaks.reg' }
]

const run = async (scriptKey, description, options = {}) => {
  if (isRunning.value) return
  isRunning.value = true
  logOutput.value = `[NETWORK] Dang thuc thi [${scriptKey}] - ${description}...\n`
  try {
    const res = await window.api.runDawaScript(scriptKey, options)
    if (res.success) {
      logOutput.value += `OK ${res.message}\n`
      if (res.stepResults) res.stepResults.forEach((s, i) => {
        logOutput.value += `  [${i + 1}] ${s.file} ${s.args}\n`
        if (s.stdout) logOutput.value += `        ${s.stdout.trim()}\n`
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

const applyNetworkReg = () => {
  const opt = NETWORK_REG_OPTIONS.find(o => o.value === selectedNetworkReg.value)
  run('registry-profile', opt?.label || selectedNetworkReg.value, { profile: selectedNetworkReg.value })
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px">
    <div class="dashboard-card">
      <div class="card-header">
        <div class="card-title">
          <div class="card-icon" style="background-color: rgba(0, 240, 255, 0.15); color: var(--accent-cyan)">
            <Globe :size="18" :stroke-width="2" />
          </div>
          <div>
            <div>TOI UU MANG & PING (NETWORK OPTIMIZER)</div>
            <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
              Giam Latency, Toi uu TCP/IP Stack & Flush DNS
            </div>
          </div>
        </div>
      </div>
      <div class="grid-3">
        <div class="ncard">
          <div>
            <div class="cyber-tool-header">
              <div class="cyber-icon-badge cyan-glow"><Zap :size="17" :stroke-width="2.2" /></div>
              <div style="font-weight:700;color:#fff;font-size:14px">Ultra Low Ping TCP/IP</div>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
              ACK Ticks & ACK Frequency giam lag in-game.
            </div>
          </div>
          <button class="btn-primary" :disabled="isRunning" @click="run('network-tcp-ping','ACK Ticks')">
            <Play :size="13" :stroke-width="2.2" /><span>Chay Script Toi Uu TCP</span>
          </button>
        </div>
        <div class="ncard">
          <div>
            <div class="cyber-tool-header">
              <div class="cyber-icon-badge emerald-glow"><RefreshCw :size="17" :stroke-width="2.2" /></div>
              <div style="font-weight:700;color:#fff;font-size:14px">Flush DNS & Reset Winsock</div>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
              Xoa cache DNS cu, reset Winsock sua loi lag mang.
            </div>
          </div>
          <button class="btn-secondary" :disabled="isRunning" @click="run('network-flush-dns','Flush DNS')">
            <Play :size="13" :stroke-width="2.2" /><span>Chay Script Flush DNS</span>
          </button>
        </div>
        <div class="ncard">
          <div>
            <div class="cyber-tool-header">
              <div class="cyber-icon-badge primary-glow"><Radio :size="17" :stroke-width="2.2" /></div>
              <div style="font-weight:700;color:#fff;font-size:14px">Gaming DNS Switcher</div>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
              Chuyen sang DNS Google (8.8.8.8) hoac Cloudflare (1.1.1.1).
            </div>
          </div>
          <button class="btn-secondary" :disabled="isRunning" @click="run('network-dns-gaming','Gaming DNS')">
            <Play :size="13" :stroke-width="2.2" /><span>Chay Script DNS Gaming</span>
          </button>
        </div>
      </div>
    </div>

    <div class="dashboard-card">
      <div class="card-header" style="margin-bottom:14px">
        <div class="card-title">
          <div class="card-icon" style="background-color:rgba(22,119,255,0.15);color:#60a5fa">
            <FileCode2 :size="18" :stroke-width="2" />
          </div>
          <div>
            <div>NETWORK REGISTRY TWEAKS</div>
            <div style="font-size:11px;font-weight:400;color:var(--text-muted)">
              File .reg tinh chinh TCP/IP tu resources/scripts/Network
            </div>
          </div>
        </div>
      </div>
      <div class="reg-row">
        <select v-model="selectedNetworkReg" class="reg-select" :disabled="isRunning">
          <option v-for="opt in NETWORK_REG_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <button class="btn-primary" :disabled="isRunning" @click="applyNetworkReg">
          <Play :size="13" :stroke-width="2.2" /><span>Ap dung Registry</span>
        </button>
      </div>
    </div>

    <div class="dashboard-card" style="background-color:#05080e">
      <div style="font-size:12px;font-weight:700;font-family:var(--font-mono);color:var(--accent-cyan);margin-bottom:8px">
        CONSOLE NETWORK LOG OUTPUT
      </div>
      <pre style="font-family:var(--font-mono);font-size:12px;color:#6ee7b7;background:#000;padding:14px;border-radius:6px;min-height:120px;white-space:pre-wrap;overflow-y:auto;border:1px solid rgba(255,255,255,0.08);margin:0"
        >{{ logOutput || 'San sang cho thuc thi script Network...' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.ncard {
  background: rgba(0,0,0,0.4);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
}
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