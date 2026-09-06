<script setup>
import { computed, ref, onMounted } from 'vue'
import { useSocket } from './composables/useSocket'
import ActivationModal from './components/ActivationModal.vue'
import RocketLaunch from './components/RocketLaunch.vue'
import BannerCarousel from './components/BannerCarousel.vue'
import DashboardTab from './components/DashboardTab.vue'
import DawaTab from './components/DawaTab.vue'
import BiosTab from './components/BiosTab.vue'
import NetworkTab from './components/NetworkTab.vue'
import MouseKeyboardTab from './components/MouseKeyboardTab.vue'
import RestoreDefaultTab from './components/RestoreDefaultTab.vue'
import CmdTab from './components/CmdTab.vue'
import logo from './assets/logo.png'
import { verticalBanners } from './assets/banners'
import {
  Code2,
  LayoutDashboard,
  MousePointer2,
  Network,
  Power,
  RotateCcw,
  Sparkles
} from 'lucide-vue-next'

const activeTab = ref('dashboard')
const tabComponents = {
  dashboard: DashboardTab,
  dawa: DawaTab,
  bios: BiosTab,
  network: NetworkTab,
  mouse: MouseKeyboardTab,
  restore: RestoreDefaultTab,
  cmd: CmdTab
}
const activeComponent = computed(() => tabComponents[activeTab.value])
const pageTitle = computed(
  () =>
    ({
      dashboard: 'Dashboard',
      dawa: 'Optimize',
      bios: 'BIOS',
      network: 'Network',
      mouse: 'Input',
      restore: 'Restore',
      cmd: 'CMD'
    })[activeTab.value] || 'Dashboard'
)
const coreNav = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'dawa', label: 'Optimize', icon: Sparkles }
]
const toolNav = [
  { key: 'bios', label: 'BIOS', icon: Power },
  { key: 'network', label: 'Network', icon: Network },
  { key: 'mouse', label: 'Input', icon: MousePointer2 },
  { key: 'restore', label: 'Restore', icon: RotateCcw },
  { key: 'cmd', label: 'CMD', icon: Code2 }
]
const isActivated = ref(false)
const licenseInfo = ref(null)
const ACTIVATED_FLAG = '__DAWA_ACTIVATED_BEFORE'
let priorActivatedSeen = false
try {
  priorActivatedSeen = !!localStorage.getItem(ACTIVATED_FLAG)
} catch {
  priorActivatedSeen = false
}
const bootGate = ref(priorActivatedSeen ? 'rocket' : 'activate')
const isLaunching = ref(false)
const revokedAlert = ref(false)

const latestVersionInfo = ref({
  currentVersion: '0.0.0',
  latestVersion: null,
  isOutdated: false,
  message: ''
})

const SPLASH_MIN_MS = 2400
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const playRocket = async () => {
  bootGate.value = 'rocket'
  isLaunching.value = false
  await delay(SPLASH_MIN_MS)
  isLaunching.value = true
  await delay(820)
  bootGate.value = 'ready'
}

const checkLicense = async ({ splash = false } = {}) => {
  try {
    if (!window.api?.checkLicenseStatus) {
      isActivated.value = false
      licenseInfo.value = null
      return false
    }
    const res = await window.api.checkLicenseStatus()
    if (res && res.isActivated) {
      isActivated.value = true
      licenseInfo.value = res
      return true
    }
    isActivated.value = false
    licenseInfo.value = null
    return false
  } catch (err) {
    console.error('License check error:', err)
    isActivated.value = false
    return false
  } finally {
    if (splash && isActivated.value) {
      await playRocket()
    } else if (splash) {
      bootGate.value = 'activate'
    }
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

const handleActivated = async (data) => {
  try {
    localStorage.setItem(ACTIVATED_FLAG, '1')
  } catch {
    /* ignore localStorage write failure */
  }
  isActivated.value = true
  licenseInfo.value = data
  activeTab.value = 'dashboard'
  await reconnectSocket()
  await playRocket()
}

const handleDeactivate = async () => {
  if (confirm('Bạn có chắc chắn muốn khóa key bản quyền và đăng xuất khỏi ứng dụng?')) {
    try {
      await window.api.deactivateLicense()
      try {
        localStorage.removeItem(ACTIVATED_FLAG)
      } catch {
        /* ignore localStorage removal failure */
      }
      isActivated.value = false
      licenseInfo.value = null
      bootGate.value = 'activate'
    } catch (err) {
      console.error('Failed to deactivate:', err)
    }
  }
}

const { connected: socketConnected, reconnect: reconnectSocket } = useSocket({
  // Admin thu hồi / vô hiệu key → buộc app logout ngay
  license_revoked: async () => {
    try {
      await window.api?.deactivateLicense?.()
    } catch (error) {
      console.warn('Unable to deactivate revoked license:', error)
    }
    revokedAlert.value = true
    isActivated.value = false
    licenseInfo.value = null
    bootGate.value = 'activate'
    setTimeout(() => {
      revokedAlert.value = false
    }, 8000)
  },

  // Admin cập nhật key → re-verify để bắt hết hạn, disabled, v.v.
  license_updated: async () => {
    if (!isActivated.value) return
    await checkLicense()
  }
})

onMounted(() => {
  checkLicense({ splash: true })
  checkAppVersion()
  window.api?.onLicenseRevoked?.(() => {
    revokedAlert.value = true
    isActivated.value = false
    licenseInfo.value = null
    bootGate.value = 'activate'
    setTimeout(() => {
      revokedAlert.value = false
    }, 8000)
  })
})
</script>

<template>
  <ActivationModal v-if="bootGate === 'activate'" @activated="handleActivated" />
  <RocketLaunch
    v-else-if="bootGate === 'rocket'"
    :launching="isLaunching"
    :copy="isActivated ? 'Đang vào khu vực tối ưu' : 'Đang xác thực bản quyền HWID'"
  />

  <template v-else-if="bootGate === 'ready' && isActivated">
    <Transition name="slide-down">
      <div v-if="revokedAlert" class="revoked-alert">
        <span>Key bản quyền đã bị thu hồi hoặc vô hiệu hóa. Liên hệ hỗ trợ để kích hoạt lại.</span>
      </div>
    </Transition>

    <div class="app-shell">
      <div class="hud-grid" aria-hidden="true"></div>

      <header class="hud-top">
        <img class="hud-logo" :src="logo" alt="DAWA" />

        <nav class="hud-nav" aria-label="Main navigation">
          <button
            v-for="item in coreNav"
            :key="item.key"
            class="hud-tab hud-tab-core"
            :class="{ active: activeTab === item.key }"
            type="button"
            @click="activeTab = item.key"
          >
            <component :is="item.icon" :size="15" :stroke-width="1.8" />
            {{ item.label }}
          </button>
          <span class="hud-nav-split" aria-hidden="true"></span>
          <button
            v-for="item in toolNav"
            :key="item.key"
            class="hud-tab"
            :class="{ active: activeTab === item.key }"
            type="button"
            @click="activeTab = item.key"
          >
            <component :is="item.icon" :size="14" :stroke-width="1.8" />
            {{ item.label }}
          </button>
        </nav>

        <div class="hud-top-right">
          <div v-if="licenseInfo?.offlineMode" class="status-badge offline">
            <span class="status-dot"></span>
            OFFLINE
          </div>
          <div v-else class="status-badge activated">
            <span class="status-dot"></span>
            LICENSED
          </div>
          <button class="btn-lock" type="button" @click="handleDeactivate">KHÓA KEY</button>
        </div>
      </header>

      <div class="hud-body">
        <main class="hud-stage">
          <div class="hud-frame">
            <div class="hud-frame-mark">DAWA / {{ pageTitle }}</div>
            <div class="tab-container">
              <KeepAlive>
                <component :is="activeComponent" />
              </KeepAlive>
            </div>
          </div>
        </main>

        <aside class="hud-promo" aria-label="DAWA SHOP">
          <BannerCarousel :banners="verticalBanners" variant="portrait" :interval="4000" />
        </aside>
      </div>

      <footer class="hud-bar">
        <div class="hud-bar-item">
          <span>KEY</span>
          <strong class="sidebar-key">{{ licenseInfo?.keyCode || 'DAWA-ACTIVE-KEY' }}</strong>
        </div>
        <div class="hud-bar-item">
          <span>LINK</span>
          <strong :class="socketConnected ? 'accent-green' : 'accent-rose'">
            {{ socketConnected ? 'SERVER LIVE' : 'OFFLINE' }}
          </strong>
        </div>
        <div v-if="latestVersionInfo.isOutdated" class="hud-bar-item hud-bar-update">
          <span>UPDATE</span>
          <strong>{{ latestVersionInfo.latestVersion }}</strong>
        </div>
        <div class="hud-bar-spacer"></div>
        <div class="hud-bar-item">
          <span>BUILD</span>
          <strong>{{ latestVersionInfo.currentVersion }}</strong>
        </div>
      </footer>
    </div>
  </template>
</template>
