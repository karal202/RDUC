import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'
import { execFile } from 'child_process'
import si from 'systeminformation'

const SECRET_SALT = 'DAWA_SECURITY_KEY_SALT_2026_x98f'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3069/api/license/validate'
const LICENSE_FILE_PATH = path.join(app.getPath('userData'), 'dawa_license_vault.dat')

const ALLOWED_DAWA_SCRIPTS = Object.freeze({
  'dawa-gaming-boost': {
    description: 'Tối ưu Gaming High Performance',
    commands: [
      ['powercfg', ['/s', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c']],
      ['sc', ['config', 'SysMain', 'start=', 'disabled']],
      ['sc', ['config', 'DiagTrack', 'start=', 'disabled']],
      [
        'reg',
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
  'dawa-cleaner': {
    description: 'Dọn dẹp bộ nhớ tạm & Cache',
    commands: [
      ['cmd.exe', ['/c', 'del /q /s %TEMP%\\*.* 2>nul']],
      ['cmd.exe', ['/c', 'del /q /s C:\\Windows\\Prefetch\\*.* 2>nul']],
      [
        'rundll32.exe',
        ['advpack.dll,LaunchINFSection', 'C:\\Windows\\inf\\cleanmgr.inf', 'DefaultInstall']
      ]
    ]
  },
  'dawa-power-plan': {
    description: 'Kích hoạt Power Plan Tối Thượng',
    commands: [
      ['powercfg', ['/s', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c']],
      ['powercfg', ['/change', 'monitor-timeout-ac', '0']],
      ['powercfg', ['/change', 'standby-timeout-ac', '0']]
    ]
  }
})

async function getHardwareHash() {
  try {
    const system = await si.system()
    const cpu = await si.cpu()
    const osInfo = await si.osInfo()

    const rawHardwareString = `${system.uuid || ''}-${system.serial || ''}-${cpu.manufacturer || ''}-${cpu.brand || ''}-${osInfo.serial || ''}-${os.hostname()}`
    return crypto
      .createHash('sha256')
      .update(rawHardwareString || 'fallback_hwid')
      .digest('hex')
  } catch {
    const fallbackString = `${os.hostname()}-${os.arch()}-${os.platform()}-${os.cpus()[0]?.model || ''}`
    return crypto.createHash('sha256').update(fallbackString).digest('hex')
  }
}

function calculateSignature(keyCode, deviceHash, timestamp) {
  const data = `${keyCode}:${deviceHash}:${timestamp}:${SECRET_SALT}`
  return crypto.createHmac('sha256', SECRET_SALT).update(data).digest('hex')
}

function verifyLocalLicense(licenseData, currentDeviceHash) {
  if (!licenseData || !licenseData.keyCode || !licenseData.deviceHash || !licenseData.signature) {
    return { valid: false, message: 'Dữ liệu license không hợp lệ' }
  }

  if (licenseData.deviceHash !== currentDeviceHash) {
    return { valid: false, message: 'License không tương thích với thiết bị này (HWID Mismatch)' }
  }

  const expectedSig = calculateSignature(
    licenseData.keyCode,
    licenseData.deviceHash,
    licenseData.timestamp
  )
  if (licenseData.signature !== expectedSig) {
    return { valid: false, message: 'Phát hiện can thiệp vào file license (Signature Invalid)' }
  }

  if (licenseData.expiresAt && new Date(licenseData.expiresAt).getTime() < Date.now()) {
    return { valid: false, message: 'Key kích hoạt đã hết hạn' }
  }

  return { valid: true, keyCode: licenseData.keyCode, activatedAt: licenseData.activatedAt }
}

function saveLocalLicense(keyCode, deviceHash, expiresAt = null) {
  const timestamp = Date.now()
  const signature = calculateSignature(keyCode, deviceHash, timestamp)
  const data = {
    keyCode,
    deviceHash,
    timestamp,
    activatedAt: new Date().toISOString(),
    expiresAt,
    signature
  }
  const dir = path.dirname(LICENSE_FILE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(LICENSE_FILE_PATH, JSON.stringify(data), { encoding: 'utf-8', mode: 0o600 })
  return data
}

function clearLocalLicense() {
  if (fs.existsSync(LICENSE_FILE_PATH)) {
    try {
      fs.unlinkSync(LICENSE_FILE_PATH)
    } catch (err) {
      console.error('Failed to remove license file:', err)
    }
  }
}

function getStoredLicense() {
  if (!fs.existsSync(LICENSE_FILE_PATH)) return null
  try {
    const raw = fs.readFileSync(LICENSE_FILE_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function validateWithBackend(keyCode, deviceHash) {
  const osInfo = `${os.type()} ${os.release()} (${os.arch()})`
  const deviceName = os.hostname()

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key_code: keyCode,
        device_hash: deviceHash,
        device_name: deviceName,
        os_info: osInfo
      })
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Backend connection failed:', error.message)
    return {
      success: false,
      valid: false,
      isOffline: true,
      message:
        'Không thể kết nối đến máy chủ xác thực key. Kiểm tra kết nối mạng hoặc server backend.'
    }
  }
}

function runWhitelistedCommand(file, args) {
  return new Promise((resolve) => {
    const child = execFile(
      file,
      args,
      { windowsHide: true, timeout: 60000 },
      (error, stdout, stderr) => {
        resolve({
          success: !error,
          code: error?.code ?? 0,
          stdout: stdout?.toString() ?? '',
          stderr: stderr?.toString() ?? ''
        })
      }
    )
    child.unref()
  })
}

async function runDawaScript(scriptKey) {
  const script = ALLOWED_DAWA_SCRIPTS[scriptKey]
  if (!script) {
    return {
      success: false,
      message: `Script [${scriptKey}] không nằm trong danh sách được phép thực thi.`
    }
  }

  const outputs = []
  for (const [file, args] of script.commands) {
    const res = await runWhitelistedCommand(file, args)
    outputs.push({ file, args: args.join(' '), ...res })
    if (!res.success) {
      return {
        success: false,
        message: `Lỗi khi thực thi bước ${file} ${args.join(' ')}: ${res.stderr}`,
        stepResults: outputs
      }
    }
  }

  return {
    success: true,
    message: `Đã thực thi thành công script [${script.description}]`,
    stepResults: outputs
  }
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 960,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    backgroundColor: '#000000',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: '',
      devTools: is.dev
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const parsed = new URL(details.url)
    const allowedExternal = ['http:', 'https:']
    if (allowedExternal.includes(parsed.protocol)) {
      shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    if (!is.dev) {
      const url = new URL(details.url)
      const allowedProtocols = ['file:', 'devtools:', 'http:', 'https:']
      if (!allowedProtocols.includes(url.protocol)) {
        return callback({ cancel: true })
      }
    }
    callback({})
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.dawa.optimizer')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('license:get-device-hash', async () => {
    const hwid = await getHardwareHash()
    const nets = os.networkInterfaces()
    let localIp = '127.0.0.1'
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if ((net.family === 'IPv4' || net.family === 4) && !net.internal) {
          localIp = net.address
          break
        }
      }
    }
    return { hwid, ip: localIp }
  })

  ipcMain.handle('license:check-status', async () => {
    const currentDeviceHash = await getHardwareHash()
    const stored = getStoredLicense()

    if (!stored) {
      return { isActivated: false, message: 'Chưa kích hoạt bản quyền' }
    }

    const localCheck = verifyLocalLicense(stored, currentDeviceHash)
    if (!localCheck.valid) {
      clearLocalLicense()
      return { isActivated: false, message: localCheck.message }
    }

    const remoteResult = await validateWithBackend(stored.keyCode, currentDeviceHash)
    if (remoteResult.success && remoteResult.valid) {
      saveLocalLicense(stored.keyCode, currentDeviceHash, remoteResult.data?.expires_at)
      return {
        isActivated: true,
        keyCode: stored.keyCode,
        activatedAt: stored.activatedAt,
        data: remoteResult.data
      }
    } else if (remoteResult.isOffline) {
      return {
        isActivated: true,
        keyCode: stored.keyCode,
        activatedAt: stored.activatedAt,
        offlineMode: true,
        message: 'Đã xác thực offline theo chứng thư phần cứng'
      }
    } else {
      clearLocalLicense()
      return {
        isActivated: false,
        message: remoteResult.message || 'Key của bạn đã bị vô hiệu hóa hoặc thu hồi từ máy chủ'
      }
    }
  })

  ipcMain.handle('license:activate', async (_, keyCode) => {
    if (!keyCode || typeof keyCode !== 'string' || !keyCode.trim()) {
      return { success: false, message: 'Vui lòng nhập Key kích hoạt' }
    }

    const cleanKey = keyCode.trim().toUpperCase()
    const currentDeviceHash = await getHardwareHash()

    const result = await validateWithBackend(cleanKey, currentDeviceHash)

    if (result.success && result.valid) {
      saveLocalLicense(cleanKey, currentDeviceHash, result.data?.expires_at)
      return {
        success: true,
        message: result.message || 'Kích hoạt bản quyền thành công!',
        keyCode: cleanKey,
        data: result.data
      }
    } else {
      return {
        success: false,
        message: result.message || 'Mã key không hợp lệ hoặc đã hết hạn.'
      }
    }
  })

  ipcMain.handle('license:deactivate', async () => {
    clearLocalLicense()
    return { success: true }
  })

  ipcMain.handle('system:get-stats', async () => {
    try {
      const currentLoad = await si.currentLoad()
      const mem = await si.mem()
      const cpu = await si.cpu()
      const cpuTemp = await si.cpuTemperature()
      const graphics = await si.graphics()

      const primaryGpu = graphics.controllers[0] || { model: 'N/A', vendor: 'N/A', memoryTotal: 0 }

      return {
        success: true,
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          speed: cpu.speed,
          cores: cpu.cores,
          usagePercent: Math.round(currentLoad.currentLoad),
          temp: cpuTemp.main || null
        },
        gpu: {
          model: primaryGpu.model || 'Card màn hình',
          vendor: primaryGpu.vendor || 'N/A',
          vram: primaryGpu.memoryTotal ? `${Math.round(primaryGpu.memoryTotal / 1024)} GB` : 'N/A',
          usagePercent: primaryGpu.utilizationGpu || null,
          temp: primaryGpu.temperatureGpu || null
        },
        ram: {
          totalBytes: mem.total,
          usedBytes: mem.active || mem.total - mem.free,
          freeBytes: mem.free,
          totalGB: (mem.total / (1024 * 1024 * 1024)).toFixed(1),
          usedGB: ((mem.active || mem.total - mem.free) / (1024 * 1024 * 1024)).toFixed(1),
          freeGB: (mem.free / (1024 * 1024 * 1024)).toFixed(1),
          usagePercent: Math.round(((mem.active || mem.total - mem.free) / mem.total) * 100)
        },
        system: {
          platform: os.platform(),
          hostname: os.hostname(),
          arch: os.arch(),
          uptimeSeconds: Math.round(os.uptime()),
          release: os.release()
        }
      }
    } catch (err) {
      console.error('Failed to gather system stats:', err)
      return {
        success: false,
        error: err.message
      }
    }
  })

  ipcMain.handle('system:restart-to-bios', async () => {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        return resolve({ success: false, message: 'Chức năng này chỉ hỗ trợ Windows.' })
      }
      const child = execFile(
        'shutdown.exe',
        ['/r', '/fw', '/t', '5'],
        { windowsHide: true, timeout: 15000 },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              message: `Không thể khởi động vào BIOS. Yêu cầu quyền Administrator. Lỗi: ${stderr || error.message}`
            })
          } else {
            resolve({
              success: true,
              message:
                'Đang khởi động lại vào BIOS trong 5 giây... (Có thể hủy bằng lệnh shutdown /a)'
            })
          }
        }
      )
      child.unref()
    })
  })

  ipcMain.handle('system:run-dawa-script', async (_, { scriptKey }) => {
    if (process.platform !== 'win32') {
      return { success: false, message: 'Script tối ưu chỉ hỗ trợ Windows.' }
    }
    return runDawaScript(scriptKey)
  })

  ipcMain.handle('security:list-allowed-scripts', () => {
    return Object.fromEntries(
      Object.entries(ALLOWED_DAWA_SCRIPTS).map(([key, val]) => [
        key,
        { description: val.description }
      ])
    )
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
