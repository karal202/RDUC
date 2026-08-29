const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pcInfoApi', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info')
});
