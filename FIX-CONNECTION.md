# Fix Connection Error - Step by Step

## ✅ Good News!

Your database IS set up correctly and WILL store data in the `users` table!

The error you're seeing is just a **connection issue** between your phone and computer.

---

## 🔧 Quick Fix (3 Steps):

### Step 1: Allow Firewall Access

**Right-click** this file and select **"Run as administrator":**
```
backend\allow-firewall.bat
```

This allows your phone to connect to port 3000.

---

### Step 2: Verify Backend is Running

Check if you see this in your backend terminal:
```
Server running on port 3000
```

If not, start it:
```cmd
cd backend
npm run dev
```

---

### Step 3: Restart Expo App

In your Expo terminal, press: **`r`** (to reload)

Or restart completely:
```cmd
npx expo start
```

---

## 📱 Test Again:

1. Open app on phone
2. Fill signup form:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm: `password123`
   - Role: `Management (Company)`
3. Click **Sign Up**

**Expected:** "Account created successfully! Welcome, Test User!"

---

## 🔍 Verify Data is Stored:

After successful signup, check database:

```cmd
cd backend
node check-database.js
```

You'll see your user stored in the database!

---

## 📊 How Data Storage Works:

### When you signup:

1. **App sends data** → Backend API
2. **Backend receives** → Validates data
3. **Password hashed** → bcrypt encryption
4. **Data inserted** → PostgreSQL `users` table
5. **Response sent** → Success message + JWT token

### Database Table Structure:

```
users table:
├── id (auto-generated)
├── name (your name)
├── email (your email)
├── password (hashed - secure!)
├── role (management, accounts, etc.)
├── created_at (timestamp)
└── updated_at (timestamp)
```

---

## 🎯 Current Status:

✅ Database connected (PostgreSQL)
✅ Users table created
✅ Backend API running (port 3000)
✅ Signup endpoint ready
✅ Login endpoint ready
✅ IP address updated (10.117.237.87)
⚠️ Firewall blocking connection

**Just need:** Run `allow-firewall.bat` as administrator!

---

## 🔐 Security Features:

Your data is secure:
- ✅ Passwords are **hashed** (not stored as plain text)
- ✅ JWT tokens for authentication
- ✅ SQL injection prevention
- ✅ Role-based access control

---

## 📝 Alternative: Test from Computer First

If phone connection still doesn't work, test from your computer:

### Option 1: Use Expo Web
```cmd
npx expo start --web
```
Opens in browser on your computer.

### Option 2: Use curl
```cmd
curl -X POST http://localhost:3000/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test\",\"email\":\"test@test.com\",\"password\":\"pass123\",\"role\":\"management\"}"
```

Then check database:
```cmd
node check-database.js
```

You'll see the user stored!

---

## 🆘 Still Not Working?

### Check 1: Backend Running?
```cmd
netstat -ano | findstr :3000
```
Should show LISTENING on port 3000

### Check 2: Database Connected?
```cmd
cd backend
node check-database.js
```
Should show "Database connected successfully"

### Check 3: Firewall Rule Added?
```cmd
netsh advfirewall firewall show rule name="GST Backend API"
```

### Check 4: Same WiFi Network?
- Phone and computer must be on same WiFi
- Not on mobile data

---

## 💡 Summary:

**The database IS working and WILL store your data!**

You just need to:
1. Run `allow-firewall.bat` as administrator
2. Make sure backend is running
3. Reload the app

Then signup will work and data will be stored in PostgreSQL! 🎉
