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
Var /GLOBAL GatePsExePath
Var /GLOBAL GatePsExeTmp0

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
;   never painted. We File-copy ALL 3 ps1 helpers explicitly from
;   BUILD_RESOURCES_DIR (electron-builder passes this via /D).
;   Files staged:
;     (1) gate-activation.ps1   → WPF XAML window + backend validate
;     (2) dawa-gate-runner.ps1  → UTF8 firewall invoker (ReadAllBytes
;                                 + UTF8.GetString + scriptblock::Create
;                                 — eliminates BOM/codepage ambiguity)
;     (3) encrypt-license.ps1   → side-by-side CBC seal helper used
;                                 by gate-activation.ps1 when param
;                                 EncryptPs1Path is empty (default).
; ====================================================================
Function DawaFn_EnsureGatePs1InPluginsdir
  SetOutPath $PLUGINSDIR
  File /oname=$PLUGINSDIR\gate-activation.ps1  "${BUILD_RESOURCES_DIR}\gate-activation.ps1"
  File /oname=$PLUGINSDIR\dawa-gate-runner.ps1 "${BUILD_RESOURCES_DIR}\dawa-gate-runner.ps1"
  File /oname=$PLUGINSDIR\icon.ico            "${BUILD_RESOURCES_DIR}\icon.ico"
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
;
;   HARD RULE 1 — WORD-BOUNDARY CHECK (eliminates false positives like
;   "-Setup.exe" being wrongly detected as silent flag "-S"):
;     • Char BEFORE the '/' or '-' that starts a candidate MUST be:
;       space | tab | double-quote | null (start of $CMDLINE)
;     • Char AFTER the last char of the matched flag MUST be:
;       space | tab | double-quote | ':' | '=' | null (end of $CMDLINE)
;
;   HARD RULE 2 — Only match if BOTH boundaries pass.
; ====================================================================
Function DawaFn_BlockUnattendedSilent
  Push $R0
  Push $R1
  Push $R2
  Push $R3
  Push $R4
  ; ───────── Registers summary ─────────
  ; $R0 = remaining CMDLINE string (we eat 1 char left per iteration)
  ; $R1 = first char of $R0 at the TOP of the loop  (= current char, NEVER overwritten)
  ; $R2 = previous char (char BEFORE $R1 across iterations; starts as SPACE = virtual boundary)
  ; $R3 = char AFTER a matched flag  (used for post-boundary check)
  ; $R4 = scratch multi-char pattern (2/7/10/11 long)  — overwritten freely
  ; ────────────────────────────────────
  StrCpy $R0 $CMDLINE
  StrCpy $R2 " "
  StrCmp $R0 "" DawaSilentCheckDone DawaSilentLoop
DawaSilentLoop:
  StrCmp $R0 "" DawaSilentCheckDone
  StrCpy $R1 $R0 1 ""   ; $R1 = current char; DO NOT overwrite $R1 later!
  ; (A) Is the current char a flag-starter?
  StrCmp $R1 "/" 0 DawaSilentNotSlash
  Goto DawaSilentCheckPrevBoundary
DawaSilentNotSlash:
  StrCmp $R1 "-" 0 DawaSilentCharNext   ; nope → move on
DawaSilentCheckPrevBoundary:
  ; (B) Char BEFORE '/-' must be whitespace / double-quote / virtual start.
  StrCmp $R2 " " DawaSilentPrevOK DawaSilentPrevChk2
DawaSilentPrevChk2:
  StrCmp $R2 "$\t" DawaSilentPrevOK DawaSilentPrevChk3
DawaSilentPrevChk3:
  StrCmp $R2 '"' DawaSilentPrevOK DawaSilentCharNext   ; not a real flag boundary → skip
DawaSilentPrevOK:
  ; ── 2-char short flags: /S /s -S -s ──
  StrCpy $R4 $R0 2 ""
  StrCmp $R4 "/S" DawaSilentPost2 DawaSilentS2a
DawaSilentS2a:
  StrCmp $R4 "/s" DawaSilentPost2 DawaSilentS2b
DawaSilentS2b:
  StrCmp $R4 "-S" DawaSilentPost2 DawaSilentS2c
DawaSilentS2c:
  StrCmp $R4 "-s" DawaSilentPost2 DawaSilentL7
DawaSilentPost2:
  StrCpy $R3 $R0 1 2
  Goto DawaSilentEvalPostBoundary
DawaSilentL7:
  ; ── 7-char /SILENT /silent -SILENT -silent ──
  StrCpy $R4 $R0 7 ""
  StrCmp $R4 "/SILENT" DawaSilentPost7 DawaSilentL7b
DawaSilentL7b:
  StrCmp $R4 "/silent" DawaSilentPost7 DawaSilentL7c
DawaSilentL7c:
  StrCmp $R4 "-SILENT" DawaSilentPost7 DawaSilentL7d
DawaSilentL7d:
  StrCmp $R4 "-silent" DawaSilentPost7 DawaSilentL10
DawaSilentPost7:
  StrCpy $R3 $R0 1 7
  Goto DawaSilentEvalPostBoundary
DawaSilentL10:
  ; ── 10-char /NORESTART /norestart -NORESTART -norestart ──
  StrCpy $R4 $R0 10 ""
  StrCmp $R4 "/NORESTART" DawaSilentPost10 DawaSilentL10b
DawaSilentL10b:
  StrCmp $R4 "/norestart" DawaSilentPost10 DawaSilentL10c
DawaSilentL10c:
  StrCmp $R4 "-NORESTART" DawaSilentPost10 DawaSilentL10d
DawaSilentL10d:
  StrCmp $R4 "-norestart" DawaSilentPost10 DawaSilentL11
DawaSilentPost10:
  StrCpy $R3 $R0 1 10
  Goto DawaSilentEvalPostBoundary
DawaSilentL11:
  ; ── 11-char /VERYSILENT /verysilent -VERYSILENT -verysilent ──
  StrCpy $R4 $R0 11 ""
  StrCmp $R4 "/VERYSILENT" DawaSilentPost11 DawaSilentL11b
DawaSilentL11b:
  StrCmp $R4 "/verysilent" DawaSilentPost11 DawaSilentL11c
DawaSilentL11c:
  StrCmp $R4 "-VERYSILENT" DawaSilentPost11 DawaSilentL11d
DawaSilentL11d:
  StrCmp $R4 "-verysilent" DawaSilentPost11 DawaSilentCharNext
DawaSilentPost11:
  StrCpy $R3 $R0 1 11
  Goto DawaSilentEvalPostBoundary
DawaSilentEvalPostBoundary:
  ; $R3 = char AFTER last flag char. Must be WS / " / : / = / NULL (end of string).
  StrCmp $R3 "" DawaSilentAbort DawaSilentPostP1   ; NULL → end of cmdline
DawaSilentPostP1:
  StrCmp $R3 " " DawaSilentAbort DawaSilentPostP2
DawaSilentPostP2:
  StrCmp $R3 "$\t" DawaSilentAbort DawaSilentPostP3
DawaSilentPostP3:
  StrCmp $R3 '"' DawaSilentAbort DawaSilentPostP4
DawaSilentPostP4:
  StrCmp $R3 ":" DawaSilentAbort DawaSilentPostP5
DawaSilentPostP5:
  StrCmp $R3 "=" DawaSilentAbort DawaSilentCharNext   ; anything else = FALSE POSITIVE (e.g. "-Setup")
DawaSilentCharNext:
  ; ADVANCE one char. $R1 = CURRENT CHAR (never overwritten in the loop body).
  StrCpy $R2 $R1
  StrCpy $R0 $R0 "" 1
  Goto DawaSilentLoop
DawaSilentAbort:
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
  Pop $R0
  Quit
DawaSilentCheckDone:
  Pop $R4
  Pop $R3
  Pop $R2
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

  StrCmp $GateAlreadyRan "1" DawaGatePassed DawaGateRunWPF

DawaGateRunWPF:
  Call DawaFn_BlockUnattendedSilent

  Call DawaFn_EnsureGatePs1InPluginsdir

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
  ;
  ; ENCODING HARDENING (2 independent guarantees against Vietnamese
  ; accented char corrupt + stray-quote AST crash documented session 4):
  ;   (A) gate-activation.ps1 is re-saved on disk with explicit UTF-8
  ;       BOM (EF BB BF) — PowerShell 5.1 -File ALWAYS honours BOM, so
  ;       Vietnamese accented chars / emoji checkmarks NEVER corrupt.
  ;   (B) dawa-gate-runner.ps1 is staged side-by-side in $PLUGINSDIR as
  ;       an emergency fallback if an end-user somehow strips the BOM.
  ;       It re-decodes as ReadAllBytes+UTF8+Write BOM then invokes. We
  ;       call -File directly here (simpler + faster) because BOM exists.
  ; ---- POWERSHELL BITNESS HARD RULE ----
  ; NSIS Setup.exe is 32-bit (electron-builder nsis target x86).
  ; On 64-bit Windows, 32-bit process resolves C:\Windows\System32 →
  ; SysWOW64 dir → 32-bit powershell.exe → WoW64 CIM provider problems
  ; (Win32_ComputerSystemProduct/Processor/OS sometimes missing/invalid
  ; → HWID hash mismatch → double key-entry bug).
  ; FIX: $WINDIR\sysnative\... alias ONLY EXISTS for 32-bit processes on
  ; 64-bit Windows → points to REAL 64-bit System32. Use that when avail.
  ReadEnvStr $GatePsExeTmp0 "WINDIR"
  StrCpy $GatePsExePath "powershell.exe"
  IfFileExists "$GatePsExeTmp0\sysnative\WindowsPowerShell\v1.0\powershell.exe" 0 GatePsNoSysNative
    StrCpy $GatePsExePath "$GatePsExeTmp0\sysnative\WindowsPowerShell\v1.0\powershell.exe"
GatePsNoSysNative:

  InitPluginsDir
  nsExec::ExecToStack '"$GatePsExePath" -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -File "$PLUGINSDIR\gate-activation.ps1" -OutputJson "$PLUGINSDIR\dawa-activation-result.json" -SealedLicenseOutput "$PLUGINSDIR\installer-license.dat" -RegFlagFile "$APPDATA\Dawa Optimizer\.InstallerActivated" -GateIconPath "$PLUGINSDIR\icon.ico"'
  Pop $0   ; exit code (ExecToStack luôn push exit code TRƯỚC)
  Pop $1   ; text in ra (SAU)

  StrCmp $0 "0" DawaGateCopyLicense DawaGateAbort

DawaGateCopyLicense:
  CreateDirectory "$AppDataLicenseDir"
  SetOverwrite on
  CopyFiles /SILENT "$PLUGINSDIR\installer-license.dat" "$AppDataLicenseDir"
  CopyFiles /SILENT "$PLUGINSDIR\installer-license.dat" "$ProgramDataLicensePath"
  SetOverwrite off
  Goto DawaGatePassed

DawaGateAbort:
  MessageBox MB_ICONSTOP|MB_OK "Kich hoat khong thanh cong hoac bi huy.$\r$\nExit code: $0$\r$\nChi tiet: $1" /SD IDOK
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
  ; Accept both legacy "1" and new signed format "1:YYYYMMDD:hmac"
  StrCpy $1 $0 1   ; first char
  StrCmp $1 "1" DawaFinalPassed DawaFinalHKLM
DawaFinalHKLM:
  ReadRegStr $0 HKLM "Software\Dawa Optimizer" "InstallerActivated"
  StrCpy $1 $0 1   ; first char
  StrCmp $1 "1" DawaFinalPassed DawaFinalAbort
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
