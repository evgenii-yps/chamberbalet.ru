@echo off
setlocal
cd /d "%~dp0" || exit /b 1
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Install the LTS version from https://nodejs.org/
  pause
  exit /b 1
)
node launcher.mjs
if errorlevel 1 (
  echo Startup failed. You can also run: node server.mjs
  pause
  exit /b 1
)
