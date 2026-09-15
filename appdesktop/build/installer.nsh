; Custom NSIS script for Dawa Optimizer - Add License Key Input Page
; This script adds a custom page BEFORE the standard NSIS installation pages

!macro customInstall
  ; This macro runs after all pages are defined
  ; We need to use a different approach - insert page before standard pages
!macroend

!macro customInit
  ; This runs at the very beginning of the installer
  ; Show custom license key dialog before any standard pages
  
  ; Display custom dialog
  nsDialogs::Create 1018
  Pop $0
  
  ${If} $0 == error
    Abort
  ${EndIf}
  
  ; Create label
  ${NSD_CreateLabel} 0 0 100% 20u "Vui lòng nhập key bản quyền DAWA Optimizer:"
  Pop $1
  
  ; Create input field
  ${NSD_CreateText} 0 25u 300u 12u ""
  Pop $LicenseKeyInput
  
  ; Create hint label
  ${NSD_CreateLabel} 0 45u 100% 15u "Ví dụ: DAWA-XXXX-XXXX-XXXX"
  Pop $1
  
  nsDialogs::Show
  
  ; Get input value
  ${NSD_GetText} $LicenseKeyInput $LicenseKey
  
  ; Validate
  ${If} $LicenseKey == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION "Vui lòng nhập key bản quyền!"
    Quit
  ${EndIf}
  
  ; Check if starts with DAWA-
  StrCpy $0 $LicenseKey 5
  ${If} $0 != "DAWA-"
    MessageBox MB_OK|MB_ICONEXCLAMATION "Key không hợp lệ! Key phải bắt đầu với 'DAWA-'"
    Quit
  ${EndIf}
  
  ; Save to registry
  WriteRegStr HKCU "Software\DAWA Optimizer" "LicenseKey" $LicenseKey
!macroend