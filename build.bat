@echo off
REM Rebuilds the site. Double-click this file.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo Install it from https://nodejs.org ^(choose the LTS version^), then run this again.
  echo.
  pause
  exit /b 1
)
node build.js
echo.
pause
