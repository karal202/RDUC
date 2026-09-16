; Custom NSIS script for Dawa Optimizer - Secure License Gate BEFORE Installation
; WARNING: This gate runs BEFORE files are extracted. Fail = Quit installer.

Var LicenseKey
Var LicenseGateOutput
Var InstallerLogFh
Var LogStampTmp

; ============================================================
; Helper: append a line with timestamp to shared installer log.
; Uses ONLY built-in NSIS 3.x core commands (no plugins required).
; Timestamp is pulled from %DATE% %TIME% environment variables.
; ============================================================
!macro LogInstaller MSG
  StrCmp $InstallerLogFh "" 0 LogWriteDo
    CreateDirectory "$APPDATA\dawa-optimizer\logs"
    FileOpen $InstallerLogFh "$APPDATA\dawa-optimizer\logs\dawa-installer.log" a
    StrCmp $InstallerLogFh "" LogSkipWrite LogBootHeader
    LogBootHeader:
      FileWrite $InstallerLogFh "$\r$\n============================================================$\r$\n"
      FileWrite $InstallerLogFh "[BOOT] NSIS Installer v${APP_VERSION} started$\r$\n"
  LogWriteDo:
    ExpandEnvStrings $LogStampTmp "%DATE% %TIME%"
    StrCpy $LogStampTmp $LogStampTmp -1 " "
    FileWrite $InstallerLogFh "[$LogStampTmp] [NSIS] ${MSG}$\r$\n"
  LogSkipWrite:
!macroend

!macro customInstall
  !insertmacro LogInstaller "customInstall: installer start extracting files to $INSTDIR"
!macroend

!macro customInit
  StrCpy $InstallerLogFh ""
  !insertmacro LogInstaller "customInit invoked — preventing silent bypass, preparing plugins dir"

  StrCmp $0 "" 0 +2
  StrCpy $0 "DAWA"

  InitPluginsDir
  !insertmacro LogInstaller "PluginsDir = $PLUGINSDIR"

  !insertmacro LogInstaller "Extracting license-gate.ps1 -> $PLUGINSDIR\license-gate.ps1"
  File /oname=$PLUGINSDIR\license-gate.ps1 "${BUILD_RESOURCES_DIR}\license-gate.ps1"

  Delete "$PLUGINSDIR\gate-result.txt"
  !insertmacro LogInstaller "Cleared prior gate-result.txt"

  !insertmacro LogInstaller "Launching license-gate.ps1 (blocks until user closes form)..."
  ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Sta -WindowStyle Hidden -File "$PLUGINSDIR\license-gate.ps1" -LogFile "$APPDATA\dawa-optimizer\logs\dawa-installer.log"' $0
  !insertmacro LogInstaller "license-gate.ps1 exited with code=$0"

  StrCpy $LicenseGateOutput ""
  FileOpen $1 "$PLUGINSDIR\gate-result.txt" r
  IfErrors CheckRegistryFallback 0
    FileRead $1 $LicenseGateOutput
    FileClose $1
    StrLen $2 "$LicenseGateOutput"
    !insertmacro LogInstaller "gate-result.txt read: length=$2"

  StrCpy $0 $LicenseGateOutput 3
  StrCmp $0 "OK|" GateExtractKey 0

  CheckRegistryFallback:
  !insertmacro LogInstaller "Result file invalid or missing — checking registry fallback (HKCU\Software\DAWA Optimizer\ValidatedByInstaller=1)"
  ReadRegDWORD $0 HKCU "Software\DAWA Optimizer" "ValidatedByInstaller"
  IntCmp $0 1 0 GateQuit GateQuit
  ReadRegStr $LicenseKey HKCU "Software\DAWA Optimizer" "LicenseKey"
  StrCmp $LicenseKey "" GateQuit GatePassed

  GateExtractKey:
  StrCpy $LicenseKey $LicenseGateOutput "" 3
  StrLen $3 "$LicenseKey"
  !insertmacro LogInstaller "Gate passed via gate-result OK| prefix, key length=$3"
  Goto GatePassed

  GateQuit:
  !insertmacro LogInstaller "Gate FAILED — user cancel / invalid key / no fallback. Quitting installer."
  StrCmp $InstallerLogFh "" 0 +3
    FileWrite $InstallerLogFh "[EXIT] NSIS installer aborted (gate not passed)$\r$\n"
    FileClose $InstallerLogFh
  Quit

  GatePassed:
  !insertmacro LogInstaller "Gate PASSED — allowing extraction. Install path = $INSTDIR, user=$UserName"
  DetailPrint "-> Ban quyen hop le. Bat dau cai dat..."
!macroend

; NOTE: electron-builder expects the macro name with exact casing.
; Hook here gets called during uninstall, shares APPDATA log file path.
!macro customUnInstall
  !insertmacro LogInstaller "customUnInstall — removing files + cleanup for $INSTDIR"
!macroend
