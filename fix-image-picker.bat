@echo off
echo ========================================
echo   Fixing expo-image-picker Module
echo ========================================
echo.

echo Step 1: Stopping Expo...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Step 2: Clearing cache...
if exist node_modules rmdir /s /q node_modules
if exist .expo rmdir /s /q .expo
if exist package-lock.json del package-lock.json

echo.
echo Step 3: Reinstalling all packages...
call npm install

echo.
echo Step 4: Installing expo-image-picker properly...
call npx expo install expo-image-picker

echo.
echo Step 5: Installing expo-file-system...
call npx expo install expo-file-system

echo.
echo Step 6: Verifying installation...
if exist node_modules\expo-image-picker (
    echo ✅ expo-image-picker installed successfully!
) else (
    echo ❌ expo-image-picker installation failed!
    echo Please run: npm install expo-image-picker
)

echo.
echo ========================================
echo   ✅ Fix Complete!
echo ========================================
echo.
echo NEXT STEPS:
echo 1. Run: npx expo start --clear
echo 2. Press 'r' on your phone to reload
echo 3. Test camera and gallery features
echo.
pause
