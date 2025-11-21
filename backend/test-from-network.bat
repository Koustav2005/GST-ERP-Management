@echo off
echo ========================================
echo Testing Backend Network Access
echo ========================================
echo.

echo Your current IP addresses:
ipconfig | findstr "IPv4"
echo.

echo ========================================
echo Testing if backend is accessible...
echo ========================================
echo.

echo Testing localhost:
curl -s http://localhost:3000 2>nul
if %errorlevel% equ 0 (
    echo [OK] Backend is running on localhost
) else (
    echo [FAIL] Backend not responding on localhost
)

echo.
echo ========================================
echo Checking firewall rules...
echo ========================================
netsh advfirewall firewall show rule name="GST Backend API" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [!] Firewall rule not found!
    echo.
    echo To fix: Right-click allow-firewall.bat and "Run as administrator"
)

echo.
echo ========================================
echo Current backend status:
echo ========================================
netstat -ano | findstr :3000

echo.
pause
