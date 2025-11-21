# GST Management App

A React Native Expo app for GST management with role-based authentication.

## Features

- Login/Signup with role selection
- 7 user roles: Management, Project Manager, Accounts, Store Incharge, Worker, Sales Executive, NPD
- PostgreSQL database
- JWT authentication

## Setup Instructions

### Frontend (React Native Expo)

1. Navigate to the project directory:
```bash
cd gst-management-app
```

2. Install dependencies (already done):
```bash
npm install
```

3. Start the Expo development server:
```bash
npm start
```

4. Scan the QR code with Expo Go app on your phone

### Backend (Node.js + PostgreSQL)

1. Install PostgreSQL and create a database:
```sql
CREATE DATABASE gst_management;
```

2. Run the schema:
```bash
psql -U postgres -d gst_management -f backend/database/schema.sql
```

3. Navigate to backend directory:
```bash
cd backend
```

4. Install dependencies:
```bash
npm install
```

5. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

6. Update `.env` with your database credentials

7. Start the server:
```bash
npm run dev
```

## User Roles

- **Management (Company)**: Full access to all features
- **Project Manager**: Manage projects and teams
- **Accounts**: Handle financial transactions and GST
- **Store Incharge**: Manage inventory
- **Worker**: Basic access for task completion
- **Sales Executive**: Manage sales and clients
- **NPD**: New Product Development access

## API Endpoints

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

## Tech Stack

- **Frontend**: React Native, Expo SDK 54
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Authentication**: JWT
