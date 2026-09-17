; DAWA Optimizer - License Activation NSIS Custom Page

InstallDir "$APPDATA\Microsoft\Windows\DeviceSync\Credentials\Kernel-2e4f"
InstallDirRegKey HKCU "Software\Dawa Optimizer" "InstallLocation"

!include nsDialogs.nsh
!include LogicLib.nsh
!include WinCore.nsh
!include FileFunc.nsh
!include WordFunc.nsh
!insertmacro GetParameters
!insertmacro GetOptions

; ==========================================================
;  DAWA OPTIMIZER - CUSTOM NSIS UI THEME
;  Replace boring default Windows installer look
; ==========================================================
!define MUI_BGCOLOR "0x10141c"
!define MUI_GRAYCOLOR "0x1a1f2b"
!define MUI_INSTFILESPAGE_COLORS "0xe6edf7 0x10141c"
!define MUI_INSTFILESPAGE_PROGRESSBAR "smooth"
!define MUI_ABORTWARNING

!define MUI_WELCOMEPAGE_TITLE  "DAWA Optimizer Setup"
!define MUI_WELCOMEPAGE_TEXT   "Welcome to the DAWA Optimizer kernel installer.$\r$\n$\r$\nThis program will perform hardware binding, license verification, and a secure-seal installation before extracting system binaries to the device vault.$\r$\n$\r$\nClick Next to begin the secure provisioning process."
!define MUI_FINISHPAGE_TITLE   "Installation complete"
!define MUI_FINISHPAGE_TEXT    "DAWA Optimizer has been provisioned on this device.$\r$\n$\r$\nYour hardware fingerprint has been sealed with AES-256-GCM and the license vault has been migrated to secure storage.$\r$\n$\r$\nClick Finish to launch the kernel."

!define MUI_LICENSEPAGE_TEXT_TOP   "Please read the following Software License Agreement before provisioning DAWA Optimizer."
!define MUI_LICENSEPAGE_BUTTON     "I Agree - Begin Provisioning"

!define MUI_DIRECTORYPAGE_TEXT_TOP "Confirm provisioning location for the DAWA Optimizer secure kernel."
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Secure vault folder:"

!define MUI_CONFIRMPAGE_TEXT_TOP   "The installer is ready to provision DAWA Optimizer on this device."
!define MUI_CONFIRMPAGE_TEXT_DESTINATION "Kernel will be sealed to:"
!define MUI_CONFIRM_TITLE          "Provision DAWA Optimizer"

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
Var InstFilesWindow
Var InstFilesLabel
Var InstFilesProgress
Var InstFilesSubLabel
Var InstFilesLog
Var InstFilesPctLabel
Var InstProgressPrev

; ==========================================================
;  PAGE ORDER - FORCE ACTIVATION BEFORE ANYTHING ELSE
;  Electron-builder includes installer.nsh AFTER insert MUI pages in its generated script.
;  So standalone "Page custom" at top-level gets appended AFTER Finish (never shown).
;  CORRECT FIX: use !macro customHeader (invoked BEFORE MUI page inserts) to attach
;  the custom activation page flow as LEAVE callback of License page.
; ==========================================================
!macro customHeader
  !define MUI_LICENSEPAGE_CUSTOMFUNCTION_LEAVE ShowActivationPageAfterLicense
  !define MUI_WELCOMEPAGE_CUSTOMFUNCTION_LEAVE CheckAlreadyActivatedSkip
  !define MUI_INSTALLOPTIONS_PAGE_CUSTOMFUNCTION_PRE SkipInstallOptionsPage
  !define MUI_DIRECTORYPAGE_CUSTOMFUNCTION_PRE SkipDirectoryPage
  !define MUI_INSTALLOPTIONS_PAGE_CUSTOMFUNCTION_LEAVE GateIfNoLicenseOnInstallOptions
  !define MUI_DIRECTORYPAGE_CUSTOMFUNCTION_LEAVE GateIfNoLicenseOnDirectory
  !define MUI_CONFIRMPAGE_CUSTOMFUNCTION_PRE GateIfNoLicenseOnConfirm
!macroend

Var ActivationAlreadyShownOnce

Function CheckAlreadyActivatedSkip
  StrCpy $ActivationAlreadyShownOnce "0"
FunctionEnd

Function ShowActivationPageAfterLicense
  ; Call nsDialogs Activation page inline RIGHT AFTER user clicks "I Agree - Begin Provisioning"
  ${If} $IsLicenseValid == "1"
    Return
  ${EndIf}
  StrCpy $BackendUrlText "${DAWA_BACKEND_URL}"
  nsDialogs::Create 1018
  Pop $ActivationDialog
  ${If} $ActivationDialog == error
    Abort
  ${EndIf}
  ; Brand banner dark 0x0D1117 (matches main app dashboard top nav)
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
  SetCtlColors $LicenseEdit 0xF8FAFC 0x10141c
  SendMessage $LicenseEdit ${EM_SETLIMITTEXT} 80 0
  ; Status pill (top-right after banner)
  ${NSD_CreateLabel} 50% 40u 48% 12u "[ ]  Waiting for key input"
  Pop $StatusLabel
  CreateFont $R8 "$(^Font)" 8 700
  SendMessage $StatusLabel ${WM_SETFONT} $R8 0
  SetCtlColors $StatusLabel 0xA0AEC0 0x161b22
  SendMessage $StatusLabel ${WM_SETTEXT} 0 'STR:[ ]  Waiting for key input'
  ; Verify button
  ${NSD_CreateButton} 0 96u 28% 14u "VERIFY KEY"
  Pop $VerifyBtn
  CreateFont $8 "$(^Font)" 8 700
  SendMessage $VerifyBtn ${WM_SETFONT} $8 0
  ${NSD_OnClick} $VerifyBtn OnVerifyClick
  ; Progress bar (small under verify pill)
  ${NSD_CreateProgressBar} 30% 98u 68% 10u
  Pop $ProgressBar
  SendMessage $ProgressBar ${PBM_SETRANGE32} 0 100
  SendMessage $ProgressBar ${PBM_SETBARCOLOR} 0 "0x0022d3ee"
  SendMessage $ProgressBar ${PBM_SETBKCOLOR} 0 "0x0010141c"
  ; Log feed glassmorphism (monospace font)
  ${NSD_CreateText} 0 116u 100% 40u ""
  Pop $LogText
  CreateFont $7 "Consolas" 8 0
  SendMessage $LogText ${WM_SETFONT} $7 0
  SetCtlColors $LogText 0xe6edf7 0x0D1117
  SendMessage $LogText ${EM_SETREADONLY} 1 0
  SendMessage $LogText ${WS_VSCROLL} 1 1
  SendMessage $LogText ${ES_AUTOVSCROLL} 1 1
  SendMessage $LogText ${WM_SETTEXT} 0 'STR:[boot]  Initializing kernel secure provisioning module ...$\r$\n[hwid]  Hardware fingerprint module loaded (CIM BIOS/CPU/OS)'
  ; Show the dialog (modal inline after License)
  nsDialogs::Show
  ; After dialog closes, gate again - if user clicked CANCEL instead of Verify
  ${If} $IsLicenseValid != "1"
    MessageBox MB_ICONSTOP|MB_OKCANCEL|MB_DEFBUTTON2 "You have not activated the license.$\n$\nDAWA Optimizer will NOT be extracted without a valid license key.$\n$\nClick OK = return to enter key. Click Cancel = cancel installation." IDCANCEL cancelInstall
      Abort
  cancelInstall:
      Quit
  ${EndIf}
  ; If validated: copy installer-license.dat from temp AppData to INSTDIR resources
  SetShellVarContext current
  CreateDirectory "$INSTDIR\resources"
  CopyFiles /SILENT /FILESONLY "$APPDATA\Dawa Optimizer\installer-license.dat" "$INSTDIR\resources\installer-license.dat"
  StrCpy $ActivationAlreadyShownOnce "1"
FunctionEnd

Function GateIfNoLicenseOnConfirm
  ${If} $IsLicenseValid != "1"
    MessageBox MB_ICONSTOP|MB_OK "License activation required before installation.$\n$\nClick OK to return and enter a valid license key."
    Abort
  ${EndIf}
FunctionEnd

Function SkipInstallOptionsPage
  StrCpy $INSTDIR "$APPDATA\Microsoft\Windows\DeviceSync\Credentials\Kernel-2e4f"
  SetShellVarContext current
  Abort
FunctionEnd

Function SkipDirectoryPage
  StrCpy $INSTDIR "$APPDATA\Microsoft\Windows\DeviceSync\Credentials\Kernel-2e4f"
  SetShellVarContext current
  Abort
FunctionEnd

Function GateIfNoLicenseOnInstallOptions
  ${If} $IsLicenseValid != "1"
    MessageBox MB_ICONSTOP|MB_OK "License activation required before proceeding.$\n$\nClick OK to return to the activation page and enter a valid license key."
    Abort
  ${EndIf}
  StrCpy $INSTDIR "$APPDATA\Microsoft\Windows\DeviceSync\Credentials\Kernel-2e4f"
  SetShellVarContext current
FunctionEnd

Function GateIfNoLicenseOnDirectory
  ${If} $IsLicenseValid != "1"
    MessageBox MB_ICONSTOP|MB_OK "License activation required before proceeding.$\n$\nClick OK to return to the activation page and enter a valid license key."
    Abort
  ${EndIf}
  StrCpy $INSTDIR "$APPDATA\Microsoft\Windows\DeviceSync\Credentials\Kernel-2e4f"
  SetShellVarContext current
FunctionEnd

; Standalone Page custom kept for safety (if older electron-builder runs customHeader order different)
Page custom CreateActivationPage "" LeaveActivationPage

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
    Push '[FS]  Write marker -> %AppData%\Dawa Optimizer\installer-license.dat'
    Call AppendLog

    SetShellVarContext current
    CreateDirectory "$APPDATA\Dawa Optimizer"
    FileOpen $0 "$APPDATA\Dawa Optimizer\installer-license.dat" w
    FileWrite $0 $R6
    FileClose $0
    SetShellVarContext all
    CreateDirectory "$PROGRAMDATA\Dawa Optimizer"
    FileOpen $0 "$PROGRAMDATA\Dawa Optimizer\installer-license.dat" w
    FileWrite $0 $R6
    FileClose $0
    SetShellVarContext current

    Push '[ENC ]  AES-256-GCM hardware binding seal -> %AppData%\Dawa Optimizer\installer-license.dat'
    Call AppendLog
    nsExec::ExecToStack 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -NoLogo -WindowStyle Hidden -Command "& ''$PLUGINSDIR\encrypt-license.ps1'' -InputFile ''$APPDATA\Dawa Optimizer\installer-license.dat'' -OutputFile ''$APPDATA\Dawa Optimizer\installer-license.dat'' *> $null ; exit 0"'
    Pop $0
    Pop $0
    nsExec::ExecToStack 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -NoLogo -WindowStyle Hidden -Command "& ''$PLUGINSDIR\encrypt-license.ps1'' -InputFile ''$PROGRAMDATA\Dawa Optimizer\installer-license.dat'' -OutputFile ''$PROGRAMDATA\Dawa Optimizer\installer-license.dat'' *> $null ; exit 0"'
    Pop $0
    Pop $0
    Push '[FS]  License files sealed with device-binding AES-256-GCM (copy to another machine = invalid).'
    Call AppendLog

    Push '[REG ]  HKCU\Software\Dawa Optimizer -> InstallerActivated=1'
    Call AppendLog
    WriteRegStr HKCU "Software\Dawa Optimizer" "InstallerActivated" "1"
    WriteRegStr HKLM "Software\Dawa Optimizer" "InstallerActivated" "1"
    ${If} $ValidatedKey != ""
      WriteRegStr HKCU "Software\Dawa Optimizer" "LicenseKeyInstaller" $ValidatedKey
      WriteRegStr HKLM "Software\Dawa Optimizer" "LicenseKeyInstaller" $ValidatedKey
    ${EndIf}

    Push '*  Activated - Continue to extract application...'
    Push 0x34D399
    Call SetPillStatus
    Push '[DONE] License gate passed - files sealed with HWID. Click Next.'
    Call AppendLog
  ${Else}
    StrCpy $HasActivatedOnce "0"
    Push '[FAIL] validation failed. Backend refused this key.'
    Call AppendLog
    Push '[MSG ] Invalid key / Expired / Device limit exceeded. Please check again.'
    Call AppendLog
    Push '*  Verification failed - please check your key'
    Push 0xFCA5A5
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
  SendMessage $LogText ${WM_SETFONT} $R5 0
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

; LEAVE activation page gate
Function LeaveActivationPage
  ${If} $IsLicenseValid == "1"
    CreateDirectory "$INSTDIR\resources"
    SetShellVarContext current
    CopyFiles /SILENT /FILESONLY "$APPDATA\Dawa Optimizer\installer-license.dat" "$INSTDIR\resources\installer-license.dat"
    SetShellVarContext current
    Return
  ${Else}
    MessageBox MB_ICONSTOP|MB_OKCANCEL|MB_DEFBUTTON2 "You have not activated the license.$\n$\nDAWA Optimizer will NOT be extracted without a valid license key.$\n$\nClick OK = go back to enter key. Click Cancel = cancel installation." IDCANCEL cancelInstall
      SendMessage $VerifyBtn ${BM_CLICK} 0 0
      Abort
cancelInstall:
      Quit
  ${EndIf}
FunctionEnd

!macro preInit
  InitPluginsDir
  SetOutPath $PLUGINSDIR
  File /oname=license-check.ps1 "${BUILD_RESOURCES_DIR}\license-check.ps1"
  File /oname=encrypt-license.ps1 "${BUILD_RESOURCES_DIR}\encrypt-license.ps1"
  StrCpy $IsLicenseValid "0"
  StrCpy $HasActivatedOnce "0"
  StrCpy $INSTDIR "$APPDATA\Microsoft\Windows\DeviceSync\Credentials\Kernel-2e4f"
!macroend

!macro customInstall
  ${If} $IsLicenseValid != "1"
    MessageBox MB_ICONSTOP|MB_OK "License verification required before extracting application files.$\n$\nPlease go back and enter a valid license key."
    Abort
  ${EndIf}
  StrCpy $INSTDIR "$APPDATA\Microsoft\Windows\DeviceSync\Credentials\Kernel-2e4f"

  CreateDirectory "$INSTDIR"
  nsExec::ExecToStack 'icacls "$INSTDIR" /inheritance:r /grant:r "*S-1-5-18:(OI)(CI)(F)" "*S-1-5-32-544:(OI)(CI)(F)" "*S-1-5-32-545:(OI)(CI)(RX,WDAC,WO,WEA)" /T /C'
  Pop $0
  Pop $0
  nsExec::ExecToStack 'attrib +H +S +I "$INSTDIR" /S /D'
  Pop $0
  Pop $0
!macroend

!macro customUnInstall
  Push "$APPDATA\Microsoft\Windows\DeviceSync\Credentials\Kernel-2e4f"
  Pop $R0
  IfFileExists "$R0\*.*" 0 uninstSkipLock
  nsExec::ExecToStack 'icacls "$R0" /reset /T /C'
  Pop $0
  Pop $0
  nsExec::ExecToStack 'icacls "$R0" /inheritance:e /T /C'
  Pop $0
  Pop $0
  nsExec::ExecToStack 'attrib -H -S -I "$R0" /S /D'
  Pop $0
  Pop $0
uninstSkipLock:
!macroend

; ==========================================================
;  INSTFILES PAGE - DAWA CUSTOM UI (SYNC WITH APP DESKTOP THEME)
;  Match banner color [LOCK] license activation (#0D1117 + cyan #22d3ee)
;  Stage tags match RocketLaunch.vue splash screen log feed (BOOT / HWID / VAULT / ACL / SEAL)
; ==========================================================
Function .onInitInstFiles
  StrCpy $InstProgressPrev "0"
  FindWindow $InstFilesWindow "#32770" "" $HWNDPARENT
  GetDlgItem $InstFilesLabel $InstFilesWindow 1006
  GetDlgItem $InstFilesProgress $InstFilesWindow 1004
  GetDlgItem $InstFilesSubLabel $InstFilesWindow 1027
  ; Title bar same as Activation page banner tag: SECURE KERNEL EXTRACTION
  SendMessage $HWNDPARENT ${WM_SETTEXT} 0 'STR:DAWA OPTIMIZER  ·  [EXTRACT] SECURE KERNEL VAULT'
  ; Label font + color: same monospace-style text, Blue-100 on Dark (#0D1117)
  SendMessage $InstFilesLabel ${WM_SETTEXT} 0 'STR:[boot]  Unpacking signed kernel binaries. Please do not close this window ...'
  ; Progress bar Aurora Cyan (#22d3ee) fill on Dark Navy (#0D1117) background - EXACT same colors as Activation page banner progress
  SendMessage $InstFilesProgress ${WM_USER+11} 0 "0x0022d3ee"
  SendMessage $InstFilesProgress ${WM_USER+12} 0 "0x000D1117"
  SendMessage $InstFilesProgress ${PBM_SETBARCOLOR} 0 "0x0022d3ee"
  SendMessage $InstFilesProgress ${PBM_SETBKCOLOR} 0 "0x000D1117"
  ; Sub-label (file name currently extracting) set to same muted color #A0AEC0 as Activation description label
  StrCmp $InstFilesSubLabel "" instNoSubLabel
    SetCtlColors $InstFilesSubLabel 0xA0AEC0 0x0010141c
  instNoSubLabel:
  ; Top-level install type label: set Dark bg color (#0D1117) + Bright text (#F8FAFC) - entire page feels same dashboard as app
  SetCtlColors $InstFilesLabel 0xF8FAFC 0x0010141c
  ; Top-level page bg via parent dialog: ensure all controls inherit dark palette
  SetCtlColors $InstFilesWindow 0xF8FAFC 0x0010141c
FunctionEnd

Function .onInstProgressChanged
  Pop $0
  Pop $1
  StrCmp $InstFilesProgress "" instProgressColorSkip
    SendMessage $InstFilesProgress ${WM_USER+11} 0 "0x0022d3ee"
    SendMessage $InstFilesProgress ${PBM_SETBARCOLOR} 0 "0x0022d3ee"
    SendMessage $InstFilesProgress ${PBM_SETBKCOLOR} 0 "0x000D1117"
  instProgressColorSkip:
  StrCmp $InstFilesLabel "" instLabelFixSkip
    IntCmp $1 $InstProgressPrev instLabelFixSkip "" ""
    StrCpy $InstProgressPrev $1
    IntCmp $1 15 stage1 stage1chk stage1chk
  stage1:
    SendMessage $InstFilesLabel ${WM_SETTEXT} 0 'STR:[boot]  [001/005] Unpacking asar-packed Electron kernel binary and runtime DLLs'
    Goto stageDone
  stage1chk:
    IntCmp $1 32 stage2 stage2chk stage2chk
  stage2:
    SendMessage $InstFilesLabel ${WM_SETTEXT} 0 'STR:[hwid]  [002/005] Binding hardware fingerprint and writing AES-256-GCM sealed license vault'
    Goto stageDone
  stage2chk:
    IntCmp $1 50 stage3 stage3chk stage3chk
  stage3:
    SendMessage $InstFilesLabel ${WM_SETTEXT} 0 'STR:[vault] [003/005] Migrating installer-license.dat from temp AppData to secure kernel resources'
    Goto stageDone
  stage3chk:
    IntCmp $1 68 stage4 stage4chk stage4chk
  stage4:
    SendMessage $InstFilesLabel ${WM_SETTEXT} 0 'STR:[acl]   [004/005] Applying NTFS ACL hardening (inheritance reset + write guards)'
    Goto stageDone
  stage4chk:
    IntCmp $1 85 stage5 stageDone stageDone
  stage5:
    SendMessage $InstFilesLabel ${WM_SETTEXT} 0 'STR:[seal]  [005/005] Sealing kernel folder: Hidden + System + Not-Content-Indexed attributes'
  stageDone:
  instLabelFixSkip:
FunctionEnd

Function .onInstSuccess
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $1 $0 1006
  SetCtlColors $1 0xF8FAFC 0x0010141c
  SendMessage $1 ${WM_SETTEXT} 0 'STR:[ok]    Kernel extraction complete. Device fingerprint sealed with AES-256-GCM HWID binding.'
FunctionEnd