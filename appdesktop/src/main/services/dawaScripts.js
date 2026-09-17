import { execFile, spawn } from 'child_process'
import { readdir, rm } from 'fs/promises'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join, sep as pathSep } from 'path'
import { createDecipheriv, createHmac, randomBytes } from 'crypto'
import { tmpdir } from 'os'

const DAWA_SCRIPT_AES_PEPPER_2026 = 'D4W4_SCR1P7_A3S_P3PP3R_2026_K3RN3L_3NCRYPT'
const BUILD_SALT = 'DAWA_OPTIMIZER_SCRIPT_BUILD_2026_V1'

function deriveScriptKey() {
  const hmac = createHmac('sha256', DAWA_SCRIPT_AES_PEPPER_2026)
  hmac.update(BUILD_SALT)
  return hmac.digest()
}

function decryptAesGcmBase64(b64) {
  const key = deriveScriptKey()
  const packed = Buffer.from(b64, 'base64')
  if (packed.length < 28) throw new Error('Malformed encrypted blob')
  const nonce = packed.subarray(0, 12)
  const tag = packed.subarray(12, 28)
  const ciphertext = packed.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key, nonce)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

function resolveScriptDirectory() {
  if (process.resourcesPath) {
    const packagedPath = join(process.resourcesPath, 'scripts')
    if (existsSync(packagedPath)) return packagedPath

    const altPackagedPath = join(process.resourcesPath, 'resources', 'scripts')
    if (existsSync(altPackagedPath)) return altPackagedPath
  }

  const devPath = join(__dirname, '..', '..', 'resources', 'scripts')
  if (existsSync(devPath)) return devPath

  const altDevPath = join(process.cwd(), 'resources', 'scripts')
  if (existsSync(altDevPath)) return altDevPath

  return devPath
}

function resolveEncryptedScriptsDir() {
  if (process.resourcesPath) {
    const packaged = join(process.resourcesPath, 'scripts-enc')
    if (existsSync(packaged)) return packaged
    const alt = join(process.resourcesPath, 'resources', 'scripts-enc')
    if (existsSync(alt)) return alt
  }
  const buildDir = join(__dirname, '..', '..', 'build', 'encrypted-scripts')
  if (existsSync(buildDir)) return buildDir
  return null
}

const SCRIPT_DIRECTORY = resolveScriptDirectory()
const ENC_SCRIPTS_DIR = resolveEncryptedScriptsDir()
const USE_ENCRYPTED_SCRIPTS = Boolean(ENC_SCRIPTS_DIR)
let _manifestCache = null
function getManifest() {
  if (_manifestCache) return _manifestCache
  if (!USE_ENCRYPTED_SCRIPTS) {
    _manifestCache = null
    return null
  }
  try {
    const manifestPath = join(ENC_SCRIPTS_DIR, 'scripts-manifest.dat')
    const b64 = readFileSync(manifestPath, 'utf8')
    const jsonBuf = decryptAesGcmBase64(b64)
    _manifestCache = JSON.parse(jsonBuf.toString('utf8'))
    return _manifestCache
  } catch (err) {
    console.warn('[scripts] Manifest load failed, fallback to plaintext mode:', err.message)
    _manifestCache = null
    return null
  }
}

const stagedTempFiles = new Set()
function cleanupAllStaged() {
  for (const p of stagedTempFiles) {
    try {
      unlinkSync(p)
    } catch {
      /* noop */
    }
  }
  stagedTempFiles.clear()
}
if (typeof process !== 'undefined') {
  process.on('exit', cleanupAllStaged)
  process.on('uncaughtExceptionMonitor', cleanupAllStaged)
  process.on('SIGINT', () => {
    cleanupAllStaged()
    process.exit(130)
  })
}

let _licenseGate = null
export function setLicenseValidator(checkFn) {
  _licenseGate = checkFn
}

async function checkLicenseGate() {
  if (typeof _licenseGate !== 'function') return true
  try {
    return await _licenseGate()
  } catch (err) {
    console.warn('[license-gate] validator error:', err.message)
    return false
  }
}

const LICENSE_REQUIRED_MESSAGE =
  'Vui long kich hoat ban quyen DAWA Optimizer truoc khi su dung tinh nang nay.'

async function decryptAndStageScript(manifestRelPath) {
  const manifest = getManifest()
  if (USE_ENCRYPTED_SCRIPTS && manifest) {
    const entry = manifest[manifestRelPath]
    if (!entry) {
      throw new Error(`Script key not found in manifest: ${manifestRelPath}`)
    }
    const encFullPath = join(ENC_SCRIPTS_DIR, entry.encryptedRelPath.split('/').join(pathSep))
    const b64 = readFileSync(encFullPath, 'utf8')
    const decrypted = decryptAesGcmBase64(b64)
    const ext = entry.originalExt || 'tmp'
    const tempPath = join(tmpdir(), `dawa-${randomBytes(12).toString('hex')}.${ext}`)
    writeFileSync(tempPath, decrypted, { mode: 0o600 })
    stagedTempFiles.add(tempPath)
    return {
      tempPath,
      cleanup() {
        try {
          unlinkSync(tempPath)
        } catch {
          /* noop */
        }
        stagedTempFiles.delete(tempPath)
      }
    }
  }
  const plainPath = join(SCRIPT_DIRECTORY, ...manifestRelPath.split('/'))
  return {
    tempPath: plainPath,
    cleanup() {
      /* noop for dev plaintext fallback */
    }
  }
}

const WINDOWS_SYSTEM_DIRECTORY = process.env.SystemRoot || 'C:\\Windows'
const WINDOWS_COMMANDS = Object.freeze({
  powercfg: join(WINDOWS_SYSTEM_DIRECTORY, 'System32', 'powercfg.exe'),
  sc: join(WINDOWS_SYSTEM_DIRECTORY, 'System32', 'sc.exe'),
  reg: join(WINDOWS_SYSTEM_DIRECTORY, 'System32', 'reg.exe'),
  cmd: join(WINDOWS_SYSTEM_DIRECTORY, 'System32', 'cmd.exe')
})
const RAM_PROFILES = Object.freeze({
  2: 'Optimizer/Ram Optimization/2GB RAM.reg',
  3: 'Optimizer/Ram Optimization/3GB RAM.reg',
  4: 'Optimizer/Ram Optimization/4GB Ram.reg',
  6: 'Optimizer/Ram Optimization/6GB Ram.reg',
  8: 'Optimizer/Ram Optimization/8GB Ram.reg',
  10: 'Optimizer/Ram Optimization/10GB RAM.reg',
  12: 'Optimizer/Ram Optimization/12GB Ram.reg',
  16: 'Optimizer/Ram Optimization/16GB Ram.reg',
  20: 'Optimizer/Ram Optimization/20GB Ram.reg',
  24: 'Optimizer/Ram Optimization/24GB Ram.reg',
  32: 'Optimizer/Ram Optimization/32GB Ram.reg',
  48: 'Optimizer/Ram Optimization/48GB RAM.reg',
  64: 'Optimizer/Ram Optimization/64GB Ram.reg',
  reset: 'Optimizer/Ram Optimization/Reset to Default.reg'
})
const WIN32_PRIORITY_PROFILES = Object.freeze({
  default: 'Optimizer/8. Win32Priority/2 hex Default.reg',
  14: 'Optimizer/8. Win32Priority/14 hex.reg',
  15: 'Optimizer/8. Win32Priority/15 Hex.reg',
  16: 'Optimizer/8. Win32Priority/16 hex.reg',
  18: 'Optimizer/8. Win32Priority/18 Hex.reg',
  19: 'Optimizer/8. Win32Priority/19 Hex.reg',
  '1a': 'Optimizer/8. Win32Priority/1a Hex.reg',
  24: 'Optimizer/8. Win32Priority/24 Hex.reg',
  25: 'Optimizer/8. Win32Priority/25 Hex.reg',
  26: 'Optimizer/8. Win32Priority/26 hex.reg',
  28: 'Optimizer/8. Win32Priority/28 hex.reg',
  '2a': 'Optimizer/8. Win32Priority/2a hex.reg',
  fa2a2a: 'Optimizer/8. Win32Priority/fa2a2a hex.reg',
  fa332a: 'Optimizer/8. Win32Priority/fa332a hex.reg',
  fb000000: 'Optimizer/8. Win32Priority/fb000000 hex.reg',
  fff9887: 'Optimizer/8. Win32Priority/fff9887 hex.reg'
})
const POWER_PLAN_PROFILES = Object.freeze({
  'dawa-ultimate': 'Optimizer/4. PowerPlan/Dawa_Utilmate.pow',
  atlas: 'Optimizer/4. PowerPlan/Atlas.pow',
  'bitsum-highest': 'Optimizer/4. PowerPlan/Bitsum-Highest-Performance.pow',
  'amitv3-idle': 'Optimizer/4. PowerPlan/Amitv3IdleEnabled.pow',
  'framesync-boost': 'Optimizer/4. PowerPlan/FrameSyncBoost.pow'
})
const REGISTRY_FILE_PROFILES = Object.freeze({
  'network-full-tweaks': 'Network/Network Tweaks.reg',
  'network-fast-send': 'Network/FastSendDatagramThreshold.reg',
  'mouse-queue-10': 'Input Lag/Mouse/DataQueueSize/10 Decimal.reg',
  'mouse-queue-20': 'Input Lag/Mouse/DataQueueSize/20 Decimal.reg',
  'mouse-queue-22': 'Input Lag/Mouse/DataQueueSize/22 Decimal.reg',
  'mouse-queue-25': 'Input Lag/Mouse/DataQueueSize/25 Decimal.reg',
  'mouse-queue-default': 'Input Lag/Mouse/DataQueueSize/Default Windows.reg',
  'keyboard-queue-10': 'Input Lag/Keyboard/DataQueueSize/10 Decimal.reg',
  'keyboard-queue-15': 'Input Lag/Keyboard/DataQueueSize/15 Decimal.reg',
  'keyboard-queue-20': 'Input Lag/Keyboard/DataQueueSize/20 Decimal.reg',
  'keyboard-queue-22': 'Input Lag/Keyboard/DataQueueSize/22 Decimal.reg',
  'keyboard-queue-25': 'Input Lag/Keyboard/DataQueueSize/25 Decimal.reg',
  'keyboard-queue-default': 'Input Lag/Keyboard/DataQueueSize/Default Windows.reg',
  'input-avx': 'Input Lag/Reduce Input Lag/AVX.reg',
  'input-cache': 'Input Lag/Reduce Input Lag/Cache.reg',
  'input-desktop': 'Input Lag/Reduce Input Lag/Desktop.reg',
  'input-low-latency': 'Input Lag/Reduce Input Lag/LowLatency.reg',
  'input-misc': 'Input Lag/Reduce Input Lag/Misc.reg',
  'input-scripts': 'Input Lag/Reduce Input Lag/Scripts.reg',
  'input-system': 'Input Lag/Reduce Input Lag/System.reg',
  'win-desktop-settings': 'Optimizer/3. Windows Settings/Desktop Settings.reg',
  'win-disable-maintenance': 'Optimizer/3. Windows Settings/Disable Automatic Maintenance.reg',
  'win-disable-background-apps': 'Optimizer/3. Windows Settings/Disable Background Apps.reg',
  'win-enable-background-apps': 'Optimizer/3. Windows Settings/Enable Background Apps.reg',
  'win-disable-timer-coalescing':
    'Optimizer/3. Windows Settings/Disable CoalescingTimerInterval.reg',
  'win-disable-cpu-throttling': 'Optimizer/3. Windows Settings/Disable CpuPwrThrottling.reg',
  'win-enable-cpu-throttling': 'Optimizer/3. Windows Settings/Enable CpuPwrThrottling.reg',
  'win-disable-driver-updates': 'Optimizer/3. Windows Settings/Disable Drivers Updates.reg',
  'win-disable-extra-services':
    'Optimizer/3. Windows Settings/Disable Extra Unnecessary Services.reg',
  'win-enable-extra-services':
    'Optimizer/3. Windows Settings/Enable Extra Unnecessary Services.reg',
  'win-enable-driver-updates': 'Optimizer/3. Windows Settings/Enable Drivers Updates.reg',
  'win-disable-memory-mirroring': 'Optimizer/3. Windows Settings/Disable MemoryMirroring.reg',
  'win-disable-network-throttling': 'Optimizer/3. Windows Settings/Disable NetworkThrottling.reg',
  'win-disable-notifications': 'Optimizer/3. Windows Settings/Disable NotificationCenter.reg',
  'win-enable-notifications': 'Optimizer/3. Windows Settings/Enable NotificationCenter.reg',
  'win-disable-runtime-broker': 'Optimizer/3. Windows Settings/Disable Runtime Broker.reg',
  'win-disable-spectre-meltdown': 'Optimizer/3. Windows Settings/Disable Spectre and Meltdown.reg',
  'win-disable-sync': 'Optimizer/3. Windows Settings/Disable Sync.reg',
  'win-disable-windows-apps': 'Optimizer/3. Windows Settings/Disable Windows Apps.reg',
  'win-fine-memory-quota': 'Optimizer/3. Windows Settings/FineGrainedMemoryQuota.reg',
  'win-large-page': 'Optimizer/3. Windows Settings/LargePage.reg',
  'win-low-latency': 'Optimizer/3. Windows Settings/Low Latency.reg',
  'win-memory-management': 'Optimizer/3. Windows Settings/Memory Management.reg',
  'win-perf-boost-mode': 'Optimizer/3. Windows Settings/PerfBoostMode.reg',
  'win-power-settings': 'Optimizer/3. Windows Settings/Power Settings.reg',
  'win-prioritize-gpu': 'Optimizer/3. Windows Settings/Prioritize GPU.reg',
  'classic-menu-win10': 'Tool&cache/Classic Right Click Menu/Windows 10.reg',
  'classic-menu-win11': 'Tool&cache/Classic Right Click Menu/Windows 11.reg',
  'restore-gamer-services': 'Restore/Disable Services For Gamers Restore.reg',
  'restore-professional-services': 'Restore/Disable Services For Professionals Restore.reg',
  'network-tcp-ping': 'Network/AckTicksandAckFrequency.reg',
  'network-ack-ticks': 'Network/AckTicksandAckFrequency.reg',
  'network-acks-freq': 'Network/AckTicksandAckFrequency.reg',
  'network-fast-send-reg': 'Network/FastSendDatagramThreshold.reg',
  'network-tweaks-reg': 'Network/Network Tweaks.reg',
  'network-dns': 'Network/DNS.cmd',
  'network-flush-dns': 'Network/DNS.cmd',
  'network-dns-gaming': 'Network/DNS.cmd',
  'win-enable-maintenance': 'Optimizer/3. Windows Settings/Enable Automatic Maintenance.reg',
  'win-enable-timer-coalescing': 'Optimizer/3. Windows Settings/Enable CoalescingTimerInterval.reg',
  'win-enable-hibernation': 'Optimizer/3. Windows Settings/Enable Hibernation.reg',
  'win-enable-memory-mirroring': 'Optimizer/3. Windows Settings/Enable MemoryMirroring.reg',
  'win-enable-network-throttling': 'Optimizer/3. Windows Settings/Enable NetworkThrottling.reg',
  'win-enable-runtime-broker': 'Optimizer/3. Windows Settings/Enable Runtime Broker.reg',
  'win-enable-spectre-meltdown': 'Optimizer/3. Windows Settings/Enable Spectre and Meltdown.reg',
  'win-enable-sync': 'Optimizer/3. Windows Settings/Enable Sync.reg',
  'win-enable-windows-apps': 'Optimizer/3. Windows Settings/Enable Windows Apps.reg',
  'win-disable-transparency': 'Optimizer/3. Windows Settings/Disable Transparency.reg',
  'win-enable-transparency': 'Optimizer/3. Windows Settings/Enable Transparency.reg',
  'win-disable-fso-gamebar': 'Optimizer/3. Windows Settings/Disable FSO Game Bar.reg',
  'win-enable-fso-gamebar': 'Optimizer/3. Windows Settings/Enable FSO Game Bar.reg',
  'win-disable-telemetry': 'Optimizer/3. Windows Settings/Disable Telemetry.reg',
  'win-enable-telemetry': 'Optimizer/3. Windows Settings/Enable Telemetry.reg',
  'win-disable-superfetch': 'Optimizer/3. Windows Settings/Disable Superfetch.reg',
  'win-enable-superfetch': 'Optimizer/3. Windows Settings/Enable Superfetch.reg'
})

export const ALLOWED_DAWA_SCRIPTS = Object.freeze({
  'dawa-gaming-boost': {
    description: 'Tối ưu Gaming High Performance',
    commands: [
      [WINDOWS_COMMANDS.powercfg, ['/s', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c']],
      [
        WINDOWS_COMMANDS.powercfg,
        ['/setacvalueindex', 'SCHEME_CURRENT', 'SUB_PROCESSOR', 'PROCTHROTTLEMIN', '5']
      ],
      [
        WINDOWS_COMMANDS.powercfg,
        ['/setdcvalueindex', 'SCHEME_CURRENT', 'SUB_PROCESSOR', 'PROCTHROTTLEMIN', '5']
      ],
      [WINDOWS_COMMANDS.powercfg, ['/setactive', 'SCHEME_CURRENT']],
      [WINDOWS_COMMANDS.sc, ['config', 'SysMain', 'start=', 'disabled']],
      [WINDOWS_COMMANDS.sc, ['config', 'DiagTrack', 'start=', 'disabled']],
      [
        WINDOWS_COMMANDS.reg,
        [
          'add',
          'HKCU\\Software\\Microsoft\\GameBar',
          '/v',
          'AutoGameModeEnabled',
          '/t',
          'REG_DWORD',
          '/d',
          '1',
          '/f'
        ]
      ]
    ]
  },
  'dawa-power-plan': {
    description: 'Kích hoạt Power Plan Tối Thượng (Tối ưu xung nhịp động)',
    commands: [
      [WINDOWS_COMMANDS.powercfg, ['/s', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c']],
      [
        WINDOWS_COMMANDS.powercfg,
        ['/setacvalueindex', 'SCHEME_CURRENT', 'SUB_PROCESSOR', 'PROCTHROTTLEMIN', '5']
      ],
      [
        WINDOWS_COMMANDS.powercfg,
        ['/setdcvalueindex', 'SCHEME_CURRENT', 'SUB_PROCESSOR', 'PROCTHROTTLEMIN', '5']
      ],
      [WINDOWS_COMMANDS.powercfg, ['/setactive', 'SCHEME_CURRENT']],
      [WINDOWS_COMMANDS.powercfg, ['/change', 'monitor-timeout-ac', '0']],
      [WINDOWS_COMMANDS.powercfg, ['/change', 'standby-timeout-ac', '0']]
    ]
  },
  'bios-bat': {
    description: 'Khởi động vào BIOS bằng file BAT',
    commands: [[WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', 'BIOS/bios.bat']]]
  },
  'win-disable-hibernate': {
    description: 'Tắt Hibernate',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Disable Hibernation.reg']],
      [WINDOWS_COMMANDS.powercfg, ['/h', 'off']]
    ]
  },
  'win-enable-hibernate': {
    description: 'Bật Hibernate',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Enable Hibernation.reg']],
      [WINDOWS_COMMANDS.powercfg, ['/h', 'on']]
    ]
  },
  'win-disable-fso-gamebar': {
    description: 'Tắt Game Bar và Game DVR',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Disable FSO Game Bar.reg']]
    ]
  },
  'win-enable-fso-gamebar': {
    description: 'Bật lại Game Bar và Game DVR',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Enable FSO Game Bar.reg']]
    ]
  },
  'win-disable-telemetry': {
    description: 'Tắt dịch vụ Telemetry',
    commands: [
      [WINDOWS_COMMANDS.sc, ['stop', 'DiagTrack'], { optional: true }],
      [WINDOWS_COMMANDS.sc, ['config', 'DiagTrack', 'start=', 'disabled']]
    ]
  },
  'win-enable-telemetry': {
    description: 'Bật lại dịch vụ Telemetry',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Enable Telemetry.reg']],
      [WINDOWS_COMMANDS.sc, ['config', 'DiagTrack', 'start=', 'auto']]
    ]
  },
  'win-disable-superfetch': {
    description: 'Tắt dịch vụ SysMain',
    commands: [
      [WINDOWS_COMMANDS.sc, ['stop', 'SysMain'], { optional: true }],
      [WINDOWS_COMMANDS.sc, ['config', 'SysMain', 'start=', 'disabled']]
    ]
  },
  'win-enable-superfetch': {
    description: 'Bật lại dịch vụ SysMain',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Enable Superfetch.reg']],
      [WINDOWS_COMMANDS.sc, ['config', 'SysMain', 'start=', 'auto']]
    ]
  },
  'win-disable-transparency': {
    description: 'Tắt hiệu ứng Transparency',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'add',
          'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize',
          '/v',
          'EnableTransparency',
          '/t',
          'REG_DWORD',
          '/d',
          '0',
          '/f'
        ]
      ]
    ]
  },
  'win-enable-transparency': {
    description: 'Bật hiệu ứng Transparency',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Enable Transparency.reg']]
    ]
  },
  'network-tcp-ping': {
    description: 'Áp dụng TCP ACK low-latency',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Network/AckTicksandAckFrequency.reg']]]
  },
  'network-flush-dns': {
    description: 'Flush DNS',
    commands: [[WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', 'Network/DNS.cmd']]]
  },
  'network-dns-gaming': {
    description: 'Làm mới DNS cache',
    commands: [[WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', 'Network/DNS.cmd']]]
  },
  'network-full-tweaks': {
    description: 'Áp dụng Network Tweaks Full',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Network/Network Tweaks.reg']]]
  },
  'network-fast-send': {
    description: 'Áp dụng Fast Send Datagram Threshold',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Network/FastSendDatagramThreshold.reg']]]
  },
  'mouse-disable-acceleration': {
    description: 'Áp dụng cấu hình chuột gaming',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Input Lag/Mouse/MouseSetting.reg']]]
  },
  'keyboard-zero-delay': {
    description: 'Áp dụng cấu hình graphics low-latency',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Input Lag/Reduce Input Lag/Graphics.reg']]]
  },
  'msi-utility': {
    description: 'Mở MSI Utility V3',
    launch: join(SCRIPT_DIRECTORY, 'Tool&cache', 'MSI Utility', 'MSI Utility V3.exe')
  },
  'amd-radeonmod': {
    description: 'Mở RadeonMod cho AMD GPU',
    launch: join(SCRIPT_DIRECTORY, 'Tool&cache', 'For Amd', 'RadeonMod', 'RadeonMod.exe')
  },
  'amd-morepowertool': {
    description: 'Mở MorePowerTool cho AMD GPU',
    launch: join(SCRIPT_DIRECTORY, 'Tool&cache', 'For Amd', 'MorePowerTool', 'MorePowerTool.exe')
  },
  'amd-radeonsoftwarelimmer': {
    description: 'Mở RadeonSoftwareSlimmer cho AMD GPU',
    launch: join(
      SCRIPT_DIRECTORY,
      'Tool&cache',
      'For Amd',
      'RadeonSoftwareSlimmer',
      'RadeonSoftwareSlimmer.exe'
    )
  },
  'amd-3d-settings': {
    description: 'Áp dụng 3D Settings cho AMD GPU',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/For Amd/3D Settings.reg']]]
  },
  'amd-driver-tweaks': {
    description: 'Áp dụng Driver Tweaks cho AMD GPU',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/For Amd/Driver Tweaks.reg']]]
  },
  'nvidia-nvcleanstall': {
    description: 'Mở NvCleanstall cho NVIDIA GPU',
    launch: join(
      SCRIPT_DIRECTORY,
      'Tool&cache',
      'For Nvidia',
      'NvCleanstall',
      'NVCleanstall_1.19.0.exe'
    )
  },
  'nvidia-profile-inspector': {
    description: 'Mở Nvidia Profile Inspector',
    launch: join(
      SCRIPT_DIRECTORY,
      'Tool&cache',
      'For Nvidia',
      'Nvidia Profile Inspector',
      'nvidiaProfileInspector',
      'nvidiaProfileInspector.exe'
    )
  },
  'nvidia-inspector': {
    description: 'Mở nvidiaInspector',
    launch: join(
      SCRIPT_DIRECTORY,
      'Tool&cache',
      'For Nvidia',
      'nvidiaInspector',
      'nvidiaInspector.exe'
    )
  },
  'nvidia-powermizer': {
    description: 'Mở Nvidia PowerMizer',
    launch: join(
      SCRIPT_DIRECTORY,
      'Tool&cache',
      'For Nvidia',
      'Nvidia PowerMizer',
      'Nvidia PowerMizer.exe'
    )
  },
  'nvidia-desktop-composition': {
    description: 'Áp dụng Desktop Composition cho NVIDIA GPU',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/For Nvidia/Desktop Composition.reg']]]
  },
  'nvidia-gamedvr-gamemode': {
    description: 'Áp dụng GameDVR và Game Mode cho NVIDIA GPU',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/For Nvidia/GameDVR And Game Mode.reg']]
    ]
  },
  'nvidia-graphics-tweaks': {
    description: 'Áp dụng Graphics Drivers Tweaks cho NVIDIA GPU',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/For Nvidia/GraphicsDrivers Tweaks.reg']]
    ]
  },
  'nvidia-nvidia-tweaks': {
    description: 'Áp dụng NVIDIA Driver Tweaks',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/For Nvidia/NVIDIA Driver Tweaks.reg']]]
  },
  'nvidia-power-latency': {
    description: 'Áp dụng Power And Latency Tweaks cho NVIDIA GPU',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/For Nvidia/Power And Latency Tweaks.reg']]
    ]
  },
  'nvidia-task-priority': {
    description: 'Áp dụng Task Priority Tweaks cho NVIDIA GPU',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/For Nvidia/Task Priority Tweaks.reg']]]
  },
  'classic-menu-win10': {
    description: 'Áp dụng Classic Right Click Menu Windows 10',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/Classic Right Click Menu/Windows 10.reg']]
    ]
  },
  'classic-menu-win11': {
    description: 'Áp dụng Classic Right Click Menu Windows 11',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/Classic Right Click Menu/Windows 11.reg']]
    ]
  },
  'disable-extreme-drivers': {
    description: 'Disable Extreme Reg Drivers',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/Extreme Reg/Disable Drivers.reg']]]
  },
  'disable-extreme-gamer-services': {
    description: 'Disable Extreme Reg Services For Gamers',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/Extreme Reg/Disable Services For Gamers.reg']]
    ]
  },
  'disable-extreme-professional-services': {
    description: 'Disable Extreme Reg Services For Professionals',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Tool&cache',
            'Extreme Reg',
            'Disable Services For Professionals.reg'
          )
        ]
      ]
    ]
  },
  'enable-extreme-drivers': {
    description: 'Enable Extreme Reg Drivers',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/Extreme Reg/Enable Drivers.reg']]]
  },
  'enable-extreme-gamer-services': {
    description: 'Enable Extreme Reg Services For Gamers',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Tool&cache/Extreme Reg/Enable Services For Gamers.reg']]
    ]
  },
  'restore-extreme-gamer-services': {
    description: 'Restore Extreme Reg Services For Gamers',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Tool&cache',
            'Extreme Reg',
            'Restore',
            'Disable Services For Gamers Restore.reg'
          )
        ]
      ]
    ]
  },
  'restore-extreme-professional-services': {
    description: 'Restore Extreme Reg Services For Professionals',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Tool&cache',
            'Extreme Reg',
            'Restore',
            'Disable Services For Professionals Restore.reg'
          )
        ]
      ]
    ]
  },
  'enable-extreme-professional-services': {
    description: 'Enable Extreme Reg Services For Professionals',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Tool&cache',
            'Extreme Reg',
            'Enable Services For Professionals.reg'
          )
        ]
      ]
    ]
  },
  'win-disable-maintenance': {
    description: 'Tắt Automatic Maintenance',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Disable Automatic Maintenance.reg'
          )
        ]
      ]
    ]
  },
  'win-enable-maintenance': {
    description: 'Bật Automatic Maintenance',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Enable Automatic Maintenance.reg'
          )
        ]
      ]
    ]
  },
  'win-disable-cpu-throttling': {
    description: 'Tắt CPU Power Throttling',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', 'Optimizer/3. Windows Settings/Disable CpuPwrThrottling.reg']
      ]
    ]
  },
  'win-enable-cpu-throttling': {
    description: 'Bật CPU Power Throttling',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', 'Optimizer/3. Windows Settings/Enable CpuPwrThrottling.reg']
      ]
    ]
  },
  'win-disable-timer-coalescing': {
    description: 'Tắt Timer Coalescing',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Disable CoalescingTimerInterval.reg'
          )
        ]
      ]
    ]
  },
  'win-enable-timer-coalescing': {
    description: 'Bật Timer Coalescing',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Enable CoalescingTimerInterval.reg'
          )
        ]
      ]
    ]
  },
  'win-disable-driver-updates': {
    description: 'Tắt Driver Updates',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', 'Optimizer/3. Windows Settings/Disable Drivers Updates.reg']
      ]
    ]
  },
  'win-enable-driver-updates': {
    description: 'Bật Driver Updates',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Enable Drivers Updates.reg']]
    ]
  },
  'win-disable-extra-services': {
    description: 'Tắt Extra Unnecessary Services',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Disable Extra Unnecessary Services.reg'
          )
        ]
      ]
    ]
  },
  'win-enable-extra-services': {
    description: 'Bật Extra Unnecessary Services',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Enable Extra Unnecessary Services.reg'
          )
        ]
      ]
    ]
  },
  'win-disable-memory-mirroring': {
    description: 'Tắt Memory Mirroring',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', 'Optimizer/3. Windows Settings/Disable MemoryMirroring.reg']
      ]
    ]
  },
  'win-enable-memory-mirroring': {
    description: 'Bật Memory Mirroring',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Enable MemoryMirroring.reg']]
    ]
  },
  'win-disable-network-throttling': {
    description: 'Tắt Network Throttling',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Disable NetworkThrottling.reg'
          )
        ]
      ]
    ]
  },
  'win-enable-network-throttling': {
    description: 'Bật Network Throttling',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', 'Optimizer/3. Windows Settings/Enable NetworkThrottling.reg']
      ]
    ]
  },
  'win-disable-runtime-broker': {
    description: 'Tắt Runtime Broker',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Disable Runtime Broker.reg']]
    ]
  },
  'win-enable-runtime-broker': {
    description: 'Bật Runtime Broker',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Enable Runtime Broker.reg']]
    ]
  },
  'win-disable-spectre-meltdown': {
    description: 'Tắt Spectre & Meltdown Mitigations',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Disable Spectre and Meltdown.reg'
          )
        ]
      ]
    ]
  },
  'win-enable-spectre-meltdown': {
    description: 'Bật Spectre & Meltdown Mitigations',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Enable Spectre and Meltdown.reg'
          )
        ]
      ]
    ]
  },
  'win-disable-sync': {
    description: 'Tắt Windows Sync',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Disable Sync.reg']]]
  },
  'win-enable-sync': {
    description: 'Bật Windows Sync',
    commands: [[WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Enable Sync.reg']]]
  },
  'win-disable-windows-apps': {
    description: 'Tắt Windows Apps Auto-Install',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Disable Windows Apps.reg']]
    ]
  },
  'win-enable-windows-apps': {
    description: 'Bật Windows Apps Auto-Install',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Enable Windows Apps.reg']]
    ]
  },
  'win-disable-notifications': {
    description: 'Tắt Notification Center',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Disable NotificationCenter.reg'
          )
        ]
      ]
    ]
  },
  'win-enable-notifications': {
    description: 'Bật Notification Center',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Enable NotificationCenter.reg'
          )
        ]
      ]
    ]
  },
  'ame-beta': {
    description: 'Mở AME Beta',
    launch: join(SCRIPT_DIRECTORY, 'Tool&cache', 'AME Beta.exe')
  },
  throttlestop: {
    description: 'Mở ThrottleStop',
    launch: join(SCRIPT_DIRECTORY, 'Tool&cache', 'ThrottleStop.exe')
  },
  parkcontrol: {
    description: 'Mở ParkControl',
    launch: join(SCRIPT_DIRECTORY, 'Tool&cache', 'parkcontrolsetup64.exe')
  },
  processlasso: {
    description: 'Mở Process Lasso',
    launch: join(SCRIPT_DIRECTORY, 'Tool&cache', 'processlassosetup64.exe')
  },
  quickcpu: {
    description: 'Mở QuickCPU',
    launch: join(SCRIPT_DIRECTORY, 'Tool&cache', 'QuickCpuSetup.msi')
  },
  'clean-cache': {
    description: 'Dọn dẹp cache',
    commands: [[WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', 'Tool&cache/Clean/Clear.bat']]]
  },
  'ram-optimization': {
    description: 'Áp dụng RAM Optimization',
    profiles: RAM_PROFILES
  },
  'win32-priority': {
    description: 'Apply Win32PrioritySeparation',
    profiles: WIN32_PRIORITY_PROFILES,
    profileDirectory: 'Optimizer/8. Win32Priority'
  },
  'power-plan': {
    description: 'Apply Power Plan',
    profiles: POWER_PLAN_PROFILES,
    profileDirectory: 'Optimizer/4. PowerPlan'
  },
  'registry-profile': {
    description: 'Apply registry script',
    profileFiles: REGISTRY_FILE_PROFILES
  },
  'windows-settings-tweaks': {
    description: 'Áp dụng Windows Settings Tweaks',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', 'Optimizer/3. Windows Settings/Windows Settings Tweaks.reg']
      ]
    ]
  },
  'ntfs-bat': {
    description: 'Kích hoạt sửa lỗi NTFS bằng file BAT',
    commands: [[WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', 'BIOS/NTFS.bat']]]
  },
  'dawa-cleaner': {
    description: 'Dọn dẹp bộ nhớ tạm & Temp files',
    commands: []
  },
  'win-disable-background-apps': {
    description: 'Tắt Background Apps',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', 'Optimizer/3. Windows Settings/Disable Background Apps.reg']
      ]
    ]
  },
  'win-enable-background-apps': {
    description: 'Bật Background Apps',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', 'Optimizer/3. Windows Settings/Enable Background Apps.reg']]
    ]
  }
})

async function cleanDirectory(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    return { success: false, stderr: error.message }
  }

  const failures = []
  let cleanedCount = 0
  for (const entry of entries) {
    try {
      await rm(join(directory, entry.name), { recursive: true, force: true })
      cleanedCount += 1
    } catch (error) {
      failures.push(`${entry.name}: ${error.message}`)
    }
  }

  return {
    success: true,
    stderr:
      failures.length > 0 ? `${failures.length} tệp đang được hệ thống sử dụng (đã bỏ qua).` : '',
    stdout: `Đã dọn dẹp ${cleanedCount}/${entries.length} mục trong ${directory}`
  }
}

function runWhitelistedCommand(file, args) {
  return new Promise((resolve) => {
    const child = execFile(
      file,
      args,
      { windowsHide: true, timeout: 60000 },
      (error, stdout, stderr) => {
        const outStr = stdout?.toString() ?? ''
        const errStr = stderr?.toString() ?? ''
        resolve({
          success: !error,
          code: error?.code ?? 0,
          stdout: outStr,
          stderr: (errStr || (error ? outStr : '')).trim()
        })
      }
    )
    child.unref()
  })
}

function launchWhitelistedApp(file) {
  return new Promise((resolve) => {
    try {
      const child = spawn(file, [], { detached: true, stdio: 'ignore', windowsHide: false })
      child.once('error', (error) => resolve({ success: false, stderr: error.message }))
      child.once('spawn', () => {
        child.unref()
        resolve({ success: true, stdout: `Đã mở ${file}` })
      })
    } catch (error) {
      resolve({ success: false, stderr: error.message })
    }
  })
}

export async function runDawaScript(scriptKey, options = {}) {
  const script = ALLOWED_DAWA_SCRIPTS[scriptKey]
  if (!script)
    return {
      success: false,
      message: `Script [${scriptKey}] không nằm trong danh sách được phép thực thi.`
    }

  const licensed = await checkLicenseGate()
  if (!licensed) {
    return {
      success: false,
      message: LICENSE_REQUIRED_MESSAGE,
      stepResults: []
    }
  }

  const outputs = []

  if (script.launch) {
    const result = await launchWhitelistedApp(script.launch)
    outputs.push({ file: script.launch, args: '', ...result })
    return {
      success: result.success,
      message: result.success
        ? `Đã mở [${script.description}]`
        : `Không thể mở [${script.description}]: ${result.stderr}`,
      stepResults: outputs
    }
  }

  if (script.profileFiles) {
    const manifestKey = script.profileFiles[options.profile]
    if (!manifestKey) return { success: false, message: 'Invalid registry script profile.' }
    const ext = manifestKey.slice(manifestKey.lastIndexOf('.') + 1).toLowerCase()
    const isBatch = ext === 'cmd' || ext === 'bat'

    const staged = await decryptAndStageScript(manifestKey)
    let result
    try {
      result = isBatch
        ? await runWhitelistedCommand(WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', staged.tempPath])
        : await runWhitelistedCommand(WINDOWS_COMMANDS.reg, ['import', staged.tempPath])
    } finally {
      staged.cleanup()
    }
    outputs.push({
      file: isBatch ? WINDOWS_COMMANDS.cmd : WINDOWS_COMMANDS.reg,
      args: isBatch ? `/d /c call ${staged.tempPath}` : `import ${staged.tempPath}`,
      ...result
    })
    return {
      success: result.success,
      message: result.success
        ? `Applied registry script profile ${options.profile}.`
        : `Could not apply registry script profile: ${result.stderr}`,
      stepResults: outputs
    }
  }

  if (script.profiles) {
    const manifestKey = script.profiles[options.profile]
    if (!manifestKey) {
      return { success: false, message: 'Cấu hình không hợp lệ.' }
    }

    const staged = await decryptAndStageScript(manifestKey)
    let result
    try {
      if (scriptKey === 'power-plan') {
        result = await runWhitelistedCommand(WINDOWS_COMMANDS.powercfg, [
          '/import',
          staged.tempPath
        ])
      } else {
        result = await runWhitelistedCommand(WINDOWS_COMMANDS.reg, ['import', staged.tempPath])
      }
    } finally {
      staged.cleanup()
    }
    outputs.push({
      file: scriptKey === 'power-plan' ? WINDOWS_COMMANDS.powercfg : WINDOWS_COMMANDS.reg,
      args: scriptKey === 'power-plan' ? `/import ${staged.tempPath}` : `import ${staged.tempPath}`,
      ...result
    })
    return {
      success: result.success,
      message: result.success
        ? scriptKey === 'power-plan'
          ? `Đã áp dụng Power Plan ${options.profile}.`
          : `Đã áp dụng profile ${options.profile}.`
        : scriptKey === 'power-plan'
          ? `Không thể áp dụng Power Plan: ${result.stderr}`
          : `Không thể áp dụng profile: ${result.stderr}`,
      stepResults: outputs
    }
  }

  if (scriptKey === 'dawa-cleaner') {
    const directories = [process.env.TEMP, join(WINDOWS_SYSTEM_DIRECTORY, 'Prefetch')].filter(
      Boolean
    )
    for (const directory of directories) {
      const result = await cleanDirectory(directory)
      outputs.push({ file: 'fs.rm', args: [directory], ...result })
      if (!result.success)
        return {
          success: false,
          message: `Lỗi khi dọn dẹp ${directory}: ${result.stderr}`,
          stepResults: outputs
        }
    }
    return {
      success: true,
      message: `Đã thực thi thành công script [${script.description}]`,
      stepResults: outputs
    }
  }

  for (const [file, args, cmdOptions = {}] of script.commands) {
    const resolvedArgs = [...args]
    const cleanups = []
    let result
    try {
      for (let i = 0; i < resolvedArgs.length; i++) {
        const a = resolvedArgs[i]
        if (
          typeof a === 'string' &&
          /\.(reg|bat|cmd|pow|txt|ini|nip)$/i.test(a) &&
          !/^[A-Za-z]:\\/.test(a)
        ) {
          const staged = await decryptAndStageScript(a)
          cleanups.push(staged.cleanup)
          resolvedArgs[i] = staged.tempPath
        }
      }
      result = await runWhitelistedCommand(file, resolvedArgs)
    } finally {
      for (const c of cleanups) {
        try {
          c()
        } catch {
          /* noop */
        }
      }
    }
    outputs.push({ file, args: resolvedArgs.join(' '), ...result })
    if (!result.success && !cmdOptions.optional)
      return {
        success: false,
        message: `Lỗi khi thực thi bước ${file} ${resolvedArgs.join(' ')}: ${result.stderr}`,
        stepResults: outputs
      }
  }
  return {
    success: true,
    message: `Đã thực thi thành công script [${script.description}]`,
    stepResults: outputs
  }
}
