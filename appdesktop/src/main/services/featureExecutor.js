import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import crypto from 'crypto'
import { isFeatureAllowed } from './licenseManager.js'
import { decryptScript, decryptScriptWithMaster } from './encryptor.js'

// Track temp files for cleanup
const tempFiles = new Set()

/**
 * Generate random UUID for temp file naming
 */
function generateTempId() {
  return crypto.randomUUID()
}

/**
 * Get temp directory path
 */
function getTempDirectory() {
  return app.getPath('temp')
}

/**
 * Securely delete file by overwriting with random bytes before deletion
 * @param {string} filePath - Path to file to delete
 */
async function secureDeleteFile(filePath) {
  try {
    const stats = await fs.stat(filePath)
    const fileSize = stats.size

    // Overwrite with random data (3 passes)
    for (let i = 0; i < 3; i++) {
      const randomData = crypto.randomBytes(fileSize)
      await fs.writeFile(filePath, randomData)
    }

    // Delete file
    await fs.unlink(filePath)

    // Remove from tracking set
    tempFiles.delete(filePath)

    return true
  } catch (error) {
    console.error('Secure delete failed:', error.message)
    // Fallback to normal delete
    try {
      await fs.unlink(filePath)
      tempFiles.delete(filePath)
    } catch (fallbackError) {
      console.error('Fallback delete also failed:', fallbackError.message)
    }
    return false
  }
}

/**
 * Write content to temp file with random name
 * @param {string} content - Content to write
 * @param {string} extension - File extension (e.g., '.reg', '.bat')
 * @returns {Promise<string>} - Path to temp file
 */
async function writeTempFile(content, extension) {
  const tempDir = getTempDirectory()
  const tempId = generateTempId()
  const tempFilePath = join(tempDir, `dawa_${tempId}${extension}`)

  await fs.writeFile(tempFilePath, content, { mode: 0o600 })
  tempFiles.add(tempFilePath)

  return tempFilePath
}

/**
 * Execute registry file using regedit.exe
 * @param {string} filePath - Path to .reg file
 * @returns {Promise<{success: boolean, message: string}>}
 */
function executeRegistryFile(filePath) {
  return new Promise((resolve) => {
    const regeditPath = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'regedit.exe')

    const regeditProcess = spawn(regeditPath, ['/s', filePath], {
      windowsHide: true
    })

    let output = ''
    let errorOutput = ''

    regeditProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    regeditProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    regeditProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: 'Registry import thành công' })
      } else {
        resolve({
          success: false,
          message: `Registry import thất bại (exit code: ${code}): ${errorOutput || output}`
        })
      }
    })

    regeditProcess.on('error', (error) => {
      resolve({ success: false, message: `Lỗi thực thi regedit: ${error.message}` })
    })
  })
}

/**
 * Execute batch file using cmd.exe
 * @param {string} filePath - Path to .bat file
 * @returns {Promise<{success: boolean, message: string}>}
 */
function executeBatchFile(filePath) {
  return new Promise((resolve) => {
    const cmdPath = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')

    const cmdProcess = spawn(cmdPath, ['/c', filePath], {
      windowsHide: true
    })

    let output = ''
    let errorOutput = ''

    cmdProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    cmdProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    cmdProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: 'Batch script thực thi thành công' })
      } else {
        resolve({
          success: false,
          message: `Batch script thất bại (exit code: ${code}): ${errorOutput || output}`
        })
      }
    })

    cmdProcess.on('error', (error) => {
      resolve({ success: false, message: `Lỗi thực thi cmd: ${error.message}` })
    })
  })
}

/**
 * Execute PowerShell script
 * @param {string} filePath - Path to .ps1 file
 * @returns {Promise<{success: boolean, message: string}>}
 */
function executePowerShellFile(filePath) {
  return new Promise((resolve) => {
    const psPath = join(
      process.env.SystemRoot || 'C:\\Windows',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe'
    )

    const psProcess = spawn(psPath, ['-ExecutionPolicy', 'Bypass', '-File', filePath], {
      windowsHide: true
    })

    let output = ''
    let errorOutput = ''

    psProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    psProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    psProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: 'PowerShell script thực thi thành công' })
      } else {
        resolve({
          success: false,
          message: `PowerShell script thất bại (exit code: ${code}): ${errorOutput || output}`
        })
      }
    })

    psProcess.on('error', (error) => {
      resolve({ success: false, message: `Lỗi thực thi PowerShell: ${error.message}` })
    })
  })
}

/**
 * Execute executable file
 * @param {string} filePath - Path to .exe file
 * @param {Array<string>} args - Additional arguments
 * @returns {Promise<{success: boolean, message: string}>}
 */
function executeExecutable(filePath, args = []) {
  return new Promise((resolve) => {
    const exeProcess = spawn(filePath, args, {
      windowsHide: true
    })

    let output = ''
    let errorOutput = ''

    exeProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    exeProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    exeProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: 'Executable thực thi thành công' })
      } else {
        resolve({
          success: false,
          message: `Executable thất bại (exit code: ${code}): ${errorOutput || output}`
        })
      }
    })

    exeProcess.on('error', (error) => {
      resolve({ success: false, message: `Lỗi thực thi executable: ${error.message}` })
    })
  })
}

/**
 * Main execution function with license check, temp file handling, and cleanup
 * @param {Object} params - Execution parameters
 * @param {Object} params.licenseStore - License store instance
 * @param {Object} params.tokens - Current tokens
 * @param {string} params.featureKey - Feature key for policy check
 * @param {string} params.scriptPath - Path to encrypted .dat file or plaintext file
 * @param {string} params.scriptType - Type: 'reg', 'bat', 'ps1', 'exe'
 * @param {Array<string>} params.args - Additional arguments for exe
 * @param {string} params.label - Human-readable feature label (for progress UI)
 * @param {(stage: {percent: number, message: string, phase: string}) => void} params.onProgress - Optional realtime progress callback
 * @returns {Promise<{success: boolean, message: string, licenseStatus: string}>}
 */
export async function executeFeature({
  licenseStore,
  tokens,
  featureKey,
  scriptPath,
  scriptType,
  args = [],
  label,
  onProgress
}) {
  let tempFilePath = null

  const emit = (percent, phase, message) => {
    if (typeof onProgress === 'function') {
      try {
        onProgress({ percent, phase, message, label: label || featureKey, featureKey })
      } catch {
        void 0
      }
    }
  }

  try {
    // Stage 1 (0% — 20%): Kiểm tra license và policy
    emit(5, 'license', 'Đang kiểm tra giấy phép kích hoạt…')
    const licenseCheck = await isFeatureAllowed(licenseStore, tokens, featureKey)

    if (!licenseCheck.allowed) {
      emit(100, 'failed', licenseCheck.reason)
      return {
        success: false,
        message: licenseCheck.reason,
        licenseStatus: licenseCheck.mode
      }
    }
    emit(20, 'license', 'Giấy phép hợp lệ. Đang chuẩn bị file thực thi…')

    // Step 2: Read and decrypt script content (20% — 45%)
    let scriptContent

    if (scriptPath.endsWith('.dat')) {
      emit(25, 'decrypt', 'Đang giải mã file kích hoạt…')
      const raw = await fs.readFile(scriptPath, 'utf8')
      let encryptedData
      try {
        encryptedData = JSON.parse(raw)
      } catch (error) {
        emit(100, 'failed', `File kích hoạt bị hỏng: ${error.message}`)
        return {
          success: false,
          message: `File kích hoạt bị hỏng (không phải JSON hợp lệ): ${error.message}`,
          licenseStatus: 'error'
        }
      }

      if (encryptedData.masterEncrypted === true) {
        try {
          scriptContent = decryptScriptWithMaster(encryptedData)
        } catch {
          void 0
          emit(100, 'failed', 'Giải mã thất bại — auth tag không khớp.')
          return {
            success: false,
            message: `Không thể giải mã file kích hoạt (auth tag không khớp). File có thể đã bị sửa đổi.`,
            licenseStatus: 'error'
          }
        }
        if (!scriptContent) {
          emit(100, 'failed', 'Dữ liệu giải mã không hợp lệ.')
          return {
            success: false,
            message: 'File kích hoạt không thể giải mã (dữ liệu không hợp lệ).',
            licenseStatus: 'error'
          }
        }
      } else {
        if (!tokens?.accessToken) {
          emit(100, 'failed', 'Thiếu access token để giải mã.')
          return {
            success: false,
            message: 'Không thể decrypt script: thiếu access token',
            licenseStatus: 'error'
          }
        }
        try {
          scriptContent = decryptScript(encryptedData, tokens.accessToken)
        } catch (error) {
          emit(100, 'failed', `Giải mã token thất bại: ${error.message}`)
          return {
            success: false,
            message: `Không thể giải mã file kích hoạt bằng token hiện tại: ${error.message}`,
            licenseStatus: 'error'
          }
        }
      }
    } else {
      scriptContent = await fs.readFile(scriptPath, 'utf8')
    }
    emit(45, 'decrypt', 'Giải mã thành công. Đang ghi tệp tạm…')

    // Step 3: Write to temp file (45% — 55%)
    const extension = `.${scriptType}`
    tempFilePath = await writeTempFile(scriptContent, extension)
    emit(55, 'prepare', 'Đã chuẩn bị xong môi trường thực thi.')

    // Step 4: Execute based on type (55% — 90%)
    let executionResult

    emit(58, 'execute', 'Đang thực thi file kích hoạt lên Hệ Điều Hành…')
    switch (scriptType) {
      case 'reg':
        executionResult = await executeRegistryFile(tempFilePath)
        break
      case 'bat':
        executionResult = await executeBatchFile(tempFilePath)
        break
      case 'ps1':
        executionResult = await executePowerShellFile(tempFilePath)
        break
      case 'exe':
        executionResult = await executeExecutable(tempFilePath, args)
        break
      default:
        throw new Error(`Unsupported script type: ${scriptType}`)
    }
    emit(
      90,
      'execute',
      executionResult.success
        ? 'Thực thi thành công — đang dọn dẹp…'
        : 'Thực thi xong — đang xử lý kết quả…'
    )

    // Step 5: Secure delete temp file (90% — 100%)
    if (tempFilePath) {
      await secureDeleteFile(tempFilePath)
      tempFilePath = null
    }

    emit(100, executionResult.success ? 'done' : 'failed', executionResult.message)

    return {
      success: executionResult.success,
      message: executionResult.message,
      licenseStatus: licenseCheck.mode
    }
  } catch (error) {
    if (tempFilePath) {
      await secureDeleteFile(tempFilePath)
    }
    emit(100, 'failed', `Lỗi: ${error.message}`)

    return {
      success: false,
      message: `Lỗi thực thi feature: ${error.message}`,
      licenseStatus: 'error'
    }
  }
}

/**
 * Cleanup any orphaned temp files on startup
 */
export async function cleanupOrphanedTempFiles() {
  try {
    const tempDir = getTempDirectory()
    const files = await fs.readdir(tempDir)

    for (const file of files) {
      if (file.startsWith('dawa_')) {
        const filePath = join(tempDir, file)
        try {
          await secureDeleteFile(filePath)
        } catch (error) {
          console.error(`Failed to cleanup temp file ${file}:`, error.message)
        }
      }
    }
  } catch (error) {
    console.error('Temp directory cleanup failed:', error.message)
  }
}
