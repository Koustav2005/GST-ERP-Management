@echo off
cls
echo ========================================
echo   PostgreSQL Connection Helper
echo ========================================
echo.
echo Let's connect to your PostgreSQL database!
echo.
echo STEP 1: Check if PostgreSQL is running...
echo.

sc query postgresql-x64-18 | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL is running!
) else (
    echo [!] PostgreSQL is not running. Starting it...
    net start postgresql-x64-18
)

echo.
echo ========================================
echo STEP 2: Choose your connection method
echo ========================================
echo.
echo 1. Interactive Setup (Recommended)
echo    - Will ask for your password
echo    - Sets up everything automatically
echo.
echo 2. Test Connection Only
echo    - Check if current .env password works
echo.
echo 3. I need to reset my password
echo    - Opens guide to reset password
echo.
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Starting interactive setup...
    echo You'll be asked for your PostgreSQL password.
    echo.
    pause
    node interactive-setup.js
) else if "%choice%"=="2" (
    echo.
    echo Testing connection with current .env settings...
    echo.
    node test-connection.js
    echo.
    echo If connection failed, try option 1 or 3
) else if "%choice%"=="3" (
    echo.
    echo Opening password reset guide...
    echo.
    type CONNECT-DATABASE.md | more
) else if "%choice%"=="4" (
    exit
) else (
    echo Invalid choice!
)

echo.
echo ========================================
pause
