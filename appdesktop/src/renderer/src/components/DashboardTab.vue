<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Cpu, MemoryStick, CircuitBoard, Monitor } from 'lucide-vue-next'
import BannerCarousel from './BannerCarousel.vue'
import { landscapeBanners } from '../assets/banners'

const stats = ref({
  cpu: { brand: 'Intel / AMD CPU', usagePercent: 0, speed: 0, cores: 0, temp: null },
  gpu: {
    model: 'NVIDIA / AMD GPU',
    vendor: 'N/A',
    vram: 'N/A',
    usagePercent: null,
    temp: null,
    hasDiscreteGpu: false
  },
  ram: { totalGB: '0', usedGB: '0', freeGB: '0', usagePercent: 0 },
  system: { platform: 'win32', hostname: 'PC-HOST', uptimeSeconds: 0, arch: 'x64' }
})

const isLoading = ref(true)
let timer = null
let isFetching = false

// Đồng hồ uptime chạy thật theo giây, đồng bộ lại mỗi lần fetch thành công
const liveUptime = ref(0)
let liveTimer = null

const pad = (n) => String(n).padStart(2, '0')
const uptimeParts = computed(() => {
  const total = liveUptime.value || 0
  return {
    hh: pad(Math.floor(total / 3600)),
    mm: pad(Math.floor((total % 3600) / 60)),
    ss: pad(total % 60)
  }
})

const fetchStats = async () => {
  if (isFetching || document.hidden) return
  isFetching = true
  try {
    if (window.api?.getSystemStats) {
      const res = await window.api.getSystemStats()
      if (res && res.success) {
        stats.value = res
        liveUptime.value = res.system.uptimeSeconds || 0
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
  if (!document.hidden) fetchStats()
}

const gaugeStyle = (pct, color) => {
  const clamped = Math.min(Math.max(Number(pct) || 0, 0), 100)
  return {
    background: `conic-gradient(${color} ${clamped * 3.6}deg, var(--border-color) 0deg)`
  }
}

onMounted(() => {
  fetchStats()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  timer = setInterval(fetchStats, 5000)
  liveTimer = setInterval(() => { liveUptime.value++ }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (liveTimer) clearInterval(liveTimer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="dash-page">
    <section class="dash-hero">
      <div class="dash-hero-copy">
        <h2>Boost FPS<br />giảm độ trễ khi chơi game</h2>
        <p>Theo dõi CPU, GPU, RAM theo thời gian thực. Chạy tối ưu từ tab DAWA khi sẵn sàng.</p>

        <div class="dash-hero-uptime">
          <span class="dash-hero-uptime-dot"></span>
          <div class="dash-hero-uptime-clock">
            <span>{{ uptimeParts.hh }}</span><b>:</b><span>{{ uptimeParts.mm }}</span><b>:</b><span>{{ uptimeParts.ss }}</span>
          </div>
          <span class="dash-hero-uptime-sep"></span>
          <span class="dash-hero-uptime-host">{{ stats.system.hostname }}</span>
        </div>
      </div>
      <BannerCarousel :banners="landscapeBanners" variant="landscape" />
    </section>

    <section class="telemetry-panel">
      <div class="telemetry-panel-head">
        <h3>Thông số hệ thống</h3>
        <span class="telemetry-live" :class="{ 'is-loading': isLoading }">
          <span class="telemetry-live-dot"></span>
          Cập nhật mỗi 5 giây
        </span>
      </div>

      <div class="telemetry-grid" :class="{ 'has-gpu': stats.gpu.hasDiscreteGpu }">
        <div class="telemetry-col">
          <div class="telemetry-col-head">
            <Cpu :size="15" :stroke-width="1.8" />
            <span>Bộ xử lý</span>
          </div>
          <div class="telemetry-gauge">
            <div class="gauge-ring" :style="gaugeStyle(stats.cpu.usagePercent, 'var(--accent-primary)')">
              <div class="gauge-ring-inner">
                <strong>{{ stats.cpu.usagePercent }}<span>%</span></strong>
              </div>
            </div>
            <div class="telemetry-col-name">{{ stats.cpu.brand || 'Processor' }}</div>
          </div>
          <dl class="telemetry-specs">
            <div><dt>Xung nhịp</dt><dd>{{ stats.cpu.speed ? stats.cpu.speed + ' GHz' : 'N/A' }}</dd></div>
            <div><dt>Số nhân</dt><dd>{{ stats.cpu.cores || 'N/A' }}</dd></div>
            <div><dt>Nhiệt độ</dt><dd class="accent-amber">{{ stats.cpu.temp ? stats.cpu.temp + ' °C' : 'Tự động' }}</dd></div>
          </dl>
        </div>

        <div class="telemetry-col">
          <div class="telemetry-col-head">
            <MemoryStick :size="15" :stroke-width="1.8" />
            <span>Bộ nhớ</span>
          </div>
          <div class="telemetry-gauge">
            <div class="gauge-ring" :style="gaugeStyle(stats.ram.usagePercent, 'var(--accent-cyan)')">
              <div class="gauge-ring-inner">
                <strong>{{ stats.ram.usagePercent }}<span>%</span></strong>
              </div>
            </div>
            <div class="telemetry-col-name">RAM hệ thống</div>
          </div>
          <dl class="telemetry-specs">
            <div><dt>Đã dùng</dt><dd>{{ stats.ram.usedGB }} GB</dd></div>
            <div><dt>Còn trống</dt><dd class="accent-green">{{ stats.ram.freeGB }} GB</dd></div>
            <div><dt>Tổng dung lượng</dt><dd>{{ stats.ram.totalGB }} GB</dd></div>
          </dl>
        </div>

        <div v-if="stats.gpu.hasDiscreteGpu" class="telemetry-col">
          <div class="telemetry-col-head">
            <CircuitBoard :size="15" :stroke-width="1.8" />
            <span>Đồ họa</span>
          </div>
          <div class="telemetry-gauge">
            <div class="gauge-ring" :style="gaugeStyle(stats.gpu.usagePercent, 'var(--accent-green)')">
              <div class="gauge-ring-inner">
                <strong>{{ stats.gpu.usagePercent != null ? stats.gpu.usagePercent : '—' }}<span v-if="stats.gpu.usagePercent != null">%</span></strong>
              </div>
            </div>
            <div class="telemetry-col-name">{{ stats.gpu.model }}</div>
          </div>
          <dl class="telemetry-specs">
            <div><dt>VRAM</dt><dd>{{ stats.gpu.vram }}</dd></div>
            <div><dt>Hãng sản xuất</dt><dd>{{ stats.gpu.vendor }}</dd></div>
            <div><dt>Nhiệt độ</dt><dd class="accent-amber">{{ stats.gpu.temp != null ? stats.gpu.temp + ' °C' : 'N/A' }}</dd></div>
          </dl>
        </div>

        <div class="telemetry-col">
          <div class="telemetry-col-head">
            <Monitor :size="15" :stroke-width="1.8" />
            <span>Hệ thống</span>
          </div>
          <div class="telemetry-status">
            <span class="telemetry-status-dot"></span>
            Đang hoạt động ổn định
          </div>
          <dl class="telemetry-specs">
            <div><dt>Hệ điều hành</dt><dd>Windows {{ stats.system.arch }}</dd></div>
            <div><dt>Phiên bản</dt><dd>{{ stats.system.release || '10 / 11' }}</dd></div>
            <div><dt>Kiến trúc</dt><dd>{{ stats.system.arch || 'x64' }}</dd></div>
          </dl>
        </div>
      </div>
    </section>
  </div>
</template>