# How to Connect to PostgreSQL Database

## Method 1: Interactive Setup (Easiest) ⭐

This will ask you for your password and set everything up:

```cmd
cd gst-management-app\backend
node interactive-setup.js
```

Just answer the prompts:
- Host: Press Enter (uses localhost)
- Port: Press Enter (uses 5432)
- Username: Press Enter (uses postgres)
- **Password: Enter your PostgreSQL password**
- Database: Press Enter (uses gst_management)

---

## Method 2: Find Your Password First

### Option A: Try Common Passwords

Open Command Prompt and try:

```cmd
psql -U postgres
```

When it asks for password, try these common defaults:
- `postgres`
- `admin`
- `root`
- (empty - just press Enter)

If one works, remember it!

### Option B: Reset Password

1. **Open pg_hba.conf as Administrator:**
   ```
   C:\Program Files\PostgreSQL\18\data\pg_hba.conf
   ```

2. **Find this line:**
   ```
   host    all             all             127.0.0.1/32            scram-sha-256
   ```

3. **Change to:**
   ```
   host    all             all             127.0.0.1/32            trust
   ```

4. **Restart PostgreSQL:**
   ```cmd
   net stop postgresql-x64-18
   net start postgresql-x64-18
   ```

5. **Connect without password:**
   ```cmd
   psql -U postgres
   ```

6. **Set new password:**
   ```sql
   ALTER USER postgres PASSWORD 'mynewpassword';
   \q
   ```

7. **Change pg_hba.conf back to `scram-sha-256`**

8. **Restart PostgreSQL again**

---

## Method 3: Manual .env Setup

Once you know your password:

1. **Edit:** `gst-management-app\backend\.env`

2. **Update this line:**
   ```
   DB_PASSWORD=your_actual_password
   ```

3. **Test connection:**
   ```cmd
   cd gst-management-app\backend
   node test-connection.js
   ```

4. **If successful, run setup:**
   ```cmd
   npm run setup
   ```

---

## Quick Test Commands

**Test if PostgreSQL is running:**
```cmd
Get-Service postgresql-x64-18
```

**Start PostgreSQL if stopped:**
```cmd
net start postgresql-x64-18
```

**Test database connection:**
```cmd
cd gst-management-app\backend
node test-connection.js
```

**Run interactive setup:**
```cmd
cd gst-management-app\backend
node interactive-setup.js
```

---

## What Happens After Connection?

Once connected, the setup will:
1. ✅ Create database `gst_management`
2. ✅ Create `users` table
3. ✅ Update `.env` file
4. ✅ Ready to start server!

Then you can start the backend:
```cmd
npm run dev
```

---

## Still Having Issues?

**Error: "Connection refused"**
- PostgreSQL service not running
- Run: `net start postgresql-x64-18`

**Error: "Authentication failed"**
- Wrong password in `.env`
- Try resetting password (see Option B above)

**Error: "Database already exists"**
- That's OK! Setup will use existing database
- Just continue with starting the server
