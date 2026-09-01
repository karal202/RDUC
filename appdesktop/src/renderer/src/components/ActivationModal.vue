<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['activated'])

const keyCode = ref('')
const deviceHash = ref('')
const deviceIp = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

onMounted(async () => {
  try {
    if (window.api?.getDeviceHash) {
      const res = await window.api.getDeviceHash()
      if (typeof res === 'object' && res !== null) {
        deviceHash.value = res.hwid || ''
        deviceIp.value = res.ip || ''
      } else {
        deviceHash.value = String(res || '')
      }
    }
  } catch (err) {
    console.error('Failed to get device info:', err)
  }
})

const handleActivate = async () => {
  if (!keyCode.value.trim()) {
    errorMessage.value = 'Vui lòng nhập Mã Key kích hoạt!'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await window.api.activateLicense(keyCode.value.trim())
    if (res.success) {
      successMessage.value = res.message || 'Kích hoạt bản quyền thành công!'
      setTimeout(() => {
        emit('activated', res)
      }, 800)
    } else {
      errorMessage.value = res.message || 'Key không hợp lệ hoặc đã hết hạn.'
    }
  } catch (err) {
    errorMessage.value = 'Lỗi hệ thống khi kết nối xác thực: ' + (err.message || 'Unknown error')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay">
    <div class="key-modal">
      <div style="font-size: 40px; margin-bottom: 12px">🛡️</div>
      <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 6px">
        KÍCH HOẠT BẢN QUYỀN DAWA SYSTEM
      </h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px">
        Vui lòng nhập License Key chính hãng để kích hoạt đầy đủ tính năng ứng dụng.
      </p>

      <div style="margin-bottom: 20px; text-align: left">
        <label
          style="
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 8px;
          "
        >
          MÃ KEY KÍCH HOẠT (12 KÝ TỰ HOẶC ĐỊNH DẠNG XXXX-XXXX-XXXX)
        </label>
        <input
          v-model="keyCode"
          type="text"
          class="key-input-field"
          placeholder="XXXX-XXXX-XXXX"
          :disabled="isLoading"
          @keyup.enter="handleActivate"
        />
      </div>

      <div
        v-if="errorMessage"
        style="
          background: rgba(220, 38, 38, 0.15);
          border: 1px solid rgba(220, 38, 38, 0.4);
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 13px;
          color: #fca5a5;
          margin-bottom: 20px;
          text-align: left;
        "
      >
        ⚠️ {{ errorMessage }}
      </div>

      <div
        v-if="successMessage"
        style="
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 13px;
          color: #6ee7b7;
          margin-bottom: 20px;
          text-align: left;
        "
      >
        ✅ {{ successMessage }}
      </div>

      <button
        class="btn-primary"
        style="width: 100%; padding: 14px; font-size: 15px; font-weight: 700; letter-spacing: 0.5px"
        :disabled="isLoading"
        @click="handleActivate"
      >
        <span v-if="isLoading">⏳ ĐANG XÁC THỰC VỚI SERVER...</span>
        <span v-else>🚀 KÍCH HOẠT VÀ VÀO APP</span>
      </button>

      <div
        class="hwid-box"
        style="
          margin-top: 24px;
          background: rgba(0, 0, 0, 0.3);
          padding: 14px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        "
      >
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px">
          <span style="font-weight: 600; color: var(--text-dim); font-size: 12px"
            >🌐 IP MÁY TÍNH:</span
          >
          <span style="color: #38bdf8; font-weight: 700; font-family: monospace">{{
            deviceIp || '127.0.0.1'
          }}</span>
        </div>
        <div
          style="
            font-weight: 600;
            color: var(--text-dim);
            font-size: 12px;
            margin-bottom: 4px;
            text-align: left;
          "
        >
          MÃ HWID PHẦN CỨNG:
        </div>
        <div
          style="
            color: var(--accent-cyan);
            word-break: break-all;
            font-size: 11px;
            font-family: monospace;
            text-align: left;
          "
        >
          {{ deviceHash || 'Đang tải HWID...' }}
        </div>
      </div>

      <div
        style="
          margin-top: 16px;
          font-size: 11px;
          color: var(--text-dim);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        "
      >
        <span>🛡️ Hardware-Bound Activation by DAWA Security</span>
      </div>
    </div>
  </div>
</template>
