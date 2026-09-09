<script setup>
import { ref } from 'vue'
import {
  Bolt,
  Gamepad2,
  Laptop,
  SlidersHorizontal,
  Wrench,
  Play,
  CheckCircle2,
  Trash2
} from 'lucide-vue-next'

const activeTool = ref('msi')
const isCleaning = ref(false)
const cleanLog = ref('')

const tools = [
  {
    key: 'msi',
    label: 'MSI UTILITY V3',
    icon: SlidersHorizontal,
    desc: 'Tối ưu MSI (Message Signaled-Based Interrupts) Mode giảm độ trễ ngắt DPC cho GPU/Audio.',
    badge: 'INTERRUPTS'
  },
  {
    key: 'device',
    label: 'DEVICE CLEANUP',
    icon: Laptop,
    desc: 'Dọn dẹp driver các thiết bị ngoại vi cũ/ngắt kết nối tồn đọng trong Windows Device Manager.',
    badge: 'HARDWARE'
  },
  {
    key: 'memory',
    label: 'MEMORY CLEANER',
    icon: Gamepad2,
    desc: 'Xả sạch Standby List và Working Set RAM, chống drop FPS đột ngột khi chơi game nặng.',
    badge: 'RAM CACHE'
  },
  {
    key: 'tweaks',
    label: 'WIN UTIL TWEAKS',
    icon: Bolt,
    desc: 'Bộ tinh chỉnh hệ điều hành chuyên sâu tối ưu phản hồi và dịch vụ nền Windows.',
    badge: 'SYSTEM'
  }
]

const handleRunCacheClean = async () => {
  isCleaning.value = true
  cleanLog.value =
    '[CACHE CLEANER] Đang quét và dọn dẹp các thư mục đệm hệ thống (Temp, Prefetch)...\n'

  try {
    const res = await window.api.runDawaScript('dawa-cleaner')
    if (res.success) {
      cleanLog.value += `✅ ${res.message}\n`
      if (res.stepResults) {
        res.stepResults.forEach((step, i) => {
          cleanLog.value += `  [Bước ${i + 1}] Xóa thư mục: ${step.args?.[0] || 'Target'}\n`
          if (step.stdout) cleanLog.value += `    -> ${step.stdout.trim()}\n`
          if (step.stderr) cleanLog.value += `    -> ${step.stderr.trim()}\n`
        })
      }
      cleanLog.value += '✨ Đã dọn dẹp bộ nhớ đệm Cache thành công! Hệ thống đã được giải phóng.'
    } else {
      cleanLog.value += `❌ ${res.message}\n`
    }
  } catch (err) {
    cleanLog.value += `❌ Lỗi thực thi: ${err.message || err}\n`
  } finally {
    isCleaning.value = false
  }
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px">
    <!-- Main Header Card -->
    <div class="dashboard-card">
      <div class="card-header">
        <div class="card-title">
          <div
            class="card-icon"
            style="background-color: rgba(16, 185, 129, 0.15); color: var(--accent-green)"
          >
            <Wrench :size="18" :stroke-width="2" />
          </div>
          <div>
            <div style="font-size: 18px">TOOLS &amp; CACHE SYSTEM</div>
            <div style="font-size: 12px; font-weight: 400; color: var(--text-muted)">
              Bộ công cụ dọn dẹp bộ nhớ đệm, tối ưu Driver và tinh chỉnh phản hồi hệ thống
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Action Cache Cleaner Box -->
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px;
          border-radius: 10px;
          background: rgba(0, 240, 255, 0.04);
          border: 1px solid rgba(0, 240, 255, 0.2);
          margin-bottom: 20px;
          flex-wrap: wrap;
        "
      >
        <div style="display: flex; align-items: center; gap: 14px">
          <div
            style="
              width: 44px;
              height: 44px;
              border-radius: 10px;
              background: rgba(0, 240, 255, 0.12);
              display: flex;
              align-items: center;
              justify-content: center;
              color: var(--accent-cyan);
            "
          >
            <Trash2 :size="22" :stroke-width="2" />
          </div>
          <div>
            <h4 style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 3px">
              DỌN DẸP SÂU BỘ NHỚ ĐỆM (CACHE CLEANER)
            </h4>
            <p style="font-size: 12px; color: var(--text-muted)">
              Quét sạch các tệp tin rác tạm thời trong %TEMP% và Prefetch để giải phóng dung lượng
              và chống delay.
            </p>
          </div>
        </div>
        <button
          class="btn-primary"
          style="padding: 11px 20px"
          :disabled="isCleaning"
          @click="handleRunCacheClean"
        >
          <Play :size="14" :stroke-width="2.2" />
          <span>{{ isCleaning ? 'Đang dọn dẹp...' : 'Dọn dẹp Cache ngay' }}</span>
        </button>
      </div>

      <!-- Tools Grid -->
      <div style="margin-bottom: 10px">
        <span class="eyebrow" style="margin-bottom: 8px; display: block"
          >DANH MỤC CÔNG CỤ TỐI ƯU</span
        >
      </div>

      <div class="tool-grid" style="padding: 0; margin-bottom: 20px">
        <button
          v-for="tool in tools"
          :key="tool.key"
          type="button"
          class="tool-choice"
          :class="{ selected: activeTool === tool.key }"
          @click="activeTool = tool.key"
        >
          <component :is="tool.icon" :size="20" :stroke-width="2.2" />
          <div style="flex: 1; text-align: left">
            <div style="display: flex; align-items: center; justify-content: space-between">
              <strong>{{ tool.label }}</strong>
              <span
                style="
                  font-size: 10px;
                  font-family: var(--font-mono);
                  padding: 2px 6px;
                  border-radius: 4px;
                  background: rgba(255, 255, 255, 0.08);
                  color: var(--text-muted);
                "
              >
                {{ tool.badge }}
              </span>
            </div>
            <div
              style="font-size: 11.5px; color: var(--text-muted); margin-top: 3px; line-height: 1.4"
            >
              {{ tool.desc }}
            </div>
          </div>
        </button>
      </div>

      <!-- Console Log Output -->
      <div
        style="
          background: #05080e;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 14px 16px;
        "
      >
        <div
          style="
            font-size: 12px;
            font-weight: 700;
            font-family: var(--font-mono);
            color: var(--accent-green);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          "
        >
          <CheckCircle2 :size="13" /> CONSOLE LOG &amp; TRẠNG THÁI TIẾN TRÌNH
        </div>
        <pre
          style="
            font-family: var(--font-mono);
            font-size: 12px;
            color: #6ee7b7;
            background: #000;
            padding: 12px;
            border-radius: 6px;
            min-height: 90px;
            max-height: 220px;
            white-space: pre-wrap;
            overflow-y: auto;
            border: 1px solid rgba(255, 255, 255, 0.08);
            margin: 0;
          "
          >{{ cleanLog || 'Sẵn sàng chờ lệnh thực thi dọn dẹp bộ nhớ đệm Cache...' }}</pre>
      </div>
    </div>
  </div>
</template>
