<script setup>
import { ref } from 'vue'
import {
  MousePointer2,
  Keyboard,
  Play,
  Zap,
  Sliders,
  Terminal,
  Copy,
  Trash2,
  Check,
  Flame,
  Layers,
  Sparkles,
  Activity,
  Cpu,
  Loader2
} from 'lucide-vue-next'
import { useScriptRunner } from '../composables/useScriptRunner'

const { runScript, isActionRunning, state: runnerState } = useScriptRunner()

const logOutput = ref('')
const isRunning = ref(false)
const copied = ref(false)

const selectedMouseQueue = ref('mouse-queue-22')
const selectedKeyQueue = ref('keyboard-queue-22')
const selectedInputTweak = ref('input-low-latency')

const MOUSE_QUEUE_OPTIONS = [
  {
    value: 'mouse-queue-22',
    label: '22 Decimal',
    badge: 'Khuyến nghị Pro',
    desc: 'Chuẩn thi đấu, triệt tiêu buffer lag'
  },
  {
    value: 'mouse-queue-20',
    label: '20 Decimal',
    badge: 'Ultra Fast',
    desc: 'Giảm tối đa độ trễ hàng đợi'
  },
  {
    value: 'mouse-queue-25',
    label: '25 Decimal',
    badge: 'Cân bằng',
    desc: 'Độ ổn định cao cho chuột 4K/8K Hz'
  },
  {
    value: 'mouse-queue-10',
    label: '10 Decimal',
    badge: 'Tối thiểu',
    desc: 'Dành cho cấu hình CPU cực mạnh'
  },
  {
    value: 'mouse-queue-default',
    label: 'Default Windows',
    badge: 'Mặc định',
    desc: 'Khôi phục hàng đợi mặc định (100)'
  }
]

const KEY_QUEUE_OPTIONS = [
  {
    value: 'keyboard-queue-22',
    label: '22 Decimal',
    badge: 'Khuyến nghị Pro',
    desc: 'Nhận phím tức thì, combo mượt mà'
  },
  {
    value: 'keyboard-queue-20',
    label: '20 Decimal',
    badge: 'Ultra Fast',
    desc: 'Rút ngắn thời gian lưu đệm phím'
  },
  {
    value: 'keyboard-queue-25',
    label: '25 Decimal',
    badge: 'Cân bằng',
    desc: 'Độ ổn định cao cho phím cơ Rapid Trigger'
  },
  {
    value: 'keyboard-queue-15',
    label: '15 Decimal',
    badge: 'Rất nhanh',
    desc: 'Phù hợp tốc độ gõ phím thi đấu'
  },
  {
    value: 'keyboard-queue-10',
    label: '10 Decimal',
    badge: 'Tối thiểu',
    desc: 'Hàng đợi tối thiểu của nhân kernel'
  },
  {
    value: 'keyboard-queue-default',
    label: 'Default Windows',
    badge: 'Mặc định',
    desc: 'Khôi phục hàng đợi mặc định (100)'
  }
]

const INPUT_TWEAK_OPTIONS = [
  {
    value: 'input-low-latency',
    title: 'Low Latency Engine',
    badge: 'RECOMMENDED',
    icon: Zap,
    desc: 'Thiết lập độ trễ tối thiểu cho toàn bộ pipeline nhận tín hiệu I/O.',
    accent: '#f59e0b'
  },
  {
    value: 'input-desktop',
    title: 'Desktop DWM Input',
    badge: 'GRAPHICS',
    icon: Layers,
    desc: 'Tối ưu luồng tín hiệu tương tác giao diện Desktop Window Manager.',
    accent: '#3b82f6'
  },
  {
    value: 'input-cache',
    title: 'Input Cache Buffer',
    badge: 'MEMORY',
    icon: Cpu,
    desc: 'Làm sạch và tối ưu hóa bộ nhớ đệm luồng thông điệp bàn phím/chuột.',
    accent: '#06b6d4'
  },
  {
    value: 'input-avx',
    title: 'AVX Instruction Tuning',
    badge: 'CPU INTR',
    icon: Sparkles,
    desc: 'Tận dụng tập lệnh phần cứng để xử lý phép toán nội suy con trỏ nhanh hơn.',
    accent: '#8b5cf6'
  },
  {
    value: 'input-system',
    title: 'System Kernel Interrupts',
    badge: 'KERNEL',
    icon: Activity,
    desc: 'Ưu tiên ngắt phần cứng chuột & bàn phím lên mức Real-time/High.',
    accent: '#ec4899'
  },
  {
    value: 'input-scripts',
    title: 'Scripts Execution Policy',
    badge: 'SYSTEM',
    icon: Sliders,
    desc: 'Áp dụng các kịch bản tinh chỉnh độ trễ phần cứng tự động.',
    accent: '#10b981'
  },
  {
    value: 'input-misc',
    title: 'Misc Input Optimizers',
    badge: 'TWEAKS',
    icon: Flame,
    desc: 'Tổng hợp các tinh chỉnh bổ trợ chống drop tín hiệu USB polling.',
    accent: '#64748b'
  }
]

const run = async (scriptKey, description, options = {}) => {
  if (isRunning.value || runnerState.status === 'running') return
  isRunning.value = true
  const time = new Date().toLocaleTimeString()
  logOutput.value += `[${time}] [INPUT LAG] Đang thực thi [${scriptKey}] - ${description}...\n`
  try {
    const res = await runScript(scriptKey, description, options)
    if (res?.success) {
      logOutput.value += `✅ ${res.message}\n`
    } else {
      logOutput.value += `❌ ${res?.message || 'Thất bại'}\n`
    }
  } catch (err) {
    logOutput.value += `❌ Lỗi: ${err.message || err}\n`
  } finally {
    isRunning.value = false
  }
}

const runProfile = (key, label) => run('registry-profile', label, { profile: key })

const applyMouseQueue = (val) => {
  if (val) selectedMouseQueue.value = val
  const opt = MOUSE_QUEUE_OPTIONS.find((o) => o.value === selectedMouseQueue.value)
  runProfile(selectedMouseQueue.value, `Mouse Queue: ${opt?.label || selectedMouseQueue.value}`)
}

const applyKeyQueue = (val) => {
  if (val) selectedKeyQueue.value = val
  const opt = KEY_QUEUE_OPTIONS.find((o) => o.value === selectedKeyQueue.value)
  runProfile(selectedKeyQueue.value, `Keyboard Queue: ${opt?.label || selectedKeyQueue.value}`)
}

const applyInputTweak = (val) => {
  if (val) selectedInputTweak.value = val
  const opt = INPUT_TWEAK_OPTIONS.find((o) => o.value === selectedInputTweak.value)
  runProfile(selectedInputTweak.value, `Input Tweak: ${opt?.title || selectedInputTweak.value}`)
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
  <div class="input-page">
    <!-- Header Telemetry Banner -->
    <header class="input-header-card">
      <div class="input-header-main">
        <div class="input-badge-pill">
          <MousePointer2 :size="13" class="text-amber-400" />
          <span>ZERO-DELAY INPUT ENGINE</span>
        </div>
        <h1 class="input-main-title">Tối Ưu Chuột & Bàn Phím (Input Lag)</h1>
        <p class="input-main-desc">
          Triệt tiêu hàng đợi lưu đệm gói tin I/O, khóa gia tốc chuột và đẩy tốc độ phản hồi phím
          lên mức tối đa.
        </p>
      </div>
      <div class="input-telemetry-row">
        <div class="input-tele-chip">
          <Activity :size="12" class="text-amber-400" />
          <span>RAW INPUT: <strong>1:1 FIX</strong></span>
        </div>
        <div class="input-tele-chip">
          <Keyboard :size="12" class="text-blue-400" />
          <span>QUEUE OVERHEAD: <strong>MINIMAL</strong></span>
        </div>
        <div class="input-tele-chip">
          <Zap :size="12" class="text-emerald-400" />
          <span>DWM POLLING: <strong>DIRECT</strong></span>
        </div>
      </div>
    </header>

    <!-- SECTION 1: 1-CLICK GAMING PRESETS -->
    <section class="input-card">
      <div class="input-card-head">
        <div class="input-section-tag" style="--c: #f59e0b">
          <Zap :size="13" />
          <span>FAST GAMING PRESETS</span>
        </div>
        <h2 class="input-card-title">Bộ 3 Tinh Chỉnh Input Nhanh 1-Click</h2>
        <p class="input-card-sub">
          Áp dụng trực tiếp các thiết lập được game thủ chuyên nghiệp tin dùng
        </p>
      </div>

      <div class="input-preset-grid">
        <!-- Preset 1: Raw Input Mouse -->
        <div class="input-preset-card" style="--c: #a78bfa">
          <div class="input-preset-top">
            <div class="input-icon-box">
              <MousePointer2 :size="20" stroke-width="2.2" />
            </div>
            <span class="input-pill-badge">RAW INPUT</span>
          </div>
          <div class="input-preset-body">
            <h3 class="input-preset-title">Tắt Gia Tốc Chuột (Mouse Fix)</h3>
            <p class="input-preset-desc">
              Khóa hoàn toàn gia tốc chuột Windows (EPP=0), đảm bảo di chuột chuẩn xác từng pixel.
            </p>
          </div>
          <button
            type="button"
            class="input-action-btn"
            :disabled="isActionRunning('mouse-disable-acceleration') || isRunning"
            @click="run('mouse-disable-acceleration', 'Tắt gia tốc chuột gaming')"
          >
            <Loader2
              v-if="isActionRunning('mouse-disable-acceleration')"
              :size="13"
              class="spin fill-current"
            />
            <Play v-else :size="13" class="fill-current" />
            <span>{{
              isActionRunning('mouse-disable-acceleration')
                ? 'Đang xử lý...'
                : 'Kích hoạt Mouse Fix'
            }}</span>
          </button>
        </div>

        <!-- Preset 2: Keyboard Zero Delay -->
        <div class="input-preset-card" style="--c: #00c2ff">
          <div class="input-preset-top">
            <div class="input-icon-box">
              <Keyboard :size="20" stroke-width="2.2" />
            </div>
            <span class="input-pill-badge">ZERO BUFFER</span>
          </div>
          <div class="input-preset-body">
            <h3 class="input-preset-title">Low-Latency Graphics & Input</h3>
            <p class="input-preset-desc">
              Cắt giảm thời gian chờ đệm khung hình của DWM, hiển thị tức thì thao tác bàn phím.
            </p>
          </div>
          <button
            type="button"
            class="input-action-btn"
            :disabled="isActionRunning('keyboard-zero-delay') || isRunning"
            @click="run('keyboard-zero-delay', 'Low Latency Graphics & Phím')"
          >
            <Loader2
              v-if="isActionRunning('keyboard-zero-delay')"
              :size="13"
              class="spin fill-current"
            />
            <Play v-else :size="13" class="fill-current" />
            <span>{{
              isActionRunning('keyboard-zero-delay') ? 'Đang xử lý...' : 'Áp dụng Zero Delay'
            }}</span>
          </button>
        </div>

        <!-- Preset 3: Low Latency Engine -->
        <div class="input-preset-card" style="--c: #22c55e">
          <div class="input-preset-top">
            <div class="input-icon-box">
              <Zap :size="20" stroke-width="2.2" />
            </div>
            <span class="input-pill-badge">KERNEL LEVEL</span>
          </div>
          <div class="input-preset-body">
            <h3 class="input-preset-title">Gói Giảm Trễ Toàn Diện</h3>
            <p class="input-preset-desc">
              Đồng bộ độ trễ nhân Windows giữa thao tác nhấn phím và phản hồi màn hình hiển thị.
            </p>
          </div>
          <button
            type="button"
            class="input-action-btn"
            :disabled="isActionRunning('registry-profile') || isRunning"
            @click="runProfile('input-low-latency', 'Low Latency Tweak')"
          >
            <Loader2
              v-if="isActionRunning('registry-profile')"
              :size="13"
              class="spin fill-current"
            />
            <Play v-else :size="13" class="fill-current" />
            <span>{{
              isActionRunning('registry-profile') ? 'Đang xử lý...' : 'Áp dụng Low Latency'
            }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- SECTION 2: DATA QUEUE SIZE (DUAL CARDS) -->
    <div class="input-dual-grid">
      <!-- Mouse Queue Card -->
      <section class="input-card">
        <div class="input-card-head">
          <div class="input-section-tag" style="--c: #a78bfa">
            <MousePointer2 :size="13" />
            <span>MOUSE BUFFER</span>
          </div>
          <h2 class="input-card-title">Mouse Data Queue Size</h2>
          <p class="input-card-sub">
            Số lượng gói tin dữ liệu chuột được lưu đệm trong Kernel trước khi chuyển cho CPU xử lý
          </p>
        </div>

        <div class="input-queue-pills">
          <button
            v-for="opt in MOUSE_QUEUE_OPTIONS"
            :key="opt.value"
            type="button"
            class="input-queue-pill"
            :class="{ active: selectedMouseQueue === opt.value }"
            @click="selectedMouseQueue = opt.value"
          >
            <div class="input-queue-pill-header">
              <strong>{{ opt.label }}</strong>
              <span class="input-queue-badge">{{ opt.badge }}</span>
            </div>
            <small>{{ opt.desc }}</small>
          </button>
        </div>

        <div class="input-card-footer">
          <span class="input-queue-val"
            >Giá trị chọn: <strong>{{ selectedMouseQueue }}</strong></span
          >
          <button
            type="button"
            class="input-apply-btn"
            style="--c: #a78bfa"
            :disabled="isActionRunning('registry-profile') || isRunning"
            @click="applyMouseQueue()"
          >
            <Loader2
              v-if="isActionRunning('registry-profile')"
              :size="13"
              class="spin fill-current"
            />
            <Play v-else :size="13" class="fill-current" />
            <span>{{
              isActionRunning('registry-profile') ? 'Đang áp dụng...' : 'Áp dụng Mouse Queue'
            }}</span>
          </button>
        </div>
      </section>

      <!-- Keyboard Queue Card -->
      <section class="input-card">
        <div class="input-card-head">
          <div class="input-section-tag" style="--c: #60a5fa">
            <Keyboard :size="13" />
            <span>KEYBOARD BUFFER</span>
          </div>
          <h2 class="input-card-title">Keyboard Data Queue Size</h2>
          <p class="input-card-sub">
            Quy định kích thước bộ nhớ đệm phím bấm. Giá trị nhỏ hơn giúp phản hồi phím nhanh hơn
          </p>
        </div>

        <div class="input-queue-pills">
          <button
            v-for="opt in KEY_QUEUE_OPTIONS"
            :key="opt.value"
            type="button"
            class="input-queue-pill"
            :class="{ active: selectedKeyQueue === opt.value }"
            @click="selectedKeyQueue = opt.value"
          >
            <div class="input-queue-pill-header">
              <strong>{{ opt.label }}</strong>
              <span class="input-queue-badge">{{ opt.badge }}</span>
            </div>
            <small>{{ opt.desc }}</small>
          </button>
        </div>

        <div class="input-card-footer">
          <span class="input-queue-val"
            >Giá trị chọn: <strong>{{ selectedKeyQueue }}</strong></span
          >
          <button
            type="button"
            class="input-apply-btn"
            style="--c: #60a5fa"
            :disabled="isActionRunning('registry-profile') || isRunning"
            @click="applyKeyQueue()"
          >
            <Loader2
              v-if="isActionRunning('registry-profile')"
              :size="13"
              class="spin fill-current"
            />
            <Play v-else :size="13" class="fill-current" />
            <span>{{
              isActionRunning('registry-profile') ? 'Đang áp dụng...' : 'Áp dụng Key Queue'
            }}</span>
          </button>
        </div>
      </section>
    </div>

    <!-- SECTION 3: SUBSYSTEM TWEAKS GRID -->
    <section class="input-card">
      <div class="input-card-head">
        <div class="input-section-tag" style="--c: #ec4899">
          <Sliders :size="13" />
          <span>ADVANCED TWEAKS</span>
        </div>
        <div class="input-title-with-count">
          <h2 class="input-card-title">Bộ Tinh Chỉnh Input Chuyên Sâu</h2>
          <span class="input-count-pill">{{ INPUT_TWEAK_OPTIONS.length }} Hồ sơ</span>
        </div>
        <p class="input-card-sub">
          Các bản vá tinh chỉnh nhân và kiến trúc vi lệnh giảm độ trễ chuyên biệt
        </p>
      </div>

      <div class="input-tweaks-grid">
        <div
          v-for="tw in INPUT_TWEAK_OPTIONS"
          :key="tw.value"
          class="input-tweak-item"
          :style="{ '--c': tw.accent }"
        >
          <div class="input-tweak-head">
            <div class="input-tweak-icon">
              <component :is="tw.icon" :size="18" />
            </div>
            <span class="input-tweak-badge">{{ tw.badge }}</span>
          </div>

          <div class="input-tweak-content">
            <strong class="input-tweak-title">{{ tw.title }}</strong>
            <p class="input-tweak-desc">{{ tw.desc }}</p>
          </div>

          <button
            type="button"
            class="input-tweak-btn"
            :disabled="isActionRunning('registry-profile') || isRunning"
            @click="applyInputTweak(tw.value)"
          >
            <Loader2
              v-if="isActionRunning('registry-profile')"
              :size="12"
              class="spin fill-current"
            />
            <Play v-else :size="12" class="fill-current" />
            <span>{{ isActionRunning('registry-profile') ? 'Đang áp dụng...' : 'Áp dụng' }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- SECTION 4: CONSOLE TERMINAL -->
    <section class="input-console-card">
      <div class="input-console-header">
        <div class="input-console-title">
          <Terminal :size="14" class="text-amber-400" />
          <span>INPUT LAG EXECUTION CONSOLE</span>
          <div class="input-live-indicator" :class="{ running: isRunning }">
            <span class="input-live-dot" />
            <span>{{ isRunning ? 'ĐANG THỰC THI...' : 'SẴN SÀNG' }}</span>
          </div>
        </div>
        <div class="input-console-actions">
          <button
            type="button"
            class="input-tool-btn"
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
            class="input-tool-btn"
            title="Xóa console"
            :disabled="!logOutput"
            @click="clearLog"
          >
            <Trash2 :size="13" />
            <span>Xóa log</span>
          </button>
        </div>
      </div>
      <pre class="input-terminal-view">{{
        logOutput || 'Sẵn sàng chờ thực thi tinh chỉnh giảm độ trễ chuột và bàn phím...'
      }}</pre>
    </section>
  </div>
</template>

<style scoped>
.input-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 24px;
  max-width: 1560px;
  margin: 0 auto;
}

/* Header Banner */
.input-header-card {
  position: relative;
  overflow: hidden;
  padding: 22px 26px;
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    rgba(245, 158, 11, 0.12) 0%,
    rgba(14, 20, 36, 0.85) 50%,
    rgba(168, 85, 247, 0.08) 100%
  );
  border: 1px solid rgba(245, 158, 11, 0.25);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.input-badge-pill {
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

.input-main-title {
  font:
    800 24px/1.15 'Archivo',
    sans-serif;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}

.input-main-desc {
  font-size: 13px;
  color: rgba(226, 232, 240, 0.72);
  max-width: 720px;
  line-height: 1.5;
  margin: 0;
}

.input-telemetry-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.input-tele-chip {
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

.input-tele-chip strong {
  color: #f8fafc;
  font-weight: 700;
}

/* Base Card */
.input-card {
  position: relative;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.78) 0%, rgba(10, 15, 29, 0.72) 100%);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 18px;
  padding: 22px;
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
}

.input-card-head {
  margin-bottom: 18px;
}

.input-section-tag {
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

.input-card-title {
  font:
    700 18px/1.2 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0;
}

.input-title-with-count {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-count-pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font: 600 10.5px var(--font-mono);
  color: #94a3b8;
}

.input-card-sub {
  font-size: 12.5px;
  color: #94a3b8;
  margin: 4px 0 0;
  line-height: 1.45;
}

/* Preset Cards Grid */
.input-preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.input-preset-card {
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

.input-preset-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--c) 50%, transparent);
  background: color-mix(in srgb, var(--c) 5%, rgba(15, 23, 42, 0.6));
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.4),
    0 0 24px color-mix(in srgb, var(--c) 15%, transparent);
}

.input-preset-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.input-icon-box {
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

.input-pill-badge {
  font: 700 9.5px var(--font-mono);
  padding: 3px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  letter-spacing: 0.06em;
}

.input-preset-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-preset-title {
  font:
    700 15px 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0;
}

.input-preset-desc {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.input-action-btn {
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

.input-action-btn:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
}

.input-action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.input-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Dual Grid for Queues */
.input-dual-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.input-queue-pills {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.input-queue-pill {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.input-queue-pill:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
}

.input-queue-pill.active {
  background: rgba(96, 165, 250, 0.12);
  border-color: #60a5fa;
  box-shadow: 0 0 16px rgba(96, 165, 250, 0.2);
}

.input-queue-pill-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.input-queue-pill-header strong {
  font-size: 13.5px;
  color: #ffffff;
}

.input-queue-badge {
  font: 700 9.5px var(--font-mono);
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.input-queue-pill.active .input-queue-badge {
  background: #60a5fa;
  color: #050b14;
}

.input-queue-pill small {
  font-size: 11.5px;
  color: #94a3b8;
}

.input-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.input-queue-val {
  font-size: 12px;
  color: #94a3b8;
  font-family: var(--font-mono);
}

.input-queue-val strong {
  color: #ffffff;
}

.input-apply-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--c) 50%, transparent);
  background: color-mix(in srgb, var(--c) 25%, transparent);
  color: #ffffff;
  font: 700 12px var(--font-sans);
  cursor: pointer;
  transition: all 0.2s ease;
}

.input-apply-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--c) 40%, transparent);
  transform: translateY(-1px);
}

.input-apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tweaks Grid */
.input-tweaks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.input-tweak-item {
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

.input-tweak-item:hover {
  border-color: color-mix(in srgb, var(--c) 40%, transparent);
  background: rgba(255, 255, 255, 0.04);
}

.input-tweak-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.input-tweak-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--c) 14%, transparent);
  color: var(--c);
}

.input-tweak-badge {
  font: 700 9px var(--font-mono);
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}

.input-tweak-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-tweak-title {
  font:
    600 13.5px 'Archivo',
    sans-serif;
  color: #f1f5f9;
}

.input-tweak-desc {
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.45;
  margin: 0;
}

.input-tweak-btn {
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

.input-tweak-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--c) 25%, transparent);
}

.input-tweak-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Console Section */
.input-console-card {
  border-radius: 14px;
  background: #040711;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.5);
}

.input-console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.025);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.input-console-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 700 11px var(--font-mono);
  color: #cbd5e1;
  letter-spacing: 0.06em;
}

.input-live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.1);
  font-size: 9.5px;
  color: #94a3b8;
}

.input-live-indicator.running {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.input-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.input-live-indicator.running .input-live-dot {
  background: #f59e0b;
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

@keyframes rotate-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.spin {
  animation: rotate-spin 0.9s linear infinite;
}

.input-console-actions {
  display: flex;
  gap: 8px;
}

.input-tool-btn {
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

.input-tool-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.input-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.input-terminal-view {
  margin: 0;
  padding: 14px 16px;
  font: 500 12px/1.65 var(--font-mono);
  color: #fbbf24;
  background: #02040a;
  min-height: 100px;
  max-height: 220px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1024px) {
  .input-preset-grid {
    grid-template-columns: 1fr;
  }
  .input-dual-grid {
    grid-template-columns: 1fr;
  }
}
</style>
