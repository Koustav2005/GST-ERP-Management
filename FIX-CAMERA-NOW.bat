@echo off
color 0A
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║          FIXING CAMERA ^& GALLERY ERROR                    ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo This will fix the "Not Available" error for Camera and Gallery
echo.
pause
echo.

echo [1/5] Stopping Expo server...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo ✅ Done
echo.

echo [2/5] Clearing old files...
if exist node_modules (
    echo Deleting node_modules...
    rmdir /s /q node_modules
)
if exist .expo (
    echo Deleting .expo cache...
    rmdir /s /q .expo
)
if exist package-lock.json (
    del package-lock.json
)
echo ✅ Done
echo.

echo [3/5] Installing packages (this may take 2-3 minutes)...
call npm install
echo ✅ Done
echo.

echo [4/5] Installing expo-image-picker...
call npx expo install expo-image-picker
echo ✅ Done
echo.

echo [5/5] Installing expo-file-system...
call npx expo install expo-file-system
echo ✅ Done
echo.

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║                  ✅ FIX COMPLETE!                         ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo NEXT STEPS:
echo.
echo 1. Run this command:
echo    npx expo start --clear
echo.
echo 2. On your phone, press 'r' to reload
echo.
echo 3. Test camera and gallery features
echo.
echo 4. Allow permissions when asked
echo.
pause
