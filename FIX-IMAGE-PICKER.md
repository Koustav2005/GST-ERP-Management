# 🔧 Fix expo-image-picker Error

## The Problem
The error shows that `expo-image-picker` module cannot be found. This happens when native modules aren't properly installed.

## ✅ Quick Fix (Choose One)

### Option 1: Automated Fix (Recommended)
```bash
fix-image-picker.bat
```
Then:
```bash
npx expo start --clear
```
Press `r` to reload

### Option 2: Manual Fix
```bash
# Stop Expo server (Ctrl+C)

# Clear cache
rmdir /s /q node_modules
rmdir /s /q .expo
del package-lock.json

# Reinstall
npm install
npx expo install expo-image-picker
npx expo install expo-file-system

# Start with clear cache
npx expo start --clear
```

Press `r` to reload the app

### Option 3: Use URL Only (Temporary)
If the above doesn't work immediately, the app now has a fallback:
- Camera/Gallery buttons will show an error
- Use the **URL option** to add sketches
- This works without any native modules

## 🎯 After Fix

Test the features:
1. Login as NPD
2. Open a project
3. Click "Add" under Product Sketch
4. Try all 3 options:
   - 📷 Camera
   - 🖼️ Gallery
   - 🔗 URL

## 📱 Permissions

The app now requests:
- Camera permission (for taking photos)
- Gallery permission (for selecting photos)

These are configured in `app.json`

## 🔍 What Changed

1. **app.json** - Added permissions and plugins
2. **ProjectDetailsScreen.js** - Added error handling
3. **Fallback** - URL option always works

## ⚠️ If Still Not Working

Try rebuilding:
```bash
# Clear everything
npx expo start --clear

# Or reset completely
npm start -- --reset-cache
```

## 💡 Alternative: Use URL for Now

While fixing, you can still use the app:
- Click "🔗 URL" button
- Enter image URL
- Example: `https://example.com/image.jpg`

The bulk BOM feature works perfectly regardless!
