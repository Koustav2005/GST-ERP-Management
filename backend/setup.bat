@echo off
echo ========================================
echo GST Management - Database Setup
echo ========================================
echo.
echo Choose setup method:
echo 1. Interactive Setup (Recommended)
echo 2. Automatic Setup (if you know your password)
echo 3. Test Connection Only
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    node interactive-setup.js
) else if "%choice%"=="2" (
    node setup-database.js
) else if "%choice%"=="3" (
    node test-connection.js
) else (
    echo Invalid choice
)

pause
