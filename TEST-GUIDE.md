# Testing Guide - Login & Signup

## ✅ Implementation Complete!

I've implemented:
- ✅ Real API calls to backend
- ✅ Loading states
- ✅ Error handling
- ✅ Success messages
- ✅ Form validation

---

## 🚀 Quick Start:

### 1. Find Your IP
```cmd
setup-ip.bat
```

### 2. Update API Config
Edit `src/config/api.js` with your IP address

### 3. Start Backend
```cmd
cd backend
npm run dev
```

### 4. Start Frontend
```cmd
npx expo start
```

---

## 📱 Test Scenarios:

### ✅ Test 1: Successful Signup

**Steps:**
1. Open app
2. Fill form:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm: `password123`
   - Role: `Management (Company)`
3. Click "Sign Up"

**Expected:**
- Button shows "Please wait..."
- Success alert: "Account created successfully! Welcome, Test User!"
- Automatically switches to Login screen

---

### ✅ Test 2: Successful Login

**Steps:**
1. Switch to Login (if not already)
2. Fill form:
   - Email: `test@example.com`
   - Password: `password123`
   - Role: `Management (Company)`
3. Click "Login"

**Expected:**
- Button shows "Please wait..."
- Success alert: "Welcome back, Test User!"

---

### ✅ Test 3: Validation Errors

**Test 3a: Empty Fields**
- Leave any field empty
- Click Sign Up/Login
- Expected: "Please fill all required fields"

**Test 3b: Password Mismatch**
- Password: `password123`
- Confirm: `password456`
- Expected: "Passwords do not match"

**Test 3c: No Role Selected**
- Fill all fields but leave role as "Select Role"
- Expected: "Please fill all required fields"

---

### ✅ Test 4: Duplicate Email

**Steps:**
1. Try to signup with existing email
2. Expected: "User already exists"

---

### ✅ Test 5: Wrong Credentials

**Steps:**
1. Login with wrong password
2. Expected: "Invalid credentials"

**Steps:**
1. Login with wrong role
2. Expected: "Invalid credentials or role"

---

### ✅ Test 6: Server Connection Error

**Steps:**
1. Stop backend server
2. Try to login/signup
3. Expected: Detailed error message with troubleshooting steps

---

## 🎯 Test All Roles:

Create accounts for each role:

1. **Management:**
   - Email: `management@test.com`
   - Role: `Management (Company)`

2. **Project Manager:**
   - Email: `pm@test.com`
   - Role: `Project Manager`

3. **Accounts:**
   - Email: `accounts@test.com`
   - Role: `Accounts`

4. **Store Incharge:**
   - Email: `store@test.com`
   - Role: `Store Incharge`

5. **Worker:**
   - Email: `worker@test.com`
   - Role: `Worker`

6. **Sales Executive:**
   - Email: `sales@test.com`
   - Role: `Sales Executive`

7. **NPD:**
   - Email: `npd@test.com`
   - Role: `NPD`

---

## 🔍 Verify in Database:

Check if users are created:

```cmd
cd backend
node -e "const pool = require('./config/database'); pool.query('SELECT * FROM users').then(r => console.log(r.rows)).then(() => process.exit())"
```

Or connect to PostgreSQL:
```cmd
psql -U postgres -d gst_management -p 5433
```

```sql
SELECT id, name, email, role FROM users;
```

---

## 📊 Expected API Responses:

### Signup Success:
```json
{
  "user": {
    "id": 1,
    "name": "Test User",
    "email": "test@example.com",
    "role": "management"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login Success:
```json
{
  "user": {
    "id": 1,
    "name": "Test User",
    "email": "test@example.com",
    "role": "management"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Error Response:
```json
{
  "error": "User already exists"
}
```

---

## 🐛 Common Issues:

### Issue: "Cannot connect to server"
**Fix:** 
1. Check backend is running
2. Verify IP address in api.js
3. Check firewall settings
4. Ensure same WiFi network

### Issue: "Network request failed"
**Fix:**
1. Update IP in `src/config/api.js`
2. Restart Expo app
3. Check backend logs

### Issue: Button stays disabled
**Fix:**
- This shouldn't happen (we have finally block)
- Restart app if it does

---

## ✅ Success Checklist:

- [ ] Backend server running on port 3000
- [ ] Database connected (port 5433)
- [ ] IP address updated in api.js
- [ ] Phone and computer on same WiFi
- [ ] Firewall allows port 3000
- [ ] Can signup new user
- [ ] Can login with created user
- [ ] Error messages show correctly
- [ ] Loading states work
- [ ] Success messages show user name

---

## 🎉 Next Features to Add:

1. **Token Storage:** Save JWT token in AsyncStorage
2. **Auto-Login:** Check token on app start
3. **Logout:** Clear token and return to login
4. **Dashboard:** Different screens for each role
5. **Profile:** View/edit user profile
6. **Password Reset:** Forgot password functionality

---

## 📝 Notes:

- Tokens expire in 7 days (configured in backend)
- Passwords are hashed with bcrypt
- Role must match exactly for login
- Email is case-insensitive
- All fields are required

---

Ready to test! 🚀
