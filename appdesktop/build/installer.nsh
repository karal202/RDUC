; ====================================================================
; DAWA Optimizer - NSIS Zero-Trust Activation Gate (5-layer hooks)
; NOTE: We DO NOT declare Function .onInit ourselves. electron-builder
; already defines .onInit for its anti-tamper / app-info injection;
; redefining it aborts makensis.exe with "Function .onInit already
; exists" fatal. Our earliest hook is MyGUIINIT (GUIINIT custom fn),
; followed by Welcome/License page pre-functions, final guard in
; .onInstProgress.
;
; CRITICAL NSIS LABEL RULE (enforced in this rewrite):
;   All NSIS labels are GLOBAL scope — can only be declared ONCE.
;   !insertmacro TEXTUALLY PASTES the macro body into each call site.
;   Therefore:
;     • NO labels allowed inside !macro bodies (they would duplicate).
;     • All code that needs labels MUST live inside a standalone
;       Function DawaFn_* declared ONCE. Macro wrappers only Call it.
;     • Exception: DawaPurgeStaleActivationFlag has ZERO labels →
;       perfectly safe to !insertmacro anywhere.
; ====================================================================

; --------------------------------------------------------------------
; Variable declarations (top-level to avoid warning 6000).
; $PROGRAMDATA is NOT a built-in NSIS var — only $APPDATA is. Use
; ReadEnvStr "PROGRAMDATA" at runtime (usually C:\ProgramData).
; --------------------------------------------------------------------
Var /GLOBAL GateAlreadyRan
Var /GLOBAL InstallerDirName
Var /GLOBAL SealedLicenseSrcPath
Var /GLOBAL AppDataLicenseDir
Var /GLOBAL AppDataLicensePath
Var /GLOBAL ProgramDataDir
Var /GLOBAL ProgramDataLicenseDir
Var /GLOBAL ProgramDataLicensePath

; ====================================================================
; PURGE MACRO (SAFE — ZERO LABELS):
;   Deletes stale InstallerActivated cross-session flags BEFORE any
;   gate logic runs on a fresh Setup.exe launch. Zero-Trust rule:
;   new Setup launch = user MUST re-pass WPF gate; registry flag is
;   only trusted for (.onInstProgress pre-extract guard + runtime
;   app startup check), NOT for skipping the install-time gate.
; ====================================================================
!macro DawaPurgeStaleActivationFlag
  StrCpy $InstallerDirName "Dawa Optimizer"
  DeleteRegValue HKCU "Software\$InstallerDirName" "InstallerActivated"
  DeleteRegValue HKLM "Software\$InstallerDirName" "InstallerActivated"
  StrCpy $0 "$APPDATA\$InstallerDirName\.InstallerActivated"
  Delete $0
!macroend

; ====================================================================
; FUNCTION 1 of 3 (DECL ONCE, LABELS SAFE INSIDE):
;   DawaFn_EnsureGatePs1InPluginsdir
;   electron-builder only auto-copies icon/license/DLL plugins into
;   $PLUGINSDIR during makensis; loose build/*.ps1 are silently
;   ignored so gate-activation.ps1 was missing at runtime → WPF
;   never painted. We File-copy both ps1s explicitly from
;   BUILD_RESOURCES_DIR (electron-builder passes this via /D).
; ====================================================================
Function DawaFn_EnsureGatePs1InPluginsdir
  SetOutPath $PLUGINSDIR
  File /oname=$PLUGINSDIR\gate-activation.ps1  "${BUILD_RESOURCES_DIR}\gate-activation.ps1"
  ; encrypt-license.ps1 is side-by-side required by gate-activation.ps1
  ; when its EncryptPs1Path param is empty (the default).
  IfFileExists "${BUILD_RESOURCES_DIR}\encrypt-license.ps1" 0 DawaPsCopyDone
  File /oname=$PLUGINSDIR\encrypt-license.ps1 "${BUILD_RESOURCES_DIR}\encrypt-license.ps1"
DawaPsCopyDone:
FunctionEnd
!macro DawaEnsureGatePs1InPluginsdir
  Call DawaFn_EnsureGatePs1InPluginsdir
!macroend

; ====================================================================
; FUNCTION 2 of 3 (DECL ONCE, LABELS SAFE INSIDE):
;   DawaFn_BlockUnattendedSilent
;   Repack/crack wrappers often run "Setup.exe /S" to skip every
;   interactive page entirely (including the WPF activation window).
;   Zero-Trust hard-stop: walk $CMDLINE char-by-char for /S -S /silent
;   /SILENT /VERYSILENT /verysilent variations (case-insensitive);
;   if anything matches → IMMEDIATE Quit (0 bytes extracted).
; ====================================================================
Function DawaFn_BlockUnattendedSilent
  Push $R0
  Push $R1
  StrCpy $R0 $CMDLINE
  StrCmp $R0 "" DawaSilentCheckDone DawaSilentLoop
DawaSilentLoop:
  StrCmp $R0 "" DawaSilentCheckDone
  StrCpy $R1 $R0 1 ""
  StrCmp $R1 "/" DawaSilentMaybeFlag DawaSilentNotSlash1
  Goto DawaSilentMaybeFlag
DawaSilentNotSlash1:
  StrCmp $R1 "-" DawaSilentMaybeFlag DawaSilentCharNext
DawaSilentMaybeFlag:
  ; First: 2-char short forms /S /s -S -s
  StrCpy $R1 $R0 2 ""
  StrCmp $R1 "/S" DawaSilentAbort DawaSilentMaybeShort2
DawaSilentMaybeShort2:
  StrCmp $R1 "/s" DawaSilentAbort DawaSilentMaybeShort3
DawaSilentMaybeShort3:
  StrCmp $R1 "-S" DawaSilentAbort DawaSilentMaybeShort4
DawaSilentMaybeShort4:
  StrCmp $R1 "-s" DawaSilentAbort DawaSilentMaybeLong1
DawaSilentMaybeLong1:
  ; 7-char: /SILENT /silent
  StrCpy $R1 $R0 7 ""
  StrCmp $R1 "/SILENT" DawaSilentAbort DawaSilentMaybeLong2
DawaSilentMaybeLong2:
  StrCmp $R1 "/silent" DawaSilentAbort DawaSilentMaybeLong3
DawaSilentMaybeLong3:
  ; 11-char: /VERYSILENT /verysilent
  StrCpy $R1 $R0 11 ""
  StrCmp $R1 "/VERYSILENT" DawaSilentAbort DawaSilentMaybeLong4
DawaSilentMaybeLong4:
  StrCmp $R1 "/verysilent" DawaSilentAbort DawaSilentCharNext
DawaSilentCharNext:
  StrCpy $R0 $R0 "" 1
  Goto DawaSilentLoop
DawaSilentAbort:
  Pop $R1
  Pop $R0
  Quit
DawaSilentCheckDone:
  Pop $R1
  Pop $R0
FunctionEnd
!macro DawaBlockUnattendedSilent
  Call DawaFn_BlockUnattendedSilent
!macroend

; ====================================================================
; FUNCTION 3 of 3 (DECL ONCE, LABELS SAFE INSIDE):
;   DawaFn_ActivationGate
;   Per-session fast-path only (cross-session registry skip removed).
;   Spawns gate-activation.ps1 via nsExec::ExecToStack using explicit
;   powershell.exe flags: -NoLogo -NoProfile -STA -ExecutionPolicy Bypass.
;   CRITICALLY: -NonInteractive is OMITTED (PS5.1 suppresses STA WPF
;   toplevels under that flag — documented session-1 hard blocker).
;   Exit 0 → copy SSO license 2 mirrors.
;   Any other exit → Quit (no ActivationModal fallback later).
; ====================================================================
Function DawaFn_ActivationGate
  StrCpy $InstallerDirName "Dawa Optimizer"

  ; Per-session fast-path only (never skip cross-session via registry)
  StrCmp $GateAlreadyRan "1" DawaGatePassed DawaGateRunWPF

DawaGateRunWPF:
  ; Silent/unattended wrapper hard-stop (re-checked inside every
  ; layered hook — even if a repacker somehow bypasses GUIINIT).
  Call DawaFn_BlockUnattendedSilent
  ; Ensure ps1 files definitely exist in $PLUGINSDIR. Idempotent:
  ; first GUIINIT hook stages them; later hooks also Call just in
  ; case a repacker mangles init order.
  Call DawaFn_EnsureGatePs1InPluginsdir

  ; Resolve PROGRAMDATA from environment (NSIS has no built-in var).
  ReadEnvStr $ProgramDataDir "PROGRAMDATA"
  StrCmp $ProgramDataDir "" DawaGateUseFallbackProgramData DawaGateHaveProgramData
DawaGateUseFallbackProgramData:
  StrCpy $ProgramDataDir "C:\ProgramData"
DawaGateHaveProgramData:

  ; Build the 2 install-time SSO license mirror paths. Order exactly
  ; matches Electron runtime INSTALLER_LICENSE_CANDIDATES in
  ; src/main/index.js: (1) $APPDATA primary (2) $PROGRAMDATA fallback
  ; (3) $INSTDIR\resources (staged later inside .onInstProgress only
  ; after extract actually begins — we don't have $INSTDIR here yet).
  StrCpy $AppDataLicenseDir      "$APPDATA\$InstallerDirName"
  StrCpy $AppDataLicensePath     "$AppDataLicenseDir\installer-license.dat"
  StrCpy $ProgramDataLicenseDir  "$ProgramDataDir\$InstallerDirName"
  StrCpy $ProgramDataLicensePath "$ProgramDataLicenseDir\installer-license.dat"

  ; IMPORTANT: gate-activation.ps1 top param() block declares BackendUrl
  ; Mandatory=$false with 2-layer default ($env:BACKEND_URL → hardcoded
  ; https://rduc.onrender.com/api/license/validate) so installer does NOT
  ; pass a long URL on the command line — only the 3 mandatory positional
  ; args that PS1 requires: OutputJson SealedLicenseOutput RegFlagFile.
  InitPluginsDir
  nsExec::ExecToStack 'powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -File "$PLUGINSDIR\gate-activation.ps1" -OutputJson "$PLUGINSDIR\dawa-activation-result.json" -SealedLicenseOutput "$PLUGINSDIR\installer-license.dat" -RegFlagFile "$APPDATA\Dawa Optimizer\.InstallerActivated"'
  Pop $0   ; nsExec stdout tail (discarded — PS1 already wrote JSON/dat to disk)
  Pop $1   ; powershell child exit code

  StrCmp $1 "0" DawaGateCopyLicense DawaGateAbort

DawaGateCopyLicense:
  ; SSO mirror 1/2: $APPDATA (primary Electron SSO candidate)
  CreateDirectory "$AppDataLicenseDir"
  SetOverwrite on
  CopyFiles /SILENT "$PLUGINSDIR\installer-license.dat" "$AppDataLicensePath"
  ; SSO mirror 2/2: $PROGRAMDATA (cross-user fallback — even if a
  ; different Windows user launches the app later on this same box)
  CreateDirectory "$ProgramDataLicenseDir"
  CopyFiles /SILENT "$PLUGINSDIR\installer-license.dat" "$ProgramDataLicensePath"
  SetOverwrite off
  Goto DawaGatePassed

DawaGateAbort:
  ; Non-zero exit = user Escape, titlebar X, key invalid, server offline,
  ; or PS1 crash. Zero-Trust: NO second chances, NO Welcome page fallback.
  Quit

DawaGatePassed:
  StrCpy $GateAlreadyRan "1"
FunctionEnd
!macro DawaActivationGate
  Call DawaFn_ActivationGate
!macroend

; ====================================================================
; Hook #1 of 5 — EARLIEST CUSTOM HOOK POSSIBLE:
;   GUIINIT fires immediately after electron-builder's internal
;   .onInit returns, BEFORE the first pixel of NSIS chrome paints.
;   4-pass strict order:
;     (a) Purge stale cross-session InstallerActivated flags first
;     (b) Stage PS1 into $PLUGINSDIR (definitely available next)
;     (c) Block unattended silent wrappers if present
;     (d) RUN WPF ACTIVATION GATE → paints TOPMOST with
;         AttachThreadInput foreground steal right after user
;         dismisses SmartScreen "Run anyway".
; ====================================================================
Function MyGUIINIT
  !insertmacro DawaPurgeStaleActivationFlag
  Call DawaFn_EnsureGatePs1InPluginsdir
  Call DawaFn_BlockUnattendedSilent
  Call DawaFn_ActivationGate
FunctionEnd
!define MUI_CUSTOMFUNCTION_GUIINIT MyGUIINIT

; ====================================================================
; Hook #2 of 5 — Welcome page PRE + SHOW + LEAVE:
;   Catches wrapper flows where a repacker nulls GUIINIT but leaves
;   Welcome intact. If GUIINIT already passed → $GateAlreadyRan=1 →
;   3-instruction NOP (no delay, no PS respawn, user sees nothing).
; ====================================================================
Function DawaPreWelcomePage
  Call DawaFn_ActivationGate
FunctionEnd
!define MUI_WELCOMEPAGE_CUSTOMFUNCTION_PRE   DawaPreWelcomePage
!define MUI_WELCOMEPAGE_CUSTOMFUNCTION_SHOW  DawaPreWelcomePage
!define MUI_WELCOMEPAGE_CUSTOMFUNCTION_LEAVE DawaPreWelcomePage

; ====================================================================
; Hook #3 of 5 — License page PRE + SHOW + LEAVE:
;   electron-builder emits MUI_PAGE_LICENSE because electron-builder.yml
;   nsis.license = build/license_en.txt. Re-entrant cheap guard.
; ====================================================================
Function DawaPreLicensePage
  Call DawaFn_ActivationGate
FunctionEnd
!define MUI_LICENSEPAGE_CUSTOMFUNCTION_PRE   DawaPreLicensePage
!define MUI_LICENSEPAGE_CUSTOMFUNCTION_SHOW  DawaPreLicensePage
!define MUI_LICENSEPAGE_CUSTOMFUNCTION_LEAVE DawaPreLicensePage

; ====================================================================
; Hook #4 of 5 — Directory page PRE (install folder confirm screen):
;   Some crafty wrappers strip Welcome/License entirely but still let
;   Directory render. This guard catches the gap.
; ====================================================================
Function DawaPreDirectoryPage
  Call DawaFn_ActivationGate
FunctionEnd
!define MUI_DIRECTORYPAGE_CUSTOMFUNCTION_PRE DawaPreDirectoryPage

; ====================================================================
; Hook #5 of 5 — FINAL NUCLEAR GUARD (.onInstProgress):
;   Fires ONCE immediately BEFORE the FIRST byte is extracted to
;   $INSTDIR. Even if hooks 1-4 were all nopped out by a repacker,
;   this nukes: InstallerActivated flag MUST exist HKCU OR HKLM or
;   → MessageBox STOP + Abort → 0 bytes land on disk.
;   Also re-seeds SSO candidate #3 ($INSTDIR\resources\) in case
;   user wiped %APPDATA% between Setup close + first app launch.
; ====================================================================
Function .onInstProgress
  ReadRegStr $0 HKCU "Software\Dawa Optimizer" "InstallerActivated"
  StrCmp $0 "1" DawaFinalPassed DawaFinalHKLM
DawaFinalHKLM:
  ReadRegStr $0 HKLM "Software\Dawa Optimizer" "InstallerActivated"
  StrCmp $0 "1" DawaFinalPassed DawaFinalAbort
DawaFinalPassed:
  ; SSO candidate #3 replant into $INSTDIR\resources\installer-license.dat
  IfFileExists "$INSTDIR\resources\installer-license.dat" DawaFinalDone DawaFinalReplant
DawaFinalReplant:
  ReadEnvStr $ProgramDataDir "PROGRAMDATA"
  StrCmp $ProgramDataDir "" DawaFinalAltProgramData DawaFinalHaveProgramData
DawaFinalAltProgramData:
  StrCpy $ProgramDataDir "C:\ProgramData"
DawaFinalHaveProgramData:
  StrCpy $SealedLicenseSrcPath "$APPDATA\Dawa Optimizer\installer-license.dat"
  IfFileExists $SealedLicenseSrcPath 0 DawaFinalTryProgramData
  CreateDirectory "$INSTDIR\resources"
  SetOverwrite on
  CopyFiles /SILENT $SealedLicenseSrcPath "$INSTDIR\resources\installer-license.dat"
  SetOverwrite off
  Goto DawaFinalDone
DawaFinalTryProgramData:
  StrCpy $SealedLicenseSrcPath "$ProgramDataDir\Dawa Optimizer\installer-license.dat"
  IfFileExists $SealedLicenseSrcPath 0 DawaFinalDone
  CreateDirectory "$INSTDIR\resources"
  SetOverwrite on
  CopyFiles /SILENT $SealedLicenseSrcPath "$INSTDIR\resources\installer-license.dat"
  SetOverwrite off
DawaFinalDone:
  Goto DawaFinalEnd
DawaFinalAbort:
  MessageBox MB_ICONSTOP|MB_OK "Zero-Trust Gate: InstallerActivated flag missing.$\r$\nSetup was NOT run through the official activation window.$\r$\nPlease re-launch Dawa-Optimizer-Setup.exe and complete the activation step.$\r$\nNo files were extracted." /SD IDOK
  Abort "Bypassed Zero-Trust activation — no files extracted."
DawaFinalEnd:
FunctionEnd
