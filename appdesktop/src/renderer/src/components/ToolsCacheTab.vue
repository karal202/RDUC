<script setup>
import { computed, ref } from 'vue'
import {
  Bolt,
  Gamepad2,
  Laptop,
  SlidersHorizontal,
  Wrench,
  Play,
  Trash2,
  Cpu,
  Monitor,
  RotateCcw,
  Briefcase,
  Check,
  Copy,
  Terminal,
  HardDrive,
  Sparkles,
  Layers,
  Layers2,
  Loader2
} from 'lucide-vue-next'
import { useScriptRunner } from '../composables/useScriptRunner'

const { runScript, isActionRunning } = useScriptRunner()

const activeCategory = ref('all')
const searchQuery = ref('')
const isCleaning = ref(false)
const runningToolKey = ref(null)
const cleanLog = ref('')
const copied = ref(false)
const ramProfile = ref('16')
const ramProfiles = ['2', '3', '4', '6', '8', '10', '12', '16', '20', '24', '32', '48', '64']

/* eslint-disable no-unused-vars */
const CATEGORIES = [
  { key: 'cleanup', label: 'Bảo Trì & RAM', icon: Trash2, accent: '#06b6d4' },
  { key: 'nvidia', label: 'NVIDIA GPU', icon: Monitor, accent: '#76b900' },
  { key: 'amd', label: 'AMD GPU', icon: Cpu, accent: '#ed1c24' },
  { key: 'cpu', label: 'CPU & Tiến Trình', icon: Bolt, accent: '#3b82f6' },
  { key: 'system', label: 'Hệ Thống & Services', icon: SlidersHorizontal, accent: '#f59e0b' }
]
/* eslint-enable no-unused-vars */

const tools = [
  {
    key: 'msi',
    category: 'cpu',
    label: 'MSI Utility V3',
    icon: SlidersHorizontal,
    desc: 'Tối ưu MSI (Message Signaled-Based Interrupts) Mode giảm độ trễ ngắt DPC cho GPU và Audio.',
    badge: 'INTERRUPTS',
    action: 'msi-utility',
    actionLabel: 'Mở MSI Utility V3',
    accent: '#a855f7'
  },
  {
    key: 'clean-cache',
    category: 'cleanup',
    label: 'Clean Cache Script',
    icon: Trash2,
    desc: 'Chạy script dọn dẹp các tệp đệm rác hệ thống (Clear.bat).',
    badge: 'CLEAN',
    action: 'clean-cache',
    actionLabel: 'Chạy Dọn Cache',
    accent: '#06b6d4'
  },
  {
    key: 'memory',
    category: 'cleanup',
    label: 'Memory Standby Cleaner',
    icon: Bolt,
    desc: 'Xả sạch Standby List và Working Set RAM, chống drop FPS đột ngột khi chơi game nặng.',
    badge: 'RAM CACHE',
    action: 'ram-optimization',
    actionLabel: 'Áp dụng RAM',
    accent: '#22c55e',
    isRamTool: true
  },
  {
    key: 'device',
    category: 'cleanup',
    label: 'Device Cleanup',
    icon: Laptop,
    desc: 'Dọn dẹp driver các thiết bị ngoại vi cũ/ngắt kết nối tồn đọng trong Windows Device Manager.',
    badge: 'HARDWARE',
    action: null,
    actionLabel: 'Không khả dụng',
    accent: '#64748b'
  },
  // NVIDIA
  {
    key: 'nvidia-nvcleanstall',
    category: 'nvidia',
    label: 'NVIDIA NvCleanstall',
    icon: Monitor,
    desc: 'Công cụ cài đặt driver NVIDIA siêu sạch, loại bỏ Telemetry và bloatware.',
    badge: 'NVIDIA',
    action: 'nvidia-nvcleanstall',
    actionLabel: 'Mở NvCleanstall',
    accent: '#76b900'
  },
  {
    key: 'nvidia-profile-inspector',
    category: 'nvidia',
    label: 'NVIDIA Profile Inspector',
    icon: Monitor,
    desc: 'Tinh chỉnh profile GPU NVIDIA chuyên sâu (Frame rate limiter, ReBAR, Resync).',
    badge: 'NVIDIA',
    action: 'nvidia-profile-inspector',
    actionLabel: 'Mở Profile Inspector',
    accent: '#76b900'
  },
  {
    key: 'nvidia-inspector',
    category: 'nvidia',
    label: 'NVIDIA Inspector',
    icon: Monitor,
    desc: 'Công cụ giám sát thông số clock, voltage và ép xung nhẹ card đồ họa NVIDIA.',
    badge: 'NVIDIA',
    action: 'nvidia-inspector',
    actionLabel: 'Mở NVIDIA Inspector',
    accent: '#76b900'
  },
  {
    key: 'nvidia-powermizer',
    category: 'nvidia',
    label: 'NVIDIA PowerMizer',
    icon: Monitor,
    desc: 'Khóa GPU ở trạng thái P0/P2, ngăn hạ xung khi load cảnh nhẹ trong game.',
    badge: 'NVIDIA',
    action: 'nvidia-powermizer',
    actionLabel: 'Mở PowerMizer',
    accent: '#76b900'
  },
  {
    key: 'nvidia-desktop-composition',
    category: 'nvidia',
    label: 'Desktop Composition',
    icon: Monitor,
    desc: 'Áp dụng tinh chỉnh Desktop Composition cho GPU NVIDIA chống trễ DWM.',
    badge: 'NVIDIA',
    action: 'nvidia-desktop-composition',
    actionLabel: 'Áp dụng Composition',
    accent: '#76b900'
  },
  {
    key: 'nvidia-gamedvr-gamemode',
    category: 'nvidia',
    label: 'NVIDIA GameDVR & Game Mode',
    icon: Monitor,
    desc: 'Tối ưu liên kết giữa driver đồ họa NVIDIA và Windows Game Mode.',
    badge: 'NVIDIA',
    action: 'nvidia-gamedvr-gamemode',
    actionLabel: 'Áp dụng GameDVR Fix',
    accent: '#76b900'
  },
  {
    key: 'nvidia-graphics-tweaks',
    category: 'nvidia',
    label: 'NVIDIA Graphics Tweaks',
    icon: Monitor,
    desc: 'Áp dụng các khóa Registry tối ưu rendering cho driver đồ họa NVIDIA.',
    badge: 'NVIDIA',
    action: 'nvidia-graphics-tweaks',
    actionLabel: 'Áp dụng Tweaks',
    accent: '#76b900'
  },
  {
    key: 'nvidia-nvidia-tweaks',
    category: 'nvidia',
    label: 'NVIDIA Driver Tweaks',
    icon: Monitor,
    desc: 'Gói tinh chỉnh tổng hợp NVIDIA Driver latency và power delivery.',
    badge: 'NVIDIA',
    action: 'nvidia-nvidia-tweaks',
    actionLabel: 'Áp dụng Driver Tweaks',
    accent: '#76b900'
  },
  {
    key: 'nvidia-power-latency',
    category: 'nvidia',
    label: 'NVIDIA Power & Latency',
    icon: Monitor,
    desc: 'Tối ưu độ trễ cấp nguồn và chuyển đổi trạng thái hiệu năng cho GPU NVIDIA.',
    badge: 'NVIDIA',
    action: 'nvidia-power-latency',
    actionLabel: 'Áp dụng Power Tweaks',
    accent: '#76b900'
  },
  {
    key: 'nvidia-task-priority',
    category: 'nvidia',
    label: 'NVIDIA Task Priority',
    icon: Monitor,
    desc: 'Ưu tiên luồng xử lý đồ họa của NVIDIA lên mức High Priority.',
    badge: 'NVIDIA',
    action: 'nvidia-task-priority',
    actionLabel: 'Áp dụng Priority',
    accent: '#76b900'
  },
  // AMD
  {
    key: 'amd-radeonmod',
    category: 'amd',
    label: 'AMD RadeonMod',
    icon: Cpu,
    desc: 'Công cụ tinh chỉnh Registry ngầm chuyên sâu cho GPU AMD Radeon.',
    badge: 'AMD',
    action: 'amd-radeonmod',
    actionLabel: 'Mở RadeonMod',
    accent: '#ed1c24'
  },
  {
    key: 'amd-morepowertool',
    category: 'amd',
    label: 'AMD MorePowerTool',
    icon: Cpu,
    desc: 'Công cụ ép xung, can thiệp Power Table và tăng Power Limit GPU AMD.',
    badge: 'AMD',
    action: 'amd-morepowertool',
    actionLabel: 'Mở MorePowerTool',
    accent: '#ed1c24'
  },
  {
    key: 'amd-radeonsoftwarelimmer',
    category: 'amd',
    label: 'AMD RadeonSlimmer',
    icon: Cpu,
    desc: 'Công cụ lược bỏ bớt các thành phần không cần thiết trong driver AMD.',
    badge: 'AMD',
    action: 'amd-radeonsoftwarelimmer',
    actionLabel: 'Mở RadeonSlimmer',
    accent: '#ed1c24'
  },
  {
    key: 'amd-3d-settings',
    category: 'amd',
    label: 'AMD 3D Settings',
    icon: Cpu,
    desc: 'Áp dụng tinh chỉnh 3D settings hiệu năng cao cho GPU AMD Radeon.',
    badge: 'AMD',
    action: 'amd-3d-settings',
    actionLabel: 'Áp dụng 3D Settings',
    accent: '#ed1c24'
  },
  {
    key: 'amd-driver-tweaks',
    category: 'amd',
    label: 'AMD Driver Tweaks',
    icon: Cpu,
    desc: 'Áp dụng tinh chỉnh khóa driver AMD Radeon giảm stuttering.',
    badge: 'AMD',
    action: 'amd-driver-tweaks',
    actionLabel: 'Áp dụng Driver Tweaks',
    accent: '#ed1c24'
  },
  // CPU & PROCESS
  {
    key: 'throttlestop',
    category: 'cpu',
    label: 'ThrottleStop',
    icon: Bolt,
    desc: 'Công cụ kiểm soát xung nhịp, undervolt và triệt tiêu CPU Throttling.',
    badge: 'CPU',
    action: 'throttlestop',
    actionLabel: 'Mở ThrottleStop',
    accent: '#3b82f6'
  },
  {
    key: 'parkcontrol',
    category: 'cpu',
    label: 'ParkControl',
    icon: Bolt,
    desc: 'Tắt Core Parking thời gian thực mà không cần khởi động lại máy.',
    badge: 'CPU',
    action: 'parkcontrol',
    actionLabel: 'Mở ParkControl',
    accent: '#06b6d4'
  },
  {
    key: 'processlasso',
    category: 'cpu',
    label: 'Process Lasso',
    icon: Bolt,
    desc: 'Tự động phân bổ lõi CPU Affinity, ProBalance chống tràn CPU 100%.',
    badge: 'CPU',
    action: 'processlasso',
    actionLabel: 'Mở Process Lasso',
    accent: '#f59e0b'
  },
  {
    key: 'quickcpu',
    category: 'cpu',
    label: 'QuickCPU',
    icon: Bolt,
    desc: 'Công cụ can thiệp CPU Frequency Scaling và quản lý năng lượng vi xử lý.',
    badge: 'CPU',
    action: 'quickcpu',
    actionLabel: 'Mở QuickCPU',
    accent: '#10b981'
  },
  {
    key: 'ame-beta',
    category: 'cpu',
    label: 'AME Beta',
    icon: Bolt,
    desc: 'Công cụ tối ưu kiến trúc x86 và loại bỏ các thành phần rườm rà của hệ thống.',
    badge: 'CPU',
    action: 'ame-beta',
    actionLabel: 'Mở AME Beta',
    accent: '#8b5cf6'
  },
  // SYSTEM & SERVICES
  {
    key: 'tweaks',
    category: 'system',
    label: 'Windows Settings Tweaks',
    icon: SlidersHorizontal,
    desc: 'Bộ tinh chỉnh hệ điều hành chuyên sâu tối ưu phản hồi và dịch vụ nền Windows.',
    badge: 'SYSTEM',
    action: 'windows-settings-tweaks',
    actionLabel: 'Áp dụng Tweaks',
    accent: '#3b82f6'
  },
  {
    key: 'classic-menu-win10',
    category: 'system',
    label: 'Classic Menu Win 10',
    icon: Layers,
    desc: 'Khôi phục Menu chuột phải cổ điển phản hồi tức thời trên Windows 10.',
    badge: 'MENU',
    action: 'classic-menu-win10',
    actionLabel: 'Áp dụng Menu Win10',
    accent: '#06b6d4'
  },
  {
    key: 'classic-menu-win11',
    category: 'system',
    label: 'Classic Menu Win 11',
    icon: Layers2,
    desc: 'Bỏ menu chuột phải phân tầng chậm chạp của Windows 11 về dạng truyền thống.',
    badge: 'MENU',
    action: 'classic-menu-win11',
    actionLabel: 'Áp dụng Menu Win11',
    accent: '#00c2ff'
  },
  {
    key: 'disable-extreme-drivers',
    category: 'system',
    label: 'Disable Extreme Drivers',
    icon: Laptop,
    desc: 'Vô hiệu hóa các driver không cần thiết trong gói tinh chỉnh Extreme Reg.',
    badge: 'EXTREME',
    action: 'disable-extreme-drivers',
    actionLabel: 'Disable Drivers',
    accent: '#ec4899'
  },
  {
    key: 'disable-extreme-gamer-services',
    category: 'system',
    label: 'Disable Extreme Gamer Services',
    icon: Gamepad2,
    desc: 'Tắt sâu các dịch vụ thừa thãi chỉ giữ lại lõi thiết yếu phục vụ game thủ.',
    badge: 'EXTREME',
    action: 'disable-extreme-gamer-services',
    actionLabel: 'Disable Services',
    accent: '#ef4444'
  },
  {
    key: 'disable-extreme-professional-services',
    category: 'system',
    label: 'Disable Professional Services',
    icon: Briefcase,
    desc: 'Tắt các dịch vụ doanh nghiệp/văn phòng không dùng tới khi chơi game.',
    badge: 'EXTREME',
    action: 'disable-extreme-professional-services',
    actionLabel: 'Disable Prof Services',
    accent: '#f59e0b'
  },
  {
    key: 'restore-extreme-gamer-services',
    category: 'system',
    label: 'Restore Gamer Services',
    icon: RotateCcw,
    desc: 'Khôi phục lại các dịch vụ game thủ Extreme Reg về mặc định.',
    badge: 'RESTORE',
    action: 'restore-extreme-gamer-services',
    actionLabel: 'Restore Gamer Services',
    accent: '#22c55e'
  },
  {
    key: 'restore-extreme-professional-services',
    category: 'system',
    label: 'Restore Professional Services',
    icon: RotateCcw,
    desc: 'Khôi phục lại các dịch vụ văn phòng Extreme Reg về mặc định.',
    badge: 'RESTORE',
    action: 'restore-extreme-professional-services',
    actionLabel: 'Restore Prof Services',
    accent: '#22c55e'
  }
]

/* eslint-disable no-unused-vars */
const filteredTools = computed(() => {
  return tools.filter((tool) => {
    const matchCat = activeCategory.value === 'all' || tool.category === activeCategory.value
    const q = searchQuery.value.trim().toLowerCase()
    const matchSearch =
      !q ||
      tool.label.toLowerCase().includes(q) ||
      tool.desc.toLowerCase().includes(q) ||
      tool.badge.toLowerCase().includes(q)
    return matchCat && matchSearch
  })
})
/* eslint-enable no-unused-vars */

const handleExecuteTool = async (tool) => {
  if (!tool.action || runningToolKey.value || isActionRunning(tool.action)) return
  runningToolKey.value = tool.key
  const time = new Date().toLocaleTimeString()
  cleanLog.value += `[${time}] [TOOLS] Đang thực thi [${tool.label}]...\n`
  try {
    const options = tool.action === 'ram-optimization' ? { profile: ramProfile.value } : {}
    const res = await runScript(tool.action, tool.label, options)
    cleanLog.value += res?.success ? `✅ ${res.message}\n` : `❌ ${res?.message || 'Thất bại'}\n`
  } catch (err) {
    cleanLog.value += `❌ Lỗi: ${err.message || err}\n`
  } finally {
    runningToolKey.value = null
  }
}

const handleRunCacheClean = async () => {
  if (isCleaning.value || isActionRunning('dawa-cleaner')) return
  isCleaning.value = true
  const time = new Date().toLocaleTimeString()
  cleanLog.value += `[${time}] [CACHE CLEANER] Đang quét và dọn dẹp các thư mục đệm hệ thống (Temp, Prefetch)...\n`
  try {
    const res = await runScript('dawa-cleaner', 'Dọn dẹp Cache hệ thống')
    if (res?.success) {
      cleanLog.value += `✅ ${res.message}\n`
      if (res.stepResults) {
        res.stepResults.forEach((step, i) => {
          cleanLog.value += `  [Bước ${i + 1}] Xóa thư mục: ${step.args?.[0] || 'Target'}\n`
          if (step.stdout) cleanLog.value += `      > ${step.stdout.trim()}\n`
          if (step.stderr) cleanLog.value += `      ! ${step.stderr.trim()}\n`
        })
      }
      cleanLog.value += '✨ Đã dọn dẹp bộ nhớ đệm Cache thành công! Hệ thống đã được giải phóng.\n'
    } else {
      cleanLog.value += `❌ ${res?.message || 'Thất bại'}\n`
    }
  } catch (err) {
    cleanLog.value += `❌ Lỗi thực thi: ${err.message || err}\n`
  } finally {
    isCleaning.value = false
  }
}

const copyLog = async () => {
  if (!cleanLog.value) return
  try {
    await navigator.clipboard.writeText(cleanLog.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // ignore
  }
}

const clearLog = () => {
  cleanLog.value = ''
}
</script>

<template>
  <div class="tools-page">
    <!-- Header Telemetry Banner -->
    <header class="tools-header-card">
      <div class="tools-header-main">
        <div class="tools-badge-pill">
          <Wrench :size="13" class="text-green-400" />
          <span>TOOLBOX & SYSTEM MAINTENANCE</span>
        </div>
        <h1 class="tools-main-title">Kho Tiện Ích & Dọn Dẹp Hệ Thống</h1>
        <p class="tools-main-desc">
          Bộ sưu tập 30+ công cụ tinh chỉnh card đồ họa (NVIDIA / AMD), quản lý luồng CPU và giải
          phóng bộ nhớ RAM.
        </p>
      </div>
      <div class="tools-telemetry-row">
        <div class="tools-tele-chip">
          <HardDrive :size="12" class="text-emerald-400" />
          <span>CACHE: <strong>PURGE READY</strong></span>
        </div>
        <div class="tools-tele-chip">
          <Monitor :size="12" class="text-blue-400" />
          <span>GPU UTILITIES: <strong>READY</strong></span>
        </div>
        <div class="tools-tele-chip">
          <Bolt :size="12" class="text-amber-400" />
          <span
            >TOTAL TOOLS: <strong>{{ tools.length }}</strong></span
          >
        </div>
      </div>
    </header>

    <!-- HERO: DEEP CACHE CLEANER SPOTLIGHT -->
    <section class="tools-hero-cleaner">
      <div class="tools-hero-inner">
        <div class="tools-hero-icon-box">
          <Trash2 :size="28" stroke-width="2.2" />
        </div>
        <div class="tools-hero-content">
          <div class="tools-hero-meta">
            <span class="tools-hero-tag">INSTANT PURGE</span>
            <span class="tools-hero-title">Dọn Dẹp Sâu Bộ Nhớ Đệm (Deep Cache Cleaner)</span>
          </div>
          <p class="tools-hero-desc">
            Tự động quét và loại bỏ các file tạm rác trong <code>%TEMP%</code>, Prefetch và tệp đệm
            log Windows, giải phóng hàng chục Gigabyte SSD và triệt tiêu độ trễ truy xuất đĩa.
          </p>
        </div>
      </div>

      <button
        type="button"
        class="tools-hero-btn"
        :disabled="isCleaning || isActionRunning('dawa-cleaner')"
        @click="handleRunCacheClean"
      >
        <Loader2 v-if="isCleaning || isActionRunning('dawa-cleaner')" :size="16" class="spin" />
        <Sparkles v-else :size="16" class="fill-current" />
        <span>{{
          isCleaning || isActionRunning('dawa-cleaner') ? 'Đang dọn dẹp...' : 'Dọn dẹp Cache ngay'
        }}</span>
      </button>
    </section>

    <!-- SECTION: CATEGORY SECTIONS -->
    <div class="tools-category-sections">
      <!-- CLEANUP & RAM SECTION -->
      <section class="tools-category-card" style="--c: #06b6d4">
        <div class="tools-cat-header">
          <div class="tools-cat-icon-wrap">
            <Trash2 :size="18" />
          </div>
          <div class="tools-cat-info">
            <h3 class="tools-cat-title">Bảo Trì & RAM</h3>
            <p class="tools-cat-desc">Dọn dẹp cache, tối ưu bộ nhớ RAM</p>
          </div>
          <span class="tools-cat-count"
            >{{ tools.filter((t) => t.category === 'cleanup').length }} Tools</span
          >
        </div>
        <div class="tools-cat-grid">
          <div
            v-for="tool in tools.filter((t) => t.category === 'cleanup')"
            :key="tool.key"
            class="tool-card"
            :style="{ '--c': tool.accent }"
          >
            <div class="tool-card-head">
              <div class="tool-card-icon">
                <component :is="tool.icon" :size="16" stroke-width="2" />
              </div>
              <span class="tool-card-badge">{{ tool.badge }}</span>
            </div>

            <div class="tool-card-content">
              <h4 class="tool-card-title">{{ tool.label }}</h4>
              <p class="tool-card-desc">{{ tool.desc }}</p>
            </div>

            <div v-if="tool.isRamTool" class="tool-ram-selector">
              <label class="tool-ram-label" for="ram-sel-{{ tool.key }}">RAM:</label>
              <select :id="'ram-sel-' + tool.key" v-model="ramProfile" class="tool-ram-select">
                <option v-for="p in ramProfiles" :key="p" :value="p">{{ p }} GB</option>
              </select>
            </div>

            <div class="tool-card-action">
              <button
                v-if="tool.action"
                type="button"
                class="tool-act-btn"
                :disabled="runningToolKey === tool.key || isActionRunning(tool.action)"
                @click="handleExecuteTool(tool)"
              >
                <Loader2
                  v-if="runningToolKey === tool.key || isActionRunning(tool.action)"
                  :size="11"
                  class="spin"
                />
                <Play v-else :size="11" class="fill-current" />
                <span>{{
                  runningToolKey === tool.key || isActionRunning(tool.action)
                    ? 'Đang xử lý...'
                    : tool.actionLabel
                }}</span>
              </button>
              <span v-else class="tool-disabled-label">{{ tool.actionLabel }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- NVIDIA GPU SECTION -->
      <section class="tools-category-card" style="--c: #76b900">
        <div class="tools-cat-header">
          <div class="tools-cat-icon-wrap">
            <Monitor :size="18" />
          </div>
          <div class="tools-cat-info">
            <h3 class="tools-cat-title">NVIDIA GPU</h3>
            <p class="tools-cat-desc">Tinh chỉnh driver, profile và power</p>
          </div>
          <span class="tools-cat-count"
            >{{ tools.filter((t) => t.category === 'nvidia').length }} Tools</span
          >
        </div>
        <div class="tools-cat-grid">
          <div
            v-for="tool in tools.filter((t) => t.category === 'nvidia')"
            :key="tool.key"
            class="tool-card"
            :style="{ '--c': tool.accent }"
          >
            <div class="tool-card-head">
              <div class="tool-card-icon">
                <component :is="tool.icon" :size="16" stroke-width="2" />
              </div>
              <span class="tool-card-badge">{{ tool.badge }}</span>
            </div>

            <div class="tool-card-content">
              <h4 class="tool-card-title">{{ tool.label }}</h4>
              <p class="tool-card-desc">{{ tool.desc }}</p>
            </div>

            <div class="tool-card-action">
              <button
                v-if="tool.action"
                type="button"
                class="tool-act-btn"
                :disabled="runningToolKey === tool.key || isActionRunning(tool.action)"
                @click="handleExecuteTool(tool)"
              >
                <Loader2
                  v-if="runningToolKey === tool.key || isActionRunning(tool.action)"
                  :size="11"
                  class="spin"
                />
                <Play v-else :size="11" class="fill-current" />
                <span>{{
                  runningToolKey === tool.key || isActionRunning(tool.action)
                    ? 'Đang xử lý...'
                    : tool.actionLabel
                }}</span>
              </button>
              <span v-else class="tool-disabled-label">{{ tool.actionLabel }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- AMD GPU SECTION -->
      <section class="tools-category-card" style="--c: #ed1c24">
        <div class="tools-cat-header">
          <div class="tools-cat-icon-wrap">
            <Cpu :size="18" />
          </div>
          <div class="tools-cat-info">
            <h3 class="tools-cat-title">AMD GPU</h3>
            <p class="tools-cat-desc">Ép xung, tinh chỉnh registry và driver</p>
          </div>
          <span class="tools-cat-count"
            >{{ tools.filter((t) => t.category === 'amd').length }} Tools</span
          >
        </div>
        <div class="tools-cat-grid">
          <div
            v-for="tool in tools.filter((t) => t.category === 'amd')"
            :key="tool.key"
            class="tool-card"
            :style="{ '--c': tool.accent }"
          >
            <div class="tool-card-head">
              <div class="tool-card-icon">
                <component :is="tool.icon" :size="16" stroke-width="2" />
              </div>
              <span class="tool-card-badge">{{ tool.badge }}</span>
            </div>

            <div class="tool-card-content">
              <h4 class="tool-card-title">{{ tool.label }}</h4>
              <p class="tool-card-desc">{{ tool.desc }}</p>
            </div>

            <div class="tool-card-action">
              <button
                v-if="tool.action"
                type="button"
                class="tool-act-btn"
                :disabled="runningToolKey === tool.key || isActionRunning(tool.action)"
                @click="handleExecuteTool(tool)"
              >
                <Loader2
                  v-if="runningToolKey === tool.key || isActionRunning(tool.action)"
                  :size="11"
                  class="spin"
                />
                <Play v-else :size="11" class="fill-current" />
                <span>{{
                  runningToolKey === tool.key || isActionRunning(tool.action)
                    ? 'Đang xử lý...'
                    : tool.actionLabel
                }}</span>
              </button>
              <span v-else class="tool-disabled-label">{{ tool.actionLabel }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- CPU & PROCESS SECTION -->
      <section class="tools-category-card" style="--c: #3b82f6">
        <div class="tools-cat-header">
          <div class="tools-cat-icon-wrap">
            <Bolt :size="18" />
          </div>
          <div class="tools-cat-info">
            <h3 class="tools-cat-title">CPU & Tiến Trình</h3>
            <p class="tools-cat-desc">Quản lý xung nhịp, core parking và process</p>
          </div>
          <span class="tools-cat-count"
            >{{ tools.filter((t) => t.category === 'cpu').length }} Tools</span
          >
        </div>
        <div class="tools-cat-grid">
          <div
            v-for="tool in tools.filter((t) => t.category === 'cpu')"
            :key="tool.key"
            class="tool-card"
            :style="{ '--c': tool.accent }"
          >
            <div class="tool-card-head">
              <div class="tool-card-icon">
                <component :is="tool.icon" :size="16" stroke-width="2" />
              </div>
              <span class="tool-card-badge">{{ tool.badge }}</span>
            </div>

            <div class="tool-card-content">
              <h4 class="tool-card-title">{{ tool.label }}</h4>
              <p class="tool-card-desc">{{ tool.desc }}</p>
            </div>

            <div class="tool-card-action">
              <button
                v-if="tool.action"
                type="button"
                class="tool-act-btn"
                :disabled="runningToolKey === tool.key || isActionRunning(tool.action)"
                @click="handleExecuteTool(tool)"
              >
                <Loader2
                  v-if="runningToolKey === tool.key || isActionRunning(tool.action)"
                  :size="11"
                  class="spin"
                />
                <Play v-else :size="11" class="fill-current" />
                <span>{{
                  runningToolKey === tool.key || isActionRunning(tool.action)
                    ? 'Đang xử lý...'
                    : tool.actionLabel
                }}</span>
              </button>
              <span v-else class="tool-disabled-label">{{ tool.actionLabel }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- SYSTEM & SERVICES SECTION -->
      <section class="tools-category-card" style="--c: #f59e0b">
        <div class="tools-cat-header">
          <div class="tools-cat-icon-wrap">
            <SlidersHorizontal :size="18" />
          </div>
          <div class="tools-cat-info">
            <h3 class="tools-cat-title">Hệ Thống & Services</h3>
            <p class="tools-cat-desc">Tinh chỉnh Windows, menu và extreme services</p>
          </div>
          <span class="tools-cat-count"
            >{{ tools.filter((t) => t.category === 'system').length }} Tools</span
          >
        </div>
        <div class="tools-cat-grid">
          <div
            v-for="tool in tools.filter((t) => t.category === 'system')"
            :key="tool.key"
            class="tool-card"
            :style="{ '--c': tool.accent }"
          >
            <div class="tool-card-head">
              <div class="tool-card-icon">
                <component :is="tool.icon" :size="16" stroke-width="2" />
              </div>
              <span class="tool-card-badge">{{ tool.badge }}</span>
            </div>

            <div class="tool-card-content">
              <h4 class="tool-card-title">{{ tool.label }}</h4>
              <p class="tool-card-desc">{{ tool.desc }}</p>
            </div>

            <div class="tool-card-action">
              <button
                v-if="tool.action"
                type="button"
                class="tool-act-btn"
                :disabled="runningToolKey === tool.key || isActionRunning(tool.action)"
                @click="handleExecuteTool(tool)"
              >
                <Loader2
                  v-if="runningToolKey === tool.key || isActionRunning(tool.action)"
                  :size="11"
                  class="spin"
                />
                <Play v-else :size="11" class="fill-current" />
                <span>{{
                  runningToolKey === tool.key || isActionRunning(tool.action)
                    ? 'Đang xử lý...'
                    : tool.actionLabel
                }}</span>
              </button>
              <span v-else class="tool-disabled-label">{{ tool.actionLabel }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- SECTION: CONSOLE TERMINAL -->
    <section class="tools-console-card">
      <div class="tools-console-header">
        <div class="tools-console-title">
          <Terminal :size="14" class="text-green-400" />
          <span>TOOLBOX CONSOLE & EXECUTION AUDIT</span>
          <div class="tools-live-indicator" :class="{ running: isCleaning || runningToolKey }">
            <span class="tools-live-dot" />
            <span>{{ isCleaning || runningToolKey ? 'ĐANG XỬ LÝ...' : 'SẴN SÀNG' }}</span>
          </div>
        </div>
        <div class="tools-console-actions">
          <button
            type="button"
            class="tools-tool-btn"
            title="Sao chép log"
            :disabled="!cleanLog"
            @click="copyLog"
          >
            <Check v-if="copied" :size="13" class="text-green-400" />
            <Copy v-else :size="13" />
            <span>{{ copied ? 'Đã chép' : 'Sao chép' }}</span>
          </button>
          <button
            type="button"
            class="tools-tool-btn"
            title="Xóa console"
            :disabled="!cleanLog"
            @click="clearLog"
          >
            <Trash2 :size="13" />
            <span>Xóa log</span>
          </button>
        </div>
      </div>
      <pre class="tools-terminal-view">{{
        cleanLog || 'Sẵn sàng chờ thực thi dọn dẹp hoặc khởi chạy công cụ...'
      }}</pre>
    </section>
  </div>
</template>

<style scoped>
.tools-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 24px;
  max-width: 1560px;
  margin: 0 auto;
}

/* Header Banner */
.tools-header-card {
  position: relative;
  overflow: hidden;
  padding: 22px 26px;
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    rgba(34, 197, 94, 0.12) 0%,
    rgba(14, 20, 36, 0.85) 50%,
    rgba(6, 182, 212, 0.08) 100%
  );
  border: 1px solid rgba(34, 197, 94, 0.25);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.tools-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
  font: 700 10.5px/1 var(--font-mono);
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.tools-main-title {
  font:
    800 24px/1.15 'Archivo',
    sans-serif;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}

.tools-main-desc {
  font-size: 13px;
  color: rgba(226, 232, 240, 0.72);
  max-width: 720px;
  line-height: 1.5;
  margin: 0;
}

.tools-telemetry-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tools-tele-chip {
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

.tools-tele-chip strong {
  color: #f8fafc;
  font-weight: 700;
}

/* HERO DEEP CLEANER BOX */
.tools-hero-cleaner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 26px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%);
  border: 1px solid rgba(6, 182, 212, 0.35);
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
}

.tools-hero-inner {
  display: flex;
  align-items: center;
  gap: 18px;
  flex: 1;
  min-width: 280px;
}

.tools-hero-icon-box {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 182, 212, 0.18);
  color: #00c2ff;
  border: 1px solid rgba(6, 182, 212, 0.4);
  box-shadow: 0 6px 20px rgba(6, 182, 212, 0.25);
  flex-shrink: 0;
}

.tools-hero-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tools-hero-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tools-hero-tag {
  font: 700 9.5px var(--font-mono);
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.35);
}

.tools-hero-title {
  font:
    700 16.5px 'Archivo',
    sans-serif;
  color: #ffffff;
}

.tools-hero-desc {
  font-size: 12.5px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

.tools-hero-desc code {
  font-family: var(--font-mono);
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  color: #cbd5e1;
}

.tools-hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  border-radius: 12px;
  border: 1px solid rgba(6, 182, 212, 0.5);
  background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%);
  color: #ffffff;
  font:
    700 13px 'Archivo',
    sans-serif;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(6, 182, 212, 0.35);
  transition: all 0.25s ease;
  white-space: nowrap;
}

.tools-hero-btn:hover:not(:disabled) {
  filter: brightness(1.15);
  transform: translateY(-2px);
}

.tools-hero-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Category Sections */
.tools-category-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tools-category-card {
  padding: 20px 24px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid var(--c);
  border-color: rgba(var(--c), 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.tools-cat-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.tools-cat-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--c);
  background: rgba(var(--c), 0.15);
  color: var(--c);
}

.tools-cat-info {
  flex: 1;
}

.tools-cat-title {
  font:
    700 16px/1.2 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0 0 4px;
}

.tools-cat-desc {
  font-size: 13px;
  color: rgba(226, 232, 240, 0.7);
  margin: 0;
}

.tools-cat-count {
  font: 600 12px var(--font-mono);
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--c);
  background: rgba(var(--c), 0.2);
  color: var(--c);
}

.tools-cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* Tool Card (smaller version for category sections) */
.tool-card {
  padding: 16px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;
}

.tool-card:hover {
  background: rgba(15, 23, 42, 0.8);
  border-color: var(--c);
  border-color: rgba(var(--c), 0.3);
  transform: translateY(-2px);
}

.tool-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tool-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--c);
  background: rgba(var(--c), 0.15);
  color: var(--c);
}

.tool-card-badge {
  font: 600 10px var(--font-mono);
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--c);
  background: rgba(var(--c), 0.2);
  color: var(--c);
}

.tool-card-content {
  flex: 1;
}

.tool-card-title {
  font:
    600 14px/1.3 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0 0 4px;
}

.tool-card-desc {
  font-size: 12px;
  color: rgba(226, 232, 240, 0.65);
  line-height: 1.4;
  margin: 0;
}

.tool-ram-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
}

.tool-ram-label {
  font-size: 11px;
  color: rgba(226, 232, 240, 0.7);
  margin: 0;
}

.tool-ram-select {
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 12px;
  cursor: pointer;
}

.tool-card-action {
  margin-top: auto;
}

.tool-act-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--c);
  background: linear-gradient(135deg, var(--c), rgba(var(--c), 0.7));
  border: none;
  color: #ffffff;
  font: 600 13px/1 var(--font-mono);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-act-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.tool-act-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-disabled-label {
  display: block;
  text-align: center;
  padding: 10px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(226, 232, 240, 0.5);
  font: 500 12px var(--font-mono);
}

/* Console Card */
.tools-console-card {
  padding: 18px 22px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tools-console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.tools-console-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font: 600 13px var(--font-mono);
  color: #4ade80;
}

.tools-live-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font: 500 11px var(--font-mono);
  color: rgba(226, 232, 240, 0.5);
}

.tools-live-indicator.running {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
}

.tools-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(226, 232, 240, 0.5);
}

.tools-live-indicator.running .tools-live-dot {
  background: #4ade80;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.tools-console-actions {
  display: flex;
  gap: 8px;
}

.tools-tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(226, 232, 240, 0.7);
  font: 500 11px var(--font-mono);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tools-tool-btn:hover:not(:disabled) {
  background: rgba(15, 23, 42, 0.9);
  border-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.tools-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tools-terminal-view {
  padding: 14px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #4ade80;
  font: 12px var(--font-mono);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.tool-card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-card-title {
  font:
    600 14px 'Archivo',
    sans-serif;
  color: #f1f5f9;
  margin: 0;
}

.tool-card-desc {
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.45;
  margin: 0;
}

.tool-ram-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.tool-ram-label {
  font-size: 11px;
  color: #94a3b8;
  font-family: var(--font-mono);
}

.tool-ram-select {
  padding: 4px 8px;
  background: #090e1a;
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 6px;
  color: #4ade80;
  font: 700 11.5px var(--font-mono);
  outline: none;
  cursor: pointer;
}

.tool-card-action {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.tool-act-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
  background: color-mix(in srgb, var(--c) 18%, transparent);
  color: #ffffff;
  font: 600 11.5px var(--font-sans);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: center;
}

.tool-act-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--c) 30%, transparent);
  transform: translateY(-1px);
}

.tool-act-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-disabled-label {
  font-size: 11px;
  color: #64748b;
  font-family: var(--font-mono);
  padding: 6px 0;
}

/* Console Section */
.tools-console-card {
  border-radius: 14px;
  background: #040711;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.5);
}

.tools-console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.025);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.tools-console-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 700 11px var(--font-mono);
  color: #cbd5e1;
  letter-spacing: 0.06em;
}

.tools-live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.1);
  font-size: 9.5px;
  color: #94a3b8;
}

.tools-live-indicator.running {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.tools-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.tools-live-indicator.running .tools-live-dot {
  background: #4ade80;
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

.tools-console-actions {
  display: flex;
  gap: 8px;
}

.tools-tool-btn {
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

.tools-tool-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.tools-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tools-terminal-view {
  margin: 0;
  padding: 14px 16px;
  font: 500 12px/1.65 var(--font-mono);
  color: #4ade80;
  background: #02040a;
  min-height: 100px;
  max-height: 220px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
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
