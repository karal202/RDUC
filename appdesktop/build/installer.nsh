; Custom NSIS script for Dawa Optimizer
; This script will be included by electron-builder during NSIS installer build

; Save license key to registry after installation (user enters key in app)
!macro customInstall
  ; Read license key from registry if it was saved during install
  ReadRegStr $0 HKCU "Software\DAWA Optimizer" "LicenseKey"
  ${If} $0 != ""
    ; License key exists - nothing to do, app will read it
  ${EndIf}
!macroend
