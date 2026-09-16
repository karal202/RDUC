<script setup>
import { ref, onMounted } from 'vue'
import { KeyRound, Lock, Check, X, Loader2 } from 'lucide-vue-next'

const keyCode = ref('')
const isActivating = ref(false)
const activationResult = ref(null)
const errorMessage = ref('')

const activateLicense = async () => {
  if (!keyCode.value.trim()) {
    errorMessage.value = 'Vui lòng nhập key bản quyền'
    return
  }

  isActivating.value = true
  errorMessage.value = ''
  activationResult.value = null

  try {
    const result = await window.api.activateFromWindow(keyCode.value.trim())
    activationResult.value = result

    if (result.success) {
      // Close the license window after successful activation
      setTimeout(() => {
        window.close()
      }, 1500)
    } else {
      errorMessage.value = result.message || 'Kích hoạt thất bại'
    }
  } catch (err) {
    errorMessage.value = err.message || 'Lỗi kết nối đến máy chủ'
  } finally {
    isActivating.value = false
  }
}

const handleKeyPress = (e) => {
  if (e.key === 'Enter' && !isActivating.value) {
    activateLicense()
  }
}

onMounted(() => {
  // Check if already activated
  window.api.checkActivation().then((result) => {
    if (result.isActivated) {
      // Already activated, close window and open main app
      window.close()
    }
  })
})
</script>

<template>
  <div class="license-window">
    <div class="license-container">
      <div class="license-header">
        <div class="license-logo">
          <KeyRound :size="48" stroke-width="1.5" />
        </div>
        <h1 class="license-title">DAWA Optimizer</h1>
        <p class="license-subtitle">Kích hoạt bản quyền để tiếp tục</p>
      </div>

      <div class="license-form">
        <div class="input-group">
          <label for="license-key">Nhập Key Bản Quyền</label>
          <input
            id="license-key"
            v-model="keyCode"
            type="text"
            placeholder="DAWA-XXXX-XXXX-XXXX"
            class="license-input"
            :disabled="isActivating"
            @keypress="handleKeyPress"
          />
        </div>

        <div v-if="errorMessage" class="error-message">
          <X :size="16" />
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="activationResult?.success" class="success-message">
          <Check :size="16" />
          <span>{{ activationResult.message }}</span>
        </div>

        <button
          type="button"
          class="activate-btn"
          :disabled="isActivating || !keyCode.trim()"
          @click="activateLicense"
        >
          <Loader2 v-if="isActivating" :size="18" class="spin" />
          <Lock v-else :size="18" />
          <span>{{ isActivating ? 'Đang kích hoạt...' : 'Kích hoạt' }}</span>
        </button>
      </div>

      <div class="license-footer">
        <p>HWID Lock được áp dụng. Key chỉ hoạt động trên thiết bị này.</p>
        <p>Liên hệ hỗ trợ nếu gặp vấn đề về key.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.license-window {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
  padding: 20px;
}

.license-container {
  width: 100%;
  max-width: 420px;
  padding: 40px 32px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(168, 85, 247, 0.3);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
}

.license-header {
  text-align: center;
  margin-bottom: 32px;
}

.license-logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(6, 182, 212, 0.2));
  border: 1px solid rgba(168, 85, 247, 0.4);
  color: #a855f7;
}

.license-title {
  font:
    800 28px 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}

.license-subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

.license-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 28px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font: 600 13px var(--font-sans);
  color: #cbd5e1;
}

.license-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.6);
  color: #f1f5f9;
  font: 500 14px var(--font-mono);
  outline: none;
  transition: all 0.25s ease;
}

.license-input:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.15);
}

.license-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-size: 13px;
}

.success-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
  font-size: 13px;
}

.activate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  color: #ffffff;
  font:
    700 15px 'Archivo',
    sans-serif;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 8px 24px rgba(168, 85, 247, 0.3);
}

.activate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(168, 85, 247, 0.4);
}

.activate-btn:active:not(:disabled) {
  transform: translateY(0);
}

.activate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.license-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.license-footer p {
  font-size: 12px;
  color: #64748b;
  margin: 4px 0;
  line-height: 1.5;
}
</style>
