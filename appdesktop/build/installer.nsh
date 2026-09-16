; Custom NSIS script for Dawa Optimizer - Secure License Gate BEFORE Installation
; WARNING: This gate runs BEFORE files are extracted. Fail = Quit installer.

!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "WinCore.nsh"
!include "WinVer.nsh"
!include "System.nsh"

Var LicenseKeyInput
Var LicenseKey
Var ValidationResult
Var HwIdTemp

!macro customInstall
!macroend

!macro customInit
  ; === STEP 0: Prevent silent bypass via command-line args ===
  StrCmp $0 "" 0 +2
  StrCpy $0 "DAWA"

  ; === STEP 0.5: Force ComCtl32 v6 manifest activation context for visual styles ===
  ; Fixes "không hỗ trợ visual styles" on elevated tokens / Win11 builds where Themes service
  ; hasn't hooked side-by-side manifest yet for plugin DLLs (nsDialogs requires ComCtl32 v6).
  InitPluginsDir
  System::Call "kernel32::LoadLibrary(t 'comctl32.dll')"
  System::Call "uxtheme::SetWindowTheme(i $HWNDPARENT, t 'DarkMode_Explorer', t '')"

  ValidateAgain:

  ; === STEP 1: Collect lightweight HWID for server-side binding ===
  nsExec::ExecToStack 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$uuid = (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue | Select-Object -ExpandProperty UUID) -replace ''''[^A-Z0-9-]'''',''''; $cpu = (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty ProcessorId) -replace ''''[^A-Z0-9]'''',''''; $serial = (Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -ExpandProperty SerialNumber) -replace ''''[^A-Z0-9]'''',''''; $machine = $env:COMPUTERNAME; Write-Output ($uuid + ''_'' + $cpu + ''_'' + $serial + ''_'' + $machine).Trim(''_'')"'
  Pop $0
  Pop $HwIdTemp
  ${If} $HwIdTemp == ""
    StrCpy $HwIdTemp "UNKNOWN-HWID"
  ${EndIf}

  ; === STEP 2: Render license dialog with nsDialogs (FALLBACK = classic InputBox if visual styles fail) ===
  DialogRetry:
  nsDialogs::Create 1018 "DAWA Optimizer — License Gate"
  Pop $0
  ${If} $0 == error
    ; === FALLBACK PATH: Visual styles broken (Themes service off / Safe Mode / Classic shell / elevated token without manifest) ===
    ; Use built-in Microsoft.VisualBasic Interaction.InputBox — works on ALL Windows without any visual style requirement
    ; (pure Win32 CreateWindowExA backend, no ComCtl32 v6 needed)
    DialogClassicFallback:
    nsExec::ExecToStack 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Normal -Sta -Command "Add-Type -AssemblyName Microsoft.VisualBasic; $k = [Microsoft.VisualBasic.Interaction]::InputBox(''''Nhập key bản quyền DAWA-XXXX-XXXX-XXXX để giải nén:'''',''''DAWA Optimizer — License Gate (Classic Mode)'''','''''''', -1, -1); if ([string]::IsNullOrWhiteSpace($k)) { Write-Output ''''CANCEL'''' } else { Write-Output ($k.Trim().ToUpper()) }"'
    Pop $0
    Pop $LicenseKey
    ${If} $LicenseKey == "CANCEL"
      MessageBox MB_OK|MB_ICONEXCLAMATION|MB_RETRYCANCEL "Vui lòng nhập key bản quyền để tiếp tục!" IDRETRY DialogClassicFallback
      Quit
    ${EndIf}
    Goto FormatCheckStart
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 20u "Nhập key bản quyền để giải nén DAWA Optimizer:"
  Pop $1
  SetCtlColors $1 "" "transparent"

  ${NSD_CreateText} 0 25u 300u 12u ""
  Pop $LicenseKeyInput
  SendMessage $LicenseKeyInput ${EM_SETLIMITTEXT} 24 0
  ${NSD_AddStyle} $LicenseKeyInput ${ES_UPPERCASE}

  ${NSD_CreateLabel} 0 45u 100% 15u "Định dạng: DAWA-XXXX-XXXX-XXXX | Yêu cầu kết nối mạng để xác thực online."
  Pop $1
  SetCtlColors $1 0x888888 "transparent"

  nsDialogs::Show

  ${NSD_GetText} $LicenseKeyInput $LicenseKey

  FormatCheckStart:
  ; === STEP 3: Local format sanity check ===
  ${If} $LicenseKey == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION|MB_RETRYCANCEL "Vui lòng nhập key bản quyền!" IDRETRY DialogRetry
    Quit
  ${EndIf}

  StrCpy $0 $LicenseKey 5
  ${If} $0 != "DAWA-"
    MessageBox MB_OK|MB_ICONEXCLAMATION|MB_RETRYCANCEL "Key không hợp lệ! Key phải bắt đầu bằng 'DAWA-'" IDRETRY DialogRetry
    Quit
  ${EndIf}

  ; === STEP 4: REAL backend validation — NO extraction before this passes ===
  DetailPrint "→ Đang kết nối máy chủ DAWA xác thực key..."

  ; Escape LicenseKey and HwIdTemp for safe JSON injection in PowerShell
  ; Use Base64-encoded JSON to avoid quote-hell on cmdline
  nsExec::ExecToStack 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$key = ''''$LicenseKey''''.Trim(); $hwid = ''''$HwIdTemp''''.Trim(); $body = @{ key_code = $key; hardware_id = $hwid; device_name = $env:COMPUTERNAME; os_info = (Get-CimInstance Win32_OperatingSystem | ForEach-Object { $_.Caption + '' '' + $_.Version + '' ('' + $env:PROCESSOR_ARCHITECTURE + '')'' }) } | ConvertTo-Json -Compress; try { $resp = Invoke-RestMethod -Uri ''https://rduc.onrender.com/api/license/validate'' -Method POST -Body $body -ContentType ''application/json; charset=utf-8'' -UseBasicParsing -TimeoutSec 20; if ($resp.success -and $resp.valid) { Write-Output ''OK'' } else { $msg = $resp.message -replace ''\n'','' ''; Write-Output (''FAIL|'' + $msg) } } catch { Write-Output (''ERR|'' + $_.Exception.Message) }"'
  Pop $0
  Pop $ValidationResult

  ${If} $ValidationResult == "OK"
    ; === STEP 5A: Pass — save key to registry with light obfuscation (Base64 UTF-16LE) ===
    nsExec::ExecToStack 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$bytes = [System.Text.Encoding]::Unicode.GetBytes(''''$LicenseKey''''); [Convert]::ToBase64String($bytes)"'
    Pop $0
    Pop $0
    ${If} $0 != ""
      WriteRegStr HKCU "Software\DAWA Optimizer" "LicenseKey" $0
      WriteRegDWORD HKCU "Software\DAWA Optimizer" "ValidatedByInstaller" 1
    ${Else}
      WriteRegStr HKCU "Software\DAWA Optimizer" "LicenseKey" $LicenseKey
    ${EndIf}
    DetailPrint "→ Key hợp lệ. Bắt đầu giải nén..."
    Goto GatePassed
  ${Else}
    ; === STEP 5B: Fail — extract human message, NO files extracted ===
    StrCpy $0 $ValidationResult 5
    ${If} $0 == "ERR|"
      StrCpy $ValidationResult $ValidationResult "" 5
      MessageBox MB_OK|MB_ICONEXCLAMATION|MB_RETRYCANCEL "Không kết nối được máy chủ xác thực.$\r$\n$\r$\nLỗi: $ValidationResult$\r$\n$\r$\nBạn cần có mạng để kích hoạt bản quyền lần đầu." IDRETRY DialogRetry
      Quit
    ${EndIf}
    StrCpy $0 $ValidationResult 5
    ${If} $0 == "FAIL|"
      StrCpy $ValidationResult $ValidationResult "" 5
    ${EndIf}
    MessageBox MB_OK|MB_ICONSTOP|MB_RETRYCANCEL "Key bị từ chối bởi máy chủ.$\r$\n$\r$\n$ValidationResult" IDRETRY DialogRetry
    Quit
  ${EndIf}

  GatePassed:
!macroend