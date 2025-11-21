@echo off
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                                                               ║
echo ║         FIX: Cannot Connect to Server Error                   ║
echo ║                                                               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

echo Step 1: Finding your IP address...
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" ^| findstr "10\."') do (
    set IP=%%a
    set IP=!IP:~1!
    goto :found
)

:found
echo Your WiFi IP Address: %IP%
echo.

echo ========================================
echo Step 2: Checking backend server...
echo ========================================
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo [OK] Backend is running on port 3000
) else (
    echo [FAIL] Backend is NOT running!
    echo.
    echo Please start backend:
    echo   cd backend
    echo   npm run dev
    echo.
    pause
    exit
)

echo.
echo ========================================
echo Step 3: Testing backend connection...
echo ========================================
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend responding
) else (
    echo [FAIL] Backend not responding
)

echo.
echo ========================================
echo Step 4: Checking firewall...
echo ========================================
netsh advfirewall firewall show rule name="GST Backend API" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Firewall rule exists
) else (
    echo [!] Firewall rule NOT found
    echo.
    echo IMPORTANT: You need to add firewall rule!
    echo.
    echo Right-click: backend\allow-firewall.bat
    echo Select: "Run as administrator"
    echo.
)

echo.
echo ========================================
echo Step 5: Update IP in app...
echo ========================================
echo.
echo Your IP is: %IP%
echo.
echo The IP has been updated in: src\config\api.js
echo.
echo ========================================
echo Step 6: Restart Expo app
echo ========================================
echo.
echo In your Expo terminal, press: r
echo.
echo Or restart:
echo   npx expo start
echo.
echo ========================================
echo Summary:
echo ========================================
echo.
echo 1. Backend: Running on port 3000
echo 2. Your IP: %IP%
echo 3. Updated: src\config\api.js
echo 4. Next: Add firewall rule (if needed)
echo 5. Then: Restart Expo app
echo.
echo ========================================
pause
