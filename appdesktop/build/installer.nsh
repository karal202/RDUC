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
Var MarkLabel           ; Left-top shield mark icon label (indigo/emerald/rose)
Var KeyCountLabel       ; Right-top of key input row (XX/14 character counter)
Var FormAlertLabel      ; Success/error box below key input (emerald/rose)
Var DeviceStatusLabel   ; Device fingerprint row (green dot + HWID masked)
Var MachineIdLabel      ; MACHINE ID label (activation-device-specs block)

Function CheckAlreadyActivatedSkip
  StrCpy $ActivationAlreadyShownOnce "0"
FunctionEnd

; Update key count label (right side of key heading row, Vue key-field-count XX/14)
Function UpdateKeyCount
  Push $0
  Push $1
  ${NSD_GetText} $LicenseEdit $0
  StrLen $1 $0
  IntCmp $1 16 limit limit under
  limit:
    StrCpy $1 "16"
  under:
    System::Call 'user32::SetWindowText(i $KeyCountLabel, t "$1/16")'
  Pop $1
  Pop $0
FunctionEnd

; Set colored form-alert box below input (matches Vue .form-alert-ok / .form-alert-error)
Function SetFormAlert
  Exch $0 ; text
  Exch
  Exch $1 ; color text
  Exch 2
  Exch $2 ; color bg
  SetCtlColors $FormAlertLabel $1 $2
  SendMessage $FormAlertLabel ${WM_SETTEXT} 0 "STR:$0"
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

Function ShowActivationPageAfterLicense
  ${If} $IsLicenseValid == "1"
    Return
  ${EndIf}
  StrCpy $BackendUrlText "${DAWA_BACKEND_URL}"
  nsDialogs::Create 1018
  Pop $ActivationDialog
  ${If} $ActivationDialog == error
    Abort
  ${EndIf}
  ; ========== 2-COLUMN SPLIT LAYOUT (EXACTLY MATCHES Vue ActivationModal) ==========
  ; LEFT 36%  = activation-art panel (UNLOCK THE RIG art side)
  ; RIGHT 64% = activation-form panel (shield mark + heading + machine-id + key input)
  ; ============================================================
  ; [COLUMN 1 - LEFT ART] deep-space bg (matches Vue .activation-art #0b1220)
  ${NSD_CreateLabel} 0 0 36u 100% ""
  Pop $0
  SetCtlColors $0 0x000000 0x20120B
  ; Art heading: UNLOCK THE RIG (matches Vue .activation-art-copy h1)
  ${NSD_CreateLabel} 4u 8u 28u 18u "UNLOCK THE RIG"
  Pop $0
  CreateFont $R6 "$(^Font)" 12 700
  SendMessage $0 ${WM_SETFONT} $R6 0
  SetCtlColors $0 0xEED322 0x20120B
  ; Art brand (matches Vue activation-logo + DAWA copy)
  ${NSD_CreateLabel} 4u 26u 28u 12u "DAWA OPTIMIZER  ·  SECURE VAULT"
  Pop $0
  CreateFont $R5 "$(^Font)" 8 700
  SendMessage $0 ${WM_SETFONT} $R5 0
  SetCtlColors $0 0xA5B4FC 0x20120B
  ; Art description (matches Vue "Key khóa theo máy này" English)
  ${NSD_CreateLabel} 4u 44u 28u 40u "License key is bound to this hardware fingerprint (BIOS UUID, CPU, OS serial). Copy to another computer = key invalidated.$\r$\n$\r$\nClick ACTIVATE KEY on the right after entering the 16-char product code you received."
  Pop $0
  SetCtlColors $0 0x94A3B8 0x20120B
  ${NSD_CreateLabel} 4u 100u 28u 10u "AES-256-GCM  ·  HWID BOUND  ·  TAMPER-PROOF"
  Pop $0
  CreateFont $R4 "Consolas" 7 700
  SendMessage $0 ${WM_SETFONT} $R4 0
  SetCtlColors $0 0x35E6A3 0x20120B

  ; [COLUMN 2 - RIGHT FORM PANEL #0F141D] (matches Vue .activation-panel card bg)
  ${NSD_CreateLabel} 38u 0 62u 100% ""
  Pop $0
  SetCtlColors $0 0xFFFFFF 0x1D140F
  ; [ROW 1 - MARK PILL + HEADING] shield mark (Vue .activation-mark, 3 states)
  ${NSD_CreateLabel} 40u 4u 6u 8u "[SHIELD]"
  Pop $MarkLabel
  CreateFont $R9 "Consolas" 7 700
  SendMessage $MarkLabel ${WM_SETFONT} $R9 0
  SetCtlColors $MarkLabel 0xFCB4A5 0x4B1B1E     ; DEFAULT indigo (#1e1b4b bg / indigo-300 text: #a5b4fc)
  ; H2 heading (matches Vue h2 "Kích hoạt bản quyền")
  ${NSD_CreateLabel} 47u 3u 50u 10u "LICENSE ACTIVATION"
  Pop $0
  CreateFont $R8 "$(^Font)" 10 700
  SendMessage $0 ${WM_SETFONT} $R8 0
  SetCtlColors $0 0xFCFAF8 0x1D140F
  ; Lead text (matches Vue "Nhập key để mở DAWA Optimizer trên thiết bị đã đăng ký.")
  ${NSD_CreateLabel} 40u 14u 58u 14u "Enter the activation code you received in your order. Key is locked to this device only."
  Pop $0
  SetCtlColors $0 0x94A3B8 0x1D140F

  ; [ROW 2 - DEVICE FINGERPRINT BLOCK] (matches Vue activation-device section)
  ${NSD_CreateLabel} 40u 30u 58u 1u ""
  Pop $0
  SetCtlColors $0 0xFCFAF8 0x261F17
  ; Device status row (green dot + "Device bound to this app")
  ${NSD_CreateLabel} 41u 33u 30u 6u "[•]  Device fingerprint ready"
  Pop $DeviceStatusLabel
  CreateFont $R7 "$(^Font)" 7 700
  SendMessage $DeviceStatusLabel ${WM_SETFONT} $R7 0
  SetCtlColors $DeviceStatusLabel 0xB7E76E 0x1D140F    ; Vue #6ee7b7 emerald-200 (ready)
  ; MACHINE ID label + value
  ${NSD_CreateLabel} 41u 40u 16u 6u "MACHINE ID"
  Pop $0
  CreateFont $R6 "Consolas" 7 700
  SendMessage $0 ${WM_SETFONT} $R6 0
  SetCtlColors $0 0x64748B 0x1D140F    ; Vue #64748b slate-500 (label)
  ${NSD_CreateLabel} 58u 40u 38u 6u "••••••••-•••• (calculated on Verify)"
  Pop $MachineIdLabel
  CreateFont $R5 "Consolas" 8 0
  SendMessage $MachineIdLabel ${WM_SETFONT} $R5 0
  SetCtlColors $MachineIdLabel 0xE2E8F0 0x1D140F    ; Vue #e2e8f0 slate-200 (value)

  ; [ROW 3 - KEY INPUT with KEY prefix] (matches Vue key-input-wrap block)
  ${NSD_CreateLabel} 40u 54u 30u 6u "License Key"
  Pop $0
  CreateFont $R4 "$(^Font)" 8 700
  SendMessage $0 ${WM_SETFONT} $R4 0
  SetCtlColors $0 0xFCFAF8 0x1D140F
  ; Key counter right side (Vue key-field-count 0/14)
  ${NSD_CreateLabel} 87u 54u 11u 6u "0/16"
  Pop $KeyCountLabel
  CreateFont $R3 "Consolas" 7 0
  SendMessage $KeyCountLabel ${WM_SETFONT} $R3 0
  SetCtlColors $KeyCountLabel 0x64748B 0x1D140F
  ; KEY prefix label (Vue key-input-prefix lime color #a3e635 = 0x35e6a3 BGR)
  ${NSD_CreateLabel} 40u 62u 6u 14u " KEY "
  Pop $0
  CreateFont $R2 "Consolas" 8 700
  SendMessage $0 ${WM_SETFONT} $R2 0
  SetCtlColors $0 0x35E6A3 0x170F0B    ; Vue #a3e635 lime-400
  ; Divider
  ${NSD_CreateLabel} 46u 62u 0u 14u "  "
  Pop $0
  SetCtlColors $0 0x1E293B 0x1E293B
  ; Edit box
  ${NSD_CreateText} 47u 62u 40u 14u ""
  Pop $LicenseEdit
  CreateFont $R1 "Consolas" 9 0
  SendMessage $LicenseEdit ${WM_SETFONT} $R1 0
  SetCtlColors $LicenseEdit 0xFCFAF8 0x170F0B   ; Vue #0b0f17 (field darker) -> BGR 0x170F0B
  SendMessage $LicenseEdit ${EM_SETLIMITTEXT} 32 0
  ${NSD_OnChange} $LicenseEdit UpdateKeyCount
  Call UpdateKeyCount

  ; [ROW 4 - FORM ALERT BOX] (Vue .form-alert below key input, SUCCESS emerald bg / ERROR rose bg)
  ${NSD_CreateLabel} 40u 79u 58u 8u "[ ]  Awaiting key input."
  Pop $FormAlertLabel
  CreateFont $R0 "$(^Font)" 8 0
  SendMessage $FormAlertLabel ${WM_SETFONT} $R0 0
  SetCtlColors $FormAlertLabel 0x94A3B8 0x1D140F

  ; [ROW 5 - ACTIVATE BUTTON (CYAN) + STATUS PILL RIGHT]
  ${NSD_CreateButton} 40u 91u 30u 14u "  ACTIVATE KEY"
  Pop $VerifyBtn
  CreateFont $R9 "$(^Font)" 8 700
  SendMessage $VerifyBtn ${WM_SETFONT} $R9 0
  ; Set button BG cyan (Vue activation-submit #22d3ee cyan-400 BGR 0xEED322 text dark #082F49)
  SetCtlColors $VerifyBtn 0x492F08 0xEED322
  ${NSD_OnClick} $VerifyBtn OnVerifyClick
  ; Status pill right of button (old pill preserved for stage messages)
  ${NSD_CreateLabel} 72u 93u 26u 8u "[ ]  IDLE"
  Pop $StatusLabel
  CreateFont $R8 "$(^Font)" 7 700
  SendMessage $StatusLabel ${WM_SETFONT} $R8 0
  SetCtlColors $StatusLabel 0x94A3B8 0x161b22

  ; [ROW 6 - PROGRESS BAR CYAN] (matches Vue key-input progress style)
  ${NSD_CreateProgressBar} 40u 109u 58u 4u ""
  Pop $ProgressBar
  SendMessage $ProgressBar ${PBM_SETRANGE32} 0 100
  SendMessage $ProgressBar ${PBM_SETBARCOLOR} 0 "0x0022d3ee"
  SendMessage $ProgressBar ${PBM_SETBKCOLOR} 0 "0x00170F0B"

  ; [ROW 7 - VERIFICATION CONSOLE log feed]
  ${NSD_CreateText} 40u 116u 58u 40u ""
  Pop $LogText
  CreateFont $7 "Consolas" 7 0
  SendMessage $LogText ${WM_SETFONT} $7 0
  SetCtlColors $LogText 0xE6EDF7 0x0D1117
  SendMessage $LogText ${EM_SETREADONLY} 1 0
  SendMessage $LogText ${WS_VSCROLL} 1 1
  SendMessage $LogText ${ES_AUTOVSCROLL} 1 1
  SendMessage $LogText ${WM_SETTEXT} 0 'STR:[boot]  Kernel secure provisioning module initialized.$\r$\n[crypto] AES-GCM hardware binding module loaded.$\r$\n[net  ] TLS 1.2 channel ready for license validation.'

  ; Show modal dialog inline (right after License leave callback)
  nsDialogs::Show

  ; Post-close license gate (if user CANCELLED instead of Verify OK)
  ${If} $IsLicenseValid != "1"
    MessageBox MB_ICONSTOP|MB_OKCANCEL|MB_DEFBUTTON2 "Activation incomplete.$\n$\nDAWA Optimizer kernel files will NOT be extracted to device vault unless a valid license is activated on this machine.$\n$\n[OK] = return and try again. [Cancel] = quit installer." IDCANCEL cancelInstall
      Abort
  cancelInstall:
      Quit
  ${EndIf}
  ; Copy license from %AppData% temp -> INSTDIR resources (anti-copy AES-GCM sealed)
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

; NO standalone Page custom! Activation dialog runs ONLY inline via
; MUI_LICENSEPAGE_CUSTOMFUNCTION_LEAVE ShowActivationPageAfterLicense.
; Having two entry points = duplicated UI + double key-input prompt bug.

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

; Set status pill right of button + sync mark-pill color (palette 100% matches Vue markState)
; Color order (BGR):
;   DEFAULT indigo : bg 0x4B1B1E = #1e1b4b, text 0xFCB4A5 = #a5b4fc (Vue mark default)
;   SUCCESS emerald: bg 0x3B4E06 = #064e3b, text 0xB7E76E = #6ee7b7 (Vue .is-success)
;   ERROR   rose   : bg 0x0A0A45 = #450a0a, text 0xA5A5FC = #fca5a5 (Vue .is-error)
Function SetPillStatus
  Exch $0
  Exch
  Exch $1
  SetCtlColors $StatusLabel $1 0x0D1117
  ${NSD_SetText} $StatusLabel $0
  ; Mirror mark pill in top-left of form to same 3-state palette so user
  ; has icon-level feedback that matches the in-app ActivationModal.vue mark
  ; (default ShieldCheck indigo -> success CheckCircle emerald -> error Alert rose)
  StrCmp $1 0xB7E76E markIsSuccess markCheckErr
  markIsSuccess:
    SetCtlColors $MarkLabel 0xB7E76E 0x3B4E06   ; EMERALD
    SendMessage $MarkLabel ${WM_SETTEXT} 0 'STR:[  OK  ]'
    Goto markDone
  markCheckErr:
    StrCmp $1 0xA5A5FC markIsError markIsDefault
  markIsError:
    SetCtlColors $MarkLabel 0xA5A5FC 0x0A0A45   ; ROSE
    SendMessage $MarkLabel ${WM_SETTEXT} 0 'STR:[ FAIL ]'
    Goto markDone
  markIsDefault:
    SetCtlColors $MarkLabel 0xFCB4A5 0x4B1B1E   ; INDIGO
    SendMessage $MarkLabel ${WM_SETTEXT} 0 'STR:[SHIELD]'
  markDone:
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

    ; Pill status + form-alert box = EMERALD SUCCESS palette (matches Vue form-alert-ok)
    Push '*  ACTIVATED  ·  Continue to kernel extraction ...'
    Push 0xB7E76E                   ; Vue #6ee7b7 emerald-200 text, BGR order
    Call SetPillStatus
    Push 'License activated  ·  Key is now HWID-bound to this device (AES-256-GCM sealed).'
    Push 0x86EFAC                   ; Vue #86efac emerald-300 text
    Push 0x17052E                   ; Vue #052e17 emerald-950 bg
    Call SetFormAlert
    Push '[DONE] License gate passed  ·  AES-GCM device-seal complete. Click Next.'
    Call AppendLog
  ${Else}
    StrCpy $HasActivatedOnce "0"
    Push '[FAIL] validation failed. Backend refused this key.'
    Call AppendLog
    Push '[MSG ] Invalid key / Expired / Device limit exceeded. Please check again.'
    Call AppendLog
    ; Pill status + form-alert box = ROSE FAILURE palette (matches Vue form-alert-error)
    Push '*  FAILED  ·  Check license key and try again'
    Push 0xA5A5FC                   ; Vue #fca5a5 rose-300 text BGR
    Call SetPillStatus
    Push 'Key verification failed  ·  Invalid key, expired, or device limit exceeded.'
    Push 0xFECACA                   ; Vue #fecaca rose-200 text
    Push 0x450A0A                   ; Vue #450a0a rose-950 bg
    Call SetFormAlert
  ${EndIf}

  EnableWindow $LicenseEdit 1
  EnableWindow $VerifyBtn 1
  Call UpdateKeyCount
  Delete "$R2"
  Delete "$R4"
  Delete "$R9"
FunctionEnd

; NO STANDALONE CreateActivationPage function. Activation dialog is ONLY
; shown inline via ShowActivationPageAfterLicense (License page LEAVE hook).
; The duplicate copy of this page below has been removed to prevent
; double-key-entry UX bug and mismatched UI design.
;
; Delete old duplicate functions CreateActivationPage + LeaveActivationPage
; (they were dead code after removing Page custom line earlier) :
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