import 'dotenv/config'
import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import buildIcon from '../../build/icon.png?asset'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { deflateSync } from 'zlib'
import si from 'systeminformation'
import fs from 'fs'
import {
  detectDeviceType,
  formatGpuVram,
  getDiscreteGpuController,
  getStaticInfo,
  isLikelyDiscreteGpu
} from './services/systemInfo'
import {
  createLicenseStore,
  getHardwareHash,
  maskHardwareId,
  maskLicenseKey,
  normalizeLicenseKey,
  refreshWithBackend,
  checkWithBackend,
  getDesktopFeaturePolicy,
  validateWithBackend,
  verifyLocalLicense
} from './services/licenseService'
import { ALLOWED_DAWA_SCRIPTS, runDawaScript } from './services/dawaScripts'

const GITHUB_RELEASE_API = 'https://api.github.com/repos/karal202/RDUC/releases/latest'
const GITHUB_DOWNLOAD_FALLBACK =
  'https://github.com/karal202/RDUC/releases/latest/download/Dawa-Optimizer-Setup.exe'
const BACKEND_URL_CHECK = process.env.BACKEND_URL
const allowOfflineLicense =
  process.env.NODE_ENV === 'development' && process.env.ALLOW_OFFLINE_LICENSE === 'true'
if (!BACKEND_URL_CHECK) {
  console.warn(
    '[SECURITY WARN] BACKEND_URL env var is not set — using the hardcoded default endpoint. ' +
      'For production builds, explicitly configure BACKEND_URL in the build environment.'
  )
}
if (!is.dev) {
  const debugFlags = ['inspect', 'inspect-brk', 'inspect-port', 'remote-debugging-port']
  const foundDebug = debugFlags.find((f) => app.commandLine.hasSwitch(f))
  if (foundDebug) {
    console.error(
      `[SECURITY] Debug flag --${foundDebug} detected on production build. Aborting launch.`
    )
    dialog
      .showErrorBox(
        'DAWA — Anti-Tamper',
        'Phát hiện flag gỡ lỗi trên build Production. Vui lòng khởi động lại ứng dụng mà không có flag phát triển.'
      )
      .catch(() => {})
    app.exit(1)
  }
  app.commandLine.appendSwitch('disable-remote-debugging')
  app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor')
}

app.commandLine.appendSwitch('disable-http-cache')
app.commandLine.appendSwitch('media-cache-size', '0')
app.commandLine.appendSwitch('disk-cache-size', '0')
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('js-flags', '--no-compilation-cache --no-wasm-code-cache')
app.commandLine.appendSwitch('disable-wasm-code-cache')
app.commandLine.appendSwitch('no-first-run')
app.commandLine.appendSwitch('no-default-browser-check')

try {
  const cacheRoot = path.join(os.tmpdir(), 'dawa-chromium-cache')
  if (!fs.existsSync(cacheRoot)) fs.mkdirSync(cacheRoot, { recursive: true })
  app.commandLine.appendSwitch('disk-cache-dir', cacheRoot)
  app.commandLine.appendSwitch('gpu-cache-dir', path.join(cacheRoot, 'gpu'))
} catch {
  void 0
}

const LICENSE_FILE_PATH = path.join(app.getPath('userData'), 'dawa_license_vault.dat')
const WINDOWS_SHUTDOWN_PATH = path.join(
  process.env.SystemRoot || 'C:\\Windows',
  'System32',
  'shutdown.exe'
)
const licenseStore = createLicenseStore(LICENSE_FILE_PATH)
const activateAttempts = []

let tray = null
let trayActiveImage = null
let trayNormalImage = null
let taskbarActiveOverlay = null
let trayCurrentState = 'idle'

function crc32Table() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
}
const crc32Tbl = crc32Table()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) c = crc32Tbl[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}
function generateCircleOverlay({ size = 16, hex = '#22c55e' } = {}) {
  const hexRgb = typeof hex === 'string' && hex.startsWith('#') ? hex.substring(1) : '22c55e'
  const r = parseInt(hexRgb.substring(0, 2), 16)
  const g = parseInt(hexRgb.substring(2, 4), 16)
  const b = parseInt(hexRgb.substring(4, 6), 16)
  const pixels = Buffer.alloc(size * size * 4)
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const radius = Math.max(1, size / 2 - 0.5)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4
      const dx = x - cx
      const dy = y - cy
      const inside = dx * dx + dy * dy <= radius * radius
      pixels[idx] = r
      pixels[idx + 1] = g
      pixels[idx + 2] = b
      pixels[idx + 3] = inside ? 255 : 0
    }
  }
  const raw = Buffer.alloc((size * 4 + 1) * size)
  let pos = 0
  for (let y = 0; y < size; y += 1) {
    raw[pos] = 0
    pos += 1
    pixels.copy(raw, pos, y * size * 4, (y + 1) * size * 4)
    pos += size * 4
  }
  const idat = deflateSync(raw)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}
function generateTintedTrayIcon({ size = 64, tintHex = '#22c55e' } = {}) {
  const sizeX = typeof size === 'number' ? size : 64
  const sizeInt = Math.max(16, Math.min(256, sizeX))
  const hexRgb =
    typeof tintHex === 'string' && tintHex.startsWith('#') ? tintHex.substring(1) : '22c55e'
  const tr = parseInt(hexRgb.substring(0, 2), 16)
  const tg = parseInt(hexRgb.substring(2, 4), 16)
  const tb = parseInt(hexRgb.substring(4, 6), 16)
  const pixels = Buffer.alloc(sizeInt * sizeInt * 4)
  const cx = (sizeInt - 1) / 2
  const cy = (sizeInt - 1) / 2
  const outer = Math.max(2, sizeInt / 2 - 0.5)
  const inner = Math.max(1, sizeInt / 2 - 3)
  for (let y = 0; y < sizeInt; y += 1) {
    for (let x = 0; x < sizeInt; x += 1) {
      const idx = (y * sizeInt + x) * 4
      const dx = x - cx
      const dy = y - cy
      const d2 = dx * dx + dy * dy
      if (d2 > outer * outer) {
        pixels[idx + 3] = 0
        continue
      }
      let alpha = 255
      if (d2 > inner * inner) {
        const t = (outer - Math.sqrt(d2)) / (outer - inner)
        alpha = Math.max(0, Math.min(255, Math.round(t * 255)))
      }
      pixels[idx] = tr
      pixels[idx + 1] = tg
      pixels[idx + 2] = tb
      pixels[idx + 3] = alpha
    }
  }
  const stride = sizeInt * 4
  const raw = Buffer.alloc((stride + 1) * sizeInt)
  let pos = 0
  for (let y = 0; y < sizeInt; y += 1) {
    raw[pos] = 0
    pos += 1
    pixels.copy(raw, pos, y * stride, (y + 1) * stride)
    pos += stride
  }
  const idat = deflateSync(raw)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(sizeInt, 0)
  ihdr.writeUInt32BE(sizeInt, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

function buildTrayIcons() {
  try {
    const fallback = nativeImage.createFromPath
      ? nativeImage.createFromPath(buildIcon || icon)
      : null
    const base =
      fallback && !fallback.isEmpty()
        ? fallback.resize({ width: 64, height: 64, quality: 'best' })
        : null
    const normalPng =
      base && !base.isEmpty()
        ? base.toPNG()
        : generateTintedTrayIcon({ size: 64, tintHex: '#64748b' })
    const activePng = generateTintedTrayIcon({ size: 64, tintHex: '#22c55e' })
    const overlayPng = generateCircleOverlay({ size: 16, hex: '#22c55e' })
    trayNormalImage = nativeImage.createFromBuffer(normalPng, { width: 64, height: 64 })
    trayActiveImage = nativeImage.createFromBuffer(activePng, { width: 64, height: 64 })
    taskbarActiveOverlay = nativeImage.createFromBuffer(overlayPng, { width: 16, height: 16 })
  } catch (e) {
    const normalBase = nativeImage.createFromPath(buildIcon || icon)
    trayNormalImage = normalBase
    trayActiveImage = normalBase
    taskbarActiveOverlay = normalBase.resize({ width: 16, height: 16 })
    console.warn('[TRAY] Fallback to base icon tint:', e.message)
  }
}

function setTrayState(state) {
  trayCurrentState = state
  if (!tray) {
    return
  }
  if (state === 'active') {
    if (trayActiveImage) tray.setImage(trayActiveImage)
    tray.setToolTip('DAWA Optimizer • Đang hoạt động (Bản quyền đã kích hoạt)')
    if (mainWindow && typeof mainWindow.setOverlayIcon === 'function' && taskbarActiveOverlay) {
      mainWindow.setOverlayIcon(taskbarActiveOverlay, 'DAWA Optimizer - Đang kích hoạt')
    }
  } else if (state === 'update') {
    if (trayNormalImage) tray.setImage(trayNormalImage)
    tray.setToolTip('DAWA Optimizer • Có phiên bản mới')
    if (mainWindow && typeof mainWindow.setOverlayIcon === 'function') {
      mainWindow.setOverlayIcon(null, '')
    }
  } else if (state === 'error') {
    if (trayNormalImage) tray.setImage(trayNormalImage)
    tray.setToolTip('DAWA Optimizer • Lỗi bản quyền hoặc kết nối')
    if (mainWindow && typeof mainWindow.setOverlayIcon === 'function') {
      mainWindow.setOverlayIcon(null, '')
    }
  } else {
    if (trayNormalImage) tray.setImage(trayNormalImage)
    tray.setToolTip('DAWA Optimizer • Đang chạy ngầm')
    if (mainWindow && typeof mainWindow.setOverlayIcon === 'function') {
      mainWindow.setOverlayIcon(null, '')
    }
  }
}

function toggleMainWindow(forceShow = false) {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (forceShow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
    return
  }
  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    mainWindow.hide()
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
  }
}

function createTray() {
  buildTrayIcons()
  try {
    tray = new Tray(trayNormalImage || nativeImage.createFromPath(icon))
  } catch (e) {
    console.warn('[TRAY] Create failed, fallback to build icon:', e.message)
    tray = new Tray(nativeImage.createFromPath(buildIcon || icon))
  }
  tray.setToolTip('DAWA Optimizer • Đang chạy ngầm')
  const rebuildMenu = () => {
    const stateLabel =
      trayCurrentState === 'active'
        ? 'Trạng thái: Đã kích hoạt (Xanh lá cây - Đang chạy tốt)'
        : 'Trạng thái: Chờ kích hoạt'
    const template = [
      {
        label: 'Mở / Ẩn DAWA Optimizer',
        click: () => toggleMainWindow()
      },
      { type: 'separator' },
      {
        label: stateLabel,
        enabled: false
      },
      {
        label: 'Kiểm tra cập nhật',
        click: async () => {
          try {
            toggleMainWindow(true)
            if (!is.dev) autoUpdater.checkForUpdates().catch(() => {})
            mainWindow?.webContents.send('app:update-status', { status: 'checking' })
          } catch {
            /* noop */
          }
        }
      },
      {
        label: 'Trang chủ (Website)',
        click: () => shell.openExternal('https://github.com/karal202/RDUC').catch(() => {})
      },
      { type: 'separator' },
      {
        label: 'Thoát hoàn toàn',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.removeAllListeners('close')
          }
          app.isQuiting = true
          app.quit()
        }
      }
    ]
    const menu = Menu.buildFromTemplate(template)
    tray.setContextMenu(menu)
  }
  rebuildMenu()
  setInterval(rebuildMenu, 10_000)
  tray.on('click', () => {
    rebuildMenu()
    toggleMainWindow()
  })
  tray.on('double-click', () => toggleMainWindow(true))
  if (process.platform === 'win32') {
    tray.on('balloon-click', () => toggleMainWindow(true))
  }
  setTrayState(trayCurrentState)
}

function isActivateRateLimited() {
  const now = Date.now()
  while (activateAttempts.length && now - activateAttempts[0] > 60_000) {
    activateAttempts.shift()
  }
  if (activateAttempts.length >= 5) return true
  activateAttempts.push(now)
  return false
}

function isHardRevocation(payload) {
  if (!payload || typeof payload !== 'object') return false
  if (payload.revoked === true || payload.disabled === true || payload.expired === true) return true
  const msg = String(payload.message || '').toLowerCase()
  if (!msg) return false
  const hardMarkers = [
    'revoked',
    'thu hồi',
    'thu hoi',
    'vo hieu hoa',
    'vô hiệu hóa',
    'disabled',
    'expired',
    'hết hạn',
    'het han'
  ]
  return hardMarkers.some((marker) => msg.includes(marker))
}

async function getLocalLicenseGate() {
  const currentDeviceHash = await getHardwareHash()
  const stored = licenseStore.get()
  const localCheck = stored ? verifyLocalLicense(stored, currentDeviceHash) : { valid: false }
  return { currentDeviceHash, stored, localCheck }
}

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
    const response = await fetch(GITHUB_RELEASE_API, {
      method: 'GET',
      headers: { Accept: 'application/vnd.github+json' }
    })
    if (!response.ok) return { success: false }
    const data = await response.json()

    const assets = Array.isArray(data.assets) ? data.assets : []
    const exeAsset = assets.find(
      (a) => typeof a.name === 'string' && /\.exe$/i.test(a.name) && !a.name.endsWith('.blockmap')
    )

    const tag = String(data.tag_name || '').replace(/^v/i, '')
    const rawBody = String(data.body || '')
    const releaseName = String(data.name || '')

    return {
      success: true,
      version: tag || app.getVersion(),
      name: releaseName || app.getName(),
      downloadUrl: exeAsset?.browser_download_url || GITHUB_DOWNLOAD_FALLBACK,
      releaseNotes: rawBody.trim() || 'Bản cập nhật mới tối ưu hiệu năng và sửa lỗi.',
      mandatory: false
    }
  } catch (error) {
    return { success: false, message: error.message }
  }
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    backgroundColor: '#08080b',
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
    setTrayState(trayCurrentState)
  })

  mainWindow.on('close', (event) => {
    if (app.isQuiting) return
    if (process.platform === 'darwin') return
    event.preventDefault()
    try {
      if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false)
      if (mainWindow.isMaximized()) mainWindow.unmaximize()
      mainWindow.hide()
      if (typeof tray?.displayBalloon === 'function') {
        try {
          tray.displayBalloon({
            title: 'DAWA Optimizer vẫn đang chạy',
            content:
              'Ứng dụng đã ẩn vào khay hệ thống. Click icon DAWA để mở lại hoặc chuột phải để Thoát hoàn toàn.',
            iconType: 'info',
            noSound: true,
            largeIcon: false
          })
        } catch {
          /* noop */
        }
      }
    } catch {
      app.isQuiting = true
      app.quit()
    }
  })

  mainWindow.on('minimize', () => {
    try {
      if (tray && process.platform === 'win32' && typeof tray.displayBalloon === 'function') {
        tray.displayBalloon({
          title: 'DAWA Optimizer • Đã thu nhỏ',
          content: 'Ứng dụng vẫn đang chạy ngầm. Click icon DAWA ở khay để mở lại nhanh.',
          iconType: 'info',
          noSound: true,
          largeIcon: false
        })
      }
      mainWindow.setSkipTaskbar?.(true)
    } catch {
      /* noop */
    }
    setTimeout(() => {
      try {
        mainWindow.setSkipTaskbar?.(false)
      } catch {
        /* noop */
      }
    }, 800)
  })

  mainWindow.on('show', () => {
    try {
      mainWindow.setSkipTaskbar?.(false)
    } catch {
      /* noop */
    }
    setTrayState(trayCurrentState)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const parsed = new URL(details.url)
    const allowedExternal = ['http:', 'https:']
    if (allowedExternal.includes(parsed.protocol)) {
      shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL
    const allowed =
      url.startsWith('file:') || (is.dev && rendererUrl && url.startsWith(rendererUrl))
    if (!allowed) event.preventDefault()
  })

  if (!is.dev) {
    mainWindow.webContents.on('devtools-opened', () => mainWindow.webContents.closeDevTools())
    mainWindow.webContents.on('before-input-event', (_, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') mainWindow.webContents.closeDevTools()
    })
  }

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

  // Create tray BEFORE main window so tray icon is available when window hides to it
  try {
    createTray()
  } catch (trayErr) {
    console.warn('[TRAY] Failed to create tray:', trayErr.message)
  }

  // Warm-up static cache ngay khi app khởi động
  // → khi user vào Dashboard, CPU/GPU info đã sẵn, không cần fetch lại
  getStaticInfo().catch(() => {})

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('tray:set-state', async (_, payload) => {
    const state = typeof payload === 'string' ? payload : payload?.state || ''
    const next = ['active', 'error', 'update', 'idle'].includes(state) ? state : 'idle'
    setTrayState(next)
    return { success: true, state: next }
  })

  ipcMain.handle('tray:minimize-to-tray', async () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false)
        if (mainWindow.isMaximized()) mainWindow.unmaximize()
        mainWindow.hide()
      }
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('tray:show-window', async () => {
    toggleMainWindow(true)
    return { success: true }
  })

  ipcMain.handle('app:check-version', async () => {
    const currentVersion = app.getVersion()
    const latestVersionInfo = await getLatestAppVersion()

    if (!latestVersionInfo.success) {
      return {
        currentVersion,
        latestVersion: null,
        isOutdated: false,
        downloadUrl: GITHUB_DOWNLOAD_FALLBACK,
        releaseNotes: '',
        mandatory: false,
        message: 'Không thể kiểm tra phiên bản mới từ GitHub.'
      }
    }

    const latestVersion = latestVersionInfo.version || currentVersion
    const isOutdated = compareVersions(currentVersion, latestVersion) < 0

    return {
      currentVersion,
      latestVersion,
      isOutdated,
      downloadUrl: latestVersionInfo.downloadUrl,
      releaseNotes: latestVersionInfo.releaseNotes,
      mandatory: latestVersionInfo.mandatory,
      message: isOutdated
        ? `Đã có phiên bản mới ${latestVersion}. Vui lòng cập nhật ứng dụng.`
        : 'Bạn đang chạy phiên bản mới nhất.'
    }
  })

  ipcMain.handle('app:open-download-url', async (_, customUrl) => {
    let targetUrl = GITHUB_DOWNLOAD_FALLBACK
    if (typeof customUrl === 'string' && customUrl.trim()) {
      try {
        const parsed = new URL(customUrl.trim())
        const allowedHosts = [
          'rductest.vercel.app',
          'github.com',
          'objects.githubusercontent.com',
          'rduc.onrender.com'
        ]
        if (
          parsed.protocol === 'https:' &&
          allowedHosts.some(
            (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
          )
        ) {
          targetUrl = parsed.toString()
        } else {
          console.warn('[SECURITY] Blocked untrusted URL in open-download-url:', customUrl)
        }
      } catch {
        targetUrl = GITHUB_DOWNLOAD_FALLBACK
      }
    }
    await shell.openExternal(targetUrl)
    return { success: true }
  })

  ipcMain.handle('app:start-auto-update', async () => {
    try {
      if (is.dev) {
        return {
          success: false,
          isDev: true,
          message: 'Auto-updater không chạy trong môi trường dev.'
        }
      }
      const res = await autoUpdater.checkForUpdates()
      return { success: true, updateInfo: res?.updateInfo }
    } catch (err) {
      console.warn('[AUTO-UPDATER] Check failed:', err.message)
      return { success: false, message: err.message || 'Không thể kiểm tra auto-updater' }
    }
  })

  ipcMain.handle('app:quit-and-install', () => {
    try {
      autoUpdater.quitAndInstall(false, true)
      return { success: true }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    console.log('[AUTO-UPDATER] Checking for update...')
    mainWindow?.webContents.send('app:update-status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[AUTO-UPDATER] Update available:', info.version)
    mainWindow?.webContents.send('app:update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AUTO-UPDATER] No update available.')
    mainWindow?.webContents.send('app:update-not-available', info)
  })

  autoUpdater.on('error', (error) => {
    console.warn('[AUTO-UPDATER] Error:', error?.message)
    mainWindow?.webContents.send('app:update-error', error?.message || 'Lỗi kiểm tra cập nhật')
  })

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('app:update-progress', {
      percent: Math.round(progressObj.percent || 0),
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AUTO-UPDATER] Update downloaded:', info)
    mainWindow?.webContents.send('app:update-downloaded', info)
  })

  if (!is.dev) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.warn('[AUTO-UPDATER] Silent check failed:', err.message)
    })
  }

  ipcMain.handle('license:get-device-hash', async () => {
    const hwid = await getHardwareHash()
    return { ready: true, fingerprint: maskHardwareId(hwid) }
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

    let tokens = licenseStore.getTokens()
    let remoteResult = tokens
      ? await checkWithBackend(tokens.accessToken).catch(() => ({ status: 0, data: {} }))
      : null
    if (remoteResult?.status === 401 && tokens?.refreshToken) {
      const refreshed = await refreshWithBackend(tokens.refreshToken).catch(() => null)
      if (refreshed?.success) {
        tokens = { ...tokens, accessToken: refreshed.accessToken }
        licenseStore.saveTokens(tokens)
        remoteResult = await checkWithBackend(tokens.accessToken).catch(() => ({
          status: 0,
          data: {}
        }))
      }
    }
    if (!remoteResult || remoteResult.status === 0) {
      const activation = await validateWithBackend(stored.keyCode, currentDeviceHash)
      if (activation.success && activation.valid) {
        tokens = { accessToken: activation.accessToken, refreshToken: activation.refreshToken }
        licenseStore.saveTokens(tokens)
        remoteResult = { data: activation }
      } else {
        remoteResult = { data: activation }
      }
    }
    if (remoteResult?.data?.success && remoteResult.data.valid) {
      return {
        isActivated: true,
        keyCode: maskLicenseKey(stored.keyCode),
        activatedAt: stored.activatedAt,
        data: remoteResult.data
      }
    }

    const backendSaysOffline = !!remoteResult?.data?.isOffline
    const backendUnreachable = !remoteResult || remoteResult.status === 0
    const remotePayload = remoteResult?.data || {}
    const hardRevoked = isHardRevocation(remotePayload)

    if (hardRevoked) {
      licenseStore.clear()
      return {
        isActivated: false,
        revoked: true,
        message: remotePayload.message || 'Key của bạn đã bị thu hồi hoặc vô hiệu hóa từ máy chủ.'
      }
    }

    if (allowOfflineLicense && localCheck.valid && (backendSaysOffline || backendUnreachable)) {
      return {
        isActivated: true,
        offlineMode: true,
        keyCode: maskLicenseKey(stored.keyCode),
        activatedAt: stored.activatedAt,
        message:
          remotePayload?.message ||
          'Không thể kết nối máy chủ xác thực. Đã mở khóa ở chế độ Offline bằng license cục bộ.'
      }
    }

    if (allowOfflineLicense && remotePayload?.success === false && !hardRevoked) {
      return {
        isActivated: true,
        offlineMode: true,
        keyCode: maskLicenseKey(stored.keyCode),
        activatedAt: stored.activatedAt,
        message:
          remotePayload?.message ||
          'Máy chủ trả về kết quả không xác định. Đã mở khóa bằng chữ ký cục bộ.'
      }
    }

    licenseStore.clear()
    return {
      isActivated: false,
      message: remotePayload?.message || 'Key của bạn đã bị vô hiệu hóa hoặc thu hồi từ máy chủ'
    }
  })

  ipcMain.handle('license:get-access-token', async () => {
    const { localCheck } = await getLocalLicenseGate()
    if (!localCheck.valid) return null
    return licenseStore.getTokens()?.accessToken || null
  })

  ipcMain.handle('license:activate', async (_, keyCode) => {
    if (isActivateRateLimited()) {
      return { success: false, message: 'Quá nhiều lần thử. Đợi 1 phút rồi thử lại.' }
    }
    const cleanKey = normalizeLicenseKey(keyCode)
    if (!cleanKey) {
      return { success: false, message: 'Định dạng key không hợp lệ.' }
    }

    const currentDeviceHash = await getHardwareHash()
    const result = await validateWithBackend(cleanKey, currentDeviceHash)

    if (result.success && result.valid) {
      licenseStore.save(cleanKey, currentDeviceHash, result.data?.expires_at)
      licenseStore.saveTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      })
      return {
        success: true,
        message: result.message || 'Kích hoạt bản quyền thành công!',
        keyCode: maskLicenseKey(cleanKey),
        data: result.data
      }
    }
    return {
      success: false,
      message: result.message || 'Mã key không hợp lệ hoặc đã hết hạn.'
    }
  })

  ipcMain.handle('license:deactivate', async () => {
    licenseStore.clear()
    return { success: true }
  })

  setInterval(
    async () => {
      const tokens = licenseStore.getTokens()
      if (!tokens?.accessToken) return
      let result = await checkWithBackend(tokens.accessToken).catch(() => null)
      if (result?.status === 401 && tokens.refreshToken) {
        const refreshed = await refreshWithBackend(tokens.refreshToken).catch(() => null)
        if (refreshed?.success) {
          licenseStore.saveTokens({ ...tokens, accessToken: refreshed.accessToken })
          result = await checkWithBackend(refreshed.accessToken).catch(() => null)
        }
      }
      if (!result || result.status === 0) return
      if (!result?.data?.success || !result.data.valid) {
        licenseStore.clear()
        mainWindow?.webContents.send('license:revoked')
      }
    },
    5 * 60 * 1000
  )

  ipcMain.handle('system:get-stats', async () => {
    try {
      // Chạy song song: load + mem + cpuTemp + gpuTemp + device type (cached) + battery
      const [currentLoad, mem, cpuTemp, graphics, deviceType, batteryInfo] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.cpuTemperature(),
        si.graphics(),
        detectDeviceType(),
        si.battery().catch(() => null)
      ])

      // Lấy static info từ cache (không fetch lại mỗi poll)
      const staticInfo = await getStaticInfo()

      const gpuController = getDiscreteGpuController(graphics) || graphics.controllers[0] || {}
      const hasDiscreteGpu = isLikelyDiscreteGpu(gpuController)

      return {
        success: true,
        deviceType: deviceType === 'laptop' ? 'laptop' : 'pc',
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
        },
        battery: batteryInfo?.hasBattery
          ? {
              percent: batteryInfo.percent ?? null,
              charging: batteryInfo.isCharging ?? false
            }
          : { percent: null, charging: false }
      }
    } catch (err) {
      console.error('Failed to gather system stats:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('system:restart-to-bios', async () => {
    const { localCheck } = await getLocalLicenseGate()
    if (!localCheck.valid) {
      return { success: false, message: 'Yêu cầu bản quyền hợp lệ.' }
    }
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

  ipcMain.handle('system:run-dawa-script', async (_, { scriptKey, options = {} }) => {
    const { localCheck } = await getLocalLicenseGate()
    if (!localCheck.valid) {
      return { success: false, message: 'Yêu cầu bản quyền hợp lệ.' }
    }
    if (process.platform !== 'win32') {
      return { success: false, message: 'Script tối ưu chỉ hỗ trợ Windows.' }
    }
    if (
      typeof scriptKey !== 'string' ||
      !(ALLOWED_DAWA_SCRIPTS[scriptKey] || scriptKey === 'dawa-cleaner')
    ) {
      return { success: false, message: 'Script không được phép.' }
    }
    // The server policy can only disable known allowlisted actions; it never supplies commands.
    try {
      const token = licenseStore.getTokens()?.accessToken
      if (token) {
        const policy = await getDesktopFeaturePolicy(token)
        const feature = policy?.features?.[scriptKey]
        if (feature?.deleted) {
          return { success: false, message: 'File kích hoạt này đã bị Admin xóa. Vui lòng liên hệ hỗ trợ.' }
        }
        if (feature && !feature.exists) {
          return { success: false, message: 'File kích hoạt hiện không tồn tại hoặc không khả dụng. Vui lòng liên hệ hỗ trợ.' }
        }
        if (feature && !feature.enabled) {
          return { success: false, message: 'Chức năng này đang được Admin tạm tắt.' }
        }
        if (policy?.enabled?.[scriptKey] === false) {
          return { success: false, message: 'Chức năng này đang được Admin tạm tắt.' }
        }
      }
    } catch (error) {
      console.warn('Feature policy unavailable; using local allowlist:', error.message)
    }
    return runDawaScript(scriptKey, options)
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
  if (process.platform === 'darwin') return
  if (tray && !app.isQuiting) {
    try {
      if (typeof tray.displayBalloon === 'function') {
        tray.displayBalloon({
          title: 'DAWA Optimizer • Chạy ngầm',
          content:
            'Tất cả cửa sổ đã đóng. Ứng dụng vẫn chạy ở khay hệ thống. Bấm chuột phải icon DAWA ở tray để Thoát hoàn toàn.',
          iconType: 'info',
          noSound: true,
          largeIcon: false
        })
      }
    } catch {
      /* noop */
    }
    return
  }
  app.quit()
})
