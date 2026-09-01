<script setup>
import { ref } from 'vue'

const logOutput = ref('')
const isRunning = ref(false)

const runCmdHook = async (actionName, description) => {
  isRunning.value = true
  logOutput.value = `[CMD HOOK] Đang gọi lệnh script Network [${actionName}] - ${description}...`

  try {
    const res = await window.api.executeCmdScript({ action: actionName })
    if (res.success) {
      logOutput.value += `\n✅ ${res.message}`
      if (res.stdout) logOutput.value += `\nOutput: ${res.stdout}`
    } else {
      logOutput.value += `\n❌ ${res.message}`
    }
  } catch (err) {
    logOutput.value += `\n❌ Error: ${err.message}`
  } finally {
    isRunning.value = false
  }
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
            🌐
          </div>
          <div>
            <div>TỐI ƯU MẠNG & PING (NETWORK OPTIMIZER)</div>
            <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
              Giảm Latency, Tối ưu TCP/IP Stack & Flush DNS
            </div>
          </div>
        </div>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px">
        Công cụ tinh chỉnh mạng chuyên dụng cho Game thủ. Sẵn sàng nhận file CMD script của bạn sau.
      </p>

      <div class="grid-3">
        <div
          style="
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 12px;
          "
        >
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 14px">
              ⚡ Ultra Low Ping TCP/IP
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">
              Tắt Nagle's Algorithm (TCP ACK Frequency) giảm lag in-game.
            </div>
          </div>
          <button
            class="btn-primary"
            :disabled="isRunning"
            @click="runCmdHook('network-tcp-ping', 'Tối ưu TCP/IP Low Latency')"
          >
            Chạy Script Tối Ưu TCP
          </button>
        </div>

        <div
          style="
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 12px;
          "
        >
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 14px">
              🧹 Flush DNS & Reset Winsock
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">
              Xóa cache DNS cũ, reset Winsock catalog để sửa lỗi lag mạng.
            </div>
          </div>
          <button
            class="btn-secondary"
            :disabled="isRunning"
            @click="runCmdHook('network-flush-dns', 'Flush DNS & Reset Winsock')"
          >
            Chạy Script Flush DNS
          </button>
        </div>

        <div
          style="
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 12px;
          "
        >
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 14px">🚀 Gaming DNS Switcher</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">
              Chuyển sang DNS Google (8.8.8.8) hoặc Cloudflare (1.1.1.1).
            </div>
          </div>
          <button
            class="btn-secondary"
            :disabled="isRunning"
            @click="runCmdHook('network-dns-gaming', 'Đổi DNS Gaming Fast Response')"
          >
            Chạy Script DNS Gaming
          </button>
        </div>
      </div>
    </div>

    <!-- Log Console -->
    <div class="dashboard-card" style="background-color: #05080e">
      <div
        style="
          font-size: 12px;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-cyan);
          margin-bottom: 8px;
        "
      >
        CONSOLE NETWORK CMD LOG OUTPUT
      </div>
      <pre
        style="
          font-family: var(--font-mono);
          font-size: 12px;
          color: #6ee7b7;
          background: #000;
          padding: 14px;
          border-radius: 6px;
          min-height: 120px;
          white-space: pre-wrap;
          overflow-y: auto;
          border: 1px solid rgba(255, 255, 255, 0.08);
        "
        >{{ logOutput || 'Sẵn sàng chờ thực thi script Network CMD...' }}</pre>
    </div>
  </div>
</template>
