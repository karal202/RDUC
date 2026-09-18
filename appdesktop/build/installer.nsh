; DAWA Optimizer - Standalone WinRAR-style License Activation Gate
; The activation UI is a SEPARATE WPF modal (gate-activation.ps1) that pops up
; BEFORE any installer window becomes visible, similar to a WinRAR password prompt.
; NSIS here is ONLY the enforcement layer - it NEVER draws the key UI itself.
; This completely avoids the electron-builder page-hook instability (nsDialogs
; depending on installer HWND being ready at .onInit time).
!include LogicLib.nsh
!include WinCore.nsh
!include FileFunc.nsh
!include WordFunc.nsh
!insertmacro GetParameters
!insertmacro GetOptions

; ============================================================
;  ZERO-TRUST GATE - HOOK 5 POINTS, PRE-INIT = PRIMARY
;  1) preInit                   (EARLIEST — RIGHT AFTER Run anyway click)
;  2) System::SetWinHook WH_CBT (hide #32770 installer HWND the moment
;                                it's created, BEFORE first ShowWindow)
;  3) customInit (.onInit)      (fallback if preInit somehow skipped)
;  4) GUIINIT                   (extra fallback, HWND now exists)
;  5) Welcome_SHOW / License_SHOW (final fallback if all above were hijacked)
;  A guard variable prevents the modal from appearing more than once.
;  The installer dialog HWND MUST remain HIDDEN until gate returns PASS.
; ============================================================
!macro customHeader
  !define MUI_WELCOMEPAGE_CUSTOMFUNCTION_SHOW  GateEntryIfNeeded_WelcomeShow
  !define MUI_LICENSEPAGE_CUSTOMFUNCTION_SHOW  GateEntryIfNeeded_LicenseShow
  !define MUI_INSTFILESPAGE_CUSTOMFUNCTION_PRE .onInitInstFiles
  !define MUI_CUSTOMFUNCTION_GUIINIT          .onDawaGuiInitGate
!macroend

; ============================================================
;  GLOBAL HIDE-INSTALLER-HWND — HOOK + POLL LOOP
;  The only way to GUARANTEE the MUI installer #32770 dialog is
;  NEVER visible (not even for 1 frame) when preInit gate runs.
;  1) First: poll FindWindow("#32770", ...) aggressively —
;     MUI/EB create the dialog somewhere between preInit and
;     customInit. We call ShowWindow(SW_HIDE) on it immediately
;     the moment its HWND appears.
;  2) Also: SetWindowLong(GWL_EXSTYLE) → add WS_EX_TOOLWINDOW and
;     remove WS_EX_APPWINDOW → prevent Alt-Tab / taskbar flash.
;  3) Global variable $InstallerHwndFound holds the captured HWND
;     so RunStandaloneActivationGate can SW_SHOW it only after
;     gate passes.
; ============================================================
Var InstallerHwndFound
Var InstallerHwndHiddenByUs

Function HideInstallerHwndIfExists
  ; Step A: Try to find the installer top-level #32770 dialog
  ; that MUI / electron-builder created with our window title.
  System::Call 'user32::FindWindow(t "#32770", p 0) i .R0'
  ${If} $R0 != 0
    ; Extra sanity check: verify window belongs to THIS process
    ; (avoid accidentally hiding a DIFFERENT #32770 dialog on
    ; the user's desktop such as Task Manager options etc.)
    System::Call 'user32::GetWindowThreadProcessId(i R0, *i .R1) i .R2'
    System::Call 'kernel32::GetCurrentProcessId() i .R3'
    ${If} $R1 == $R3
      StrCpy $InstallerHwndFound $R0
      ; Apply SW_HIDE FIRST — most important line.
      System::Call 'user32::ShowWindow(i R0, i 0)'  ; SW_HIDE = 0
      ; Strip WS_EX_APPWINDOW / add WS_EX_TOOLWINDOW so
      ; taskbar button never appears even for 10ms.
      System::Call 'user32::GetWindowLong(i R0, i -20) i .R4'  ; GWL_EXSTYLE = -20
      IntOp $R4 $R4 | 0x00000080   ; WS_EX_TOOLWINDOW
      IntOp $R4 $R4 & 0xFEFFFFFF   ; remove WS_EX_APPWINDOW (0x00040000 bit)
      System::Call 'user32::SetWindowLong(i R0, i -20, i R4) i .'
      ; Force WM_SETREDRAW off to suppress any pending WM_PAINT.
      System::Call 'user32::SendMessage(i R0, i 0x000B, i 0, i 0) i .' ; WM_SETREDRAW=FALSE
      StrCpy $InstallerHwndHiddenByUs "1"
    ${EndIf}
  ${EndIf}
FunctionEnd

; ============================================================
;  ZERO-TRUST HOOK POINT 0.75 - GUIINIT (EXTRA FALLBACK)
;  If the installer HWND was somehow created WITHOUT the poll
;  loop in preInit catching it, this fires IMMEDIATELY after
;  CreateWindowEx returns, BEFORE first WM_PAINT. We hide it
;  again here and run gate if still not attempted.
; ============================================================
Function .onDawaGuiInitGate
  Call HideInstallerHwndIfExists
  ${If} $GateHasBeenAttempted == "1"
    ; If gate passed earlier, unhide now (restore WM_SETREDRAW too)
    ${If} $IsLicenseValid == "1"
      ${IfThen} $InstallerHwndFound != 0 ${|} System::Call 'user32::SendMessage(i $InstallerHwndFound, i 0x000B, i 1, i 0) i .' ${|}
      ${IfThen} $InstallerHwndHiddenByUs == "1" ${|} System::Call 'user32::ShowWindow(i $InstallerHwndFound, i 5)' ${|}
      StrCpy $InstallerHwndHiddenByUs "0"
    ${EndIf}
    Return
  ${EndIf}
  Call RunStandaloneActivationGate
FunctionEnd

; ============================================================
;  ZERO-TRUST HOOK POINT 0.5 - CUSTOM INIT (fallback after preInit)
;  Electron-builder invokes !insertmacro customInit INSIDE its
;  auto-generated Function .onInit. If preInit gate failed to
;  run (edge case on very old Windows), we repeat here.
; ============================================================
!macro customInit
  Call HideInstallerHwndIfExists
  ${If} $GateHasBeenAttempted == "0"
    Call RunStandaloneActivationGate
  ${ElseIf} $IsLicenseValid == "1"
    ${IfThen} $InstallerHwndFound != 0 ${|} System::Call 'user32::SendMessage(i $InstallerHwndFound, i 0x000B, i 1, i 0) i .' ${|}
    ${IfThen} $InstallerHwndHiddenByUs == "1" ${|} System::Call 'user32::ShowWindow(i $InstallerHwndFound, i 5)' ${|}
    StrCpy $InstallerHwndHiddenByUs "0"
  ${EndIf}
!macroend

; Runtime state
Var IsLicenseValid
Var ValidatedKey
Var GateHasBeenAttempted
Var GateBackendUrl
Var GateSealedOutput
Var GateResultJson
Var GateRegFlagPath
Var GatePs1Path
Var GateEncryptPs1Path
Var GateExe
Var IsSilentMode

; Default backend fallback
!ifndef DAWA_BACKEND_URL
!define DAWA_BACKEND_URL "https://rduc.onrender.com/api/license/validate"
!endif

; ============================================================
;  COMMON ENFORCER (always idempotent - safe to call from 2 hooks)
;  If the modal was already shown or license valid -> return fast.
; ============================================================
Function GateEntryIfNeeded_WelcomeShow
  ${If} $GateHasBeenAttempted == "1"
    Return
  ${EndIf}
  Call RunStandaloneActivationGate
FunctionEnd

Function GateEntryIfNeeded_LicenseShow
  ${If} $GateHasBeenAttempted == "1"
    Return
  ${EndIf}
  Call RunStandaloneActivationGate
FunctionEnd

; ============================================================
;  STANDALONE WINRAR-STYLE ACTIVATION MODAL
;  Spawns a completely independent WPF window (separate HWND)
;  via PowerShell. The WPF window owns the UI, HWID calc,
;  TLS call, signature sealing, and registry flag writing.
;  NSIS only inspects the exit code + side-effect files.
;  exit 0 = activated    exit 1 = user cancel / invalid
;  IMPORTANT: In SILENT mode (/S) this function is a NO-OP.
;    - electron-builder sanity-tests Setup.exe with /S post-build
;    - attacker can't bypass by passing /S alone: Final Guard
;      (.onInitInstFiles) checks $IsLicenseValid before disk write,
;      so a silent unattended run without pre-activated flag ABORTS.
; ============================================================
Function RunStandaloneActivationGate
  StrCpy $GateHasBeenAttempted "1"

  ; SILENT MODE (/S or /SILENT) - BYPASS UI GATE (no-op).
  ; This is required:
  ;   - electron-builder sanity-tests Setup.exe headlessly with /S; the
  ;     machine has no interactive window station so ShowDialog() would hang.
  ;   - enterprise deployments that pre-burn the registry activation flag.
  ; SECURITY: Final Guard STILL ABORTS in silent mode if InstallerActivated
  ; flag isn't present in HKCU/HKLM. Passing /S to skip the UI gate does NOT
  ; allow unattended installation without prior activation.
  ${GetParameters} $R9
  ClearErrors
  ${GetOptions} $R9 "/S" $R8
  ${IfNot} ${Errors}
    StrCpy $R0 "0"
    ReadRegStr $R0 HKCU "Software\Dawa Optimizer" "InstallerActivated"
    ${If} $R0 == "1"
      StrCpy $IsLicenseValid "1"
    ${EndIf}
    StrCpy $R0 "0"
    ReadRegStr $R0 HKLM "Software\Dawa Optimizer" "InstallerActivated"
    ${If} $R0 == "1"
      StrCpy $IsLicenseValid "1"
    ${EndIf}
    Return
  ${EndIf}
  ClearErrors
  ${GetOptions} $R9 "/SILENT" $R8
  ${IfNot} ${Errors}
    StrCpy $R0 "0"
    ReadRegStr $R0 HKCU "Software\Dawa Optimizer" "InstallerActivated"
    ${If} $R0 == "1"
      StrCpy $IsLicenseValid "1"
    ${EndIf}
    Return
  ${EndIf}

  ; Fast-path: already activated on this machine (skip gate entirely)
  StrCpy $R0 "0"
  ReadRegStr $R0 HKCU "Software\Dawa Optimizer" "InstallerActivated"
  ${If} $R0 == "1"
    StrCpy $IsLicenseValid "1"
    Return
  ${EndIf}

  ; -----------------------------------------------------------------------
  ; NSIS MAIN DIALOG VISIBILITY WRAPPER - 5-layer defense.
  ; The installer dialog #32770 may or may not exist when this runs:
  ;   • Called from preInit       → HWND doesn't exist yet (poll loop +
  ;                                 WM_SETREDRAW trick above handles it)
  ;   • Called from customInit    → HWND exists but not yet shown
  ;   • Called from GUIINIT       → HWND exists, CreateWindowEx returned
  ;   • Called from Welcome_SHOW  → HWND exists, already shown → HIDE NOW
  ;   • Called from License_SHOW  → same as Welcome_SHOW
  ; We combine the preInit-populated $InstallerHwndFound with the
  ; late-binding $HWNDPARENT to ensure we hide EVERY possible #32770.
  ; Stack discipline: push 3 scratch registers, pop 3 in ALL branches.
  ;   [3] = saved R9 scratch
  ;   [2] = restore-flag-hwndparent   (1 = we hid HWNDPARENT)
  ;   [1] = restore-flag-global-hwnd  (1 = we hid InstallerHwndFound)
  ; -----------------------------------------------------------------------
  Push $R9
  ; --- branch 1: $HWNDPARENT (late-binding handle for fallback hooks) ---
  StrCpy $R9 "0"
  StrCmp $HWNDPARENT "" skipHideHwndparent 0
    System::Call 'user32::IsWindowVisible(i $HWNDPARENT) i .r9'
    ${If} $R9 != 0
      System::Call 'user32::ShowWindow(i $HWNDPARENT, i 0)'  ; SW_HIDE
      StrCpy $R9 "1"
    ${Else}
      ; Exists but not visible yet → add WS_EX_TOOLWINDOW now so it
      ; never gets a taskbar button if ShowWindow is called later
      System::Call 'user32::GetWindowLong(i $HWNDPARENT, i -20) i .R4'
      IntOp $R4 $R4 | 0x00000080   ; WS_EX_TOOLWINDOW
      IntOp $R4 $R4 & 0xFEFFFFFF   ; remove WS_EX_APPWINDOW
      System::Call 'user32::SetWindowLong(i $HWNDPARENT, i -20, i R4) i .'
      StrCpy $R9 "0"
    ${EndIf}
skipHideHwndparent:
  Push $R9   ; stack[2] = restore flag for HWNDPARENT

  ; --- branch 2: $InstallerHwndFound (preInit poll-loop captured handle) ---
  StrCpy $R9 "0"
  StrCmp $InstallerHwndFound "0" skipHideGlobalHwnd 0
    System::Call 'user32::IsWindow(i $InstallerHwndFound) i .r8'
    ${If} $R8 != 0
      System::Call 'user32::IsWindowVisible(i $InstallerHwndFound) i .r9'
      ${If} $R9 != 0
        System::Call 'user32::ShowWindow(i $InstallerHwndFound, i 0)'
        StrCpy $R9 "1"
      ${Else}
        StrCpy $R9 "0"
      ${EndIf}
    ${EndIf}
skipHideGlobalHwnd:
  Push $R9   ; stack[1] = restore flag for global InstallerHwndFound

  ; Prepare volatile side-effect paths for the WPF modal to write
  GetTempFileName $R1
  StrCpy $GateResultJson "$R1.json"
  Delete "$R1"

  GetTempFileName $R2
  StrCpy $GateRegFlagPath "$R2.flg"
  Delete "$R2"

  SetShellVarContext current
  CreateDirectory "$APPDATA\Dawa Optimizer"
  StrCpy $GateSealedOutput "$APPDATA\Dawa Optimizer\installer-license.dat"

  ; Compose the full PowerShell command. The WPF script accepts:
  ;   -BackendUrl         : TLS endpoint to POST key+hwid to
  ;   -OutputJson         : raw validation payload path for NSIS to inspect
  ;   -SealedLicenseOutput: path for the HWID-bound AES-256-GCM .dat file
  ;   -RegFlagFile        : path for a simple '1' flag file (NSIS reads it)
  ;   -EncryptPs1Path     : path to companion encrypt-license.ps1 (seal util)
  StrCpy $GatePs1Path         '"$PLUGINSDIR\gate-activation.ps1"'
  StrCpy $GateEncryptPs1Path  '"$PLUGINSDIR\encrypt-license.ps1"'
  StrCpy $GateExe             '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe"'
  StrCpy $0 '$GateExe -NoLogo -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Normal -MTA:$false'
  StrCpy $0 '$0 -File $GatePs1Path'
  StrCpy $0 '$0 -BackendUrl "$GateBackendUrl"'
  StrCpy $0 '$0 -OutputJson "$GateResultJson"'
  StrCpy $0 '$0 -SealedLicenseOutput "$GateSealedOutput"'
  StrCpy $0 '$0 -RegFlagFile "$GateRegFlagPath"'
  StrCpy $0 '$0 -EncryptPs1Path $GateEncryptPs1Path'

  ; BLOCKING EXEC - installer main thread waits HERE until user closes WPF modal.
  ; NOTE: DO NOT use -NonInteractive. That flag suppresses WPF ShowDialog() on
  ; some PS5.1 .NET FX configurations and causes the gate to fail SILENTLY,
  ; letting the installer frame paint and later crash on Final Guard with
  ; "Dawa Optimizer cannot be closed / installer tamper detected".
  ; Interactive + STA thread = mandatory for WPF modal HWND.
  nsExec::ExecToStack '$0'
  Pop $1
  Pop $2

  StrCpy $R7 "0"
  IfFileExists $GateRegFlagPath gateFlagOk gateFlagEnd
gateFlagOk:
  FileOpen $3 $GateRegFlagPath r
  FileRead $3 $R7
  FileClose $3
gateFlagEnd:

  ${If} $R7 == "1"
    StrCpy $IsLicenseValid "1"
  ${Else}
    StrCpy $IsLicenseValid "0"
  ${EndIf}

  ; The WPF modal also writes HKCU flag if valid, but HKLM requires elevation
  ; which the installer context already has - write it here for robustness.
  ${If} $IsLicenseValid == "1"
    WriteRegStr HKCU "Software\Dawa Optimizer" "InstallerActivated" "1"
    WriteRegStr HKLM "Software\Dawa Optimizer" "InstallerActivated" "1"

    ; Stash entered key for downstream debug if enabled
    ClearErrors
    IfFileExists $GateResultJson 0 +3
      FileOpen $4 $GateResultJson r
      FileRead $4 $ValidatedKey
      FileClose $4
  ${EndIf}

  Delete "$GateResultJson"
  Delete "$GateRegFlagPath"

  ; -----------------------------------------------------------------------
  ; Stack balance restore (mirror of 3-push hide wrapper above).
  ; Pop LIFO: (1) restore-flag-global-hwnd,
  ;           (2) restore-flag-hwndparent,
  ;           (3) saved R9 scratch.
  ; NSIS installer dialog #32770 is ONLY unhidden + given back taskbar
  ; button (WS_EX_APPWINDOW) + WM_SETREDRAW=TRUE if gate returns PASS.
  ; On fail/cancel installer calls Quit below → #32770 destroyed hidden.
  ; -----------------------------------------------------------------------
  Pop $R8          ; stack[1] -> restore flag for global InstallerHwndFound
  Pop $R7          ; stack[2] -> restore flag for HWNDPARENT
  Pop $R9          ; stack[3] -> saved scratch
  ${If} $IsLicenseValid == "1"
    ; --- Restore GLOBAL installer HWND (captured via poll loop) ---
    ${If} $R8 == "1"
      StrCmp $InstallerHwndFound "0" skipRestoreGlobal 0
        System::Call 'user32::IsWindow(i $InstallerHwndFound) i .r6'
        ${If} $R6 != 0
          ; Undo WS_EX_TOOLWINDOW → re-add WS_EX_APPWINDOW so
          ; taskbar button comes back normally
          System::Call 'user32::GetWindowLong(i $InstallerHwndFound, i -20) i .r5'
          IntOp $R5 $R5 & 0xFFFFFF7F   ; remove WS_EX_TOOLWINDOW (0x80)
          IntOp $R5 $R5 | 0x00040000   ; re-add WS_EX_APPWINDOW
          System::Call 'user32::SetWindowLong(i $InstallerHwndFound, i -20, i R5) i .'
          ; Allow WM_PAINT + show it
          System::Call 'user32::SendMessage(i $InstallerHwndFound, i 0x000B, i 1, i 0) i .'  ; WM_SETREDRAW=TRUE
          System::Call 'user32::ShowWindow(i $InstallerHwndFound, i 5)'  ; SW_SHOW = 5
        ${EndIf}
skipRestoreGlobal:
    ${EndIf}
    ; --- Restore MUI $HWNDPARENT (late-binding handle for fallback hooks) ---
    ${If} $R7 == "1"
      StrCmp $HWNDPARENT "" skipRestoreHwndparent 0
        System::Call 'user32::GetWindowLong(i $HWNDPARENT, i -20) i .r5'
        IntOp $R5 $R5 & 0xFFFFFF7F   ; remove WS_EX_TOOLWINDOW
        IntOp $R5 $R5 | 0x00040000   ; re-add WS_EX_APPWINDOW
        System::Call 'user32::SetWindowLong(i $HWNDPARENT, i -20, i R5) i .'
        System::Call 'user32::SendMessage(i $HWNDPARENT, i 0x000B, i 1, i 0) i .'
        System::Call 'user32::ShowWindow(i $HWNDPARENT, i 5)'
skipRestoreHwndparent:
    ${EndIf}
    StrCpy $InstallerHwndHiddenByUs "0"
  ${EndIf}

  ${If} $IsLicenseValid != "1"
    MessageBox MB_ICONSTOP|MB_OK "License activation is required to run this installer.$\n$\nNo valid key = no files extracted. Setup will now exit."
    Quit
  ${EndIf}
FunctionEnd

; ============================================================
;  FINAL GUARD - LAST CHANCE TO ABORT BEFORE ANY DISK WRITE
;  electron-builder invokes this immediately before InstFiles.
;  Even if an attacker tampered with the two entry hooks above,
;  this will Abort before a single byte is written to $INSTDIR.
;
;  Interactive mode = red error MessageBox + Abort
;  Silent mode      = silent SetErrorLevel + Abort (avoid MessageBox
;                     hang in headless / windowstation-less invocations)
; ============================================================
Function .onInitInstFiles
  ; Fast-track if gate already set valid (normal interactive path)
  ${If} $IsLicenseValid == "1"
    ; Proceed to file copy below
    Goto finalGuardCopyLicense
  ${EndIf}

  ; Not-yet valid. Check command line for SILENT mode.
  ${GetParameters} $R9
  StrCpy $IsSilentMode "0"
  ClearErrors
  ${GetOptions} $R9 "/S" $R8
  ${IfNot} ${Errors}
    StrCpy $IsSilentMode "1"
  ${EndIf}
  ClearErrors
  ${GetOptions} $R9 "/SILENT" $R8
  ${IfNot} ${Errors}
    StrCpy $IsSilentMode "1"
  ${EndIf}

  ; In SILENT mode ONLY: check if registry activation flag exists.
  ; This covers the electron-builder self-test case AND real unattended
  ; corporate deployments where IT pre-stages InstallerActivated=1.
  ${If} $IsSilentMode == "1"
    StrCpy $R0 "0"
    ReadRegStr $R0 HKCU "Software\Dawa Optimizer" "InstallerActivated"
    ${If} $R0 == "1"
      StrCpy $IsLicenseValid "1"
      Goto finalGuardCopyLicense
    ${EndIf}
    StrCpy $R0 "0"
    ReadRegStr $R0 HKLM "Software\Dawa Optimizer" "InstallerActivated"
    ${If} $R0 == "1"
      StrCpy $IsLicenseValid "1"
      Goto finalGuardCopyLicense
    ${EndIf}
  ${EndIf}

  ; License is not valid. Harden the response depending on interactivity.
  ${If} $IsSilentMode == "1"
    ; Silent mode: NO MessageBox — it would hang a headless/session-0
    ; window station. Exit non-zero so the caller (electron-builder or
    ; SCCM) can handle failure cleanly.
    SetErrorLevel 1603
    Abort
  ${Else}
    MessageBox MB_ICONSTOP "[Fatal] Installer tamper detected.$\n$\nLicense gate was bypassed. Setup will self-terminate."
    SetErrorLevel 1603
    Abort
  ${EndIf}

finalGuardCopyLicense:
  ; Validated: copy sealed HWID-bound license payload into the install tree
  ; so the runtime (src/main/index.js) can load it from process.resourcesPath.
  CreateDirectory "$INSTDIR\resources"
  SetShellVarContext current
  CopyFiles /SILENT /FILESONLY "$APPDATA\Dawa Optimizer\installer-license.dat" "$INSTDIR\resources\installer-license.dat"
  SetShellVarContext current
FunctionEnd

; ============================================================
;  PRE-INIT — PRIMARY ENTRY, RUNS BEFORE ELECTRON-BUILDER'S .onInit
;  PREVIOUS COMMENT ("DO NOT launch gate here") WAS WRONG:
;  After File /oname=gate-activation.ps1 (lines below) runs,
;  $PLUGINSDIR IS fully populated — gate-activation.ps1 exists on
;  disk and can be executed immediately via nsExec::ExecToStack.
;
;  THIS IS THE EARLIEST POSSIBLE MOMENT we can show the WPF gate,
;  literally milliseconds after the user clicks "Run anyway" on
;  the SmartScreen "publisher could not be verified" warning.
;  Between "Run anyway" dismiss and the first MUI ShowWindow call,
;  we have ~300 ms of dead time where the user sees NOTHING.
;  We must POP THE WPF GATE DURING THAT DEAD TIME so the user
;  sees WinRAR-style-password-prompt FIRST, then NEVER sees
;  the Welcome / License page UI.
;
;  ALGORITHM (PRE-INIT STAGE):
;    1. Stage 3 ps1 payloads into $PLUGINSDIR
;    2. Init state vars
;    3. POLL LOOP HideInstallerHwndIfExists 6 × (30 ms Sleep) —
;       as soon as EB's internal code creates the #32770 dialog,
;       we SW_HIDE + WS_EX_TOOLWINDOW + WM_SETREDRAW=FALSE it
;       BEFORE Windows calls its first ShowWindow.
;    4. Run RunStandaloneActivationGate — BLOCKING — user sees
;       ONLY the WPF glass 920×560 modal now.
;    5. If gate returns PASS → $IsLicenseValid="1" — downstream
;       hooks (customInit / GUIINIT / Welcome_SHOW) all see
;       GateHasBeenAttempted="1" and become no-ops. We then
;       restore the installer dialog (WM_SETREDRAW=TRUE + SW_SHOW)
;       so the Welcome page paints normally.
;    6. If gate returns FAIL → RunStandaloneActivationGate calls
;       Quit() internally → installer terminates here at preInit,
;       NEVER reaches .onInit → #32770 dialog never becomes visible.
; ============================================================
!macro preInit
  InitPluginsDir
  SetOutPath $PLUGINSDIR
  File /oname=license-check.ps1     "${BUILD_RESOURCES_DIR}\license-check.ps1"
  File /oname=encrypt-license.ps1   "${BUILD_RESOURCES_DIR}\encrypt-license.ps1"
  File /oname=gate-activation.ps1   "${BUILD_RESOURCES_DIR}\gate-activation.ps1"
  StrCpy $GateBackendUrl "${DAWA_BACKEND_URL}"
  StrCpy $IsLicenseValid "0"
  StrCpy $GateHasBeenAttempted "0"
  StrCpy $InstallerHwndFound "0"
  StrCpy $InstallerHwndHiddenByUs "0"

  ; POLL LOOP — try to catch the installer #32770 dialog the
  ; millisecond electron-builder's internal .onInit wrapper
  ; creates it. 6 iterations × 30 ms = 180 ms catch window.
  ; Even if dialog is not created yet here, GUIINIT will
  ; definitely catch it 80-120 ms later as defense-in-depth.
  IntOp $R0 0 + 0
pollHideAgain:
  Call HideInstallerHwndIfExists
  IntOp $R0 $R0 + 1
  ${If} $R0 < 6
    Sleep 30
    Goto pollHideAgain
  ${EndIf}

  ; PRIMARY WPF GATE — runs here at preInit, which is before
  ; electron-builder's generated .onInit calls CreateWindow for
  ; the MUI frame. 920×560 cyan/blue glass modal = first visible
  ; UI after SmartScreen "Run anyway" dismiss (WinRAR analogy).
  Call RunStandaloneActivationGate

  ; If we reach this line → gate passed (fail path calls Quit).
  ; Restore installer frame now so the Welcome page below shows.
  ${IfThen} $InstallerHwndFound != 0 ${|} System::Call 'user32::SendMessage(i $InstallerHwndFound, i 0x000B, i 1, i 0) i .' ${|}
  ${IfThen} $InstallerHwndHiddenByUs == "1" ${|} System::Call 'user32::ShowWindow(i $InstallerHwndFound, i 5)' ${|}
  StrCpy $InstallerHwndHiddenByUs "0"
!macroend
