@echo off
title NTFS Compression Auto Fix
color 0A

:: ==========================
:: Check Admin
:: ==========================
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo Please Run as Administrator!
    pause
    exit
)

:: ==========================
:: After reboot mode
:: ==========================
if "%1"=="afterreboot" goto CHECK

echo.
echo ==========================
echo Enabling NTFS Compression...
echo ==========================

reg add "HKLM\SYSTEM\CurrentControlSet\Policies" /v NtfsDisableCompression /t REG_DWORD /d 0 /f >nul

fsutil behavior set disablecompression 0

:: Create scheduled task to continue after reboot
schtasks /create ^
/tn "FixNTFSCompression" ^
/tr "\"%~f0\" afterreboot" ^
/sc ONSTART ^
/ru SYSTEM ^
/rl HIGHEST ^
/f >nul

echo.
echo Restarting in 10 seconds...
shutdown /r /t 10
exit

:CHECK
echo.
echo Checking status...

for /f "tokens=3" %%a in ('fsutil behavior query disablecompression') do (
    set STATE=%%a
)

if "%STATE%"=="0" (
    echo.
    echo SUCCESS!
    echo NTFS Compression Enabled.
    schtasks /delete /tn "FixNTFSCompression" /f >nul
    timeout /t 5 >nul
    exit
)

echo.
echo Still Disabled...
echo Trying again...

reg add "HKLM\SYSTEM\CurrentControlSet\Policies" /v NtfsDisableCompression /t REG_DWORD /d 0 /f >nul
fsutil behavior set disablecompression 0

echo.
echo Finished.
echo Please check again.

schtasks /delete /tn "FixNTFSCompression" /f >nul

timeout /t 5 >nul
exit