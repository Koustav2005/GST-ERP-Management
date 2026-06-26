@echo off
echo ========================================
echo   Starting Backend and Frontend
echo ========================================
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && start.bat"

timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend (Expo)...
start "Frontend Expo" cmd /k "npx expo start --clear"

echo.
echo ========================================
echo   Both Servers Starting!
echo ========================================
echo.
echo Two windows will open:
echo   1. Backend Server (port 3000)
echo   2. Frontend Expo (QR code)
echo.
echo Wait for both to start, then:
echo   - Scan QR code on your phone
echo   - Press 'r' to reload
echo.
echo Your IP: 10.117.237.87
echo Backend: http://10.117.237.87:3000
echo.
pause
