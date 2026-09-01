<script setup>
import { ref } from 'vue'

const logOutput = ref('')
const isRunning = ref(false)

const runCmdHook = async (actionName, description) => {
  isRunning.value = true
  logOutput.value = `[CMD HOOK] Đang gọi lệnh Restore Default [${actionName}] - ${description}...`

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
            style="background-color: rgba(156, 163, 175, 0.2); color: var(--text-main)"
          >
            🔄
          </div>
          <div>
            <div>KHÔI PHỤC MẶC ĐỊNH (RESTORE DEFAULT)</div>
            <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
              Khôi Phục Cài Đặt Gốc Cho Windows, Network & System Registry
            </div>
          </div>
        </div>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px">
        Khôi phục các thông số Windows về trạng thái mặc định ban đầu nếu xảy ra xung đột ứng dụng.
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
              ↩️ Restore All Settings
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">
              Khôi phục toàn bộ Registry & Services về mặc định Windows.
            </div>
          </div>
          <button
            class="btn-secondary"
            :disabled="isRunning"
            @click="runCmdHook('restore-all-default', 'Khôi phục tất cả cài đặt mặc định')"
          >
            Chạy Script Khôi Phục Mặc Định
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
              ↩️ Restore Default Network
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">
              Xóa cấu hình DNS custom & đặt lại IP mặc định DHCP.
            </div>
          </div>
          <button
            class="btn-secondary"
            :disabled="isRunning"
            @click="runCmdHook('restore-network-default', 'Khôi phục cấu hình mạng mặc định')"
          >
            Chạy Script Mạng Mặc Định
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
              ↩️ Restore Default Mouse & KB
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">
              Đặt lại tốc độ chuột & gia tốc mặc định của Windows.
            </div>
          </div>
          <button
            class="btn-secondary"
            :disabled="isRunning"
            @click="runCmdHook('restore-mouse-default', 'Khôi phục cài đặt chuột mặc định')"
          >
            Chạy Script Chuột Mặc Định
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
          color: var(--text-muted);
          margin-bottom: 8px;
        "
      >
        CONSOLE RESTORE DEFAULT CMD LOG OUTPUT
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
        >{{ logOutput || 'Sẵn sàng chờ thực thi script Restore Default CMD...' }}</pre>
    </div>
  </div>
</template>
