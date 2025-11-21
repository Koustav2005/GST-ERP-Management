# GST Management App - Complete Setup Instructions

## Current Status
✅ Frontend created (React Native Expo)
✅ Backend created (Node.js + Express)
✅ PostgreSQL installed and running
⚠️ Need to configure database password

---

## Backend & Database Setup

### Quick Setup (Choose One Method)

#### Method 1: Interactive Setup (Easiest) ⭐

```cmd
cd gst-management-app\backend
node interactive-setup.js
```

Follow the prompts and enter your PostgreSQL password when asked.

#### Method 2: Manual Setup

1. **Find/Reset PostgreSQL Password**

   Try connecting:
   ```cmd
   psql -U postgres
   ```

   If you don't know the password, reset it:
   
   a. Open as Administrator: `C:\Program Files\PostgreSQL\18\data\pg_hba.conf`
   
   b. Change this line:
   ```
   host    all             all             127.0.0.1/32            scram-sha-256
   ```
   To:
   ```
   host    all             all             127.0.0.1/32            trust
   ```
   
   c. Restart PostgreSQL:
   ```cmd
   net stop postgresql-x64-18
   net start postgresql-x64-18
   ```
   
   d. Connect and set password:
   ```cmd
   psql -U postgres
   ```
   ```sql
   ALTER USER postgres PASSWORD 'mypassword';
   \q
   ```
   
   e. Change `pg_hba.conf` back to `scram-sha-256` and restart again

2. **Update .env file**

   Edit `gst-management-app\backend\.env`:
   ```
   DB_PASSWORD=mypassword
   ```

3. **Run setup**
   ```cmd
   cd gst-management-app\backend
   npm run setup
   ```

---

## Start the Application

### 1. Start Backend Server

```cmd
cd gst-management-app\backend
npm run dev
```

You should see:
```
Server running on port 3000
```

### 2. Start Frontend (New Terminal)

```cmd
cd gst-management-app
npx expo start
```

Scan the QR code with Expo Go app on your phone.

---

## Update Frontend API URL

Before testing on your phone, update the API URL:

Edit `gst-management-app\src\config\api.js`:

```javascript
// Replace localhost with your computer's IP address
const API_BASE_URL = 'http://YOUR_COMPUTER_IP:3000/api';
```

To find your IP:
```cmd
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

---

## Test the Setup

### Test Backend API

Open browser: http://localhost:3000

You should see: `{"message":"GST Management API"}`

### Test Signup

```cmd
curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"name\":\"Admin User\",\"email\":\"admin@test.com\",\"password\":\"admin123\",\"role\":\"management\"}"
```

### Test Login

```cmd
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@test.com\",\"password\":\"admin123\",\"role\":\"management\"}"
```

---

## Available Roles

- `management` - Management (Company)
- `project_manager` - Project Manager
- `accounts` - Accounts
- `store_incharge` - Store Incharge
- `worker` - Worker
- `sales_executive` - Sales Executive
- `npd` - NPD

---

## Troubleshooting

**Backend won't start:**
- Check if port 3000 is free
- Verify PostgreSQL is running: `Get-Service postgresql-x64-18`

**Can't connect from phone:**
- Make sure phone and computer are on same WiFi
- Update API_BASE_URL with your computer's IP
- Check firewall isn't blocking port 3000

**Database errors:**
- Verify password in .env file
- Run `node test-connection.js` to test connection

---

## Next Steps

Once everything is working:
1. Test login/signup on your phone
2. Add more features (dashboard, GST forms, etc.)
3. Implement role-based screens
4. Add data management features

Need help? Check the files:
- `backend/QUICK-START.md` - Detailed backend setup
- `backend/test-connection.js` - Test database connection
- `backend/interactive-setup.js` - Interactive setup wizard
