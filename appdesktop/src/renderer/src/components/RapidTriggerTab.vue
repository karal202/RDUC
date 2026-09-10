<script setup>
import { ref } from 'vue'
import { RotateCcw, Keyboard, AlertCircle, Sparkles } from 'lucide-vue-next'

const rapidTriggerEnabled = ref(false)
const continuousEnabled = ref(false)
const rtRelease = ref(10)
const rtPress = ref(10)
const selectedKeys = ref(new Set(['W', 'A', 'S', 'D', 'Spacebar']))

const rows = [
  ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
  ['L-Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'R-Shift'],
  ['L-Ctrl', 'L-Win', 'L-Alt', 'Spacebar', 'R-Alt', 'MO(1)', '←', '↓', '→']
]

const toggleKey = (key) => {
  const next = new Set(selectedKeys.value)
  next.has(key) ? next.delete(key) : next.add(key)
  selectedKeys.value = next
}
const selectAll = () => {
  selectedKeys.value = new Set(rows.flat())
}
const deselectAll = () => {
  selectedKeys.value = new Set()
}
const invertSelection = () => {
  const all = rows.flat()
  selectedKeys.value = new Set(all.filter((key) => !selectedKeys.value.has(key)))
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px">
    <div class="dashboard-card">
      <div class="card-header">
        <div class="card-title">
          <div
            class="card-icon"
            style="background-color: rgba(0, 240, 255, 0.15); color: var(--accent-cyan)"
          >
            <Keyboard :size="18" :stroke-width="2" />
          </div>
          <div>
            <div style="font-size: 18px">RAPID TRIGGER (MÔ PHỎNG HÀNH TRÌNH NHẬN PHÍM)</div>
            <div style="font-size: 12px; font-weight: 400; color: var(--text-muted)">
              Bảng kiểm thử layout phím và mô phỏng điểm nhạy phím theo mm
            </div>
          </div>
        </div>
      </div>

      <!-- Technical Notice -->
      <div
        style="
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
          padding: 14px 16px;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.25);
          font-size: 12.5px;
          line-height: 1.5;
          color: #fde68a;
        "
      >
        <AlertCircle
          :size="18"
          style="color: var(--accent-amber); flex-shrink: 0; margin-top: 2px"
        />
        <div>
          <strong style="color: #fbbf24">Lưu ý kỹ thuật:</strong>
          <span style="color: #cbd5e1; margin-left: 4px">
            Tính năng Rapid Trigger vật lý theo điểm chiều sâu (mm) yêu cầu bàn phím cơ trang bị
            switch từ tính nam châm Hall Effect (Wooting, Razer, DrunkDeer...). Bảng điều khiển này
            hoạt động dưới dạng mô phỏng giao diện và test phím.
          </span>
        </div>
      </div>

      <!-- Interactive Cyber Keyboard -->
      <section class="keyboard-card">
        <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="keyboard-row">
          <button
            v-for="key in row"
            :key="key"
            type="button"
            class="keyboard-key"
            :class="[
              { selected: selectedKeys.has(key) },
              `key-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
            ]"
            @click="toggleKey(key)"
          >
            {{ key }}
          </button>
        </div>
      </section>

      <!-- Rapid Trigger Settings -->
      <section class="rapid-settings">
        <div class="rapid-switches">
          <div class="rapid-setting">
            <strong>Kích hoạt Rapid Trigger</strong>
            <span>Tự động nhận diện khoảng cách nhấn/nhả linh hoạt</span>
            <button
              type="button"
              class="switch-control"
              :class="{ on: rapidTriggerEnabled }"
              aria-label="Kích hoạt Rapid Trigger"
              @click="rapidTriggerEnabled = !rapidTriggerEnabled"
            >
              <span></span>
            </button>
          </div>
          <div class="rapid-setting">
            <strong>Chế độ Continuous</strong>
            <span>Rapid Trigger kích hoạt toàn bộ hành trình switch</span>
            <button
              type="button"
              class="switch-control"
              :class="{ on: continuousEnabled }"
              aria-label="Kích hoạt Continuous"
              @click="continuousEnabled = !continuousEnabled"
            >
              <span></span>
            </button>
          </div>
        </div>

        <div class="rapid-sliders">
          <label class="rapid-slider-row">
            <span>
              <strong>RT Release (Nhả phím)</strong>
              <small>Khoảng cách để ngắt nhận diện phím</small>
            </span>
            <input v-model="rtRelease" type="range" min="1" max="100" />
            <output>{{ (rtRelease / 100).toFixed(2) }} mm</output>
          </label>
          <label class="rapid-slider-row">
            <span>
              <strong>RT Press (Nhận phím)</strong>
              <small>Khoảng cách để bắt đầu nhận phím</small>
            </span>
            <input v-model="rtPress" type="range" min="1" max="100" />
            <output>{{ (rtPress / 100).toFixed(2) }} mm</output>
          </label>
        </div>

        <div class="selection-actions">
          <button type="button" @click="selectAll"><Sparkles :size="13" /> Chọn hết</button>
          <button type="button" @click="invertSelection">Đảo chọn</button>
          <button type="button" class="btn-deselect" @click="deselectAll">
            <RotateCcw :size="13" /> Bỏ chọn
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
