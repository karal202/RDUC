import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'
import si from 'systeminformation'
import { safeStorage } from 'electron'

const configuredBackendUrl =
  process.env.BACKEND_URL || 'https://rduc.onrender.com/api/license/validate'
const backendUrl = new URL(configuredBackendUrl)
const BACKEND_URL =
  backendUrl.pathname === '/' ? `${backendUrl.origin}/api/license/validate` : backendUrl.toString()
const BACKEND_ORIGIN = new URL(BACKEND_URL).origin

export async function getHardwareHash() {
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
    const is64Bit = os.arch() === 'x64' || process.arch === 'x64'
    const osVersion = `${os.platform()}-${os.release()}`
    const procIdent = os.cpus()[0]?.model || process.env.PROCESSOR_IDENTIFIER || ''
    const fallbackString = `${os.hostname()}-${is64Bit}-${osVersion}-${procIdent}`
    return crypto.createHash('sha256').update(fallbackString).digest('hex')
  }
}

const LICENSE_INTEGRITY_HMAC_PEPPER = 'D4W4_L1C3NS3_1N73GR17Y_HMAC_2026_VAULT_SEAL'

function calculateHmacSignature(keyCode, deviceHash, expiresAt, activatedAt) {
  const canonical = [
    String(keyCode || ''),
    String(deviceHash || ''),
    String(expiresAt || ''),
    String(activatedAt || '')
  ].join('|')
  return crypto.createHmac('sha256', LICENSE_INTEGRITY_HMAC_PEPPER).update(canonical).digest('hex')
}

export function verifyLocalLicense(licenseData, currentDeviceHash) {
  if (!licenseData?.keyCode || !licenseData?.deviceHash)
    return { valid: false, message: 'Dữ liệu license không hợp lệ' }
  if (licenseData.deviceHash !== currentDeviceHash)
    return { valid: false, message: 'License không tương thích với thiết bị này (HWID Mismatch)' }
  const expectedSig = calculateHmacSignature(
    licenseData.keyCode,
    licenseData.deviceHash,
    licenseData.expiresAt,
    licenseData.activatedAt
  )
  if (licenseData.signature !== expectedSig)
    return { valid: false, message: 'Phát hiện can thiệp vào file license (Signature Invalid)' }
  if (licenseData.expiresAt && new Date(licenseData.expiresAt).getTime() < Date.now())
    return { valid: false, message: 'Key kích hoạt đã hết hạn' }
  return { valid: true, keyCode: licenseData.keyCode, activatedAt: licenseData.activatedAt }
}

export function maskLicenseKey(keyCode) {
  const value = String(keyCode || '')
  if (value.length < 4) return '••••'
  return `****-****-${value.slice(-4)}`
}

export function maskHardwareId(hwid) {
  const value = String(hwid || '')
  if (value.length < 12) return '••••'
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}

export function normalizeLicenseKey(input) {
  const compact = String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (compact.length < 8 || compact.length > 24) return null
  const chunks = compact.match(/.{1,4}/g) || []
  return chunks.join('-')
}

function writeEncryptedJson(filePath, data) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'Operating-system secure storage is unavailable; refusing to store a license locally'
    )
  }
  const jsonStr = JSON.stringify(data)
  const encrypted = safeStorage.encryptString(jsonStr).toString('base64')
  const hmac = crypto
    .createHmac('sha256', LICENSE_INTEGRITY_HMAC_PEPPER)
    .update(encrypted)
    .digest('hex')
  fs.writeFileSync(filePath, `${encrypted}.${hmac}`, { encoding: 'utf-8', mode: 0o600 })
}

function readEncryptedJson(filePath) {
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf-8')
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    const dotIndex = raw.lastIndexOf('.')
    if (dotIndex < 0 || dotIndex === raw.length - 1) return null
    const encrypted = raw.substring(0, dotIndex)
    const hmacRead = raw.substring(dotIndex + 1)
    const expectedHmac = crypto
      .createHmac('sha256', LICENSE_INTEGRITY_HMAC_PEPPER)
      .update(encrypted)
      .digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(hmacRead, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
      return null
    }
    return JSON.parse(safeStorage.decryptString(Buffer.from(encrypted, 'base64')))
  } catch {
    return null
  }
}

export function createLicenseStore(licenseFilePath) {
  const tokenFilePath = `${licenseFilePath}.tokens`
  return {
    save(keyCode, deviceHash, expiresAt = null) {
      const activatedAt = new Date().toISOString()
      const signature = calculateHmacSignature(keyCode, deviceHash, expiresAt, activatedAt)
      const data = {
        keyCode,
        deviceHash,
        activatedAt,
        expiresAt,
        signature
      }
      writeEncryptedJson(licenseFilePath, data)
      return data
    },
    clear() {
      if (fs.existsSync(licenseFilePath)) {
        try {
          fs.unlinkSync(licenseFilePath)
        } catch (error) {
          console.error('Failed to remove license file:', error)
        }
      }
      if (fs.existsSync(tokenFilePath)) {
        try {
          fs.unlinkSync(tokenFilePath)
        } catch (error) {
          console.error('Failed to remove token file:', error)
        }
      }
    },
    get() {
      const parsed = readEncryptedJson(licenseFilePath)
      if (!parsed?.keyCode) return null
      return parsed
    },
    saveTokens(tokens) {
      if (!tokens?.accessToken || !tokens?.refreshToken || !safeStorage.isEncryptionAvailable())
        return false
      const encrypted = safeStorage.encryptString(JSON.stringify(tokens)).toString('base64')
      fs.writeFileSync(tokenFilePath, encrypted, { encoding: 'utf-8', mode: 0o600 })
      return true
    },
    getTokens() {
      if (!safeStorage.isEncryptionAvailable() || !fs.existsSync(tokenFilePath)) return null
      try {
        const encrypted = Buffer.from(fs.readFileSync(tokenFilePath, 'utf-8'), 'base64')
        return JSON.parse(safeStorage.decryptString(encrypted))
      } catch {
        return null
      }
    }
  }
}

// ============================================================
//  NORMALIZATION HELPERS — byte-for-byte identical to
//  gate-activation.ps1 on the installer WPF side.
//  ============================================================
//  ARCH: mirror WPF PROCESSOR_ARCHITECTURE logic. Node.js os.arch()
//  returns 'x64' / 'arm64' / 'ia32' but we also check process.arch
//  for the edge case where 32-bit Node runs on 64-bit Windows OS.
//  HOSTNAME: always lowercase invariant to match
//  $hostnameCanonical.ToLowerInvariant() on the PowerShell side.
//  Without these two normalizations the server sees TWO different
//  device rows for the same machine and denies HWID-bound license.
// ============================================================
function _normalizedArch() {
  const a = (os.arch() || '').toLowerCase()
  const pa = (process.arch || '').toLowerCase()
  const procEnv = (process.env.PROCESSOR_ARCHITECTURE || '').toLowerCase()
  if (a === 'arm64' || pa === 'arm64' || procEnv === 'arm64') return 'arm64'
  if (a === 'x64' || pa === 'x64' || procEnv === 'amd64') return 'x64'
  // Final fallback: any 64-bit platform => x64, else ia32
  try {
    return os.arch() === 'x64' ? 'x64' : 'ia32'
  } catch {
    return 'x64'
  }
}
function _normalizedHostname() {
  try {
    return String(os.hostname() || '').toLowerCase()
  } catch {
    return ''
  }
}
function _normalizedOsInfo() {
  const osType = os.platform() === 'win32' ? 'Windows_NT' : os.type()
  return `${osType} ${os.release()} (${_normalizedArch()})`
}

export async function validateWithBackend(keyCode, deviceHash) {
  const osInfo = _normalizedOsInfo()
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key_code: keyCode,
        device_hash: deviceHash,
        hardware_id: deviceHash,
        hwid: deviceHash,
        device_name: _normalizedHostname(),
        os_info: osInfo
      })
    })
    return await response.json()
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

export async function refreshWithBackend(refreshToken) {
  const response = await fetch(`${BACKEND_ORIGIN}/api/license/desktop/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
  return response.json()
}

export function isTokenExpiringSoon(accessToken, bufferMinutes = 30) {
  try {
    // JWT token có format: header.payload.signature
    const parts = accessToken.split('.')
    if (parts.length !== 3) return false

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    const exp = payload.exp

    if (!exp) return false

    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = exp - now

    // Refresh nếu còn dưới bufferMinutes (mặc định 30 phút)
    return timeUntilExpiry <= bufferMinutes * 60
  } catch {
    return false
  }
}

export async function checkWithBackend(accessToken) {
  const response = await fetch(`${BACKEND_ORIGIN}/api/license/desktop/check`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return { status: response.status, data: await response.json() }
}

export async function getDesktopFeaturePolicy(accessToken) {
  const response = await fetch(`${BACKEND_ORIGIN}/api/file-manager/desktop-policy`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!response.ok) throw new Error(`Feature policy request failed (${response.status})`)
  return response.json()
}

const INSTALLER_LICENSE_PEPPER = 'D4W4_OP71M1Z3R_K3RN3L_V4UL7_2026_SEAL'

export async function decryptInstallerLicenseFile(rawContent, deviceHash) {
  try {
    if (!rawContent) return null
    const trimmed = typeof rawContent === 'string' ? rawContent.trim() : ''
    if (!trimmed || trimmed.length < 64) return null
    const blob = Buffer.from(trimmed, 'base64')
    if (!blob || blob.length < 17) return null

    const hwid = deviceHash || (await getHardwareHash())
    const keyMaterial = `${hwid}${INSTALLER_LICENSE_PEPPER}`
    const key = crypto.createHash('sha256').update(keyMaterial).digest()

    // ============================================================
    //  DUAL FORMATTER - supports legacy GCM builds + inline-CBC gate seal
    //  (gate seal PowerShell 5.1 has NO AesGcm class on .NET Framework 4.x,
    //   so installer activation always writes CBC format. Runtime installer
    //   migration must accept BOTH formats so old offline license files
    //   still decrypt and new gate sealed files also decrypt.)
    //
    //  FORMAT 1 (legacy GCM):  [12 nonce][16 auth tag][ciphertext]
    //      => blob.length >= 12 + 16 + 1
    //  FORMAT 2 (gate seal CBC): [16 IV][ciphertext (PKCS7 padded)]
    //      => blob.length >= 16 + 1 AND is a multiple of the AES block size (16)
    // ============================================================
    let plaintext = null

    if (blob.length >= 12 + 16 + 1) {
      try {
        const nonce = blob.subarray(0, 12)
        const tag = blob.subarray(12, 12 + 16)
        const ciphertext = blob.subarray(12 + 16)
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce)
        decipher.setAuthTag(tag)
        plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      } catch {
        plaintext = null
      }
    }

    if (!plaintext && blob.length >= 16 + 1 && blob.length % 16 === 0) {
      try {
        const iv = blob.subarray(0, 16)
        const ciphertext = blob.subarray(16)
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
        plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      } catch {
        plaintext = null
      }
    }

    if (!plaintext || plaintext.length < 4) return null
    const parsed = JSON.parse(plaintext.toString('utf-8'))
    if (parsed && parsed.keyCode && parsed.deviceHash) {
      const expectedIntegrity = calculateHmacSignature(
        parsed.keyCode,
        parsed.deviceHash,
        parsed.expiresAt,
        parsed.activatedAt
      )
      if (parsed.signature && parsed.signature !== expectedIntegrity) return null
    }
    return parsed
  } catch {
    return null
  }
}
