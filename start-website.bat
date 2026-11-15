@echo off
title THE EVERGREEN EXPRESS — Server
cd /d "%~dp0"
echo ========================================================
echo   THE EVERGREEN EXPRESS — A SECRET CHRISTMAS JOURNEY
echo   Starting Node.js + Express Server on http://localhost:5000
echo ========================================================
echo   Launching browser in 2 seconds...
start /b "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5000'"
node server.js
pause
