import {
  getHardwareHash,
  verifyLocalLicense,
  validateWithBackend,
  refreshWithBackend,
  isTokenExpiringSoon,
  checkWithBackend,
  getDesktopFeaturePolicy
} from './licenseService.js'
import { app } from 'electron'

// Grace period for offline mode (48 hours in milliseconds)
const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000
const LICENSE_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes polling

let licenseCheckInterval = null
let isLicenseRevoked = false

/**
 * Check license status online via backend API
 * @returns {Promise<{valid: boolean, revoked: boolean, expired: boolean, message: string}>}
 */
export async function checkLicenseOnline(accessToken) {
  try {
    const result = await checkWithBackend(accessToken)
    
    if (result.status === 401) {
      // Token expired, try refresh
      return { valid: false, expired: true, message: 'Token expired' }
    }
    
    if (result.status === 200) {
      const data = result.data
      if (data.revoked) {
        isLicenseRevoked = true
        return { valid: false, revoked: true, message: 'License đã bị thu hồi' }
      }
      if (data.disabled) {
        return { valid: false, disabled: true, message: 'License đã bị vô hiệu hóa' }
      }
      return { valid: true, revoked: false, expired: false, message: 'License hợp lệ' }
    }
    
    return { valid: false, message: 'Không thể xác thực license online' }
  } catch (error) {
    console.error('License online check failed:', error.message)
    return { valid: false, offline: true, message: 'Không thể kết nối server' }
  }
}

/**
 * Validate local token for offline mode with grace period
 * @param {Object} licenseData - Local license data
 * @param {string} currentDeviceHash - Current hardware hash
 * @returns {Promise<{valid: boolean, inGracePeriod: boolean, message: string}>}
 */
export async function validateLocalToken(licenseData, currentDeviceHash) {
  try {
    const localCheck = verifyLocalLicense(licenseData, currentDeviceHash)
    
    if (!localCheck.valid) {
      return { valid: false, inGracePeriod: false, message: localCheck.message }
    }
    
    // Check if within grace period
    const activatedAt = new Date(licenseData.activatedAt).getTime()
    const now = Date.now()
    const timeSinceActivation = now - activatedAt
    
    if (timeSinceActivation > GRACE_PERIOD_MS) {
      return {
        valid: false,
        inGracePeriod: false,
        message: 'Grace period đã hết hạn. Cần kết nối internet để xác thực lại.'
      }
    }
    
    return {
      valid: true,
      inGracePeriod: true,
      message: 'License hợp lệ (mode offline, grace period)'
    }
  } catch (error) {
    return { valid: false, inGracePeriod: false, message: 'Lỗi validate local token' }
  }
}

/**
 * Check if feature is allowed before execution
 * This is the main gatekeeper for all feature executions
 * @param {Object} licenseStore - License store instance
 * @param {Object} tokens - Current tokens {accessToken, refreshToken}
 * @param {string} featureKey - Feature key to check (optional)
 * @returns {Promise<{allowed: boolean, reason: string, mode: string}>}
 */
export async function isFeatureAllowed(licenseStore, tokens, featureKey = null) {
  // Step 1: Check if license is already revoked
  if (isLicenseRevoked) {
    return { allowed: false, reason: 'License đã bị thu hồi', mode: 'revoked' }
  }
  
  // Step 2: Get local license data
  const licenseData = licenseStore.get()
  const currentDeviceHash = await getHardwareHash()
  
  if (!licenseData) {
    return { allowed: false, reason: 'Không tìm thấy license local', mode: 'no-license' }
  }
  
  // Step 3: Try online check first if we have tokens
  if (tokens?.accessToken) {
    // Check if token is expiring soon, refresh if needed
    if (isTokenExpiringSoon(tokens.accessToken)) {
      try {
        const refreshResult = await refreshWithBackend(tokens.refreshToken)
        if (refreshResult.success && refreshResult.accessToken) {
          tokens.accessToken = refreshResult.accessToken
          tokens.refreshToken = refreshResult.refreshToken
          licenseStore.saveTokens(tokens)
        }
      } catch (error) {
        console.warn('Token refresh failed:', error.message)
      }
    }
    
    // Check license status online
    const onlineCheck = await checkLicenseOnline(tokens.accessToken)
    
    if (onlineCheck.valid) {
      // Online valid, check feature policy if featureKey provided
      if (featureKey) {
        try {
          const featurePolicy = await getDesktopFeaturePolicy(tokens.accessToken)
          const feature = featurePolicy.find((f) => f.feature_key === featureKey)
          
          if (!feature) {
            return { allowed: false, reason: 'Feature không tồn tại trong policy', mode: 'online' }
          }
          
          if (feature.is_deleted) {
            return { allowed: false, reason: 'Feature đã bị xóa', mode: 'online' }
          }
          
          if (!feature.is_enabled) {
            return { allowed: false, reason: 'Feature đã bị vô hiệu hóa', mode: 'online' }
          }
          
          return { allowed: true, reason: 'Feature được phép thực thi', mode: 'online' }
        } catch (error) {
          console.error('Feature policy check failed:', error.message)
          // Fallback to local check if feature policy fails
        }
      }
      
      return { allowed: true, reason: 'License hợp lệ (online)', mode: 'online' }
    }
    
    if (onlineCheck.revoked) {
      // Revoke detected, cleanup
      await handleLicenseRevoked(licenseStore)
      return { allowed: false, reason: onlineCheck.message, mode: 'revoked' }
    }
    
    if (onlineCheck.expired) {
      // Token expired, try offline with grace period
      const localCheck = await validateLocalToken(licenseData, currentDeviceHash)
      return {
        allowed: localCheck.valid,
        reason: localCheck.message,
        mode: localCheck.inGracePeriod ? 'offline-grace' : 'offline-expired'
      }
    }
    
    // Offline or other error, try local check
    const localCheck = await validateLocalToken(licenseData, currentDeviceHash)
    return {
      allowed: localCheck.valid,
      reason: localCheck.message,
      mode: localCheck.inGracePeriod ? 'offline-grace' : 'offline-expired'
    }
  }
  
  // No tokens, only local check
  const localCheck = await validateLocalToken(licenseData, currentDeviceHash)
  return {
    allowed: localCheck.valid,
    reason: localCheck.message,
    mode: localCheck.inGracePeriod ? 'offline-grace' : 'offline-expired'
  }
}

/**
 * Handle license revocation - cleanup and notify
 */
async function handleLicenseRevoked(licenseStore) {
  isLicenseRevoked = true
  
  // Stop polling
  stopLicensePolling()
  
  // Clear local license
  licenseStore.clear()
  
  // Notify renderer via event
  const { BrowserWindow } = require('electron')
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    win.webContents.send('license:revoked')
  })
}

/**
 * Start periodic license polling for real-time revoke detection
 */
export function startLicensePolling(licenseStore, tokens) {
  if (licenseCheckInterval) {
    clearInterval(licenseCheckInterval)
  }
  
  licenseCheckInterval = setInterval(async () => {
    if (isLicenseRevoked) {
      stopLicensePolling()
      return
    }
    
    const check = await isFeatureAllowed(licenseStore, tokens)
    if (!check.allowed && check.mode === 'revoked') {
      await handleLicenseRevoked(licenseStore)
    }
  }, LICENSE_CHECK_INTERVAL_MS)
}

/**
 * Stop license polling
 */
export function stopLicensePolling() {
  if (licenseCheckInterval) {
    clearInterval(licenseCheckInterval)
    licenseCheckInterval = null
  }
}

/**
 * Cleanup polling on app quit
 */
app.on('before-quit', () => {
  stopLicensePolling()
})
