import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getDeviceHash: () => ipcRenderer.invoke('license:get-device-hash'),
  checkLicenseStatus: () => ipcRenderer.invoke('license:check-status'),
  activateLicense: (keyCode) => ipcRenderer.invoke('license:activate', keyCode),
  deactivateLicense: () => ipcRenderer.invoke('license:deactivate'),
  checkAppVersion: () => ipcRenderer.invoke('app:check-version'),
  openDownloadUrl: (url) => ipcRenderer.invoke('app:open-download-url', url),
  startAutoUpdate: () => ipcRenderer.invoke('app:start-auto-update'),
  quitAndInstall: () => ipcRenderer.invoke('app:quit-and-install'),
  onUpdateAvailable: (callback) => {
    const listener = (_, info) => callback(info)
    ipcRenderer.on('app:update-available', listener)
    return () => ipcRenderer.removeListener('app:update-available', listener)
  },
  onUpdateProgress: (callback) => {
    const listener = (_, progress) => callback(progress)
    ipcRenderer.on('app:update-progress', listener)
    return () => ipcRenderer.removeListener('app:update-progress', listener)
  },
  onUpdateDownloaded: (callback) => {
    const listener = (_, info) => callback(info)
    ipcRenderer.on('app:update-downloaded', listener)
    return () => ipcRenderer.removeListener('app:update-downloaded', listener)
  },
  onUpdateError: (callback) => {
    const listener = (_, err) => callback(err)
    ipcRenderer.on('app:update-error', listener)
    return () => ipcRenderer.removeListener('app:update-error', listener)
  },
  getAccessToken: () => ipcRenderer.invoke('license:get-access-token'),
  onLicenseRevoked: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('license:revoked', listener)
    return () => ipcRenderer.removeListener('license:revoked', listener)
  },

  getSystemStats: () => ipcRenderer.invoke('system:get-stats'),
  restartToBios: () => ipcRenderer.invoke('system:restart-to-bios'),
  runDawaScript: (scriptKey) => ipcRenderer.invoke('system:run-dawa-script', { scriptKey }),
  listAllowedScripts: () => ipcRenderer.invoke('security:list-allowed-scripts')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', Object.freeze({ ...api }))
  } catch (error) {
    console.error('Context bridge exposure failed:', error)
  }
} else {
  window.api = Object.freeze({ ...api })
}
