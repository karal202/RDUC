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
  Sparkle,
  Shield
} from 'lucide-vue-next'

const logOutput = ref('')
const isRunning = ref(false)

const DAWA_ACTIONS = Object.freeze([
  {
    key: 'dawa-gaming-boost',
    title: 'DAWA Ultimate Gaming Boost',
    icon: Gamepad2,
    desc: 'Tắt dịch vụ thừa, giải phóng CPU & RAM cho Game.',
    accent: '#22c55e',
    btnLabel: 'Chạy DAWA Boost'
  },
  {
    key: 'dawa-cleaner',
    title: 'DAWA Deep Cache Cleaner',
    icon: Sparkles,
    desc: 'Xóa file rác Temp, Prefetch, Windows Update cache.',
    accent: '#06b6d4',
    btnLabel: 'Dọn dẹp Cache'
  },
  {
    key: 'dawa-power-plan',
    title: 'Ultimate Power Plan',
    icon: BatteryCharging,
    desc: 'Kích hoạt chế độ nguồn điện hiệu năng cao nhất.',
    accent: '#1677ff',
    btnLabel: 'Kích hoạt Power Plan'
  }
])

const TWEAK_SWITCHES = Object.freeze([
  {
    id: 'hibernate',
    label: 'Tắt Hibernate (Tiết kiệm RAM)',
    hint: 'Disable Hibernation → giải phóng file hiberfil.sys',
    icon: Snowflake,
    accent: '#1677ff',
    onAction: 'win-disable-hibernate',
    offAction: 'win-enable-hibernate'
  },
  {
    id: 'fso-gamebar',
    label: 'Tắt Game Bar & Fullscreen Optimizations',
    hint: 'Tắt Game DVR / Game Bar chống stuttering game',
    icon: Gamepad2,
    accent: '#22c55e',
    onAction: 'win-disable-fso-gamebar',
    offAction: 'win-enable-fso-gamebar'
  },
  {
    id: 'telemetry',
    label: 'Tắt Windows Telemetry',
    hint: 'Ngừng gửi dữ liệu sử dụng và dữ liệu chẩn đoán về Microsoft',
    icon: ShieldOff,
    accent: '#f59e0b',
    onAction: 'win-disable-telemetry',
    offAction: 'win-enable-telemetry'
  },
  {
    id: 'superfetch',
    label: 'Tắt Superfetch (SysMain)',
    hint: 'Tắt dịch vụ quản lý RAM động cho game thủ, giảm disk usage 100%',
    icon: Zap,
    accent: '#a855f7',
    onAction: 'win-disable-superfetch',
    offAction: 'win-enable-superfetch'
  },
  {
    id: 'transparency',
    label: 'Tắt Transparency Effects',
    hint: 'Tắt hiệu ứng acrylic/mica trong suốt → giải phóng GPU load',
    icon: EyeOff,
    accent: '#ec4899',
    onAction: 'win-disable-transparency',
    offAction: 'win-enable-transparency'
  },
  {
    id: 'defender',
    label: 'Tắt Windows Defender (Thử nghiệm)',
    hint: 'Quản lý trực tiếp trong Windows Security để tránh vô hiệu hóa bảo vệ ngoài ý muốn.',
    icon: Shield,
    accent: '#ef4444',
    unavailable: true
  }
])

const switchStates = reactive(Object.fromEntries(TWEAK_SWITCHES.map((s) => [s.id, false])))

const runDawaScript = async (scriptKey, description) => {
  isRunning.value = true
  logOutput.value = `[DAWA] Đang thực thi [${scriptKey}] - ${description}...\n`
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
    }
  } catch (err) {
    logOutput.value += `❌ Error: ${err.message}\n`
  } finally {
    isRunning.value = false
  }
}

const toggleWinSwitch = async (tweak) => {
  if (tweak.unavailable || isRunning.value) return
  const next = !switchStates[tweak.id]
  const action = next ? tweak.onAction : tweak.offAction
  const verb = next ? 'Bật' : 'Tắt'
  logOutput.value += `[WINDOWS TWEAK] ${verb} [${tweak.label}] → gọi action [${action}]...\n`
  isRunning.value = true
  try {
    const res = await window.api.executeCmdScript({ action })
    if (res?.success) {
      switchStates[tweak.id] = next
      logOutput.value += `✅ ${verb} [${tweak.label}] thành công.\n`
    } else {
      logOutput.value += `❌ Action [${action}] chưa được allowlist hoặc thất bại. ${res?.message || ''}\n`
    }
  } catch (err) {
    logOutput.value += `❌ Lỗi gọi action [${action}]: ${err.message}. (Bạn cần thêm allowlist trong executeCmdScript handler.)\n`
  } finally {
    isRunning.value = false
  }
}
</script>

<template>
  <div class="pg-wrap">
    <section class="pg-card pg-tile">
      <header class="pg-card-head">
        <div class="pg-section-meta"><Sparkles :size="13" /><span>EXECUTE CORE</span></div>
        <h2 class="pg-title">Công cụ DAWA <span class="pg-count">· 3</span></h2>
      </header>
      <div class="pg-grid-3">
        <div v-for="card in DAWA_ACTIONS" :key="card.key" class="pg-card-item pg-act-card">
          <div class="pg-card-inner">
            <div class="pg-icon-wrap" :style="{ '--c': card.accent }">
              <component :is="card.icon" :size="20" class="pg-icon-core" />
            </div>
            <div class="pg-card-body">
              <div class="pg-card-title">{{ card.title }}</div>
              <p class="pg-card-desc">{{ card.desc }}</p>
            </div>
          </div>
          <button
            class="pg-action-btn"
            :style="{ '--c': card.accent }"
            :disabled="isRunning"
            @click="runDawaScript(card.key, card.title)"
          >
            <Play :size="14" class="pg-play" />
            <span>{{ card.btnLabel }}</span>
          </button>
        </div>
      </div>
    </section>

    <section class="pg-card pg-tile">
      <header class="pg-card-head">
        <h2 class="pg-title">Tinh chỉnh Windows <span class="pg-count">· 6 toggles</span></h2>
        <p class="pg-subtitle">
          Mỗi mục là một cặp Enable/Disable từ thư mục Optimizer → Switch ON/OFF.
        </p>
      </header>
      <div class="pg-switch-list">
        <div v-for="tw in TWEAK_SWITCHES" :key="tw.id" class="pg-switch-row">
          <div class="pg-switch-card-head">
            <span class="pg-switch-tag" :style="{ '--c': tw.accent }">WINDOWS TWEAK</span>
          </div>
          <div class="pg-switch-body">
            <div class="pg-switch-label">{{ tw.label }}</div>
            <div class="pg-switch-hint">{{ tw.hint }}</div>
          </div>
          <div class="pg-switch-footer">
            <span v-if="tw.unavailable" class="pg-unavailable">Windows Security</span>
            <span v-else class="pg-switch-state">{{
              switchStates[tw.id] ? 'Đã bật' : 'Kích hoạt'
            }}</span>
            <button
              v-if="!tw.unavailable"
              type="button"
              class="pg-switch"
              :class="{ on: switchStates[tw.id] }"
              :aria-label="tw.label"
              :aria-pressed="switchStates[tw.id]"
              :disabled="isRunning"
              @click="toggleWinSwitch(tw)"
            >
              <span class="pg-switch-track" />
              <span class="pg-switch-thumb" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="pg-card pg-console">
      <div class="pg-console-head">
        <Sparkle :size="14" />
        <span>CONSOLE LOG OUTPUT</span>
      </div>
      <pre class="pg-console-log">{{
        logOutput || 'Sẵn sàng chờ thực thi script DAWA đã được ký và tweaks Windows toggle...'
      }}</pre>
    </section>
  </div>
</template>

<style scoped>
.pg-wrap {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 22px 28px;
  max-width: 1560px;
  margin: 0 auto;
}

.pg-tile {
  position: relative;
  overflow: hidden;
}
.pg-tile::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(
    420px circle at var(--spot-x, 100%) var(--spot-y, 0%),
    rgba(22, 119, 255, 0.14),
    transparent 60%
  );
  opacity: 0.9;
}
.pg-card {
  position: relative;
  background: linear-gradient(180deg, rgba(14, 20, 36, 0.82), rgba(9, 14, 26, 0.68));
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 20px;
  padding: 22px;
  backdrop-filter: blur(26px) saturate(150%);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
  box-shadow:
    0 18px 60px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
.pg-card-head {
  position: relative;
  z-index: 1;
  margin-bottom: 18px;
}
.pg-section-meta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(22, 119, 255, 0.1);
  color: #60a5fa;
  font:
    600 11px/1 'JetBrains Mono',
    ui-monospace,
    monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 10px;
  border: 1px solid rgba(22, 119, 255, 0.2);
}
.pg-title {
  margin: 0;
  font:
    800 22px/1.1 'Archivo',
    sans-serif;
  letter-spacing: -0.01em;
  color: #fff;
}
.pg-count {
  color: rgba(148, 163, 184, 0.62);
  font-weight: 600;
  margin-left: 6px;
}
.pg-subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(148, 163, 184, 0.78);
  line-height: 1.55;
}

.pg-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  position: relative;
  z-index: 1;
}
.pg-card-item {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  transition:
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.35s;
}
.pg-card-item:hover {
  transform: translateY(-3px);
  border-color: rgba(148, 163, 184, 0.22);
}
.pg-card-inner {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.pg-icon-wrap {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--c) 18%, transparent);
  color: var(--c);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 8px 28px color-mix(in srgb, var(--c) 22%, transparent);
}
.pg-icon-core {
  stroke-width: 1.9;
}
.pg-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pg-card-title {
  font-weight: 700;
  color: #fff;
  font-size: 15px;
}
.pg-card-desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: rgba(148, 163, 184, 0.78);
}

.pg-action-btn {
  --c: #1677ff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10.5px 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--c) 36%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--c) 94%, #000 0%),
    color-mix(in srgb, var(--c) 70%, #000 30%)
  );
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.28s ease;
  box-shadow:
    0 10px 28px color-mix(in srgb, var(--c) 30%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.pg-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.06);
}
.pg-action-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.985);
}
.pg-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.pg-play {
  stroke-width: 2.2;
}

.pg-switch-list {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.pg-switch-row {
  display: flex;
  min-height: 170px;
  padding: 18px;
  flex-direction: column;
  border: 1px solid rgba(148, 163, 184, 0.11);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.025);
  transition:
    background 0.25s ease,
    border-color 0.25s ease,
    transform 0.25s ease;
}
.pg-switch-row:hover {
  background: rgba(148, 163, 184, 0.06);
  border-color: rgba(96, 165, 250, 0.3);
  transform: translateY(-2px);
}
.pg-switch-card-head {
  min-height: 22px;
}
.pg-switch-tag {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--c) 18%, #0f172a);
  border: 1px solid color-mix(in srgb, var(--c) 36%, transparent);
  color: color-mix(in srgb, var(--c) 78%, white);
  font: 700 10px/1 var(--font-mono, ui-monospace, monospace);
  letter-spacing: 0.06em;
}
.pg-switch-body {
  min-width: 0;
  flex: 1;
  padding-top: 8px;
}
.pg-switch-label {
  font-weight: 700;
  font-size: 14px;
  color: #fff;
}
.pg-switch-hint {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.7);
  margin-top: 2px;
  line-height: 1.5;
}
.pg-switch-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 13px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}
.pg-switch-state {
  color: rgba(203, 213, 225, 0.72);
  font-size: 12px;
  font-weight: 650;
}

.pg-switch {
  position: relative;
  width: 52px;
  height: 30px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}
.pg-switch-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.18);
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.pg-switch-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(180deg, #cbd5e1, #94a3b8);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.pg-switch.on .pg-switch-track {
  background: linear-gradient(135deg, #1677ff 0%, #7c3aed 100%);
  border-color: rgba(124, 58, 237, 0.55);
  box-shadow:
    0 0 0 1px rgba(22, 119, 255, 0.2),
    0 8px 26px rgba(22, 119, 255, 0.35);
}
.pg-switch.on .pg-switch-thumb {
  left: 26px;
  background: linear-gradient(180deg, #fff, #e0e7ff);
}
.pg-switch:disabled {
  cursor: wait;
  opacity: 0.6;
}
.pg-unavailable {
  flex: 0 0 auto;
  padding: 6px 9px;
  border: 1px solid rgba(251, 113, 133, 0.25);
  border-radius: 999px;
  color: #fda4af;
  font-size: 11px;
  font-weight: 700;
}

.pg-console {
  padding: 18px;
}
.pg-console-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font:
    700 12px/1 'JetBrains Mono',
    monospace;
  color: #10b981;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}
.pg-console-log {
  margin: 0;
  padding: 14px 16px;
  min-height: 120px;
  max-height: 280px;
  overflow-y: auto;
  font:
    500 12.5px/1.65 'JetBrains Mono',
    ui-monospace,
    monospace;
  color: #6ee7b7;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  white-space: pre-wrap;
}

@media (max-width: 1100px) {
  .pg-wrap {
    padding: 18px 16px;
  }
  .pg-grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }
  .pg-switch-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .pg-grid-3 {
    grid-template-columns: 1fr;
  }
  .pg-switch-list {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pg-card-item,
  .pg-action-btn,
  .pg-switch-thumb,
  .pg-switch-track {
    transition: none !important;
  }
}
</style>
