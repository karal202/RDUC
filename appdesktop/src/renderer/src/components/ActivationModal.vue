<script setup>
import { ref, computed, onMounted } from 'vue'
import { KeyRound, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-vue-next'
import { verticalBanners } from '../assets/banners'

const emit = defineEmits(['activated'])

const keyCode = ref('')
const deviceHash = ref('')
const deviceIp = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const artSrc = verticalBanners[0].src

const markState = computed(() => {
  if (successMessage.value) return 'success'
  if (errorMessage.value) return 'error'
  return 'default'
})

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
    errorMessage.value = 'Vui lòng nhập mã key kích hoạt.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await window.api.activateLicense(keyCode.value.trim())
    if (res.success) {
      successMessage.value = res.message || 'Kích hoạt bản quyền thành công.'
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
  <div class="activation-screen">
    <aside class="activation-art">
      <img :src="artSrc" alt="DAWA Shop" />
    </aside>

    <section class="activation-panel">
      <div
        class="activation-mark"
        :class="{ 'is-success': markState === 'success', 'is-error': markState === 'error' }"
      >
        <CheckCircle2 v-if="markState === 'success'" :size="22" :stroke-width="1.8" />
        <ShieldAlert v-else-if="markState === 'error'" :size="22" :stroke-width="1.8" />
        <ShieldCheck v-else :size="22" :stroke-width="1.8" />
      </div>
      <h2>Kích hoạt bản quyền</h2>
      <p class="activation-lead">Key gắn với HWID máy. Chỉ dùng trên thiết bị đã đăng ký.</p>

      <div class="activation-device">
        <div class="activation-device-status">
          <span class="activation-device-dot" :class="{ 'is-ready': !!deviceHash }"></span>
          {{ deviceHash ? 'Đã nhận diện thiết bị này' : 'Đang nhận diện thiết bị...' }}
        </div>
        <dl class="activation-device-specs">
          <div>
            <dt>HWID</dt>
            <dd :title="deviceHash">{{ deviceHash || '—' }}</dd>
          </div>
          <div>
            <dt>Địa chỉ IP</dt>
            <dd>{{ deviceIp || '—' }}</dd>
          </div>
        </dl>
      </div>

      <div class="key-field-heading">
        <label class="field-label" for="license-key">Mã key kích hoạt</label>
        <span class="key-field-count">{{ keyCode.length }}/14</span>
      </div>
      <div
        class="key-input-wrap"
        :class="{ 'has-error': errorMessage, 'has-success': successMessage }"
      >
        <span class="key-input-prefix">KEY</span>
        <span class="key-input-divider" aria-hidden="true"></span>
        <input
          id="license-key"
          v-model="keyCode"
          type="text"
          class="key-input-field"
          placeholder="XXXX-XXXX-XXXX"
          autocomplete="off"
          :disabled="isLoading"
          @keyup.enter="handleActivate"
        />
        <KeyRound class="key-input-icon" :size="17" :stroke-width="1.8" aria-hidden="true" />
      </div>

      <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="form-alert form-alert-ok">{{ successMessage }}</p>

      <button class="btn-primary activation-submit" :disabled="isLoading" @click="handleActivate">
        <KeyRound v-if="!isLoading" :size="16" :stroke-width="2" />
        {{ isLoading ? 'Đang xác thực...' : 'Kích hoạt' }}
      </button>
    </section>
  </div>
</template>
