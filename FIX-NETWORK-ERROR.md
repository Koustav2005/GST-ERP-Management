# Fix: Network Error When Fetching Companies

## ✅ What I Fixed:

1. **Better error handling** - App won't crash if companies can't be fetched
2. **Retry button** - Users can retry loading companies
3. **Connection test component** - Shows API URL and connection status
4. **Graceful fallback** - Empty array if fetch fails

---

## 🔍 Diagnosing the Issue:

The error "Error fetching companies: Network Error" means the app can't connect to the backend.

### Possible Causes:

1. **Backend not running**
2. **Wrong IP address detected**
3. **Firewall blocking connection**
4. **Phone and computer on different networks**

---

## 🚀 Quick Fix Steps:

### Step 1: Check Backend is Running

```bash
cd backend
npm run dev
```

Should see: `Server running on port 3000`

### Step 2: Check Firewall

Run as administrator:
```bash
backend\allow-firewall.bat
```

### Step 3: Restart Expo App

```bash
npx expo start
```

Press `r` to reload

### Step 4: Check Connection Test

The app now shows a "Connection Status" box at the top.

Look for:
- ✅ `Connected! Found X companies` - Working!
- ❌ `Connection failed` - Need to fix

---

## 🔍 What the Connection Test Shows:

### Success:
```
Connection Status
API: http://10.69.76.87:3000/api
✅ Connected! Found 1 companies
```

### Failure:
```
Connection Status
API: http://10.69.76.87:3000/api
❌ Connection failed: Network Error
```

---

## 🛠️ Troubleshooting by Error:

### Error: "Network Error"

**Cause:** Can't reach backend

**Fix:**
1. Check backend is running
2. Check IP address is correct
3. Check firewall
4. Check same WiFi

### Error: "timeout of 10000ms exceeded"

**Cause:** Backend too slow or not responding

**Fix:**
1. Restart backend
2. Check backend logs for errors
3. Increase timeout in api.js

### Error: "Request failed with status code 500"

**Cause:** Backend error

**Fix:**
1. Check backend terminal for errors
2. Check database is connected
3. Check backend logs

---

## 📊 Verify Each Step:

### 1. Backend Running?
```bash
netstat -ano | findstr :3000
```
Should show: `LISTENING`

### 2. Backend Responding?
```bash
curl http://localhost:3000
```
Should show: `{"message":"GST Management API"}`

### 3. Companies Endpoint Working?
```bash
curl http://localhost:3000/api/companies
```
Should show: `{"companies":[...]}`

### 4. Firewall Allowing?
```bash
netsh advfirewall firewall show rule name="GST Backend API"
```
Should show rule details

### 5. Same WiFi?
- Check phone WiFi settings
- Check computer WiFi settings
- Must be same network

---

## 🎯 Common Solutions:

### Solution 1: Restart Everything

```bash
# Stop backend (Ctrl+C)
# Stop Expo (Ctrl+C)

# Start backend
cd backend
npm run dev

# Start frontend (new terminal)
cd ..
npx expo start
```

### Solution 2: Check IP Detection

Look in Expo terminal for:
```
🔍 Auto-detected IP: 10.69.76.87
📡 API URL: http://10.69.76.87:3000/api
```

If IP is wrong, manually set it:
```javascript
// src/config/api.js
const API_BASE_URL = 'http://YOUR_CORRECT_IP:3000/api';
```

### Solution 3: Use Manual IP

If auto-detection fails:
```bash
cd src/config
ren api.js api-smart.js
ren api-manual.js api.js
# Edit api.js with correct IP
```

### Solution 4: Test from Computer First

```bash
# In Expo terminal
npx expo start --web
```

Test in browser on your computer. If it works there but not on phone, it's a network issue.

---

## 🔧 Advanced Debugging:

### Check Expo Logs:
Look for errors in Expo terminal

### Check Backend Logs:
Look for errors in backend terminal

### Check Phone Logs:
Shake phone → Show Dev Menu → Debug Remote JS

### Network Inspector:
Shake phone → Show Dev Menu → Toggle Inspector → Network tab

---

## ✅ After Fixing:

You should see:
1. Connection test shows: ✅ Connected!
2. Companies dropdown populated
3. No error messages
4. Login/Signup works

---

## 💡 Prevention:

### Daily Workflow:
1. Start backend: `npm run dev`
2. Start frontend: `npx expo start`
3. Check connection test
4. If green, you're good!

### If Connection Fails:
1. Click "🔄 Test Again" button
2. Check backend is running
3. Check firewall
4. Restart if needed

---

## 📝 What Changed:

**Before:**
- App crashed if companies fetch failed
- No way to retry
- No visibility into connection status

**After:**
- App handles errors gracefully
- Retry button available
- Connection test shows status
- Better error messages

---

## 🎉 Summary:

The app now:
- ✅ Won't crash on network errors
- ✅ Shows connection status
- ✅ Allows retry
- ✅ Provides better feedback
- ✅ Helps diagnose issues

Just restart Expo and check the connection test! 🚀
