<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

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

const fetchStats = async () => {
  try {
    if (window.api?.getSystemStats) {
      const res = await window.api.getSystemStats()
      if (res && res.success) {
        stats.value = res
      }
    }
  } catch (err) {
    console.error('Failed to get system stats:', err)
  } finally {
    isLoading.value = false
  }
}

const formatUptime = (seconds) => {
  if (!seconds) return '0 phút'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs} giờ ${mins} phút ${secs} giây`
}

onMounted(() => {
  fetchStats()
  timer = setInterval(fetchStats, 2000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px">
    <!-- Header Summary Banner -->
    <div
      class="dashboard-card"
      style="border-color: rgba(22, 119, 255, 0.2);"
    >
      <div style="display: flex; align-items: center; justify-content: space-between">
        <div>
          <div
            style="
              font-size: 11px;
              font-family: var(--font-mono);
              color: var(--accent-primary);
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
            "
          >
            REAL-TIME MONITORING
          </div>
          <h2 style="font-size: 20px; font-weight: 800; color: #ffffff">
            THÔNG SỐ PHẦN CỨNG MÁY TÍNH
          </h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px">
            Cập nhật trạng thái CPU, GPU, RAM & Nhiệt độ theo thời gian thực (1.5s/chu kỳ)
          </p>
        </div>
        <div style="display: flex; gap: 12px; text-align: right">
          <div
            style="
              background: rgba(0, 0, 0, 0.4);
              padding: 8px 14px;
              border-radius: 8px;
              border: 1px solid var(--border-color);
            "
          >
            <div style="font-size: 10px; color: var(--text-dim); font-family: var(--font-mono)">
              HOSTNAME
            </div>
            <div style="font-size: 13px; font-weight: 700; color: var(--accent-cyan)">
              {{ stats.system.hostname }}
            </div>
          </div>
          <div
            style="
              background: rgba(0, 0, 0, 0.4);
              padding: 8px 14px;
              border-radius: 8px;
              border: 1px solid var(--border-color);
            "
          >
            <div style="font-size: 10px; color: var(--text-dim); font-family: var(--font-mono)">
              UPTIME
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #ffffff">
              {{ formatUptime(stats.system.uptimeSeconds) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Gauges Grid -->
    <div class="grid-2">
      <!-- CPU Card -->
      <div class="dashboard-card">
        <div class="card-header">
          <div class="card-title">
            <div class="card-icon">⚡</div>
            <div>
              <div>VI XỬ LÝ (CPU)</div>
              <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
                {{ stats.cpu.brand || 'Processor' }}
              </div>
            </div>
          </div>
          <div style="text-align: right">
            <span
              style="
                font-size: 22px;
                font-weight: 800;
                color: var(--accent-primary);
                font-family: var(--font-mono);
              "
            >
              {{ stats.cpu.usagePercent }}%
            </span>
          </div>
        </div>

        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: stats.cpu.usagePercent + '%' }"></div>
        </div>

        <div
          style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 18px;
            padding-top: 14px;
            border-top: 1px solid var(--border-color);
            font-size: 12px;
          "
        >
          <div>
            <div style="color: var(--text-dim); font-size: 10px">TỐC ĐỘ XUNG</div>
            <div style="font-weight: 700; font-family: var(--font-mono); color: #fff">
              {{ stats.cpu.speed ? stats.cpu.speed + ' GHz' : 'N/A' }}
            </div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 10px">SỐ NHÂN CORES</div>
            <div style="font-weight: 700; font-family: var(--font-mono); color: #fff">
              {{ stats.cpu.cores ? stats.cpu.cores + ' Nhân' : 'N/A' }}
            </div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 10px">NHIỆT ĐỘ</div>
            <div
              style="font-weight: 700; font-family: var(--font-mono); color: var(--accent-amber)"
            >
              {{ stats.cpu.temp ? stats.cpu.temp + ' °C' : 'Tự động' }}
            </div>
          </div>
        </div>
      </div>

      <!-- RAM Card -->
      <div class="dashboard-card">
        <div class="card-header">
          <div class="card-title">
            <div
              class="card-icon"
              style="background-color: rgba(0, 240, 255, 0.15); color: var(--accent-cyan)"
            >
              💾
            </div>
            <div>
              <div>BỘ NHỚ RAM</div>
              <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
                DDR4 / DDR5 System Memory
              </div>
            </div>
          </div>
          <div style="text-align: right">
            <span
              style="
                font-size: 22px;
                font-weight: 800;
                color: var(--accent-cyan);
                font-family: var(--font-mono);
              "
            >
              {{ stats.ram.usagePercent }}%
            </span>
          </div>
        </div>

        <div class="progress-bar-bg">
          <div
            class="progress-bar-fill"
            style="background: linear-gradient(90deg, #10b981, #00f0ff)"
            :style="{ width: stats.ram.usagePercent + '%' }"
          ></div>
        </div>

        <div
          style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 18px;
            padding-top: 14px;
            border-top: 1px solid var(--border-color);
            font-size: 12px;
          "
        >
          <div>
            <div style="color: var(--text-dim); font-size: 10px">ĐÃ SỬ DỤNG</div>
            <div style="font-weight: 700; font-family: var(--font-mono); color: #fff">
              {{ stats.ram.usedGB }} GB
            </div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 10px">CÒN TRỐNG</div>
            <div
              style="font-weight: 700; font-family: var(--font-mono); color: var(--accent-green)"
            >
              {{ stats.ram.freeGB }} GB
            </div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 10px">TỔNG BỘ NHỚ</div>
            <div style="font-weight: 700; font-family: var(--font-mono); color: #fff">
              {{ stats.ram.totalGB }} GB
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Secondary Grid: GPU & OS Specs -->
    <div class="grid-2">
      <!-- GPU Card -->
      <div v-if="stats.gpu.hasDiscreteGpu" class="dashboard-card">
        <div class="card-header">
          <div class="card-title">
            <div
              class="card-icon"
              style="background-color: rgba(16, 185, 129, 0.15); color: var(--accent-green)"
            >
              🖥️
            </div>
            <div>
              <div>CARD ĐỒ HỌA RỜI (GPU)</div>
              <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
                {{ stats.gpu.model }}
              </div>
            </div>
          </div>
        </div>

        <div
          style="
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            margin-top: 12px;
            font-size: 12px;
          "
        >
          <div>
            <div style="color: var(--text-dim); font-size: 10px">BỘ NHỚ VRAM</div>
            <div style="font-weight: 700; font-family: var(--font-mono); color: #fff">
              {{ stats.gpu.vram }}
            </div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 10px">NHÀ SẢN XUẤT</div>
            <div style="font-weight: 700; font-family: var(--font-mono); color: #fff">
              {{ stats.gpu.vendor }}
            </div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 10px">TỶ LỆ SỬ DỤNG</div>
            <div style="font-weight: 700; font-family: var(--font-mono); color: var(--accent-green)">
              {{ stats.gpu.usagePercent != null ? stats.gpu.usagePercent + '%' : 'N/A' }}
            </div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 10px">NHIỆT ĐỘ GPU</div>
            <div
              style="font-weight: 700; font-family: var(--font-mono); color: var(--accent-amber)"
            >
              {{ stats.gpu.temp != null ? stats.gpu.temp + ' °C' : 'N/A' }}
            </div>
          </div>
        </div>
      </div>

      <!-- System Details Card -->
      <div class="dashboard-card">
        <div class="card-header">
          <div class="card-title">
            <div
              class="card-icon"
              style="background-color: rgba(245, 158, 11, 0.15); color: var(--accent-amber)"
            >
              ⚙️
            </div>
            <div>
              <div>HỆ ĐIỀU HÀNH & HỆ THỐNG</div>
              <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
                Windows Environment Info
              </div>
            </div>
          </div>
        </div>

        <div
          style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 12px;
            font-size: 12px;
          "
        >
          <div>
            <div style="color: var(--text-dim); font-size: 10px">NỀN TẢNG OS</div>
            <div style="font-weight: 700; font-family: var(--font-mono); color: #fff">
              Windows {{ stats.system.arch }}
            </div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 10px">RELEASE VER</div>
            <div style="font-weight: 700; font-family: var(--font-mono); color: #fff">
              {{ stats.system.release || '10/11' }}
            </div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 10px">TRẠNG THÁI BOOT</div>
            <div
              style="font-weight: 700; font-family: var(--font-mono); color: var(--accent-green)"
            >
              HOẠT ĐỘNG
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
