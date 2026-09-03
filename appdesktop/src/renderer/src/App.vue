<script setup>
import { computed, ref, onMounted } from 'vue'
import { useSocket } from './composables/useSocket'
import ActivationModal from './components/ActivationModal.vue'
import DashboardTab from './components/DashboardTab.vue'
import DawaTab from './components/DawaTab.vue'
import BiosTab from './components/BiosTab.vue'
import NetworkTab from './components/NetworkTab.vue'
import MouseKeyboardTab from './components/MouseKeyboardTab.vue'
import RestoreDefaultTab from './components/RestoreDefaultTab.vue'

const activeTab = ref('dashboard')
const tabComponents = {
  dashboard: DashboardTab,
  dawa: DawaTab,
  bios: BiosTab,
  network: NetworkTab,
  mouse: MouseKeyboardTab,
  restore: RestoreDefaultTab
}
const activeComponent = computed(() => tabComponents[activeTab.value])
const isActivated = ref(false)
const licenseInfo = ref(null)
const isCheckingLicense = ref(true)
const revokedAlert = ref(false)

const latestVersionInfo = ref({
  currentVersion: '0.0.0',
  latestVersion: null,
  isOutdated: false,
  message: ''
})

const checkLicense = async () => {
  isCheckingLicense.value = true
  try {
    if (window.api?.checkLicenseStatus) {
      const res = await window.api.checkLicenseStatus()
      if (res && res.isActivated) {
        isActivated.value = true
        licenseInfo.value = res
      } else {
        isActivated.value = false
        licenseInfo.value = null
      }
    } else {
      // Fallback mode if running outside electron preload
      isActivated.value = true
    }
  } catch (err) {
    console.error('License check error:', err)
    isActivated.value = false
  } finally {
    isCheckingLicense.value = false
  }
}

const checkAppVersion = async () => {
  try {
    if (!window.api?.checkAppVersion) return
    const res = await window.api.checkAppVersion()
    latestVersionInfo.value = res
  } catch (err) {
    console.error('App version check error:', err)
  }
}

const handleActivated = (data) => {
  isActivated.value = true
  licenseInfo.value = data
  activeTab.value = 'dashboard'
}

const handleDeactivate = async () => {
  if (confirm('Bạn có chắc chắn muốn khóa key bản quyền và đăng xuất khỏi ứng dụng?')) {
    try {
      await window.api.deactivateLicense()
      isActivated.value = false
      licenseInfo.value = null
    } catch (err) {
      console.error('Failed to deactivate:', err)
    }
  }
}

// Socket.io — lắng nghe sự kiện realtime từ server
const { connected: socketConnected } = useSocket({
  // Admin thu hồi / vô hiệu key → buộc app logout ngay
  license_revoked: async ({ keyCode } = {}) => {
    const currentKey = licenseInfo.value?.keyCode
    if (!currentKey || (keyCode && keyCode !== currentKey)) return
    try {
      await window.api?.deactivateLicense?.()
    } catch (_) {}
    revokedAlert.value = true
    isActivated.value = false
    licenseInfo.value = null
    setTimeout(() => { revokedAlert.value = false }, 8000)
  },

  // Admin cập nhật key → re-verify để bắt hết hạn, disabled, v.v.
  license_updated: async () => {
    if (!isActivated.value) return
    await checkLicense()
  },
})

onMounted(() => {
  checkLicense()
  checkAppVersion()
  window.api?.onLicenseRevoked?.(() => {
    revokedAlert.value = true
    isActivated.value = false
    licenseInfo.value = null
    setTimeout(() => { revokedAlert.value = false }, 8000)
  })
})
</script>


<template>
  <div v-if="isCheckingLicense" class="modal-overlay">
    <div style="text-align: center; color: #fff">
      <div style="font-size: 32px; margin-bottom: 12px">🛡️</div>
      <div style="font-size: 16px; font-weight: 700">ĐANG XÁC THỰC BẢO MẬT BẢN QUYỀN HWID...</div>
      <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px">
        Vui lòng chờ trong giây lát
      </div>
    </div>
  </div>

  <template v-else>
    <!-- Activation Modal Screen if not activated -->
    <ActivationModal v-if="!isActivated" @activated="handleActivated" />

    <!-- Key bị thu hồi bởi Admin -->
    <Transition name="slide-down">
      <div
        v-if="revokedAlert"
        style="
          position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
          background: #1a0505;
          color: #fca5a5; padding: 12px 24px;
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; font-weight: 600;
          border-bottom: 1px solid rgba(244, 63, 94, 0.3);
        "
      >
        <span style="font-size: 20px">🚨</span>
        <span>Key bản quyền của bạn đã bị Admin thu hồi hoặc vô hiệu hóa. Vui lòng liên hệ để được hỗ trợ.</span>
      </div>
    </Transition>

    <!-- Main App Interface when activated -->
    <div v-if="isActivated" class="app-container">
      <!-- Navigation Sidebar -->
      <aside class="sidebar">
        <div class="brand-header">
          <div class="brand-logo">D</div>
          <div class="brand-text">
            <h1>DAWA APP</h1>
            <span>PRO OPTIMIZER</span>
          </div>
        </div>

        <nav class="nav-list">
          <div
            class="nav-item"
            :class="{ active: activeTab === 'dashboard' }"
            @click="activeTab = 'dashboard'"
          >
            <span class="nav-icon">📊</span>
            <span>Dashboard</span>
          </div>

          <div
            style="
              margin-top: 14px;
              margin-bottom: 6px;
              font-size: 10px;
              font-family: var(--font-mono);
              color: var(--text-dim);
              padding-left: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            "
          >
            Mục Setting
          </div>

          <div
            class="nav-item"
            :class="{ active: activeTab === 'dawa' }"
            @click="activeTab = 'dawa'"
          >
            <span class="nav-icon">⚡</span>
            <span>DAWA</span>
          </div>

          <div
            class="nav-item"
            :class="{ active: activeTab === 'bios' }"
            @click="activeTab = 'bios'"
          >
            <span class="nav-icon">⚙️</span>
            <span>BIOS</span>
          </div>

          <div
            class="nav-item"
            :class="{ active: activeTab === 'network' }"
            @click="activeTab = 'network'"
          >
            <span class="nav-icon">🌐</span>
            <span>Network</span>
          </div>

          <div
            class="nav-item"
            :class="{ active: activeTab === 'mouse' }"
            @click="activeTab = 'mouse'"
          >
            <span class="nav-icon">🖱️</span>
            <span>Mouse & Keyboard</span>
          </div>

          <div
            class="nav-item"
            :class="{ active: activeTab === 'restore' }"
            @click="activeTab = 'restore'"
          >
            <span class="nav-icon">🔄</span>
            <span>Restore Default</span>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div>LICENSE ACTIVATED</div>
          <div
            style="
              color: var(--accent-cyan);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            "
          >
            {{ licenseInfo?.keyCode || 'DAWA-ACTIVE-KEY' }}
          </div>

          <div
            v-if="latestVersionInfo.isOutdated"
            style="
              margin-top: 10px;
              padding: 6px 8px;
              border-radius: 6px;
              background: rgba(251, 191, 36, 0.12);
              border: 1px solid rgba(251, 191, 36, 0.35);
              color: #fcd34d;
              font-size: 10px;
              line-height: 1.5;
            "
          >
            BẢN MỚI: {{ latestVersionInfo.latestVersion }}
          </div>

          <!-- Socket realtime dot -->
          <div
            :style="{
              display: 'flex', alignItems: 'center', gap: '5px',
              marginTop: '8px', fontSize: '10px',
              color: socketConnected ? '#6ee7b7' : '#fca5a5',
            }"
          >
            <span
              :style="{
                width: '6px', height: '6px', borderRadius: '50%',
                background: socketConnected ? '#6ee7b7' : '#fca5a5',
                boxShadow: socketConnected ? '0 0 5px #6ee7b7' : 'none',
                display: 'inline-block',
              }"
            />
            {{ socketConnected ? 'SERVER LIVE' : 'OFFLINE' }}
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content">
        <!-- Top Bar -->
        <header class="topbar">
          <div class="page-title">
          <span v-if="activeTab === 'dashboard'">DASHBOARD — THÔNG SỐ MÁY</span>
            <span v-else-if="activeTab === 'dawa'">DAWA OPTIMIZER</span>
            <span v-else-if="activeTab === 'bios'">BIOS CONTROL</span>
            <span v-else-if="activeTab === 'network'">NETWORK &amp; PING</span>
            <span v-else-if="activeTab === 'mouse'">MOUSE &amp; KEYBOARD</span>
            <span v-else-if="activeTab === 'restore'">RESTORE DEFAULT</span>
          </div>

          <div class="topbar-actions">
            <div v-if="licenseInfo?.offlineMode" class="status-badge offline">
              <span class="status-dot"></span>
              OFFLINE VERIFIED
            </div>
            <div v-else class="status-badge activated">
              <span class="status-dot"></span>
              BẢN QUYỀN HỢP LỆ
            </div>

            <button
              class="btn-secondary"
              style="padding: 5px 12px; font-size: 12px"
              @click="handleDeactivate"
            >
              KHÓA KEY
            </button>
          </div>
        </header>

        <!-- Dynamic Content Body -->
        <div class="tab-container">
          <KeepAlive>
            <component :is="activeComponent" />
          </KeepAlive>
        </div>
      </main>
    </div>
  </template>
</template>
