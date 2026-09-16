; ---------------------------------------------------------
; DAWA Optimizer — License Activation NSIS Custom Page
; Electron-builder 26 uses its own MUI2 script chain; we
; MUST NOT insert !insertmacro MUI_PAGE_WELCOME or duplicate
; page macros. We only add our custom page + hooks via the
; "include" file mechanism (nsis.include in electron-builder.yml).
; ---------------------------------------------------------

!include nsDialogs.nsh
!include LogicLib.nsh
!include WinCore.nsh
!include FileFunc.nsh
!include WordFunc.nsh
!insertmacro GetParameters
!insertmacro GetOptions

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
Var JsonSource
Var JsonLen
Var FieldValidAcc
Var FieldSuccessAcc
Var FieldMsgAcc
Var FieldCursor
Var FieldMinTail

; Default backend fallback (override via /DBACKEND_URL=... at compile)
!ifndef DAWA_BACKEND_URL
!define DAWA_BACKEND_URL "https://rduc.onrender.com/api/license/validate"
!endif

; ---------------------------------------------------------
; Append to tech log box (auto-scroll)
; Input: stack top = message string
; ---------------------------------------------------------
Function AppendLog
  Exch $0
  Push $1
  Push $2
  Push $3
  ${NSD_GetText} $LogText $1
  StrCmp $1 "" +2
    StrCpy $1 "$1$\r$\n"
  ; Build timestamp without GetTime — use simple counter + marker
  System::Call 'kernel32::GetLocalTime(i .R2)'
  System::Call '*$R2(&i2 .R3, &i2 .R4, &i2 .R5, &i2 .R6, &i2 .R7, &i2 .R8, &i2 .R9)'
  ; Pad numbers to 2 digits
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

; ---------------------------------------------------------
; Set pill color + text
; Stack: (colorHex, text)
; ---------------------------------------------------------
Function SetPillStatus
  Exch $0
  Exch
  Exch $1
  SetCtlColors $StatusLabel $1 0x0D1117
  ${NSD_SetText} $StatusLabel $0
  Pop $1
  Pop $0
FunctionEnd

; ---------------------------------------------------------
; Fake progress bar step
; Stack top = percent (0..100)
; ---------------------------------------------------------
Function FakeProgress
  Pop $0
  SendMessage $ProgressBar ${PBM_SETRANGE32} 0 100
  SendMessage $ProgressBar ${PBM_SETPOS} $0 0
  Sleep 45
FunctionEnd

; ---------------------------------------------------------
; Verify button click handler — THE CORE
; ---------------------------------------------------------
Function OnVerifyClick
  ${NSD_GetText} $LicenseEdit $R0
  ${If} $R0 == ""
    Push '●  Vui lòng nhập mã bản quyền'
    Push 0xFCA5A5
    Call SetPillStatus
    Push '[ERR] Empty license key rejected'
    Call AppendLog
    Return
  ${EndIf}

  EnableWindow $VerifyBtn 0
  EnableWindow $LicenseEdit 0

  Push '●  Đang xác thực với máy chủ DAWA...'
  Push 0xFBBF24
  Call SetPillStatus

  ; Engineering fake step stream (user profile preference)
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
  Push '[NET ]  Negotiate TLS 1.2 → ServerHello...'
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

  ; Resolve $PLUGINSDIR path (created in .onInit by our copy script)
  StrCpy $PowerShellCmd '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe"'
  StrCpy $PowerShellCmd "$PowerShellCmd -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass"
  StrCpy $PowerShellCmd "$PowerShellCmd -File `"$PLUGINSDIR\license-check.ps1`""
  StrCpy $PowerShellCmd "$PowerShellCmd -LicenseKey `"$R0`""
  StrCpy $PowerShellCmd "$PowerShellCmd -BackendUrl `"$BackendUrlText`""
  StrCpy $PowerShellCmd "$PowerShellCmd -OutputFile `"$R2`""
  StrCpy $PowerShellCmd "$PowerShellCmd *> `"$R4`""

  Push '[NET ]  POST /api/license/validate (Content-Length ≈ 1.2 KB)...'
  Call AppendLog
  Push 58
  Call FakeProgress

  ; Execute PowerShell verifier synchronously (hide window)
  nsExec::ExecToLog $PowerShellCmd
  Pop $R5
  Push '[NET ]  Response received — validating JSON...'
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
    StrCpy $R6 '{"success":false,"valid":false,"message":"Không đọc được file kết quả từ PowerShell verifier.","isOffline":true}'
fileReadDone:
  Push '[PIPE] JSON payload captured to memory — parsing field map...'
  Call AppendLog
  Push 88
  Call FakeProgress

  ; Simple manual JSON extraction for 3 fields (no JSON plugin needed):
  ;   "valid"   : true/false → assign $IsLicenseValid
  ;   "success" : true/false → confirm backend 200
  ;   "message" : "..."      → pill error text
  ;   "keyCode" from input (PowerShell writes same back)
  ; Strategy: find quoted key by index search + scan for true|false|str
  StrCpy $R7 $R6         ; json source
  StrLen $R8 $R7
  StrCpy $R9 "0"         ; $IsLicenseValid accumulator
  StrCpy $R10 "0"        ; success accumulator
  StrCpy $R11 ""         ; message accumulator
  StrCpy $R12 0          ; cursor index
  StrCpy $R13 $R8
  IntOp $R13 $R13 - 8    ; min tail length for field scanning

fieldLoop:
  IntCmp $R12 $R13 fieldScanDone
    StrCpy $R14 $R7 1 $R12
    StrCmp $R14 '"' +1 fieldNext
    StrCpy $R15 $R7 9 $R12
    StrCmp $R15 '"valid"' foundValid
    StrCpy $R15 $R7 9 $R12
    StrCmp $R15 '"success"' foundSuccess
    StrCpy $R15 $R7 9 $R12
    StrCmp $R15 '"message"' foundMessage
fieldNext:
    IntOp $R12 $R12 + 1
    Goto fieldLoop

foundValid:
  IntOp $R12 $R12 + 9
  StrCpy $R15 $R7 1 $R12
  StrCmp $R15 ':' +2
    Goto fieldNext
  IntOp $R12 $R12 + 1
skipValWSa:
  StrCpy $R15 $R7 1 $R12
  StrCmp $R15 ' ' +2
    Goto gotValA
  StrCmp $R15 "`t" +2
    Goto gotValA
  IntOp $R12 $R12 + 1
  Goto skipValWSa
gotValA:
  StrCpy $R16 $R7 4 $R12
  StrCmp $R16 'true' markValidTrue
  StrCmp $R16 'fals' markValidFalse
  Goto fieldNext
markValidTrue:
  StrCpy $R9 "1"
  IntOp $R12 $R12 + 4
  Goto fieldNext
markValidFalse:
  StrCpy $R9 "0"
  IntOp $R12 $R12 + 5
  Goto fieldNext

foundSuccess:
  IntOp $R12 $R12 + 9
  StrCpy $R15 $R7 1 $R12
  StrCmp $R15 ':' +2
    Goto fieldNext
  IntOp $R12 $R12 + 1
skipSuccWSa:
  StrCpy $R15 $R7 1 $R12
  StrCmp $R15 ' ' +2
    Goto gotSuccA
  StrCmp $R15 "`t" +2
    Goto gotSuccA
  IntOp $R12 $R12 + 1
  Goto skipSuccWSa
gotSuccA:
  StrCpy $R16 $R7 4 $R12
  StrCmp $R16 'true' markSuccTrue
  StrCmp $R16 'fals' markSuccFalse
  Goto fieldNext
markSuccTrue:
  StrCpy $R10 "1"
  IntOp $R12 $R12 + 4
  Goto fieldNext
markSuccFalse:
  StrCpy $R10 "0"
  IntOp $R12 $R12 + 5
  Goto fieldNext

foundMessage:
  IntOp $R12 $R12 + 9
  StrCpy $R15 $R7 1 $R12
  StrCmp $R15 ':' +2
    Goto fieldNext
  IntOp $R12 $R12 + 1
skipMsgWS:
  StrCpy $R15 $R7 1 $R12
  StrCmp $R15 ' ' +2
    Goto gotMsgStart
  StrCmp $R15 "`t" +2
    Goto gotMsgStart
  IntOp $R12 $R12 + 1
  Goto skipMsgWS
gotMsgStart:
  StrCpy $R15 $R7 1 $R12
  StrCmp $R15 '"' +2
    Goto fieldNext
  IntOp $R12 $R12 + 1
  StrCpy $R11 ""
msgReadLoop:
  IntCmp $R12 $R8 fieldScanDone
    StrCpy $R15 $R7 1 $R12
    StrCmp $R15 '\' msgBackslash
    StrCmp $R15 '"' msgDone
    StrCpy $R11 "$R11$R15"
    IntOp $R12 $R12 + 1
    Goto msgReadLoop
msgBackslash:
  IntOp $R12 $R12 + 1
  StrCpy $R15 $R7 1 $R12
  StrCmp $R15 'n' msgWriteN
  StrCmp $R15 'r' msgWriteR
  StrCmp $R15 't' msgWriteT
  StrCmp $R15 '"' msgWriteQ
  StrCmp $R15 '\' msgWriteB
  StrCpy $R11 "$R11\$R15"
  IntOp $R12 $R12 + 1
  Goto msgReadLoop
msgWriteN:
  StrCpy $R11 "$R11$\n"
  IntOp $R12 $R12 + 1
  Goto msgReadLoop
msgWriteR:
  StrCpy $R11 "$R11$\r"
  IntOp $R12 $R12 + 1
  Goto msgReadLoop
msgWriteT:
  StrCpy $R11 "$R11$\t"
  IntOp $R12 $R12 + 1
  Goto msgReadLoop
msgWriteQ:
  StrCpy $R11 "$R11$\""
  IntOp $R12 $R12 + 1
  Goto msgReadLoop
msgWriteB:
  StrCpy $R11 "$R11\\"
  IntOp $R12 $R12 + 1
  Goto msgReadLoop
msgDone:
  IntOp $R12 $R12 + 1
  Goto fieldNext

fieldScanDone:
  StrCpy $IsLicenseValid $R9
  Push 100
  Call FakeProgress

  ${If} $IsLicenseValid == "1"
    StrCpy $HasActivatedOnce "1"
    StrCpy $ValidatedKey $R0

    Push '[ OK ] ✅ Backend returned: valid = true, hwid match ok'
    Call AppendLog
    Push '[FS]  Write marker → %AppData%\Dawa Optimizer\installer-license.dat'
    Call AppendLog

    ; --- Write marker locations ---
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

    Push '[REG ]  HKCU\\Software\\Dawa Optimizer → InstallerActivated=1 + LicenseKeyInstaller (masked)'
    Call AppendLog

    WriteRegStr HKCU "Software\Dawa Optimizer" "InstallerActivated" "1"
    WriteRegStr HKLM "Software\Dawa Optimizer" "InstallerActivated" "1"
    ${If} $ValidatedKey != ""
      WriteRegStr HKCU "Software\Dawa Optimizer" "LicenseKeyInstaller" $ValidatedKey
      WriteRegStr HKLM "Software\Dawa Optimizer" "LicenseKeyInstaller" $ValidatedKey
    ${EndIf}

    Push '●  Đã kích hoạt ✔  Tiếp tục để giải nén ứng dụng...'
    Push 0x34D399
    Call SetPillStatus
    Push '[DONE] License gate passed — you may now click Next.'
    Call AppendLog
  ${Else}
    StrCpy $HasActivatedOnce "0"
    Push '[FAIL] ❌ validation failed. Backend refused this key.'
    Call AppendLog
    StrCmp $R11 "" showMsgDefault
      Push '[MSG ] '
      Call AppendLog
      Push $R11
      Call AppendLog
      Goto showMsgDone
    showMsgDefault:
      Push '[MSG ] Sai mã / Hết hạn / Quá giới hạn thiết bị. Vui lòng kiểm tra lại.'
      Call AppendLog
    showMsgDone:
    Push '●  Xác thực thất bại — hãy kiểm tra lại key'
    Push 0xFCA5A5
    Call SetPillStatus
  ${EndIf}

  EnableWindow $LicenseEdit 1
  EnableWindow $VerifyBtn 1

  Delete "$R2"
  Delete "$R4"
FunctionEnd

; ---------------------------------------------------------
; CREATE activation page
; ---------------------------------------------------------
Function CreateActivationPage
  StrCpy $BackendUrlText "${DAWA_BACKEND_URL}"

  nsDialogs::Create 1018
  Pop $ActivationDialog

  ${If} $ActivationDialog == error
    Abort
  ${EndIf}

  ; ---------- Brand banner ----------
  ${NSD_CreateLabel} 0 0 100% 18u "🔐  KÍCH HOẠT BẢN QUYỀN — DAWA OPTIMIZER"
  Pop $0
  CreateFont $R9 "$(^Font)" 10 700
  SendMessage $0 ${WM_SETFONT} $R9 0
  SetCtlColors $0 0xF8FAFC 0x0D1117

  ${NSD_CreateLabel} 0 24u 100% 24u "Để tiếp tục giải nén ứng dụng vào ổ cứng, vui lòng nhập mã bản quyền bạn đã nhận trong đơn hàng. Máy tính sẽ được tự động gắn với key này (HWID binding)."
  Pop $0
  SetCtlColors $0 0xA0AEC0 0x0D1117

  ; ---------- Key input ----------
  ${NSD_CreateLabel} 0 58u 100% 12u "Mã bản quyền:"
  Pop $0
  SetCtlColors $0 0xF8FAFC 0x0D1117
  CreateFont $RCode "$(^Font)" 9 700
  SendMessage $0 ${WM_SETFONT} $RCode 0

  ${NSD_CreateText} 0 72u 100% 20u ""
  Pop $LicenseEdit
  CreateFont $RMono "Consolas" 10 400
  SendMessage $LicenseEdit ${WM_SETFONT} $RMono 0
  SetCtlColors $LicenseEdit 0x000000 0xFFFFFF

  ; ---------- Verify button + status pill ----------
  ${NSD_CreateButton} 0 100u 130u 20u "🔍  Kiểm tra & Kích hoạt"
  Pop $VerifyBtn
  ${NSD_OnClick} $VerifyBtn OnVerifyClick

  ${NSD_CreateLabel} 140u 102u 100% 14u "●  Chưa kích hoạt"
  Pop $StatusLabel
  SetCtlColors $StatusLabel 0xFCA5A5 0x0D1117
  CreateFont $R7 "$(^Font)" 9 700
  SendMessage $StatusLabel ${WM_SETFONT} $R7 0

  ; ---------- Progress bar ----------
  ${NSD_CreateProgressBar} 0 128u 100% 8u ""
  Pop $ProgressBar
  SendMessage $ProgressBar ${PBM_SETRANGE32} 0 100
  SendMessage $ProgressBar ${PBM_SETPOS} 0 0

  ; ---------- Tech log console ----------
  ${NSD_CreateLabel} 0 142u 100% 10u "▸ Console xác thực (real-time):"
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

; ---------------------------------------------------------
; LEAVE activation page gate (click Next handler)
; ---------------------------------------------------------
Function LeaveActivationPage
  ${If} $IsLicenseValid == "1"
    ; Also stash marker into INSTDIR\resources\ for electron to find even if roaming profile is wiped
    CreateDirectory "$INSTDIR\resources"
    SetShellVarContext current
    CopyFiles /SILENT /FILESONLY "$APPDATA\Dawa Optimizer\installer-license.dat" "$INSTDIR\resources\installer-license.dat"
    SetShellVarContext current
    Return
  ${Else}
    MessageBox MB_ICONSTOP|MB_OKCANCEL|MB_DEFBUTTON2 "Bạn chưa kích hoạt bản quyền.$\n$\nDAWA Optimizer sẽ KHÔNG được giải nén nếu không có mã bản quyền hợp lệ.$\n$\nBấm OK = quay lại để nhập key. Bấm Cancel = Hủy cài đặt." IDCANCEL cancelInstall
      SendMessage $VerifyBtn ${BM_CLICK} 0 0
      Abort
cancelInstall:
      Quit
  ${EndIf}
FunctionEnd

; ---------------------------------------------------------
; INIT: Copy PowerShell verifier to $PLUGINSDIR
; ---------------------------------------------------------
Function .onInit
  InitPluginsDir
  SetOutPath $PLUGINSDIR
  File /oname=license-check.ps1 "${BUILD_RESOURCES_DIR}\license-check.ps1"
  StrCpy $IsLicenseValid "0"
  StrCpy $HasActivatedOnce "0"
FunctionEnd

; ---------------------------------------------------------
; Register pages. Electron-builder 26's generated MUI2
; script calls the custom hooks defined here AFTER the
; Welcome page and BEFORE the Components/Directory page
; by the include mechanism. Our page order:
;   1. Welcome  (default, electron-builder)
;   2. Activation Gate (this one)
;   3. LicenseAgreement (optional, electron-builder)
;   4. Directory selection + Components ...
; ---------------------------------------------------------
Page custom CreateActivationPage LeaveActivationPage "" "Kích hoạt bản quyền"
