const fsLaunch = require('fs')
const pathLaunch = require('path')
const osLaunch = require('os')

let _launchLogPath = null
function _getLaunchLogPath() {
  if (_launchLogPath) return _launchLogPath
  let baseDir = null
  try {
    const { app } = require('electron')
    if (app && typeof app.getPath === 'function') baseDir = app.getPath('userData')
  } catch {
    void 0
  }
  if (!baseDir) baseDir = osLaunch.tmpdir()
  try {
    if (!fsLaunch.existsSync(baseDir)) fsLaunch.mkdirSync(baseDir, { recursive: true })
    const logDir = pathLaunch.join(baseDir, 'logs')
    if (!fsLaunch.existsSync(logDir)) fsLaunch.mkdirSync(logDir, { recursive: true })
    _launchLogPath = pathLaunch.join(logDir, 'dawa-launch.log')
  } catch {
    _launchLogPath = pathLaunch.join(osLaunch.tmpdir(), 'dawa-launch.log')
  }
  return _launchLogPath
}

let _stdioWriteCount = 0
let _stdioBroken = false
function _tryWriteStdio(stream, line) {
  if (_stdioBroken) return
  if (_stdioWriteCount > 4096) return
  try {
    _stdioWriteCount += 1
    if (typeof stream?.write !== 'function') return
    if (!stream.writable) return
    if (stream.destroyed) return
    stream.write(line, () => {})
  } catch {
    _stdioBroken = true
  }
}

let _insideFatalHandler = false
function launchLog(level, tag, msg) {
  const ts = new Date().toISOString()
  const line = `[${ts}] [${level.toUpperCase()}] [${tag}] ${msg}${
    msg && msg.endsWith('\n') ? '' : '\n'
  }`
  try {
    fsLaunch.appendFileSync(_getLaunchLogPath(), line, 'utf8')
  } catch {
    void 0
  }
  if (_insideFatalHandler) return
  const out = level === 'error' || level === 'warn' ? process.stderr : process.stdout
  _tryWriteStdio(out, line)
}
function bootBanner() {
  const p = _getLaunchLogPath()
  try {
    fsLaunch.writeFileSync(
      p,
      `\n========== DAWA OPTIMIZER STARTUP ${new Date().toISOString()} ==========\n` +
        `PID=${process.pid}  ARGV=${JSON.stringify(process.argv)}\n` +
        `CWD=${process.cwd()}  EXE=${process.execPath}\n` +
        `PLATFORM=${process.platform}  ARCH=${process.arch}  NODE=${process.versions.node}  ELECTRON=${process.versions.electron}\n`,
      'utf8'
    )
  } catch {
    void 0
  }
  launchLog('info', 'BOOT', `Launch log file: ${p}`)
}
bootBanner()

;(function patchConsole() {
  const origLog = console.log
  const origWarn = console.warn
  const origErr = console.error
  const origInfo = console.info
  function fmt(args) {
    try {
      return args
        .map((a) => {
          if (a instanceof Error) return a.stack || String(a)
          if (typeof a === 'object') return JSON.stringify(a)
          return String(a)
        })
        .join(' ')
    } catch {
      return String(args[0] || '')
    }
  }
  console.log = function () {
    launchLog('info', 'console', fmt(Array.from(arguments)))
    return origLog.apply(console, arguments)
  }
  console.warn = function () {
    launchLog('warn', 'console', fmt(Array.from(arguments)))
    return origWarn.apply(console, arguments)
  }
  console.error = function () {
    launchLog('error', 'console', fmt(Array.from(arguments)))
    return origErr.apply(console, arguments)
  }
  console.info = function () {
    launchLog('info', 'console', fmt(Array.from(arguments)))
    return origInfo.apply(console, arguments)
  }
})()

let _uncaughtCount = 0
process.on('uncaughtException', (err) => {
  _uncaughtCount += 1
  const stack = err && err.stack ? err.stack : String(err)
  const msg = err && err.message ? err.message : String(err)

  if (_uncaughtCount === 1 || !/EPIPE|broken pipe/i.test(msg || '')) {
    try {
      const ts = new Date().toISOString()
      const line = `[${ts}] [ERROR] [CRASH] uncaughtException: ${stack}\n`
      fsLaunch.appendFileSync(_getLaunchLogPath(), line, 'utf8')
    } catch {
      void 0
    }
    _insideFatalHandler = true
    try {
      const { dialog } = require('electron')
      if (dialog && typeof dialog.showErrorBox === 'function') {
        dialog.showErrorBox(
          'DAWA Optimizer — Lỗi khởi động',
          `Ứng dụng bị lỗi nghiêm trọng và phải dừng lại.\n\n` +
            `Chi tiết lỗi: ${msg}\n\n` +
            `Đường dẫn file log: ${_getLaunchLogPath()}`
        )
      }
    } catch {
      void 0
    }
  }
  if (_uncaughtCount >= 5) {
    process.exit(1)
    return
  }
  setTimeout(() => {
    if (_uncaughtCount >= 5) process.exit(1)
  }, 800)
})
process.on('unhandledRejection', (reason) => {
  const r = reason instanceof Error ? reason.stack : String(reason)
  try {
    const ts = new Date().toISOString()
    const line = `[${ts}] [ERROR] [CRASH] unhandledRejection: ${r}\n`
    fsLaunch.appendFileSync(_getLaunchLogPath(), line, 'utf8')
  } catch {
    void 0
  }
})

try {
  require('dotenv').config()
  launchLog('info', 'BOOT', 'dotenv loaded successfully')
} catch (e) {
  launchLog('warn', 'BOOT', `dotenv not available (skipping): ${e.message}`)
}

import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
let icon = null
let buildIcon = null
try {
  const { nativeImage } = require('electron')
  const path = require('path')
  const fs = require('fs')
  function _findIcon(rel) {
    const checks = [
      path.join(process.resourcesPath || '', rel),
      path.join(process.resourcesPath || '', 'app', rel),
      path.join(__dirname, '..', '..', rel),
      path.join(process.cwd(), rel)
    ]
    try {
      const { app } = require('electron')
      checks.unshift(path.join(app.getAppPath(), rel))
    } catch {
      void 0
    }
    for (const c of checks) {
      try {
        if (fs.existsSync(c)) {
          const img = nativeImage.createFromPath(c)
          if (img && !img.isEmpty()) return img
        }
      } catch {
        void 0
      }
    }
    return null
  }
  icon = _findIcon(path.join('resources', 'icon.png'))
  buildIcon = _findIcon(path.join('build', 'icon.png'))
  if (!icon) {
    try {
      const fsMod = require('fs')
      const p = path.join(process.resourcesPath || '', 'resources', 'icon.png')
      if (fsMod.existsSync(p)) icon = nativeImage.createFromPath(p)
    } catch {
      void 0
    }
  }
  launchLog(
    'info',
    'BOOT',
    `Icon resolution: trayIcon=${icon ? icon.getSize().width + 'x' + icon.getSize().height : 'null'} buildIcon=${buildIcon ? buildIcon.getSize().width + 'x' + buildIcon.getSize().height : 'null'}`
  )
} catch (e) {
  launchLog('warn', 'BOOT', `Icon asset resolution failed: ${e.message}`)
}
import path from 'path'
import os from 'os'
import { execFile, spawn } from 'child_process'
import { deflateSync } from 'zlib'
import si from 'systeminformation'
import fs from 'fs'
launchLog('info', 'BOOT', 'Core modules imported')

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
  isTokenExpiringSoon,
  verifyLocalLicense
} from './services/licenseService.js'
import { startLicensePolling, isFeatureAllowed } from './services/licenseManager.js'
import { executeFeature, cleanupOrphanedTempFiles } from './services/featureExecutor.js'
import { ALLOWED_DAWA_SCRIPTS } from './services/dawaScripts'
import { runDawaScript } from './services/dawaScripts.js'
launchLog('info', 'BOOT', 'Service modules imported')

// Function to check if running as admin
function isAdmin() {
  try {
    // On Windows, we can check by trying to access a protected location
    const testPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'config')
    fs.accessSync(testPath, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

// Function to restart as admin
function restartAsAdmin() {
  const exePath = process.execPath
  const args = process.argv.slice(1).join(' ')

  spawn(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Start-Process -FilePath "${exePath}" -ArgumentList "${args}" -Verb RunAs`
    ],
    {
      detached: true,
      stdio: 'ignore'
    }
  ).unref()

  app.exit(0)
}

const GITHUB_RELEASE_API = 'https://api.github.com/repos/karal202/RDUC/releases/latest'
const GITHUB_DOWNLOAD_FALLBACK =
  'https://github.com/karal202/RDUC/releases/latest/download/Dawa-Optimizer-Setup.exe'
const BACKEND_URL_CHECK = process.env.BACKEND_URL
const allowOfflineLicense =
  process.env.NODE_ENV === 'development' && process.env.ALLOW_OFFLINE_LICENSE === 'true'
if (!BACKEND_URL_CHECK) {
  launchLog(
    'warn',
    'BOOT',
    'BACKEND_URL env var is not set — using the hardcoded default endpoint.'
  )
}
if (!is.dev) {
  const debugFlags = ['inspect', 'inspect-brk', 'inspect-port', 'remote-debugging-port']
  const foundDebug = debugFlags.find((f) => app.commandLine.hasSwitch(f))
  if (foundDebug) {
    launchLog('error', 'BOOT', `Debug flag --${foundDebug} detected, aborting launch`)
    try {
      dialog.showErrorBox(
        'DAWA — Anti-Tamper',
        'Phát hiện flag gỡ lỗi trên build Production. Vui lòng khởi động lại ứng dụng mà không có flag phát triển.'
      )
    } catch {
      void 0
    }
    app.exit(1)
  }
  app.commandLine.appendSwitch('disable-remote-debugging')
  app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor')
}
launchLog('info', 'BOOT', 'Anti-tamper / debug flag checks passed')

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
  launchLog('info', 'BOOT', `Chromium cache dirs created at ${cacheRoot}`)
} catch (e) {
  launchLog('warn', 'BOOT', `Chromium cache dir setup failed: ${e.message}`)
}

launchLog('info', 'BOOT', `app.getPath(userData)=${app.getPath('userData')}`)
const LICENSE_FILE_PATH = path.join(app.getPath('userData'), 'dawa_license_vault.dat')
const WINDOWS_SHUTDOWN_PATH = path.join(
  process.env.SystemRoot || 'C:\\Windows',
  'System32',
  'shutdown.exe'
)
launchLog('info', 'BOOT', `Creating license store at ${LICENSE_FILE_PATH}`)
const licenseStore = createLicenseStore(LICENSE_FILE_PATH)
launchLog('info', 'BOOT', 'License store created successfully')
const activateAttempts = []

// Performance optimization: Cache for system stats to reduce CPU usage
let systemStatsCache = null

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
  } catch {
    const normalBase = nativeImage.createFromPath(buildIcon || icon)
    trayNormalImage = normalBase
    trayActiveImage = normalBase
    taskbarActiveOverlay = normalBase.resize({ width: 16, height: 16 })
    console.warn('[TRAY] Fallback to base icon tint')
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
  // Performance optimization: Reduce tray menu rebuild frequency from 10s to 30s
  setInterval(rebuildMenu, 30_000)
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
let licenseWindow = null

function createLicenseWindow() {
  launchLog('info', 'LICENSE', 'Opening license window (BrowserWindow construct)')
  try {
    licenseWindow = new BrowserWindow({
      width: 1080,
      height: 720,
      minWidth: 920,
      minHeight: 640,
      resizable: true,
      maximizable: true,
      minimizable: true,
      fullscreenable: false,
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
    try {
      licenseWindow.center()
    } catch {
      void 0
    }
    launchLog('info', 'LICENSE', 'License window BrowserWindow instance created')
    attachWebContentsDebugListeners(licenseWindow, 'licenseWindow')
  } catch (e) {
    launchLog('error', 'LICENSE', `License window creation FAILED: ${e.stack || e.message}`)
    throw e
  }

  licenseWindow.on('ready-to-show', () => {
    launchLog('info', 'LICENSE', 'License window ready-to-show, calling show()')
    try {
      licenseWindow.show()
    } catch (e) {
      launchLog('error', 'LICENSE', `licenseWindow.show() failed: ${e.message}`)
    }
  })

  licenseWindow.on('closed', () => {
    launchLog('info', 'LICENSE', 'License window closed')
    licenseWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = process.env['ELECTRON_RENDERER_URL'] + '#/license'
    launchLog('info', 'LICENSE', `Loading license window URL: ${url}`)
    licenseWindow
      .loadURL(url)
      .then(() => launchLog('info', 'LICENSE', 'Dev license page loaded'))
      .catch((e) => launchLog('error', 'LICENSE', `Dev license page load error: ${e.message}`))
  } else {
    const p = join(__dirname, '../renderer/index.html')
    launchLog('info', 'LICENSE', `Loading license window file: ${p}`)
    licenseWindow
      .loadFile(p, { hash: '#/license' })
      .then(() => launchLog('info', 'LICENSE', 'Prod license page loaded'))
      .catch((e) =>
        launchLog('error', 'LICENSE', `Prod license page load error: ${e.stack || e.message}`)
      )
  }
}

function createWindow() {
  launchLog('info', 'MAINWIN', 'Opening main window (BrowserWindow construct)')
  try {
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
    launchLog('info', 'MAINWIN', 'Main window BrowserWindow instance created')
    attachWebContentsDebugListeners(mainWindow, 'mainWindow')
  } catch (e) {
    launchLog('error', 'MAINWIN', `Main window creation FAILED: ${e.stack || e.message}`)
    throw e
  }

  mainWindow.on('ready-to-show', () => {
    launchLog('info', 'MAINWIN', 'Main window ready-to-show, calling show()')
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
    const url = process.env['ELECTRON_RENDERER_URL']
    launchLog('info', 'MAINWIN', `Loading main window URL: ${url}`)
    mainWindow
      .loadURL(url)
      .then(() => launchLog('info', 'MAINWIN', 'Dev main page loaded'))
      .catch((e) =>
        launchLog('error', 'MAINWIN', `Dev main page load error: ${e.stack || e.message}`)
      )
  } else {
    const p = join(__dirname, '../renderer/index.html')
    launchLog('info', 'MAINWIN', `Loading main window file: ${p}`)
    mainWindow
      .loadFile(p)
      .then(() => launchLog('info', 'MAINWIN', 'Prod main page loaded'))
      .catch((e) =>
        launchLog('error', 'MAINWIN', `Prod main page load error: ${e.stack || e.message}`)
      )
  }
}

app.whenReady().then(() => {
  launchLog('info', 'BOOT', 'app.whenReady fired — entering main bootstrap')
  electronApp.setAppUserModelId('com.dawa.optimizer')
  launchLog('info', 'BOOT', 'AppUserModelId set')

  const admin = isAdmin()
  launchLog('info', 'BOOT', `Admin privilege check: isAdmin=${admin}`)
  if (!admin) {
    launchLog('warn', 'BOOT', 'Not running as Administrator — showing prompt')
    dialog
      .showMessageBox({
        type: 'warning',
        title: 'DAWA Optimizer - Cảnh báo quyền Admin',
        message: 'Ứng dụng cần quyền Administrator để áp dụng tối ưu.',
        detail:
          'Các tính năng tinh chỉnh Windows Services (Telemetry, SysMain) và Registry hệ thống (Win32Priority HKLM) bắt buộc phải có quyền Administrator.',
        buttons: ['Tiếp tục chạy', 'Khởi động lại với quyền Admin'],
        defaultId: 1,
        cancelId: 0
      })
      .then(({ response }) => {
        if (response === 1) {
          launchLog('info', 'BOOT', 'User chose to restart as admin')
          restartAsAdmin()
        } else {
          launchLog('info', 'BOOT', 'User chose to continue without admin')
        }
      })
      .catch((e) => launchLog('error', 'BOOT', `Admin dialog error: ${e.message}`))
  }

  launchLog('info', 'BOOT', 'Creating system tray...')
  try {
    createTray()
    launchLog('info', 'BOOT', 'System tray created successfully')
  } catch (trayErr) {
    launchLog('error', 'BOOT', `Failed to create tray: ${trayErr.stack || trayErr.message}`)
  }

  launchLog('info', 'BOOT', 'Warming up static hardware info cache...')
  getStaticInfo()
    .then(() => launchLog('info', 'BOOT', 'Static hardware info cache warm-up complete'))
    .catch((e) => launchLog('warn', 'BOOT', `Static info warm-up failed: ${e.message}`))

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

    // Auto-refresh token proactively for desktop app (30 minutes before expiry)
    if (
      tokens?.accessToken &&
      isTokenExpiringSoon(tokens.accessToken, 30) &&
      tokens?.refreshToken
    ) {
      console.log('[TOKEN] Access token expiring soon, attempting proactive refresh...')
      const refreshed = await refreshWithBackend(tokens.refreshToken).catch((error) => {
        console.warn('[TOKEN] Proactive refresh failed:', error.message)
        return null
      })
      if (refreshed?.success) {
        tokens = { ...tokens, accessToken: refreshed.accessToken }
        licenseStore.saveTokens(tokens)
        console.log('[TOKEN] Proactive refresh successful')
      }
    }

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
      // Performance optimization: Add caching for rapid successive calls
      const now = Date.now()
      if (systemStatsCache && now - systemStatsCache.timestamp < 2000) {
        return systemStatsCache.data
      }

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

      const result = {
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

      // Cache the result for 2 seconds
      systemStatsCache = {
        timestamp: now,
        data: result
      }

      return result
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
    // Fail closed: a local allowlist is not enough to bypass an admin action.
    // The backend only returns status flags; it never provides executable commands.
    const token = licenseStore.getTokens()?.accessToken
    if (!token) {
      return {
        success: false,
        message:
          'Không thể xác thực chính sách Admin. Vui lòng đăng nhập lại hoặc kiểm tra kết nối mạng.'
      }
    }
    let policy
    try {
      policy = await getDesktopFeaturePolicy(token)
    } catch (error) {
      console.warn('Feature policy unavailable; blocking execution:', error.message)
      return {
        success: false,
        message:
          'Không thể kiểm tra trạng thái chức năng với máy chủ. Vui lòng kiểm tra mạng rồi thử lại.'
      }
    }
    const feature =
      typeof policy?.get === 'function' ? policy.get(scriptKey) : policy?.features?.[scriptKey]
    if (feature?.deleted) {
      return {
        success: false,
        message: 'File kích hoạt này đã bị Admin xóa. Vui lòng liên hệ hỗ trợ.'
      }
    }
    if (feature && !feature.exists) {
      return {
        success: false,
        message: 'File kích hoạt hiện không tồn tại hoặc không khả dụng. Vui lòng liên hệ hỗ trợ.'
      }
    }
    if (feature && !feature.enabled) {
      return { success: false, message: 'Chức năng này đang được Admin tạm tắt.' }
    }
    if (policy?.enabled?.[scriptKey] === false) {
      return { success: false, message: 'Chức năng này đang được Admin tạm tắt.' }
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

  ipcMain.handle('system:is-admin', () => isAdmin())
  ipcMain.handle('system:restart-as-admin', () => restartAsAdmin())

  // License window IPC handlers
  ipcMain.handle('license:activate-from-window', async (event, rawKey) => {
    if (isActivateRateLimited()) {
      return { success: false, message: 'Quá nhiều lần thử. Đợi 1 phút rồi thử lại.' }
    }
    const keyCode = normalizeLicenseKey(rawKey) || rawKey.trim()
    const currentDeviceHash = await getHardwareHash()
    const activation = await validateWithBackend(keyCode, currentDeviceHash)
    if (activation.success && activation.valid) {
      // Correct signature: save(keyCode, deviceHash, expiresAt)
      licenseStore.save(keyCode, currentDeviceHash, activation.data?.expires_at)
      licenseStore.saveTokens({
        accessToken: activation.accessToken,
        refreshToken: activation.refreshToken
      })
      // Start polling immediately so revoke events are picked up
      const tokens = licenseStore.getTokens()
      if (tokens) startLicensePolling(licenseStore, tokens)
      // Close license window and open main window
      if (licenseWindow) {
        licenseWindow.close()
        licenseWindow = null
      }
      createWindow()
      return { success: true, message: activation.message || 'Kích hoạt thành công!' }
    }
    return { success: false, message: activation.message || 'Kích hoạt thất bại' }
  })

  ipcMain.handle('license:check-activation', async () => {
    const stored = licenseStore.get()
    const currentDeviceHash = await getHardwareHash()
    if (!stored) {
      return { isActivated: false }
    }
    const localCheck = verifyLocalLicense(stored, currentDeviceHash)
    return { isActivated: localCheck.valid }
  })

  ipcMain.on('license:close-window', () => {
    if (licenseWindow) {
      licenseWindow.close()
      licenseWindow = null
    }
  })

  // Secure feature execution with license check, temp file handling, and cleanup
  ipcMain.handle('system:execute-feature', async (event, { scriptKey, options = {} }) => {
    const tokens = licenseStore.getTokens()
    const webContents = event.sender
    const executionId = `${scriptKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    const emitProgress = (stage) => {
      try {
        if (webContents && !webContents.isDestroyed()) {
          webContents.send('system:feature-progress', {
            executionId,
            scriptKey,
            label: options?.label || scriptKey,
            ...stage
          })
        }
      } catch {
        void 0
      }
    }

    // Check license and feature policy first
    const licenseCheck = await isFeatureAllowed(licenseStore, tokens, scriptKey)
    if (!licenseCheck.allowed) {
      emitProgress({
        percent: 100,
        phase: 'failed',
        message: licenseCheck.reason,
        featureKey: scriptKey
      })
      return {
        success: false,
        message: licenseCheck.reason,
        licenseStatus: licenseCheck.mode
      }
    }

    // Get script mapping
    const script = ALLOWED_DAWA_SCRIPTS[scriptKey]
    if (!script) {
      emitProgress({
        percent: 100,
        phase: 'failed',
        message: `Script [${scriptKey}] không nằm trong danh sách được phép thực thi.`,
        featureKey: scriptKey
      })
      return {
        success: false,
        message: `Script [${scriptKey}] không nằm trong danh sách được phép thực thi.`
      }
    }

    const scriptLabel = options?.label || script.label || scriptKey
    emitProgress({
      percent: 8,
      phase: 'license',
      message: 'Giấy phép hợp lệ. Đang phân giải đường dẫn file…',
      featureKey: scriptKey
    })

    // Determine script path and type
    let scriptPath = null
    let scriptType = 'reg'

    if (script.launch) {
      // Launch executable directly — but still show a 3-stage progress for UX consistency
      emitProgress({
        percent: 25,
        phase: 'launch',
        message: 'Đang khởi chạy tiến trình con…',
        featureKey: scriptKey
      })
      const result = await runDawaScript(scriptKey, options)
      emitProgress({
        percent: 100,
        phase: result.success ? 'done' : 'failed',
        message:
          result?.message || (result.success ? 'Đã khởi chạy xong.' : 'Không thể khởi chạy.'),
        featureKey: scriptKey
      })
      return result
    }

    if (script.profileFiles) {
      const file = script.profileFiles[options.profile]
      if (!file) {
        emitProgress({
          percent: 100,
          phase: 'failed',
          message: 'Invalid registry script profile.',
          featureKey: scriptKey
        })
        return { success: false, message: 'Invalid registry script profile.' }
      }

      scriptPath = file
      scriptType =
        file.toLowerCase().endsWith('.cmd') || file.toLowerCase().endsWith('.bat') ? 'bat' : 'reg'
    } else if (script.profiles) {
      const profileFile = script.profiles[options.profile]
      if (!profileFile) {
        emitProgress({
          percent: 100,
          phase: 'failed',
          message: 'Cấu hình không hợp lệ.',
          featureKey: scriptKey
        })
        return { success: false, message: 'Cấu hình không hợp lệ.' }
      }

      const file = join(
        script.profileDirectory ||
          join(__dirname, '../../resources/scripts/Optimizer/Ram Optimization'),
        profileFile
      )

      scriptPath = file
      scriptType = 'reg'
    } else {
      // Fallback to existing execution
      emitProgress({
        percent: 30,
        phase: 'launch',
        message: 'Đang phân phối script đến trình thực thi…',
        featureKey: scriptKey
      })
      const result = await runDawaScript(scriptKey, options)
      emitProgress({
        percent: 100,
        phase: result.success ? 'done' : 'failed',
        message: result?.message || (result.success ? 'Thực thi xong.' : 'Thất bại'),
        featureKey: scriptKey
      })
      return result
    }

    // Check if encrypted file exists (.dat)
    const encryptedPath = scriptPath + '.dat'
    const useEncrypted = fs.existsSync(encryptedPath)

    const finalScriptPath = useEncrypted ? encryptedPath : scriptPath

    // Execute with secure feature executor + stream progress
    const result = await executeFeature({
      licenseStore,
      tokens,
      featureKey: scriptKey,
      scriptPath: finalScriptPath,
      scriptType,
      args: [],
      label: scriptLabel,
      onProgress: emitProgress
    })

    return result
  })

  const checkLicenseOnStartup = async () => {
    launchLog('info', 'LICENSE', '====== checkLicenseOnStartup START ======')
    try {
      launchLog('info', 'LICENSE', 'Cleaning up orphaned temp files...')
      await cleanupOrphanedTempFiles()
      launchLog('info', 'LICENSE', 'Temp file cleanup done')

      launchLog('info', 'LICENSE', 'Computing hardware hash...')
      const currentDeviceHash = await getHardwareHash()
      launchLog('info', 'LICENSE', `Hardware hash (masked): ${maskHardwareId(currentDeviceHash)}`)

      const stored = licenseStore.get()
      launchLog('info', 'LICENSE', `Stored license present: ${!!stored}`)
      const localCheck = stored ? verifyLocalLicense(stored, currentDeviceHash) : { valid: false }
      launchLog(
        'info',
        'LICENSE',
        `Local license valid=${localCheck.valid}` +
          (localCheck.message ? ` (${localCheck.message})` : '')
      )

      if (!localCheck.valid) {
        launchLog(
          'info',
          'LICENSE',
          'No valid local license — checking installer registry fallback...'
        )
        let licenseKeyFromInstaller = null
        try {
          const { execSync } = require('child_process')
          const hives = ['HKCU', 'HKLM']
          for (const hive of hives) {
            try {
              const regQuery = execSync(
                `reg query "${hive}\\Software\\DAWA Optimizer" /v LicenseKey`,
                { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
              )
              if (regQuery) {
                const match = regQuery.match(/LicenseKey\s+REG_SZ\s+(.+)/)
                if (match && match[1]) {
                  let rawKey = match[1].trim()
                  launchLog(
                    'info',
                    'LICENSE',
                    `Installer registry key read from ${hive}: length=${rawKey.length}`
                  )
                  if (/^[A-Za-z0-9+/=]{16,}$/.test(rawKey) && !rawKey.includes('-')) {
                    try {
                      const decoded = Buffer.from(rawKey, 'base64').toString('utf16le')
                      const clean = decoded.replace(/\0/g, '').trim()
                      if (clean && clean.length >= 8) {
                        rawKey = clean
                        launchLog('info', 'LICENSE', 'Installer key: Base64-UTF16LE decoded OK')
                      }
                    } catch (e) {
                      launchLog('warn', 'LICENSE', `Installer key B64 decode failed: ${e.message}`)
                    }
                  }
                  try {
                    execSync(
                      `reg delete "${hive}\\Software\\DAWA Optimizer" /v LicenseKey /f 2>NUL`,
                      { stdio: 'ignore' }
                    )
                    launchLog(
                      'info',
                      'LICENSE',
                      `Installer registry key wiped (${hive}, one-time read)`
                    )
                  } catch {
                    launchLog('warn', 'LICENSE', `Could not wipe installer registry key (${hive})`)
                  }
                  licenseKeyFromInstaller = rawKey
                  break
                }
              }
            } catch (hiveErr) {
              launchLog(
                'debug',
                'LICENSE',
                `Installer registry read skipped for ${hive}: ${hiveErr.message}`
              )
            }
          }
          if (!licenseKeyFromInstaller) {
            launchLog('warn', 'LICENSE', 'No LicenseKey found in either HKCU or HKLM hives')
          }
        } catch (err) {
          launchLog('warn', 'LICENSE', `Installer registry read failed: ${err.message}`)
        }
        if (licenseKeyFromInstaller) {
          launchLog('info', 'LICENSE', 'Validating installer key against backend...')
          const activation = await validateWithBackend(licenseKeyFromInstaller, currentDeviceHash)
          launchLog(
            'info',
            'LICENSE',
            `Backend activation result: success=${activation.success} valid=${activation.valid}`
          )
          if (activation.success && activation.valid) {
            licenseStore.save(
              normalizeLicenseKey(licenseKeyFromInstaller) || licenseKeyFromInstaller,
              currentDeviceHash,
              activation.data?.expires_at
            )
            licenseStore.saveTokens({
              accessToken: activation.accessToken,
              refreshToken: activation.refreshToken
            })
            const tokens = licenseStore.getTokens()
            if (tokens) startLicensePolling(licenseStore, tokens)
            launchLog('info', 'LICENSE', 'Installer-key activation succeeded — opening MAIN window')
            createWindow()
            return
          }
        }
        launchLog('info', 'LICENSE', 'Falling back — opening LICENSE window')
        createLicenseWindow()
      } else {
        launchLog('info', 'LICENSE', 'Local license valid — starting polling + opening MAIN window')
        const tokens = licenseStore.getTokens()
        if (tokens) {
          launchLog(
            'info',
            'LICENSE',
            `Tokens present: access=${!!tokens.accessToken} refresh=${!!tokens.refreshToken}`
          )
          startLicensePolling(licenseStore, tokens)
        }
        createWindow()
      }
    } catch (e) {
      launchLog('error', 'LICENSE', `checkLicenseOnStartup FATAL ERROR: ${e.stack || e.message}`)
      throw e
    } finally {
      launchLog('info', 'LICENSE', '====== checkLicenseOnStartup END ======')
    }
  }

  launchLog('info', 'BOOT', 'Calling checkLicenseOnStartup()')
  checkLicenseOnStartup()
    .then(() => launchLog('info', 'BOOT', 'checkLicenseOnStartup resolved'))
    .catch((e) =>
      launchLog('error', 'BOOT', `checkLicenseOnStartup promise rejected: ${e.stack || e.message}`)
    )

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('render-process-gone', (event, webContents, details) => {
  const url = webContents.getURL ? webContents.getURL() : 'unknown'
  launchLog(
    'error',
    'CRASH',
    `render-process-gone: reason=${details.reason} exitCode=${details.exitCode} url=${url}`
  )
  try {
    dialog.showErrorBox(
      'DAWA Optimizer — Renderer Crash',
      `Quá trình render giao diện bị dừng đột ngột.\n` +
        `Lý do: ${details.reason || 'unknown'}\n` +
        `Mã thoát: ${details.exitCode}\n\n` +
        `File log: ${_getLaunchLogPath()}`
    )
  } catch {
    void 0
  }
})
app.on('child-process-gone', (event, details) => {
  launchLog(
    'warn',
    'CRASH',
    `child-process-gone: type=${details.type} name=${details.name || ''} reason=${details.reason} exitCode=${details.exitCode}`
  )
})

ipcMain.handle('app:log', async (_, level, tag, msg) => {
  const lvl = ['error', 'warn', 'info', 'debug'].includes(level) ? level : 'info'
  launchLog(lvl, `UI:${tag || 'renderer'}`, String(msg || ''))
  return { success: true }
})

function attachWebContentsDebugListeners(win, winName) {
  if (!win || !win.webContents) return
  const wc = win.webContents
  wc.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return
    launchLog(
      'error',
      'UI',
      `${winName} did-fail-load: code=${errorCode} desc=${errorDescription} url=${validatedURL}`
    )
  })
  wc.on('did-finish-load', () => {
    launchLog('info', 'UI', `${winName} did-finish-load`)
  })
  wc.on('crashed', (e, killed) => {
    launchLog('error', 'UI', `${winName} webContents crashed killed=${killed}`)
  })
  wc.on('unresponsive', () => {
    launchLog('warn', 'UI', `${winName} webContents unresponsive`)
  })
  wc.on('console-message', (event, level, message, line, sourceId) => {
    if (level === 3 || (level === 2 && /error|fail|exception|crash/i.test(message))) {
      launchLog(
        level === 3 ? 'error' : 'warn',
        'UI',
        `${winName} console[${level}]: ${message} (${sourceId}:${line})`
      )
    }
  })
}

app.on('window-all-closed', () => {
  launchLog('info', 'BOOT', 'window-all-closed event fired')
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
  launchLog('info', 'BOOT', 'Calling app.quit() from window-all-closed')
  app.quit()
})
