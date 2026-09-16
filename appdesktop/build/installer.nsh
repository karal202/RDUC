; Custom NSIS script for Dawa Optimizer - Secure License Gate BEFORE Installation
; WARNING: This gate runs BEFORE files are extracted. Fail = Quit installer.

Var LicenseKey
Var LicenseGateOutput

!macro customInstall
!macroend

!macro customInit
  ; Prevent silent bypass via command-line args
  StrCpy $0 "DAWA"

  InitPluginsDir

  ; Extract the license gate GUI script to temporary plugins directory
  File "/oname=$PLUGINSDIR\license-gate.ps1" "build\license-gate.ps1"

  ; Execute the license gate dialog in STA mode
  nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Sta -File "$PLUGINSDIR\license-gate.ps1"'
  Pop $0
  Pop $LicenseGateOutput

  ; Check result from license-gate.ps1
  ; If user authenticated successfully, license-gate.ps1 outputs "OK|<key>"
  StrCpy $0 $LicenseGateOutput 3
  ${If} $0 == "OK|"
    StrCpy $LicenseKey $LicenseGateOutput "" 3
    ; Ensure registry key is written for first-run app activation
    WriteRegStr HKCU "Software\DAWA Optimizer" "LicenseKey" $LicenseKey
    WriteRegDWORD HKCU "Software\DAWA Optimizer" "ValidatedByInstaller" 1
    DetailPrint "→ Ban quyen hop le. Bat dau cai dat..."
    Goto GatePassed
  ${EndIf}

  ; If user closed the form or clicked cancel -> Abort installer immediately
  Quit

  GatePassed:
!macroend
