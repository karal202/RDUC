import crypto from 'crypto'
import { promises as fs } from 'fs'
import { join } from 'path'

const ENCRYPTION_SALT = 'DAWA-SCRIPT-ENCRYPTION-SALT-V1'
const ALGORITHM = 'aes-256-gcm'

/**
 * Derive decryption key from license token using HMAC-SHA256
 * @param {string} accessToken - JWT access token
 * @returns {Buffer} - 32-byte key for AES-256
 */
export function deriveDecryptionKey(accessToken) {
  // Use HMAC-SHA256 with token as key and salt
  const hmac = crypto.createHmac('sha256', accessToken)
  hmac.update(ENCRYPTION_SALT)
  return hmac.digest()
}

/**
 * Encrypt script content with AES-256-GCM
 * @param {string} content - Plaintext script content
 * @param {string} accessToken - License token for key derivation
 * @returns {Object} - Encrypted data with iv, authTag, and content
 */
export function encryptScript(content, accessToken) {
  const key = deriveDecryptionKey(accessToken)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(content, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return {
    version: 1,
    algorithm: ALGORITHM,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    content: encrypted
  }
}

/**
 * Decrypt script content with AES-256-GCM
 * @param {Object} encryptedData - Encrypted data object
 * @param {string} accessToken - License token for key derivation
 * @returns {string} - Decrypted plaintext content
 */
export function decryptScript(encryptedData, accessToken) {
  const key = deriveDecryptionKey(accessToken)
  const iv = Buffer.from(encryptedData.iv, 'hex')
  const authTag = Buffer.from(encryptedData.authTag, 'hex')
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Encrypt a file and save as .dat
 * @param {string} inputPath - Path to input file
 * @param {string} outputPath - Path to output .dat file
 * @param {string} accessToken - License token for key derivation
 */
export async function encryptFile(inputPath, outputPath, accessToken) {
  const content = await fs.readFile(inputPath, 'utf8')
  const encrypted = encryptScript(content, accessToken)
  await fs.writeFile(outputPath, JSON.stringify(encrypted), 'utf8')
}

/**
 * Decrypt a .dat file and return content
 * @param {string} inputPath - Path to .dat file
 * @param {string} accessToken - License token for key derivation
 * @returns {string} - Decrypted content
 */
export async function decryptFile(inputPath, accessToken) {
  const encrypted = JSON.parse(await fs.readFile(inputPath, 'utf8'))
  return decryptScript(encrypted, accessToken)
}

/**
 * Recursively encrypt all files in a directory
 * @param {string} inputDir - Input directory
 * @param {string} outputDir - Output directory
 * @param {string} accessToken - License token
 * @param {Array<string>} extensions - File extensions to encrypt
 */
export async function encryptDirectory(inputDir, outputDir, accessToken, extensions = ['.reg', '.bat', '.ps1', '.cmd']) {
  const files = await fs.readdir(inputDir, { withFileTypes: true })
  
  if (!await fs.exists(outputDir)) {
    await fs.mkdir(outputDir, { recursive: true })
  }
  
  for (const file of files) {
    const inputPath = join(inputDir, file.name)
    const outputPath = join(outputDir, file.name)
    
    if (file.isDirectory()) {
      await encryptDirectory(inputPath, outputPath, accessToken, extensions)
    } else if (extensions.some(ext => file.name.endsWith(ext))) {
      // Encrypt file and save as .dat
      const datPath = outputPath + '.dat'
      await encryptFile(inputPath, datPath, accessToken)
      console.log(`Encrypted: ${file.name} → ${file.name}.dat`)
    } else {
      // Copy non-script files as-is
      await fs.copyFile(inputPath, outputPath)
    }
  }
}
