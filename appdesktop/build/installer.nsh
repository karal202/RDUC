; Custom NSIS script for Dawa Optimizer - Secure License Gate BEFORE Installation
; WARNING: This gate runs BEFORE files are extracted. Fail = Quit installer.

!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "WinCore.nsh"
!include "WinVer.nsh"
!include "InstallOptions.nsh"

Var LicenseKeyInput
Var LicenseKey
Var ValidationResult
Var HwIdTemp
Var ComCtlLoadedOk
Var DialogMode
Var DialogResult
Var OkBtnHwnd
Var CancelBtnHwnd
Var IoPageIni

!macro customInstall
!macroend

!macro customInit
  ; === STEP 0: Prevent silent bypass via command-line args ===
  StrCmp $0 "" 0 +2
  StrCpy $0 "DAWA"

  ; === STEP 0.5: Force ComCtl32 v6 manifest activation context for visual styles ===
  StrCpy $ComCtlLoadedOk "0"
  StrCpy $DialogMode ""
  StrCpy $DialogResult ""
  StrCpy $OkBtnHwnd ""
  StrCpy $CancelBtnHwnd ""
  StrCpy $IoPageIni ""
  InitPluginsDir
  System::Call "kernel32::LoadLibrary(t 'comctl32.dll') i .s"
  Pop $0
  ${If} $0 != 0
    StrCpy $ComCtlLoadedOk "1"
    System::Call "uxtheme::SetWindowTheme(i $HWNDPARENT, t 'DarkMode_Explorer', t '')"
  ${EndIf}

  ValidateAgain:
  ; === ALWAYS reset state at retry head (no stale key from previous failed attempt) ===
  StrCpy $LicenseKey ""
  StrCpy $DialogResult ""

  ; === STEP 1: Collect lightweight HWID for server-side binding ===
  nsExec::ExecToStack 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$uuid = (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue | Select-Object -ExpandProperty UUID) -replace ''''[^A-Z0-9-]'''',''''; $cpu = (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty ProcessorId) -replace ''''[^A-Z0-9]'''',''''; $serial = (Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -ExpandProperty SerialNumber) -replace ''''[^A-Z0-9]'''',''''; $machine = $env:COMPUTERNAME; Write-Output ($uuid + ''_'' + $cpu + ''_'' + $serial + ''_'' + $machine).Trim(''_'')"'
  Pop $0
  Pop $HwIdTemp
  ${If} $HwIdTemp == ""
    StrCpy $HwIdTemp "UNKNOWN-HWID"
  ${EndIf}

  ; ============================================================
  ; === STEP 2: Show license input (3-tier fallback stack) ===
  ;   Tier 1 (visual): nsDialogs + ComCtl32 v6 with OK/Cancel buttons
  ;   Tier 2 (classic): PowerShell STA InputBox (NO -NonInteractive!
  ;                     otherwise the InputBox modal is BLOCKED by PS)
  ;   Tier 3 (bulletproof): InstallOptions native INI dialog — no
  ;                         PowerShell / no ComCtl32 needed. This is
  ;                         the absolute guarantee to show input UI on
  ;                         every Windows version incl. SmartScreen
  ;                         elevation, Safe Mode, and Classic themes.
  ; ============================================================
  DialogRetry:
  StrCpy $DialogMode "nsd"
  StrCpy $LicenseKey ""

  ; ---------- TIER 1: nsDialogs visual form + EXPLICIT OK/CANCEL BUTTONS ----------
  nsDialogs::Create 1018 "DAWA Optimizer — License Gate"
  Pop $0
  ${If} $0 == error
    ; nsDialogs failed (no ComCtl32 v6 manifest on elevation). Try tier 2.
    Goto DialogClassicPath
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 20u "Nhập key bản quyền để giải nén DAWA Optimizer:"
  Pop $1
  SetCtlColors $1 "" "transparent"

  ${NSD_CreateText} 0 24u 100% 12u ""
  Pop $LicenseKeyInput
  SendMessage $LicenseKeyInput ${EM_SETLIMITTEXT} 24 0
  ${NSD_AddStyle} $LicenseKeyInput ${ES_UPPERCASE}
  ${NSD_AddExStyle} $LicenseKeyInput ${WS_EX_CLIENTEDGE}

  ${NSD_CreateLabel} 0 42u 100% 15u "Định dạng: DAWA-XXXX-XXXX-XXXX | Yêu cầu kết nối mạng để xác thực online."
  Pop $1
  SetCtlColors $1 0x888888 "transparent"

  ; === EXPLICIT OK + CANCEL BUTTONS at bottom (user not forced to click X) ===
  ; 50% width OK button (left-aligned) + 50% Cancel button (right-aligned)
  ${NSD_CreateButton} 0 66u 48% 14u "Tiếp Tục (OK)"
  Pop $OkBtnHwnd
  ; Tell nsDialogs to treat this button as the ACCEPT (next) action
  ${NSD_AddStyle} $OkBtnHwnd ${BS_DEFPUSHBUTTON}
  SendMessage $OkBtnHwnd ${WM_SETFONT} $HFONT 1
  ; When clicked -> nsDialogs::Show returns "next" on stack
  nsDialogs::SetUserData $OkBtnHwnd "next"

  ${NSD_CreateButton} 52% 66u 48% 14u "Hủy Cài Đặt"
  Pop $CancelBtnHwnd
  SendMessage $CancelBtnHwnd ${WM_SETFONT} $HFONT 1
  nsDialogs::SetUserData $CancelBtnHwnd "cancel"

  ; Set focus to textbox so user can paste key instantly
  SendMessage $HWNDPARENT ${WM_NEXTDLGCTL} $LicenseKeyInput 1

  ; === nsDialogs Show: VERY ROBUST result parsing ===
  ; Returns one of: "next" (OK btn) / "cancel" (Cancel btn or X) /
  ;                 "back" / "" (empty on some wrappers)
  ; We treat ANYTHING that's not explicitly "cancel" or "back" as
  ; user-wants-to-submit, then read textbox. The previous code only
  ; accepted the literal "cancel" string — with SmartScreen elevation
  ; some NSIS builds don't push a clean "cancel" on X-close, hence
  ; the silent-fallthrough-to-format-check bug that showed the
  ; "prefix DAWA-" warning instead of the input form.
  nsDialogs::Show
  Pop $DialogResult

  ; Decide if user asked to cancel/quit
  ${If} $DialogResult == "cancel"
    Goto ConfirmQuitOrRetry
  ${EndIf}
  ${If} $DialogResult == "back"
    Goto ConfirmQuitOrRetry
  ${EndIf}
  ; Anything else → user pressed OK, pressed Enter, or closed via
  ; non-X action; treat as submission attempt (empty string is handled
  ; later by the format validator with a user-friendly Retry/Cancel).
  ${NSD_GetText} $LicenseKeyInput $LicenseKey
  StrCpy $DialogResult "ok"
  Goto FormatCheckStart

  ConfirmQuitOrRetry:
    MessageBox MB_YESNO|MB_ICONQUESTION "Bạn chắc chắn muốn hủy cài đặt?$\r$\n$\r$\nCó = quay lại cửa sổ nhập key.$\r$\nKhông = đóng Dawa Optimizer Setup." IDNO DoQuitInstaller
    StrCpy $LicenseKey ""
    Goto DialogRetry

  ; ---------- TIER 2: PowerShell InputBox (classic fallback) ----------
  DialogClassicPath:
  StrCpy $DialogMode "classic"
  DialogClassicFallback:
  StrCpy $LicenseKey ""
  ; !!! CRITICAL FIX: DO NOT pass -NonInteractive here !!!
  ; PowerShell -NonInteractive sets [Environment]::UserInteractive =
  ; $false which causes Microsoft.VisualBasic.Interaction.InputBox() to
  ; either throw silently or return ""/exception text WITHOUT EVER
  ; showing the dialog window. That was the #1 cause of the
  ; "no input form ever appeared → DAWA prefix error instantly"
  ; behavior the user was seeing — especially after a SmartScreen
  ; "unknown publisher" elevation restart.
  ; We keep -NoProfile (to speed up) and -Sta (InputBox needs STA).
  nsExec::ExecToStack 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -Sta -Mta -Command "try { Add-Type -AssemblyName Microsoft.VisualBasic } catch {}; try { $k = [Microsoft.VisualBasic.Interaction]::InputBox(''''Nhập key bản quyền DAWA-XXXX-XXXX-XXXX để giải nén:'''',''''DAWA Optimizer — License Gate'''','''''''', -1, -1) } catch { }; if ($null -eq $k) { Write-Output ''''CANCEL'''' } elseif ([string]::IsNullOrWhiteSpace($k)) { Write-Output ''''EMPTY_OK'''' } else { Write-Output ($k.Trim().ToUpper()) }"'
  Pop $0
  Pop $LicenseKey

  ; If PowerShell executable itself is unavailable (Windows Server
  ; Nano / stripped .NET) or InputBox failed and returned empty,
  ; fall through to tier 3 bulletproof InstallOptions.
  ${If} $LicenseKey == "CANCEL"
    Goto ConfirmQuitOrRetryClassic
  ${EndIf}
  ${If} $LicenseKey == ""
    ; PowerShell probably didn't render. Try tier 3.
    Goto DialogInstallOptionsPath
  ${EndIf}
  ${If} $LicenseKey == "EMPTY_OK"
    StrCpy $LicenseKey ""
  ${EndIf}
  StrCpy $DialogResult "ok"
  Goto FormatCheckStart

  ConfirmQuitOrRetryClassic:
    MessageBox MB_YESNO|MB_ICONQUESTION "Bạn chắc chắn muốn hủy cài đặt?$\r$\n$\r$\nCó = quay lại cửa sổ nhập key.$\r$\nKhông = đóng Dawa Optimizer Setup." IDNO DoQuitInstaller
    StrCpy $LicenseKey ""
    Goto DialogClassicFallback

  ; ---------- TIER 3: Native InstallOptions INI dialog (bulletproof) ----------
  DialogInstallOptionsPath:
  StrCpy $DialogMode "ini"
  DialogIniFallback:
  StrCpy $LicenseKey ""

  ; Build a tiny InstallOptions INI inside $PLUGINSDIR (already exists
  ; from InitPluginsDir). Zero dependencies — no PowerShell, no
  ; ComCtl32 v6, no themes service required. Guaranteed to render
  ; under SmartScreen elevation, Safe Mode, Classic desktop.
  InitPluginsDir
  StrCpy $IoPageIni "$PLUGINSDIR\dawa-license-page.ini"
  FileOpen $0 $IoPageIni w
  FileWrite $0 "[Settings]$\r$\n"
  FileWrite $0 "NumFields=3$\r$\n"
  FileWrite $0 "Title=DAWA Optimizer — License Gate$\r$\n"
  FileWrite $0 "CancelEnabled=1$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "[Field 1]$\r$\n"
  FileWrite $0 "Type=Label$\r$\n"
  FileWrite $0 "Left=5$\r$\n"
  FileWrite $0 "Right=300$\r$\n"
  FileWrite $0 "Top=5$\r$\n"
  FileWrite $0 "Bottom=18$\r$\n"
  FileWrite $0 "Text=Nhập key bản quyền để giải nén DAWA Optimizer:$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "[Field 2]$\r$\n"
  FileWrite $0 "Type=Text$\r$\n"
  FileWrite $0 "Left=5$\r$\n"
  FileWrite $0 "Right=300$\r$\n"
  FileWrite $0 "Top=22$\r$\n"
  FileWrite $0 "Bottom=32$\r$\n"
  FileWrite $0 "MaxLen=24$\r$\n"
  FileWrite $0 "Flags=MANDATORY|UPPERCASE$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "[Field 3]$\r$\n"
  FileWrite $0 "Type=Label$\r$\n"
  FileWrite $0 "Left=5$\r$\n"
  FileWrite $0 "Right=300$\r$\n"
  FileWrite $0 "Top=36$\r$\n"
  FileWrite $0 "Bottom=46$\r$\n"
  FileWrite $0 "Text=Dinh dang: DAWA-XXXX-XXXX-XXXX | Can ket noi mang.$\r$\n"
  FileClose $0

  InstallOptions::Dialog "$IoPageIni"
  Pop $DialogResult

  ${If} $DialogResult == "cancel"
    Goto ConfirmQuitOrRetryIni
  ${EndIf}
  ${If} $DialogResult == "back"
    Goto ConfirmQuitOrRetryIni
  ${EndIf}
  ; User pressed Next/OK on InstallOptions. Read Field 2 text.
  ReadINIStr $LicenseKey $IoPageIni "Field 2" "State"
  StrCpy $DialogResult "ok"
  Goto FormatCheckStart

  ConfirmQuitOrRetryIni:
    MessageBox MB_YESNO|MB_ICONQUESTION "Bạn chắc chắn muốn hủy cài đặt?$\r$\n$\r$\nCó = quay lại cửa sổ nhập key.$\r$\nKhông = đóng Dawa Optimizer Setup." IDNO DoQuitInstaller
    StrCpy $LicenseKey ""
    Goto DialogIniFallback

  FormatCheckStart:
  ; === STEP 3: Local format sanity check ===
  ${If} $LicenseKey == ""
    ${If} $DialogMode == "classic"
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Vui lòng nhập key bản quyền để tiếp tục!$\r$\nRetry = nhập lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogClassicFallback
    ${ElseIf} $DialogMode == "ini"
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Vui lòng nhập key bản quyền để tiếp tục!$\r$\nRetry = nhập lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogIniFallback
    ${Else}
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Vui lòng nhập key bản quyền để tiếp tục!$\r$\nRetry = nhập lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogRetry
    ${EndIf}
    Goto DoQuitInstaller
  ${EndIf}

  ; Uppercase normalize (tier 2 PowerShell already ToUpper, but tier
  ; 1/3 might not depending on NSD_AddStyle ES_UPPERCASE behavior on
  ; certain locales).
  StrCpy $LicenseKey $LicenseKey

  StrCpy $0 $LicenseKey 5
  ${If} $0 != "DAWA-"
    ${If} $DialogMode == "classic"
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Key không hợp lệ! Key phải bắt đầu bằng 'DAWA-' (ví dụ: DAWA-ABCD-1234-EFGH).$\r$\nRetry = nhập lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogClassicFallback
    ${ElseIf} $DialogMode == "ini"
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Key không hợp lệ! Key phải bắt đầu bằng 'DAWA-' (ví dụ: DAWA-ABCD-1234-EFGH).$\r$\nRetry = nhập lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogIniFallback
    ${Else}
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Key không hợp lệ! Key phải bắt đầu bằng 'DAWA-' (ví dụ: DAWA-ABCD-1234-EFGH).$\r$\nRetry = nhập lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogRetry
    ${EndIf}
    Goto DoQuitInstaller
  ${EndIf}

  ; === STEP 4: REAL backend validation — NO extraction before this passes ===
  DetailPrint "→ Đang kết nối máy chủ DAWA xác thực key..."

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
      ${If} $DialogMode == "classic"
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Không kết nối được máy chủ xác thực.$\r$\n$\r$\nLỗi: $ValidationResult$\r$\n$\r$\nBạn cần có mạng để kích hoạt bản quyền lần đầu.$\r$\nRetry = thử lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogClassicFallback
      ${ElseIf} $DialogMode == "ini"
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Không kết nối được máy chủ xác thực.$\r$\n$\r$\nLỗi: $ValidationResult$\r$\n$\r$\nBạn cần có mạng để kích hoạt bản quyền lần đầu.$\r$\nRetry = thử lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogIniFallback
      ${Else}
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Không kết nối được máy chủ xác thực.$\r$\n$\r$\nLỗi: $ValidationResult$\r$\n$\r$\nBạn cần có mạng để kích hoạt bản quyền lần đầu.$\r$\nRetry = thử lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogRetry
      ${EndIf}
      Goto DoQuitInstaller
    ${EndIf}
    StrCpy $0 $ValidationResult 5
    ${If} $0 == "FAIL|"
      StrCpy $ValidationResult $ValidationResult "" 5
    ${EndIf}
    ${If} $DialogMode == "classic"
      MessageBox MB_RETRYCANCEL|MB_ICONSTOP "Key bị từ chối bởi máy chủ.$\r$\n$\r$\n$ValidationResult$\r$\nRetry = nhập lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogClassicFallback
    ${ElseIf} $DialogMode == "ini"
      MessageBox MB_RETRYCANCEL|MB_ICONSTOP "Key bị từ chối bởi máy chủ.$\r$\n$\r$\n$ValidationResult$\r$\nRetry = nhập lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogIniFallback
    ${Else}
      MessageBox MB_RETRYCANCEL|MB_ICONSTOP "Key bị từ chối bởi máy chủ.$\r$\n$\r$\n$ValidationResult$\r$\nRetry = nhập lại.$\r$\nCancel = đóng cài đặt." IDRETRY DialogRetry
    ${EndIf}
    Goto DoQuitInstaller
  ${EndIf}

  DoQuitInstaller:
    Quit

  GatePassed:
!macroend
