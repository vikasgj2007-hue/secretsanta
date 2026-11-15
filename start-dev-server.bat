@echo off
title THE EVERGREEN EXPRESS — Dev Server
cd /d "%~dp0"
echo ========================================================
echo   THE EVERGREEN EXPRESS — DEV SERVER
echo   Building assets and starting server on http://localhost:5000
echo ========================================================
call npm run build:bundles
echo   Launching browser in 2 seconds...
start /b "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5000'"
node server.js
pause
