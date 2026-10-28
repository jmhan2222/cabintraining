@echo off
rem Model voice bulk replacement - see README.md
rem   update-voices.cmd            : replace voices from _new_voices\
rem   update-voices.cmd --check    : validate only
rem   update-voices.cmd --restore YYYYMMDD-HHMMSS : restore a backup
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is required. Install from https://nodejs.org and reopen this window.
  pause
  exit /b 1
)
node "%~dp0tools\update-voices.js" %*
echo.
pause
