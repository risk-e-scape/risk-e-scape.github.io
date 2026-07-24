@echo off
REM Previews the site at http://localhost:8000 - press Ctrl+C to stop.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo Install it from https://nodejs.org (choose the LTS version), then run this again.
  echo.
  exit /b 1
)
node serve.js
