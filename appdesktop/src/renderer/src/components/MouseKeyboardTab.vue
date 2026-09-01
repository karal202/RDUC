<script setup>
import { ref } from 'vue'

const logOutput = ref('')
const isRunning = ref(false)

const runCmdHook = async (actionName, description) => {
  isRunning.value = true
  logOutput.value = `[CMD HOOK] Đang gọi lệnh script Mouse & Keyboard [${actionName}] - ${description}...`

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
            style="background-color: rgba(245, 158, 11, 0.15); color: var(--accent-amber)"
          >
            🖱️
          </div>
          <div>
            <div>TỐI ƯU CHUỘT & BÀN PHÍM (MOUSE & KEYBOARD)</div>
            <div style="font-size: 11px; font-weight: 400; color: var(--text-muted)">
              Giảm Input Delay, Tắt Gia Tốc Chuột & Sửa Lỗi Crash App do Mouse Hook
            </div>
          </div>
        </div>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px">
        Hỗ trợ loại bỏ độ trễ bàn phím và khắc phục lỗi crash ứng dụng do xung đột driver mouse
        hook.
      </p>

      <div class="grid-3">
        <!-- Anti Crash Fix Card -->
        <div
          style="
            background: rgba(255, 27, 45, 0.08);
            border: 1px solid rgba(255, 27, 45, 0.3);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 12px;
          "
        >
          <div>
            <div style="font-weight: 700; color: var(--accent-red); font-size: 14px">
              🛡️ Fix Crash App (Mouse Hook Anti-Crash)
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">
              Khắc phục triệt để lỗi bị crash app khi sử dụng phần mềm hook chuột / bàn phím.
            </div>
          </div>
          <button
            class="btn-primary"
            :disabled="isRunning"
            @click="runCmdHook('mouse-anti-crash-fix', 'Sửa lỗi Crash App Mouse Hook')"
          >
            Chạy Script Fix Crash App
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
              🎯 MarkC Mouse Acceleration Fix
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">
              Tắt hoàn toàn gia tốc chuột 1:1 Pixel Exact cho Game FPS.
            </div>
          </div>
          <button
            class="btn-secondary"
            :disabled="isRunning"
            @click="runCmdHook('mouse-disable-acceleration', 'Tắt gia tốc chuột MarkC Fix')"
          >
            Chạy Script Tắt Gia Tốc
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
              ⌨️ Keyboard Input Delay Zero
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">
              Giảm Keyboard Repeat Delay & FilterKeys cho phản hồi phím tức thì.
            </div>
          </div>
          <button
            class="btn-secondary"
            :disabled="isRunning"
            @click="runCmdHook('keyboard-zero-delay', 'Giảm Input Delay Bàn Phím')"
          >
            Chạy Script Input Delay
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
          color: var(--accent-amber);
          margin-bottom: 8px;
        "
      >
        CONSOLE MOUSE & KEYBOARD CMD LOG OUTPUT
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
        >{{ logOutput || 'Sẵn sàng chờ thực thi script Mouse & Keyboard CMD...' }}</pre>
    </div>
  </div>
</template>
