import { execFile, spawn } from 'child_process'
import { readdir, rm } from 'fs/promises'
import { join } from 'path'

const WINDOWS_SYSTEM_DIRECTORY = process.env.SystemRoot || 'C:\\Windows'
const SCRIPT_DIRECTORY = join(__dirname, '..', '..', 'resources', 'scripts')
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
    commands: [[WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', join(SCRIPT_DIRECTORY, 'BIOS', 'bios.bat')]]]
  },
  'win-disable-hibernate': {
    description: 'Tắt Hibernate',
    commands: [[WINDOWS_COMMANDS.powercfg, ['/h', 'off']]]
  },
  'win-enable-hibernate': {
    description: 'Bật Hibernate',
    commands: [[WINDOWS_COMMANDS.powercfg, ['/h', 'on']]]
  },
  'win-disable-fso-gamebar': {
    description: 'Tắt Game Bar và Game DVR',
    commands: [
      [
        WINDOWS_COMMANDS.reg,
        [
          'add',
          'HKCU\\Software\\Microsoft\\GameBar',
          '/v',
          'ShowStartupPanel',
          '/t',
          'REG_DWORD',
          '/d',
          '0',
          '/f'
        ]
      ],
      [
        WINDOWS_COMMANDS.reg,
        [
          'add',
          'HKCU\\System\\GameConfigStore',
          '/v',
          'GameDVR_Enabled',
          '/t',
          'REG_DWORD',
          '/d',
          '0',
          '/f'
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
          'add',
          'HKCU\\Software\\Microsoft\\GameBar',
          '/v',
          'ShowStartupPanel',
          '/t',
          'REG_DWORD',
          '/d',
          '1',
          '/f'
        ]
      ],
      [
        WINDOWS_COMMANDS.reg,
        [
          'add',
          'HKCU\\System\\GameConfigStore',
          '/v',
          'GameDVR_Enabled',
          '/t',
          'REG_DWORD',
          '/d',
          '1',
          '/f'
        ]
      ]
    ]
  },
  'win-disable-telemetry': {
    description: 'Tắt dịch vụ Telemetry',
    commands: [
      [WINDOWS_COMMANDS.sc, ['stop', 'DiagTrack']],
      [WINDOWS_COMMANDS.sc, ['config', 'DiagTrack', 'start=', 'disabled']]
    ]
  },
  'win-enable-telemetry': {
    description: 'Bật lại dịch vụ Telemetry',
    commands: [[WINDOWS_COMMANDS.sc, ['config', 'DiagTrack', 'start=', 'auto']]]
  },
  'win-disable-superfetch': {
    description: 'Tắt dịch vụ SysMain',
    commands: [
      [WINDOWS_COMMANDS.sc, ['stop', 'SysMain']],
      [WINDOWS_COMMANDS.sc, ['config', 'SysMain', 'start=', 'disabled']]
    ]
  },
  'win-enable-superfetch': {
    description: 'Bật lại dịch vụ SysMain',
    commands: [[WINDOWS_COMMANDS.sc, ['config', 'SysMain', 'start=', 'auto']]]
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
  'ram-optimization': {
    description: 'Áp dụng RAM Optimization',
    profiles: RAM_PROFILES
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
    commands: [[WINDOWS_COMMANDS.cmd, ['/d', '/c', 'call', join(SCRIPT_DIRECTORY, 'BIOS', 'NTFS.bat')]]]
  },
  'dawa-cleaner': {
    description: 'Dọn dẹp bộ nhớ tạm & Temp files',
    commands: []
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
      (error, stdout, stderr) =>
        resolve({
          success: !error,
          code: error?.code ?? 0,
          stdout: stdout?.toString() ?? '',
          stderr: stderr?.toString() ?? ''
        })
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

  if (script.profiles) {
    const profileFile = script.profiles[options.profile]
    if (!profileFile) {
      return { success: false, message: 'Cấu hình RAM không hợp lệ.' }
    }
    const file = join(SCRIPT_DIRECTORY, 'Optimizer', 'Ram Optimization', profileFile)
    const result = await runWhitelistedCommand(WINDOWS_COMMANDS.reg, ['import', file])
    outputs.push({ file: WINDOWS_COMMANDS.reg, args: `import ${file}`, ...result })
    return {
      success: result.success,
      message: result.success
        ? `Đã áp dụng RAM profile ${options.profile === 'reset' ? 'mặc định' : `${options.profile}GB`}.`
        : `Không thể áp dụng RAM profile: ${result.stderr}`,
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

  for (const [file, args] of script.commands) {
    const result = await runWhitelistedCommand(file, args)
    outputs.push({ file, args: args.join(' '), ...result })
    if (!result.success)
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
