# Connect Phone to Backend - Quick Guide

## ✅ What I Just Implemented:

- ✅ Real API integration for Login/Signup
- ✅ Loading states during API calls
- ✅ Error handling with helpful messages
- ✅ Success messages with user name
- ✅ Automatic switch to login after signup

---

## 🔧 Setup Steps:

### Step 1: Find Your Computer's IP Address

Open Command Prompt and run:
```cmd
ipconfig
```

Look for **"IPv4 Address"** under your WiFi adapter.
Example: `192.168.1.100`

---

### Step 2: Update API Configuration

Edit: `gst-management-app/src/config/api.js`

Change this line:
```javascript
const API_BASE_URL = 'http://192.168.1.100:3000/api';
```

Replace `192.168.1.100` with YOUR computer's IP address.

---

### Step 3: Start Backend Server

Open Command Prompt in backend folder:
```cmd
cd gst-management-app\backend
npm run dev
```

You should see:
```
Server running on port 3000
```

Keep this terminal open!

---

### Step 4: Allow Firewall Access

When Windows Firewall asks, click **"Allow access"**

Or manually add rule:
```cmd
netsh advfirewall firewall add rule name="Node Backend" dir=in action=allow protocol=TCP localport=3000
```

---

### Step 5: Restart Expo App

In your Expo terminal, press `r` to reload the app.

Or restart:
```cmd
npx expo start
```

---

## 📱 Test the App:

### Test Signup:
1. Open app on phone
2. Fill in:
   - Name: `Svce`
   - Email: `svce@gmail.com`
   - Password: `password123`
   - Confirm Password: `password123`
   - Role: `Management (Company)`
3. Click **Sign Up**
4. Should see: "Account created successfully!"

### Test Login:
1. Switch to Login
2. Enter same email, password, and role
3. Click **Login**
4. Should see: "Welcome back, Svce!"

---

## 🔍 Troubleshooting:

### Error: "Cannot connect to server"

**Check 1:** Backend is running
```cmd
# In backend folder
npm run dev
```

**Check 2:** IP address is correct
- Run `ipconfig` again
- Update `src/config/api.js` with correct IP

**Check 3:** Phone and computer on same WiFi
- Both must be on the same network
- Not on mobile data

**Check 4:** Firewall is not blocking
```cmd
netsh advfirewall firewall add rule name="Node Backend" dir=in action=allow protocol=TCP localport=3000
```

**Check 5:** Test backend from browser
Open on your phone's browser:
```
http://YOUR_IP:3000
```
Should see: `{"message":"GST Management API"}`

---

### Error: "User already exists"

This means the email is already registered. Try:
1. Use a different email, OR
2. Switch to Login and use existing credentials

---

### Error: "Invalid credentials"

- Check email is correct
- Check password is correct
- Check role matches what you signed up with

---

## 🎯 Quick Test Commands:

**Test backend from computer:**
```cmd
curl http://localhost:3000
```

**Test from phone browser:**
```
http://YOUR_IP:3000
```

**Check if port is open:**
```cmd
netstat -an | findstr :3000
```

---

## 📝 What Happens Now:

1. **Signup:** Creates user in PostgreSQL database
2. **Login:** Verifies credentials and returns JWT token
3. **Success:** Shows welcome message with user's name
4. **Next:** You can add dashboard screens for each role

---

## 🚀 Next Steps:

Once login/signup works:
1. Add AsyncStorage to persist login
2. Create role-based dashboards
3. Add logout functionality
4. Implement protected routes
5. Add GST management features

---

## Need Help?

**Backend not starting?**
- Check: `backend/.env` has correct database settings
- Port: 5433 (not 5432)
- Password: admin123

**App crashing?**
- Run: `npx expo start -c` (clear cache)
- Check: All dependencies installed

**Still stuck?**
- Check backend terminal for errors
- Check Expo terminal for errors
- Check phone's Expo Go app logs
