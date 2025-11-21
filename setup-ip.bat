@echo off
echo ========================================
echo Finding Your IP Address
echo ========================================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    goto :found
)

:found
set IP=%IP:~1%
echo Your IP Address: %IP%
echo.
echo ========================================
echo.
echo IMPORTANT: Update this IP in the file:
echo   src\config\api.js
echo.
echo Change this line:
echo   const API_BASE_URL = 'http://192.168.1.100:3000/api';
echo.
echo To:
echo   const API_BASE_URL = 'http://%IP%:3000/api';
echo.
echo ========================================
echo.
echo After updating, restart Expo:
echo   npx expo start
echo.
pause
