@echo off
setlocal

:menu
cls
echo ========================================
echo         Cursor ZH Tool Menu
echo ========================================
echo.
echo   1. Apply localization
echo   2. Ensure install
echo   3. Verify install
echo   4. Start Cursor
echo   5. Uninstall localization
echo   0. Exit
echo.
set "choice="
set /p "choice=Enter a number and press Enter: "

if "%choice%"=="1" goto apply
if "%choice%"=="2" goto ensure
if "%choice%"=="3" goto verify
if "%choice%"=="4" goto start
if "%choice%"=="5" goto uninstall
if "%choice%"=="0" goto end

echo.
echo Invalid input. Please enter 0-5.
pause
goto menu

:apply
call :runPowerShell apply
goto menu

:ensure
call :runPowerShell ensure
goto menu

:verify
call :runPowerShell verify
goto menu

:start
echo.
echo Starting Cursor...
wscript.exe "%~dp0scripts\start-cursor-zh.vbs"
echo.
pause
goto menu

:uninstall
call :runPowerShell uninstall
goto menu

:runPowerShell
echo.
echo Running %~1 ...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\invoke-cursor-zh.ps1" %~1
echo.
pause
exit /b

:end
endlocal
exit /b 0
