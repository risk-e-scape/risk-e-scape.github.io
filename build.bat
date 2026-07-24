@echo off
REM Rebuilds the site. Double-click this file or run in CI.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo Install it from https://nodejs.org (choose the LTS version), then run this again.
  echo.
  exit /b 1
)
node build.js
if errorlevel 1 (
  echo.
  echo Build failed. See errors above.
  echo.
  exit /b 1
)
echo.
echo Build successful.
echo.