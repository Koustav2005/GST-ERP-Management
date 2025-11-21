# Quick Start Guide - Backend Setup

## Option 1: Interactive Setup (Recommended)

Run this command and follow the prompts:

```cmd
node interactive-setup.js
```

It will ask for:
- PostgreSQL host (press Enter for localhost)
- PostgreSQL port (press Enter for 5432)
- PostgreSQL username (press Enter for postgres)
- **PostgreSQL password** (enter your password)
- Database name (press Enter for gst_management)

---

## Option 2: Manual Setup

### Step 1: Find Your PostgreSQL Password

Try connecting with psql:

```cmd
psql -U postgres
```

If it asks for a password and you don't know it, you'll need to reset it.

### Step 2: Reset Password (if needed)

1. Open `C:\Program Files\PostgreSQL\18\data\pg_hba.conf` as Administrator

2. Find this line:
   ```
   host    all             all             127.0.0.1/32            scram-sha-256
   ```

3. Change `scram-sha-256` to `trust`:
   ```
   host    all             all             127.0.0.1/32            trust
   ```

4. Restart PostgreSQL:
   ```cmd
   net stop postgresql-x64-18
   net start postgresql-x64-18
   ```

5. Connect without password:
   ```cmd
   psql -U postgres
   ```

6. Set new password:
   ```sql
   ALTER USER postgres PASSWORD 'your_password';
   \q
   ```

7. Change `pg_hba.conf` back to `scram-sha-256`

8. Restart PostgreSQL again

### Step 3: Update .env File

Edit `backend/.env` and set your password:

```
DB_PASSWORD=your_actual_password
```

### Step 4: Run Setup

```cmd
npm run setup
```

---

## Start the Server

Once setup is complete:

```cmd
npm run dev
```

Server will run on http://localhost:3000

---

## Test the API

### Signup:
```bash
curl -X POST http://localhost:3000/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\",\"role\":\"management\"}"
```

### Login:
```bash
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\",\"role\":\"management\"}"
```

---

## Troubleshooting

**Connection refused error:**
- Check if PostgreSQL service is running: `Get-Service postgresql-x64-18`
- Start it if stopped: `net start postgresql-x64-18`

**Authentication failed:**
- Verify password in `.env` file
- Try resetting password (see Step 2 above)

**Database already exists:**
- That's fine! The setup will use the existing database

**Port 3000 already in use:**
- Change PORT in `.env` file to another port (e.g., 3001)
