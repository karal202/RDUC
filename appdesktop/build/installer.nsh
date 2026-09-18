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
;  ZERO-TRUST GATE - HOOK 3 POINTS TO ENSURE IT ALWAYS RUNS
;  1) .onInit               (earliest possible NSIS hook)
;  2) Welcome PAGE SHOW     (if electron-builder skipped .onInit override)
;  3) License PAGE SHOW     (final fallback if the above two are hijacked)
;  A guard variable prevents the modal from appearing more than once.
; ============================================================
!macro customHeader
  !define MUI_WELCOMEPAGE_CUSTOMFUNCTION_SHOW  GateEntryIfNeeded_WelcomeShow
  !define MUI_LICENSEPAGE_CUSTOMFUNCTION_SHOW  GateEntryIfNeeded_LicenseShow
  !define MUI_INSTFILESPAGE_CUSTOMFUNCTION_PRE .onInitInstFiles
  !define MUI_CUSTOMFUNCTION_GUIINIT          .onDawaGuiInitGate
!macroend

; ============================================================
;  ZERO-TRUST HOOK POINT 0.5 - GUIINIT (EXTRA FALLBACK)
;  Runs immediately after installer dialog HWND is created by
;  MUI, BEFORE any page (Welcome/License) draws its content.
;  If customInit somehow didn't fire (EB 26.x plugin-extraction
;  edge case on slow machines), this paints the installer frame
;  hidden, runs the gate, then only unhides if valid.
;  Guard variable GateHasBeenAttempted keeps this idempotent.
; ============================================================
Function .onDawaGuiInitGate
  ${If} $GateHasBeenAttempted == "1"
    Return
  ${EndIf}
  Call RunStandaloneActivationGate
FunctionEnd

; ============================================================
;  ZERO-TRUST HOOK POINT 0 - CUSTOM INIT (EARLIEST POSSIBLE)
;  Electron-builder invokes !insertmacro customInit INSIDE its
;  auto-generated Function .onInit, IMMEDIATELY after plugin
;  extraction completes and BEFORE the installer dialog frame
;  calls CreateWindow/ShowWindow. This guarantees our WPF gate
;  is the FIRST VISIBLE WINDOW the user sees (WinRAR analogy).
;
;  If user cancels WPF / invalid key -> Quit() before any NSIS
;  window is ever created -> no installer frame ever painted.
;  If gate succeeds -> $IsLicenseValid + $GateHasBeenAttempted = 1
;  When Welcome/License page_SHOW hooks fire later they detect
;  GateHasBeenAttempted=1 and simply Return (idempotent no-op).
; ============================================================
!macro customInit
  Call RunStandaloneActivationGate
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
  ; NSIS MAIN DIALOG VISIBILITY WRAPPER - defense-in-depth for page hooks.
  ; When this gate is invoked from Welcome_SHOW / License_SHOW fallback
  ; hooks (not from customInit), the installer dialog #32770 has already
  ; been painted visible. Hide it INSTANTLY so user only sees the WPF gate.
  ; Stack discipline: push 2 values -> pop 2 values in ALL exit branches.
  ;   [1] = restore flag  (1 = we hid it, need SW_SHOW restore)
  ;   [2] = saved R9 scratch register
  ; -----------------------------------------------------------------------
  Push $R9
  System::Call 'user32::IsWindowVisible(i $HWNDPARENT) i .r9'
  ${If} $R9 != 0
    System::Call 'user32::ShowWindow(i $HWNDPARENT, i 0)'   ; SW_HIDE
    Push "1"
  ${Else}
    Push "0"
  ${EndIf}

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
  ; Stack balance restore (mirror of hide wrapper above).
  ; Pop in LIFO order: (1) restore-flag, (2) saved R9 scratch.
  ; NSIS installer dialog is ONLY unhidden if gate PASSED.
  ; On failure/cancel the installer exits (Quit) below, so the NSIS
  ; window should never become visible.
  ; -----------------------------------------------------------------------
  Pop $R8
  Pop $R9
  ${If} $IsLicenseValid == "1"
    ${If} $R8 == "1"
      System::Call 'user32::ShowWindow(i $HWNDPARENT, i 5)'  ; SW_SHOW
    ${EndIf}
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
;  PRE-INIT - RUNS BEFORE ELECTRON-BUILDER'S .onInit
;  DO NOT launch the activation gate HERE — $PLUGINSDIR isn't fully
;  extracted yet and nsExec::ExecToStack can crash silent self-tests.
;  This macro only:
;    1) Stages payload scripts into $PLUGINSDIR
;    2) Initializes guard variables.
;  Gate execution (the standalone WPF modal) is launched from:
;    -> MUI_WELCOMEPAGE_CUSTOMFUNCTION_SHOW (primary)
;    -> MUI_LICENSEPAGE_CUSTOMFUNCTION_SHOW  (fallback if Welcome is skipped)
;  Both hooks fire AFTER installer HWND exists and plugins are extracted.
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
!macroend
