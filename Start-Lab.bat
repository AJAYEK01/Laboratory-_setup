@echo off
title Village LabPulse - Multi-Branch Centralized Laboratory System
echo =========================================================================
echo   Village LabPulse - Centralized Multi-Branch Diagnostic System
echo   Daily 200+ Patients Capacity • Offline-First • Multi-Branch Security
echo =========================================================================
echo.

echo [1/2] Starting Central Backend Server (Port 5000)...
start "LabPulse Central Backend (Port 5000)" cmd /k "cd server && node dist/index.js"

echo [2/2] Starting Lab Application Client (Port 4173)...
timeout /t 2 /nobreak >nul
start "" "http://localhost:4173"
call npm run preview -- --port 4173
pause
