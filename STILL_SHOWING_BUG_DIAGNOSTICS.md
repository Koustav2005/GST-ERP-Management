# 🔍 DEBUGGING: Job Works Still Showing to Accountant

If you're still seeing all job works after the fix, follow these steps:

---

## Potential Causes (In Order of Likelihood)

### 1. ⚠️ OLD CACHED USER DATA IN ASYNCSTORAGE (Most Likely)
The app caches the user object in AsyncStorage. If the old version had `role: 'Accountant'` (capitalized), it might still be stored.

**Solution:**
```javascript
// Clear AsyncStorage completely
// Option A: In browser console (web)
localStorage.clear()
sessionStorage.clear()

// Option B: In React Native (app)
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.clear();
```

**Steps:**
1. Close the app completely
2. Clear app cache:
   - Android: Settings > Apps > [YourApp] > Storage > Clear Cache & Clear Data
   - iOS: Settings > General > iPhone Storage > [YourApp] > Delete App (reinstall)
3. Uninstall and reinstall the app
4. Login again fresh

---

### 2. 🔄 APP NOT RELOADED WITH NEW CODE
The development server might still be serving old code.

**Solution:**
```bash
# If using Expo
expo start --clear
# Then kill and restart the app

# If using React Native
react-native start --reset-cache
# Then reload the app (Cmd+R or Ctrl+R twice)
```

---

### 3. 🔗 USING WRONG ENDPOINT
Frontend might be calling the company-wide endpoint instead of accountant endpoint.

**How to Check:**
1. Open browser/app developer tools
2. Look for console logs that say:
   - ✅ "ACCOUNTANT MODE TRIGGERED" - Good!
   - ❌ "FALLING THROUGH TO ELSE BRANCH" - Bad!

The debug banner on the screen will also show:
- 🟢 Green = Accountant mode (correct)
- 🟡 Yellow = Company-wide mode (wrong)

---

### 4. 🗄️ DATABASE NOT UPDATED PROPERLY
The backend might be returning all job works instead of filtered.

**Check:**
Run this from backend directory:
```bash
node fix-accountant-visibility.js
```

Look for output:
```
Testing query for Ravish  (ID: 3):
  Results: 1 job work(s)    ← Should be 1, not 5!
    - JW-2026-0001
```

If it shows 5 results, the backend query is broken.

---

## Debug Steps to Perform

### Step 1: Check Console Logs
Open browser/app developer tools and look for these logs:

```
🔍 DEBUG: user object: {...}
🔍 DEBUG: user.role value: 'accountant'  ← Should be lowercase!
🔍 DEBUG: user.role === "accountant"? true  ← Should be TRUE!
🔍 DEBUG: user.role === "Accountant"? false
✅ ACCOUNTANT MODE TRIGGERED
📌 Calling getAccountantJobWork for user ID: 3
✅ ACCOUNTANT API Response received: 1 job works
```

### Step 2: Check Visual Debug Banner
The screen should show a **GREEN debug banner** at the top:
```
🔍 DEBUG: role='accountant' | Endpoint: getAccountantJobWork
✅ Should show ONLY assigned job works
```

If it shows YELLOW, that's the problem.

### Step 3: Check Network Requests
Open Network tab in dev tools and look for API call:
```
GET /api/projects/job-work/accountant/3   ← Should see THIS
```

NOT:
```
GET /api/projects/job-work/company/1      ← Should NOT see this
```

---

## Complete Fix Checklist

- [ ] **1. Clear AsyncStorage**
  - Close app
  - Clear app cache/data
  - Reinstall app

- [ ] **2. Restart Development Server**
  ```bash
  # Stop any running expo/react-native
  expo start --clear
  ```

- [ ] **3. Reload App**
  - Full app restart (not just refresh)
  - Force quit and reopen

- [ ] **4. Test Again**
  - Login as Accountant
  - Check console logs
  - Verify green debug banner
  - Verify only 1 job work shown

- [ ] **5. Verify Backend** (if still not working)
  ```bash
  node backend/fix-accountant-visibility.js
  ```

---

## Expected Behavior After Fix

### For Accountant (Ravish, ID: 3):
```
✅ Screen Title: "Shared Challans" (not "Internal Job Work")
✅ Debug Banner: GREEN
✅ Console Log: "ACCOUNTANT MODE TRIGGERED"
✅ API Endpoint: /projects/job-work/accountant/3
✅ Job Works Shown: 1 (only JW-2026-0001)
✅ All Others Hidden: JW-2026-0005, 0004, 0003, 0002
```

### For Project Manager:
```
✅ Screen Title: "Internal Job Work"
✅ Debug Banner: YELLOW
✅ Console Log: "FALLING THROUGH TO ELSE BRANCH - NOT ACCOUNTANT"
✅ API Endpoint: /projects/job-work/company/1
✅ Job Works Shown: 5 (all of them)
```

---

## If Still Not Working

1. **Check user.role in Console:**
   ```javascript
   // Run in browser console
   let user = JSON.parse(localStorage.getItem('user'));
   console.log(user.role);  // Should print: 'accountant' (lowercase)
   ```

2. **Check if role is something else:**
   - Maybe it's 'Accountant' (capitalized) - clear storage!
   - Maybe it's 'account' or 'acct' - check auth.js
   - Maybe it's null - user not logged in properly

3. **Verify Backend Query** works:
   ```bash
   # SSH into database or use psql
   SELECT * FROM job_work_requests 
   WHERE accountant_id = 3 
    AND status = 'challan_uploaded' 
    AND challan_file_path IS NOT NULL;
   -- Should return 1 row (JW-2026-0001)
   ```

4. **Check if getAccountantJobWork API is broken:**
   - Open network tab
   - Call manually: `GET /api/projects/job-work/accountant/3`
   - Verify it returns only 1 job work

---

## One More Thing: Check for Multiple Versions

The app might be running from multiple places:
- Expo dev server
- Cached bundle
- Installed app cache
- Old APK/IPA

Solutions:
1. **iOS:** Uninstall from Simulator: `xcrun simctl erase all`
2. **Android:** `adb uninstall com.yourapp && adb install app.apk`
3. **Web:** `Ctrl+Shift+Delete` to clear all storage, then `Ctrl+F5` hard refresh

