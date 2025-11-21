# 🚀 Quick Setup Guide

## ✅ What's Already Done
- React Native Expo app created
- Backend API with authentication
- PostgreSQL database schema
- All dependencies installed

## 🎯 What You Need to Do

### Step 1: Setup Database (5 minutes)

**Option A - Easy Way:**
```cmd
cd gst-management-app\backend
setup.bat
```
Choose option 1 (Interactive Setup) and enter your PostgreSQL password.

**Option B - Command Line:**
```cmd
cd gst-management-app\backend
node interactive-setup.js
```

**Don't know your PostgreSQL password?**
See `backend/QUICK-START.md` for password reset instructions.

---

### Step 2: Start Backend Server

**Easy Way:**
```cmd
cd gst-management-app\backend
start.bat
```

**Or:**
```cmd
cd gst-management-app\backend
npm run dev
```

Keep this terminal open. You should see:
```
Server running on port 3000
```

---

### Step 3: Update API URL for Phone Testing

1. Find your computer's IP address:
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)

2. Edit `src/config/api.js`:
   ```javascript
   const API_BASE_URL = 'http://192.168.1.100:3000/api';
   ```

---

### Step 4: Start Frontend (New Terminal)

**Easy Way:**
```cmd
cd gst-management-app
start-frontend.bat
```

**Or:**
```cmd
cd gst-management-app
npx expo start
```

Scan the QR code with **Expo Go** app on your phone.

---

## 📱 Test the App

1. Open the app on your phone
2. Select a role from dropdown (e.g., "Management")
3. Enter name, email, password
4. Click "Sign Up"
5. Try logging in with the same credentials

---

## 🎨 Available User Roles

- **Management (Company)** - Full access
- **Project Manager** - Project management
- **Accounts** - Financial & GST
- **Store Incharge** - Inventory management
- **Worker** - Basic access
- **Sales Executive** - Sales management
- **NPD** - New Product Development

---

## 🔧 Troubleshooting

**"Connection refused" error:**
```cmd
Get-Service postgresql-x64-18
net start postgresql-x64-18
```

**"Authentication failed":**
- Check password in `backend/.env`
- Run `node test-connection.js` to verify

**Can't connect from phone:**
- Ensure phone and computer on same WiFi
- Check firewall settings for port 3000
- Verify IP address in `src/config/api.js`

**Port 3000 already in use:**
- Change PORT in `backend/.env` to 3001
- Update API_BASE_URL in frontend

---

## 📚 Helpful Files

- `SETUP-INSTRUCTIONS.md` - Detailed setup guide
- `backend/QUICK-START.md` - Backend setup details
- `backend/test-connection.js` - Test database connection
- `backend/interactive-setup.js` - Setup wizard

---

## 🎉 Next Steps

Once everything works:
1. Create role-based dashboards
2. Add GST form management
3. Implement invoice generation
4. Add project tracking
5. Build inventory management

Need help? All setup scripts are in the `backend` folder!
