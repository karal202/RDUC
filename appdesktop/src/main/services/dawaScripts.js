import { execFile, spawn } from 'child_process'
import { readdir, rm } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const WINDOWS_SYSTEM_DIRECTORY = process.env.SystemRoot || 'C:\\Windows'

function resolveScriptDirectory() {
  // Production: try process.resourcesPath first
  if (process.resourcesPath) {
    const packagedPath = join(process.resourcesPath, 'scripts')
    if (existsSync(packagedPath)) return packagedPath

    const altPackagedPath = join(process.resourcesPath, 'resources', 'scripts')
    if (existsSync(altPackagedPath)) return altPackagedPath
  }

  // Development: fallback to local path
  const devPath = join(__dirname, '..', '..', 'resources', 'scripts')
  if (existsSync(devPath)) return devPath

  // Alternative development path
  const altDevPath = join(process.cwd(), 'resources', 'scripts')
  if (existsSync(altDevPath)) return altDevPath

  return devPath
}

const SCRIPT_DIRECTORY = resolveScriptDirectory()
const WINDOWS_COMMANDS = Object.freeze({
  powercfg: join(WINDOWS_SYSTEM_DIRECTORY, 'System32', 'powercfg.exe'),
  sc: join(WINDOWS_SYSTEM_DIRECTORY, 'System32', 'sc.exe'),
  reg: join(WINDOWS_SYSTEM_DIRECTORY, 'System32', 'reg.exe'),
  cmd: join(WINDOWS_SYSTEM_DIRECTORY, 'System32', 'cmd.exe')
})
const RAM_PROFILES = Object.freeze({
  2: '2GB RAM.reg',
  3: '3GB RAM.reg',
  4: '4GB Ram.reg',
  6: '6GB Ram.reg',
  8: '8GB Ram.reg',
  10: '10GB RAM.reg',
  12: '12GB Ram.reg',
  16: '16GB Ram.reg',
  20: '20GB Ram.reg',
  24: '24GB Ram.reg',
  32: '32GB Ram.reg',
  48: '48GB RAM.reg',
  64: '64GB Ram.reg',
  reset: 'Reset to Default.reg'
})
const WIN32_PRIORITY_PROFILES = Object.freeze({
  default: '2 hex Default.reg',
  14: '14 hex.reg',
  15: '15 Hex.reg',
  16: '16 hex.reg',
  18: '18 Hex.reg',
  19: '19 Hex.reg',
  '1a': '1a Hex.reg',
  24: '24 Hex.reg',
  25: '25 Hex.reg',
  26: '26 hex.reg',
  28: '28 hex.reg',
  '2a': '2a hex.reg',
  fa2a2a: 'fa2a2a hex.reg',
  fa332a: 'fa332a hex.reg',
  fb000000: 'fb000000 hex.reg',
  fff9887: 'fff9887 hex.reg'
})
const POWER_PLAN_PROFILES = Object.freeze({
  'dawa-ultimate': 'Dawa_Utilmate.pow',
  atlas: 'Atlas.pow',
  'bitsum-highest': 'Bitsum-Highest-Performance.pow',
  'amitv3-idle': 'Amitv3IdleEnabled.pow',
  'framesync-boost': 'FrameSyncBoost.pow'
})
const REGISTRY_FILE_PROFILES = Object.freeze({
  'network-full-tweaks': join(SCRIPT_DIRECTORY, 'Network', 'Network Tweaks.reg'),
  'network-fast-send': join(SCRIPT_DIRECTORY, 'Network', 'FastSendDatagramThreshold.reg'),
  'mouse-queue-10': join(SCRIPT_DIRECTORY, 'Input Lag', 'Mouse', 'DataQueueSize', '10 Decimal.reg'),
  'mouse-queue-20': join(SCRIPT_DIRECTORY, 'Input Lag', 'Mouse', 'DataQueueSize', '20 Decimal.reg'),
  'mouse-queue-22': join(SCRIPT_DIRECTORY, 'Input Lag', 'Mouse', 'DataQueueSize', '22 Decimal.reg'),
  'mouse-queue-25': join(SCRIPT_DIRECTORY, 'Input Lag', 'Mouse', 'DataQueueSize', '25 Decimal.reg'),
  'mouse-queue-default': join(
    SCRIPT_DIRECTORY,
    'Input Lag',
    'Mouse',
    'DataQueueSize',
    'Default Windows.reg'
  ),
  'keyboard-queue-10': join(
    SCRIPT_DIRECTORY,
    'Input Lag',
    'Keyboard',
    'DataQueueSize',
    '10 Decimal.reg'
  ),
  'keyboard-queue-15': join(
    SCRIPT_DIRECTORY,
    'Input Lag',
    'Keyboard',
    'DataQueueSize',
    '15 Decimal.reg'
  ),
  'keyboard-queue-20': join(
    SCRIPT_DIRECTORY,
    'Input Lag',
    'Keyboard',
    'DataQueueSize',
    '20 Decimal.reg'
  ),
  'keyboard-queue-22': join(
    SCRIPT_DIRECTORY,
    'Input Lag',
    'Keyboard',
    'DataQueueSize',
    '22 Decimal.reg'
  ),
  'keyboard-queue-25': join(
    SCRIPT_DIRECTORY,
    'Input Lag',
    'Keyboard',
    'DataQueueSize',
    '25 Decimal.reg'
  ),
  'keyboard-queue-default': join(
    SCRIPT_DIRECTORY,
    'Input Lag',
    'Keyboard',
    'DataQueueSize',
    'Default Windows.reg'
  ),
  'input-avx': join(SCRIPT_DIRECTORY, 'Input Lag', 'Reduce Input Lag', 'AVX.reg'),
  'input-cache': join(SCRIPT_DIRECTORY, 'Input Lag', 'Reduce Input Lag', 'Cache.reg'),
  'input-desktop': join(SCRIPT_DIRECTORY, 'Input Lag', 'Reduce Input Lag', 'Desktop.reg'),
  'input-low-latency': join(SCRIPT_DIRECTORY, 'Input Lag', 'Reduce Input Lag', 'LowLatency.reg'),
  'input-misc': join(SCRIPT_DIRECTORY, 'Input Lag', 'Reduce Input Lag', 'Misc.reg'),
  'input-scripts': join(SCRIPT_DIRECTORY, 'Input Lag', 'Reduce Input Lag', 'Scripts.reg'),
  'input-system': join(SCRIPT_DIRECTORY, 'Input Lag', 'Reduce Input Lag', 'System.reg'),
  'win-desktop-settings': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Desktop Settings.reg'
  ),
  'win-disable-maintenance': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable Automatic Maintenance.reg'
  ),
  'win-disable-background-apps': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable Background Apps.reg'
  ),
  'win-disable-timer-coalescing': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable CoalescingTimerInterval.reg'
  ),
  'win-disable-cpu-throttling': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable CpuPwrThrottling.reg'
  ),
  'win-enable-cpu-throttling': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable CpuPwrThrottling.reg'
  ),
  'win-disable-driver-updates': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable Drivers Updates.reg'
  ),
  'win-disable-extra-services': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable Extra Unnecessary Services.reg'
  ),
  'win-enable-extra-services': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable Extra Unnecessary Services.reg'
  ),
  'win-enable-driver-updates': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable Drivers Updates.reg'
  ),
  'win-disable-memory-mirroring': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable MemoryMirroring.reg'
  ),
  'win-disable-network-throttling': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable NetworkThrottling.reg'
  ),
  'win-disable-notifications': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable NotificationCenter.reg'
  ),
  'win-enable-notifications': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable NotificationCenter.reg'
  ),
  'win-disable-runtime-broker': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable Runtime Broker.reg'
  ),
  'win-disable-spectre-meltdown': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable Spectre and Meltdown.reg'
  ),
  'win-disable-sync': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable Sync.reg'
  ),
  'win-disable-windows-apps': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable Windows Apps.reg'
  ),
  'win-fine-memory-quota': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'FineGrainedMemoryQuota.reg'
  ),
  'win-large-page': join(SCRIPT_DIRECTORY, 'Optimizer', '3. Windows Settings', 'LargePage.reg'),
  'win-low-latency': join(SCRIPT_DIRECTORY, 'Optimizer', '3. Windows Settings', 'Low Latency.reg'),
  'win-memory-management': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Memory Management.reg'
  ),
  'win-perf-boost-mode': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'PerfBoostMode.reg'
  ),
  'win-power-settings': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Power Settings.reg'
  ),
  'win-prioritize-gpu': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Prioritize GPU.reg'
  ),
  'classic-menu-win10': join(
    SCRIPT_DIRECTORY,
    'Tool&cache',
    'Classic Right Click Menu',
    'Windows 10.reg'
  ),
  'classic-menu-win11': join(
    SCRIPT_DIRECTORY,
    'Tool&cache',
    'Classic Right Click Menu',
    'Windows 11.reg'
  ),
  'restore-gamer-services': join(
    SCRIPT_DIRECTORY,
    'Restore',
    'Disable Services For Gamers Restore.reg'
  ),
  'restore-professional-services': join(
    SCRIPT_DIRECTORY,
    'Restore',
    'Disable Services For Professionals Restore.reg'
  ),
  'network-tcp-ping': join(SCRIPT_DIRECTORY, 'Network', 'AckTicksandAckFrequency.reg'),
  'network-ack-ticks': join(SCRIPT_DIRECTORY, 'Network', 'AckTicksandAckFrequency.reg'),
  'network-acks-freq': join(SCRIPT_DIRECTORY, 'Network', 'AckTicksandAckFrequency.reg'),
  'network-fast-send-reg': join(SCRIPT_DIRECTORY, 'Network', 'FastSendDatagramThreshold.reg'),
  'network-tweaks-reg': join(SCRIPT_DIRECTORY, 'Network', 'Network Tweaks.reg'),
  'network-dns': join(SCRIPT_DIRECTORY, 'Network', 'DNS.cmd'),
  'network-flush-dns': join(SCRIPT_DIRECTORY, 'Network', 'DNS.cmd'),
  'network-dns-gaming': join(SCRIPT_DIRECTORY, 'Network', 'DNS.cmd'),
  'win-enable-maintenance': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable Automatic Maintenance.reg'
  ),
  'win-enable-timer-coalescing': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable CoalescingTimerInterval.reg'
  ),
  'win-enable-hibernation': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable Hibernation.reg'
  ),
  'win-enable-memory-mirroring': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable MemoryMirroring.reg'
  ),
  'win-enable-network-throttling': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable NetworkThrottling.reg'
  ),
  'win-enable-runtime-broker': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable Runtime Broker.reg'
  ),
  'win-enable-spectre-meltdown': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable Spectre and Meltdown.reg'
  ),
  'win-enable-sync': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable Sync.reg'
  ),
  'win-enable-windows-apps': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable Windows Apps.reg'
  ),
  'win-disable-transparency': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable Transparency.reg'
  ),
  'win-enable-transparency': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable Transparency.reg'
  ),
  'win-disable-fso-gamebar': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable FSO Game Bar.reg'
  ),
  'win-enable-fso-gamebar': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable FSO Game Bar.reg'
  ),
  'win-disable-telemetry': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable Telemetry.reg'
  ),
  'win-enable-telemetry': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable Telemetry.reg'
  ),
  'win-disable-superfetch': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Disable Superfetch.reg'
  ),
  'win-enable-superfetch': join(
    SCRIPT_DIRECTORY,
    'Optimizer',
    '3. Windows Settings',
    'Enable Superfetch.reg'
  )
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
    commands: [
      [WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', join(SCRIPT_DIRECTORY, 'BIOS', 'bios.bat')]]
    ]
  },
  'win-disable-hibernate': {
    description: 'Tắt Hibernate',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(SCRIPT_DIRECTORY, 'Optimizer', '3. Windows Settings', 'Disable Hibernation.reg')
        ]
      ],
      [WINDOWS_COMMANDS.powercfg, ['/h', 'off']]
    ]
  },
  'win-enable-hibernate': {
    description: 'Bật Hibernate',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(
            SCRIPT_DIRECTORY,
            'Optimizer',
            '3. Windows Settings',
            'Disable Hibernation - Copy.reg'
          )
        ]
      ],
      [WINDOWS_COMMANDS.powercfg, ['/h', 'on']]
    ]
  },
  'win-disable-fso-gamebar': {
    description: 'Tắt Game Bar và Game DVR',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(SCRIPT_DIRECTORY, 'Optimizer', '3. Windows Settings', 'Disable FSO Game Bar.reg')
        ]
      ]
    ]
  },
  'win-enable-fso-gamebar': {
    description: 'Bật lại Game Bar và Game DVR',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(SCRIPT_DIRECTORY, 'Optimizer', '3. Windows Settings', 'Enable FSO Game Bar.reg')
        ]
      ]
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
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(SCRIPT_DIRECTORY, 'Optimizer', '3. Windows Settings', 'Enable Telemetry.reg')
        ]
      ],
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
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(SCRIPT_DIRECTORY, 'Optimizer', '3. Windows Settings', 'Enable Superfetch.reg')
        ]
      ],
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
          '1',
          '/f'
        ]
      ]
    ]
  },
  'network-tcp-ping': {
    description: 'Áp dụng TCP ACK low-latency',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Network', 'AckTicksandAckFrequency.reg')]
      ]
    ]
  },
  'network-flush-dns': {
    description: 'Flush DNS',
    commands: [
      [WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', join(SCRIPT_DIRECTORY, 'Network', 'DNS.cmd')]]
    ]
  },
  'network-dns-gaming': {
    description: 'Làm mới DNS cache',
    commands: [
      [WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', join(SCRIPT_DIRECTORY, 'Network', 'DNS.cmd')]]
    ]
  },
  'network-full-tweaks': {
    description: 'Áp dụng Network Tweaks Full',
    commands: [
      [WINDOWS_COMMANDS.reg, ['import', join(SCRIPT_DIRECTORY, 'Network', 'Network Tweaks.reg')]]
    ]
  },
  'network-fast-send': {
    description: 'Áp dụng Fast Send Datagram Threshold',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Network', 'FastSendDatagramThreshold.reg')]
      ]
    ]
  },
  'mouse-disable-acceleration': {
    description: 'Áp dụng cấu hình chuột gaming',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Input Lag', 'Mouse', 'MouseSetting.reg')]
      ]
    ]
  },
  'keyboard-zero-delay': {
    description: 'Áp dụng cấu hình graphics low-latency',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Input Lag', 'Reduce Input Lag', 'Graphics.reg')]
      ]
    ]
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
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Tool&cache', 'For Amd', '3D Settings.reg')]
      ]
    ]
  },
  'amd-driver-tweaks': {
    description: 'Áp dụng Driver Tweaks cho AMD GPU',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Tool&cache', 'For Amd', 'Driver Tweaks.reg')]
      ]
    ]
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
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Tool&cache', 'For Nvidia', 'Desktop Composition.reg')]
      ]
    ]
  },
  'nvidia-gamedvr-gamemode': {
    description: 'Áp dụng GameDVR và Game Mode cho NVIDIA GPU',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Tool&cache', 'For Nvidia', 'GameDVR And Game Mode.reg')]
      ]
    ]
  },
  'nvidia-graphics-tweaks': {
    description: 'Áp dụng Graphics Drivers Tweaks cho NVIDIA GPU',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Tool&cache', 'For Nvidia', 'GraphicsDrivers Tweaks.reg')]
      ]
    ]
  },
  'nvidia-nvidia-tweaks': {
    description: 'Áp dụng NVIDIA Driver Tweaks',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Tool&cache', 'For Nvidia', 'NVIDIA Driver Tweaks.reg')]
      ]
    ]
  },
  'nvidia-power-latency': {
    description: 'Áp dụng Power And Latency Tweaks cho NVIDIA GPU',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(SCRIPT_DIRECTORY, 'Tool&cache', 'For Nvidia', 'Power And Latency Tweaks.reg')
        ]
      ]
    ]
  },
  'nvidia-task-priority': {
    description: 'Áp dụng Task Priority Tweaks cho NVIDIA GPU',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Tool&cache', 'For Nvidia', 'Task Priority Tweaks.reg')]
      ]
    ]
  },
  'classic-menu-win10': {
    description: 'Áp dụng Classic Right Click Menu Windows 10',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(SCRIPT_DIRECTORY, 'Tool&cache', 'Classic Right Click Menu', 'Windows 10.reg')
        ]
      ]
    ]
  },
  'classic-menu-win11': {
    description: 'Áp dụng Classic Right Click Menu Windows 11',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(SCRIPT_DIRECTORY, 'Tool&cache', 'Classic Right Click Menu', 'Windows 11.reg')
        ]
      ]
    ]
  },
  'disable-extreme-drivers': {
    description: 'Disable Extreme Reg Drivers',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        ['import', join(SCRIPT_DIRECTORY, 'Tool&cache', 'Extreme Reg', 'Disable Drivers.reg')]
      ]
    ]
  },
  'disable-extreme-gamer-services': {
    description: 'Disable Extreme Reg Services For Gamers',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'import',
          join(SCRIPT_DIRECTORY, 'Tool&cache', 'Extreme Reg', 'Disable Services For Gamers.reg')
        ]
      ]
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
    commands: [
      [
        WINDOWS_COMMANDS.cmd,
        ['/d', '/c', 'call', join(SCRIPT_DIRECTORY, 'Tool&cache', 'Clean', 'Clear.bat')]
      ]
    ]
  },
  'ram-optimization': {
    description: 'Áp dụng RAM Optimization',
    profiles: RAM_PROFILES
  },
  'win32-priority': {
    description: 'Apply Win32PrioritySeparation',
    profiles: WIN32_PRIORITY_PROFILES,
    profileDirectory: join(SCRIPT_DIRECTORY, 'Optimizer', '8. Win32Priority')
  },
  'power-plan': {
    description: 'Apply Power Plan',
    profiles: POWER_PLAN_PROFILES,
    profileDirectory: join(SCRIPT_DIRECTORY, 'Optimizer', '4. PowerPlan')
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
        [
          'import',
          join(SCRIPT_DIRECTORY, 'Optimizer', '3. Windows Settings', 'Windows Settings Tweaks.reg')
        ]
      ]
    ]
  },
  'ntfs-bat': {
    description: 'Kích hoạt sửa lỗi NTFS bằng file BAT',
    commands: [
      [WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', join(SCRIPT_DIRECTORY, 'BIOS', 'NTFS.bat')]]
    ]
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
        [
          'import',
          join(SCRIPT_DIRECTORY, 'Optimizer', '3. Windows Settings', 'Disable Background Apps.reg')
        ]
      ]
    ]
  },
  'win-enable-background-apps': {
    description: 'Bật Background Apps',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'add',
          'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications',
          '/v',
          'GlobalUserDisabled',
          '/t',
          'REG_DWORD',
          '/d',
          '0',
          '/f'
        ]
      ]
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
    const file = script.profileFiles[options.profile]
    if (!file) return { success: false, message: 'Invalid registry script profile.' }

    const isBatch = file.toLowerCase().endsWith('.cmd') || file.toLowerCase().endsWith('.bat')
    const result = isBatch
      ? await runWhitelistedCommand(WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', file])
      : await runWhitelistedCommand(WINDOWS_COMMANDS.reg, ['import', file])
    outputs.push({
      file: isBatch ? WINDOWS_COMMANDS.cmd : WINDOWS_COMMANDS.reg,
      args: isBatch ? `/d /c call ${file}` : `import ${file}`,
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
    const profileFile = script.profiles[options.profile]
    if (!profileFile) {
      return { success: false, message: 'Cấu hình không hợp lệ.' }
    }
    const file = join(
      script.profileDirectory || join(SCRIPT_DIRECTORY, 'Optimizer', 'Ram Optimization'),
      profileFile
    )

    // Special handling for power plans - use powercfg
    if (scriptKey === 'power-plan') {
      const result = await runWhitelistedCommand(WINDOWS_COMMANDS.powercfg, ['/import', file])
      outputs.push({ file: WINDOWS_COMMANDS.powercfg, args: `/import ${file}`, ...result })
      return {
        success: result.success,
        message: result.success
          ? `Đã áp dụng Power Plan ${options.profile}.`
          : `Không thể áp dụng Power Plan: ${result.stderr}`,
        stepResults: outputs
      }
    }

    // Default handling for registry files
    const result = await runWhitelistedCommand(WINDOWS_COMMANDS.reg, ['import', file])
    outputs.push({ file: WINDOWS_COMMANDS.reg, args: `import ${file}`, ...result })
    return {
      success: result.success,
      message: result.success
        ? `Đã áp dụng profile ${options.profile}.`
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
    const result = await runWhitelistedCommand(file, args)
    outputs.push({ file, args: args.join(' '), ...result })
    if (!result.success && !cmdOptions.optional)
      return {
        success: false,
        message: `Lỗi khi thực thi bước ${file} ${args.join(' ')}: ${result.stderr}`,
        stepResults: outputs
      }
  }
  return {
    success: true,
    message: `Đã thực thi thành công script [${script.description}]`,
    stepResults: outputs
  }
}
