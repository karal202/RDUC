import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import si from 'systeminformation'
import {
  formatGpuVram,
  getDiscreteGpuController,
  getStaticInfo,
  isLikelyDiscreteGpu
} from './services/systemInfo'
import {
  createLicenseStore,
  getHardwareHash,
  validateWithBackend,
  verifyLocalLicense
} from './services/licenseService'
import { ALLOWED_DAWA_SCRIPTS, runDawaScript } from './services/dawaScripts'

const APP_VERSION_URL = process.env.APP_VERSION_URL || 'http://localhost:3069/api/app-version'
const LICENSE_FILE_PATH = path.join(app.getPath('userData'), 'dawa_license_vault.dat')
const WINDOWS_SHUTDOWN_PATH = path.join(
  process.env.SystemRoot || 'C:\\Windows',
  'System32',
  'shutdown.exe'
)
const licenseStore = createLicenseStore(LICENSE_FILE_PATH)

function compareVersions(currentVersion, latestVersion) {
  const coerce = (value) => {
    const normalized = `${value || '0'}`.trim().replace(/[^0-9.]+/g, '')
    const parts = normalized.split('.').map((part) => Number(part || 0))
    while (parts.length < 3) parts.push(0)
    return parts
  }

  const a = coerce(currentVersion)
  const b = coerce(latestVersion)

  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1
    if (a[index] < b[index]) return -1
  }

  return 0
}

async function getLatestAppVersion() {
  try {
    const response = await fetch(APP_VERSION_URL, { method: 'GET' })
    if (!response.ok) return { success: false }
    const data = await response.json()
    return {
      success: true,
      version: data?.version || app.getVersion(),
      name: data?.name || app.getName()
    }
  } catch (error) {
    return { success: false, message: error.message }
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

  // Warm-up static cache ngay khi app khởi động
  // → khi user vào Dashboard, CPU/GPU info đã sẵn, không cần fetch lại
  getStaticInfo().catch(() => {})

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('app:check-version', async () => {
    const currentVersion = app.getVersion()
    const latestVersionInfo = await getLatestAppVersion()

    if (!latestVersionInfo.success) {
      return {
        currentVersion,
        latestVersion: null,
        isOutdated: false,
        message: 'Không thể kiểm tra phiên bản mới từ server.'
      }
    }

    const latestVersion = latestVersionInfo.version || currentVersion
    const isOutdated = compareVersions(currentVersion, latestVersion) < 0

    return {
      currentVersion,
      latestVersion,
      isOutdated,
      message: isOutdated
        ? `Đã có phiên bản mới ${latestVersion}. Vui lòng cập nhật ứng dụng.`
        : 'Bạn đang chạy phiên bản mới nhất.'
    }
  })

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for app update...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
  })

  autoUpdater.on('update-not-available', () => {
    console.log('No app update available.')
  })

  autoUpdater.on('error', (error) => {
    console.error('AutoUpdater error:', error)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    console.log('Download progress:', progressObj.percent)
  })

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Cập nhật đã sẵn sàng',
      message: 'Một bản cập nhật mới đã được tải xuống. Ứng dụng sẽ được cập nhật khi đóng lại.',
      buttons: ['OK']
    })
  })

  autoUpdater.checkForUpdatesAndNotify()

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
    const stored = licenseStore.get()

    if (!stored) {
      return { isActivated: false, message: 'Chưa kích hoạt bản quyền' }
    }

    const localCheck = verifyLocalLicense(stored, currentDeviceHash)
    if (!localCheck.valid) {
      licenseStore.clear()
      return { isActivated: false, message: localCheck.message }
    }

    const remoteResult = await validateWithBackend(stored.keyCode, currentDeviceHash)
    if (remoteResult.success && remoteResult.valid) {
      licenseStore.save(stored.keyCode, currentDeviceHash, remoteResult.data?.expires_at)
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
      licenseStore.clear()
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
      licenseStore.save(cleanKey, currentDeviceHash, result.data?.expires_at)
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
    licenseStore.clear()
    return { success: true }
  })

  ipcMain.handle('system:get-stats', async () => {
    try {
      // Chạy song song: load + mem + cpuTemp + gpuTemp (dynamic data)
      const [currentLoad, mem, cpuTemp, graphics] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.cpuTemperature(),
        si.graphics()
      ])

      // Lấy static info từ cache (không fetch lại mỗi poll)
      const staticInfo = await getStaticInfo()

      const gpuController = getDiscreteGpuController(graphics) || graphics.controllers[0] || {}
      const hasDiscreteGpu = isLikelyDiscreteGpu(gpuController)

      return {
        success: true,
        cpu: {
          ...staticInfo.cpu,
          usagePercent: Math.round(currentLoad.currentLoad),
          temp: cpuTemp.main ?? cpuTemp.cores?.[0] ?? null
        },
        gpu: {
          ...staticInfo.gpu,
          model: gpuController.model || 'Card màn hình',
          vendor: gpuController.vendor || 'N/A',
          vram: formatGpuVram(gpuController.memoryTotal),
          usagePercent: gpuController.utilizationGpu ?? null,
          temp: gpuController.temperatureGpu ?? null,
          hasDiscreteGpu
        },
        ram: {
          totalBytes: mem.total,
          usedBytes: mem.active || mem.total - mem.free,
          freeBytes: mem.free,
          totalGB: (mem.total / 1073741824).toFixed(1),
          usedGB: ((mem.active || mem.total - mem.free) / 1073741824).toFixed(1),
          freeGB: (mem.free / 1073741824).toFixed(1),
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
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('system:restart-to-bios', async () => {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        return resolve({ success: false, message: 'Chức năng này chỉ hỗ trợ Windows.' })
      }
      const child = execFile(
        WINDOWS_SHUTDOWN_PATH,
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
