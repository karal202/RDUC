import { execFile } from 'child_process'
import { readdir, rm } from 'fs/promises'
import { join } from 'path'

const WINDOWS_SYSTEM_DIRECTORY = process.env.SystemRoot || 'C:\\Windows'
const WINDOWS_COMMANDS = Object.freeze({
  powercfg: join(WINDOWS_SYSTEM_DIRECTORY, 'System32', 'powercfg.exe'),
  sc: join(WINDOWS_SYSTEM_DIRECTORY, 'System32', 'sc.exe'),
  reg: join(WINDOWS_SYSTEM_DIRECTORY, 'System32', 'reg.exe')
})

export const ALLOWED_DAWA_SCRIPTS = Object.freeze({
  'dawa-gaming-boost': { description: 'Tối ưu Gaming High Performance', commands: [[WINDOWS_COMMANDS.powercfg, ['/s', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c']], [WINDOWS_COMMANDS.sc, ['config', 'SysMain', 'start=', 'disabled']], [WINDOWS_COMMANDS.sc, ['config', 'DiagTrack', 'start=', 'disabled']], [WINDOWS_COMMANDS.reg, ['add', 'HKCU\\Software\\Microsoft\\GameBar', '/v', 'AutoGameModeEnabled', '/t', 'REG_DWORD', '/d', '1', '/f']]] },
  'dawa-power-plan': { description: 'Kích hoạt Power Plan Tối Thượng', commands: [[WINDOWS_COMMANDS.powercfg, ['/s', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c']], [WINDOWS_COMMANDS.powercfg, ['/change', 'monitor-timeout-ac', '0']], [WINDOWS_COMMANDS.powercfg, ['/change', 'standby-timeout-ac', '0']]] }
})

async function cleanDirectory(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    return { success: false, stderr: error.message }
  }

  const failures = []
  for (const entry of entries) {
    try {
      await rm(join(directory, entry.name), { recursive: true, force: true })
    } catch (error) {
      failures.push(`${entry.name}: ${error.message}`)
    }
  }

  return {
    success: failures.length === 0,
    stderr: failures.join('\n'),
    stdout: `Đã xử lý ${entries.length - failures.length}/${entries.length} mục trong ${directory}`
  }
}

function runWhitelistedCommand(file, args) {
  return new Promise((resolve) => {
    const child = execFile(file, args, { windowsHide: true, timeout: 60000 }, (error, stdout, stderr) => resolve({ success: !error, code: error?.code ?? 0, stdout: stdout?.toString() ?? '', stderr: stderr?.toString() ?? '' }))
    child.unref()
  })
}

export async function runDawaScript(scriptKey) {
  const script = ALLOWED_DAWA_SCRIPTS[scriptKey]
  if (!script) return { success: false, message: `Script [${scriptKey}] không nằm trong danh sách được phép thực thi.` }
  const outputs = []

  if (scriptKey === 'dawa-cleaner') {
    const directories = [process.env.TEMP, join(WINDOWS_SYSTEM_DIRECTORY, 'Prefetch')].filter(Boolean)
    for (const directory of directories) {
      const result = await cleanDirectory(directory)
      outputs.push({ file: 'fs.rm', args: [directory], ...result })
      if (!result.success) return { success: false, message: `Lỗi khi dọn dẹp ${directory}: ${result.stderr}`, stepResults: outputs }
    }
    return { success: true, message: `Đã thực thi thành công script [${script.description}]`, stepResults: outputs }
  }

  for (const [file, args] of script.commands) {
    const result = await runWhitelistedCommand(file, args)
    outputs.push({ file, args: args.join(' '), ...result })
    if (!result.success) return { success: false, message: `Lỗi khi thực thi bước ${file} ${args.join(' ')}: ${result.stderr}`, stepResults: outputs }
  }
  return { success: true, message: `Đã thực thi thành công script [${script.description}]`, stepResults: outputs }
}
