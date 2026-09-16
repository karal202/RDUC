; Custom NSIS script for Dawa Optimizer - Secure License Gate BEFORE Installation
; WARNING: This gate runs BEFORE files are extracted. Fail = Quit installer.

Var LicenseKey
Var LicenseGateOutput

!macro customInstall
!macroend

!macro customInit
  ; Prevent silent bypass via command-line args
  StrCmp $0 "" 0 +2
  StrCpy $0 "DAWA"

  InitPluginsDir

  ; Extract the license gate GUI script
  File /oname=$PLUGINSDIR\license-gate.ps1 "${BUILD_RESOURCES_DIR}\license-gate.ps1"

  ; Clean up any previous result
  Delete "$PLUGINSDIR\gate-result.txt"

  ; Launch the standalone license gate dialog (ExecWait waits for user to finish)
  ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Sta -WindowStyle Hidden -File "$PLUGINSDIR\license-gate.ps1"' $0

  ; Read result file written by the gate dialog
  StrCpy $LicenseGateOutput ""
  FileOpen $1 "$PLUGINSDIR\gate-result.txt" r
  IfErrors CheckRegistryFallback
  FileRead $1 $LicenseGateOutput
  FileClose $1

  StrCpy $0 $LicenseGateOutput 3
  StrCmp $0 "OK|" GateExtractKey 0

  CheckRegistryFallback:
  ; Fallback check from registry if file read had an issue
  ReadRegDWORD $0 HKCU "Software\DAWA Optimizer" "ValidatedByInstaller"
  IntCmp $0 1 0 GateQuit GateQuit
  ReadRegStr $LicenseKey HKCU "Software\DAWA Optimizer" "LicenseKey"
  StrCmp $LicenseKey "" GateQuit GatePassed

  GateExtractKey:
  StrCpy $LicenseKey $LicenseGateOutput "" 3
  Goto GatePassed

  GateQuit:
  ; User canceled or closed the dialog -> quit installer immediately
  Quit

  GatePassed:
  DetailPrint "→ Ban quyen hop le. Bat dau cai dat..."
!macroend
