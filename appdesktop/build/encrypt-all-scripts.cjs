/**
 * Run BEFORE electron-builder to ship ONLY AES-256-GCM encrypted .dat blobs
 * inside the installer instead of raw .reg/.bat/.ps1 files.
 *
 * Usage (from appdesktop/):
 *   node build/encrypt-all-scripts.cjs [--delete-source]
 *
 * --delete-source  remove the original .reg/.bat/.ps1 after encryption.
 */
const { existsSync, readdirSync } = require('fs')
const { join, relative } = require('path')

const SCRIPTS_DIR = join(__dirname, '..', 'resources', 'scripts')

async function main() {
  if (!existsSync(SCRIPTS_DIR)) {
    console.error('[encrypt] ❌ resources/scripts folder not found at', SCRIPTS_DIR)
    process.exit(1)
  }

  // Dynamic import: .js file uses ES module exports
  const mod = await import('../out/main/services/encryptor.js').catch(async () => {
    console.warn('[encrypt] ⚠  out/main not built yet, falling back to src copy via esm-loader')
    return null
  })

  let encryptDir
  if (mod && typeof mod.encryptDirectoryWithMaster === 'function') {
    encryptDir = mod.encryptDirectoryWithMaster
  } else {
    // Inline minimal copy of encryptDirectoryWithMaster so the script can run
    // even before `npm run build`.
    const crypto = require('crypto')
    const fs = require('fs').promises
    const MASTER_SALT = 'DAWA-STATIC-SCRIPT-VAULT-SALT-2026'
    const MASTER_SECRET =
      process.env.DAWA_SCRIPT_MASTER_SECRET || 'd4w4-0pt1m1z3r-scr1pt-v4ult-s3cr3t-k3y-2026-x9f2'
    const ALG = 'aes-256-gcm'
    const EXT = ['.reg', '.bat', '.ps1', '.cmd']

    function deriveMasterKey() {
      return crypto
        .createHash('sha256')
        .update(MASTER_SALT + '|' + MASTER_SECRET)
        .digest()
    }

    encryptDir = async function encryptDir(inputDir, outputDir, extensions, removeSource) {
      const files = await fs.readdir(inputDir, { withFileTypes: true })
      if (!existsSync(outputDir)) await fs.mkdir(outputDir, { recursive: true })
      for (const file of files) {
        const inPath = join(inputDir, file.name)
        const outPath = join(outputDir, file.name)
        if (file.isDirectory()) {
          await encryptDir(inPath, outPath, extensions, removeSource)
          if (removeSource) {
            try {
              await fs.rmdir(inPath)
            } catch {
              /* dir probably not empty */
            }
          }
        } else if ((extensions || EXT).some((ext) => file.name.endsWith(ext))) {
          const content = await fs.readFile(inPath, 'utf8')
          const key = deriveMasterKey()
          const iv = crypto.randomBytes(16)
          const cipher = crypto.createCipheriv(ALG, key, iv)
          let encrypted = cipher.update(content, 'utf8', 'hex')
          encrypted += cipher.final('hex')
          const payload = {
            version: 2,
            algorithm: ALG,
            masterEncrypted: true,
            iv: iv.toString('hex'),
            authTag: cipher.getAuthTag().toString('hex'),
            content: encrypted
          }
          const datPath = join(outputDir, file.name + '.dat')
          await fs.writeFile(datPath, JSON.stringify(payload), 'utf8')
          if (removeSource) {
            try {
              await fs.unlink(inPath)
            } catch {
              void 0
            }
          }
          console.log(`  ✓ ${relative(SCRIPTS_DIR, inPath)}  →  .dat (${encrypted.length} hex B)`)
        } else {
          try {
            await fs.copyFile(inPath, outPath)
          } catch {
            void 0
          }
        }
      }
    }
  }

  const deleteSource = process.argv.includes('--delete-source')
  console.log()
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║  DAWA Optimizer — Script Vault Encryptor (AES-256-GCM)       ║')
  console.log('╠══════════════════════════════════════════════════════════════╣')
  console.log(`║  Source  : ${relative(process.cwd(), SCRIPTS_DIR).padEnd(42)}║`)
  console.log(
    `║  Mode    : ${deleteSource ? 'ENCRYPT + DELETE originals' : 'ENCRYPT only (keeps source)'.padEnd(42)}║`
  )
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log()

  const t0 = Date.now()
  try {
    // Encrypt in-place (same directory). After electron-builder.yml excludes
    // raw extensions, only the .dat files will be bundled.
    await encryptDir(SCRIPTS_DIR, SCRIPTS_DIR, undefined, deleteSource)
  } catch (err) {
    console.error('[encrypt] ❌ Fatal encryption error:', err)
    process.exit(1)
  }

  // Count results
  let datCount = 0
  let rawCount = 0
  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      if (entry.isDirectory()) {
        scan(p)
      } else if (entry.isFile()) {
        if (p.endsWith('.dat')) datCount += 1
        else if (/\.(reg|bat|ps1|cmd)$/i.test(p)) rawCount += 1
      }
    }
  }
  try {
    scan(SCRIPTS_DIR)
  } catch {
    void 0
  }

  const dt = (Date.now() - t0) / 1000
  console.log()
  console.log('┌─ Summary ────────────────────────────────────────────────────┐')
  console.log(
    `│  Encrypted .dat files : ${String(datCount).padStart(6)} files                          │`
  )
  if (rawCount > 0) {
    console.log(
      `│  ⚠  Raw plaintext left : ${String(rawCount).padStart(6)} files                          │`
    )
    console.log('│  → Re-run with --delete-source to remove raw sources.       │')
  } else {
    console.log('│  ✓  No raw plaintext scripts remain.                         │')
  }
  console.log(`│  Total wall-clock time : ${dt.toFixed(2)} seconds                               │`)
  console.log('└──────────────────────────────────────────────────────────────┘')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
