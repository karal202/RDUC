import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'
import si from 'systeminformation'
import { safeStorage } from 'electron'

const FALLBACK_SALT = 'DAWA_SECURITY_KEY_SALT_2026_x98f'
const SECRET_SALT = process.env.LICENSE_SIGNING_SALT || FALLBACK_SALT
if (!process.env.LICENSE_SIGNING_SALT) {
  console.warn(
    '[SECURITY WARN] LICENSE_SIGNING_SALT env var is NOT set — using hardcoded signing salt fallback. ' +
      'Set a unique 32+ byte value via environment to harden local license signatures.'
  )
}
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
    const fallbackString = `${os.hostname()}-${os.arch()}-${os.platform()}-${os.cpus()[0]?.model || ''}`
    return crypto.createHash('sha256').update(fallbackString).digest('hex')
  }
}

function calculateSignature(keyCode, deviceHash, timestamp) {
  const data = `${keyCode}:${deviceHash}:${timestamp}:${SECRET_SALT}`
  return crypto.createHmac('sha256', SECRET_SALT).update(data).digest('hex')
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) return value.map(sortObjectKeys)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortObjectKeys(value[k])
        return acc
      }, {})
  }
  return value
}

function computePayloadIntegrity(payload, salt) {
  const withoutIntegrity = { ...payload }
  delete withoutIntegrity.__integrity
  const canonical = JSON.stringify(sortObjectKeys(withoutIntegrity))
  return crypto.createHmac('sha256', salt).update(`v1:${canonical}`).digest('hex')
}

export function verifyLocalLicense(licenseData, currentDeviceHash) {
  if (!licenseData?.keyCode || !licenseData?.deviceHash || !licenseData?.signature)
    return { valid: false, message: 'Dữ liệu license không hợp lệ' }
  if (licenseData.deviceHash !== currentDeviceHash)
    return { valid: false, message: 'License không tương thích với thiết bị này (HWID Mismatch)' }
  if (
    licenseData.signature !==
    calculateSignature(licenseData.keyCode, licenseData.deviceHash, licenseData.timestamp)
  )
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
  const integrity = computePayloadIntegrity(data, SECRET_SALT)
  const payload = JSON.stringify({ ...data, __integrity: integrity })
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(payload).toString('base64')
    fs.writeFileSync(filePath, encrypted, { encoding: 'utf-8', mode: 0o600 })
    return
  }
  fs.writeFileSync(filePath, payload, { encoding: 'utf-8', mode: 0o600 })
}

function readEncryptedJson(filePath) {
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf-8')
  let parsed = null
  if (safeStorage.isEncryptionAvailable()) {
    try {
      parsed = JSON.parse(safeStorage.decryptString(Buffer.from(raw, 'base64')))
    } catch {
      try {
        parsed = JSON.parse(raw)
      } catch {
        return null
      }
    }
  } else {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (parsed && parsed.__integrity) {
    const expected = computePayloadIntegrity(parsed, SECRET_SALT)
    if (parsed.__integrity !== expected) {
      console.warn(`[LICENSE INTEGRITY FAIL] License file was tampered: ${filePath}`)
      try {
        fs.unlinkSync(filePath)
      } catch {
        /* ignore unlink failure */
      }
      return null
    }
  }
  return parsed
}

export function createLicenseStore(licenseFilePath) {
  const tokenFilePath = `${licenseFilePath}.tokens`
  return {
    save(keyCode, deviceHash, expiresAt = null) {
      const timestamp = Date.now()
      const data = {
        keyCode,
        deviceHash,
        timestamp,
        activatedAt: new Date().toISOString(),
        expiresAt,
        signature: calculateSignature(keyCode, deviceHash, timestamp)
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

export async function validateWithBackend(keyCode, deviceHash) {
  const osInfo = `${os.type()} ${os.release()} (${os.arch()})`
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key_code: keyCode,
        device_hash: deviceHash,
        device_name: os.hostname(),
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

export async function checkWithBackend(accessToken) {
  const response = await fetch(`${BACKEND_ORIGIN}/api/license/desktop/check`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return { status: response.status, data: await response.json() }
}
