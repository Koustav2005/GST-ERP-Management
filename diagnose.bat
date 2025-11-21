@echo off
echo ========================================
echo GST Management App - Diagnostics
echo ========================================
echo.

echo [1/5] Checking Node.js version...
node --version
echo.

echo [2/5] Checking npm version...
npm --version
echo.

echo [3/5] Checking Expo CLI...
npx expo --version
echo.

echo [4/5] Checking dependencies...
npx expo install --check
echo.

echo [5/5] Running Expo Doctor...
npx expo-doctor
echo.

echo ========================================
echo Diagnostics Complete
echo ========================================
echo.
echo If you see any errors above, run:
echo   fix-app.bat
echo.
pause
