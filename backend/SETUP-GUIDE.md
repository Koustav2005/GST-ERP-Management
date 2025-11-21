# Backend Setup Guide

## Step 1: Find Your PostgreSQL Password

Your PostgreSQL service is running, but we need the correct password. Try these common defaults:

1. **Check if password is empty** - Some installations have no password
2. **Common defaults**: `postgres`, `admin`, `root`
3. **Check installation notes** - Password might have been set during installation

## Step 2: Test Connection Manually

Open Command Prompt and try:

```cmd
psql -U postgres -d postgres
```

If it asks for a password, try the common ones above. If you can't remember:

### Reset PostgreSQL Password (Windows):

1. Find `pg_hba.conf` file (usually in `C:\Program Files\PostgreSQL\18\data\`)
2. Open it as Administrator
3. Find lines with `md5` or `scram-sha-256` and temporarily change to `trust`
4. Restart PostgreSQL service:
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
   ALTER USER postgres PASSWORD 'your_new_password';
   ```
7. Change `pg_hba.conf` back to `md5` or `scram-sha-256`
8. Restart service again

## Step 3: Update .env File

Once you know the password, update `backend/.env`:

```
DB_PASSWORD=your_actual_password
```

## Step 4: Run Setup

```cmd
npm run setup
```

## Step 5: Start Server

```cmd
npm run dev
```

## Quick Test Commands

Test connection:
```cmd
node test-connection.js
```

Setup database:
```cmd
npm run setup
```

Start server:
```cmd
npm run dev
```
