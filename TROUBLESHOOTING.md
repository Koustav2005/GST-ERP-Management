# App Troubleshooting Guide

## Common Issues & Fixes

### Issue 1: App Crashes on Startup

**Quick Fix:**
```cmd
npx expo install --fix
npx expo start -c
```

Or run:
```cmd
fix-app.bat
```

---

### Issue 2: Metro Bundler Port Conflict

**Error:** "Port 8081 is being used"

**Fix:**
```cmd
npx expo start --port 8082
```

Or kill the process:
```cmd
netstat -ano | findstr :8081
taskkill /PID <PID_NUMBER> /F
```

---

### Issue 3: Dependency Version Mismatch

**Error:** Version conflicts or module not found

**Fix:**
```cmd
rm -rf node_modules
npm install
npx expo install --check
```

---

### Issue 4: Picker Component Error

**Error:** "@react-native-picker/picker" not working

**Fix:**
```cmd
npx expo install @react-native-picker/picker
```

---

### Issue 5: Navigation Error

**Error:** Navigation container or stack navigator issues

**Fix:**
```cmd
npx expo install react-native-screens react-native-safe-area-context
```

---

### Issue 6: Cache Issues

**Error:** Old cached files causing crashes

**Fix:**
```cmd
npx expo start -c
```

Or:
```cmd
npm start -- --reset-cache
```

---

## Complete Reset (Nuclear Option)

If nothing works:

```cmd
# 1. Delete node_modules and cache
rmdir /s /q node_modules
del package-lock.json

# 2. Clear Expo cache
npx expo start -c

# 3. Reinstall
npm install

# 4. Fix dependencies
npx expo install --fix

# 5. Start fresh
npx expo start -c
```

---

## Check for Specific Errors

### Run diagnostics:
```cmd
npx expo-doctor
```

### Check dependencies:
```cmd
npx expo install --check
```

---

## Common Error Messages

### "Unable to resolve module"
- Clear cache: `npx expo start -c`
- Reinstall: `npm install`

### "Element type is invalid"
- Check imports in App.js and AuthScreen.js
- Verify all components are exported correctly

### "Cannot read property of undefined"
- Check if all required props are passed
- Verify state initialization

### "Network request failed"
- Check API URL in `src/config/api.js`
- Verify backend is running on correct port
- Update IP address for phone testing

---

## Still Having Issues?

1. **Check the error message** - Look at the red error screen
2. **Check Metro bundler logs** - Look at terminal output
3. **Check Expo Go app** - Make sure it's updated
4. **Try web version first**: `npx expo start --web`

---

## Quick Commands

**Start with cache clear:**
```cmd
npx expo start -c
```

**Fix dependencies:**
```cmd
npx expo install --fix
```

**Check for issues:**
```cmd
npx expo-doctor
```

**Start on different port:**
```cmd
npx expo start --port 8082
```

**Web version (for testing):**
```cmd
npx expo start --web
```
