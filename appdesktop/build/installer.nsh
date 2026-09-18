; ====================================================================
; DAWA Optimizer - NSIS Zero-Trust Activation Gate (5-layer hooks)
; NOTE: We DO NOT declare Function .onInit ourselves. electron-builder
; already defines .onInit for its anti-tamper / app-info injection;
; redefining it aborts makensis.exe with "Function .onInit already
; exists" fatal. Our earliest hook is MyGUIINIT (GUIINIT custom fn),
; followed by Welcome/License page pre-functions, final guard in
; .onInstProgress.
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

; --------------------------------------------------------------------
; Macro: DawaActivationGate
;   Fast-path exit if (HKCU or HKLM) Software\Dawa Optimizer\
;   InstallerActivated = "1" already set — user passed gate during
;   an earlier hook so subsequent page-hooks are ~2 registry reads,
;   no PowerShell child spawn.
;   Otherwise: spawn gate-activation.ps1 via nsExec::ExecToStack
;   (STA mode, NonInteractive flag OMITTED — required for PS5.1 to
;   paint STA WPF toplevel). Exit 0 = copy sealed license mirror,
;   any other exit = immediate Quit installer (Zero-Trust hard fail,
;   NEVER fall back to in-app ActivationModal as substitute —
;   runtime startup gate will crash-to-quit anyway if flag absent).
; --------------------------------------------------------------------
!macro DawaActivationGate
  StrCpy $InstallerDirName "Dawa Optimizer"

  ; Fast-path layer 1: $GateAlreadyRan (script-level, set on pass)
  StrCmp $GateAlreadyRan "1" GatePassed GateFastRegHKCU

  ; Fast-path layer 2: HKCU registry (per-user, written by WPF)
GateFastRegHKCU:
  ReadRegStr $0 HKCU "Software\$InstallerDirName" "InstallerActivated"
  StrCmp $0 "1" GatePassed GateFastRegHKLM

  ; Fast-path layer 3: HKLM registry mirror (per-machine, WPF tries best-effort)
GateFastRegHKLM:
  ReadRegStr $0 HKLM "Software\$InstallerDirName" "InstallerActivated"
  StrCmp $0 "1" GatePassed GateRunWPF

GateRunWPF:
  ; Resolve PROGRAMDATA from environment (not a NSIS built-in var).
  ReadEnvStr $ProgramDataDir "PROGRAMDATA"
  StrCmp $ProgramDataDir "" GateRunWPFUseFallback GateRunWPFHaveProgramData
GateRunWPFUseFallback:
  StrCpy $ProgramDataDir "C:\ProgramData"
GateRunWPFHaveProgramData:

  ; Build 3 SSO candidate paths (order = INSTALLER_LICENSE_CANDIDATES
  ; in src/main/index.js: 1. $APPDATA, 2. $PROGRAMDATA,
  ; 3. $INSTDIR\resources — written both here AND in .onInstProgress
  ; as last-resort safeguard).
  StrCpy $AppDataLicenseDir      "$APPDATA\$InstallerDirName"
  StrCpy $AppDataLicensePath     "$AppDataLicenseDir\installer-license.dat"
  StrCpy $ProgramDataLicenseDir  "$ProgramDataDir\$InstallerDirName"
  StrCpy $ProgramDataLicensePath "$ProgramDataLicenseDir\installer-license.dat"

  ; $PLUGINSDIR = electron-builder copies everything under
  ; directories.buildResources ("build/") into this temp dir when
  ; makensis.exe assembles the installer — confirmed: gate-activation.ps1
  ; lives at build/gate-activation.ps1 on disk.
  nsExec::ExecToStack 'powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -File "$PLUGINSDIR\gate-activation.ps1" -OutputJson "$PLUGINSDIR\dawa-activation-result.json" -SealedLicenseOutput "$PLUGINSDIR\installer-license.dat" -RegFlagFile "$APPDATA\Dawa Optimizer\.InstallerActivated"'
  Pop $0   ; nsExec stdout tail (discarded — OutputJson already on disk)
  Pop $1   ; exit code

  StrCmp $1 "0" GateCopyLicense GateAbort

GateCopyLicense:
  ; Mirror 1/3: $APPDATA (primary Electron SSO candidate).
  CreateDirectory "$AppDataLicenseDir"
  SetOverwrite on
  CopyFiles /SILENT "$PLUGINSDIR\installer-license.dat" "$AppDataLicensePath"
  ; Mirror 2/3: $PROGRAMDATA (cross-user fallback when same machine).
  CreateDirectory "$ProgramDataLicenseDir"
  CopyFiles /SILENT "$PLUGINSDIR\installer-license.dat" "$ProgramDataLicensePath"
  SetOverwrite off
  Goto GatePassed

GateAbort:
  ; User hit Escape/titlebar-X or validate returned non-zero.
  ; Zero-Trust = no second chances. Quit NOW.
  Quit

GatePassed:
  StrCpy $GateAlreadyRan "1"
!macroend

; --------------------------------------------------------------------
; Hook #1 of 5 (EARLIEST POSSIBLE — first real paint opportunity
; because electron-builder owns .onInit exclusively):
; MUI_CUSTOMFUNCTION_GUIINIT fires BEFORE NSIS draws its first pixel.
; --------------------------------------------------------------------
Function MyGUIInit
  !insertmacro DawaActivationGate
FunctionEnd
!define MUI_CUSTOMFUNCTION_GUIINIT MyGUIInit

; --------------------------------------------------------------------
; Hook #2 of 5: Welcome page PRE function
;   Runs BEFORE Welcome page is shown — catches wrapper flows where
;   GUIINIT is patched around. GUIINIT already sets $GateAlreadyRan=1
;   so cost is a fast macro nop.
;   NOTE: electron-builder auto-inserts MUI_PAGE_WELCOME for
;   oneClick=false installs; we hook CUSTOMFUNCTION_PRE for that page.
; --------------------------------------------------------------------
Function DawaPreWelcomePage
  !insertmacro DawaActivationGate
FunctionEnd
!define MUI_WELCOMEPAGE_CUSTOMFUNCTION_PRE DawaPreWelcomePage
!define MUI_WELCOMEPAGE_CUSTOMFUNCTION_SHOW DawaPreWelcomePage

; --------------------------------------------------------------------
; Hook #3 of 5: License page PRE (for classic EULA screen users)
;   electron-builder emits MUI_PAGE_LICENSE because
;   nsis.license=build/license_en.txt in electron-builder.yml.
;   Re-running gate here is cheap (fast-path registry nop).
; --------------------------------------------------------------------
Function DawaPreLicensePage
  !insertmacro DawaActivationGate
FunctionEnd
!define MUI_LICENSEPAGE_CUSTOMFUNCTION_PRE DawaPreLicensePage
!define MUI_LICENSEPAGE_CUSTOMFUNCTION_SHOW DawaPreLicensePage

; --------------------------------------------------------------------
; Hook #4 of 5: Directory page PRE (install location confirm step).
;   Some wrappers can patch-out Welcome/License UI entirely — an
;   extra guard before the user gets to click "Install" button keeps
;   Zero-Trust intact.
; --------------------------------------------------------------------
Function DawaPreDirectoryPage
  !insertmacro DawaActivationGate
FunctionEnd
!define MUI_DIRECTORYPAGE_CUSTOMFUNCTION_PRE DawaPreDirectoryPage

; --------------------------------------------------------------------
; Hook #5 of 5 (FINAL GUARD — ABSOLUTE LAST CHANCE BEFORE DISK IO):
; .onInstProgress fires once BEFORE the first byte is actually
; extracted to $INSTDIR. Even if every prior hook was bypassed
; (e.g. a custom repacker deleted them), this function ABORTs the
; install immediately if InstallerActivated flag absent in EITHER
; registry hive. Also re-seeds installer-license.dat to
; $INSTDIR\resources (candidate #3 last resort) in case user wiped
; %APPDATA% between Setup launch and first app run.
; --------------------------------------------------------------------
Function .onInstProgress
  ReadRegStr $0 HKCU "Software\Dawa Optimizer" "InstallerActivated"
  StrCmp $0 "1" FinalGuardPassed FinalGuardHKLM
FinalGuardHKLM:
  ReadRegStr $0 HKLM "Software\Dawa Optimizer" "InstallerActivated"
  StrCmp $0 "1" FinalGuardPassed FinalGuardAbort
FinalGuardPassed:
  ; Candidate #3 of the Electron SSO: also drop license into the
  ; unpacked resources folder. Useful for corporate installs where
  ; the user launching the app != the user running the installer.
  IfFileExists "$INSTDIR\resources\installer-license.dat" FinalGuardDone FinalGuardReplant
FinalGuardReplant:
  ReadEnvStr $ProgramDataDir "PROGRAMDATA"
  StrCmp $ProgramDataDir "" FinalGuardAltEnv FinalGuardHaveEnv
FinalGuardAltEnv:
  StrCpy $ProgramDataDir "C:\ProgramData"
FinalGuardHaveEnv:
  StrCpy $SealedLicenseSrcPath "$APPDATA\Dawa Optimizer\installer-license.dat"
  IfFileExists $SealedLicenseSrcPath 0 FinalGuardTryProgramData
  CreateDirectory "$INSTDIR\resources"
  SetOverwrite on
  CopyFiles /SILENT $SealedLicenseSrcPath "$INSTDIR\resources\installer-license.dat"
  SetOverwrite off
  Goto FinalGuardDone
FinalGuardTryProgramData:
  StrCpy $SealedLicenseSrcPath "$ProgramDataDir\Dawa Optimizer\installer-license.dat"
  IfFileExists $SealedLicenseSrcPath 0 FinalGuardDone
  CreateDirectory "$INSTDIR\resources"
  SetOverwrite on
  CopyFiles /SILENT $SealedLicenseSrcPath "$INSTDIR\resources\installer-license.dat"
  SetOverwrite off
FinalGuardDone:
  Goto FinalGuardEnd
FinalGuardAbort:
  MessageBox MB_ICONSTOP|MB_OK "Zero-Trust Gate: InstallerActivated flag missing.$\r$\nSetup was NOT run through the official activation window.$\r$\nPlease re-launch Dawa-Optimizer-Setup.exe and complete the activation step.$\r$\nNo files were extracted." /SD IDOK
  Abort "Bypassed Zero-Trust activation — no files extracted."
FinalGuardEnd:
FunctionEnd
