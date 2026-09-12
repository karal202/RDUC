// Migration script to populate feature_file_policies with existing entries
const path = require('path');
const fs = require('fs');

const LEGACY_FEATURES = [
  // BIOS
  ["bios-bat", "BIOS", "BIOS/bios.bat"],
  ["ntfs-bat", "BIOS / NTFS", "BIOS/NTFS.bat"],
  
  // Network
  ["network-full-tweaks", "Network", "Network/Network Tweaks.reg"],
  ["network-fast-send", "Network", "Network/FastSendDatagramThreshold.reg"],
  
  // Input Lag - Mouse Data Queue
  ["mouse-queue-10", "Input Lag", "Input Lag/Mouse/DataQueueSize/10 Decimal.reg"],
  ["mouse-queue-20", "Input Lag", "Input Lag/Mouse/DataQueueSize/20 Decimal.reg"],
  ["mouse-queue-22", "Input Lag", "Input Lag/Mouse/DataQueueSize/22 Decimal.reg"],
  ["mouse-queue-25", "Input Lag", "Input Lag/Mouse/DataQueueSize/25 Decimal.reg"],
  ["mouse-queue-default", "Input Lag", "Input Lag/Mouse/DataQueueSize/Default Windows.reg"],
  
  // Input Lag - Keyboard Data Queue
  ["keyboard-queue-10", "Input Lag", "Input Lag/Keyboard/DataQueueSize/10 Decimal.reg"],
  ["keyboard-queue-15", "Input Lag", "Input Lag/Keyboard/DataQueueSize/15 Decimal.reg"],
  ["keyboard-queue-20", "Input Lag", "Input Lag/Keyboard/DataQueueSize/20 Decimal.reg"],
  ["keyboard-queue-22", "Input Lag", "Input Lag/Keyboard/DataQueueSize/22 Decimal.reg"],
  ["keyboard-queue-25", "Input Lag", "Input Lag/Keyboard/DataQueueSize/25 Decimal.reg"],
  ["keyboard-queue-default", "Input Lag", "Input Lag/Keyboard/DataQueueSize/Default Windows.reg"],
  
  // Tools & Cache
  ["msi-utility", "Tools & Cache", "Tool&cache/MSI Utility/MSI Utility V3.exe"],
  ["windows-settings-tweaks", "Tools & Cache", "Tool&cache/Classic Right Click Menu/Windows 11.reg"],
  ["dawa-cleaner", "Tools & Cache", "Tool&cache/Clean/Clear.bat"],
  
  // Optimize - RAM
  ["ram-optimization", "Optimize", "Optimizer/Ram Optimization/Reset to Default.reg"],
  
  // Optimize - Power Plan
  ["dawa-power-plan", "Optimize", "Optimizer/4. PowerPlan/Dawa_Utilmate.pow"],
  
  // Win32 Priority
  ["win32-priority", "Optimize", "Optimizer/8. Win32Priority/26 hex.reg"],
  
  // Restore
  ["restore-gamer-services", "Restore", "Restore/Disable Services For Gamers Restore.reg"],
  ["restore-professional-services", "Restore", "Restore/Disable Services For Professionals Restore.reg"],
  
  // DAWA Actions
  ["dawa-gaming-boost", "Optimize", "(internal)"],
  ["dawa-cleaner", "Tools & Cache", "(internal)"],
  
  // Windows Tweaks
  ["win-disable-hibernate", "Windows Tweaks", "(internal)"],
  ["win-enable-hibernate", "Windows Tweaks", "(internal)"],
  ["win-disable-fso-gamebar", "Windows Tweaks", "(internal)"],
  ["win-enable-fso-gamebar", "Windows Tweaks", "(internal)"],
  ["win-disable-telemetry", "Windows Tweaks", "(internal)"],
  ["win-enable-telemetry", "Windows Tweaks", "(internal)"],
  ["win-disable-superfetch", "Windows Tweaks", "(internal)"],
  ["win-enable-superfetch", "Windows Tweaks", "(internal)"],
  ["win-disable-transparency", "Windows Tweaks", "(internal)"],
  ["win-enable-transparency", "Windows Tweaks", "(internal)"],
  
  // Legacy
  ["mouse-disable-acceleration", "Input Lag", "Input Lag/Reduce Input Lag/System.reg"],
];

// Generate SQL INSERT statements
const sqlStatements = LEGACY_FEATURES.map(([key, section, file_path]) => 
  `INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('${key}', '${section}', '${file_path}', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);`
).join('\n');

console.log('-- Migration SQL for feature_file_policies');
console.log('-- Run this in your MySQL/MariaDB database\n');
console.log(sqlStatements);
