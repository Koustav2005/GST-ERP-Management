@echo off
echo ========================================
echo GST Management App - Fix & Start
echo ========================================
echo.

echo Checking and fixing dependencies...
echo.

call npx expo install --fix

echo.
echo ========================================
echo Starting app with cache cleared...
echo ========================================
echo.

call npx expo start -c

pause
