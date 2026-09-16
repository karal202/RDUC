<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Package,
  Files,
  HardDrive,
  Unlock,
  Rocket
} from 'lucide-vue-next'
import { landscapeBanners } from '../assets/banners'
import logo from '../assets/logo.png'

const TYPING_FRAMES = [
  'XXXX-XXXX-XXXX',
  'AXXX-XXXX-XXXX',
  'ABXX-XXXX-XXXX',
  'ABCX-XXXX-XXXX',
  'ABCD-XXXX-XXXX',
  'ABCD-1XXX-XXXX',
  'ABCD-12XX-XXXX',
  'ABCD-123X-XXXX',
  'ABCD-1234-XXXX',
  'ABCD-1234-EXXX',
  'ABCD-1234-EFXX',
  'ABCD-1234-EFGX',
  'ABCD-1234-EFGH'
]
const typingIndex = ref(0)
let typingTimer = null
let erroTimer = null
let succeTimer = null
let focusTimer = null
let progressTimer = null
let progressStage = 0
let extractionTimer = null
let extractionTick = 0

const EXTRACTION_FILES = [
  'system_optimize\\core\\dawa_license_vault.dat',
  'system_optimize\\core\\dawa_master_key.bin',
  'system_optimize\\power_plan\\HighPerf_Gaming.pow',
  'system_optimize\\power_plan\\Latency_0ms.pow',
  'system_optimize\\registry\\kernel_tweaks.reg',
  'system_optimize\\registry\\memory_management.reg',
  'system_optimize\\registry\\svc_host_isolation.reg',
  'system_optimize\\registry\\game_mode_isolation.reg',
  'system_optimize\\registry\\tcp_network_stack.reg',
  'system_optimize\\scripts\\disable_defender_scheduled.ps1',
  'system_optimize\\scripts\\standby_list_clearer.exe',
  'system_optimize\\scripts\\ntfs_large_buffer.cmd',
  'system_optimize\\scripts\\mmcss_scheduler.bat',
  'system_optimize\\scripts\\win32_priority_separator.exe',
  'system_optimize\\scripts\\dpc_latency_reducer.sys',
  'system_optimize\\scripts\\mouse_polling_hid.reg',
  'system_optimize\\drivers\\rtss_overlay_profile.cfg',
  'system_optimize\\drivers\\nvidia_low_latency.nvprof',
  'system_optimize\\drivers\\amd_radeon_anti_lag.agpd',
  'system_optimize\\profiles\\gaming_fps_profile_240hz.cfg',
  'system_optimize\\profiles\\competitive_ping_first.pkg',
  'system_optimize\\cache_cleaner\\temp_file_wipe.ps1',
  'system_optimize\\cache_cleaner\\prefetch_optimizer.exe',
  'system_optimize\\bios_uefi\\restart_to_firmware.efi',
  'system_optimize\\network\\gaming_dns_cache.dat',
  'system_optimize\\network\\ack_tcp_frequency.bat',
  'system_optimize\\input_lag\\keyboard_queue_16.reg',
  'system_optimize\\input_lag\\mouse_queue_10.dat',
  'system_optimize\\restore\\default_services_backup.zip',
  'system_optimize\\restore\\bloatware_services_repair.bat',
  'system_optimize\\windows_update\\wuauserv_reset.ps1',
  'system_optimize\\xbox_app\\xbox_game_bar_disable.reg',
  'system_optimize\\dvr_disable\\game_dvr_registry_block.dat',
  'system_optimize\\smart_app_control\\sac_enforcement.exe',
  'system_optimize\\core_isolation\\vbs_memory_integrity.sys',
  'system_optimize\\system_restore\\sr_toggle.ps1',
  'system_optimize\\hiberfil\\fast_startup_disable.cmd',
  'system_optimize\\superfetch\\sysmain_disable.reg',
  'system_optimize\\prefetch\\enable_prefetch_apps_only.dat',
  'system_optimize\\pagefile\\pagefile_fixed_size.ps1',
  'system_optimize\\visual_effects\\perf_mode_visuals.reg',
  'system_optimize\\transparency\\disable_acrylic_blur.dat',
  'system_optimize\\windows_defender\\realtime_protection_off.ps1',
  'system_optimize\\explorer_ads\\ad_tiles_blocker.reg',
  'system_optimize\\startup_apps\\startup_trim.ps1',
  'system_optimize\\telemetry\\compat_telemetry_disable.dat',
  'system_optimize\\diagnostic_data\\diagnostic_off_level_0.reg',
  'system_optimize\\cortana\\cortana_silent_disable.ps1',
  'system_optimize\\edge_bloat\\edge_remove_features.dat',
  'system_optimize\\onedrive\\onedrive_uninstall_silent.ps1',
  'system_optimize\\bing_search\\disable_bing_copilot.reg',
  'system_optimize\\widgets\\widgets_unpin_all.ps1',
  'system_optimize\\clipboard_history\\clipboard_disable_cloud.dat',
  'system_optimize\\autoplay\\autorun_all_drives_off.reg',
  'system_optimize\\smartscreen\\smartscreen_disable_browser.ps1',
  'system_optimize\\office_ads\\office_uwp_ads_remove.dat',
  'system_optimize\\spotlight\\spotlight_ads_disable.reg',
  'system_optimize\\lock_screen_ads\\lockscreen_remove_content.ps1',
  'system_optimize\\privacy\\app_background_access_block.dat',
  'system_optimize\\location_tracking\\location_service_off.reg',
  'system_optimize\\activity_history\\timeline_disable_feature.ps1',
  'system_optimize\\speech_inking\\typing_insights_off.dat',
  'system_optimize\\tailored_experiences\\dxdiag_telemetry_block.reg',
  'system_optimize\\advertising_id\\advertising_id_reset.ps1',
  'system_optimize\\wifi_sense\\wifi_credential_share_off.dat',
  'system_optimize\\settings_sync\\sync_with_cloud_off.reg',
  'system_optimize\\search_indexer\\indexer_disable_for_gaming.ps1',
  'system_optimize\\superfetch2\\memory_compression_toggle.dat',
  'system_optimize\\ntfs_last_access\\disable_last_access_time.reg',
  'system_optimize\\defragmentation\\ssd_defrag_schedule_off.ps1',
  'system_optimize\\power_hiberfile\\hiberfil_off_75pct.dat',
  'system_optimize\\fast_startup\\fast_boot_disable.reg',
  'system_optimize\\usb_power\\usb_selective_suspend_off.ps1',
  'system_optimize\\pcie_power\\pcie_link_power_disable.dat',
  'system_optimize\\display_power\\monitor_timeout_never.reg',
  'system_optimize\\system_sleep\\sleep_mode_disable.ps1',
  'system_optimize\\mouse_accel\\mouse_sensitivity_threshold_0.reg',
  'system_optimize\\keyboard_delay\\keyboard_delay_0_repeat_31.dat',
  'system_optimize\\game_bar\\game_bar_disable_all.reg',
  'system_optimize\\game_dvr\\game_dvr_broadcast_disable.ps1',
  'system_optimize\\nvidia_sli\\nvidia_low_latency_mode_on.dat',
  'system_optimize\\amd_chill\\amd_anti_lag_plus_enable.reg',
  'system_optimize\\intel_arc\\intel_xe_ss_quality.ps1',
  'system_optimize\\cpu_core_parking\\core_parking_disable.dat',
  'system_optimize\\cpu_efficiency\\efficiency_cores_off_for_games.reg',
  'system_optimize\\intel_tsx\\tsx_instructions_enable.ps1',
  'system_optimize\\spectre_meltdown\\spectre_meltdown_retpoline_off.dat',
  'system_optimize\\memory_compression\\memory_compression_disable.reg',
  'system_optimize\\standby_memory\\standby_list_low_threshold.ps1',
  'system_optimize\\virtual_memory\\virtual_memory_custom_pagefile.dat',
  'system_optimize\\gpu_scheduler\\hardware_accelerated_gpu_scheduling_on.reg',
  'system_optimize\\fullscreen_optimizations\\fullscreen_exclusive_force.ps1',
  'system_optimize\\vulkan_layers\\vulkan_validation_layers_disable.dat',
  'system_optimize\\directx_optimizations\\directx_12_agility_enable.reg',
  'system_optimize\\audio_latency\\audio_driver_latency_reduce.ps1',
  'system_optimize\\ethernet_interrupt\\network_adapter_interrupt_throttle_off.dat',
  'system_optimize\\nagle_algorithm\\tcp_nodelay_disable_nagle.reg',
  'system_optimize\\tcp_chimney\\chimney_offload_disable.ps1',
  'system_optimize\\tcp_rss\\receive_side_scaling_enable.dat',
  'system_optimize\\network_throttling\\nla_throttling_disable.reg',
  'system_optimize\\qos_packet_scheduler\\qos_remove_reserved_bandwidth.ps1',
  'system_optimize\\dns_client\\dns_cache_size_increase.dat',
  'system_optimize\\wlan_power\\wlan_adapter_maximum_performance.reg',
  'system_optimize\\bluetooth_power\\bluetooth_radio_power_ps1.ps1',
  'system_optimize\\security_center\\security_center_silent_tray.dat',
  'system_optimize\\uac\\uac_level_3_prompt.reg',
  'system_optimize\\firewall_defender\\windows_firewall_default_restore.ps1',
  'system_optimize\\bitlocker\\bitlocker_pause_for_gaming.dat',
  'system_optimize\\device_encryption\\device_encryption_postpone.reg',
  'system_optimize\\system_protection\\system_restore_config.ps1',
  'system_optimize\\windows_search\\cortana_cloud_search_off.dat',
  'system_optimize\\windows_defender_exclusions\\gaming_folders_exclusions.ps1',
  'system_optimize\\real_time_protection\\defender_add_temp_exclusions.dat',
  'system_optimize\\cloud_protected\\mpcloud_blocklevel_off.reg',
  'system_optimize\\automatic_sample\\sample_submission_never.ps1',
  'system_optimize\\tamper_protection\\tamper_protection_temporary_off.dat',
  'system_optimize\\scheduled_scans\\defender_schedule_scan_disable.reg',
  'system_optimize\\defender_cloud\\cloud_delivered_protection_off.ps1',
  'system_optimize\\vss_snapshot\\vss_shadow_copy_reduce_size.dat',
  'system_optimize\\winsxs_folder\\winsxs_component_cleanup.ps1',
  'system_optimize\\temp_files\\temp_files_delete_all.dat',
  'system_optimize\\prefetch_run\\prefetch_prefetch_clear.reg',
  'system_optimize\\thumbnails\\thumbnail_cache_clean.ps1',
  'system_optimize\\browser_cache\\browser_cache_wipe_all.dat',
  'system_optimize\\dns_flush\\dns_cache_flush_renew.reg',
  'system_optimize\\winsock_reset\\winsock_reset_catalog.ps1',
  'system_optimize\\recycle_bin\\recycle_bin_auto_empty.dat',
  'system_optimize\\event_logs\\event_logs_clear_security.reg',
  'system_optimize\\error_reporting\\wer_disable_all.ps1',
  'system_optimize\\watson_dumps\\userdumps_disable.dat',
  'system_optimize\\diagnostic_policy\\diagnostic_policy_svc_disable.reg',
  'system_optimize\\ntfs_8dot3\\shortnames_disable_all_volumes.ps1',
  'system_optimize\\last_access\\ntfs_disable_last_access.dat',
  'system_optimize\\prefetch_superfetch_combined\\disable_all_prefetchers.reg'
]
const TOTAL_EXTRACTION_FILES = EXTRACTION_FILES.length
const TOTAL_EXTRACTION_MB = 8192

const PROGRESS_STAGES = [
  {
    target: 10,
    label: 'Đang mở gói cài đặt DAWA-Optimizer-Package.pkg…',
    phase: 'package',
    duration: 480
  },
  {
    target: 26,
    label: 'Kiểm tra checksum SHA-256 gói kích hoạt…',
    phase: 'checksum',
    duration: 720
  },
  {
    target: 52,
    label: 'Giải nén file hệ thống tối ưu (AES-256-GCM)…',
    phase: 'extract',
    duration: 1280
  },
  {
    target: 78,
    label: 'Ghi file vào secure vault & thiết bị đăng ký…',
    phase: 'install',
    duration: 1080
  },
  {
    target: 94,
    label: 'Kích hoạt bản quyền & ký giấy phép thiết bị…',
    phase: 'license',
    duration: 900
  }
]

const EXTRACTION_PHASE_META = {
  package: { icon: Package, tint: '#f59e0b' },
  checksum: { icon: Files, tint: '#06b6d4' },
  extract: { icon: Unlock, tint: '#8b5cf6' },
  install: { icon: HardDrive, tint: '#22d3ee' },
  license: { icon: ShieldCheck, tint: '#4ade80' },
  done: { icon: CheckCircle2, tint: '#4ade80' },
  failed: { icon: ShieldAlert, tint: '#f87171' }
}

const keyCode = ref('')
const fingerprint = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const inputRef = ref(null)
const justErrored = ref(false)
const justSucceeded = ref(false)
const activationProgress = ref(0)
const activationStep = ref('')
const activationPhase = ref('package')
const extractionFileIdx = ref(0)
const extractionFileName = ref(EXTRACTION_FILES[0])
const extractionMbCounter = ref(0)
const extractionRecent = ref([])

const markState = computed(() => {
  if (successMessage.value || justSucceeded.value) return 'success'
  if (errorMessage.value || justErrored.value) return 'error'
  return 'default'
})

const displayPlaceholder = computed(() => {
  if (isLoading.value) return '••••-••••-••••'
  return TYPING_FRAMES[typingIndex.value]
})

const extractionFileFraction = computed(
  () => `${extractionFileIdx.value}/${TOTAL_EXTRACTION_FILES}`
)
const extractionMbFraction = computed(
  () =>
    `${extractionMbCounter.value.toLocaleString()} MB / ${TOTAL_EXTRACTION_MB.toLocaleString()} MB`
)
const currentPhaseMeta = computed(
  () => EXTRACTION_PHASE_META[activationPhase.value] || EXTRACTION_PHASE_META.package
)

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

const pushRecentFile = (name) => {
  extractionRecent.value.unshift(name)
  if (extractionRecent.value.length > 5) extractionRecent.value.pop()
}

const startExtractionSim = () => {
  stopExtractionSim()
  extractionTick = 0
  extractionFileIdx.value = 0
  extractionMbCounter.value = 0
  extractionFileName.value = EXTRACTION_FILES[0]
  extractionRecent.value = [EXTRACTION_FILES[0]]

  extractionTimer = setInterval(() => {
    extractionTick += 1
    const pct = activationProgress.value
    const filesInWindow = Math.max(
      1,
      Math.round(TOTAL_EXTRACTION_FILES * Math.max(0.02, pct / 140))
    )
    const nextIdx = Math.min(
      TOTAL_EXTRACTION_FILES - 1,
      Math.floor(
        (filesInWindow + extractionTick * (pct < 18 ? 2 : pct < 56 ? 5 : 4)) %
          TOTAL_EXTRACTION_FILES
      )
    )
    extractionFileIdx.value = Math.max(extractionFileIdx.value, nextIdx)
    extractionFileName.value = EXTRACTION_FILES[extractionFileIdx.value]
    pushRecentFile(extractionFileName.value)
    extractionMbCounter.value = Math.min(
      TOTAL_EXTRACTION_MB,
      Math.round(TOTAL_EXTRACTION_MB * (pct / 100)) + (extractionTick % 3)
    )
  }, 85)
}

const stopExtractionSim = () => {
  if (extractionTimer) {
    clearInterval(extractionTimer)
    extractionTimer = null
  }
}

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

  window.api.checkActivation().then((result) => {
    if (result.isActivated) {
      window.api.closeLicenseWindow()
    }
  })
})

const startProgress = () => {
  stopProgress()
  activationProgress.value = 0
  progressStage = 0
  activationPhase.value = PROGRESS_STAGES[0].phase
  activationStep.value = PROGRESS_STAGES[0].label
  startExtractionSim()

  const runStage = () => {
    if (progressStage >= PROGRESS_STAGES.length) return
    const { target, label, duration, phase } = PROGRESS_STAGES[progressStage]
    activationPhase.value = phase
    activationStep.value = label
    const startValue = activationProgress.value
    const startTs = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTs
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      activationProgress.value = Math.round(startValue + (target - startValue) * eased)
      if (t < 1) {
        progressTimer = setTimeout(tick, 16)
      } else {
        progressStage += 1
        if (progressStage < PROGRESS_STAGES.length) {
          progressTimer = setTimeout(runStage, 120)
        }
      }
    }
    tick()
  }
  runStage()
}

const stopProgress = (complete = false) => {
  if (progressTimer) {
    clearTimeout(progressTimer)
    progressTimer = null
  }
  if (complete) {
    activationProgress.value = 100
    activationPhase.value = 'done'
    activationStep.value = 'Hoàn tất — Đang khởi chạy DAWA Optimizer…'
    extractionFileIdx.value = TOTAL_EXTRACTION_FILES
    extractionMbCounter.value = TOTAL_EXTRACTION_MB
    extractionFileName.value = 'system_optimize\\license\\DAWA-License-Signed.crt'
    pushRecentFile(extractionFileName.value)
    setTimeout(stopExtractionSim, 900)
  } else {
    activationPhase.value = 'failed'
    stopExtractionSim()
  }
}

onBeforeUnmount(() => {
  stopTyping()
  stopProgress()
  stopExtractionSim()
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
  startProgress()

  try {
    const res = await window.api.activateFromWindow(keyCode.value.trim())
    if (res.success) {
      stopProgress(true)
      successMessage.value = res.message || 'Kích hoạt bản quyền thành công.'
      setTimeout(() => {
        window.api.closeLicenseWindow()
      }, 1600)
    } else {
      stopProgress(false)
      errorMessage.value = res.message || 'Key không hợp lệ hoặc đã hết hạn.'
      startTyping()
    }
  } catch (err) {
    stopProgress(false)
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

          <Transition name="progress-fade">
            <div
              v-if="isLoading"
              class="extraction-progress"
              :class="{
                'is-done': activationPhase === 'done',
                'is-failed': activationPhase === 'failed'
              }"
              role="progressbar"
              :aria-valuenow="activationProgress"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div class="extraction-header">
                <div class="extraction-title">
                  <component
                    :is="currentPhaseMeta.icon"
                    :size="18"
                    :stroke-width="2"
                    :style="{ color: currentPhaseMeta.tint }"
                  />
                  <span class="extraction-title-text" :style="{ color: currentPhaseMeta.tint }">
                    {{
                      activationPhase === 'package'
                        ? 'MỞ GÓI CÀI ĐẶT'
                        : activationPhase === 'checksum'
                          ? 'KIỂM TRA CHECKSUM'
                          : activationPhase === 'extract'
                            ? 'ĐANG GIẢI NÉN HỆ THỐNG'
                            : activationPhase === 'install'
                              ? 'GHI FILE VÀO Ổ ĐĨA'
                              : activationPhase === 'license'
                                ? 'KÝ GIẤY PHÉP THIẾT BỊ'
                                : activationPhase === 'done'
                                  ? 'HOÀN TẤT CÀI ĐẶT'
                                  : 'CÀI ĐẶT LỖI'
                    }}
                  </span>
                </div>
                <span class="extraction-percent">{{ activationProgress }}%</span>
              </div>

              <div class="extraction-body">
                <div class="extraction-stats">
                  <div class="extraction-stat">
                    <div class="stat-label">FILE ĐÃ GIẢI NÉN</div>
                    <div class="stat-value">{{ extractionFileFraction }}</div>
                  </div>
                  <div class="extraction-stat">
                    <div class="stat-label">DUNG LƯỢNG</div>
                    <div class="stat-value">{{ extractionMbFraction }}</div>
                  </div>
                  <div class="extraction-stat">
                    <div class="stat-label">GÓI KÍCH HOẠT</div>
                    <div class="stat-value stat-value-pkg">DAWA-Optimizer-v1.2.pkg</div>
                  </div>
                </div>

                <div class="extraction-log">
                  <div class="extraction-log-header">
                    <span>FILE ĐANG XỬ LÝ</span>
                    <Loader2
                      v-if="activationPhase !== 'done' && activationPhase !== 'failed'"
                      :size="11"
                      class="inline-spin"
                      :stroke-width="2.5"
                    />
                    <CheckCircle2
                      v-else-if="activationPhase === 'done'"
                      :size="11"
                      :stroke-width="2.5"
                      class="text-emerald"
                    />
                    <ShieldAlert v-else :size="11" :stroke-width="2.5" class="text-rose" />
                  </div>
                  <div class="extraction-log-current">
                    <Files :size="13" :stroke-width="2" class="log-icon" />
                    <span class="log-path mono">{{ extractionFileName }}</span>
                  </div>
                  <ul class="extraction-log-recent">
                    <li v-for="(f, i) in extractionRecent.slice(1)" :key="i">
                      <span class="log-marker" :style="{ opacity: 1 - (i + 1) * 0.18 }"></span>
                      <span class="mono log-recent-path" :style="{ opacity: 1 - (i + 1) * 0.18 }">{{
                        f
                      }}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div class="extraction-track-wrap">
                <div class="extraction-track">
                  <div class="extraction-fill" :style="{ width: activationProgress + '%' }">
                    <div class="extraction-fill-inner"></div>
                    <div class="extraction-shimmer"></div>
                    <div
                      class="extraction-rocket"
                      :style="{ color: activationPhase === 'failed' ? '#f87171' : '#fde047' }"
                    >
                      <Rocket :size="14" :stroke-width="2.4" />
                    </div>
                  </div>
                  <div class="extraction-glow" :style="{ width: activationProgress + '%' }"></div>
                </div>
              </div>

              <div class="extraction-phase-label">
                <span
                  class="extraction-phase-dot"
                  :style="{ background: currentPhaseMeta.tint }"
                ></span>
                {{ activationStep }}
              </div>
            </div>
          </Transition>

          <button
            class="btn-primary activation-submit"
            :disabled="isLoading || !!successMessage"
            type="submit"
          >
            <KeyRound v-if="!isLoading" :size="16" :stroke-width="2" />
            <span v-if="isLoading" class="submit-row">
              <Rocket :size="16" :stroke-width="2.2" />
              Đang cài đặt gói kích hoạt {{ activationProgress }}%
            </span>
            <span v-else>Kích hoạt</span>
          </button>
        </form>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
/* ========== Shared activation layout (match ActivationModal) ========== */
.activation-screen {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  align-items: stretch;
  background: #07070a;
  overflow: hidden;
  position: relative;
}

@media (max-width: 820px) {
  .activation-screen {
    grid-template-columns: 1fr;
  }
  .activation-art {
    max-height: 260px;
  }
}

.activation-orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.activation-screen::before {
  content: '';
  position: absolute;
  width: 520px;
  height: 520px;
  top: -180px;
  left: -140px;
  background: radial-gradient(circle, rgba(22, 119, 255, 0.65) 0%, rgba(22, 119, 255, 0) 65%);
  animation: orb-float-a 25s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}
.activation-screen::after {
  content: '';
  position: absolute;
  width: 620px;
  height: 620px;
  bottom: -240px;
  right: -180px;
  background: radial-gradient(circle, rgba(0, 194, 255, 0.55) 0%, rgba(0, 194, 255, 0) 62%);
  animation: orb-float-b 30s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
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
    rgba(15, 23, 42, 0.22) 0%,
    rgba(2, 6, 23, 0.72) 60%,
    rgba(0, 0, 0, 0.9) 100%
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
  padding: 40px 36px;
  color: #fff;
}

.activation-logo {
  width: 72px;
  height: 72px;
  margin-bottom: 18px;
  filter: drop-shadow(0 8px 24px rgba(22, 119, 255, 0.4));
}

.activation-art-copy h1 {
  font:
    800 32px 'Archivo',
    sans-serif;
  margin: 0 0 10px;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.activation-art-copy p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.78);
  margin: 0;
  line-height: 1.6;
  max-width: 360px;
}

.activation-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: rgba(15, 23, 42, 0.65);
  border-left: 1px solid rgba(148, 163, 184, 0.14);
  padding: 44px 40px 40px;
  width: 100%;
  z-index: 2;
  backdrop-filter: blur(14px) saturate(1.1);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
  animation: activation-enter 520ms cubic-bezier(0.16, 1, 0.3, 1);
  overflow-y: auto;
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
  font: 600 10px var(--font-mono);
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.activation-device-specs dd {
  font: 500 13px var(--font-mono);
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
  font: 600 13px var(--font-sans);
  color: #cbd5e1;
}

.key-field-count {
  font: 500 11px var(--font-mono);
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
  font: 700 12px var(--font-mono);
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
  font: 500 14px var(--font-mono);
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

/* ========== Extraction / Installer-themed progress ========== */
.submit-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.inline-spin {
  display: inline-block;
  animation: spin-360 0.9s linear infinite;
}
.text-emerald {
  color: #4ade80;
}
.text-rose {
  color: #f87171;
}
.mono {
  font-family: 'JetBrains Mono', 'Courier New', ui-monospace, monospace;
}

@keyframes spin-360 {
  to {
    transform: rotate(360deg);
  }
}

.extraction-progress {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%);
  border: 1px solid rgba(99, 102, 241, 0.28);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 18px 48px rgba(99, 102, 241, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.extraction-progress::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 92, 246, 0.07) 1px, transparent 1px);
  background-size: 22px 22px;
  pointer-events: none;
  mask-image: radial-gradient(ellipse at 50% 0%, #000 0%, transparent 72%);
  opacity: 0.9;
}

.extraction-progress.is-done {
  border-color: rgba(34, 197, 94, 0.45);
  box-shadow:
    0 18px 48px rgba(34, 197, 94, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.extraction-progress.is-failed {
  border-color: rgba(248, 113, 113, 0.45);
  box-shadow:
    0 18px 48px rgba(248, 113, 113, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.extraction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.extraction-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.extraction-title-text {
  font:
    700 11.5px 'Archivo',
    sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.extraction-percent {
  font:
    800 18px 'Archivo',
    sans-serif;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  text-shadow: 0 0 14px rgba(168, 85, 247, 0.45);
}

.extraction-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.extraction-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.extraction-stat {
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  padding: 8px 10px;
}
.stat-label {
  font:
    600 9.5px 'Archivo',
    sans-serif;
  color: #64748b;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.stat-value {
  font:
    600 12px 'JetBrains Mono',
    monospace;
  color: #e2e8f0;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.stat-value-pkg {
  color: #c4b5fd;
  text-shadow: 0 0 10px rgba(139, 92, 246, 0.25);
}

.extraction-log {
  background: rgba(2, 6, 23, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 9px;
  padding: 10px 11px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.extraction-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font:
    700 10px 'Archivo',
    sans-serif;
  color: #818cf8;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.extraction-log-current {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.14) 0%, rgba(99, 102, 241, 0.06) 100%);
  border-radius: 6px;
  border-left: 2px solid rgba(139, 92, 246, 0.7);
}
.log-icon {
  color: #a78bfa;
  flex-shrink: 0;
}
.log-path {
  font-size: 11.5px;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  direction: rtl;
  text-align: left;
}

.extraction-log-recent {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 78px;
  overflow: hidden;
}
.extraction-log-recent li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 4px;
}
.log-marker {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #6366f1;
  flex-shrink: 0;
}
.log-recent-path {
  font-size: 10.5px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  direction: rtl;
  text-align: left;
}

.extraction-track-wrap {
  position: relative;
  z-index: 1;
}

.extraction-track {
  position: relative;
  width: 100%;
  height: 14px;
  border-radius: 999px;
  overflow: visible;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.95) 100%);
  box-shadow:
    inset 0 2px 3px rgba(0, 0, 0, 0.5),
    inset 0 0 0 1px rgba(99, 102, 241, 0.15);
  border-radius: 999px;
}

.extraction-fill {
  position: absolute;
  inset: 3px auto 3px 3px;
  min-width: 6%;
  border-radius: 999px;
  overflow: hidden;
  transition: width 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.extraction-progress.is-done .extraction-fill {
  background: linear-gradient(90deg, #16a34a 0%, #22c55e 55%, #4ade80 100%);
}
.extraction-progress.is-failed .extraction-fill {
  background: linear-gradient(90deg, #dc2626 0%, #ef4444 55%, #f87171 100%);
}
.extraction-fill:not(.is-done, .is-failed),
.extraction-progress:not(.is-done):not(.is-failed) .extraction-fill {
  background: linear-gradient(90deg, #22d3ee 0%, #6366f1 38%, #a855f7 72%, #ec4899 100%);
}

.extraction-fill-inner {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.35) 0%,
    rgba(255, 255, 255, 0.08) 45%,
    rgba(0, 0, 0, 0.18) 100%
  );
  box-shadow:
    inset 0 -1px 0 rgba(0, 0, 0, 0.25),
    inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.extraction-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 42%,
    rgba(255, 255, 255, 0.52) 50%,
    rgba(255, 255, 255, 0.2) 58%,
    transparent 100%
  );
  background-size: 240% 100%;
  transform: translateX(-60%);
  animation: extraction-shimmer 1.35s ease-in-out infinite;
  mix-blend-mode: overlay;
  opacity: 0.95;
}
@keyframes extraction-shimmer {
  0% {
    transform: translateX(-75%);
  }
  60%,
  100% {
    transform: translateX(75%);
  }
}

.extraction-rocket {
  position: absolute;
  right: -2px;
  top: 50%;
  transform: translateY(-50%) rotate(-45deg);
  filter: drop-shadow(0 2px 6px rgba(253, 224, 71, 0.65))
    drop-shadow(0 0 10px rgba(253, 224, 71, 0.5));
  animation: rocket-bob 0.7s ease-in-out infinite alternate;
  pointer-events: none;
}
.extraction-progress.is-failed .extraction-rocket {
  animation: rocket-shake 0.4s ease-in-out infinite alternate;
  transform: translateY(-50%) rotate(135deg);
}
@keyframes rocket-bob {
  from {
    transform: translateY(-62%) rotate(-45deg);
  }
  to {
    transform: translateY(-38%) rotate(-45deg);
  }
}
@keyframes rocket-shake {
  from {
    transform: translateY(-58%) rotate(130deg);
  }
  to {
    transform: translateY(-42%) rotate(140deg);
  }
}

.extraction-glow {
  position: absolute;
  inset: 0 auto 0 0;
  min-width: 6%;
  height: 100%;
  border-radius: 999px;
  background: radial-gradient(
    ellipse at right center,
    rgba(168, 85, 247, 0.55) 0%,
    rgba(99, 102, 241, 0) 72%
  );
  filter: blur(10px);
  pointer-events: none;
  opacity: 0.9;
}
.extraction-progress.is-done .extraction-glow {
  background: radial-gradient(
    ellipse at right center,
    rgba(74, 222, 128, 0.6) 0%,
    rgba(34, 197, 94, 0) 72%
  );
}
.extraction-progress.is-failed .extraction-glow {
  background: radial-gradient(
    ellipse at right center,
    rgba(248, 113, 113, 0.55) 0%,
    rgba(239, 68, 68, 0) 72%
  );
}

.extraction-phase-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font:
    500 12px 'Inter',
    sans-serif;
  color: #cbd5e1;
  position: relative;
  z-index: 1;
}
.extraction-phase-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
  flex-shrink: 0;
}

.progress-fade-enter-active,
.progress-fade-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.progress-fade-enter-from,
.progress-fade-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
}
</style>
