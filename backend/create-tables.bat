@echo off
echo ========================================
echo Creating Store Requests Tables
echo ========================================
echo.

cd /d "%~dp0"
node fix-store-tables.js

echo.
echo ========================================
echo Done! Press any key to exit...
echo ========================================
pause >nul






