<script setup>
import { ref } from 'vue'
import {
  Globe,
  Zap,
  RefreshCw,
  Radio,
  FileCode2,
  Play,
  Terminal,
  Copy,
  Trash2,
  Check,
  ShieldCheck,
  Wifi,
  Activity,
  Cpu,
  Layers
} from 'lucide-vue-next'

const logOutput = ref('')
const isRunning = ref(false)
const copied = ref(false)
const selectedNetworkReg = ref('network-full-tweaks')

const NETWORK_CARDS = [
  {
    key: 'network-tcp-ping',
    title: 'Ultra Low Ping TCP/IP',
    badge: 'NAGLE DISABLED',
    icon: Zap,
    desc: 'Vô hiệu hóa thuật toán gom gói Nagle (TcpAckFrequency=1, TCPNoDelay=1). Gói tin game được gửi tức thời, giảm chênh lệch ping 5-25ms.',
    accent: '#00c2ff',
    btnLabel: 'Kích hoạt TCP NoDelay'
  },
  {
    key: 'network-flush-dns',
    title: 'Flush DNS & Reset Winsock',
    badge: 'REPAIR SOCKET',
    icon: RefreshCw,
    desc: 'Xóa toàn bộ cache DNS cũ bị phân mảnh, giải phóng bảng định tuyến và khôi phục Winsock stack khi gặp hiện tượng packet loss.',
    accent: '#22c55e',
    btnLabel: 'Flush DNS & Reset'
  },
  {
    key: 'network-dns-gaming',
    title: 'Gaming Fast DNS Switcher',
    badge: 'LOW JITTER',
    icon: Radio,
    desc: 'Tối ưu máy chủ phân giải DNS sang Cloudflare (1.1.1.1) và Google (8.8.8.8) để rút ngắn thời gian kết nối tới cụm máy chủ game quốc tế.',
    accent: '#3b82f6',
    btnLabel: 'Chuyển đổi DNS Gaming'
  }
]

const REGISTRY_TWEAKS = [
  {
    value: 'network-full-tweaks',
    title: 'Network Tweaks Full Suite',
    badge: 'ALL-IN-ONE',
    icon: Globe,
    desc: 'Gói tinh chỉnh TCP/IP, TCP Chimney Offload và Receive Side Scaling tổng thể.',
    accent: '#3b82f6'
  },
  {
    value: 'network-fast-send',
    title: 'Fast Send Datagram Threshold',
    badge: 'UDP SPEED',
    icon: Activity,
    desc: 'Tăng tốc độ đẩy gói tin UDP trực tiếp qua card mạng NIC, giảm tải cho CPU.',
    accent: '#06b6d4'
  },
  {
    value: 'network-tcp-ping',
    title: 'ACK Ticks & ACK Frequency',
    badge: 'ACK TIMING',
    icon: Cpu,
    desc: 'Xác nhận gói tin phản hồi TCP ngay trong tick đồng hồ đầu tiên không chờ gom trễ.',
    accent: '#8b5cf6'
  },
  {
    value: 'network-dns',
    title: 'DNS Cache Buffer Optimization',
    badge: 'DNS SPEED',
    icon: Layers,
    desc: 'Tối ưu hóa bảng băm phân giải tên miền hệ thống, giảm thời gian tra cứu domain.',
    accent: '#10b981'
  }
]

const NETWORK_REG_OPTIONS = [
  { value: 'network-full-tweaks', label: 'Network Tweaks (Full TCP/IP Suite)' },
  { value: 'network-fast-send', label: 'Fast Send Datagram Threshold' },
  { value: 'network-tcp-ping', label: 'ACK Ticks & ACK Frequency' },
  { value: 'network-ack-ticks', label: 'AckTicksandAckFrequency.reg' },
  { value: 'network-dns', label: 'DNS.cmd' },
  { value: 'network-fast-send-reg', label: 'FastSendDatagramThreshold.reg' },
  { value: 'network-tweaks-reg', label: 'Network Tweaks.reg' },
  { value: 'network-acks-freq', label: 'AckTicksandAckFrequency (riêng)' }
]

const run = async (scriptKey, description, options = {}) => {
  if (isRunning.value) return
  isRunning.value = true
  const time = new Date().toLocaleTimeString()
  logOutput.value += `[${time}] [NETWORK] Đang thực thi [${scriptKey}] - ${description}...\n`
  try {
    const res = await window.api.runDawaScript(scriptKey, options)
    if (res?.success) {
      logOutput.value += `✅ ${res.message}\n`
      if (res.stepResults) {
        res.stepResults.forEach((s, i) => {
          logOutput.value += `  [Bước ${i + 1}] ${s.file} ${s.args || ''}\n`
          if (s.stdout) logOutput.value += `      > ${s.stdout.trim()}\n`
          if (s.stderr) logOutput.value += `      ! ${s.stderr.trim()}\n`
        })
      }
    } else {
      logOutput.value += `❌ ${res?.message || 'Thất bại'}\n`
    }
  } catch (err) {
    logOutput.value += `❌ Lỗi: ${err.message || err}\n`
  } finally {
    isRunning.value = false
  }
}

const applyNetworkReg = (val) => {
  if (val) selectedNetworkReg.value = val
  const opt = NETWORK_REG_OPTIONS.find((o) => o.value === selectedNetworkReg.value)
  run('registry-profile', opt?.label || selectedNetworkReg.value, {
    profile: selectedNetworkReg.value
  })
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
</script>

<template>
  <div class="net-page">
    <!-- Header Telemetry Banner -->
    <header class="net-header-card">
      <div class="net-header-main">
        <div class="net-badge-pill">
          <Globe :size="13" class="text-cyan-400" />
          <span>NETWORK & TCP/IP STACK BOOSTER</span>
        </div>
        <h1 class="net-main-title">Tối Ưu Mạng & Ping (Network Optimizer)</h1>
        <p class="net-main-desc">
          Triệt tiêu thuật toán gom gói Nagle, giảm độ trễ TCP/IP Stack, dọn sạch bộ đệm DNS và
          chống nghẽn đường truyền game.
        </p>
      </div>
      <div class="net-telemetry-row">
        <div class="net-tele-chip">
          <Zap :size="12" class="text-cyan-400" />
          <span>TCP NO-DELAY: <strong>ACTIVE</strong></span>
        </div>
        <div class="net-tele-chip">
          <ShieldCheck :size="12" class="text-emerald-400" />
          <span>WINSOCK: <strong>HEALTHY</strong></span>
        </div>
        <div class="net-tele-chip">
          <Wifi :size="12" class="text-blue-400" />
          <span>DNS JITTER: <strong>LOW</strong></span>
        </div>
      </div>
    </header>

    <!-- SECTION 1: CORE ACTIONS -->
    <section class="net-card">
      <div class="net-card-head">
        <div class="net-section-tag" style="--c: #00c2ff">
          <Globe :size="13" />
          <span>CORE OPTIMIZATIONS</span>
        </div>
        <h2 class="net-card-title">Bộ 3 Tối Ưu Mạng Cốt Lõi</h2>
        <p class="net-card-sub">Các tác vụ giảm độ trễ ping và làm mới kết nối mạng tức thì</p>
      </div>

      <div class="net-core-grid">
        <div
          v-for="card in NETWORK_CARDS"
          :key="card.key"
          class="net-core-item"
          :style="{ '--c': card.accent }"
        >
          <div class="net-core-top">
            <div class="net-icon-box">
              <component :is="card.icon" :size="22" stroke-width="2.2" />
            </div>
            <span class="net-pill-badge">{{ card.badge }}</span>
          </div>

          <div class="net-core-content">
            <h3 class="net-core-title">{{ card.title }}</h3>
            <p class="net-core-desc">{{ card.desc }}</p>
          </div>

          <button
            type="button"
            class="net-action-btn"
            :disabled="isRunning"
            @click="run(card.key, card.title)"
          >
            <Play :size="14" class="fill-current" />
            <span>{{ card.btnLabel }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- SECTION 2: ADVANCED TCP/IP REGISTRY TWEAKS -->
    <section class="net-card">
      <div class="net-card-head">
        <div class="net-section-tag" style="--c: #3b82f6">
          <FileCode2 :size="13" />
          <span>TCP/IP PROTOCOL SUITE</span>
        </div>
        <div class="net-title-with-count">
          <h2 class="net-card-title">Tinh Chỉnh Giao Thức Mạng Nâng Cao</h2>
          <span class="net-count-pill">Chuyên Sâu</span>
        </div>
        <p class="net-card-sub">
          Cấu hình trực tiếp các khóa Registry của NetBT, AFD và TCP/IP Stack
        </p>
      </div>

      <div class="net-registry-grid">
        <div
          v-for="reg in REGISTRY_TWEAKS"
          :key="reg.value"
          class="net-reg-item"
          :style="{ '--c': reg.accent }"
        >
          <div class="net-reg-head">
            <div class="net-reg-icon">
              <component :is="reg.icon" :size="18" />
            </div>
            <span class="net-reg-badge">{{ reg.badge }}</span>
          </div>

          <div class="net-reg-content">
            <strong class="net-reg-title">{{ reg.title }}</strong>
            <p class="net-reg-desc">{{ reg.desc }}</p>
          </div>

          <button
            type="button"
            class="net-reg-btn"
            :disabled="isRunning"
            @click="applyNetworkReg(reg.value)"
          >
            <Play :size="12" class="fill-current" />
            <span>Áp dụng</span>
          </button>
        </div>
      </div>

      <!-- Quick Registry Selector -->
      <div class="net-selector-box">
        <div class="net-selector-info">
          <FileCode2 :size="16" class="text-blue-400" />
          <span>Chọn file Registry tùy chỉnh (.reg) từ thư mục tài nguyên:</span>
        </div>
        <div class="net-selector-row">
          <select v-model="selectedNetworkReg" class="net-select-control" :disabled="isRunning">
            <option v-for="opt in NETWORK_REG_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <button
            type="button"
            class="net-select-btn"
            :disabled="isRunning"
            @click="applyNetworkReg()"
          >
            <Play :size="13" class="fill-current" />
            <span>Áp dụng Registry</span>
          </button>
        </div>
      </div>
    </section>

    <!-- SECTION 3: CONSOLE TERMINAL -->
    <section class="net-console-card">
      <div class="net-console-header">
        <div class="net-console-title">
          <Terminal :size="14" class="text-cyan-400" />
          <span>NETWORK LOG & PACKET DIAGNOSTICS</span>
          <div class="net-live-indicator" :class="{ running: isRunning }">
            <span class="net-live-dot" />
            <span>{{ isRunning ? 'ĐANG THỰC THI...' : 'SẴN SÀNG' }}</span>
          </div>
        </div>
        <div class="net-console-actions">
          <button
            type="button"
            class="net-tool-btn"
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
            class="net-tool-btn"
            title="Xóa console"
            :disabled="!logOutput"
            @click="clearLog"
          >
            <Trash2 :size="13" />
            <span>Xóa log</span>
          </button>
        </div>
      </div>
      <pre class="net-terminal-view">{{
        logOutput || 'Sẵn sàng chờ thực thi script tối ưu hóa mạng và ping...'
      }}</pre>
    </section>
  </div>
</template>

<style scoped>
.net-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 24px;
  max-width: 1560px;
  margin: 0 auto;
}

/* Header Banner */
.net-header-card {
  position: relative;
  overflow: hidden;
  padding: 22px 26px;
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    rgba(6, 182, 212, 0.12) 0%,
    rgba(14, 20, 36, 0.85) 50%,
    rgba(59, 130, 246, 0.08) 100%
  );
  border: 1px solid rgba(6, 182, 212, 0.25);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.net-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.3);
  color: #22d3ee;
  font: 700 10.5px/1 var(--font-mono);
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.net-main-title {
  font:
    800 24px/1.15 'Archivo',
    sans-serif;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}

.net-main-desc {
  font-size: 13px;
  color: rgba(226, 232, 240, 0.72);
  max-width: 720px;
  line-height: 1.5;
  margin: 0;
}

.net-telemetry-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.net-tele-chip {
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

.net-tele-chip strong {
  color: #f8fafc;
  font-weight: 700;
}

/* Base Card */
.net-card {
  position: relative;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.78) 0%, rgba(10, 15, 29, 0.72) 100%);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 18px;
  padding: 22px;
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
}

.net-card-head {
  margin-bottom: 18px;
}

.net-section-tag {
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

.net-card-title {
  font:
    700 18px/1.2 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0;
}

.net-title-with-count {
  display: flex;
  align-items: center;
  gap: 10px;
}

.net-count-pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font: 600 10.5px var(--font-mono);
  color: #94a3b8;
}

.net-card-sub {
  font-size: 12.5px;
  color: #94a3b8;
  margin: 4px 0 0;
  line-height: 1.45;
}

/* Core Grid */
.net-core-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.net-core-item {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.07);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.net-core-item:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--c) 50%, transparent);
  background: color-mix(in srgb, var(--c) 5%, rgba(15, 23, 42, 0.6));
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.4),
    0 0 24px color-mix(in srgb, var(--c) 15%, transparent);
}

.net-core-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.net-icon-box {
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

.net-pill-badge {
  font: 700 9.5px var(--font-mono);
  padding: 3px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  letter-spacing: 0.06em;
}

.net-core-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.net-core-title {
  font:
    700 15px 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0;
}

.net-core-desc {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.net-action-btn {
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

.net-action-btn:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
}

.net-action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.net-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Registry Grid */
.net-registry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.net-reg-item {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.25s ease;
}

.net-reg-item:hover {
  border-color: color-mix(in srgb, var(--c) 40%, transparent);
  background: rgba(255, 255, 255, 0.04);
}

.net-reg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.net-reg-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--c) 14%, transparent);
  color: var(--c);
}

.net-reg-badge {
  font: 700 9px var(--font-mono);
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}

.net-reg-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.net-reg-title {
  font:
    600 13.5px 'Archivo',
    sans-serif;
  color: #f1f5f9;
}

.net-reg-desc {
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.45;
  margin: 0;
}

.net-reg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 12px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
  background: color-mix(in srgb, var(--c) 12%, transparent);
  color: #ffffff;
  font: 600 11px var(--font-sans);
  cursor: pointer;
  transition: all 0.2s ease;
}

.net-reg-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--c) 25%, transparent);
}

.net-reg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Selector Box */
.net-selector-box {
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.net-selector-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #cbd5e1;
}

.net-selector-row {
  display: flex;
  gap: 12px;
}

.net-select-control {
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

.net-select-control:focus {
  border-color: #3b82f6;
}

.net-select-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 18px;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.5);
  background: rgba(59, 130, 246, 0.2);
  color: #ffffff;
  font: 700 12px var(--font-sans);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.net-select-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.35);
}

.net-select-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Console Section */
.net-console-card {
  border-radius: 14px;
  background: #040711;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.5);
}

.net-console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.025);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.net-console-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 700 11px var(--font-mono);
  color: #cbd5e1;
  letter-spacing: 0.06em;
}

.net-live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.1);
  font-size: 9.5px;
  color: #94a3b8;
}

.net-live-indicator.running {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
}

.net-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.net-live-indicator.running .net-live-dot {
  background: #06b6d4;
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

.net-console-actions {
  display: flex;
  gap: 8px;
}

.net-tool-btn {
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

.net-tool-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.net-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.net-terminal-view {
  margin: 0;
  padding: 14px 16px;
  font: 500 12px/1.65 var(--font-mono);
  color: #22d3ee;
  background: #02040a;
  min-height: 100px;
  max-height: 220px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1024px) {
  .net-core-grid {
    grid-template-columns: 1fr;
  }
}
</style>
