# Solution: Avoid Changing IP Address

## 🎯 Problem:
Your IP address changes when:
- You reconnect to WiFi
- Router assigns new IP (DHCP)
- You switch networks
- Laptop restarts

## ✅ Solutions:

---

## Solution 1: Use Auto-Update Script (Easiest) ⭐

Run this script whenever your IP changes:

```cmd
auto-update-ip.bat
```

**What it does:**
1. Automatically detects your current IP
2. Updates `src/config/api.js`
3. Shows the new IP
4. Reminds you to reload Expo

**When to use:**
- Every time you open your laptop
- After reconnecting to WiFi
- When you get connection errors

---

## Solution 2: Set Static IP Address (Best for Development)

### Windows Steps:

1. **Open Network Settings:**
   - Press `Win + R`
   - Type: `ncpa.cpl`
   - Press Enter

2. **Configure WiFi Adapter:**
   - Right-click your WiFi adapter
   - Select "Properties"
   - Double-click "Internet Protocol Version 4 (TCP/IPv4)"

3. **Set Static IP:**
   ```
   Use the following IP address:
   IP address: 192.168.1.100 (or similar)
   Subnet mask: 255.255.255.0
   Default gateway: 192.168.1.1 (your router IP)
   
   Preferred DNS: 8.8.8.8
   Alternate DNS: 8.8.4.4
   ```

4. **Update App Config:**
   ```javascript
   // src/config/api.js
   const API_BASE_URL = 'http://192.168.1.100:3000/api';
   ```

**Pros:**
- ✅ IP never changes
- ✅ No need to update config
- ✅ Reliable connection

**Cons:**
- ⚠️ Only works on your home network
- ⚠️ Need to change back for other networks

---

## Solution 3: Use Computer Name (Windows)

Instead of IP, use your computer name:

1. **Find Computer Name:**
   ```cmd
   hostname
   ```
   Example output: `DESKTOP-ABC123`

2. **Update Config:**
   ```javascript
   // src/config/api.js
   const API_BASE_URL = 'http://DESKTOP-ABC123.local:3000/api';
   ```

**Pros:**
- ✅ Works regardless of IP changes
- ✅ No need to update

**Cons:**
- ⚠️ May not work on all networks
- ⚠️ Requires mDNS support

---

## Solution 4: Use Environment Variable

Create a config that detects environment:

```javascript
// src/config/api.js
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get IP from Expo's manifest
const getApiUrl = () => {
  if (__DEV__) {
    // Development mode
    const { manifest } = Constants;
    const api = manifest?.debuggerHost?.split(':').shift();
    return `http://${api}:3000/api`;
  }
  // Production mode
  return 'https://your-production-api.com/api';
};

const API_BASE_URL = getApiUrl();
```

**Pros:**
- ✅ Automatically detects IP
- ✅ Works in development
- ✅ Easy switch to production

**Cons:**
- ⚠️ Requires expo-constants package

---

## Solution 5: Use ngrok (For Remote Testing)

Expose your local server to the internet:

1. **Install ngrok:**
   - Download from: https://ngrok.com/download
   - Extract to a folder

2. **Start Backend:**
   ```cmd
   cd backend
   npm run dev
   ```

3. **Start ngrok:**
   ```cmd
   ngrok http 3000
   ```

4. **Copy URL:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```

5. **Update Config:**
   ```javascript
   const API_BASE_URL = 'https://abc123.ngrok.io/api';
   ```

**Pros:**
- ✅ Works from anywhere
- ✅ No IP issues
- ✅ Can test on mobile data

**Cons:**
- ⚠️ URL changes each time (free version)
- ⚠️ Requires internet

---

## Solution 6: Development vs Production Config

Create separate configs:

```javascript
// src/config/api.js
const DEV_API_URL = 'http://10.69.76.87:3000/api'; // Your current IP
const PROD_API_URL = 'https://api.yourcompany.com/api';

const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
```

Update only `DEV_API_URL` when IP changes.

---

## 🎯 Recommended Approach:

### For Daily Development:
1. **Use auto-update script** when IP changes
2. **Set static IP** if always on same network
3. **Use ngrok** for testing on mobile data

### Quick Fix:
```cmd
# Run this when you open laptop
auto-update-ip.bat
```

### Long-term Solution:
Set static IP address (Solution 2)

---

## 📝 Quick Commands:

**Check current IP:**
```cmd
ipconfig | findstr "IPv4"
```

**Update IP automatically:**
```cmd
auto-update-ip.bat
```

**Test backend:**
```cmd
curl http://localhost:3000
```

**Restart Expo:**
```cmd
npx expo start
# Press: r
```

---

## 🔍 Troubleshooting:

**IP changed but app still shows old IP:**
- Run `auto-update-ip.bat`
- Restart Expo app (press `r`)

**Can't connect even with correct IP:**
- Check firewall: `backend\allow-firewall.bat` (as admin)
- Check backend is running: `npm run dev`
- Check same WiFi network

**Want to avoid this completely:**
- Set static IP (Solution 2)
- Or use ngrok (Solution 5)

---

## 💡 Best Practice:

**Development Workflow:**
1. Open laptop
2. Run `auto-update-ip.bat`
3. Start backend: `npm run dev`
4. Start frontend: `npx expo start`
5. Develop! 🚀

**Or set static IP once and forget about it!**
