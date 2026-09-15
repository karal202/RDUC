<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { KeyRound, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-vue-next'
import { landscapeBanners } from '../assets/banners'
import logo from '../assets/logo.png'

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

const keyCode = ref('')
const fingerprint = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const inputRef = ref(null)
const justErrored = ref(false)
const justSucceeded = ref(false)

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

  // Check if already activated
  window.api.checkActivation().then((result) => {
    if (result.isActivated) {
      // Already activated, close window and open main app
      window.api.closeLicenseWindow()
    }
  })
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
    const res = await window.api.activateFromWindow(keyCode.value.trim())
    if (res.success) {
      successMessage.value = res.message || 'Kích hoạt bản quyền thành công.'
      setTimeout(() => {
        window.api.closeLicenseWindow()
      }, 1500)
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
        <img :src="landscapeBanners[0].src" alt="" />
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

<style scoped>
.activation-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #07070a;
  overflow: hidden;
  position: relative;
}

.activation-orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.activation-screen::before {
  width: 520px;
  height: 520px;
  top: -180px;
  left: -140px;
  background: radial-gradient(circle, rgba(22, 119, 255, 0.65) 0%, rgba(22, 119, 255, 0) 65%);
  animation: orb-float-a 25s ease-in-out infinite;
}
.activation-screen::after {
  width: 620px;
  height: 620px;
  bottom: -240px;
  right: -180px;
  background: radial-gradient(circle, rgba(0, 194, 255, 0.55) 0%, rgba(0, 194, 255, 0) 62%);
  animation: orb-float-b 30s ease-in-out infinite;
}

.activation-fx {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(90deg, #000 0%, transparent 58%);
  animation: activation-grid 30s linear infinite;
}

.activation-fx::after {
  position: absolute;
  inset: 0;
  content: '';
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 2px,
    rgba(0, 0, 0, 0.18) 3px
  );
  opacity: 0.35;
}

.activation-art {
  position: relative;
  grid-column: 1 / -1;
  grid-row: 1;
  min-width: 0;
  overflow: hidden;
}

.activation-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.12) contrast(1.08);
  transform: scale(1.06);
  animation: activation-kenburns 25s ease-in-out infinite alternate;
}

.activation-art-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.5) 100%
  );
}

.activation-art-copy {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px;
  color: #fff;
}

.activation-logo {
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
  filter: drop-shadow(0 8px 24px rgba(22, 119, 255, 0.4));
}

.activation-art-copy h1 {
  font:
    800 32px 'Archivo',
    sans-serif;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.activation-art-copy p {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
  line-height: 1.5;
}

.activation-panel {
  position: relative;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 32px;
  width: 100%;
  max-width: 480px;
  z-index: 2;
  backdrop-filter: blur(20px);
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5);
  animation: activation-enter 520ms cubic-bezier(0.16, 1, 0.3, 1);
}

.activation-scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(22, 119, 255, 0.5), transparent);
  animation: scan-sweep 5.2s linear infinite;
}

.activation-mark {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: #94a3b8;
  transition: all 0.3s ease;
}

.activation-mark.is-success {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
  box-shadow: 0 0 24px rgba(34, 197, 94, 0.3);
}

.activation-mark.is-error {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
  box-shadow: 0 0 24px rgba(239, 68, 68, 0.3);
}

.activation-panel h2 {
  font:
    700 26px 'Archivo',
    sans-serif;
  color: #ffffff;
  margin: 0 0 8px;
  text-align: center;
  letter-spacing: -0.02em;
}

.activation-lead {
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
  margin: 0 0 24px;
  line-height: 1.5;
}

.activation-device {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.activation-device-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 12px;
}

.activation-device-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fbbf24;
  animation: live-pulse 1.8s ease-in-out infinite;
}

.activation-device-dot.is-ready {
  background: #4ade80;
}

.activation-device-specs {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.activation-device-specs dt {
  font:
    600 10px var(--font-mono);
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.activation-device-specs dd {
  font:
    500 13px var(--font-mono);
  color: #f1f5f9;
  margin: 0;
  font-family: 'Courier New', monospace;
}

.activation-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.key-field-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.field-label {
  font:
    600 13px var(--font-sans);
  color: #cbd5e1;
}

.key-field-count {
  font:
    500 11px var(--font-mono);
  color: #64748b;
}

.key-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 10px;
  background: rgba(5, 5, 8, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.3);
  transition: all 0.25s ease;
}

.key-input-wrap.has-error {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.1);
}

.key-input-wrap.has-success {
  border-color: rgba(34, 197, 94, 0.5);
  background: rgba(34, 197, 94, 0.1);
}

.key-input-prefix {
  font:
    700 12px var(--font-mono);
  color: #64748b;
  padding: 0 12px;
  border-right: 1px solid rgba(148, 163, 184, 0.2);
}

.key-input-divider {
  flex: 1;
}

.key-input-field {
  flex: 1;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: #f1f5f9;
  font:
    500 14px var(--font-mono);
  outline: none;
  text-transform: uppercase;
}

.key-input-field::placeholder {
  color: #64748b;
  text-transform: none;
}

.key-input-icon {
  color: #64748b;
  padding: 0 12px;
}

.form-alert {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin: 0;
}

.form-alert-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.form-alert-ok {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.activation-submit {
  width: 100%;
  padding: 14px 24px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  color: #ffffff;
  font:
    700 15px 'Archivo',
    sans-serif;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 8px 24px rgba(168, 85, 247, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.activation-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(168, 85, 247, 0.4);
}

.activation-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes orb-float-a {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(15px, -10px) scale(1.05);
  }
}

@keyframes orb-float-b {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-15px, 10px) scale(1.05);
  }
}

@keyframes activation-grid {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 42px 42px;
  }
}

@keyframes activation-kenburns {
  from {
    transform: scale(1.04) translate3d(0, 0, 0);
  }
  to {
    transform: scale(1.08) translate3d(-15px, 10px, 0);
  }
}

@keyframes activation-enter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scan-sweep {
  0% {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(100%);
  }
}

@keyframes live-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes float-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
