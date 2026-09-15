<script setup>
import { computed } from 'vue'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Cpu,
  Shield,
  Unlock,
  Play,
  FileCheck,
  Sparkles
} from 'lucide-vue-next'
import { useExecutionProgress } from '../composables/useExecutionProgress.js'

const { activeList } = useExecutionProgress()

const PHASE_META = {
  license: { label: 'License Gate', icon: Shield, tint: '#6366f1' },
  decrypt: { label: 'Giải Mã', icon: Unlock, tint: '#8b5cf6' },
  prepare: { label: 'Chuẩn Bị', icon: FileCheck, tint: '#06b6d4' },
  execute: { label: 'Thực Thi', icon: Play, tint: '#22c55e' },
  launch: { label: 'Khởi Chạy', icon: Cpu, tint: '#f59e0b' },
  done: { label: 'Hoàn Tất', icon: CheckCircle2, tint: '#10b981' },
  failed: { label: 'Lỗi', icon: XCircle, tint: '#ef4444' },
  start: { label: 'Khởi Tạo', icon: Sparkles, tint: '#a855f7' }
}

const phaseMeta = (phase) => {
  return PHASE_META[phase] || PHASE_META.start
}

const items = computed(() => activeList().slice(0, 4).reverse())
</script>

<template>
  <TransitionGroup name="stack" tag="div" class="execution-progress-stack">
    <div
      v-for="entry in items"
      :key="entry.executionId"
      class="execution-progress-card glass-panel"
      :class="[
        `is-phase-${entry.phase}`,
        { 'is-done': entry.percent >= 100 && entry.phase === 'done' },
        { 'is-failed': entry.phase === 'failed' && entry.percent >= 100 }
      ]"
    >
      <div class="execution-progress-head">
        <div class="execution-progress-phase">
          <div class="execution-phase-icon" :style="{ color: phaseMeta(entry.phase).tint }">
            <component :is="phaseMeta(entry.phase).icon" :size="14" />
          </div>
          <span class="execution-phase-label">{{ phaseMeta(entry.phase).label }}</span>
        </div>
        <div class="execution-progress-percent">
          <Loader2
            v-if="entry.percent < 100"
            :size="11"
            class="execution-percent-spin"
            :stroke-width="2.4"
          />
          <CheckCircle2
            v-else-if="entry.phase === 'done'"
            :size="11"
            class="text-emerald-400"
            :stroke-width="2.4"
          />
          <XCircle
            v-else-if="entry.phase === 'failed'"
            :size="11"
            class="text-rose-400"
            :stroke-width="2.4"
          />
          <strong>{{ Math.round(entry.percent) }}%</strong>
        </div>
      </div>

      <div class="execution-progress-title">
        <span class="execution-progress-feature">{{ entry.label || entry.scriptKey }}</span>
        <span class="execution-progress-script">{{ entry.scriptKey }}</span>
      </div>

      <div class="execution-progress-track">
        <div
          class="execution-progress-fill"
          :class="{ 'is-done': entry.phase === 'done', 'is-failed': entry.phase === 'failed' }"
          :style="{ width: entry.percent + '%' }"
        >
          <div class="execution-progress-shimmer" />
        </div>
      </div>

      <div class="execution-progress-message">
        <span>{{ entry.message }}</span>
      </div>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.execution-progress-stack {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 420px;
  width: calc(100% - 40px);
  pointer-events: none;
}

.glass-panel {
  background: linear-gradient(145deg, rgba(25, 28, 45, 0.92) 0%, rgba(14, 16, 30, 0.96) 100%);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  border: 1px solid rgba(139, 92, 246, 0.22);
  border-radius: 14px;
  box-shadow:
    0 20px 60px rgba(99, 102, 241, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  padding: 14px 16px 15px;
  position: relative;
  overflow: hidden;
}

.glass-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    600px circle at var(--mouse-x, 90%) var(--mouse-y, 10%),
    rgba(139, 92, 246, 0.15),
    transparent 40%
  );
  pointer-events: none;
}

.glass-panel.is-done {
  border-color: rgba(34, 197, 94, 0.3);
  box-shadow:
    0 20px 60px rgba(34, 197, 94, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.glass-panel.is-failed {
  border-color: rgba(239, 68, 68, 0.32);
  box-shadow:
    0 20px 60px rgba(239, 68, 68, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.execution-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.execution-progress-phase {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Archivo', system-ui, sans-serif;
}

.execution-phase-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.14);
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.is-done .execution-phase-icon {
  background: rgba(34, 197, 94, 0.14);
  border-color: rgba(34, 197, 94, 0.22);
}

.is-failed .execution-phase-icon {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.22);
}

.execution-phase-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.68);
}

.execution-progress-percent {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Archivo', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  color: #f1f5f9;
}

.execution-progress-percent strong {
  font-weight: 700;
  min-width: 36px;
  text-align: right;
}

.execution-percent-spin {
  animation: execution-spin 0.9s linear infinite;
  color: #a78bfa;
}

@keyframes execution-spin {
  to {
    transform: rotate(360deg);
  }
}

.execution-progress-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 10px;
}

.execution-progress-feature {
  font-size: 13.5px;
  font-weight: 600;
  color: #f8fafc;
  letter-spacing: -0.01em;
}

.execution-progress-script {
  font-size: 10.5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: rgba(148, 163, 184, 0.75);
}

.execution-progress-track {
  position: relative;
  height: 6.5px;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 999px;
  overflow: hidden;
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.5),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  margin-bottom: 9px;
}

.execution-progress-fill {
  height: 100%;
  position: relative;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 35%, #ec4899 70%, #f97316 100%);
  border-radius: 999px;
  transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow:
    0 0 16px rgba(139, 92, 246, 0.55),
    0 0 3px rgba(255, 255, 255, 0.3) inset;
}

.execution-progress-fill.is-done {
  background: linear-gradient(90deg, #10b981 0%, #22c55e 50%, #84cc16 100%);
  box-shadow:
    0 0 16px rgba(34, 197, 94, 0.5),
    0 0 3px rgba(255, 255, 255, 0.3) inset;
}

.execution-progress-fill.is-failed {
  background: linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f97316 100%);
  box-shadow:
    0 0 16px rgba(239, 68, 68, 0.5),
    0 0 3px rgba(255, 255, 255, 0.3) inset;
}

.execution-progress-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.24) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: execution-shimmer 1.6s linear infinite;
  mix-blend-mode: overlay;
}

@keyframes execution-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.execution-progress-message {
  font-size: 11.5px;
  line-height: 1.45;
  color: rgba(203, 213, 225, 0.82);
}

/* Transition enter/leave */
.stack-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.stack-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.stack-enter-active,
.stack-leave-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.stack-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (max-width: 560px) {
  .execution-progress-stack {
    left: 12px;
    right: 12px;
    bottom: 12px;
    max-width: none;
    width: auto;
  }
}
</style>
