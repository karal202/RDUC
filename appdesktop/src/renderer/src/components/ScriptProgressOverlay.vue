<script setup>
import { computed } from 'vue'
import { Loader2, CheckCircle2, XCircle, X, Activity, Zap } from 'lucide-vue-next'
import { useScriptRunner } from '../composables/useScriptRunner'

const { state, closeOverlay, isRunning } = useScriptRunner()

const statusMeta = computed(() => {
  switch (state.status) {
    case 'running':
      return {
        label: 'ĐANG XỬ LÝ',
        color: 'var(--accent, #06b6d4)',
        sub: 'Tiến trình đang được thực thi...'
      }
    case 'success':
      return {
        label: 'HOÀN TẤT',
        color: '#22c55e',
        sub: 'Tất cả các bước đã được áp dụng.'
      }
    case 'error':
      return {
        label: 'LỖI',
        color: '#ef4444',
        sub: 'Có lỗi xảy ra trong quá trình thực thi.'
      }
    default:
      return { label: 'SẴN SÀNG', color: '#94a3b8', sub: '' }
  }
})

const progressColor = computed(() => {
  if (state.status === 'error') return '#ef4444'
  if (state.status === 'success') return '#22c55e'
  return state.accent || '#06b6d4'
})
</script>

<template>
  <Transition name="sp-overlay">
    <div
      v-if="state.visible"
      class="sp-root"
      :style="{ '--accent': state.accent || '#06b6d4' }"
      @mousedown.self="closeOverlay"
    >
      <div class="sp-aurora" />
      <div class="sp-card">
        <div class="sp-card-inner">
          <header class="sp-header">
            <div class="sp-head-left">
              <div
                class="sp-icon-wrap"
                :style="{ color: statusMeta.color, borderColor: statusMeta.color + '55' }"
              >
                <Loader2 v-if="state.status === 'running'" :size="20" class="spin" />
                <CheckCircle2 v-else-if="state.status === 'success'" :size="20" />
                <XCircle v-else :size="20" />
              </div>
              <div class="sp-titles">
                <h3 class="sp-title">{{ state.title }}</h3>
                <p class="sp-subtitle">{{ statusMeta.sub }}</p>
              </div>
            </div>
            <div class="sp-head-right">
              <span
                class="sp-status-pill"
                :style="{
                  background: statusMeta.color + '22',
                  color: statusMeta.color,
                  borderColor: statusMeta.color + '44'
                }"
              >
                <span class="sp-status-dot" :style="{ background: statusMeta.color }" />
                <span>{{ statusMeta.label }}</span>
              </span>
              <button
                type="button"
                class="sp-close-btn"
                :disabled="isRunning"
                @click="closeOverlay"
              >
                <X :size="14" />
              </button>
            </div>
          </header>

          <section class="sp-progress-section">
            <div class="sp-progress-meta">
              <div class="sp-progress-left">
                <Activity :size="12" />
                <span>Progress</span>
              </div>
              <div class="sp-progress-right">
                <span class="sp-percent">{{ state.progress }}%</span>
                <Zap :size="12" />
              </div>
            </div>
            <div class="sp-progress-bar">
              <div
                class="sp-progress-fill"
                :style="{
                  width: state.progress + '%',
                  background: `linear-gradient(90deg, ${progressColor}cc, ${progressColor})`
                }"
              >
                <div class="sp-progress-shine" />
              </div>
            </div>
          </section>

          <footer class="sp-footer">
            <div class="sp-foot-left">
              <span class="sp-foot-key">{{ state.currentKey }}</span>
            </div>
            <div class="sp-foot-right">
              <button
                v-if="state.status !== 'running'"
                type="button"
                class="sp-foot-btn"
                :style="{
                  borderColor: state.status === 'error' ? '#ef444455' : '#22c55e55',
                  background: state.status === 'error' ? '#ef444411' : '#22c55e11',
                  color: state.status === 'error' ? '#f87171' : '#4ade80'
                }"
                @click="closeOverlay"
              >
                {{ state.status === 'error' ? 'Đóng & Báo lỗi' : 'Hoàn tất' }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sp-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(2, 4, 10, 0.78);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
}

.sp-aurora {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(
      circle at 20% 30%,
      color-mix(in srgb, var(--accent) 35%, transparent),
      transparent 55%
    ),
    radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.28), transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(34, 197, 94, 0.2), transparent 55%);
  filter: blur(50px);
  opacity: 0.7;
  pointer-events: none;
  animation: auroraDrift 10s ease-in-out infinite alternate;
}

@keyframes auroraDrift {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(-3%, 2%) scale(1.08);
  }
}

.sp-card {
  position: relative;
  width: min(560px, 100%);
  border-radius: 22px;
  padding: 1px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent) 55%, transparent) 0%,
    rgba(255, 255, 255, 0.06) 30%,
    rgba(255, 255, 255, 0.02) 70%,
    color-mix(in srgb, var(--accent) 40%, transparent) 100%
  );
  box-shadow:
    0 40px 80px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset,
    0 0 60px color-mix(in srgb, var(--accent) 22%, transparent);
}

.sp-card-inner {
  position: relative;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(10, 15, 29, 0.98) 100%);
  border-radius: 22px;
  padding: 22px 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sp-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.sp-head-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.sp-icon-wrap {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, currentColor 12%, transparent);
  border: 1px solid;
}

.spin {
  animation: iconSpin 0.9s linear infinite;
}

@keyframes iconSpin {
  to {
    transform: rotate(360deg);
  }
}

.sp-titles {
  min-width: 0;
}

.sp-title {
  margin: 0;
  font:
    700 16px/1.25 'Archivo',
    sans-serif;
  color: #f8fafc;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sp-subtitle {
  margin: 3px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.sp-head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sp-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid;
  font: 700 10px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sp-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.sp-status-pill .sp-status-dot {
  animation: pulseGlow 1.4s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

.sp-close-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.sp-close-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.sp-close-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.sp-progress-section {
  padding: 14px 16px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%),
    rgba(2, 4, 10, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sp-progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font: 600 10.5px/1 var(--font-mono);
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sp-progress-left,
.sp-progress-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sp-progress-right {
  color: #e2e8f0;
}

.sp-percent {
  font: 800 13px/1 var(--font-mono);
  color: var(--accent);
  letter-spacing: 0.02em;
}

.sp-progress-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.sp-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 40%, transparent);
}

.sp-progress-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.35) 50%,
    transparent 100%
  );
  transform: translateX(-50%);
  animation: shineSweep 1.8s ease-in-out infinite;
}

@keyframes shineSweep {
  0% {
    transform: translateX(-60%);
  }
  100% {
    transform: translateX(60%);
  }
}

.sp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
  gap: 10px;
}

.sp-foot-left {
  min-width: 0;
}

.sp-foot-key {
  font: 500 10.5px/1 var(--font-mono);
  color: #475569;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.sp-foot-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid;
  font:
    700 12px/1 'Archivo',
    sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  animation: btnIn 0.4s ease-out;
}

.sp-foot-btn:hover {
  filter: brightness(1.12);
  transform: translateY(-1px);
}

@keyframes btnIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sp-overlay-enter-active,
.sp-overlay-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.sp-overlay-enter-from,
.sp-overlay-leave-to {
  opacity: 0;
}

.sp-overlay-enter-from .sp-card,
.sp-overlay-leave-to .sp-card {
  transform: translateY(12px) scale(0.97);
  opacity: 0;
}

.sp-overlay-enter-active .sp-card,
.sp-overlay-leave-active .sp-card {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
