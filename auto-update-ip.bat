@echo off
echo ========================================
echo Auto-Update IP Address in App
echo ========================================
echo.

REM Get the WiFi IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" ^| findstr "10\."') do (
    set IP=%%a
    set IP=!IP:~1!
    goto :found
)

:found
if "%IP%"=="" (
    echo [!] Could not find IP address
    echo Please check your WiFi connection
    pause
    exit
)

echo Current IP Address: %IP%
echo.

REM Update the API config file
set CONFIG_FILE=src\config\api.js

echo Updating %CONFIG_FILE%...

REM Create a temporary PowerShell script to update the file
echo $content = Get-Content '%CONFIG_FILE%' -Raw > temp_update.ps1
echo $content = $content -replace "const API_BASE_URL = 'http://[0-9.]+:3000/api';", "const API_BASE_URL = 'http://%IP%:3000/api';" >> temp_update.ps1
echo $content ^| Set-Content '%CONFIG_FILE%' >> temp_update.ps1

powershell -ExecutionPolicy Bypass -File temp_update.ps1
del temp_update.ps1

echo.
echo ========================================
echo [OK] IP Address Updated!
echo ========================================
echo.
echo Updated to: http://%IP%:3000/api
echo.
echo Next: Restart Expo app
echo   npx expo start
echo   Press: r (to reload)
echo.
pause
