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
;  RUNTIME STATE VARS — MUST BE DECLARED BEFORE ANY FUNCTION /
;  MACRO THAT REFERENCES THEM.  NSIS 3.x triggers warning 6000
;  ("unknown variable") if a macro / function body is parsed
;  before the global Var statements are reached.
; ============================================================
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
Var InstallerHwndFound
Var InstallerHwndHiddenByUs

; Default backend fallback (must be set BEFORE any gate macro inlines the URL)
!ifndef DAWA_BACKEND_URL
!define DAWA_BACKEND_URL "https://rduc.onrender.com/api/license/validate"
!endif

; ============================================================
;  ZERO-TRUST GATE - HOOK 5 POINTS, PRE-INIT = PRIMARY
;  1) preInit                       (EARLIEST — RIGHT AFTER Run anyway click)
;  2) HideInstallerHwndIfExists     (poll loop + HWND strip WS_EX_APPWINDOW)
;  3) customInit (.onInit)          (fallback if preInit somehow skipped)
;  4) GUIINIT                       (extra fallback, HWND now exists)
;  5) Welcome_SHOW / License_SHOW   (final fallback if all above were hijacked)
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
;  GLOBAL HIDE-INSTALLER-HWND — CALLED FROM POLL LOOP + HOOKS
;  Purpose: force the MUI installer #32770 dialog to remain
;  INVISIBLE from the moment its HWND is created by the inner
;  electron-builder .onInit wrapper.  Even 1 frame of visible
;  Welcome page before the WPF gate appears breaks the WinRAR
;  password-prompt UX contract.
;
;  Steps applied (when a matching #32770 of THIS process is found):
;    1. ShowWindow(SW_HIDE)                          <- most important
;    2. SetWindowLong(GWL_EXSTYLE): | WS_EX_TOOLWINDOW, & ~WS_EX_APPWINDOW
;        -> window NEVER appears in Alt-Tab list / taskbar
;    3. SendMessage(WM_SETREDRAW=FALSE)              -> suppress pending WM_PAINT
;    4. Remember HWND + restore flag in global vars
; ============================================================
Function HideInstallerHwndIfExists
  System::Call 'user32::FindWindow(t "#32770", p 0) i .R0'
  ${If} $R0 != 0
    System::Call 'user32::GetWindowThreadProcessId(i R0, *i .R1) i .R2'
    System::Call 'kernel32::GetCurrentProcessId() i .R3'
    ${If} $R1 == $R3
      StrCpy $InstallerHwndFound $R0
      System::Call 'user32::ShowWindow(i R0, i 0)'
      System::Call 'user32::GetWindowLong(i R0, i -20) i .R4'
      IntOp $R4 $R4 | 0x00000080
      IntOp $R4 $R4 & 0xFEFFFFFF
      System::Call 'user32::SetWindowLong(i R0, i -20, i R4) i .'
      System::Call 'user32::SendMessage(i R0, i 0x000B, i 0, i 0) i .'
      StrCpy $InstallerHwndHiddenByUs "1"
    ${EndIf}
  ${EndIf}
FunctionEnd

; ============================================================
;  ZERO-TRUST HOOK POINT 0.75 - GUIINIT (EXTRA FALLBACK)
;  Runs immediately after installer dialog HWND is created by
;  MUI, BEFORE any page (Welcome/License) draws its content.
;  If preInit somehow didn't catch it, this is the final chance
;  to SW_HIDE the frame BEFORE first WM_PAINT + then run gate.
; ============================================================
Function .onDawaGuiInitGate
  Call HideInstallerHwndIfExists
  ${If} $GateHasBeenAttempted == "1"
    ${If} $IsLicenseValid == "1"
      ${If} $InstallerHwndFound != 0
        System::Call 'user32::SendMessage(i $InstallerHwndFound, i 0x000B, i 1, i 0) i .'
      ${EndIf}
      ${If} $InstallerHwndHiddenByUs == "1"
        System::Call 'user32::ShowWindow(i $InstallerHwndFound, i 5)'
        StrCpy $InstallerHwndHiddenByUs "0"
      ${EndIf}
    ${EndIf}
    Return
  ${EndIf}
  Call RunStandaloneActivationGate
FunctionEnd

; ============================================================
;  ZERO-TRUST HOOK POINT 0.5 - CUSTOM INIT (.onInit fallback)
;  Electron-builder invokes !insertmacro customInit INSIDE its
;  auto-generated Function .onInit.  If preInit gate failed to
;  run (edge case on very old Windows), we repeat here.
; ============================================================
!macro customInit
  Call HideInstallerHwndIfExists
  ${If} $GateHasBeenAttempted == "0"
    Call RunStandaloneActivationGate
  ${ElseIf} $IsLicenseValid == "1"
    ${If} $InstallerHwndFound != 0
      System::Call 'user32::SendMessage(i $InstallerHwndFound, i 0x000B, i 1, i 0) i .'
    ${EndIf}
    ${If} $InstallerHwndHiddenByUs == "1"
      System::Call 'user32::ShowWindow(i $InstallerHwndFound, i 5)'
      StrCpy $InstallerHwndHiddenByUs "0"
    ${EndIf}
  ${EndIf}
!macroend

; ============================================================
;  PAGE-SHOW FALLBACK ENFORCERS (always idempotent - safe to
;  call from 2 hooks).  If the modal was already shown or
;  license valid -> return fast.
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
;  STANDALONE WINRAR-STYLE ACTIVATION MODAL (CORE ENFORCER)
;  Spawns a completely independent WPF window (separate HWND)
;  via PowerShell. The WPF window owns the UI, HWID calc,
;  TLS call, signature sealing, and registry flag writing.
;  NSIS only inspects the exit code + side-effect files.
;    exit 0 = activated    exit 1 = user cancel / invalid
;  IMPORTANT: In SILENT mode (/S) this function is a NO-OP.
;    - electron-builder sanity-tests Setup.exe with /S post-build
;    - attacker can't bypass by passing /S alone: Final Guard
;      (.onInitInstFiles) checks $IsLicenseValid before disk write.
; ============================================================
Function RunStandaloneActivationGate
  StrCpy $GateHasBeenAttempted "1"

  ; SILENT MODE (/S or /SILENT) - BYPASS UI GATE (no-op), but
  ; verify InstallerActivated registry flag first.  Headless
  ; /S invocations (electron-builder self-test, SCCM enterprise
  ; deployments) do not have an interactive window station so
  ; WPF ShowDialog() would hang forever.
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

  ; ---------------------------------------------------------------------
  ; NSIS MAIN DIALOG VISIBILITY WRAPPER - 2-handle coverage.
  ; The installer dialog #32770 may or may not exist when this runs:
  ;   • preInit       → HWND doesn't exist yet  (poll loop handles it)
  ;   • customInit    → HWND exists but not yet shown
  ;   • GUIINIT       → CreateWindowEx returned, WM_PAINT queued
  ;   • Welcome_SHOW  → HWND exists and IS visible -> HIDE NOW
  ;   • License_SHOW  → same as Welcome_SHOW
  ; We combine both HWND sources (global $InstallerHwndFound + MUI's
  ; late-binding $HWNDPARENT) to hide EVERY possible #32770 instance.
  ;
  ; Stack discipline: push 3, pop 3 in EVERY exit branch.
  ;   [3] = saved scratch R9
  ;   [2] = restore flag (1 = we hid HWNDPARENT explicitly)
  ;   [1] = restore flag (1 = we hid global InstallerHwndFound)
  ; ---------------------------------------------------------------------
  Push $R9

  ; --- branch 1: $HWNDPARENT (late-binding handle for page_SHOW hooks) ---
  StrCpy $R9 "0"
  StrCmp $HWNDPARENT "" skipHideHwndparent 0
    System::Call 'user32::IsWindowVisible(i $HWNDPARENT) i .r9'
    ${If} $R9 != 0
      System::Call 'user32::ShowWindow(i $HWNDPARENT, i 0)'
      StrCpy $R9 "1"
    ${Else}
      System::Call 'user32::GetWindowLong(i $HWNDPARENT, i -20) i .R4'
      IntOp $R4 $R4 | 0x00000080
      IntOp $R4 $R4 & 0xFEFFFFFF
      System::Call 'user32::SetWindowLong(i $HWNDPARENT, i -20, i R4) i .'
      StrCpy $R9 "0"
    ${EndIf}
skipHideHwndparent:
  Push $R9

  ; --- branch 2: $InstallerHwndFound (preInit poll-loop captured) ---
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
  Push $R9

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

  ; Compose the full PowerShell command.
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

  ; BLOCKING EXEC - installer main thread waits HERE until user closes WPF.
  ; DO NOT use -NonInteractive: it suppresses WPF ShowDialog() on some
  ; PS5.1 / .NET FX 4.x configs and causes the gate to fail SILENTLY,
  ; letting the installer frame paint and later crash on Final Guard with
  ; "installer tamper detected".  Interactive + STA = mandatory for WPF.
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

  ; WPF modal already wrote HKCU flag for success.  HKLM requires elevation
  ; which the installer context already has - write here for robustness.
  ${If} $IsLicenseValid == "1"
    WriteRegStr HKCU "Software\Dawa Optimizer" "InstallerActivated" "1"
    WriteRegStr HKLM "Software\Dawa Optimizer" "InstallerActivated" "1"
    ClearErrors
    IfFileExists $GateResultJson 0 +3
      FileOpen $4 $GateResultJson r
      FileRead $4 $ValidatedKey
      FileClose $4
  ${EndIf}

  Delete "$GateResultJson"
  Delete "$GateRegFlagPath"

  ; ---------------------------------------------------------------------
  ; Stack balance restore (mirror of 3-push hide wrapper above).
  ; Pop LIFO order:
  ;   (1) restore-flag-global-hwnd   -> $R8
  ;   (2) restore-flag-hwndparent    -> $R7
  ;   (3) saved scratch R9           -> $R9
  ; Dialog #32770 is ONLY unhidden + re-added to taskbar (WS_EX_APPWINDOW)
  ; + WM_SETREDRAW=TRUE IF gate returned PASS.  On fail/cancel we Quit,
  ; destroying the hidden HWND without ever painting it visible.
  ; ---------------------------------------------------------------------
  Pop $R8
  Pop $R7
  Pop $R9

  ${If} $IsLicenseValid == "1"
    ; --- Restore GLOBAL installer HWND (preInit poll-loop handle) ---
    ${If} $R8 == "1"
      StrCmp $InstallerHwndFound "0" skipRestoreGlobal 0
        System::Call 'user32::IsWindow(i $InstallerHwndFound) i .r6'
        ${If} $R6 != 0
          System::Call 'user32::GetWindowLong(i $InstallerHwndFound, i -20) i .r5'
          IntOp $R5 $R5 & 0xFFFFFF7F
          IntOp $R5 $R5 | 0x00040000
          System::Call 'user32::SetWindowLong(i $InstallerHwndFound, i -20, i R5) i .'
          System::Call 'user32::SendMessage(i $InstallerHwndFound, i 0x000B, i 1, i 0) i .'
          System::Call 'user32::ShowWindow(i $InstallerHwndFound, i 5)'
        ${EndIf}
skipRestoreGlobal:
    ${EndIf}
    ; --- Restore MUI $HWNDPARENT (late-binding handle for fallback hooks) ---
    ${If} $R7 == "1"
      StrCmp $HWNDPARENT "" skipRestoreHwndparent 0
        System::Call 'user32::GetWindowLong(i $HWNDPARENT, i -20) i .r5'
        IntOp $R5 $R5 & 0xFFFFFF7F
        IntOp $R5 $R5 | 0x00040000
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
;    Interactive mode = red error MessageBox + Abort
;    Silent mode      = silent SetErrorLevel + Abort
; ============================================================
Function .onInitInstFiles
  ${If} $IsLicenseValid == "1"
    Goto finalGuardCopyLicense
  ${EndIf}

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

  ${If} $IsSilentMode == "1"
    SetErrorLevel 1603
    Abort
  ${Else}
    MessageBox MB_ICONSTOP "[Fatal] Installer tamper detected.$\n$\nLicense gate was bypassed. Setup will self-terminate."
    SetErrorLevel 1603
    Abort
  ${EndIf}

finalGuardCopyLicense:
  CreateDirectory "$INSTDIR\resources"
  SetShellVarContext current
  CopyFiles /SILENT /FILESONLY "$APPDATA\Dawa Optimizer\installer-license.dat" "$INSTDIR\resources\installer-license.dat"
  SetShellVarContext current
FunctionEnd

; ============================================================
;  PRE-INIT — PRIMARY ENTRY, RUNS BEFORE ELECTRON-BUILDER'S .onInit
;  THE OLD COMMENT ("DO NOT launch gate here") WAS WRONG:
;  immediately after File /oname=gate-activation.ps1 (below)
;  runs, $PLUGINSDIR IS fully populated — gate-activation.ps1
;  is on disk and nsExec::ExecToStack can call it successfully.
;
;  THIS IS THE EARLIEST POSSIBLE MOMENT to show the WPF gate,
;  literally milliseconds after the user dismisses the SmartScreen
;  "publisher could not be verified" warning by clicking
;  "Run anyway".  Between the dismiss and the first MUI ShowWindow
;  call there is ~300 ms of dead time.  We POP THE GATE during
;  that dead window so the user sees ONLY the WPF modal first
;  (WinRAR password-prompt UX), then never sees Welcome page UI
;  unless the gate returns PASS.
;
;  ALGORITHM:
;    1. Stage 3 payload ps1 files into $PLUGINSDIR
;    2. Init global state vars to defaults
;    3. POLL LOOP (6 iter × 30 ms = 180 ms catch window)
;       → call HideInstallerHwndIfExists → as soon as EB's inner
;         .onInit creates dialog #32770 we SW_HIDE + strip taskbar
;         + WM_SETREDRAW=FALSE it BEFORE Windows ShowWindow.
;    4. Run StandaloneActivationGate BLOCKING → user interacts
;       with ONLY the 920×560 glass WPF modal.
;    5. PASS → $IsLicenseValid=1, downstream hooks no-op
;       → restore installer frame so Welcome page paints.
;    6. FAIL → RunStandaloneActivationGate calls Quit internally.
;       → installer terminates at preInit, NEVER reaches .onInit
;       → #32770 dialog never becomes visible to the user.
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

  ; 180 ms catch window (6 × 30 ms sleep).  If electron-builder's
  ; inner wrapper has not yet created #32770 by the time we exit
  ; this loop, .onDawaGuiInitGate (GUIINIT hook) will definitely
  ; catch it another ~100 ms later as a defense-in-depth layer.
  IntOp $R0 0 + 0
pollHideAgain:
  Call HideInstallerHwndIfExists
  IntOp $R0 $R0 + 1
  ${If} $R0 < 6
    Sleep 30
    Goto pollHideAgain
  ${EndIf}

  ; PRIMARY WPF GATE — BLOCKING — 920×560 cyan/blue glass modal.
  Call RunStandaloneActivationGate

  ; If we reach here gate returned PASS (fail path calls Quit above).
  ; Restore installer frame visibility + WM_SETREDRAW now.
  ${If} $InstallerHwndFound != 0
    System::Call 'user32::SendMessage(i $InstallerHwndFound, i 0x000B, i 1, i 0) i .'
  ${EndIf}
  ${If} $InstallerHwndHiddenByUs == "1"
    System::Call 'user32::ShowWindow(i $InstallerHwndFound, i 5)'
    StrCpy $InstallerHwndHiddenByUs "0"
  ${EndIf}
!macroend
