import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getDeviceHash: () => ipcRenderer.invoke('license:get-device-hash'),
  checkLicenseStatus: () => ipcRenderer.invoke('license:check-status'),
  activateLicense: (keyCode) => ipcRenderer.invoke('license:activate', keyCode),
  deactivateLicense: () => ipcRenderer.invoke('license:deactivate'),
  checkAppVersion: () => ipcRenderer.invoke('app:check-version'),

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
