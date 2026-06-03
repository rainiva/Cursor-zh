@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\invoke-cursor-zh.ps1" apply %*
