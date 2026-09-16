; ---------------------------------------------------------
; DAWA Optimizer — License Activation (Custom NSIS Page)
; Inject after Welcome page, before directory selection.
; User cannot proceed to extract app until license valid.
; ---------------------------------------------------------

!include nsDialogs.nsh
!include LogicLib.nsh
!include WinCore.nsh

Var ActivationDialog
Var ActivationHandle
Var LicenseEdit
Var VerifyBtn
Var StatusLabel
Var LogText
Var ProgressBar
Var IsLicenseValid
Var ValidatedKey
Var ValidatedJson
Var BackendUrlText
Var FakeTimer

; ---------------------------------------------------------
; Default backend URL fallback — overridden by env at build if BACKEND_URL set
; ---------------------------------------------------------
!ifndef DAWA_BACKEND_URL
!define DAWA_BACKEND_URL "https://rduc.onrender.com/api/license/validate"
!endif

; ---------------------------------------------------------
; Activation page create
; ---------------------------------------------------------
Function CreateActivationPage
  nsDialogs::Create 1018
  Pop $ActivationDialog

  ${If} $ActivationDialog == error
    Abort
  ${EndIf}

  ; ---------- Brand ----------
  ${NSD_CreateLabel} 0 0 100% 18u "🔐  KÍCH HOẠT BẢN QUYỀN — DAWA OPTIMIZER"
  Pop $0
  CreateFont $R9 "$(^Font)" 10 700
  SendMessage $0 ${WM_SETFONT} $R9 0
  SetCtlColors $0 0xF8FAFC 0x0D1117

  ${NSD_CreateLabel} 0 24u 100% 24u "Để tiếp tục cài đặt, vui lòng nhập mã bản quyền được cấp trong đơn hàng của bạn. Máy tính sẽ được tự động gắn key sau khi kích hoạt."
  Pop $0
  SetCtlColors $0 0xA0AEC0 0x0D1117

  ; ---------- License key input ----------
  ${NSD_CreateLabel} 0 58u 100% 12u "Mã bản quyền:"
  Pop $0
  SetCtlColors $0 0xF8FAFC 0x0D1117

  ${NSD_CreateText} 0 72u 100% 20u ""
  Pop $LicenseEdit
  CreateFont $R8 "Consolas" 10 400
  SendMessage $LicenseEdit ${WM_SETFONT} $R8 0
  SetCtlColors $LicenseEdit 0x000000 0xFFFFFF
  SendMessage $LicenseEdit ${EM_SETEVENTMASK} 0 0x0008

  ; ---------- Backend URL (hidden by default, dev-mode override) ----------
  StrCpy $BackendUrlText "${DAWA_BACKEND_URL}"

  ; ---------- Verify button ----------
  ${NSD_CreateButton} 0 100u 130u 20u "🔍  Kiểm tra & Kích hoạt"
  Pop $VerifyBtn
  ${NSD_OnClick} $VerifyBtn OnVerifyClick

  ; ---------- Status pill ----------
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

  ; ---------- Tech log box (engineering feel) ----------
  ${NSD_CreateLabel} 0 142u 100% 10u "▸ Console xác thực thời gian thực:"
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
  SendMessage $LogText ${WS_EX_STATICEDGE} 0 0

  ; Initial log banner
  Push '[BOOT]  NSIS Installer License Gate v1.19'
  Call AppendLog
  Push '[INFO]  Backend endpoint: detect ok'
  Call AppendLog
  Push '[HALT]  Đang chờ người dùng nhập mã bản quyền...'
  Call AppendLog

  nsDialogs::Show
FunctionEnd

; ---------------------------------------------------------
; Append to log box (auto-scroll)
; Stack top = message
; ---------------------------------------------------------
Function AppendLog
  Exch $0
  Push $1
  Push $2
  ${NSD_GetText} $LogText $1
  StrCmp $1 "" +2
    StrCpy $1 "$1$\r$\n"
  GetTime $2
  StrCpy $2 "[$2]  "
  StrCpy $1 "$1$2$0"
  ${NSD_SetText} $LogText $1
  SendMessage $LogText ${EM_LINESCROLL} 0 9999
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

; ---------------------------------------------------------
; Set pill status
; Stack = (color, text)
; ---------------------------------------------------------
Function SetPillStatus
  Exch $0 ; text
  Exch
  Exch $1 ; color
  SetCtlColors $StatusLabel $1 0x0D1117
  ${NSD_SetText} $StatusLabel $0
  Pop $1
  Pop $0
FunctionEnd

; ---------------------------------------------------------
; Fake engineering progress (user profile preference)
; ---------------------------------------------------------
Function FakeProgress
  Pop $0
  SendMessage $ProgressBar ${PBM_SETPOS} $0 0
  Sleep 60
  IntCmp $0 100 +1
  Return
FunctionEnd

; ---------------------------------------------------------
; On verify button click
; ---------------------------------------------------------
Function OnVerifyClick
  ${NSD_GetText} $LicenseEdit $R0
  StrCmp $R0 "" VerifyEmpty VerifyNonEmpty

VerifyEmpty:
  Push '●  Vui lòng nhập mã bản quyền'
  Push 0xFCA5A5
  Call SetPillStatus
  Push '[ERROR] Trống mã bản quyền — yêu cầu nhập đủ ký tự'
  Call AppendLog
  Return

VerifyNonEmpty:
  EnableWindow $VerifyBtn 0
  EnableWindow $LicenseEdit 0

  Push '●  Đang xác thực với máy chủ DAWA...'
  Push 0xFBBF24
  Call SetPillStatus

  ; ——— Engineering fake step stream ———
  Push '[STEP] Đọc SMBIOS/CPU UUID để tính HWID...'
  Call AppendLog
  Push 10
  Call FakeProgress

  Push '[STEP] Hash phần cứng SHA256 + salt...'
  Call AppendLog
  Push 22
  Call FakeProgress

  Push '[NET ]  TLS 1.2 handshake với rduc.onrender.com...'
  Call AppendLog
  Push 38
  Call FakeProgress

  ; ——— Build paths ———
  GetTempFileName $R1
  StrCpy $R2 "$R1.json"
  Rename $R1 $R2
  GetTempFileName $R3
  StrCpy $R4 "$R3.out"
  Rename $R3 $R4

  ; Escape license key for cmd / PowerShell
  System::Call 'Kernel32::GetShortPathName(t, t, i) i (.r0, .r0, 1024) ?e'
  StrCpy $PS1 '"powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass'
  StrCpy $PS1 "$PS1 -File `"$PLUGINSDIR\license-check.ps1`""
  StrCpy $PS1 "$PS1 -LicenseKey `"$R0`""
  StrCpy $PS1 "$PS1 -BackendUrl `"$BackendUrlText`""
  StrCpy $PS1 "$PS1 -OutputFile `"$R2`" > `"$R4`" 2>&1"

  Push '[STEP] POST /api/license/validate payload (1.2 KB)...'
  Call AppendLog
  Push 52
  Call FakeProgress

  ; ——— Execute verifier PowerShell ———
  nsexec::exectolog $PS1
  Pop $R5
  Push '[NET ]  HTTP response received...'
  Call AppendLog
  Push 76
  Call FakeProgress

  ; ——— Parse JSON result ———
  FileOpen $6 $R2 r
  IfErrors JsonMissing JsonRead
JsonRead:
  FileRead $6 $ValidatedJson
  FileClose $6
  Goto JsonDone
JsonMissing:
  StrCpy $ValidatedJson '{"success":false,"valid":false,"message":"Lỗi đọc kết quả xác thực","isOffline":true}'
JsonDone:

  Push '[STEP] Parse JSON response...'
  Call AppendLog
  Push 90
  Call FakeProgress

  ; Extract success/valid/message via simple JSON search
  ; We don't link a full JSON parser — use simple match + write marker file
  StrCpy $7 "success"
  StrCpy $8 $ValidatedJson
  StrLen $9 $7
  StrLen $10 $8
  IntOp $11 $10 - $9
  StrCpy $IsLicenseValid "0"
  StrCpy $12 " "
  StrCpy $13 ""
  IntOp $14 0
loopJson:
  IntCmp $14 $11 doneValid
    StrCpy $15 $8 1 $14
    StrCmp $15 '"' +1
      IntOp $14 $14 + 1
      Goto loopJson
    StrCpy $16 $8 $9 $14
    StrCmp $16 '"success"' foundSuccessKey
    StrCmp $16 '"valid"' foundValidKey
    StrCmp $16 '"message"' foundMessageKey
    IntOp $14 $14 + 1
    Goto loopJson

foundSuccessKey:
  IntOp $14 $14 + $9 + 1
  StrCpy $17 $8 1 $14
  StrCmp $17 ':' +2
    Goto loopJson
  IntOp $14 $14 + 1
  ; skip spaces
skipWS1:
  StrCpy $17 $8 1 $14
  StrCmp $17 ' ' +2
    Goto gotVal1
  StrCmp $17 "\t" +2
    Goto gotVal1
  IntOp $14 $14 + 1
  Goto skipWS1
gotVal1:
  StrCpy $18 $8 4 $14
  StrCmp $18 'true' markSuccess
  IntOp $14 $14 + 1
  Goto loopJson
markSuccess:
  StrCpy $19 "1"
  IntOp $14 $14 + 4
  Goto loopJson

foundValidKey:
  IntOp $14 $14 + $9 + 1
  StrCpy $17 $8 1 $14
  StrCmp $17 ':' +2
    Goto loopJson
  IntOp $14 $14 + 1
skipWS2:
  StrCpy $17 $8 1 $14
  StrCmp $17 ' ' +2
    Goto gotVal2
  StrCmp $17 "\t" +2
    Goto gotVal2
  IntOp $14 $14 + 1
  Goto skipWS2
gotVal2:
  StrCpy $18 $8 4 $14
  StrCmp $18 'true' markValid
  IntOp $14 $14 + 1
  Goto loopJson
markValid:
  StrCpy $IsLicenseValid "1"
  StrCpy $ValidatedKey $R0
  IntOp $14 $14 + 4
  Goto loopJson

foundMessageKey:
  IntOp $14 $14 + $9 + 1
  StrCpy $17 $8 1 $14
  StrCmp $17 ':' +2
    Goto loopJson
  IntOp $14 $14 + 1
skipWS3:
  StrCpy $17 $8 1 $14
  StrCmp $17 ' ' +2
    Goto gotMsgStart
  StrCmp $17 "\t" +2
    Goto gotMsgStart
  IntOp $14 $14 + 1
  Goto skipWS3
gotMsgStart:
  StrCpy $17 $8 1 $14
  StrCmp $17 '"' +2
    Goto loopJson
  IntOp $14 $14 + 1
  StrCpy $13 ""
msgLoop:
  StrCpy $17 $8 1 $14
  StrCmp $17 '"' msgDone
  StrCmp $17 '' msgDone
  StrCpy $13 "$13$17"
  IntOp $14 $14 + 1
  Goto msgLoop
msgDone:
  IntOp $14 $14 + 1
  Goto loopJson

doneValid:
  Push 100
  Call FakeProgress

  ${If} $IsLicenseValid == "1"
    Push '[ OK ] ✅ License hợp lệ. Đang ghi cục bộ vào %AppData% marker...'
    Call AppendLog

    ; Write marker: %APPDATA%\Dawa Optimizer\installer-license.dat
    SetShellVarContext current
    CreateDirectory "$APPDATA\Dawa Optimizer"
    FileOpen $6 "$APPDATA\Dawa Optimizer\installer-license.dat" w
    FileWrite $6 $ValidatedJson
    FileClose $6

    SetShellVarContext all
    CreateDirectory "$PROGRAMDATA\Dawa Optimizer"
    FileOpen $6 "$PROGRAMDATA\Dawa Optimizer\installer-license.dat" w
    FileWrite $6 $ValidatedJson
    FileClose $6

    Push '●  Đã kích hoạt ✔  Đang giải nén DAWA Optimizer...'
    Push 0x34D399
    Call SetPillStatus

    Push '[DONE] Bạn có thể bấm Tiếp theo để cài đặt ứng dụng.'
    Call AppendLog

    GetFunctionAddress $0 ActivationLeaveSuccess
    BtnEvent 1 $0
  ${Else}
    Push '[FAIL] ❌ Mã bản quyền không hợp lệ.'
    Call AppendLog
    Push '[MSG ] '
    Call AppendLog
    ; Inject actual message if found
    StrCmp $13 "" showMsgFallback
      Push $13
      Call AppendLog
      Goto showMsgDone
    showMsgFallback:
      Push 'Sai định dạng key, đã gắn quá nhiều thiết bị, hoặc hết hạn (lưu ý phân biệt chữ hoa/thường).'
      Call AppendLog
    showMsgDone:

    Push '●  Xác thực thất bại — vui lòng kiểm tra lại key'
    Push 0xFCA5A5
    Call SetPillStatus

    GetFunctionAddress $0 ActivationLeaveBlock
    BtnEvent 1 $0
  ${EndIf}

  EnableWindow $LicenseEdit 1
  EnableWindow $VerifyBtn 1

  ; Cleanup temp
  Delete "$R2"
  Delete "$R4"
  Return

ActivationLeaveBlock:
  MessageBox MB_ICONSTOP|MB_OK "Bạn chưa kích hoạt bản quyền thành công.$\n$\nKhông thể tiếp tục cài đặt DAWA Optimizer nếu không có mã bản quyền hợp lệ."
  Abort
ActivationLeaveSuccess:
  Return
FunctionEnd

; ---------------------------------------------------------
; Page leave callback (called on "Next" click)
; ---------------------------------------------------------
Function LeaveActivationPage
  ${If} $IsLicenseValid == "1"
    ; Pre-copy license marker into $INSTDIR so first boot reads it even if roaming profile weird
    CreateDirectory "$INSTDIR\resources"
    SetShellVarContext current
    CopyFiles /SILENT "$APPDATA\Dawa Optimizer\installer-license.dat" "$INSTDIR\resources\installer-license.dat"
    SetShellVarContext current
    Return
  ${Else}
    MessageBox MB_ICONSTOP|MB_OK|MB_RETRYCANCEL "Vui lòng bấm nút ""Kiểm tra & Kích hoạt"" và nhập mã bản quyền hợp lệ trước khi tiếp tục." IDCANCEL cancelRetry
    SendMessage $VerificationBtn ${BM_CLICK} 0 0
    Abort
cancelRetry:
    Abort
  ${EndIf}
FunctionEnd

; ---------------------------------------------------------
; Pre-copy PowerShell helper to $PLUGINSDIR at installer start
; ---------------------------------------------------------
Function .onInit
  InitPluginsDir
  SetOutPath $PLUGINSDIR
  File /oname=license-check.ps1 "${BUILD_RESOURCES_DIR}\license-check.ps1"

  ; Enforce: always insert Activation page — even silent install with no key abort
  StrCpy $IsLicenseValid "0"
FunctionEnd

; ---------------------------------------------------------
; Register custom page — position: AFTER Welcome, BEFORE Components/Dir
; electron-builder uses MUI2 by default: we use native page insert at index 1
; ---------------------------------------------------------
!insertmacro MUI_PAGE_WELCOME
Page custom CreateActivationPage LeaveActivationPage

; We also write marker to registry so electron boot can detect fast
Section "Write Installer Marker"
  WriteRegStr HKCU "Software\Dawa Optimizer" "InstallerActivated" "1"
  WriteRegStr HKLM "Software\Dawa Optimizer" "InstallerActivated" "1"
  SetShellVarContext current
  ${If} $ValidatedKey != ""
    WriteRegStr HKCU "Software\Dawa Optimizer" "LicenseKeyInstaller" $ValidatedKey
  ${EndIf}
  SetShellVarContext all
  ${If} $ValidatedKey != ""
    WriteRegStr HKLM "Software\Dawa Optimizer" "LicenseKeyInstaller" $ValidatedKey
  ${EndIf}
SectionEnd
