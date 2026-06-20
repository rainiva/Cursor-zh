@echo off
setlocal

:menu
cls
echo ========================================
echo          Cursor 中文版工具菜单
echo ========================================
echo.
echo   1. 应用汉化
echo   2. 确保安装
echo   3. 验证安装
echo   4. 启动 Cursor
echo   5. 卸载汉化
echo   0. 退出
echo.
set "choice="
set /p "choice=请输入序号并按回车："

if "%choice%"=="1" goto apply
if "%choice%"=="2" goto ensure
if "%choice%"=="3" goto verify
if "%choice%"=="4" goto start
if "%choice%"=="5" goto uninstall
if "%choice%"=="0" goto end

echo.
echo 输入无效，请输入 0-5。
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
echo 正在启动 Cursor...
wscript.exe "%~dp0scripts\start-cursor-zh.vbs"
echo.
pause
goto menu

:uninstall
call :runPowerShell uninstall
goto menu

:runPowerShell
echo.
echo 正在执行 %~1 ...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\invoke-cursor-zh.ps1" %~1
echo.
pause
exit /b

:end
endlocal
exit /b 0
