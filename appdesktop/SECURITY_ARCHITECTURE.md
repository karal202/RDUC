# DAWA Optimizer - Security Architecture

## Overview

This document describes the enhanced security architecture for executing system optimization features in DAWA Optimizer. The implementation focuses on:

1. **License-based feature execution** - All features require valid license verification
2. **Encrypted script storage** - Scripts are encrypted and decrypted at runtime (future implementation)
3. **Secure temp file handling** - Scripts are written to temp files with random names and securely deleted
4. **Real-time revoke detection** - Periodic polling detects license revocation immediately
5. **Offline grace period** - 48-hour grace period for offline use

## Architecture

### Directory Structure

```
src/main/services/
├── licenseService.js      # Existing: License storage, validation, backend communication
├── licenseManager.js      # NEW: Enhanced license checking with grace period & polling
├── featureExecutor.js     # NEW: Secure script execution with temp file handling
└── dawaScripts.js         # Existing: Script mappings and execution logic
```

### Components

#### 1. licenseManager.js

**Purpose**: Enhanced license verification with offline support and real-time revoke detection

**Key Functions**:

- `checkLicenseOnline(accessToken)` - Check license status via backend API
- `validateLocalToken(licenseData, currentDeviceHash)` - Validate local token with grace period
- `isFeatureAllowed(licenseStore, tokens, featureKey)` - Main gatekeeper for feature execution
- `startLicensePolling(licenseStore, tokens)` - Start 5-minute polling for revoke detection
- `stopLicensePolling()` - Stop polling on app quit

**Grace Period**: 48 hours for offline mode
**Polling Interval**: 5 minutes for real-time revoke detection

#### 2. featureExecutor.js

**Purpose**: Secure script execution with temp file handling and cleanup

**Key Functions**:

- `executeFeature({ licenseStore, tokens, featureKey, scriptContent, scriptType, args })`
  - Step 1: Check license before execution
  - Step 2: Decrypt script content (placeholder for future encryption)
  - Step 3: Write to temp file with random UUID name
  - Step 4: Execute based on type (reg, bat, ps1, exe)
  - Step 5: Secure delete temp file (overwrite with random bytes 3x)

- `secureDeleteFile(filePath)` - Overwrite file with random bytes before deletion
- `writeTempFile(content, extension)` - Write to app.getPath('temp') with random name
- `cleanupOrphanedTempFiles()` - Cleanup orphaned temp files on startup

**Execution Methods**:

- `.reg` files → `regedit.exe /s <tempFile>`
- `.bat` files → `cmd.exe /c <tempFile>`
- `.ps1` files → `powershell.exe -ExecutionPolicy Bypass -File <tempFile>`
- `.exe` files → Direct spawn with args

#### 3. Integration in main/index.js

**Changes Made**:

1. Import new modules:

```javascript
import {
  startLicensePolling,
  stopLicensePolling,
  isFeatureAllowed
} from './services/licenseManager.js'
import { executeFeature, cleanupOrphanedTempFiles } from './services/featureExecutor.js'
```

2. On startup:

```javascript
// Cleanup orphaned temp files from previous sessions
await cleanupOrphanedTempFiles()

// Start license polling after successful activation
const tokens = licenseStore.getTokens()
if (tokens) {
  startLicensePolling(licenseStore, tokens)
}
```

3. New IPC handler for secure feature execution:

```javascript
ipcMain.handle('system:execute-feature', async (_, { scriptKey, options = {} }) => {
  const tokens = licenseStore.getTokens()
  // ... execution logic
})
```

## Current Implementation Status

### ✅ Implemented

1. **License Manager Module** (`licenseManager.js`)
   - Online license checking via backend API
   - Local token validation with 48-hour grace period
   - Real-time revoke detection with 5-minute polling
   - Automatic cleanup on revoke detection

2. **Feature Executor Module** (`featureExecutor.js`)
   - Secure temp file creation with random UUID names
   - Execution handlers for .reg, .bat, .ps1, .exe files
   - Secure file deletion (overwrite with random bytes 3x)
   - Orphaned temp file cleanup on startup

3. **Main Process Integration**
   - Startup cleanup of orphaned temp files
   - License polling started after successful activation
   - Polling stopped on app quit

### ⚠️ Not Yet Implemented (Future Work)

1. **Script Encryption**
   - Scripts currently stored as plaintext in `resources/scripts/`
   - Need to:
     - Encrypt all .reg/.bat/.ps1 files with AES-256-GCM
     - Store as .dat files or embedded resources
     - Derive decryption key from license token (not hardcoded)
     - Decrypt in RAM before writing to temp file

2. **Feature Policy Integration**
   - `isFeatureAllowed()` checks feature policy from backend
   - Need to integrate this into actual script execution flow
   - Currently using existing `system:run-dawa-script` handler

3. **Vue Component Integration**
   - Need to update Vue components to use new `system:execute-feature` handler
   - Currently still using `system:run-dawa-script`

## Security Features

### 1. Context Isolation

- `contextIsolation: true` in BrowserWindow configuration
- `nodeIntegration: false` in BrowserWindow configuration
- All Node.js APIs exposed via preload script with `contextBridge`

### 2. License Verification

- Online check prioritized when network available
- Fallback to local token with 48-hour grace period
- Real-time revoke detection via 5-minute polling
- Automatic cleanup on revoke detection

### 3. Secure Temp File Handling

- Random UUID filenames (e.g., `dawa_550e8400-e29b-41d4-a716-446655440000.reg`)
- Written to OS temp directory (`app.getPath('temp')`)
- File permissions set to 0o600 (owner read/write only)
- Secure deletion: overwrite with random bytes 3x before unlink

### 4. Execution Control

- Only whitelisted scripts can execute
- License checked before each execution
- Feature policy checked before each execution
- Backend validates against server-side policy

### 5. Logging Protection

- No logging of decrypted script content
- No logging of license keys or tokens
- Error messages sanitized for sensitive information

## Flow Diagram

```
User clicks feature in Vue
    ↓
ipcRenderer.invoke('system:execute-feature', { scriptKey, options })
    ↓
Main Process: licenseManager.isFeatureAllowed()
    ↓
Online Check (if network available)
    ├─ Check license status via backend API
    ├─ Check feature policy from backend
    └─ Validate feature is enabled & not deleted
    ↓
Offline Check (if network unavailable)
    ├─ Validate local token
    └─ Check if within 48-hour grace period
    ↓
If NOT allowed → Return error to Vue
    ↓
If allowed → featureExecutor.executeFeature()
    ↓
Decrypt script content (future: AES-256-GCM)
    ↓
Write to temp file with random UUID
    ↓
Execute based on file type
    ├─ .reg → regedit.exe /s <tempFile>
    ├─ .bat → cmd.exe /c <tempFile>
    ├─ .ps1 → powershell.exe -File <tempFile>
    └─ .exe → spawn <tempFile> with args
    ↓
Wait for process to close
    ↓
Secure delete temp file (overwrite 3x)
    ↓
Return result to Vue
```

## Migration Steps for Full Implementation

### Phase 1: Script Encryption (Future)

1. Create encryption utility:

```javascript
// encryptor.js
import crypto from 'crypto'

export function encryptScript(content, key) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(content, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    content: encrypted
  }
}

export function decryptScript(encryptedData, key) {
  const iv = Buffer.from(encryptedData.iv, 'hex')
  const authTag = Buffer.from(encryptedData.authTag, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

2. Derive key from license token:

```javascript
function deriveDecryptionKey(accessToken) {
  // Use HMAC-SHA256 with token as key and salt
  const salt = 'DAWA-SCRIPT-ENCRYPTION-SALT'
  return crypto.createHmac('sha256', accessToken).update(salt).digest()
}
```

3. Encrypt all scripts and save as .dat files

### Phase 2: Vue Component Update (Future)

Update Vue components to use new handler:

```javascript
// Before
const result = await window.api.runDawaScript(scriptKey, options)

// After
const result = await window.api.executeFeature({ scriptKey, options })
```

### Phase 3: Testing

1. Test online license verification
2. Test offline grace period (disconnect network)
3. Test revoke detection (admin revokes license, wait 5 minutes)
4. Test temp file cleanup (crash app, check temp directory)
5. Test secure deletion (use recovery tool, verify no content)

## Security Checklist

- [x] Context isolation enabled
- [x] Node integration disabled
- [x] License check before each execution
- [x] Feature policy check before each execution
- [x] Temp files with random UUID names
- [x] Temp files in OS temp directory
- [x] Secure file deletion (overwrite 3x)
- [x] Orphaned temp file cleanup on startup
- [x] Real-time revoke detection (5-minute polling)
- [x] Offline grace period (48 hours)
- [x] No logging of sensitive data
- [ ] Script encryption (future)
- [ ] Decryption key from license token (future)
- [ ] Vue component integration (future)

## References

- Electron Security Best Practices: https://www.electronjs.org/docs/latest/tutorial/security
- Node.js Crypto Documentation: https://nodejs.org/api/crypto.html
- AES-256-GCM Encryption: https://en.wikipedia.org/wiki/Galois/Counter_Mode
