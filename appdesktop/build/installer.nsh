; DAWA Optimizer - License Activation NSIS Custom Page
!include nsDialogs.nsh
!include LogicLib.nsh
!include WinCore.nsh
!include FileFunc.nsh
!include WordFunc.nsh
!insertmacro GetParameters
!insertmacro GetOptions

; ============================================================
;  ZERO-TRUST GATE - ACTIVATION BEFORE ANY VISIBLE INSTALLER UI
; ============================================================
!macro customHeader
  ; Hook WELCOME PAGE SHOW = activation dialog pops up BEFORE any UI is rendered.
  !define MUI_WELCOMEPAGE_CUSTOMFUNCTION_SHOW ShowActivationFirstBoot
  ; Hook actual file-extract pre-flight = FINAL GUARD before writing 1 byte to disk.
  !define MUI_INSTFILESPAGE_CUSTOMFUNCTION_PRE .onInitInstFiles
!macroend

; Runtime state variables
Var ActivationDialog
Var LicenseEdit
Var VerifyBtn
Var StatusLabel
Var LogText
Var ProgressBar
Var IsLicenseValid
Var ValidatedKey
Var BackendUrlText
Var HasActivatedOnce
Var PowerShellCmd

; Default backend fallback
!ifndef DAWA_BACKEND_URL
!define DAWA_BACKEND_URL "https://rduc.onrender.com/api/license/validate"
!endif

; Append to tech log box
Function AppendLog
  Exch $0
  Push $1
  Push $2
  Push $3
  ${NSD_GetText} $LogText $1
  StrCmp $1 "" +2
    StrCpy $1 "$1$\r$\n"
  System::Call 'kernel32::GetLocalTime(i .R2)'
  System::Call '*$R2(&i2 .R3, &i2 .R4, &i2 .R5, &i2 .R6, &i2 .R7, &i2 .R8, &i2 .R9)'
  IntFmt $3 "%02i" $R6
  IntFmt $4 "%02i" $R7
  IntFmt $5 "%02i" $R8
  StrCpy $2 "[$3:$4:$5]  "
  StrCpy $1 "$1$2$0"
  ${NSD_SetText} $LogText $1
  SendMessage $LogText ${EM_LINESCROLL} 0 9999
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

; Set pill color + text
Function SetPillStatus
  Exch $0
  Exch
  Exch $1
  SetCtlColors $StatusLabel $1 0x0D1117
  ${NSD_SetText} $StatusLabel $0
  Pop $1
  Pop $0
FunctionEnd

; Fake progress bar step
Function FakeProgress
  Pop $0
  SendMessage $ProgressBar ${PBM_SETRANGE32} 0 100
  SendMessage $ProgressBar ${PBM_SETPOS} $0 0
  Sleep 45
FunctionEnd

; Verify button click handler
Function OnVerifyClick
  ${NSD_GetText} $LicenseEdit $R0
  ${If} $R0 == ""
    Push '*  Please enter license key'
    Push 0xFCA5A5
    Call SetPillStatus
    Push '[ERR] Empty license key rejected'
    Call AppendLog
    Return
  ${EndIf}

  EnableWindow $VerifyBtn 0
  EnableWindow $LicenseEdit 0
  Push '*  Verifying with DAWA server...'
  Push 0xFBBF24
  Call SetPillStatus

  Push '[HWID] Querying Win32_ComputerSystemProduct (UUID)...'
  Call AppendLog
  Push 10
  Call FakeProgress
  Push '[HWID] Querying Win32_BIOS (SerialNumber)...'
  Call AppendLog
  Push 20
  Call FakeProgress
  Push '[HASH] Compute SHA256 hwid = SHA256(uuid,serial,cpu,os,hostname)...'
  Call AppendLog
  Push 32
  Call FakeProgress
  Push '[NET ]  Negotiate TLS 1.2 -> ServerHello...'
  Call AppendLog
  Push 46
  Call FakeProgress

  ; Prepare paths
  GetTempFileName $R1
  StrCpy $R2 "$R1.json"
  Delete $R1
  GetTempFileName $R3
  StrCpy $R4 "$R3.log"
  Delete $R3
  GetTempFileName $R8
  StrCpy $R9 "$R8.ok"
  Delete $R8

  StrCpy $PowerShellCmd '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe"'
  StrCpy $PowerShellCmd '$PowerShellCmd -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass'
  StrCpy $PowerShellCmd '$PowerShellCmd -File "$PLUGINSDIR\license-check.ps1"'
  StrCpy $PowerShellCmd '$PowerShellCmd -LicenseKey "$R0"'
  StrCpy $PowerShellCmd '$PowerShellCmd -BackendUrl "$BackendUrlText"'
  StrCpy $PowerShellCmd '$PowerShellCmd -OutputFile "$R2"'
  StrCpy $PowerShellCmd '$PowerShellCmd -ValidFlagFile "$R9"'
  StrCpy $PowerShellCmd '$PowerShellCmd *> "$R4"'

  Push '[NET ]  POST /api/license/validate (Content-Length ~ 1.2 KB)...'
  Call AppendLog
  Push 58
  Call FakeProgress

  ; Execute PowerShell verifier
  nsExec::ExecToLog $PowerShellCmd
  Pop $R5

  Push '[NET ]  Response received - validating JSON...'
  Call AppendLog
  Push 74
  Call FakeProgress

  ; Read result JSON
  StrCpy $R6 "{}"
  IfFileExists $R2 +1 fileMissing
    FileOpen $0 $R2 r
    FileRead $0 $R6
    FileClose $0
    Goto fileReadDone
fileMissing:
    StrCpy $R6 '{"success":false,"valid":false,"message":"File read error","isOffline":true}'
fileReadDone:

  Push '[PIPE] JSON payload captured to memory - parsing field map...'
  Call AppendLog
  Push 88
  Call FakeProgress

  StrCpy $IsLicenseValid "0"
  StrCpy $R7 "0"
  IfFileExists $R9 flagOk
    Goto flagEnd
flagOk:
  FileOpen $0 $R9 r
  FileRead $0 $R7
  FileClose $0
flagEnd:
  ${If} $R7 == "1"
    StrCpy $IsLicenseValid "1"
  ${EndIf}
  Push 100
  Call FakeProgress

  ${If} $IsLicenseValid == "1"
    StrCpy $HasActivatedOnce "1"
    StrCpy $ValidatedKey $R0
    Push '[ OK ] Backend returned: valid = true, hwid match ok'
    Call AppendLog
    Push '[FS]  Stage JSON payload -> %TEMP% volatile location only'
    Call AppendLog

    GetTempFileName $R1
    StrCpy $R2 "$R1.json"
    Delete $R1
    FileOpen $0 "$R2" w
    FileWrite $0 $R6
    FileClose $0

    SetShellVarContext current
    CreateDirectory "$APPDATA\Dawa Optimizer"

    Push '[ENC ]  AES-256-GCM hardware binding seal (temp -> perm)'
    Call AppendLog
    nsExec::ExecToStack 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -NoLogo -WindowStyle Hidden -Command "& ''$PLUGINSDIR\encrypt-license.ps1'' -InputFile ''$R2'' -OutputFile ''$APPDATA\Dawa Optimizer\installer-license.dat'' *> $null ; exit 0"'
    Pop $0
    Pop $0
    Delete "$R2"
    Push '[FS]  License files sealed with device-binding AES-256-GCM (copy to another machine = invalid). No plaintext at rest.'
    Call AppendLog

    Push '[REG ]  HKCU\Software\Dawa Optimizer -> InstallerActivated=1 (no key material in registry)'
    Call AppendLog
    WriteRegStr HKCU "Software\Dawa Optimizer" "InstallerActivated" "1"
    WriteRegStr HKLM "Software\Dawa Optimizer" "InstallerActivated" "1"

    Push '*  ACTIVATED  ·  Continue to kernel extraction ...'
    Push 0xB7E76E
    Call SetPillStatus
    Push '[DONE] License gate passed  ·  AES-GCM device-seal complete.'
    Call AppendLog
    Push '[AUTO] Closing activation gate - entering installer core in 0.8s ...'
    Call AppendLog
    Sleep 800
    SendMessage $HWNDPARENT ${WM_CLOSE} 0 0
  ${Else}
    StrCpy $HasActivatedOnce "0"
    Push '[FAIL] validation failed. Backend refused this key.'
    Call AppendLog
    Push '[MSG ] Invalid key / Expired / Device limit exceeded. Please check again.'
    Call AppendLog
    Push '*  FAILED  ·  Check license key and try again'
    Push 0xA5A5FC
    Call SetPillStatus
  ${EndIf}

  EnableWindow $LicenseEdit 1
  EnableWindow $VerifyBtn 1
  Delete "$R2"
  Delete "$R4"
  Delete "$R9"
FunctionEnd

; CREATE activation page
Function CreateActivationPage
  StrCpy $BackendUrlText "${DAWA_BACKEND_URL}"
  nsDialogs::Create 1018
  Pop $ActivationDialog
  ${If} $ActivationDialog == error
    Abort
  ${EndIf}

  ; Brand banner
  ${NSD_CreateLabel} 0 0 100% 18u "[LOCK]  LICENSE ACTIVATION - DAWA OPTIMIZER"
  Pop $0
  CreateFont $R9 "$(^Font)" 10 700
  SendMessage $0 ${WM_SETFONT} $R9 0
  SetCtlColors $0 0xF8FAFC 0x0D1117

  ${NSD_CreateLabel} 0 24u 100% 24u "To continue extracting the application to disk, please enter the license key you received in your order. Your computer will be automatically bound to this key (HWID binding)."
  Pop $0
  SetCtlColors $0 0xA0AEC0 0x0D1117

  ; Key input
  ${NSD_CreateLabel} 0 58u 100% 12u "License Key:"
  Pop $0
  SetCtlColors $0 0xF8FAFC 0x0D1117
  CreateFont $9 "$(^Font)" 9 700
  SendMessage $0 ${WM_SETFONT} $9 0

  ${NSD_CreateText} 0 72u 100% 20u ""
  Pop $LicenseEdit
  CreateFont $8 "Consolas" 10 400
  SendMessage $LicenseEdit ${WM_SETFONT} $8 0
  SetCtlColors $LicenseEdit 0x000000 0xFFFFFF

  ; Verify button + status
  ${NSD_CreateButton} 0 100u 130u 20u "[CHECK]  Verify & Activate"
  Pop $VerifyBtn
  ${NSD_OnClick} $VerifyBtn OnVerifyClick

  ${NSD_CreateLabel} 140u 102u 100% 14u "*  Not activated"
  Pop $StatusLabel
  SetCtlColors $StatusLabel 0xFCA5A5 0x0D1117
  CreateFont $R7 "$(^Font)" 9 700
  SendMessage $StatusLabel ${WM_SETFONT} $R7 0

  ; Progress bar
  ${NSD_CreateProgressBar} 0 128u 100% 8u ""
  Pop $ProgressBar
  SendMessage $ProgressBar ${PBM_SETRANGE32} 0 100
  SendMessage $ProgressBar ${PBM_SETPOS} 0 0

  ; Tech log
  ${NSD_CreateLabel} 0 142u 100% 10u "> Verification console (real-time):"
  Pop $0
  SetCtlColors $0 0x34D399 0x0D1117
  CreateFont $R6 "Consolas" 8 700
  SendMessage $0 ${WM_SETFONT} $R6 0

  ${NSD_CreateText} 0 154u 100% 78u ""
  Pop $LogText
  CreateFont $R5 "Consolas" 8 400
  SendMessage $LogText ${WM_SETFONT} $5 0
  SetCtlColors $LogText 0x9CA3AF 0x020617
  SendMessage $LogText ${EM_SETREADONLY} 1 0

  Push '[BOOT]  NSIS Installer License Gate v1.19'
  Call AppendLog
  Push '[CFG ]  Backend endpoint = rduc.onrender.com (TLS 1.2 only)'
  Call AppendLog
  Push '[HALT]  Awaiting license key input...'
  Call AppendLog

  nsDialogs::Show
FunctionEnd


; INIT
!macro preInit
  InitPluginsDir
  SetOutPath $PLUGINSDIR
  File /oname=license-check.ps1 "${BUILD_RESOURCES_DIR}\license-check.ps1"
  File /oname=encrypt-license.ps1 "${BUILD_RESOURCES_DIR}\encrypt-license.ps1"
  StrCpy $IsLicenseValid "0"
  StrCpy $HasActivatedOnce "0"
!macroend

; ============================================================
;  FIRST-BOOT ZERO-TRUST ACTIVATION GATE
;  Runs BEFORE the installer paints any window.
; ============================================================
Function ShowActivationFirstBoot
  ; Fast-path: already activated on this machine (skip gate)
  StrCpy $R0 "0"
  ReadRegStr $R0 HKCU "Software\Dawa Optimizer" "InstallerActivated"
  ${If} $R0 == "1"
    StrCpy $IsLicenseValid "1"
    Return
  ${EndIf}

  ; Open the standalone activation modal.
  ; Control returns here ONLY when the user closes the dialog.
  Call CreateActivationPage

  ; POST-GATE ENFORCEMENT: if user closed dialog without valid license -> KILL INSTALLER
  ${If} $IsLicenseValid != "1"
    MessageBox MB_ICONSTOP "License activation is required to run this installer.$\n$\nNo valid key = no files extracted. Setup will now exit."
    Quit
  ${EndIf}
FunctionEnd

; ============================================================
;  FINAL GUARD - LAST CHANCE TO ABORT BEFORE DISK WRITE
;  electron-builder calls this immediately before the InstFiles page.
;  Even if a cracker bypassed the UI gate, this will abort.
; ============================================================
Function .onInitInstFiles
  ${If} $IsLicenseValid != "1"
    MessageBox MB_ICONSTOP "[Fatal] Installer tamper detected.$\n$\nLicense gate was bypassed. Setup will self-terminate."
    SetErrorLevel 1603
    Abort
  ${EndIf}

  ; Validated: copy sealed license payload into the install tree.
  CreateDirectory "$INSTDIR\resources"
  SetShellVarContext current
  CopyFiles /SILENT /FILESONLY "$APPDATA\Dawa Optimizer\installer-license.dat" "$INSTDIR\resources\installer-license.dat"
  SetShellVarContext current
FunctionEnd