const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const si = require('systeminformation');

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 820,
    minHeight: 600,
    backgroundColor: '#0b1020',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

async function getSystemInfo() {
  const [cpu, mem, osInfo, diskLayout, network, battery] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.osInfo(),
    si.diskLayout(),
    si.networkInterfaces(),
    si.battery()
  ]);

  return {
    system: {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      hostname: osInfo.hostname,
      arch: osInfo.arch,
      codename: osInfo.codename || 'N/A'
    },
    cpu: {
      brand: cpu.brand,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speed: cpu.speed,
      manufacturer: cpu.vendor
    },
    memory: {
      total: mem.total,
      free: mem.free,
      used: mem.used,
      active: mem.active,
      available: mem.available
    },
    disk: diskLayout.map((item) => ({
      name: item.name,
      type: item.type,
      size: item.size,
      serial: item.serial || 'N/A'
    })),
    network: network.map((item) => ({
      iface: item.iface,
      ip4: item.ip4,
      mac: item.mac,
      speed: item.speed || 'N/A'
    })),
    battery: {
      hasBattery: battery.hasBattery,
      cycleCount: battery.cycleCount || 'N/A',
      isCharging: battery.isCharging,
      percent: battery.percent,
      timeRemaining: battery.timeRemaining || 'N/A'
    }
  };
}

ipcMain.handle('get-system-info', getSystemInfo);

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
