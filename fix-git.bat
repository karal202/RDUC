@echo off
echo ==============================================
echo   DAWA - KHOI PHUC CHI MUC GIT (.git/index)
echo ==============================================
if exist .git\index del /f /q .git\index
git reset
echo.
echo [OK] Chi muc Git da duoc phuc hoi thanh cong!
git status
pause
