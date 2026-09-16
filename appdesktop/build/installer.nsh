; Custom NSIS script for Dawa Optimizer - Secure License Gate BEFORE Installation
; WARNING: This gate runs BEFORE files are extracted. Fail = Quit installer.

Var LicenseKey
Var LicenseGateOutput
Var InstallerLogFh
Var LogStampTmp
Var LogTmp1
Var LogTmp2
Var LogBootWritten

; ============================================================
; LogInstaller MSG — append timestamped line to APPDATA installer log.
;
; CRITICAL: ZERO labels inside this macro (no name: declarations).
; NSIS labels inside macros cause "already declared" if the macro
; is inserted 2+ times. All branching uses StrCmp +N forward jumps.
; ============================================================
!macro LogInstaller MSG
  ; --- Branch 1: If log already open → skip open/header logic ----
  StrCmp $InstallerLogFh "" 0 +8
    ; --- Open block runs only if handle is empty ------------------
    CreateDirectory "$APPDATA\dawa-optimizer\logs"
    FileOpen $InstallerLogFh "$APPDATA\dawa-optimizer\logs\dawa-installer.log" a
    ; If still failed to open (permission?) → skip everything else
    StrCmp $InstallerLogFh "" 0 +4
      Goto +23
    ; Header block: write only on first successful open per phase --
    StrCmp $LogBootWritten "1" +4
      FileWrite $InstallerLogFh "$\r$\n============================================================$\r$\n"
      FileWrite $InstallerLogFh "[BOOT] NSIS Installer started — APP version=${VERSION}$\r$\n"
      StrCpy $LogBootWritten "1"
  ; --- Branch 2: Append actual timestamped message line ----------
  StrCmp $InstallerLogFh "" 0 +4
    Goto +5
  ExpandEnvStrings $LogStampTmp "%DATE% %TIME%"
  StrCpy $LogStampTmp $LogStampTmp -1 " "
  FileWrite $InstallerLogFh "[$LogStampTmp] [NSIS] ${MSG}$\r$\n"
!macroend

!macro customInstall
  !insertmacro LogInstaller "customInstall: installer start extracting files to $INSTDIR"
!macroend

!macro customInit
  ; Reset per-process bookkeeping at the very start of installer phase
  StrCpy $InstallerLogFh ""
  StrCpy $LogBootWritten ""
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
  StrCmp $InstallerLogFh "" +3
    FileWrite $InstallerLogFh "[EXIT] NSIS installer aborted (gate not passed)$\r$\n"
    FileClose $InstallerLogFh
  Quit

  GatePassed:
  !insertmacro LogInstaller "Gate PASSED — allowing extraction. Install path = $INSTDIR, user=$UserName"
  DetailPrint "-> Ban quyen hop le. Bat dau cai dat..."
!macroend

!macro customUnInstall
  StrCpy $InstallerLogFh ""
  StrCpy $LogBootWritten ""
  !insertmacro LogInstaller "customUnInstall — removing files + cleanup for $INSTDIR"
!macroend
