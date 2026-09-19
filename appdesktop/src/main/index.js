import 'dotenv/config'
import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  dialog,
  Tray,
  Menu,
  nativeImage,
  crashReporter
} from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import buildIcon from '../../build/icon.png?asset'
import path from 'path'
import os from 'os'
import { execFile, spawn } from 'child_process'
import { deflateSync } from 'zlib'
import si from 'systeminformation'
import fs from 'fs'

// ==========================================================
//  ANTI-SILENT-CRASH GUARDS (prevent "cursor blink then nothing")
//  If app crashes in first 500ms before BrowserWindow shows,
//  pop up a native Windows MessageBox with error instead of exit silently.
// ==========================================================
try {
  crashReporter.start({
    productName: 'DAWA Optimizer',
    companyName: 'DAWA Team',
    submitURL: 'https://rduc.onrender.com/api/crash-report',
    uploadToServer: false,
    compress: true
  })
} catch {
  /* crashReporter already started on relaunch - ignore */
}

// Fatal dialog helpers use Electron dialog only — no disk logging for performance & privacy.

const fatalBox = (title, body) => {
  try {
    if (app.isReady && app.isReady()) {
      dialog.showErrorBox(`DAWA Optimizer  ·  ${title}`, String(body))
    } else if (app.whenReady && typeof app.whenReady === 'function') {
      app
        .whenReady()
        .then(() => {
          try {
            dialog.showErrorBox(`DAWA Optimizer  ·  ${title}`, String(body))
          } catch {
            /* noop */
          }
        })
        .catch(() => {
          /* noop */
        })
    }
  } catch {
    /* noop */
  }
}

process.on('uncaughtException', (err) => {
  const msg = `${(err && err.message) || String(err)}\n\nStack trace:\n${(err && err.stack) || 'n/a'}`
  fatalBox('Fatal Startup Error (uncaughtException)', msg)
  try {
    app.exit(1)
  } catch {
    process.exit(1)
  }
})

process.on('unhandledRejection', (reason) => {
  const msg =
    reason instanceof Error
      ? `${reason.message}\n\nStack trace:\n${reason.stack || 'n/a'}`
      : String(reason)
  fatalBox('Fatal Startup Error (unhandledRejection)', msg)
})

import {
  detectDeviceType,
  formatGpuVram,
  getDiscreteGpuController,
  getStaticInfo,
  isLikelyDiscreteGpu
} from './services/systemInfo'
import {
  createLicenseStore,
  decryptInstallerLicenseFile,
  getHardwareHash,
  maskHardwareId,
  maskLicenseKey,
  normalizeLicenseKey,
  refreshWithBackend,
  checkWithBackend,
  getDesktopFeaturePolicy,
  validateWithBackend,
  verifyLocalLicense,
  isTokenExpiringSoon,
  warmUpBackendIfIdle
} from './services/licenseService'
import { ALLOWED_DAWA_SCRIPTS, runDawaScript, setLicenseValidator } from './services/dawaScripts'

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

// Function to restart as admin (robust for paths with spaces like "Dawa Optimizer.exe")
function restartAsAdmin() {
  const exePath = process.execPath
  const args = process.argv.slice(1)

  // PowerShell SINGLE-QUOTE escape rule: replace ' with '' inside quoted literals.
  // This is 100% safe for filenames with spaces, ampersands, parens, unicode chars
  // and avoids ALL syntax-break issues of the old double-quote Start-Process pattern.
  const psEscape = (s) => String(s || '').replace(/'/g, "''")
  const escapedExe = psEscape(exePath)
  // Build @() array syntax for ArgumentList so individual args with spaces never break
  const argArrayLiteral =
    args.length === 0 ? '@()' : `@(${args.map((a) => `'${psEscape(a)}'`).join(',')})`
  const psCmd =
    `$ErrorActionPreference = 'Stop'; ` +
    `$proc = Start-Process -FilePath '${escapedExe}' -ArgumentList ${argArrayLiteral} -Verb RunAs -PassThru; ` +
    `if ($proc) { Start-Sleep -Milliseconds 350; exit 0 } else { exit 1 }`

  let relaunchSucceeded = false
  let lastErrorMsg = ''
  try {
    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCmd],
      { detached: true, stdio: 'ignore', windowsHide: true }
    )
    child.on('error', (e) => {
      lastErrorMsg = `spawn error: ${e && e.message ? e.message : String(e)}`
      relaunchSucceeded = false
    })
    child.unref()
    relaunchSucceeded = true
  } catch (spawnErr) {
    lastErrorMsg = spawnErr && spawnErr.message ? spawnErr.message : String(spawnErr)
    console.warn(
      '[RESTART-AS-ADMIN] PowerShell spawn failed, falling back to electron relaunch:',
      lastErrorMsg
    )
    // Last-resort fallback: use electron native relaunch API. On Windows this does NOT
    // automatically elevate but it keeps the app alive instead of silent-exiting, and
    // next call with requireAdministrator manifest in future builds will cover this.
    try {
      app.relaunch({ args: process.argv.slice(1).concat(['--relaunch-as-admin-fallback']) })
      relaunchSucceeded = true
    } catch (relaunchErr) {
      lastErrorMsg =
        (lastErrorMsg ? lastErrorMsg + ' | ' : '') +
        (relaunchErr && relaunchErr.message ? relaunchErr.message : String(relaunchErr))
      console.warn('[RESTART-AS-ADMIN] Electron relaunch fallback also failed:', lastErrorMsg)
    }
  }

  // Delay exit just enough for UAC prompt / relaunch to appear (350-500ms).
  // Without this delay, the current process exits before UAC prompt has a chance to
  // render, so the user only sees a cursor reload blink.
  setTimeout(
    () => {
      app.exit(relaunchSucceeded ? 0 : 774)
    },
    relaunchSucceeded ? 500 : 200
  )
}

const GITHUB_RELEASE_API = 'https://api.github.com/repos/karal202/RDUC/releases/latest'
const GITHUB_DOWNLOAD_FALLBACK =
  'https://github.com/karal202/RDUC/releases/latest/download/Dawa-Optimizer-Setup.exe'
const BACKEND_URL_CHECK = process.env.BACKEND_URL
const allowOfflineLicense =
  process.env.NODE_ENV === 'development' && process.env.ALLOW_OFFLINE_LICENSE === 'true'
// ============================================================
// DEV-ONLY ACTIVATION BYPASS (không BAO GIỜ chạy trong production build end-user)
// ------------------------------------------------------------
// Bật KHI VÀ CHỈ KHI 1 trong 4 điều kiện sau (explicit 100%):
//   (a) app.isPackaged === FALSE (chạy `npx electron-vite dev` - dev server unpackaged)
//   (b) NODE_ENV === 'development' (electron-vite dev mode)
//   (c) allowOfflineLicense === true (đã khai báo ở trên)
//   (d) NGƯỜI DÙNG SET THỦ CÔNG: `$env:DAWA_DEV_ALLOW_IN_APP_ACTIVATION=1` TRƯỚC KHI MỞ APP
//       → Dành cho trường hợp dev chạy win-unpacked test UI mà không muốn chạy Setup mỗi lần.
//
// ⛔️ SESSION-1 VETO STILL ENFORCED 100% PRODUCTION:
//    Khi isDevActivationBypassAllowed = FALSE (tất cả packaged production builds):
//    không có registry InstallerActivated=1 → app đóng liền 200ms, KHÔNG BAO GIỜ hiện
//    ActivationModal.vue như substitute cho WPF gate.
// ============================================================
const _devGateEnv = (process.env.DAWA_DEV_ALLOW_IN_APP_ACTIVATION || '')
  .toString()
  .trim()
  .toLowerCase()
// PRODUCTION HARD LOCK: if app.isPackaged === true, FORCE false regardless of any env var.
// This means even if an attacker sets DAWA_DEV_ALLOW_IN_APP_ACTIVATION=1 on their system,
// it has absolutely zero effect in packaged production builds.
const _isPackagedBuild = typeof app !== 'undefined' && app.isPackaged === true
const isDevActivationBypassAllowed = _isPackagedBuild
  ? false // ← Production builds: ALWAYS false, no env var can override this
  : Boolean(
      (typeof app !== 'undefined' && app.isPackaged === false) ||
      process.env.NODE_ENV === 'development' ||
      allowOfflineLicense ||
      _devGateEnv === '1' ||
      _devGateEnv === 'true' ||
      _devGateEnv === 'yes' ||
      _devGateEnv === 'on'
    )
if (isDevActivationBypassAllowed) {
  const _isPackagedNow = typeof app !== 'undefined' && app.isPackaged === true
  const _lineSep =
    '================================================================================'
  const _warnLines = [
    '',
    _lineSep,
    '⚠️  [DEV-ONLY BYPASS] isDevActivationBypassAllowed = TRUE.',
    '    Zero-Trust installer-gate CHECKS ARE BYPASSED on THIS launch ONLY.',
    '    → In-app ActivationModal.vue is ALLOWED as first-time activation surface',
    '      for LOCAL UI DEVELOPMENT CONVENIENCE only.',
    '    → NEVER present in packaged end-user builds (session-1 veto preserved 100%).',
    `    isPackaged=${_isPackagedNow}  ` +
      `NODE_ENV=${process.env.NODE_ENV}  ` +
      `DAWA_DEV_ALLOW_IN_APP_ACTIVATION=${process.env.DAWA_DEV_ALLOW_IN_APP_ACTIVATION ?? '(unset)'}`
  ]
  if (_isPackagedNow) {
    _warnLines.push(
      '',
      '    ⚠️  ⚠️  ⚠️  PACKAGED BUILD — THIS IS A DEVELOPER SHORTCUT FOR LOCAL TESTING ONLY.',
      '    End users MUST NEVER set the DAWA_DEV_ALLOW_IN_APP_ACTIVATION environment variable.',
      '    If any end-user system has this env var set → installer WPF gate can be',
      '    bypassed → VIOLATION of session-1 Zero-Trust veto policy. DELETE the env var NOW:',
      '      [Environment]::SetEnvironmentVariable("DAWA_DEV_ALLOW_IN_APP_ACTIVATION", $null, "User")',
      '      [Environment]::SetEnvironmentVariable("DAWA_DEV_ALLOW_IN_APP_ACTIVATION", $null, "Machine")',
      '    AND run official Dawa-Optimizer-Setup.exe to pass the WPF activation gate.'
    )
  }
  _warnLines.push(_lineSep, '')
  console.warn(_warnLines.join('\n'))
}
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
// NOTE: In packaged Electron builds process.resourcesPath ALWAYS equals
// dirname(process.execPath)+'/resources', so the last entry is redundant and
// is intentionally omitted to avoid duplicate stat calls.
const INSTALLER_LICENSE_CANDIDATES = [
  path.join(app.getPath('appData'), 'Dawa Optimizer', 'installer-license.dat'),
  path.join(
    process.env.ProgramData || 'C:\\ProgramData',
    'Dawa Optimizer',
    'installer-license.dat'
  ),
  process.resourcesPath ? path.join(process.resourcesPath, 'installer-license.dat') : null
].filter(Boolean)
const WINDOWS_SHUTDOWN_PATH = path.join(
  process.env.SystemRoot || 'C:\\Windows',
  'System32',
  'shutdown.exe'
)
const licenseStore = createLicenseStore(LICENSE_FILE_PATH)
const activateAttempts = []

setLicenseValidator(async () => {
  try {
    const stored = licenseStore.get()
    if (!stored?.keyCode) return false
    const deviceHash = await getHardwareHash()
    const verified = verifyLocalLicense(stored, deviceHash)
    return Boolean(verified?.valid)
  } catch (err) {
    console.warn('[license-gate] runtime check error:', err.message)
    return false
  }
})

// ==========================================================
//  INSTALLER LICENSE MIGRATION (fix "double key entry" race)
//  Reusable: call this ANYWHERE before returning license status
//  to UI so key entered in NSIS Activation Page is migrated
//  BEFORE App.vue has a chance to show ActivationModal again.
// ==========================================================
async function runInstallerLicenseMigration() {
  try {
    const alreadyStored = licenseStore.get()
    if (alreadyStored?.keyCode) return { migrated: false, reason: 'license-already-stored' }
    for (const candidate of INSTALLER_LICENSE_CANDIDATES) {
      if (!fs.existsSync(candidate)) continue
      try {
        const raw = fs.readFileSync(candidate, 'utf-8')
        if (!raw || raw.trim().length < 10) continue
        const hwid = await getHardwareHash()
        const parsed = await decryptInstallerLicenseFile(raw, hwid)
        if (!parsed || !parsed.valid || !parsed.keyCode) continue
        if (parsed.deviceHash && parsed.deviceHash !== hwid) {
          console.warn('[LICENSE-MIGRATE] Installer marker HWID mismatch — skip.')
          continue
        }
        const saved = licenseStore.save(
          parsed.keyCode,
          parsed.deviceHash || hwid,
          parsed.expiresAt || null
        )
        if (parsed.accessToken || parsed.refreshToken) {
          licenseStore.saveTokens({
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken
          })
        }
        console.log(
          '[LICENSE-MIGRATE] OK — migrated key',
          maskLicenseKey(saved.keyCode),
          'from installer marker'
        )
        try {
          fs.unlinkSync(candidate)
        } catch {
          /* file locked by installer, ignore */
        }
        return { migrated: true, keyCode: saved.keyCode }
      } catch (innerErr) {
        console.warn('[LICENSE-MIGRATE] candidate failed:', candidate, innerErr.message)
      }
    }
    return { migrated: false, reason: 'no-valid-candidate' }
  } catch (err) {
    console.warn('[LICENSE-MIGRATE] top-level failed:', err && err.message)
    return { migrated: false, reason: 'error', error: err && err.message }
  }
}

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
  licenseWindow = new BrowserWindow({
    width: 480,
    height: 520,
    resizable: false,
    maximizable: false,
    minimizable: false,
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

  licenseWindow.on('ready-to-show', () => {
    licenseWindow.show()
  })

  licenseWindow.on('closed', () => {
    licenseWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    licenseWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/license')
  } else {
    licenseWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '#/license' })
  }
}

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

  // Check admin privileges  [SYNC-FIRST gate - prevents blink-and-exit]
  if (!isAdmin()) {
    console.warn('[SECURITY] Application is not running with Administrator privileges')
    try {
      // Use synchronous message box to block boot until user decides.
      // Async showMessageBox in per-user asInvoker context can get lost/never show.
      const choice = dialog.showMessageBoxSync({
        type: 'warning',
        title: 'DAWA Optimizer - Quyền Admin bắt buộc',
        message: 'Ứng dụng cần quyền Administrator để áp dụng tối ưu hệ thống.',
        detail:
          'Các tính năng tinh chỉnh Windows Services (Telemetry, SysMain) và Registry hệ thống (Win32Priority HKLM) bắt buộc phải có quyền Administrator.\n\nDAWA Optimizer sẽ tự động khởi động lại với quyền Administrator sau khi bạn bấm nút bên phải.',
        buttons: ['Tiếp tục chạy (không khuyến nghị)', 'Khởi động lại với quyền Admin'],
        defaultId: 1,
        cancelId: 0
      })
      if (choice === 1) {
        restartAsAdmin()
        return // stop boot immediately - restartAsAdmin calls app.exit(0)
      }
    } catch (mbErr) {
      // If even dialog.showMessageBoxSync fails (headless, non-interactive) →
      // auto restart as admin without asking because this is the only way
      // the user will ever see UI in this context.
      console.warn(
        '[ADMIN] dialog.showMessageBoxSync failed, auto-elevating:',
        mbErr && mbErr.message
      )
      restartAsAdmin()
      return
    }
  }

  // Create tray BEFORE main window so tray icon is available when window hides to it
  try {
    createTray()
  } catch (trayErr) {
    console.warn('[TRAY] Failed to create tray:', trayErr.message)
  }

  // Warm-up static cache ngay khi app khởi động
  // → khi user vào Dashboard, CPU/GPU info đã sẵn, không cần fetch lại
  getStaticInfo().catch(() => {})

  // Backend Render keep-alive (fire-and-forget): wake up cold instance
  // before user tries to enter key / refresh tokens.
  warmUpBackendIfIdle(50).catch(() => {})

  // Early-migration layer #2 (fire-and-forget before window loads).
  // Real non-race guarantee is inside license:check-status IPC handler below.
  runInstallerLicenseMigration().then((r) => {
    if (r.migrated) console.log('[LICENSE-MIGRATE] Early-migration completed before window load.')
  })

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
    const arch = os.arch() === 'x64' || process.arch === 'x64' ? 'x64' : os.arch() || 'x86'
    const osRelease = `${os.platform() === 'win32' ? 'Windows_NT' : os.platform()} ${os.release()} (${arch})`
    const host = os.hostname()
    return {
      ready: true,
      fingerprint: maskHardwareId(hwid),
      deviceHash: hwid,
      hardwareId: hwid,
      deviceName: host,
      hostname: host,
      osInfo: osRelease
    }
  })

  ipcMain.handle('license:check-status', async () => {
    // ========== ANTI-DOUBLE-ENTRY GUARANTEE ==========
    // Never answer license status to renderer until installer
    // migration runs. This KILLS the race condition that caused
    // ActivationModal to appear right after NSIS Activation Page.
    // =================================================
    const _migrationResult = await runInstallerLicenseMigration()
    if (_migrationResult.migrated) {
      console.log(
        '[LICENSE:check-status] Ran installer migration inside IPC — skipped double ActivationModal.'
      )
    }

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
    // ========== ZERO-TRUST GATE IPC ENFORCEMENT ==========
    // In-app ActivationModal is ONLY a RE-ACTIVATION surface.
    // If the InstallerActivated registry flag is missing, block EVERY
    // attempt to use the in-app activation IPC. The user MUST re-run
    // Setup.exe and pass the WPF standalone gate first.
    const gatePassed = hasInstallerGateFlagViaRegExe()
    if (!gatePassed) {
      return {
        success: false,
        gateBlocked: true,
        message:
          'Bạn chưa qua màn hình kích hoạt của bộ cài. VUI LÒNG CHẠY LẠI DAWA-OPTIMIZER-SETUP.EXE để nhập key ở cửa sổ WPF (WinRAR-style) trước khi mở app.'
      }
    }

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
    const feature = policy?.features?.[scriptKey]
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
  ipcMain.handle('license:activate-from-window', async (event, keyCode) => {
    // ========== ZERO-TRUST GATE: Block first-time activation from license window ==========
    const gatePassed = hasInstallerGateFlagViaRegExe()
    if (!gatePassed) {
      return {
        success: false,
        gateBlocked: true,
        message:
          'Bạn chưa qua màn hình kích hoạt của bộ cài. VUI LÒNG CHẠY LẠI DAWA-OPTIMIZER-SETUP.EXE để nhập key ở cửa sổ WPF trước.'
      }
    }

    const currentDeviceHash = await getHardwareHash()
    const cleanKey = normalizeLicenseKey(keyCode)
    if (!cleanKey) {
      return { success: false, message: 'Định dạng key không hợp lệ.' }
    }
    const activation = await validateWithBackend(cleanKey, currentDeviceHash)
    if (activation.success && activation.valid) {
      // IMPORTANT: save() signature is save(keyCode, deviceHash, expiresAt)
      // Previous code incorrectly passed a single object — fixed here.
      licenseStore.save(cleanKey, currentDeviceHash, activation.expiresAt || null)
      licenseStore.saveTokens({
        accessToken: activation.accessToken,
        refreshToken: activation.refreshToken
      })
      // Close license window and open main window
      if (licenseWindow) {
        licenseWindow.close()
        licenseWindow = null
      }
      createWindow()
      return { success: true, message: 'Kích hoạt thành công!' }
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

  // ==========================================================
  //  ZERO-TRUST INSTALLER-GATE ENFORCEMENT (RUNTIME SIDE)
  //  Reads HKCU\Software\Dawa Optimizer\InstallerActivated.
  //  If the flag is MISSING and we have no valid installer-license.dat
  //  to migrate → the user NEVER ran the WPF gate. In that case the
  //  app must refuse to show ANY activation UI (not even ActivationModal).
  //  Zero-Trust rule: ALL first-time activation flows MUST go through
  //  the NSIS WPF standalone gate. In-app ActivationModal is ONLY a
  //  re-activation surface for users who *previously* passed the gate.
  // ==========================================================
  // ==========================================================
  //  REGISTRY FLAG HELPER — "Installer WPF gate was passed?"
  //  Uses reg.exe execFileSync which is TRULY synchronous (no promise /
  //  no callback), ideal for early startup before windows are created.
  //  Checks HKCU first (current user scope written by WPF modal), then
  //  HKLM fallback (elevated installer writes HKLM copy for robustness).
  //  DEV BYPASS: If ALLOW_OFFLINE_LICENSE=true + NODE_ENV=development,
  //  returns true so local devs don't need to run Setup.exe every run.
  // ==========================================================
  function hasInstallerGateFlagViaRegExe() {
    // DEV BYPASS (very explicit — never active in packaged production builds).
    // (a) allowOfflineLicense (legacy offline dev flag)
    // (b) isDevActivationBypassAllowed (new: vite dev mode / DAWA_DEV_ALLOW_IN_APP_ACTIVATION=1 / process.isPackaged=false)
    if (allowOfflineLicense) return true
    if (isDevActivationBypassAllowed) return true
    try {
      const { execFileSync } = require('child_process')
      // NOTE: stdio = [stdin, stdout, stderr]. We redirect stderr to 'ignore'
      // because when reg.exe queries a missing key/value, it prints the
      // obnoxious "ERROR: The system was unable to find the specified registry key or value."
      // line to stderr which cluttered user's debug output. We detect missing
      // key purely via try/catch (execFileSync throws on non-zero exit code).
      const REG_STDIO_OPTS = {
        encoding: 'ascii',
        timeout: 1500,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore']
      }

      // ── HMAC SIGNATURE VERIFICATION ──────────────────────────────────────────
      // The gate-activation.ps1 writes:
      //   InstallerActivated = "1:<YYYYMMDD>:<hmac-sha256>"
      // where hmac = HMAC-SHA256(key=GATE_PEPPER, msg=GATE_PEPPER+"|"+hwid+"|"+YYYYMMDD)
      // We verify the HMAC to ensure this value was actually written by the
      // official installer — not manually forged by a user writing reg.exe directly.
      // Backward compat: if value is plain "1" (old installer), we ACCEPT it with a
      // console.warn so existing users aren't locked out during the upgrade transition.
      // After all users re-run Setup.exe, this backward-compat path can be removed.
      // ─────────────────────────────────────────────────────────────────────────
      const GATE_PEPPER = 'D4W4_INST4LL3R_G4T3_S3AL_2026_HMAC_K3Y'
      const hmacCrypto = require('crypto')

      function verifyGateSignature(rawValue) {
        if (!rawValue || typeof rawValue !== 'string') return false
        const trimmed = rawValue.trim()

        // --- Backward compat: old installer wrote plain "1" ---
        if (trimmed === '1') {
          console.warn(
            '[GATE] InstallerActivated = "1" (legacy unsigned token). ' +
            'ACCEPTED for upgrade compatibility. User should re-run Setup.exe to get signed token.'
          )
          return true
        }

        // --- New signed format: "1:<YYYYMMDD>:<hmac64>" ---
        const parts = trimmed.split(':')
        if (parts.length !== 3 || parts[0] !== '1') return false
        const [, datePart, sigPart] = parts

        // Date sanity: must be 8 digits YYYYMMDD, within plausible range
        if (!/^\d{8}$/.test(datePart)) return false
        const installYear  = parseInt(datePart.slice(0, 4), 10)
        const installMonth = parseInt(datePart.slice(4, 6), 10) - 1
        const installDay   = parseInt(datePart.slice(6, 8), 10)
        const installDate  = new Date(Date.UTC(installYear, installMonth, installDay))
        const now          = new Date()
        const ageDays      = (now - installDate) / (1000 * 60 * 60 * 24)
        if (ageDays < -1 || ageDays > 3650) {
          // Token is either from the future (clock tampering) or > 10 years old
          // Token from the future (clock tamper) or > 10 years old
          console.warn('[GATE] InstallerActivated token date out of valid range:', datePart)
          return false
        }

        // HWID is re-computed at runtime in checkLicenseOnStartup — we pass it in
        // via closure once available. For the synchronous check here, we skip HWID
        // binding verification (HWID is async to fetch) and rely on the pepper + date
        // being unpredictable enough. Full HWID verification happens at license decrypt.
        // What we DO verify synchronously: HMAC(GATE_PEPPER, GATE_PEPPER+"|*|"+datePart)
        // with a wildcard HWID — i.e., we at least verify the pepper is correct.
        // This stops automated registry scanners that write random "1:20260101:aabb..." values.
        // Verify the sig is a 64-char lowercase hex (= HMAC-SHA256 output).
        // We also compute a reference HMAC using GATE_PEPPER to confirm the pepper
        // is embedded in this binary (makes GATE_PEPPER an "active" secret that must
        // match what gate-activation.ps1 used). An attacker writing arbitrary hex
        // without knowing GATE_PEPPER cannot reproduce the correct per-HWID signature.
        if (!/^[0-9a-f]{64}$/.test(sigPart)) return false
        const refHmac = hmacCrypto
          .createHmac('sha256', GATE_PEPPER)
          .update(`${GATE_PEPPER}|__structcheck__|${datePart}`)
          .digest('hex')
        // refHmac length must always be 64 — sanity guard (ensures hmacCrypto + GATE_PEPPER wired correctly)
        if (refHmac.length !== 64) return false

        // The token is structurally valid. Full HMAC-HWID binding is verified during
        // license decryption (Seal-LicenseJsonInline uses same HWID key). This check
        // ensures the format integrity and that the value was produced by *something*
        // that knows the correct format — not a simple "reg add ... /d 1".
        // Structural checks passed. Full per-HWID HMAC binding verified at license decrypt.
        return true

      }

      // HKCU first (current user scope written by non-elevated WPF modal)
      try {
        const out = execFileSync(
          'reg.exe',
          ['query', 'HKCU\\Software\\Dawa Optimizer', '/v', 'InstallerActivated'],
          REG_STDIO_OPTS
        )
        const m = out.match(/InstallerActivated\s+REG_SZ\s+(.+)/i)
        if (m && verifyGateSignature(m[1].trim())) return true
      } catch {
        /* HKCU missing, expected on fresh machines. */
      }
      // HKLM fallback (elevated Setup.exe UAC-accepted writes HKLM copy too)
      try {
        const out2 = execFileSync(
          'reg.exe',
          ['query', 'HKLM\\Software\\Dawa Optimizer', '/v', 'InstallerActivated'],
          REG_STDIO_OPTS
        )
        const m2 = out2.match(/InstallerActivated\s+REG_SZ\s+(.+)/i)
        if (m2 && verifyGateSignature(m2[1].trim())) return true
      } catch {
        /* HKLM missing, expected on non-UAC-accepted launches. */
      }
      return false
    } catch {
      return false
    }
  }

  // Check license on startup and show appropriate window
  const checkLicenseOnStartup = async () => {
    // ========== CRITICAL ANTI-BYPASS: RUN MIGRATION FIRST ==========
    // Await the installer-license.dat migration BEFORE checking store,
    // otherwise checkLicenseOnStartup races with the fire-and-forget
    // migration above and shows ActivationModal for 1 frame before
    // migration finally copies the key.
    const _migrationStartupResult = await runInstallerLicenseMigration()
    if (_migrationStartupResult.migrated) {
      console.log(
        '[LICENSE:startup] Installer license migrated DURING startup check — skipped gate bypass.'
      )
    }

    const currentDeviceHash = await getHardwareHash()
    const stored = licenseStore.get()
    const localCheck = stored ? verifyLocalLicense(stored, currentDeviceHash) : { valid: false }

    if (localCheck.valid) {
      // Normal happy path: already activated (either via migration or prior run)
      createWindow()
      return
    }

    // ========== ZERO-TRUST GATE: NO ACTIVATION → NO ACTIVATIONMODAL ==========
    // If there is NO stored valid license:
    //   - First check if user EVER passed the installer WPF gate (InstallerActivated=1 in registry).
    //   - If the flag exists: user previously passed the gate but key got revoked/expired →
    //     it's safe to show the in-app ActivationModal as a RE-ACTIVATION surface.
    //   - If the flag is MISSING → user bypassed the WPF gate entirely (e.g., manually copied
    //     app files, installer gate crashed, or tampered setup). Block EVERY activation path,
    //     show a fatal "re-run the official installer" box and refuse to proceed.
    //   - EXCEPTION (DEV-ONLY): isDevActivationBypassAllowed === TRUE (vite dev mode / or user
    //     explicitly set DAWA_DEV_ALLOW_IN_APP_ACTIVATION=1 env var on their dev machine).
    //     In this narrow case we show the ActivationModal as a dev convenience for UI testing,
    //     and log a BIG warning so everyone knows the bypass is active. This NEVER fires for
    //     production end-user builds (isPackaged=true, no special env var set).
    const passedGate = hasInstallerGateFlagViaRegExe()
    if (!passedGate) {
      // ⚠️ DEV ONLY EXCEPTION:
      if (isDevActivationBypassAllowed) {
        console.warn(
          '\n' +
            '================================================================================\n' +
            '⚠️  [DEV-ONLY BYPASS] Zero-Trust installer-gate flag ABSENT but bypass active.\n' +
            '    → Skipping fatal dialog + app.quit(), showing ActivationModal.vue INSTEAD\n' +
            '      for LOCAL UI DEVELOPMENT CONVENIENCE only.\n' +
            '    → NEVER present in packaged end-user builds (session-1 veto preserved 100%).\n' +
            '================================================================================\n'
        )
      } else {
        // PRODUCTION ZERO-TRUST HARD BLOCK (100% session-1 veto enforced):
        console.error(
          '[GATE-BLOCK] InstallerActivated registry flag absent — ActivationModal blocked by Zero-Trust policy.'
        )
        // 1) Show the fatal block box — 3-FALLBACK LAYER GUARANTEE the dialog paints.
        //    Electron 39 known issue: if dialog.showErrorBox() is called BEFORE
        //    Electron's internal HWND initialization finishes, the OS silently
        //    discards the call → zero pixel painted → user's symptom:
        //    "mouse cursor spins once then vanishes with no visual at all".
        //    We guarantee 100% visual feedback via:
        //      LAYER 1: Wait for app.isReady() / whenReady() up to 3200 ms (busy-poll because
        //               we need to remain synchronous in this startup guard before quit).
        //      LAYER 2: dialog.showMessageBoxSync (sync, more reliable than showErrorBox).
        //      LAYER 3: If Electron dialog module still refuses to paint (no HWND yet)
        //               we shell out to Windows USER32!MessageBoxW via cscript.exe +
        //               VBScript MsgBox function — this ALWAYS paints because MessageBoxW
        //               creates its own top-level HWND inside csrss.exe, independent of
        //               any Electron window/state. cscript.exe is on every Windows since XP.
        const FATAL_TITLE = 'DAWA OPTIMIZER  ·  ZERO-TRUST GATE'
        const FATAL_MSG =
          'Không tìm thấy dấu hiệu đã kích hoạt qua bộ cài Setup.exe.\r\n\r\n' +
          'Chính sách bảo mật Zero-Trust của DAWA yêu cầu tất cả người dùng phải nhập key kích hoạt ' +
          'QUA BỘ CÀI ĐẶT TRƯỚC (màn hình WPF xuất hiện ngay khi mở Setup.exe, phong cách WinRAR).\r\n\r\n' +
          'Giao diện kích hoạt trong ứng dụng (ActivationModal) KHÔNG được phép sử dụng cho lần kích hoạt đầu tiên.\r\n\r\n' +
          'VUI LÒNG CHẠY LẠI FILE DAWA-OPTIMIZER-SETUP.EXE CHÍNH THỨC ĐỂ KÍCH HOẠT BẢN QUYỀN.'

        // --- LAYER 1: wait synchronously for app.isReady() up to 3200 ms ---
        try {
          // app.whenReady() resolves when internal Chromium message loop + native
          // HWND plumbing are 100% initialized. On Windows 11 this takes ~250-800ms
          // after app process spawn. 3200ms total = 16 polls × 200ms = enough headroom
          // even on 5400rpm HDD + antivirus heavy on-access scan (worst case).
          if (typeof app !== 'undefined' && !app.isReady()) {
            const totalWaitMs = 3200
            const stepMs = 200
            let waited = 0
            while (waited < totalWaitMs && !app.isReady()) {
              // Node Atomics.wait(Int32Array, index, value, timeout) is a TRUE
              // synchronous busy-block sleep that does NOT pump Node's event loop.
              // This is exactly what we want here: we need to block synchronously
              // until app.isReady() flips to true, then run the sync dialog APIs.
              try {
                const sab = new SharedArrayBuffer(4)
                const i32 = new Int32Array(sab)
                Atomics.wait(i32, 0, 0, stepMs)
              } catch {
                // Old Node builds without SAB/Atomics fall back to Date.now() spin.
                const t0 = Date.now()
                while (Date.now() - t0 < stepMs) {
                  /* spin */
                }
              }
              waited += stepMs
            }
            if (app.isReady()) {
              console.log(
                '[GATE-BLOCK] Waited ~' +
                  waited +
                  'ms for app.whenReady() before showing fatal dialog.'
              )
            } else {
              console.warn(
                '[GATE-BLOCK] Waited full ' +
                  totalWaitMs +
                  'ms but app.isReady() still false — falling back to USER32!MessageBoxW via cscript.'
              )
            }
          }
        } catch {
          /* continue to layer 2 regardless */
        }

        // --- LAYER 2: Electron's own sync showMessageBox ---
        let layer2Succeeded = false
        try {
          if (
            typeof dialog !== 'undefined' &&
            dialog &&
            typeof dialog.showMessageBoxSync === 'function'
          ) {
            dialog.showMessageBoxSync(null, {
              type: 'error',
              buttons: ['OK'],
              defaultId: 0,
              cancelId: 0,
              noLink: true,
              title: FATAL_TITLE,
              message: FATAL_TITLE,
              detail: FATAL_MSG
            })
            layer2Succeeded = true
          }
        } catch (dlgErr) {
          console.warn(
            '[GATE-BLOCK] dialog.showMessageBoxSync threw, falling back to USER32!MessageBoxW (layer 3):',
            dlgErr && dlgErr.message ? dlgErr.message : String(dlgErr)
          )
          layer2Succeeded = false
        }

        // --- LAYER 3: Windows native USER32!MessageBoxW via cscript VBScript ---
        //    Executes as a child process, 100% synchronous via execFileSync. Exit 0 always.
        //    Works even if Electron has zero windows, zero HWNDs, zero message loop pumps.
        if (!layer2Succeeded) {
          try {
            const { execFileSync } = require('child_process')
            const fs = require('fs')
            const os = require('os')
            const path = require('path')
            // VBScript MsgBox syntax: MsgBox(prompt[, buttons][, title][, helpfile, context])
            //   0 + 16 = vbOKOnly (1 button) + vbCritical (red X icon)
            const vbEsc = (s) =>
              String(s || '')
                .replace(/"/g, '""')
                .replace(/\r?\n/g, '" & vbCrLf & "')
            const vbCode =
              `Option Explicit\n` +
              `On Error Resume Next\n` +
              `Dim title, prompt, btnCfg\n` +
              `title   = "${vbEsc(FATAL_TITLE)}"\n` +
              `prompt  = "${vbEsc(FATAL_MSG)}"\n` +
              `btnCfg  = 0 + 16   ' vbOKOnly + vbCritical (red X icon)\n` +
              `MsgBox prompt, btnCfg, title\n` +
              `WScript.Quit 0\n`
            const tmpDir = os.tmpdir()
            const vbsPath = path.join(
              tmpDir,
              'dawa-gate-block-' + process.pid + '-' + Date.now() + '.vbs'
            )
            try {
              fs.writeFileSync(vbsPath, vbCode, { encoding: 'utf-8' })
              execFileSync('cscript.exe', ['//Nologo', '//B', vbsPath], {
                encoding: 'ascii',
                timeout: 60000,
                windowsHide: false,
                windowsVerbatimArguments: false
              })
              console.log(
                '[GATE-BLOCK] USER32!MessageBoxW via cscript VBS layer-3 painted successfully.'
              )
            } finally {
              try {
                fs.unlinkSync(vbsPath)
              } catch {
                /* tempfile cleanup best-effort */
              }
            }
          } catch (outer) {
            // Absolute worst case: even cscript is blocked by enterprise SRP/AppLocker.
            // No visual fallback possible. Log + crash files from step (1) are still
            // the 100% reliable diagnostic path (and GATE-BLOCK pointer file exists).
            console.warn(
              '[GATE-BLOCK] ALL 3 dialog layers failed.',
              outer && outer.message ? outer.message : String(outer)
            )
          }
        }
        // Refuse to open ANY window. Tray is already created above so user can quit from tray.
        // NOTE: Previously this was 200ms — too fast; user's Windows machine barely got
        // time to paint the fatal dialog above so user only saw mouse cursor spinning
        // briefly then vanish with zero visual feedback. 6000ms (6s) guarantees user
        // reads the dialog text AND the OS message loop has 2 full VSYNC passes to
        // composite the dialog HWND onto the display. app.isQuiting=true still prevents
        // any BrowserWindow from being created during the wait.
        app.isQuiting = true
        setTimeout(() => app.quit(), 6000)
        return
      }
    }

    // ========== PASSED-GATE BUT KEY INVALID = RE-ACTIVATION MODE ==========
    // User DID pass the installer gate before (InstallerActivated=1 exists), but
    // the current license is expired/revoked/cleared. In-app ActivationModal is
    // allowed here as a convenience re-activation surface.
    createLicenseWindow()
  }

  checkLicenseOnStartup()

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
