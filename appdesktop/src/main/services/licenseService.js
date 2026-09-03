import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'
import si from 'systeminformation'

const SECRET_SALT = 'DAWA_SECURITY_KEY_SALT_2026_x98f'
const BACKEND_URL = process.env.BACKEND_URL || 'https://rduc.onrender.com/api/license/validate'

export async function getHardwareHash() {
  try {
    const system = await si.system()
    const cpu = await si.cpu()
    const osInfo = await si.osInfo()
    const rawHardwareString = `${system.uuid || ''}-${system.serial || ''}-${cpu.manufacturer || ''}-${cpu.brand || ''}-${osInfo.serial || ''}-${os.hostname()}`
    return crypto.createHash('sha256').update(rawHardwareString || 'fallback_hwid').digest('hex')
  } catch {
    const fallbackString = `${os.hostname()}-${os.arch()}-${os.platform()}-${os.cpus()[0]?.model || ''}`
    return crypto.createHash('sha256').update(fallbackString).digest('hex')
  }
}

function calculateSignature(keyCode, deviceHash, timestamp) {
  const data = `${keyCode}:${deviceHash}:${timestamp}:${SECRET_SALT}`
  return crypto.createHmac('sha256', SECRET_SALT).update(data).digest('hex')
}

export function verifyLocalLicense(licenseData, currentDeviceHash) {
  if (!licenseData?.keyCode || !licenseData?.deviceHash || !licenseData?.signature) return { valid: false, message: 'Dữ liệu license không hợp lệ' }
  if (licenseData.deviceHash !== currentDeviceHash) return { valid: false, message: 'License không tương thích với thiết bị này (HWID Mismatch)' }
  if (licenseData.signature !== calculateSignature(licenseData.keyCode, licenseData.deviceHash, licenseData.timestamp)) return { valid: false, message: 'Phát hiện can thiệp vào file license (Signature Invalid)' }
  if (licenseData.expiresAt && new Date(licenseData.expiresAt).getTime() < Date.now()) return { valid: false, message: 'Key kích hoạt đã hết hạn' }
  return { valid: true, keyCode: licenseData.keyCode, activatedAt: licenseData.activatedAt }
}

export function createLicenseStore(licenseFilePath) {
  return {
    save(keyCode, deviceHash, expiresAt = null) {
      const timestamp = Date.now()
      const data = { keyCode, deviceHash, timestamp, activatedAt: new Date().toISOString(), expiresAt, signature: calculateSignature(keyCode, deviceHash, timestamp) }
      const dir = path.dirname(licenseFilePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(licenseFilePath, JSON.stringify(data), { encoding: 'utf-8', mode: 0o600 })
      return data
    },
    clear() {
      if (fs.existsSync(licenseFilePath)) {
        try { fs.unlinkSync(licenseFilePath) } catch (error) { console.error('Failed to remove license file:', error) }
      }
    },
    get() {
      if (!fs.existsSync(licenseFilePath)) return null
      try { return JSON.parse(fs.readFileSync(licenseFilePath, 'utf-8')) } catch { return null }
    }
  }
}

export async function validateWithBackend(keyCode, deviceHash) {
  const osInfo = `${os.type()} ${os.release()} (${os.arch()})`
  try {
    const response = await fetch(BACKEND_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key_code: keyCode, device_hash: deviceHash, device_name: os.hostname(), os_info: osInfo }) })
    return await response.json()
  } catch (error) {
    console.error('Backend connection failed:', error.message)
    return { success: false, valid: false, isOffline: true, message: 'Không thể kết nối đến máy chủ xác thực key. Kiểm tra kết nối mạng hoặc server backend.' }
  }
}
