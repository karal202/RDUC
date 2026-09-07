<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { KeyRound, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-vue-next'
import { landscapeBanners } from '../assets/banners'
import logo from '../assets/logo.png'

const emit = defineEmits(['activated'])

const keyCode = ref('')
const fingerprint = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const artSrc = landscapeBanners[0].src
const inputRef = ref(null)
const justErrored = ref(false)
const justSucceeded = ref(false)

const TYPING_FRAMES = [
  'XXXX-XXXX-XXXX',
  'DXXX-XXXX-XXXX',
  'DAXX-XXXX-XXXX',
  'DAWX-XXXX-XXXX',
  'DAWA-XXXX-XXXX',
  'DAWA-SXXX-XXXX',
  'DAWA-SEXX-XXXX',
  'DAWA-SECX-XXXX',
  'DAWA-SECR-XXXX',
  'DAWA-SECRET-KEY'
]
const typingIndex = ref(0)
let typingTimer = null
let erroTimer = null
let succeTimer = null
let focusTimer = null

const markState = computed(() => {
  if (successMessage.value || justSucceeded.value) return 'success'
  if (errorMessage.value || justErrored.value) return 'error'
  return 'default'
})

const displayPlaceholder = computed(() => {
  if (isLoading.value) return '••••-••••-••••'
  return TYPING_FRAMES[typingIndex.value]
})

const formatKeyInput = (value) => {
  const compact = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
  return (compact.match(/.{1,4}/g) || []).join('-')
}

const onKeyInput = (event) => {
  keyCode.value = formatKeyInput(event.target.value)
  if (errorMessage.value) errorMessage.value = ''
  if (successMessage.value) successMessage.value = ''
}

const startTyping = () => {
  stopTyping()
  typingTimer = setInterval(() => {
    typingIndex.value = (typingIndex.value + 1) % TYPING_FRAMES.length
  }, 720)
}

const stopTyping = () => {
  if (typingTimer) {
    clearInterval(typingTimer)
    typingTimer = null
  }
}

const triggerErrorShake = () => {
  justErrored.value = true
  if (erroTimer) clearTimeout(erroTimer)
  erroTimer = setTimeout(() => {
    justErrored.value = false
  }, 520)
}

const triggerSuccessRing = () => {
  justSucceeded.value = true
  if (succeTimer) clearTimeout(succeTimer)
  succeTimer = setTimeout(() => {
    justSucceeded.value = false
  }, 1000)
}

watch(errorMessage, (val) => {
  if (val) triggerErrorShake()
})
watch(successMessage, (val) => {
  if (val) triggerSuccessRing()
})

onMounted(async () => {
  startTyping()
  try {
    if (window.api?.getDeviceHash) {
      const res = await window.api.getDeviceHash()
      fingerprint.value = res?.fingerprint || ''
    }
  } catch (err) {
    console.error('Failed to get device info:', err)
  }
  focusTimer = setTimeout(() => {
    nextTick(() => inputRef.value?.focus?.())
  }, 320)
})

onBeforeUnmount(() => {
  stopTyping()
  if (erroTimer) clearTimeout(erroTimer)
  if (succeTimer) clearTimeout(succeTimer)
  if (focusTimer) clearTimeout(focusTimer)
})

const handleActivate = async () => {
  if (isLoading.value || successMessage.value) return
  if (!keyCode.value.trim()) {
    errorMessage.value = 'Vui lòng nhập mã key kích hoạt.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  stopTyping()

  try {
    const res = await window.api.activateLicense(keyCode.value.trim())
    if (res.success) {
      successMessage.value = res.message || 'Kích hoạt bản quyền thành công.'
      setTimeout(() => {
        emit('activated', res)
      }, 900)
    } else {
      errorMessage.value = res.message || 'Key không hợp lệ hoặc đã hết hạn.'
      startTyping()
    }
  } catch (err) {
    errorMessage.value = 'Lỗi hệ thống khi kết nối xác thực: ' + (err.message || 'Unknown error')
    startTyping()
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Transition name="float-in-up" appear>
    <div class="activation-screen">
      <div class="activation-orbs" aria-hidden="true"></div>
      <div class="activation-fx" aria-hidden="true"></div>

      <aside class="activation-art">
        <img :src="artSrc" alt="" />
        <div class="activation-art-scrim"></div>
        <div class="activation-art-copy">
          <img class="activation-logo" :src="logo" alt="DAWA" />
          <h1>Unlock the rig</h1>
          <p>Kích hoạt xong mới vào khu tối ưu FPS. Key khóa theo máy này.</p>
        </div>
      </aside>

      <section class="activation-panel">
        <div class="activation-scanline" aria-hidden="true"></div>

        <div
          class="activation-mark"
          :class="{
            'is-success': markState === 'success',
            'is-error': markState === 'error'
          }"
        >
          <CheckCircle2 v-if="markState === 'success'" :size="22" :stroke-width="2" />
          <ShieldAlert v-else-if="markState === 'error'" :size="22" :stroke-width="2" />
          <ShieldCheck v-else :size="22" :stroke-width="2" />
        </div>

        <h2>Kích hoạt bản quyền</h2>
        <p class="activation-lead">Nhập key để mở DAWA Optimizer trên thiết bị đã đăng ký.</p>

        <div class="activation-device">
          <div class="activation-device-status">
            <span class="activation-device-dot" :class="{ 'is-ready': !!fingerprint }"></span>
            {{ fingerprint ? 'Thiết bị đã khóa với app' : 'Đang nhận diện thiết bị...' }}
          </div>
          <dl class="activation-device-specs">
            <div>
              <dt>MACHINE ID</dt>
              <dd>{{ fingerprint || '••••' }}</dd>
            </div>
          </dl>
        </div>

        <form class="activation-form" @submit.prevent="handleActivate">
          <div class="key-field-heading">
            <label class="field-label" for="license-key">Mã key kích hoạt</label>
            <span class="key-field-count">{{ keyCode.length }}/14</span>
          </div>

          <div
            class="key-input-wrap"
            :class="{
              'has-error': errorMessage || justErrored,
              'has-success': successMessage || justSucceeded
            }"
          >
            <span class="key-input-prefix">KEY</span>
            <span class="key-input-divider" aria-hidden="true"></span>
            <input
              id="license-key"
              ref="inputRef"
              :value="keyCode"
              type="text"
              class="key-input-field"
              :placeholder="displayPlaceholder"
              autocomplete="off"
              spellcheck="false"
              :disabled="isLoading"
              aria-label="Nhập mã kích hoạt bản quyền"
              aria-invalid="!!errorMessage"
              @input="onKeyInput"
              @focus="stopTyping"
            />
            <KeyRound class="key-input-icon" :size="17" :stroke-width="2" aria-hidden="true" />
          </div>

          <div aria-live="polite" aria-atomic="true">
            <p v-if="errorMessage" key="err" class="form-alert form-alert-error">
              {{ errorMessage }}
            </p>
            <p v-else-if="successMessage" key="ok" class="form-alert form-alert-ok">
              {{ successMessage }}
            </p>
          </div>

          <button
            class="btn-primary activation-submit"
            :disabled="isLoading || !!successMessage"
            type="submit"
          >
            <KeyRound v-if="!isLoading" :size="16" :stroke-width="2" />
            {{ isLoading ? 'Đang xác thực...' : 'Kích hoạt' }}
          </button>
        </form>
      </section>
    </div>
  </Transition>
</template>
