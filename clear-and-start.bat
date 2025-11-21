@echo off
echo ========================================
echo Clearing cache and starting app...
echo ========================================
echo.

echo Step 1: Clearing Expo cache...
npx expo start -c

echo.
echo If the app crashes, press Ctrl+C and run:
echo npx expo install --check
echo.
pause
