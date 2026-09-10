<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import {
  Cpu,
  MemoryStick,
  CircuitBoard,
  Monitor,
  Network,
  HardDrive,
  Sparkles,
  Rocket,
  Gamepad2,
  Zap,
  Gauge,
  Power,
  MousePointer2,
  KeyboardIcon,
  RotateCcw,
  Laptop,
  TrendingUp,
  Timer,
  ThermometerSun,
  Activity
} from 'lucide-vue-next'
import BannerCarousel from './BannerCarousel.vue'
import { landscapeBanners } from '../assets/banners'

const stats = ref({
  deviceType: 'pc',
  cpu: {
    brand: 'Intel / AMD CPU',
    usagePercent: 0,
    speed: 0,
    cores: 0,
    temp: null,
    manufacturer: ''
  },
  gpu: {
    model: 'NVIDIA / AMD GPU',
    vendor: 'N/A',
    vram: 'N/A',
    usagePercent: null,
    temp: null,
    hasDiscreteGpu: false
  },
  ram: {
    totalGB: '0',
    usedGB: '0',
    freeGB: '0',
    usagePercent: 0,
    totalBytes: 0,
    usedBytes: 0,
    freeBytes: 0
  },
  network: { iface: '', rx_sec: 0, tx_sec: 0 },
  disk: { fs: '', usePercent: 0, size: '0', used: '0', available: '0' },
  system: { platform: 'win32', hostname: 'PC-HOST', uptimeSeconds: 0, arch: 'x64', release: '' },
  battery: { percent: null, charging: false }
})

const isLoading = ref(true)
const isRevealed = ref(false)
let timer = null
let isFetching = false
let isMonitoring = false
const liveUptime = ref(0)
let liveTimer = null
let revealTimer = null

const pad = (n) => String(n).padStart(2, '0')
const uptimeParts = computed(() => {
  const total = liveUptime.value || 0
  return {
    hh: pad(Math.floor(total / 3600)),
    mm: pad(Math.floor((total % 3600) / 60)),
    ss: pad(total % 60)
  }
})

// Chu vi vòng tròn gauge pin trong SVG laptop (r=19) -> 2 * PI * 19 ≈ 119.4
const BATTERY_RING_CIRC = 119.4
const batteryDasharray = computed(() => {
  const pct = Math.min(Math.max(Number(stats.value.battery?.percent) || 0, 0), 100)
  const filled = (pct / 100) * BATTERY_RING_CIRC
  return `${filled} ${BATTERY_RING_CIRC}`
})
const batteryColor = computed(() => (stats.value.battery?.charging ? '#fbbf24' : '#4ade80'))
const batteryLabel = computed(() =>
  stats.value.battery?.percent != null ? `${stats.value.battery.percent}%` : '—'
)

const fetchStats = async () => {
  if (isFetching || !isMonitoring || document.hidden) return
  isFetching = true
  try {
    if (window.api?.getSystemStats) {
      const res = await window.api.getSystemStats()
      if (res && res.success) {
        stats.value = {
          deviceType: res.deviceType || stats.value.deviceType || 'pc',
          cpu: { ...stats.value.cpu, ...(res.cpu || {}) },
          gpu: { ...stats.value.gpu, ...(res.gpu || {}) },
          ram: { ...stats.value.ram, ...(res.ram || {}) },
          network: res.network || stats.value.network || { iface: '', rx_sec: 0, tx_sec: 0 },
          disk: res.disk ||
            stats.value.disk || { fs: 'C:', usePercent: 0, size: '0', used: '0', available: '0' },
          system: { ...stats.value.system, ...(res.system || {}) },
          battery: { ...stats.value.battery, ...(res.battery || {}) }
        }
        liveUptime.value = res.system?.uptimeSeconds || 0
      }
    }
  } catch (err) {
    console.error('Failed to get system stats:', err)
  } finally {
    isLoading.value = false
    isFetching = false
  }
}

const handleVisibilityChange = () => {
  if (document.hidden) {
    stopMonitoring()
  } else {
    startMonitoring()
  }
}

const stopMonitoring = () => {
  isMonitoring = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (liveTimer) {
    clearInterval(liveTimer)
    liveTimer = null
  }
}

const startMonitoring = () => {
  if (isMonitoring || document.hidden) return
  isMonitoring = true
  fetchStats()
  timer = setInterval(fetchStats, 15000)
  liveTimer = setInterval(() => {
    liveUptime.value++
  }, 1000)
}

const gaugeStyle = (pct, color) => {
  const clamped = Math.min(Math.max(Number(pct) || 0, 0), 100)
  return {
    background: `conic-gradient(${color} ${clamped * 3.6}deg, rgba(100,116,139,0.18) 0deg)`
  }
}

const cpuFullName = computed(() => {
  const { brand, manufacturer } = stats.value.cpu
  if (brand && manufacturer) return `${manufacturer} ${brand}`.trim()
  return brand || manufacturer || 'Intel / AMD Processor'
})

const emit = defineEmits(['go-tab'])

const quickTools = computed(() => [
  { key: 'dawa', label: 'Tối ưu', icon: Sparkles, accent: '#1677ff', hint: 'Optimize' },
  { key: 'bios', label: 'BIOS Tune', icon: Power, accent: '#f59e0b', hint: 'Cấu hình' },
  { key: 'network', label: 'Network', icon: Network, accent: '#22c55e', hint: 'Ping & Packet' }
])

const presetTools = computed(() => [
  { key: 'mouse', label: 'Input Lag', icon: MousePointer2 },
  { key: 'rapid', label: 'Rapid Trigger', icon: KeyboardIcon },
  { key: 'tools', label: 'Clean Cache', icon: HardDrive },
  { key: 'restore', label: 'Restore', icon: RotateCcw }
])

const handleTileHover = (e, tileEl) => {
  if (!tileEl) return
  const rect = tileEl.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  tileEl.style.setProperty('--spot-x', x + '%')
  tileEl.style.setProperty('--spot-y', y + '%')
  const rx = ((e.clientY - rect.top) / rect.height - 0.5) * -5
  const ry = ((e.clientX - rect.left) / rect.width - 0.5) * 5
  tileEl.style.setProperty('--tilt-x', rx + 'deg')
  tileEl.style.setProperty('--tilt-y', ry + 'deg')
}

const handleTileLeave = (tileEl) => {
  if (!tileEl) return
  tileEl.style.setProperty('--tilt-x', '0deg')
  tileEl.style.setProperty('--tilt-y', '0deg')
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  startMonitoring()
  revealTimer = setTimeout(() => {
    isRevealed.value = true
  }, 60)
})
onActivated(startMonitoring)
onDeactivated(stopMonitoring)
onUnmounted(() => {
  stopMonitoring()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (revealTimer) clearTimeout(revealTimer)
})
</script>

<template>
  <div class="dash-premium" :class="{ 'is-revealed': isRevealed }">
    <!-- ============ GLOBAL BG DEPTH ============ -->
    <div class="dp-bg">
      <div class="dp-bg-aurora dp-bg-aurora--1"></div>
      <div class="dp-bg-aurora dp-bg-aurora--2"></div>
      <div class="dp-bg-grid"></div>
      <div class="dp-bg-noise"></div>
    </div>

    <!-- ============ BANNER CAROUSEL ============ -->
    <section class="dp-section dp-banner">
      <BannerCarousel :banners="landscapeBanners" variant="landscape" />
    </section>

    <!-- ============ MY GEAR SECTION ============ -->
    <section class="dp-section dp-gear">
      <header class="dp-section-head">
        <div class="dp-section-meta">
          <Activity :size="14" :stroke-width="2" />
          <span>MY GEAR</span>
        </div>
        <h2 class="dp-section-title">Thiết bị của bạn<span class="dp-count">· 1</span></h2>
      </header>

      <div class="dp-gear-grid">
        <!-- ============== HERO DEVICE CARD ============== -->
        <div
          class="dp-hero-card dp-tile"
          @mousemove="handleTileHover($event, $event.currentTarget)"
          @mouseleave="handleTileLeave($event.currentTarget)"
        >
          <div class="dp-tile-spotlight"></div>
          <div class="dp-tile-inner">
            <!-- LEFT: HERO DEVICE VISUAL (SVG, no 3D) -->
            <div class="dp-device-stage">
              <div class="dp-device-shine"></div>
              <div class="dp-machine-identity">
                <span>{{ stats.deviceType === 'laptop' ? 'LAPTOP STATION' : 'PC DESKTOP' }}</span>
                <strong>{{ stats.system.hostname }}</strong>
              </div>
              <div
                class="dp-device-wrapper"
                :class="{ 'is-laptop': stats.deviceType === 'laptop' }"
              >
                <svg
                  v-if="stats.deviceType === 'laptop'"
                  class="dp-device-svg"
                  viewBox="0 0 420 260"
                  fill="none"
                >
                  <defs>
                    <linearGradient id="laptopBody" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#0b1220" />
                      <stop offset="100%" stop-color="#111827" />
                    </linearGradient>
                    <linearGradient id="laptopScreen" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#050812" />
                      <stop offset="45%" stop-color="#0a1020" />
                      <stop offset="100%" stop-color="#0f1a36" />
                    </linearGradient>
                    <linearGradient id="laptopGlow" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#1677ff" stop-opacity="0.9" />
                      <stop offset="100%" stop-color="#a855f7" stop-opacity="0.9" />
                    </linearGradient>
                  </defs>
                  <rect x="56" y="8" width="308" height="180" rx="14" fill="url(#laptopBody)" />
                  <rect x="64" y="16" width="292" height="160" rx="8" fill="url(#laptopScreen)" />

                  <!-- Màn hình mini: header + gauge pin + biểu đồ -->
                  <rect x="104" y="44" width="212" height="104" rx="8" fill="#0c1226" />
                  <rect
                    x="104"
                    y="44"
                    width="212"
                    height="104"
                    rx="8"
                    fill="url(#laptopGlow)"
                    opacity="0.14"
                  />
                  <text
                    x="114"
                    y="60"
                    font-family="Archivo, sans-serif"
                    font-size="13"
                    font-weight="800"
                    fill="#ffffff"
                    opacity="0.95"
                    letter-spacing="1"
                  >
                    DAWA
                  </text>
                  <circle cx="298" cy="56" r="3" fill="#4ade80" />
                  <rect x="112" y="67" width="196" height="1" fill="rgba(255,255,255,0.08)" />

                  <!-- Gauge pin động, thay cho số tĩnh 64% -->
                  <circle
                    cx="140"
                    cy="105"
                    r="19"
                    fill="none"
                    stroke="rgba(255,255,255,0.14)"
                    stroke-width="5"
                  />
                  <circle
                    cx="140"
                    cy="105"
                    r="19"
                    fill="none"
                    :stroke="batteryColor"
                    stroke-width="5"
                    stroke-linecap="round"
                    :stroke-dasharray="batteryDasharray"
                    transform="rotate(-90 140 105)"
                  />
                  <text
                    x="140"
                    y="106"
                    font-family="JetBrains Mono, monospace"
                    font-size="10"
                    font-weight="700"
                    text-anchor="middle"
                    fill="#fff"
                  >
                    {{ batteryLabel }}
                  </text>
                  <text
                    x="140"
                    y="118"
                    font-family="JetBrains Mono, monospace"
                    font-size="6"
                    font-weight="600"
                    text-anchor="middle"
                    fill="#94a3b8"
                  >
                    {{ stats.battery?.charging ? 'CHG' : 'BAT' }}
                  </text>

                  <rect x="176" y="80" width="118" height="5" rx="2.5" fill="rgba(255,255,255,0.2)" />
                  <rect x="176" y="90" width="78" height="5" rx="2.5" fill="rgba(255,255,255,0.12)" />
                  <rect x="176" y="120" width="8" height="18" rx="2" fill="#60a5fa" />
                  <rect x="188" y="110" width="8" height="28" rx="2" fill="#4ade80" />
                  <rect x="200" y="124" width="8" height="14" rx="2" fill="#c084fc" />
                  <rect x="212" y="102" width="8" height="36" rx="2" fill="#fbbf24" />
                  <rect x="224" y="116" width="8" height="22" rx="2" fill="#f87171" />

                  <circle cx="80" cy="30" r="2.6" fill="#ef4444" />
                  <circle cx="92" cy="30" r="2.6" fill="#f59e0b" />
                  <circle cx="104" cy="30" r="2.6" fill="#22c55e" />
                  <rect x="14" y="182" width="392" height="56" rx="18" fill="url(#laptopBody)" />
                  <rect
                    x="70"
                    y="194"
                    width="280"
                    height="34"
                    rx="8"
                    fill="#050912"
                    opacity="0.7"
                  />
                  <rect
                    x="282"
                    y="200"
                    width="60"
                    height="22"
                    rx="4"
                    fill="#1677ff"
                    opacity="0.3"
                  />
                </svg>

                <svg v-else class="dp-device-svg" viewBox="0 0 380 280" fill="none">
                  <defs>
                    <linearGradient id="pcCase" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#0a1021" />
                      <stop offset="100%" stop-color="#111827" />
                    </linearGradient>
                    <linearGradient id="pcGlass" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#0c1528" stop-opacity="0.9" />
                      <stop offset="100%" stop-color="#0a0f1f" stop-opacity="0.95" />
                    </linearGradient>
                    <radialGradient id="pcFan" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color="#1677ff" stop-opacity="0.55" />
                      <stop offset="100%" stop-color="#1677ff" stop-opacity="0" />
                    </radialGradient>
                    <linearGradient id="pcStrip" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stop-color="#1677ff" />
                      <stop offset="50%" stop-color="#a855f7" />
                      <stop offset="100%" stop-color="#22c55e" />
                    </linearGradient>
                  </defs>
                  <rect
                    x="20"
                    y="14"
                    width="210"
                    height="252"
                    rx="16"
                    fill="url(#pcCase)"
                    stroke="rgba(148,163,184,0.12)"
                  />
                  <rect x="30" y="26" width="142" height="228" rx="8" fill="url(#pcGlass)" />
                  <circle cx="101" cy="86" r="34" fill="url(#pcFan)" />
                  <circle
                    cx="101"
                    cy="86"
                    r="22"
                    fill="none"
                    stroke="rgba(22,119,255,0.6)"
                    stroke-width="2"
                    stroke-dasharray="4 3"
                  />
                  <circle cx="101" cy="86" r="6" fill="#1677ff" opacity="0.85" />
                  <circle cx="101" cy="170" r="30" fill="url(#pcFan)" />
                  <circle
                    cx="101"
                    cy="170"
                    r="18"
                    fill="none"
                    stroke="rgba(168,85,247,0.55)"
                    stroke-width="2"
                    stroke-dasharray="4 3"
                  />
                  <circle cx="101" cy="170" r="5" fill="#a855f7" opacity="0.85" />
                  <rect
                    x="30"
                    y="216"
                    width="142"
                    height="32"
                    rx="5"
                    fill="#050912"
                    opacity="0.85"
                  />
                  <rect x="40" y="226" width="110" height="4" rx="2" fill="url(#pcStrip)" />
                  <rect x="182" y="36" width="36" height="6" rx="3" fill="#22c55e" opacity="0.85" />
                  <rect x="182" y="48" width="24" height="6" rx="3" fill="#ef4444" opacity="0.75" />
                  <circle cx="192" cy="80" r="3" fill="#22c55e" class="dp-blink" />
                  <rect
                    x="250"
                    y="60"
                    width="110"
                    height="68"
                    rx="10"
                    fill="url(#pcCase)"
                    opacity="0.85"
                    stroke="rgba(148,163,184,0.12)"
                  />
                  <rect x="260" y="70" width="90" height="48" rx="5" fill="#050912" />
                  <rect x="266" y="78" width="60" height="6" rx="3" fill="#1677ff" opacity="0.6" />
                  <rect x="266" y="90" width="78" height="4" rx="2" fill="#22c55e" opacity="0.5" />
                </svg>

                <!-- Flowing RGB strip overlay -->
                <div class="dp-rgb-strip"></div>
              </div>

              <div class="dp-device-callouts" aria-label="Thông tin thiết bị">
                <div class="dp-callout dp-callout--cpu">
                  <span>CPU</span>
                  <div class="dp-callout-detail">
                    <strong>{{ cpuFullName }}</strong
                    ><em>{{ stats.cpu.usagePercent }}%</em>
                  </div>
                </div>
                <div class="dp-callout dp-callout--gpu">
                  <span>GPU</span>
                  <div class="dp-callout-detail">
                    <strong>{{ stats.gpu.model }}</strong
                    ><em>{{ stats.gpu.usagePercent ?? 0 }}%</em>
                  </div>
                </div>
                <div class="dp-callout dp-callout--ram">
                  <span>RAM</span>
                  <div class="dp-callout-detail">
                    <strong>{{ stats.ram.totalGB }}GB installed</strong
                    ><em>{{ stats.ram.usedGB }}GB used</em>
                  </div>
                </div>
                <div class="dp-callout dp-callout--os">
                  <span>HỆ ĐIỀU HÀNH</span>
                  <div class="dp-callout-detail">
                    <strong>Windows {{ stats.system.arch }}</strong
                    ><em>{{ uptimeParts.hh }}:{{ uptimeParts.mm }}</em>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT: SPEC LIST (ẩn theo layout hiện tại, giữ lại cho tương lai) -->
            <div class="dp-spec-panel">
              <div class="dp-spec-header">
                <span class="dp-spec-kicker">
                  <Laptop v-if="stats.deviceType === 'laptop'" :size="13" :stroke-width="2" />
                  <Monitor v-else :size="13" :stroke-width="2" />
                  {{ stats.deviceType === 'laptop' ? 'LAPTOP STATION' : 'PC DESKTOP' }}
                </span>
                <h3 class="dp-spec-title">{{ stats.system.hostname }}</h3>
                <span class="dp-spec-sub">Optimizer Engine · Ready</span>
              </div>

              <div class="dp-spec-list">
                <div class="dp-spec-row">
                  <div class="dp-spec-row-icon dp-ic-cpu">
                    <Cpu :size="14" :stroke-width="2" />
                  </div>
                  <div class="dp-spec-row-body">
                    <span class="dp-spec-row-label">CPU</span>
                    <strong class="dp-spec-row-value">{{ cpuFullName }}</strong>
                  </div>
                  <div class="dp-spec-row-mini">
                    <span v-if="stats.cpu.temp">{{ stats.cpu.temp }}°C</span>
                    <span v-else class="dp-dash">—</span>
                  </div>
                </div>

                <div class="dp-spec-row">
                  <div class="dp-spec-row-icon dp-ic-gpu">
                    <CircuitBoard :size="14" :stroke-width="2" />
                  </div>
                  <div class="dp-spec-row-body">
                    <span class="dp-spec-row-label">GPU</span>
                    <strong class="dp-spec-row-value">{{ stats.gpu.model }}</strong>
                  </div>
                  <div class="dp-spec-row-mini">
                    <span v-if="stats.gpu.temp">{{ stats.gpu.temp }}°C</span>
                    <span v-else class="dp-dash">—</span>
                  </div>
                </div>

                <div class="dp-spec-row">
                  <div class="dp-spec-row-icon dp-ic-ram">
                    <MemoryStick :size="14" :stroke-width="2" />
                  </div>
                  <div class="dp-spec-row-body">
                    <span class="dp-spec-row-label">RAM</span>
                    <strong class="dp-spec-row-value"
                      >{{ stats.ram.usedGB }}GB / {{ stats.ram.totalGB }}GB</strong
                    >
                  </div>
                  <div class="dp-spec-row-mini">{{ stats.ram.usagePercent }}%</div>
                </div>

                <div class="dp-spec-row">
                  <div class="dp-spec-row-icon dp-ic-sys">
                    <Monitor :size="14" :stroke-width="2" />
                  </div>
                  <div class="dp-spec-row-body">
                    <span class="dp-spec-row-label">HĐH</span>
                    <strong class="dp-spec-row-value"
                      >Windows {{ stats.system.arch }} {{ stats.system.release || '' }}</strong
                    >
                  </div>
                  <div class="dp-spec-row-mini">
                    <Timer :size="11" />
                    {{ uptimeParts.hh }}:{{ uptimeParts.mm }}
                  </div>
                </div>
              </div>

              <button class="dp-launch-btn" type="button" @click="emit('go-tab', 'dawa')">
                <Rocket :size="14" :stroke-width="2" />
                Khởi chạy tối ưu
                <span class="dp-launch-arrow">→</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ============== INSIGHT / TIP CARD (ẩn theo layout hiện tại) ============== -->
        <div
          class="dp-insight-card dp-tile"
          @mousemove="handleTileHover($event, $event.currentTarget)"
          @mouseleave="handleTileLeave($event.currentTarget)"
        >
          <div class="dp-tile-spotlight"></div>
          <div class="dp-insight-inner">
            <div class="dp-insight-corner">
              <Sparkles :size="14" :stroke-width="2" />
              INSIGHT
            </div>
            <h3 class="dp-insight-title">
              <span>Hiệu năng đang ở</span>
              <strong class="dp-insight-grade" data-grade="good">Trạng thái tốt</strong>
            </h3>
            <p class="dp-insight-desc">
              Mở tab Tối ưu để kích hoạt gói cài đặt chuyên sâu cho <b>Game</b>,
              <b>Văn phòng</b> hoặc <b>Đồ họa</b>.
            </p>

            <div class="dp-insight-bars">
              <div class="dp-bar">
                <div class="dp-bar-head">
                  <span>CPU Headroom</span><em>{{ 100 - (stats.cpu.usagePercent || 0) }}%</em>
                </div>
                <div class="dp-bar-track">
                  <div
                    class="dp-bar-fill dp-fill-cpu"
                    :style="{ width: 100 - stats.cpu.usagePercent + '%' }"
                  ></div>
                </div>
              </div>
              <div class="dp-bar">
                <div class="dp-bar-head">
                  <span>GPU Free</span><em>{{ 100 - (stats.gpu.usagePercent ?? 0) }}%</em>
                </div>
                <div class="dp-bar-track">
                  <div
                    class="dp-bar-fill dp-fill-gpu"
                    :style="{ width: 100 - (stats.gpu.usagePercent ?? 0) + '%' }"
                  ></div>
                </div>
              </div>
              <div class="dp-bar">
                <div class="dp-bar-head">
                  <span>RAM Available</span><em>{{ stats.ram.freeGB || 0 }}GB</em>
                </div>
                <div class="dp-bar-track">
                  <div
                    class="dp-bar-fill dp-fill-ram"
                    :style="{
                      width:
                        Math.max(
                          5,
                          (Number(stats.ram.freeGB || 0) /
                            Math.max(1, Number(stats.ram.totalGB || 1))) *
                            100
                        ) + '%'
                    }"
                  ></div>
                </div>
              </div>
            </div>

            <div class="dp-insight-tags">
              <span class="dp-tag"><ThermometerSun :size="11" /> Cool: Yes</span>
              <span class="dp-tag"><TrendingUp :size="11" /> FPS boost ready</span>
              <span class="dp-tag"><Zap :size="11" /> Low latency</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ WIDGETS BENTO GRID ============ -->
    <section class="dp-section dp-widgets">
      <header class="dp-section-head dp-section-head--plain">
        <h2 class="dp-section-title">Công cụ của bạn<span class="dp-count">· 6</span></h2>
      </header>

      <div class="dp-bento">
        <!-- =============== WIDGET 1 — MY PC GAUGES =============== -->
        <article
          class="dp-wg dp-wg--pc dp-tile"
          @mousemove="handleTileHover($event, $event.currentTarget)"
          @mouseleave="handleTileLeave($event.currentTarget)"
        >
          <div class="dp-tile-spotlight"></div>
          <header class="dp-wg-head">
            <span class="dp-wg-tag dp-wg-tag--blue">MY PC</span>
            <span class="dp-wg-sub">Live metrics</span>
          </header>

          <div class="dp-gauge-row">
            <div class="dp-gauge">
              <div class="dp-gauge-ring" :style="gaugeStyle(stats.cpu.usagePercent, '#1677ff')">
                <div class="dp-gauge-core">
                  <Cpu :size="14" />
                  <strong>{{ stats.cpu.usagePercent }}%</strong>
                </div>
              </div>
              <span class="dp-gauge-label">CPU</span>
              <span class="dp-gauge-meta">
                <ThermometerSun :size="11" />
                {{ stats.cpu.temp ? stats.cpu.temp + '°C' : '—' }}
              </span>
            </div>

            <div class="dp-gauge">
              <div
                class="dp-gauge-ring"
                :style="gaugeStyle(stats.gpu.usagePercent ?? 0, '#22c55e')"
              >
                <div class="dp-gauge-core">
                  <CircuitBoard :size="14" />
                  <strong>{{ stats.gpu.usagePercent ?? 0 }}%</strong>
                </div>
              </div>
              <span class="dp-gauge-label">GPU</span>
              <span class="dp-gauge-meta">
                <ThermometerSun :size="11" />
                {{ stats.gpu.temp != null ? stats.gpu.temp + '°C' : '—' }}
              </span>
            </div>

            <div class="dp-gauge">
              <div class="dp-gauge-ring" :style="gaugeStyle(stats.ram.usagePercent, '#a855f7')">
                <div class="dp-gauge-core">
                  <MemoryStick :size="14" />
                  <strong>{{ stats.ram.usagePercent }}%</strong>
                </div>
              </div>
              <span class="dp-gauge-label">RAM</span>
              <span class="dp-gauge-meta"> {{ stats.ram.usedGB }}/{{ stats.ram.totalGB }}GB </span>
            </div>
          </div>

          <div class="dp-wg-foot">
            <div class="dp-foot-pill">
              <Network :size="11" />
              Net ↓
              <b>
                {{
                  (stats.network?.rx_sec ?? 0) > 1024
                    ? `${(stats.network.rx_sec / 1024).toFixed(1)}MB/s`
                    : `${Math.round(stats.network?.rx_sec ?? 0)}KB/s`
                }}
              </b>
            </div>
            <div class="dp-foot-pill">
              <HardDrive :size="11" />
              Disk <b>{{ stats.disk.usePercent || 0 }}%</b>
            </div>
          </div>
        </article>

        <!-- =============== WIDGET 2 — BOOSTER MAIN CTA =============== -->
        <article
          class="dp-wg dp-wg--booster dp-tile"
          @mousemove="handleTileHover($event, $event.currentTarget)"
          @mouseleave="handleTileLeave($event.currentTarget)"
        >
          <div class="dp-tile-spotlight"></div>
          <div class="dp-wg-booster-glow"></div>
          <header class="dp-wg-head">
            <span class="dp-wg-tag dp-wg-tag--amber">
              <Zap :size="11" />
              BOOSTER <span class="dp-tag-beta">ENGINE</span>
            </span>
          </header>
          <div class="dp-wg-booster-copy">
            <h3>
              <span>Tối đa hóa hiệu năng với</span>
              <strong>DAWA BOOSTER</strong>
            </h3>
          </div>
          <div class="dp-wg-booster-mascot">
            <div class="dp-booster-icon">
              <Rocket :size="40" :stroke-width="1.8" />
              <span class="dp-booster-check">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path
                    d="M5 12.5L10 17.5L19 7.5"
                    stroke="#0b1220"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
          <div class="dp-wg-booster-actions">
            <button class="dp-cta dp-cta--primary" type="button" @click="emit('go-tab', 'dawa')">
              Configure
            </button>
            <button class="dp-cta dp-cta--ghost" type="button" @click="emit('go-tab', 'dawa')">
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          </div>
        </article>

        <!-- =============== WIDGET 3 — RECENT TOOLS =============== -->
        <article
          class="dp-wg dp-wg--recent dp-tile"
          @mousemove="handleTileHover($event, $event.currentTarget)"
          @mouseleave="handleTileLeave($event.currentTarget)"
        >
          <div class="dp-tile-spotlight"></div>
          <header class="dp-wg-head">
            <span class="dp-wg-tag">RECENT TOOLS</span>
            <span class="dp-wg-sub">Quick access</span>
          </header>
          <div class="dp-recent-stack">
            <button
              v-for="(tool, idx) in quickTools"
              :key="tool.key"
              class="dp-recent-row"
              type="button"
              :style="{ '--t-accent': tool.accent, '--t-index': idx }"
              @click="emit('go-tab', tool.key)"
            >
              <div class="dp-recent-thumb">
                <div class="dp-recent-thumb-bg"></div>
                <component :is="tool.icon" :size="18" :stroke-width="2" />
              </div>
              <div class="dp-recent-body">
                <div class="dp-recent-title">{{ tool.label }}</div>
                <div class="dp-recent-hint">{{ tool.hint }}</div>
              </div>
              <span class="dp-recent-arrow">→</span>
            </button>
          </div>
        </article>

        <!-- =============== WIDGET 5 — SYSTEM INFO =============== -->
        <article
          class="dp-wg dp-wg--sys dp-tile"
          @mousemove="handleTileHover($event, $event.currentTarget)"
          @mouseleave="handleTileLeave($event.currentTarget)"
        >
          <div class="dp-tile-spotlight"></div>
          <header class="dp-wg-head">
            <span class="dp-wg-tag dp-wg-tag--violet">SYSTEM INFO</span>
          </header>
          <div class="dp-sys-list">
            <div class="dp-sys-row">
              <div class="dp-sys-cell dp-sys-cell--icon dp-sys-cell--cpu">
                <Cpu :size="15" :stroke-width="2" />
              </div>
              <div class="dp-sys-cell dp-sys-cell--body">
                <span>CPU</span>
                <strong>{{ cpuFullName }}</strong>
              </div>
              <div class="dp-sys-cell dp-sys-cell--pill">{{ stats.cpu.cores || 0 }}C</div>
            </div>
            <div class="dp-sys-row">
              <div class="dp-sys-cell dp-sys-cell--icon dp-sys-cell--gpu">
                <CircuitBoard :size="15" :stroke-width="2" />
              </div>
              <div class="dp-sys-cell dp-sys-cell--body">
                <span>GPU</span>
                <strong>{{ stats.gpu.model }}</strong>
              </div>
              <div class="dp-sys-cell dp-sys-cell--pill">{{ stats.gpu.vram }}</div>
            </div>
            <div class="dp-sys-row">
              <div class="dp-sys-cell dp-sys-cell--icon dp-sys-cell--os">
                <Monitor :size="15" :stroke-width="2" />
              </div>
              <div class="dp-sys-cell dp-sys-cell--body">
                <span>OS</span>
                <strong>Win {{ stats.system.arch }} · {{ stats.system.release || '10/11' }}</strong>
              </div>
              <div class="dp-sys-cell dp-sys-cell--pill"><Zap :size="10" /> DAWA</div>
            </div>
          </div>
        </article>

        <!-- =============== WIDGET 6 — BOOSTER TOGGLE =============== -->
        <article
          class="dp-wg dp-wg--toggle dp-tile"
          @mousemove="handleTileHover($event, $event.currentTarget)"
          @mouseleave="handleTileLeave($event.currentTarget)"
        >
          <div class="dp-tile-spotlight"></div>
          <header class="dp-wg-head">
            <span class="dp-wg-tag dp-wg-tag--green">BOOSTER</span>
          </header>
          <div class="dp-wg-toggle-top">
            <strong class="dp-wg-toggle-num">Ready</strong>
            <span>Sẵn sàng tối ưu</span>
          </div>
          <div class="dp-wg-toggle-mid">
            <div class="dp-wg-toggle-icon-row">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path
                  d="M5 12.5L10 17.5L19 7.5"
                  stroke="#22c55e"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Boost all my tools</span>
            </div>
          </div>
          <button
            class="dp-cta dp-cta--outline dp-cta--block"
            type="button"
            @click="emit('go-tab', 'dawa')"
          >
            Configure
          </button>
        </article>

        <!-- =============== WIDGET 7 — FAVORITE TOOLS =============== -->
        <article
          class="dp-wg dp-wg--fav dp-tile"
          @mousemove="handleTileHover($event, $event.currentTarget)"
          @mouseleave="handleTileLeave($event.currentTarget)"
        >
          <div class="dp-tile-spotlight"></div>
          <header class="dp-wg-head">
            <span class="dp-wg-tag">FAVORITE TOOLS</span>
          </header>
          <div class="dp-fav-top">
            <div class="dp-fav-mascot">
              <Gamepad2 :size="44" :stroke-width="1.5" />
            </div>
            <div class="dp-fav-copy">
              <h4>Công cụ yêu thích</h4>
              <p>Nhấn để truy cập nhanh</p>
            </div>
          </div>
          <div class="dp-fav-chips">
            <button
              v-for="(tool, i) in presetTools"
              :key="tool.key"
              class="dp-fav-chip"
              type="button"
              :style="{ '--chip-i': i }"
              @click="emit('go-tab', tool.key)"
            >
              <component :is="tool.icon" :size="13" />
              <span>{{ tool.label }}</span>
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- ============ LIVE STATUS BAR ============ -->
    <section class="dp-section dp-livebar">
      <div class="dp-live-inner">
        <div class="dp-live-left">
          <span class="dp-live-dot" :class="{ 'is-loading': isLoading }"></span>
          <span class="dp-live-label">LIVE TELEMETRY</span>
          <span class="dp-live-sep"></span>
          <span class="dp-live-item"
            ><Cpu :size="11" :stroke-width="2" /> {{ stats.cpu.usagePercent }}%</span
          >
          <span class="dp-live-item"
            ><MemoryStick :size="11" :stroke-width="2" /> {{ stats.ram.usedGB }}/{{
              stats.ram.totalGB
            }}GB</span
          >
          <span class="dp-live-item"
            ><Network :size="11" :stroke-width="2" /> ↓
            {{
              (stats.network?.rx_sec ?? 0) > 1024
                ? `${(stats.network.rx_sec / 1024).toFixed(1)}MB/s`
                : `${Math.round(stats.network?.rx_sec ?? 0)}KB/s`
            }}</span
          >
          <span class="dp-live-item"
            ><HardDrive :size="11" :stroke-width="2" /> {{ stats.disk.usePercent || 0 }}%</span
          >
        </div>
        <div class="dp-live-right">
          <Gauge :size="12" :stroke-width="2" />
          UPTIME {{ uptimeParts.hh }}:{{ uptimeParts.mm }}:{{ uptimeParts.ss }}
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ============================================================
   PREMIUM DASHBOARD — anti-slop gaming-hub aesthetic
   Dial read: VARIANCE 9 · MOTION 7 · DENSITY 5
   ============================================================ */

.dash-premium {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 22px 28px 34px;
  max-width: 1680px;
  margin: 0 auto;
  color: #fff;
  overflow-x: hidden;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 600ms var(--ease-premium, cubic-bezier(0.16, 1, 0.3, 1)),
    transform 600ms var(--ease-premium, cubic-bezier(0.16, 1, 0.3, 1));
}
.dash-premium.is-revealed {
  opacity: 1;
  transform: translateY(0);
}

/* =========== BANNER CAROUSEL =========== */
.dp-banner {
  position: relative;
  padding: 0;
  width: 100%;
}
.dp-banner > :deep(.hero-banner) {
  aspect-ratio: 21 / 9;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.12);
  box-shadow:
    0 18px 50px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

/* =========== GLOBAL BACKGROUND DEPTH =========== */
.dp-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.dp-bg-aurora {
  position: absolute;
  width: 55vw;
  height: 55vw;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.16;
  animation: dpFloat 22s ease-in-out infinite;
}
.dp-bg-aurora--1 {
  top: -24vw;
  left: -14vw;
  background: radial-gradient(circle, #1677ff, transparent 60%);
}
.dp-bg-aurora--2 {
  bottom: -22vw;
  right: -12vw;
  background: radial-gradient(circle, #a855f7, transparent 62%);
  animation-delay: -10s;
}
.dp-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(ellipse at 50% 0%, rgba(0, 0, 0, 0.75), transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 0%, rgba(0, 0, 0, 0.75), transparent 70%);
}
.dp-bg-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity: 0.4;
  mix-blend-mode: overlay;
}

@keyframes dpFloat {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(3vw, 2vw, 0) scale(1.08);
  }
}

/* =========== SECTIONS =========== */
.dp-section {
  position: relative;
  z-index: 2;
}

.dp-section-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.dp-section-meta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px;
  width: fit-content;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #94a3b8;
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 999px;
}
.dp-section-title {
  margin: 0;
  font-family:
    Be Vietnam Pro,
    Archivo,
    system-ui,
    sans-serif;
  font-weight: 700;
  font-size: 22px;
  letter-spacing: -0.01em;
  color: #f1f5f9;
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}
.dp-count {
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  letter-spacing: 0.02em;
}

/* =========== TILE SYSTEM (spotlight + tilt) =========== */
.dp-tile {
  --spot-x: 50%;
  --spot-y: 50%;
  --tilt-x: 0deg;
  --tilt-y: 0deg;
  position: relative;
  background: linear-gradient(165deg, rgba(17, 24, 39, 0.78), rgba(10, 16, 33, 0.68));
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 20px;
  overflow: hidden;
  isolation: isolate;
  transform-style: preserve-3d;
  transform: perspective(900px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
  transition:
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 320ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.dp-tile::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -2;
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.05), transparent 50%),
    radial-gradient(circle at 80% 100%, rgba(255, 255, 255, 0.03), transparent 55%);
  pointer-events: none;
}
.dp-tile-spotlight {
  position: absolute;
  inset: -1px;
  z-index: -1;
  border-radius: inherit;
  background: radial-gradient(
    220px circle at var(--spot-x) var(--spot-y),
    rgba(148, 163, 184, 0.18),
    rgba(148, 163, 184, 0.02) 40%,
    transparent 60%
  );
  opacity: 0;
  transition: opacity 300ms ease;
  pointer-events: none;
}
.dp-tile:hover {
  border-color: rgba(148, 163, 184, 0.22);
  box-shadow:
    0 20px 60px -30px rgba(0, 0, 0, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.dp-tile:hover .dp-tile-spotlight {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .dp-tile {
    transform: none !important;
    transition: none;
  }
  .dp-bg-aurora {
    animation: none;
  }
}

/* =========== MY GEAR GRID =========== */
.dp-gear-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
}

/* The machine is one focused surface: artwork, identity and the primary action. */
.dp-insight-card,
.dp-chip,
.dp-spec-list {
  display: none;
}

/* ---- HERO DEVICE CARD ---- */
.dp-hero-card .dp-tile-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 410px;
}
.dp-device-stage {
  position: relative;
  padding: 64px 150px 48px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(22, 119, 255, 0.22), transparent 60%),
    radial-gradient(ellipse at 80% 80%, rgba(168, 85, 247, 0.18), transparent 62%);
  overflow: hidden;
}
.dp-machine-identity {
  position: absolute;
  top: 24px;
  left: 28px;
  display: grid;
  gap: 4px;
}
.dp-machine-identity span,
.dp-callout span {
  color: #60a5fa;
  font: 700 10px/1.2 var(--font-mono, ui-monospace, monospace);
  letter-spacing: 0.1em;
}
.dp-machine-identity strong {
  max-width: 300px;
  overflow: hidden;
  color: #f8fafc;
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dp-device-callouts {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.dp-callout {
  position: absolute;
  display: grid;
  gap: 4px;
  max-width: min(230px, 22%);
  color: #cbd5e1;
}
.dp-callout strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 1.35;
}
.dp-callout-detail {
  display: block;
}
.dp-callout-detail strong {
  display: inline;
  overflow-wrap: anywhere;
}
.dp-callout em {
  display: inline-flex;
  align-items: center;
  margin-top: 0;
  margin-left: 7px;
  padding: 2px 9px;
  border: 1px solid rgba(96, 165, 250, 0.42);
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.14);
  color: #dbeafe;
  font: 800 13px/1.3 var(--font-mono, ui-monospace, monospace);
  font-style: normal;
  letter-spacing: 0.01em;
  text-shadow: 0 0 10px rgba(96, 165, 250, 0.45);
}
.dp-callout--ram em,
.dp-callout--os em {
  border-color: rgba(168, 85, 247, 0.42);
  background: rgba(168, 85, 247, 0.14);
  color: #ede9fe;
  text-shadow: 0 0 10px rgba(168, 85, 247, 0.45);
}
.dp-callout::after {
  content: '';
  position: absolute;
  height: 1px;
  width: 62px;
  background: linear-gradient(90deg, rgba(96, 165, 250, 0.7), transparent);
}
.dp-callout--cpu {
  top: 31%;
  left: 28px;
  text-align: left;
}
.dp-callout--cpu::after {
  top: 50%;
  left: calc(100% + 10px);
}
.dp-callout--gpu {
  top: 56%;
  left: 28px;
  text-align: left;
}
.dp-callout--gpu::after {
  top: 50%;
  left: calc(100% + 10px);
}
.dp-callout--ram {
  top: 31%;
  right: 28px;
  text-align: right;
}
.dp-callout--ram::after {
  top: 50%;
  right: calc(100% + 10px);
  transform: rotate(180deg);
}
.dp-callout--os {
  top: 56%;
  right: 28px;
  text-align: right;
}
.dp-callout--os::after {
  top: 50%;
  right: calc(100% + 10px);
  transform: rotate(180deg);
}
.dp-device-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    115deg,
    transparent 0%,
    rgba(255, 255, 255, 0.06) 48%,
    transparent 52%
  );
  transform: translateX(-100%);
  animation: dpShine 8s ease-in-out infinite;
  pointer-events: none;
}
@keyframes dpShine {
  0%,
  55% {
    transform: translateX(-100%);
  }
  70% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(100%);
  }
}
.dp-device-wrapper {
  position: relative;
  width: 100%;
  max-width: 380px;
}
.dp-device-svg {
  width: 100%;
  height: auto;
  display: block;
  filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.6));
}
.dp-rgb-strip {
  position: absolute;
  left: 6%;
  right: 6%;
  bottom: -10px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, #1677ff, #22c55e, #a855f7, #ef4444, #1677ff);
  background-size: 300% 100%;
  filter: blur(6px);
  opacity: 0.75;
  animation: dpRgb 8s linear infinite;
}
@keyframes dpRgb {
  0% {
    background-position: 0% 0;
  }
  100% {
    background-position: 300% 0;
  }
}
.dp-blink {
  animation: dpBlink 1.4s ease-in-out infinite;
  transform-origin: center;
}
@keyframes dpBlink {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

/* Floating spec chips */
.dp-chip {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.16);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #cbd5e1;
  box-shadow: 0 8px 24px -12px rgba(0, 0, 0, 0.6);
}
.dp-chip--cpu {
  top: 22px;
  left: 24px;
  color: #60a5fa;
  border-color: rgba(22, 119, 255, 0.3);
}
.dp-chip--gpu {
  top: 60px;
  right: 20px;
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.3);
  animation-delay: 0.3s;
}
.dp-chip--ram {
  bottom: 20px;
  left: 30%;
  color: #c084fc;
  border-color: rgba(168, 85, 247, 0.3);
  animation-delay: 0.6s;
}
.dp-chip[data-pulse] {
  animation: dpChipFloat 4s ease-in-out infinite;
}
.dp-chip:not([data-pulse]) {
  animation: dpChipFloat 4s ease-in-out infinite;
}
@keyframes dpChipFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

/* ---- SPEC PANEL ---- */
.dp-spec-panel {
  display: none !important;
  padding: 26px 24px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.dp-spec-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dp-spec-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  padding: 4px 9px;
  border-radius: 999px;
  width: fit-content;
}
.dp-spec-title {
  margin: 6px 0 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: #f8fafc;
}
.dp-spec-sub {
  font-size: 12.5px;
  color: #64748b;
  font-family:
    Be Vietnam Pro,
    sans-serif;
}

.dp-spec-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.dp-spec-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 12px;
  transition: background 200ms ease;
}
.dp-spec-row:hover {
  background: rgba(30, 41, 59, 0.4);
}
.dp-spec-row-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #cbd5e1;
  position: relative;
}
.dp-spec-row-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0.9;
}
.dp-spec-row-icon > * {
  position: relative;
  z-index: 1;
}
.dp-ic-cpu::before {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.22), rgba(22, 119, 255, 0.05));
}
.dp-ic-gpu::before {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.22), rgba(34, 197, 94, 0.05));
}
.dp-ic-ram::before {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.22), rgba(168, 85, 247, 0.05));
}
.dp-ic-sys::before {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(245, 158, 11, 0.05));
}
.dp-spec-row-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dp-spec-row-label {
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}
.dp-spec-row-value {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dp-spec-row-mini {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 11px;
  color: #94a3b8;
  padding: 4px 8px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.1);
}
.dp-dash {
  opacity: 0.5;
}

.dp-launch-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(22, 119, 255, 0.4);
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.25), rgba(168, 85, 247, 0.2));
  color: #fff;
  font-family:
    Be Vietnam Pro,
    sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 260ms ease,
    background 260ms ease;
}
.dp-launch-btn:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.4), rgba(168, 85, 247, 0.32));
  box-shadow: 0 12px 30px -10px rgba(22, 119, 255, 0.55);
}
.dp-launch-btn:active {
  transform: translateY(0) scale(0.99);
}
.dp-launch-arrow {
  display: inline-block;
  transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
}
.dp-launch-btn:hover .dp-launch-arrow {
  transform: translateX(4px);
}

/* ---- INSIGHT CARD ---- */
.dp-insight-card {
  min-height: 320px;
}
.dp-insight-inner {
  padding: 26px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
  position: relative;
  background:
    radial-gradient(circle at 90% 10%, rgba(34, 197, 94, 0.12), transparent 50%),
    radial-gradient(circle at 0% 90%, rgba(22, 119, 255, 0.12), transparent 55%);
}
.dp-insight-corner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #facc15;
  width: fit-content;
}
.dp-insight-title {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family:
    Be Vietnam Pro,
    sans-serif;
  font-weight: 500;
  font-size: 18px;
  color: #cbd5e1;
  letter-spacing: -0.01em;
}
.dp-insight-grade {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #4ade80, #22d3ee);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1.1;
}
.dp-insight-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #94a3b8;
}
.dp-insight-desc b {
  color: #e2e8f0;
  font-weight: 600;
}

.dp-insight-bars {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.dp-bar-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  color: #cbd5e1;
  margin-bottom: 5px;
}
.dp-bar-head em {
  font-style: normal;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-weight: 600;
  color: #e2e8f0;
}
.dp-bar-track {
  height: 7px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.6);
  overflow: hidden;
  position: relative;
}
.dp-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 700ms cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}
.dp-bar-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  animation: dpBarShine 2.8s linear infinite;
}
.dp-fill-cpu {
  background: linear-gradient(90deg, #1677ff, #60a5fa);
}
.dp-fill-gpu {
  background: linear-gradient(90deg, #16a34a, #4ade80);
}
.dp-fill-ram {
  background: linear-gradient(90deg, #7c3aed, #c084fc);
}
@keyframes dpBarShine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.dp-insight-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}
.dp-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 10.5px;
  color: #cbd5e1;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 999px;
}

/* =========== BENTO GRID =========== */
.dp-bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: minmax(160px, auto);
  gap: 18px;
}
.dp-wg {
  padding: 22px 20px 20px;
  display: flex;
  flex-direction: column;
}
.dp-wg-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.dp-wg-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 0 0 12px 0;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.75);
  border-right: 1px solid rgba(148, 163, 184, 0.16);
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  position: absolute;
  top: 0;
  left: 0;
}
.dp-wg-tag--blue {
  color: #60a5fa;
  border-color: rgba(22, 119, 255, 0.3);
}
.dp-wg-tag--pink {
  color: #f472b6;
  border-color: rgba(244, 114, 182, 0.3);
}
.dp-wg-tag--violet {
  color: #c084fc;
  border-color: rgba(168, 85, 247, 0.3);
}
.dp-wg-tag--amber {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.3);
}
.dp-wg-tag--green {
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.3);
}
.dp-tag-beta {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.16);
  color: #fbbf24;
  font-weight: 800;
  margin-left: 2px;
}
.dp-wg-sub {
  margin-left: auto;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 10.5px;
  color: #64748b;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* -------- WG 1 — MY PC GAUGES -------- */
.dp-wg--pc {
  grid-row: span 1;
}
.dp-gauge-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}
.dp-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.dp-gauge-ring {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  position: relative;
  transition: background 520ms cubic-bezier(0.16, 1, 0.3, 1);
}
.dp-gauge-ring::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 25%,
    rgba(255, 255, 255, 0.04),
    rgba(10, 16, 33, 0.96) 60%
  );
  border: 1px solid rgba(148, 163, 184, 0.12);
}
.dp-gauge-core {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #f8fafc;
}
.dp-gauge-core {
  font-size: 10px;
  color: #94a3b8;
}
.dp-gauge-core strong {
  font-family:
    Be Vietnam Pro,
    sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: inherit;
  color: #f8fafc;
  letter-spacing: -0.01em;
}
.dp-gauge-label {
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
}
.dp-gauge-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 10.5px;
  color: #94a3b8;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.dp-wg-foot {
  margin-top: auto;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.dp-foot-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.12);
  font-size: 11px;
  color: #cbd5e1;
}
.dp-foot-pill b {
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-weight: 700;
  color: #f1f5f9;
}

/* -------- WG 2 — BOOSTER CTA -------- */
.dp-wg--booster {
  overflow: hidden;
  color: #fff;
}
.dp-wg-booster-glow {
  position: absolute;
  inset: -30%;
  background:
    radial-gradient(circle at 70% 20%, rgba(251, 191, 36, 0.45), transparent 55%),
    radial-gradient(circle at 10% 90%, rgba(239, 68, 68, 0.35), transparent 50%);
  opacity: 0.95;
  pointer-events: none;
  z-index: -2;
  animation: dpBoostPulse 6s ease-in-out infinite;
}
@keyframes dpBoostPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}
.dp-wg--booster::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    170deg,
    rgba(15, 23, 42, 0.9),
    rgba(15, 23, 42, 0.55) 50%,
    rgba(67, 20, 7, 0.4)
  );
  z-index: -1;
}
.dp-wg-booster-copy {
  margin-top: 10px;
  margin-bottom: 14px;
}
.dp-wg-booster-copy h3 {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family:
    Be Vietnam Pro,
    sans-serif;
  font-weight: 500;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.01em;
}
.dp-wg-booster-copy h3 strong {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff, #fde68a);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1.05;
}

.dp-wg-booster-mascot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 16px;
}
.dp-booster-icon {
  position: relative;
  width: 76px;
  height: 76px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #fbbf24, #f97316);
  color: #0b1220;
  transform: rotate(-8deg);
  box-shadow:
    0 20px 50px -20px rgba(251, 191, 36, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  animation: dpRocker 4s ease-in-out infinite;
}
@keyframes dpRocker {
  0%,
  100% {
    transform: rotate(-8deg) translateY(0);
  }
  50% {
    transform: rotate(-4deg) translateY(-4px);
  }
}
.dp-booster-check {
  position: absolute;
  bottom: -6px;
  right: -6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #4ade80;
  display: grid;
  place-items: center;
  box-shadow: 0 6px 16px -6px rgba(74, 222, 128, 0.7);
}
.dp-wg-booster-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
}

.dp-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 12px;
  font-family:
    Be Vietnam Pro,
    sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 260ms ease,
    background 260ms ease,
    color 260ms ease;
}
.dp-cta--primary {
  background: #fff;
  color: #0b1220;
}
.dp-cta--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -10px rgba(255, 255, 255, 0.4);
}
.dp-cta--primary:active {
  transform: translateY(0) scale(0.99);
}
.dp-cta--ghost {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.18);
  width: 38px;
  padding: 10px 0;
}
.dp-cta--ghost:hover {
  background: rgba(255, 255, 255, 0.16);
}
.dp-cta--outline {
  background: transparent;
  color: #e2e8f0;
  border-color: rgba(148, 163, 184, 0.3);
}
.dp-cta--outline:hover {
  border-color: rgba(148, 163, 184, 0.55);
  background: rgba(148, 163, 184, 0.08);
  transform: translateY(-1px);
}
.dp-cta--block {
  width: 100%;
}

/* -------- WG 3 — RECENT TOOLS (row stack) -------- */
.dp-recent-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
}
.dp-recent-row {
  --t-accent: #1677ff;
  --t-index: 0;
  display: grid;
  grid-template-columns: 46px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 10px;
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid color-mix(in srgb, var(--t-accent) 18%, transparent);
  cursor: pointer;
  color: #e2e8f0;
  transition:
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
    background 240ms ease,
    border-color 240ms ease;
  opacity: 0;
  transform: translateY(6px);
  animation: dpRowIn 420ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(80ms + var(--t-index) * 90ms);
}
@keyframes dpRowIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.dp-recent-row:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--t-accent) 12%, rgba(30, 41, 59, 0.35));
  border-color: color-mix(in srgb, var(--t-accent) 45%, transparent);
}
.dp-recent-thumb {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--t-accent);
  position: relative;
  overflow: hidden;
}
.dp-recent-thumb-bg {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--t-accent) 30%, transparent),
      color-mix(in srgb, var(--t-accent) 10%, transparent)
    ),
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1), transparent 60%);
}
.dp-recent-thumb > svg {
  position: relative;
  z-index: 1;
}
.dp-recent-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  text-align: left;
}
.dp-recent-title {
  font-family:
    Be Vietnam Pro,
    sans-serif;
  font-weight: 700;
  font-size: 13.5px;
  color: #f1f5f9;
}
.dp-recent-hint {
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 10.5px;
  color: #64748b;
  letter-spacing: 0.04em;
}
.dp-recent-arrow {
  color: #64748b;
  transition:
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
    color 200ms ease;
}
.dp-recent-row:hover .dp-recent-arrow {
  transform: translateX(4px);
  color: var(--t-accent);
}

/* -------- WG 5 — SYSTEM INFO -------- */
.dp-sys-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}
.dp-sys-row {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 13px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  transition:
    background 220ms ease,
    border-color 220ms ease,
    transform 220ms ease;
}
.dp-sys-row:hover {
  background: rgba(30, 41, 59, 0.65);
  border-color: rgba(148, 163, 184, 0.2);
  transform: translateY(-1px);
}
.dp-sys-cell--icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #fff;
  position: relative;
  overflow: hidden;
}
.dp-sys-cell--icon::before {
  content: '';
  position: absolute;
  inset: 0;
}
.dp-sys-cell--icon > * {
  position: relative;
  z-index: 1;
}
.dp-sys-cell--cpu::before {
  background: linear-gradient(135deg, #1677ff, #0ea5e9);
}
.dp-sys-cell--gpu::before {
  background: linear-gradient(135deg, #16a34a, #22c55e);
}
.dp-sys-cell--os::before {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
}
.dp-sys-cell--body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.dp-sys-cell--body span {
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}
.dp-sys-cell--body strong {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dp-sys-cell--pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.12);
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 10.5px;
  color: #cbd5e1;
  font-weight: 600;
}

/* -------- WG 6 — BOOSTER TOGGLE -------- */
.dp-wg-toggle-top {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 18px;
  margin-top: 4px;
}
.dp-wg-toggle-num {
  font-family:
    Be Vietnam Pro,
    sans-serif;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #eab308, #22c55e);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1;
}
.dp-wg-toggle-top span {
  font-size: 12.5px;
  color: #94a3b8;
}
.dp-wg-toggle-mid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 13px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.12);
  margin-bottom: 16px;
}
.dp-wg-toggle-icon-row {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
}
.dp-switch-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.dp-switch-row-state {
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 11.5px;
  font-weight: 700;
  color: #64748b;
}
.dp-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.22);
  transition:
    background 260ms ease,
    border-color 260ms ease;
}
.dp-switch.active {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border-color: rgba(34, 197, 94, 0.5);
}
.dp-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.dp-switch-thumb {
  position: absolute;
  top: 50%;
  left: 2px;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
}
.dp-switch.active .dp-switch-thumb {
  transform: translate(20px, -50%);
}

/* -------- WG 7 — FAVORITE TOOLS -------- */
.dp-fav-top {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 14px;
  align-items: center;
  margin: 6px 0 18px;
}
.dp-fav-mascot {
  width: 68px;
  height: 68px;
  border-radius: 18px;
  background:
    repeating-linear-gradient(45deg, rgba(148, 163, 184, 0.12) 0 3px, transparent 3px 8px),
    linear-gradient(135deg, rgba(168, 85, 247, 0.14), rgba(22, 119, 255, 0.12));
  border: 1px dashed rgba(148, 163, 184, 0.28);
  display: grid;
  place-items: center;
  color: #c084fc;
}
.dp-fav-copy h4 {
  margin: 0 0 3px;
  font-family:
    Be Vietnam Pro,
    sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.005em;
}
.dp-fav-copy p {
  margin: 0;
  font-size: 12.5px;
  color: #64748b;
}
.dp-fav-chips {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: auto;
}
.dp-fav-chip {
  --chip-i: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 11px;
  border-radius: 11px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
  font-family:
    Be Vietnam Pro,
    sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 240ms ease,
    background 240ms ease,
    color 240ms ease;
  opacity: 0;
  transform: translateY(6px);
  animation: dpRowIn 420ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(100ms + var(--chip-i) * 80ms);
}
.dp-fav-chip:hover {
  transform: translateY(-2px);
  border-color: rgba(168, 85, 247, 0.38);
  background: rgba(168, 85, 247, 0.12);
  color: #e9d5ff;
}

/* =========== LIVE BAR =========== */
.dp-livebar {
  position: relative;
  z-index: 2;
}
.dp-live-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: linear-gradient(90deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.6));
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  gap: 12px;
  flex-wrap: wrap;
}
.dp-live-left {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.dp-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
  animation: dpLivePulse 1.6s ease-in-out infinite;
}
.dp-live-dot.is-loading {
  background: #f59e0b;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15);
  animation-duration: 0.8s;
}
@keyframes dpLivePulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.28);
  }
}
.dp-live-label {
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #4ade80;
}
.dp-live-sep {
  width: 1px;
  height: 14px;
  background: rgba(148, 163, 184, 0.18);
}
.dp-live-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 11.5px;
  color: #cbd5e1;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
}
.dp-live-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family:
    JetBrains Mono,
    ui-monospace,
    monospace;
  font-size: 11.5px;
  font-weight: 600;
  color: #cbd5e1;
  letter-spacing: 0.04em;
}

/* =========== RESPONSIVE =========== */
@media (max-width: 1380px) {
  .dp-gear-grid {
    grid-template-columns: 1fr;
  }
  .dp-hero-card .dp-tile-inner {
    min-height: 280px;
  }
}
@media (max-width: 1180px) {
  .dp-bento {
    grid-template-columns: repeat(2, 1fr);
  }
  .dp-wg--fav {
    grid-column: span 2;
  }
}
@media (max-width: 920px) {
  .dash-premium {
    padding: 16px 14px 24px;
  }
  .dp-hero-card .dp-tile-inner {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  .dp-device-stage {
    min-height: 390px;
    padding-left: 115px;
    padding-right: 115px;
  }
  .dp-bento {
    grid-template-columns: 1fr;
  }
  .dp-wg--fav {
    grid-column: span 1;
  }
  .dp-gauge-row {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 560px) {
  .dp-device-stage {
    min-height: 460px;
    padding: 88px 24px 88px;
  }
  .dp-machine-identity {
    top: 20px;
    left: 20px;
  }
  .dp-callout {
    max-width: calc(50% - 30px);
  }
  .dp-callout--cpu,
  .dp-callout--gpu {
    left: 18px;
  }
  .dp-callout--ram,
  .dp-callout--os {
    right: 18px;
  }
  .dp-callout::after {
    width: 26px;
  }
  .dp-gauge-row {
    gap: 6px;
  }
  .dp-gauge-ring {
    width: 74px;
    height: 74px;
  }
  .dp-section-title {
    font-size: 18px;
  }
  .dp-spec-title {
    font-size: 20px;
  }
  .dp-wg-booster-copy h3 strong {
    font-size: 24px;
  }
  .dp-wg-toggle-num {
    font-size: 24px;
  }
  .dp-fav-top {
    grid-template-columns: 58px 1fr;
  }
  .dp-fav-mascot {
    width: 54px;
    height: 54px;
  }
}
</style>