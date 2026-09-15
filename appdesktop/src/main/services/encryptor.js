import crypto from 'crypto'
import { promises as fs } from 'fs'
import { join } from 'path'

const ENCRYPTION_SALT = 'DAWA-SCRIPT-ENCRYPTION-SALT-V1'
const MASTER_SALT = 'DAWA-STATIC-SCRIPT-VAULT-SALT-2026'
const MASTER_SECRET =
  process.env.DAWA_SCRIPT_MASTER_SECRET || 'd4w4-0pt1m1z3r-scr1pt-v4ult-s3cr3t-k3y-2026-x9f2'
const ALGORITHM = 'aes-256-gcm'

/**
 * Derive per-user decryption key from a JWT access token (HMAC-SHA256).
 * Used for per-session/token binding when available.
 */
export function deriveDecryptionKey(accessToken) {
  const hmac = crypto.createHmac('sha256', accessToken)
  hmac.update(ENCRYPTION_SALT)
  return hmac.digest()
}

/**
 * Derive the STATIC master key used at BUILD time (encrypt scripts) and at
 * RUN time (decrypt scripts). Keeping this derivation deterministic means the
 * packaged .dat files can always be decrypted when the app runs, but the raw
 * source files never ship — so a revoked user who can browse the install
 * folder only sees AES-GCM blobs and has no temp plaintext to copy.
 *
 * Policy gate `isFeatureAllowed` is the first-line blocker; this key only
 * protects scripts at-rest in the install directory.
 */
export function deriveMasterKey() {
  return crypto
    .createHash('sha256')
    .update(MASTER_SALT + '|' + MASTER_SECRET)
    .digest()
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

/* =========================================================================
 *  Static-master-key variants — used for build-time script encryption so the
 *  packaged app ships ONLY AES-256-GCM blobs (.dat), never .reg/.bat source.
 * ========================================================================= */

export function encryptScriptWithMaster(content) {
  const key = deriveMasterKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(content, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return {
    version: 2,
    algorithm: ALGORITHM,
    masterEncrypted: true,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    content: encrypted
  }
}

export function decryptScriptWithMaster(encryptedData) {
  if (!encryptedData || encryptedData.masterEncrypted !== true) {
    return null
  }
  const key = deriveMasterKey()
  const iv = Buffer.from(encryptedData.iv, 'hex')
  const authTag = Buffer.from(encryptedData.authTag, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export async function encryptDirectoryWithMaster(
  inputDir,
  outputDir,
  extensions = ['.reg', '.bat', '.ps1', '.cmd'],
  removeSource = false
) {
  const files = await fs.readdir(inputDir, { withFileTypes: true })

  if (!(await fs.stat(outputDir).catch(() => null))) {
    await fs.mkdir(outputDir, { recursive: true })
  }

  for (const file of files) {
    const inputPath = join(inputDir, file.name)
    const outputPath = join(outputDir, file.name)

    if (file.isDirectory()) {
      await encryptDirectoryWithMaster(inputPath, outputPath, extensions, removeSource)
      if (removeSource) {
        await fs.rmdir(inputPath).catch(() => {})
      }
    } else if (extensions.some((ext) => file.name.endsWith(ext))) {
      const content = await fs.readFile(inputPath, 'utf8')
      const encrypted = encryptScriptWithMaster(content)
      const datPath = join(outputDir, file.name + '.dat')
      await fs.writeFile(datPath, JSON.stringify(encrypted), 'utf8')
      if (removeSource) {
        await fs.unlink(inputPath).catch(() => {})
      }
      // eslint-disable-next-line no-console
      console.log(`  ✓ ${file.name}  →  ${file.name}.dat  (${encrypted.content.length} hex bytes)`)
    } else {
      // Non-script support files (e.g. readme.txt, images) copy untouched
      try {
        await fs.copyFile(inputPath, outputPath)
      } catch {
        void 0
      }
    }
  }
}

/**
 * Recursively encrypt all files in a directory (per-user token variant —
 * reserved for future server-side per-customer bundles).
 */
export async function encryptDirectory(
  inputDir,
  outputDir,
  accessToken,
  extensions = ['.reg', '.bat', '.ps1', '.cmd']
) {
  const files = await fs.readdir(inputDir, { withFileTypes: true })

  if (!(await fs.stat(outputDir).catch(() => null))) {
    await fs.mkdir(outputDir, { recursive: true })
  }

  for (const file of files) {
    const inputPath = join(inputDir, file.name)
    const outputPath = join(outputDir, file.name)

    if (file.isDirectory()) {
      await encryptDirectory(inputPath, outputPath, accessToken, extensions)
    } else if (extensions.some((ext) => file.name.endsWith(ext))) {
      const datPath = outputPath + '.dat'
      await encryptFile(inputPath, datPath, accessToken)
      // eslint-disable-next-line no-console
      console.log(`Encrypted: ${file.name} → ${file.name}.dat`)
    } else {
      await fs.copyFile(inputPath, outputPath).catch(() => {})
    }
  }
}
