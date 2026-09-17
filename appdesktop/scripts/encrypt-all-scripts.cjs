const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const DAWA_SCRIPT_AES_PEPPER_2026 = 'D4W4_SCR1P7_A3S_P3PP3R_2026_K3RN3L_3NCRYPT'
const BUILD_SALT = 'DAWA_OPTIMIZER_SCRIPT_BUILD_2026_V1'
const ENCRYPTABLE_EXTENSIONS = new Set(['.reg', '.bat', '.cmd', '.pow', '.txt', '.ini', '.nip'])
const INPUT_DIR = path.resolve(__dirname, '..', 'resources', 'scripts')
const OUTPUT_DIR = path.resolve(__dirname, '..', 'build', 'encrypted-scripts')

function deriveKey() {
  const hmac = crypto.createHmac('sha256', DAWA_SCRIPT_AES_PEPPER_2026)
  hmac.update(BUILD_SALT)
  return hmac.digest()
}

function encryptBuffer(buffer) {
  const key = deriveKey()
  const nonce = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce)
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()])
  const tag = cipher.getAuthTag()
  const packed = Buffer.concat([nonce, tag, ciphertext])
  return packed.toString('base64')
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function walkDirectory(dir) {
  const results = []
  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.isFile()) results.push(full)
    }
  }
  return results
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error('[ENCRYPT] INPUT directory not found:', INPUT_DIR)
    process.exit(1)
  }
  ensureDir(OUTPUT_DIR)

  const allFiles = walkDirectory(INPUT_DIR)
  const manifest = {}
  let encryptedCount = 0
  let skippedBinary = 0

  for (const filePath of allFiles) {
    const relative = path.relative(INPUT_DIR, filePath)
    const ext = path.extname(filePath).toLowerCase()
    if (!ENCRYPTABLE_EXTENSIONS.has(ext)) {
      skippedBinary++
      continue
    }
    const relDir = path.dirname(relative)
    const stem = path.basename(relative, ext)
    const outRelDir = path.join(OUTPUT_DIR, relDir)
    ensureDir(outRelDir)
    const outFile = path.join(outRelDir, `${stem}.dat`)

    const rawBuffer = fs.readFileSync(filePath)
    const b64 = encryptBuffer(rawBuffer)
    fs.writeFileSync(outFile, b64, 'utf8')

    const manifestKey = relative.replace(/\\/g, '/')
    manifest[manifestKey] = {
      encryptedRelPath: path.posix.join(relDir.replace(/\\/g, '/'), `${stem}.dat`),
      originalExt: ext.slice(1),
      originalSizeBytes: rawBuffer.length,
      originalSha256: sha256Buffer(rawBuffer),
      encryptedSha256: sha256Buffer(Buffer.from(b64, 'utf8'))
    }
    encryptedCount++
  }

  const manifestJson = JSON.stringify(manifest, null, 2)
  const manifestB64 = encryptBuffer(Buffer.from(manifestJson, 'utf8'))
  const manifestPath = path.join(OUTPUT_DIR, 'scripts-manifest.dat')
  fs.writeFileSync(manifestPath, manifestB64, 'utf8')

  console.log(
    `[ENCRYPT] Done. Scripts encrypted: ${encryptedCount}. Binary/other skipped: ${skippedBinary}.`
  )
  console.log(
    `[ENCRYPT] Manifest written: ${manifestPath} (${Object.keys(manifest).length} entries).`
  )
  console.log(`[ENCRYPT] Output directory: ${OUTPUT_DIR}`)
  process.exit(0)
}

main()
