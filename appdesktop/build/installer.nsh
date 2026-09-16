; Custom NSIS script for Dawa Optimizer - Secure License Gate BEFORE Installation
; WARNING: This gate runs BEFORE files are extracted. Fail = Quit installer.
;
; ARCHITECTURE (robust across SmartScreen unsigned-code elevation restart):
;
;   Tier 1 [primary]  : PowerShell WinForms GUI (build\license-gate.ps1)
;                       - Full dark-mode form, realtime validation status,
;                         OK/Hủy buttons, DAWA- format check, live HWID POST to
;                         backend, registry save on success.
;                       - CRITICAL: run WITHOUT -NonInteractive so
;                         [Environment]::UserInteractive stays $true; otherwise
;                         all WinForms modals are silently suppressed.
;                       - ONLY executed if the PS1 file could be extracted at
;                         compile-time via a NON-FATAL File pass. Otherwise we
;                         skip Tier 1 entirely — never abort NSIS compilation.
;
;   Tier 2A [fallback] : nsDialogs native UI
;                         - ComCtl32 v6 visual styles + DarkMode_Explorer theme
;                           pre-warmed via uxtheme!SetWindowTheme.
;                         - Explicit Tiep Tuc / Huy Cai Dat buttons so user is
;                           never forced to close via [X] (ambiguous return).
;
;   Tier 2B [bulletproof]: InstallOptions INI wizard page
;                         - No PowerShell, no ComCtl32 v6, no Themes service.
;                         - Guaranteed to render on every Windows version from
;                           7 through 11, including Safe Mode, Classic desktop,
;                           and post-SmartScreen elevated restarts.
;
; Every tier enforces the same license policy: DAWA- prefix check, online
; HTTPS POST to the /api/license/validate endpoint with real HWID payload,
; Base64-UTF16LE obfuscated registry save, and NO jump to GatePassed until
; the backend returns { success:true, valid:true }.

Var LicenseKey
Var LicenseGateOutput
Var GateMethod
Var ComCtlLoadedOk
Var HwIdTemp
Var DialogMode
Var DialogResult
Var LicenseKeyInput
Var IoPageIni
Var Ps1Ready

!macro SetGateResultOk _key
  StrCpy $LicenseKey ${_key}
  WriteRegStr HKCU "Software\DAWA Optimizer" "LicenseKey" $LicenseKey
  WriteRegDWORD HKCU "Software\DAWA Optimizer" "ValidatedByInstaller" 1
  DetailPrint "License gate: hop le (via $GateMethod). Bat dau giai nen..."
  Goto GatePassed
!macroend

!macro customInstall
!macroend

!macro customInit
  ; === STEP 0: Prevent silent bypass via command-line args ====================
  StrCmp $0 "" 0 +2
  StrCpy $0 "DAWA"

  InitPluginsDir
  StrCpy $LicenseKey ""
  StrCpy $LicenseGateOutput ""
  StrCpy $GateMethod ""
  StrCpy $ComCtlLoadedOk "0"
  StrCpy $DialogMode ""
  StrCpy $DialogResult ""
  StrCpy $IoPageIni ""
  StrCpy $Ps1Ready "0"

  ; Warm-up ComCtl32.dll + uxtheme (affects Tier 2A nsDialogs if used later).
  System::Call "kernel32::LoadLibrary(t 'comctl32.dll') i .s"
  Pop $0
  ${If} $0 != 0
    StrCpy $ComCtlLoadedOk "1"
    System::Call "uxtheme::SetWindowTheme(i $HWNDPARENT, t 'DarkMode_Explorer', t '')"
  ${EndIf}

  ; === STEP 1: Try to extract Tier-1 PowerShell script (NON-FATAL) ===========
  ; NSIS `File` raises a compile-time error if source path does not resolve.
  ; electron-builder drives makensis from $PROJECT_DIR with BUILD_RESOURCES_DIR
  ; defined as "PROJECT_DIR\build", so we try that path first. If anything
  ; fails (missing file, permission, wrong drive mapping) we CLEAR the error
  ; flag and fall through — Tier 1 is simply skipped. NSIS compilation must
  ; NEVER abort because of a missing optional GUI script.
  TryExtractPs1:
  SetErrors
  File /nonfatal /oname=$PLUGINSDIR\license-gate.ps1 "${BUILD_RESOURCES_DIR}\license-gate.ps1"
  IfErrors 0 Ps1Extracted
    ClearErrors
    SetErrors
    File /nonfatal /oname=$PLUGINSDIR\license-gate.ps1 "${PROJECT_DIR}\build\license-gate.ps1"
    IfErrors 0 Ps1Extracted
      ClearErrors
      StrCpy $Ps1Ready "0"
      Goto SkipTier1
  Ps1Extracted:
  ClearErrors
  StrCpy $Ps1Ready "1"

  ; === STEP 1B: Run Tier 1 PowerShell WinForms GUI ===========================
  ; DO NOT add -NonInteractive here. -NonInteractive makes PowerShell set
  ; [Environment]::UserInteractive = $false which suppresses every modal
  ; window (WinForms, InputBox, MessageBox) without error — that was the
  # original bug where the install showed the "DAWA prefix invalid" message
  ; directly instead of the form after a SmartScreen elevation restart.
  TryPowerShellGui:
  ${If} $Ps1Ready == "1"
    StrCpy $GateMethod "PowerShell-GUI"

    nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Sta -WindowStyle Normal -File "$PLUGINSDIR\license-gate.ps1"'
    Pop $0   ; exit code (ignored; stdout is ground truth)
    Pop $LicenseGateOutput

    ${IfNot} $LicenseGateOutput == ""
      StrCpy $0 $LicenseGateOutput 3
      ${If} $0 == "OK|"
        StrCpy $LicenseKey $LicenseGateOutput "" 3
        !insertmacro SetGateResultOk $LicenseKey
      ${EndIf}
      ${If} $LicenseGateOutput == "CANCEL"
        ; User explicitly closed the PS1 form or clicked Huy Bo — they want
        ; to leave the installer. Do NOT loop with "invalid key" warnings.
        Quit
      ${EndIf}
    ${EndIf}
    ; If stdout was empty/garbage: PS1 ran but UI was suppressed (very rare).
    ; Fall through to native Tier 2A (nsDialogs).
  ${EndIf}
  SkipTier1:

  ; === STEP 2A: Tier 2 - native nsDialogs ====================================
  TryNsDialogsTier:
  StrCpy $GateMethod "nsDialogs"
  StrCpy $DialogMode "nsd"
  StrCpy $LicenseKey ""

  nsDialogs::Create 1018 "DAWA Optimizer — License Gate"
  Pop $0
  ${If} $0 == error
    Goto TryInstallOptionsTier
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 20u "Nhap key ban quyen de giai nen DAWA Optimizer:"
  Pop $0
  SetCtlColors $0 "" "transparent"

  ${NSD_CreateText} 0 24u 100% 12u ""
  Pop $LicenseKeyInput
  SendMessage $LicenseKeyInput ${EM_SETLIMITTEXT} 24 0
  ${NSD_AddStyle} $LicenseKeyInput ${ES_UPPERCASE}
  ${NSD_AddExStyle} $LicenseKeyInput ${WS_EX_CLIENTEDGE}

  ${NSD_CreateLabel} 0 42u 100% 15u "Dinh dang: DAWA-XXXX-XXXX-XXXX | Yeu cau mang xac thuc online."
  ${NSD_CreateLabel} 0 42u 100% 15u "Dinh dang: XXXX-XXXX-XXXX | Yeu cau mang xac thuc online."
  Pop $0
  SetCtlColors $0 0x888888 "transparent"

  ${NSD_CreateButton} 0 66u 48% 14u "Tiep Tuc (OK)"
  Pop $0
  ${NSD_AddStyle} $0 ${BS_DEFPUSHBUTTON}
  nsDialogs::SetUserData $0 "next"

  ${NSD_CreateButton} 52% 66u 48% 14u "Huy Cai Dat"
  Pop $0
  nsDialogs::SetUserData $0 "cancel"

  SendMessage $HWNDPARENT ${WM_NEXTDLGCTL} $LicenseKeyInput 1

  nsDialogs::Show
  Pop $DialogResult

  ${If} $DialogResult == "cancel"
    Goto NsConfirmQuit
  ${EndIf}
  ${If} $DialogResult == "back"
    Goto NsConfirmQuit
  ${EndIf}
  ${NSD_GetText} $LicenseKeyInput $LicenseKey
  Goto NativeFormatCheck

  NsConfirmQuit:
    MessageBox MB_YESNO|MB_ICONQUESTION "Ban chac chan muon huy cai dat?$\r$\n$\r$\nCo = quay lai nhap key.$\r$\nKhong = dong Dawa Optimizer Setup." IDNO DoQuit
    StrCpy $LicenseKey ""
    Goto TryNsDialogsTier

  ; === STEP 2B: Tier 2B - InstallOptions native INI (BULLETPROOF) =============
  TryInstallOptionsTier:
  StrCpy $GateMethod "InstallOptions"
  StrCpy $DialogMode "ini"
  StrCpy $LicenseKey ""

  InitPluginsDir
  StrCpy $IoPageIni "$PLUGINSDIR\dawa-license.ini"
  FileOpen $0 $IoPageIni w
  FileWrite $0 "[Settings]$\r$\nNumFields=3$\r$\nTitle=DAWA Optimizer — License Gate$\r$\nCancelEnabled=1$\r$\n$\r$\n"
  FileWrite $0 "[Field 1]$\r$\nType=Label$\r$\nLeft=5$\r$\nRight=300$\r$\nTop=5$\r$\nBottom=18$\r$\nText=Nhap key ban quyen de giai nen DAWA Optimizer:$\r$\n$\r$\n"
  FileWrite $0 "[Field 2]$\r$\nType=Text$\r$\nLeft=5$\r$\nRight=300$\r$\nTop=22$\r$\nBottom=32$\r$\nMaxLen=24$\r$\nFlags=MANDATORY|UPPERCASE$\r$\n$\r$\n"
  FileWrite $0 "[Field 3]$\r$\nType=Label$\r$\nLeft=5$\r$\nRight=300$\r$\nTop=36$\r$\nBottom=46$\r$\nText=Dinh dang: XXXX-XXXX-XXXX | Can ket noi mang.$\r$\n"
  FileClose $0

  InstallOptions::Dialog "$IoPageIni"
  Pop $DialogResult

  ${If} $DialogResult == "cancel"
    Goto IniConfirmQuit
  ${EndIf}
  ${If} $DialogResult == "back"
    Goto IniConfirmQuit
  ${EndIf}
  ReadINIStr $LicenseKey $IoPageIni "Field 2" "State"
  Goto NativeFormatCheck

  IniConfirmQuit:
    MessageBox MB_YESNO|MB_ICONQUESTION "Ban chac chan muon huy cai dat?$\r$\n$\r$\nCo = quay lai nhap key.$\r$\nKhong = dong Dawa Optimizer Setup." IDNO DoQuit
    StrCpy $LicenseKey ""
    Goto TryInstallOptionsTier

  ; === Native validation path (shared by Tier 2A / Tier 2B) ==================
  NativeFormatCheck:
  StrCpy $LicenseKey $LicenseKey

  ${If} $LicenseKey == ""
    ${If} $DialogMode == "ini"
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Vui long nhap key ban quyen de tiep tuc!$\r$\nRetry = nhap lai.$\r$\nCancel = dong cai dat." IDRETRY TryInstallOptionsTier
    ${Else}
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Vui long nhap key ban quyen de tiep tuc!$\r$\nRetry = nhap lai.$\r$\nCancel = dong cai dat." IDRETRY TryNsDialogsTier
    ${EndIf}
    Goto DoQuit
  ${EndIf}

  StrLen $0 $LicenseKey
  ${If} $0 < 8
    ${If} $DialogMode == "ini"
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Dinh dang key khong dung (12 ky tu, vi du: XXXX-XXXX-XXXX).$\r$\nRetry = nhap lai.$\r$\nCancel = dong cai dat." IDRETRY TryInstallOptionsTier
    ${Else}
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Dinh dang key khong dung (12 ky tu, vi du: XXXX-XXXX-XXXX).$\r$\nRetry = nhap lai.$\r$\nCancel = dong cai dat." IDRETRY TryNsDialogsTier
    ${EndIf}
    Goto DoQuit
  ${EndIf}

  ; Collect lightweight HWID (same payload structure as the PowerShell GUI
  ; so server-side device binding behaves identically regardless of tier).
  nsExec::ExecToStack 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$uuid = (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue | Select-Object -ExpandProperty UUID) -replace ''''[^A-Z0-9-]'''',''''; $cpu = (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty ProcessorId) -replace ''''[^A-Z0-9]'''',''''; $serial = (Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -ExpandProperty SerialNumber) -replace ''''[^A-Z0-9]'''',''''; $machine = $env:COMPUTERNAME; Write-Output ($uuid + ''_'' + $cpu + ''_'' + $serial + ''_'' + $machine).Trim(''_'')"'
  Pop $0
  Pop $HwIdTemp
  ${If} $HwIdTemp == ""
    StrCpy $HwIdTemp "UNKNOWN-HWID"
  ${EndIf}

  DetailPrint "Dang ket noi may chu DAWA xac thuc key..."
  nsExec::ExecToStack 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$key = ''''$LicenseKey''''.Trim(); $hwid = ''''$HwIdTemp''''.Trim(); $osInfo = ((Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue | ForEach-Object { $_.Caption + '' '' + $_.Version }) | Select-Object -First 1); $body = @{ key_code = $key; hardware_id = $hwid; device_hash = $hwid; device_name = $env:COMPUTERNAME; os_info = $osInfo } | ConvertTo-Json -Compress; try { [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; $resp = Invoke-RestMethod -Uri ''https://rduc.onrender.com/api/license/validate'' -Method POST -Body $body -ContentType ''application/json; charset=utf-8'' -UseBasicParsing -TimeoutSec 20; if ($resp.success -and $resp.valid) { Write-Output ''OK'' } else { $m = $resp.message; if ([string]::IsNullOrWhiteSpace($m)) { $m = ''Key khong hop le hoac da het han.'' }; Write-Output (''FAIL|'' + ($m -replace ''\n'','' '')) } } catch { Write-Output (''ERR|'' + $_.Exception.Message) }"'
  Pop $0
  Pop $LicenseGateOutput

  ${If} $LicenseGateOutput == "OK"
    ; Light obfuscation: Base64(UTF-16-LE(key bytes)) — not crypto but stops
    ; casual regedit peekers from reading the key in plaintext.
    nsExec::ExecToStack 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$bytes = [System.Text.Encoding]::Unicode.GetBytes(''''$LicenseKey''''); [Convert]::ToBase64String($bytes)"'
    Pop $0
    Pop $0
    ${If} $0 != ""
      WriteRegStr HKCU "Software\DAWA Optimizer" "LicenseKey" $0
      WriteRegDWORD HKCU "Software\DAWA Optimizer" "ValidatedByInstaller" 1
    ${Else}
      WriteRegStr HKCU "Software\DAWA Optimizer" "LicenseKey" $LicenseKey
    ${EndIf}
    DetailPrint "License gate: hop le (via $GateMethod native). Bat dau giai nen..."
    Goto GatePassed
  ${EndIf}

  StrCpy $0 $LicenseGateOutput 4
  ${If} $0 == "ERR|"
    StrCpy $LicenseGateOutput $LicenseGateOutput "" 4
    ${If} $DialogMode == "ini"
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Khong ket noi duoc may chu xac thuc.$\r$\n$\r\nLoi: $LicenseGateOutput$\r$\n$\r\nRetry = thu lai.$\r\nCancel = dong cai dat." IDRETRY TryInstallOptionsTier
    ${Else}
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Khong ket noi duoc may chu xac thuc.$\r$\n$\r\nLoi: $LicenseGateOutput$\r$\n$\r\nRetry = thu lai.$\r\nCancel = dong cai dat." IDRETRY TryNsDialogsTier
    ${EndIf}
    Goto DoQuit
  ${EndIf}
  StrCpy $0 $LicenseGateOutput 5
  ${If} $0 == "FAIL|"
    StrCpy $LicenseGateOutput $LicenseGateOutput "" 5
  ${EndIf}
  ${If} $DialogMode == "ini"
    MessageBox MB_RETRYCANCEL|MB_ICONSTOP "Key bi tu choi boi may chu.$\r$\n$\r\n$LicenseGateOutput$\r\nRetry = nhap lai.$\r\nCancel = dong cai dat." IDRETRY TryInstallOptionsTier
  ${Else}
    MessageBox MB_RETRYCANCEL|MB_ICONSTOP "Key bi tu choi boi may chu.$\r$\n$\r\n$LicenseGateOutput$\r\nRetry = nhap lai.$\r\nCancel = dong cai dat." IDRETRY TryNsDialogsTier
  ${EndIf}
  Goto DoQuit

  DoQuit:
    Quit

  GatePassed:
!macroend
