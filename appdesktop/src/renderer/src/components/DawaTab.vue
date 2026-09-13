<script setup>
import { ref, reactive } from 'vue'
import {
  BatteryCharging,
  Gamepad2,
  Sparkles,
  Play,
  Zap,
  ShieldOff,
  EyeOff,
  Snowflake,
  Shield,
  SlidersHorizontal,
  Terminal,
  Copy,
  Trash2,
  Cpu,
  Flame,
  Check,
  Activity
} from 'lucide-vue-next'

const logOutput = ref('')
const isRunning = ref(false)
const copied = ref(false)
const selectedWin32Priority = ref('26')
const selectedPowerPlan = ref('dawa-ultimate')

const WIN32_PRIORITY_OPTIONS = Object.freeze([
  {
    value: '26',
    label: '26 Hex (Khuyến nghị eSports — Max FPS/Min Stutter)',
    desc: 'Lượng tử chu kỳ ngắn, ưu tiên tối đa cửa sổ game Foreground'
  },
  {
    value: '28',
    label: '28 Hex (Tối ưu phản hồi chuột & màn hình)',
    desc: 'Cân bằng giữa input và frame time'
  },
  {
    value: '2a',
    label: '2A Hex (Đa nhiệm tác vụ nặng)',
    desc: 'Dành cho vừa chơi game vừa stream/record'
  },
  {
    value: 'default',
    label: 'Default (02 Hex - Mặc định Windows)',
    desc: 'Phân bổ chu kỳ chuẩn của hệ điều hành'
  },
  { value: '14', label: '14 Hex' },
  { value: '15', label: '15 Hex' },
  { value: '16', label: '16 Hex' },
  { value: '18', label: '18 Hex' },
  { value: '19', label: '19 Hex' },
  { value: '1a', label: '1A Hex' },
  { value: '24', label: '24 Hex' },
  { value: '25', label: '25 Hex' },
  { value: 'fa2a2a', label: 'FA2A2A Hex' },
  { value: 'fa332a', label: 'FA332A Hex' },
  { value: 'fb000000', label: 'FB000000 Hex' },
  { value: 'fff9887', label: 'FFF9887 Hex' }
])

const POWER_PLAN_OPTIONS = Object.freeze([
  {
    value: 'dawa-ultimate',
    label: 'DAWA Ultimate Performance',
    desc: 'Mở khóa 100% xung nhịp không drop P-States'
  },
  { value: 'atlas', label: 'Atlas Power Plan', desc: 'Tối ưu độ trễ DPC cho game bắn súng FPS' },
  {
    value: 'bitsum-highest',
    label: 'Bitsum Highest Performance',
    desc: 'Triệt tiêu core parking và CPU throttling'
  },
  {
    value: 'amitv3-idle',
    label: 'Amitv3 Idle Enabled',
    desc: 'Tối ưu nhiệt độ phòng khi máy nhàn rỗi'
  },
  {
    value: 'framesync-boost',
    label: 'FrameSync Boost',
    desc: 'Đồng bộ frame time ổn định cho 1% low FPS'
  }
])

const DAWA_ACTIONS = Object.freeze([
  {
    key: 'dawa-gaming-boost',
    title: 'DAWA Ultimate Gaming Boost',
    badge: 'MAX PERFORMANCE',
    icon: Gamepad2,
    desc: 'Tắt dịch vụ thừa ngầm, đặt CPU min 5%, kích hoạt GameMode và khóa xung nhịp cao nhất.',
    accent: '#22c55e',
    btnLabel: 'Kích hoạt Boost'
  },
  {
    key: 'dawa-cleaner',
    title: 'DAWA Deep Cache Cleaner',
    badge: 'SYSTEM CLEAN',
    icon: Sparkles,
    desc: 'Dọn sạch tệp đệm rác %TEMP%, Prefetch và giải phóng bộ đệm hệ thống tức thì.',
    accent: '#06b6d4',
    btnLabel: 'Dọn dẹp Cache'
  },
  {
    key: 'dawa-power-plan',
    title: 'Ultimate Power Plan',
    badge: 'CPU UNLOCK',
    icon: BatteryCharging,
    desc: 'Kích hoạt gói nguồn điện hiệu năng cao nhất, tắt monitor timeout và sleep mode.',
    accent: '#1677ff',
    btnLabel: 'Áp dụng Nguồn Điện'
  }
])

const TWEAK_SWITCHES = Object.freeze([
  {
    id: 'hibernate',
    label: 'Tắt Hibernate',
    hint: 'Xóa hiberfil.sys, giải phóng 8GB - 32GB RAM & ổ cứng SSD',
    icon: Snowflake,
    accent: '#1677ff',
    onAction: 'win-disable-hibernate',
    offAction: 'win-enable-hibernate'
  },
  {
    id: 'fso-gamebar',
    label: 'Tắt Game Bar & FSO',
    hint: 'Triệt tiêu giật lag (stuttering) do Xbox Game DVR overlay ngầm',
    icon: Gamepad2,
    accent: '#22c55e',
    onAction: 'win-disable-fso-gamebar',
    offAction: 'win-enable-fso-gamebar'
  },
  {
    id: 'telemetry',
    label: 'Tắt Windows Telemetry',
    hint: 'Ngừng thu thập và gửi dữ liệu chẩn đoán ngầm về máy chủ Microsoft',
    icon: ShieldOff,
    accent: '#f59e0b',
    onAction: 'win-disable-telemetry',
    offAction: 'win-enable-telemetry'
  },
  {
    id: 'superfetch',
    label: 'Tắt Superfetch (SysMain)',
    hint: 'Khắc phục lỗi Full Disk 100%, giảm tải I/O và nghẽn bộ nhớ đệm',
    icon: Zap,
    accent: '#a855f7',
    onAction: 'win-disable-superfetch',
    offAction: 'win-enable-superfetch'
  },
  {
    id: 'transparency',
    label: 'Tắt Transparency Effects',
    hint: 'Tắt hiệu ứng trong suốt Mica/Acrylic, giải phóng GPU VRAM',
    icon: EyeOff,
    accent: '#ec4899',
    onAction: 'win-disable-transparency',
    offAction: 'win-enable-transparency'
  },
  {
    id: 'background-apps',
    label: 'Tắt Background Apps',
    hint: 'Ngăn ứng dụng UWP chạy ngầm tiêu tốn chu kỳ CPU và pin máy',
    icon: Sparkles,
    accent: '#06b6d4',
    onAction: 'win-disable-background-apps',
    offAction: 'win-enable-background-apps'
  },
  {
    id: 'defender',
    label: 'Windows Defender',
    hint: 'Quản lý trực tiếp trong Windows Security để đảm bảo an toàn tệp',
    icon: Shield,
    accent: '#ef4444',
    unavailable: true
  }
])

const switchStates = reactive(Object.fromEntries(TWEAK_SWITCHES.map((s) => [s.id, false])))

const runDawaScript = async (scriptKey, description, options = {}) => {
  if (isRunning.value) return
  isRunning.value = true
  const time = new Date().toLocaleTimeString()
  logOutput.value += `[${time}] [DAWA OPTIMIZE] Đang thực thi [${scriptKey}] - ${description}...\n`
  try {
    const res = await window.api.runDawaScript(scriptKey, options)
    if (res?.success) {
      logOutput.value += `✅ ${res.message}\n`
      if (res.stepResults) {
        res.stepResults.forEach((step, i) => {
          logOutput.value += `  [Bước ${i + 1}] ${step.file} ${step.args || ''}\n`
          if (step.stdout) logOutput.value += `      > ${step.stdout.trim()}\n`
          if (step.stderr) logOutput.value += `      ! ${step.stderr.trim()}\n`
        })
      }
    } else {
      logOutput.value += `❌ ${res?.message || 'Thực thi thất bại'}\n`
    }
  } catch (err) {
    logOutput.value += `❌ Lỗi: ${err.message || err}\n`
  } finally {
    isRunning.value = false
  }
}

const toggleWinSwitch = async (tweak) => {
  if (tweak.unavailable || isRunning.value) return
  const next = !switchStates[tweak.id]
  const action = next ? tweak.onAction : tweak.offAction
  const verb = next ? 'Bật' : 'Tắt'
  const time = new Date().toLocaleTimeString()
  logOutput.value += `[${time}] [WINDOWS TWEAK] ${verb} [${tweak.label}]...\n`
  isRunning.value = true
  try {
    const res = await window.api.runDawaScript(action)
    if (res?.success) {
      switchStates[tweak.id] = next
      logOutput.value += `✅ ${verb} [${tweak.label}] thành công.\n`
    } else {
      logOutput.value += `❌ ${res?.message || 'Không thể thực thi'}\n`
    }
  } catch (err) {
    logOutput.value += `❌ Lỗi: ${err.message || err}\n`
  } finally {
    isRunning.value = false
  }
}

const applyWin32Priority = (val) => {
  if (val) selectedWin32Priority.value = val
  const opt = WIN32_PRIORITY_OPTIONS.find((o) => o.value === selectedWin32Priority.value)
  runDawaScript('win32-priority', `Win32Priority: ${opt?.label || selectedWin32Priority.value}`, {
    profile: selectedWin32Priority.value
  })
}

const applyPowerPlan = (val) => {
  if (val) selectedPowerPlan.value = val
  const opt = POWER_PLAN_OPTIONS.find((o) => o.value === selectedPowerPlan.value)
  runDawaScript('power-plan', opt?.label || selectedPowerPlan.value, {
    profile: selectedPowerPlan.value
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
  <div class="opt-page">
    <!-- Telemetry Header Banner -->
    <header class="opt-header-card">
      <div class="opt-header-main">
        <div class="opt-badge-pill">
          <Flame :size="13" class="text-amber-400" />
          <span>DAWA ENGINE · PRO TUNING</span>
        </div>
        <h1 class="opt-main-title">Tối Ưu Hệ Thống Toàn Diện</h1>
        <p class="opt-main-desc">
          Triệt tiêu tiến trình chạy ngầm vô ích, mở khóa giới hạn xung nhịp CPU và cân bằng chu kỳ
          phân bổ tài nguyên.
        </p>
      </div>
      <div class="opt-telemetry-row">
        <div class="opt-tele-chip">
          <Activity :size="12" class="text-emerald-400" />
          <span>SYSMAIN: <strong>OPTIMIZED</strong></span>
        </div>
        <div class="opt-tele-chip">
          <Cpu :size="12" class="text-blue-400" />
          <span>QUANTUM: <strong>26 HEX BIAS</strong></span>
        </div>
        <div class="opt-tele-chip">
          <BatteryCharging :size="12" class="text-cyan-400" />
          <span>POWER: <strong>UNTHROTTLED</strong></span>
        </div>
      </div>
    </header>

    <!-- SECTION 1: CORE ACTIONS -->
    <section class="opt-card">
      <div class="opt-card-head">
        <div class="opt-section-tag" style="--c: #22c55e">
          <Sparkles :size="13" />
          <span>CORE ACCELERATION</span>
        </div>
        <h2 class="opt-card-title">Bộ 3 Công Cụ Tối Ưu Cốt Lõi</h2>
        <p class="opt-card-sub">Kích hoạt nhanh các thiết lập gaming hiệu năng cao chuẩn eSports</p>
      </div>

      <div class="opt-core-grid">
        <div
          v-for="card in DAWA_ACTIONS"
          :key="card.key"
          class="opt-core-item"
          :style="{ '--c': card.accent }"
        >
          <div class="opt-core-top">
            <div class="opt-icon-box">
              <component :is="card.icon" :size="22" stroke-width="2.2" />
            </div>
            <span class="opt-pill-badge">{{ card.badge }}</span>
          </div>

          <div class="opt-core-content">
            <h3 class="opt-core-title">{{ card.title }}</h3>
            <p class="opt-core-desc">{{ card.desc }}</p>
          </div>

          <button
            type="button"
            class="opt-action-btn"
            :disabled="isRunning"
            @click="runDawaScript(card.key, card.title)"
          >
            <Play :size="14" class="fill-current" />
            <span>{{ card.btnLabel }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- SECTION 2: WINDOWS TOGGLES -->
    <section class="opt-card">
      <div class="opt-card-head">
        <div class="opt-section-tag" style="--c: #3b82f6">
          <Zap :size="13" />
          <span>WINDOWS OPTIMIZATION</span>
        </div>
        <div class="opt-title-with-count">
          <h2 class="opt-card-title">Tinh Chỉnh Tính Năng Windows</h2>
          <span class="opt-count-pill">{{ TWEAK_SWITCHES.length }} Toggles</span>
        </div>
        <p class="opt-card-sub">
          Bật/Tắt các dịch vụ ngầm ngốn RAM, giảm tải I/O đĩa và chống hiện tượng giật khung hình
        </p>
      </div>

      <div class="opt-switch-grid">
        <div
          v-for="tw in TWEAK_SWITCHES"
          :key="tw.id"
          class="opt-switch-card"
          :class="{
            active: switchStates[tw.id],
            disabled: tw.unavailable
          }"
          :style="{ '--c': tw.accent }"
        >
          <div class="opt-switch-head">
            <div class="opt-switch-icon-wrap">
              <component :is="tw.icon" :size="18" />
            </div>
            <div class="opt-switch-status">
              <span v-if="tw.unavailable" class="opt-badge-lock">Protected</span>
              <span v-else-if="switchStates[tw.id]" class="opt-badge-active">Đã tối ưu</span>
              <span v-else class="opt-badge-idle">Mặc định</span>
            </div>
          </div>

          <div class="opt-switch-body">
            <strong class="opt-switch-title">{{ tw.label }}</strong>
            <p class="opt-switch-hint">{{ tw.hint }}</p>
          </div>

          <div class="opt-switch-action">
            <span v-if="tw.unavailable" class="opt-unavail-note">Windows Security</span>
            <button
              v-else
              type="button"
              class="cyber-switch"
              :class="{ on: switchStates[tw.id] }"
              :disabled="isRunning"
              :aria-label="tw.label"
              @click="toggleWinSwitch(tw)"
            >
              <span class="cyber-switch-thumb" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: SCHEDULER & POWER PLAN (2 COLUMNS) -->
    <div class="opt-dual-grid">
      <!-- Win32 Priority -->
      <section class="opt-card">
        <div class="opt-card-head">
          <div class="opt-section-tag" style="--c: #a855f7">
            <SlidersHorizontal :size="13" />
            <span>CPU SCHEDULER</span>
          </div>
          <h2 class="opt-card-title">Win32PrioritySeparation</h2>
          <p class="opt-card-sub">
            Điều chỉnh lượng tử thời gian CPU ưu tiên cho ứng dụng Game Foreground
          </p>
        </div>

        <div class="opt-preset-chips">
          <button
            type="button"
            class="opt-preset-btn"
            :class="{ active: selectedWin32Priority === '26' }"
            @click="applyWin32Priority('26')"
          >
            <span class="opt-preset-code">26 Hex</span>
            <span class="opt-preset-tag">Khuyến nghị eSports</span>
          </button>
          <button
            type="button"
            class="opt-preset-btn"
            :class="{ active: selectedWin32Priority === '28' }"
            @click="applyWin32Priority('28')"
          >
            <span class="opt-preset-code">28 Hex</span>
            <span class="opt-preset-tag">Low Input Lag</span>
          </button>
          <button
            type="button"
            class="opt-preset-btn"
            :class="{ active: selectedWin32Priority === 'default' }"
            @click="applyWin32Priority('default')"
          >
            <span class="opt-preset-code">Default (02)</span>
            <span class="opt-preset-tag">Mặc định</span>
          </button>
        </div>

        <div class="opt-select-group">
          <label class="opt-field-label" for="win32-select"
            >Tùy chọn chi tiết Registry Profile</label
          >
          <div class="opt-select-row">
            <select
              id="win32-select"
              v-model="selectedWin32Priority"
              class="opt-select-control"
              :disabled="isRunning"
            >
              <option
                v-for="option in WIN32_PRIORITY_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <button
              type="button"
              class="opt-apply-btn"
              style="--c: #a855f7"
              :disabled="isRunning"
              @click="applyWin32Priority()"
            >
              <Play :size="13" class="fill-current" />
              <span>Áp dụng</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Power Plan -->
      <section class="opt-card">
        <div class="opt-card-head">
          <div class="opt-section-tag" style="--c: #00c2ff">
            <BatteryCharging :size="13" />
            <span>POWER MANAGEMENT</span>
          </div>
          <h2 class="opt-card-title">Gói Nguồn Điện (Power Plan)</h2>
          <p class="opt-card-sub">
            Mở khóa xung nhịp tối đa, tắt Core Parking và ngăn CPU rơi vào chế độ tiết kiệm điện
          </p>
        </div>

        <div class="opt-power-list">
          <div
            v-for="plan in POWER_PLAN_OPTIONS.slice(0, 3)"
            :key="plan.value"
            class="opt-power-item"
            :class="{ active: selectedPowerPlan === plan.value }"
            @click="selectedPowerPlan = plan.value"
          >
            <div class="opt-power-radio">
              <span class="opt-power-dot" />
            </div>
            <div class="opt-power-info">
              <strong>{{ plan.label }}</strong>
              <small>{{ plan.desc }}</small>
            </div>
          </div>
        </div>

        <div class="opt-select-group">
          <label class="opt-field-label" for="power-select">Chọn Power Plan khác</label>
          <div class="opt-select-row">
            <select
              id="power-select"
              v-model="selectedPowerPlan"
              class="opt-select-control"
              :disabled="isRunning"
            >
              <option
                v-for="option in POWER_PLAN_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <button
              type="button"
              class="opt-apply-btn"
              style="--c: #00c2ff"
              :disabled="isRunning"
              @click="applyPowerPlan()"
            >
              <Play :size="13" class="fill-current" />
              <span>Kích hoạt</span>
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- SECTION 4: CONSOLE TERMINAL -->
    <section class="opt-console-card">
      <div class="opt-console-header">
        <div class="opt-console-title">
          <Terminal :size="14" class="text-cyan-400" />
          <span>OPTIMIZER EXECUTION CONSOLE</span>
          <div class="opt-live-indicator" :class="{ running: isRunning }">
            <span class="opt-live-dot" />
            <span>{{ isRunning ? 'ĐANG THỰC THI...' : 'SẴN SÀNG' }}</span>
          </div>
        </div>
        <div class="opt-console-actions">
          <button
            type="button"
            class="opt-tool-btn"
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
            class="opt-tool-btn"
            title="Xóa console"
            :disabled="!logOutput"
            @click="clearLog"
          >
            <Trash2 :size="13" />
            <span>Xóa log</span>
          </button>
        </div>
      </div>
      <pre class="opt-terminal-view">{{
        logOutput ||
        'Hệ thống đã sẵn sàng. Hãy chọn công cụ hoặc bật các tính năng tối ưu ở trên...'
      }}</pre>
    </section>
  </div>
</template>

<style scoped>
.opt-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 24px;
  max-width: 1560px;
  margin: 0 auto;
}

/* Header Banner */
.opt-header-card {
  position: relative;
  overflow: hidden;
  padding: 22px 26px;
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    rgba(22, 119, 255, 0.12) 0%,
    rgba(14, 20, 36, 0.85) 50%,
    rgba(6, 182, 212, 0.08) 100%
  );
  border: 1px solid rgba(22, 119, 255, 0.25);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.opt-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
  font: 700 10.5px/1 var(--font-mono);
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.opt-main-title {
  font:
    800 24px/1.15 'Archivo',
    sans-serif;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}

.opt-main-desc {
  font-size: 13px;
  color: rgba(226, 232, 240, 0.72);
  max-width: 720px;
  line-height: 1.5;
  margin: 0;
}

.opt-telemetry-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.opt-tele-chip {
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

.opt-tele-chip strong {
  color: #f8fafc;
  font-weight: 700;
}

/* Base Card */
.opt-card {
  position: relative;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.78) 0%, rgba(10, 15, 29, 0.72) 100%);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 18px;
  padding: 22px;
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
}

.opt-card-head {
  margin-bottom: 18px;
}

.opt-section-tag {
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

.opt-card-title {
  font:
    700 18px/1.2 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0;
}

.opt-title-with-count {
  display: flex;
  align-items: center;
  gap: 10px;
}

.opt-count-pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font: 600 10.5px var(--font-mono);
  color: #94a3b8;
}

.opt-card-sub {
  font-size: 12.5px;
  color: #94a3b8;
  margin: 4px 0 0;
  line-height: 1.45;
}

/* Core Actions Grid */
.opt-core-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.opt-core-item {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.07);
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.opt-core-item:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--c) 50%, transparent);
  background: color-mix(in srgb, var(--c) 5%, rgba(15, 23, 42, 0.6));
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.4),
    0 0 24px color-mix(in srgb, var(--c) 15%, transparent);
}

.opt-core-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.opt-icon-box {
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

.opt-pill-badge {
  font: 700 9.5px var(--font-mono);
  padding: 3px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  letter-spacing: 0.06em;
}

.opt-core-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.opt-core-title {
  font:
    700 15px 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0;
}

.opt-core-desc {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.opt-action-btn {
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

.opt-action-btn:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
}

.opt-action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.opt-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Switches Grid */
.opt-switch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.opt-switch-card {
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

.opt-switch-card:hover {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
}

.opt-switch-card.active {
  border-color: color-mix(in srgb, var(--c) 40%, transparent);
  background: color-mix(in srgb, var(--c) 6%, transparent);
}

.opt-switch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.opt-switch-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--c) 14%, transparent);
  color: var(--c);
}

.opt-badge-active {
  font: 600 10px var(--font-mono);
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.opt-badge-idle {
  font: 500 10px var(--font-mono);
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.opt-badge-lock {
  font: 500 10px var(--font-mono);
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.opt-switch-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.opt-switch-title {
  font:
    600 13.5px 'Archivo',
    sans-serif;
  color: #f1f5f9;
}

.opt-switch-hint {
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.45;
  margin: 0;
}

.opt-switch-action {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: 4px;
}

.opt-unavail-note {
  font-size: 11px;
  color: #ef4444;
  font-family: var(--font-mono);
}

/* Modern Cyber Switch */
.cyber-switch {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 2px;
}

.cyber-switch-thumb {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.cyber-switch.on {
  background: var(--c, #22c55e);
  border-color: var(--c, #22c55e);
  box-shadow: 0 0 12px color-mix(in srgb, var(--c) 45%, transparent);
}

.cyber-switch.on .cyber-switch-thumb {
  transform: translateX(20px);
  background: #ffffff;
}

/* Dual Column Layout */
.opt-dual-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.opt-preset-chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.opt-preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
}

.opt-preset-btn:hover {
  border-color: rgba(168, 85, 247, 0.35);
  background: rgba(168, 85, 247, 0.06);
}

.opt-preset-btn.active {
  background: rgba(168, 85, 247, 0.15);
  border-color: #a855f7;
  box-shadow: 0 0 16px rgba(168, 85, 247, 0.2);
}

.opt-preset-code {
  font: 700 13px var(--font-mono);
  color: #ffffff;
}

.opt-preset-tag {
  font-size: 10px;
  color: #94a3b8;
}

.opt-select-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.opt-field-label {
  font: 600 11px var(--font-mono);
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.opt-select-row {
  display: flex;
  gap: 10px;
}

.opt-select-control {
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

.opt-select-control:focus {
  border-color: #3b82f6;
}

.opt-apply-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--c) 50%, transparent);
  background: color-mix(in srgb, var(--c) 20%, transparent);
  color: #ffffff;
  font: 700 12px var(--font-sans);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.opt-apply-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--c) 35%, transparent);
}

.opt-apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Power Plan List */
.opt-power-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.opt-power-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;
}

.opt-power-item:hover {
  background: rgba(0, 194, 255, 0.05);
  border-color: rgba(0, 194, 255, 0.3);
}

.opt-power-item.active {
  background: rgba(0, 194, 255, 0.1);
  border-color: #00c2ff;
}

.opt-power-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.opt-power-item.active .opt-power-radio {
  border-color: #00c2ff;
}

.opt-power-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  transition: all 0.2s ease;
}

.opt-power-item.active .opt-power-dot {
  background: #00c2ff;
}

.opt-power-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.opt-power-info strong {
  font-size: 13px;
  color: #ffffff;
}

.opt-power-info small {
  font-size: 11.5px;
  color: #94a3b8;
}

/* Console Section */
.opt-console-card {
  border-radius: 14px;
  background: #040711;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.5);
}

.opt-console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.025);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.opt-console-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 700 11px var(--font-mono);
  color: #cbd5e1;
  letter-spacing: 0.06em;
}

.opt-live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.1);
  font-size: 9.5px;
  color: #94a3b8;
}

.opt-live-indicator.running {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
}

.opt-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.opt-live-indicator.running .opt-live-dot {
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

.opt-console-actions {
  display: flex;
  gap: 8px;
}

.opt-tool-btn {
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

.opt-tool-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.opt-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.opt-terminal-view {
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

@media (max-width: 1024px) {
  .opt-core-grid {
    grid-template-columns: 1fr;
  }
  .opt-dual-grid {
    grid-template-columns: 1fr;
  }
}
</style>
