@echo off
REM ============================================================
REM  Dawa Optimizer — NSIS License Gate Exec Wrapper
REM  Called by installer.nsh customInit (quoteproof execution)
REM  %1 = full path to dawa-installer.log (NSIS passes $LogTmp1)
REM  %2 = full path to license-gate.ps1 (NSIS passes $PLUGINSDIR\license-gate.ps1)
REM ============================================================

setlocal EnableExtensions DisableDelayedExpansion

set "LOGPATH=%~1"
set "PS1PATH=%~2"
set "GATEDIR=%~dp0"

REM Ensure log folder exists
if not "%LOGPATH%"=="" (
  if not exist "%LOGPATH%" (
    mkdir "%~dp1" 2>nul
  )
)

REM Heartbeat capture (timestamp + invoker)
echo [%DATE% %TIME%] [BAT] run-gate wrapper launched >> "%LOGPATH%" 2>&1
echo [%DATE% %TIME%] [BAT] LOGPATH=%LOGPATH% >> "%LOGPATH%" 2>&1
echo [%DATE% %TIME%] [BAT] PS1PATH=%PS1PATH% >> "%LOGPATH%" 2>&1

REM ###################################################################
REM SELF-UNBLOCK PS1 (remove NTFS alternate data stream Zone.Identifier)
REM ###################################################################
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ^
  "Unblock-File -LiteralPath '%PS1PATH%' -ErrorAction SilentlyContinue" 2>> "%LOGPATH%" >nul

REM ###################################################################
REM CALL LICENSE GATE FORM (STA apartment for WinForms)
REM ###################################################################
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Sta -WindowStyle Hidden ^
  -File "%PS1PATH%" -LogFile "%LOGPATH%" >> "%LOGPATH%" 2>&1
set EX=%ERRORLEVEL%

echo [%DATE% %TIME%] [BAT] powershell exitcode=%EX% >> "%LOGPATH%" 2>&1
endlocal & exit /b %EX%
