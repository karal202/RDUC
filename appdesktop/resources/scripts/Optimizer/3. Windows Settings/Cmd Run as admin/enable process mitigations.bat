@echo off
setlocal EnableDelayedExpansion

DISM > nul 2>&1 || echo error: administrator privileges required && pause && exit /b 1

PowerShell Set-ProcessMitigation -System -Enable CFG
if not !errorlevel! == 0 (
    echo error: unsupported windows version
    echo info: press any key to continue
    pause > nul 2>&1
    exit /b 1
)

for /f "tokens=3 skip=2" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "MitigationAuditOptions"') do (
    set "mitigation_mask=%%a"
)

echo info: current mask - !mitigation_mask!

for /L %%a in (0,1,9) do (
    set "mitigation_mask=!mitigation_mask:%%a=1!
)

echo info: modified mask - !mitigation_mask!

reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "MitigationOptions" /t REG_BINARY /d "!mitigation_mask!" /f > nul 2>&1
reg.exe add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "MitigationAuditOptions" /t REG_BINARY /d "!mitigation_mask!" /f > nul 2>&1

echo info: done
echo info: press any key to continue
pause > nul 2>&1
exit /b 0
