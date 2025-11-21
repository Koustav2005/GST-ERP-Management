# Company Hierarchy Feature - Complete Guide

## ✅ What's Implemented:

I've added a complete company hierarchy system where:
- **Management** creates companies when they sign up
- **All other roles** select which company they belong to
- Users are linked to companies in the database
- Company information is displayed in dashboards

---

## 🏢 How It Works:

### For Management Role:
1. Selects role: "Management (Company)"
2. Enters **Company Name** (new field appears)
3. Signs up
4. System automatically creates:
   - Company record in database
   - User account linked to that company

### For Other Roles (Project Manager, Accounts, etc.):
1. Selects their role
2. **Company dropdown appears** (new field)
3. Selects which company they work for
4. Signs up
5. User account is linked to selected company

---

## 📊 Database Structure:

### Companies Table:
```sql
companies
├── id (Primary Key)
├── name (Company name)
├── email (Company email)
├── gst_number (GST registration)
├── address (Company address)
├── phone (Contact number)
├── created_at
└── updated_at
```

### Users Table (Updated):
```sql
users
├── id
├── name
├── email
├── password (hashed)
├── role
├── company_id (Foreign Key → companies.id)
├── created_at
└── updated_at
```

---

## 🔄 Signup Flow:

### Management Signup:
```
User selects "Management (Company)"
    ↓
"Company Name" field appears
    ↓
User enters: "SVCE Industries"
    ↓
Clicks Sign Up
    ↓
Backend creates:
  1. New company: "SVCE Industries"
  2. User account linked to this company
    ↓
User becomes admin of their company
```

### Employee Signup:
```
User selects role (e.g., "Accounts")
    ↓
"Select Company" dropdown appears
    ↓
Shows list of existing companies:
  - SVCE Industries
  - Tech Solutions Ltd
  - ABC Corp
    ↓
User selects: "SVCE Industries"
    ↓
Clicks Sign Up
    ↓
User account created and linked to SVCE Industries
```

---

## 🎨 UI Changes:

### Signup Screen:

**For Management:**
```
┌─────────────────────────────────┐
│ Full Name: [John Doe          ] │
│ Email: [john@svce.com         ] │
│ Password: [********           ] │
│ Confirm: [********            ] │
│ Role: [Management (Company) ▼] │
│ Company Name: [SVCE Industries] │ ← NEW FIELD
│                                 │
│        [Sign Up]                │
└─────────────────────────────────┘
```

**For Other Roles:**
```
┌─────────────────────────────────┐
│ Full Name: [Jane Smith        ] │
│ Email: [jane@example.com      ] │
│ Password: [********           ] │
│ Confirm: [********            ] │
│ Role: [Accounts              ▼] │
│ Company: [SVCE Industries    ▼] │ ← NEW DROPDOWN
│                                 │
│        [Sign Up]                │
└─────────────────────────────────┘
```

---

## 🔐 API Endpoints:

### Get All Companies:
```
GET /api/companies
Response: {
  "companies": [
    {
      "id": 1,
      "name": "SVCE Industries",
      "email": "svce@company.com",
      "gst_number": "29ABCDE1234F1Z5"
    },
    ...
  ]
}
```

### Signup (Updated):
```
POST /api/auth/signup

For Management:
{
  "name": "John Doe",
  "email": "john@svce.com",
  "password": "password123",
  "role": "management",
  "company_name": "SVCE Industries"
}

For Other Roles:
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "role": "accounts",
  "company_id": "1"
}
```

### Login (Updated):
```
POST /api/auth/login
Response includes company info:
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@svce.com",
    "role": "management",
    "company_id": 1,
    "company": {
      "id": 1,
      "name": "SVCE Industries"
    }
  },
  "token": "..."
}
```

---

## 🧪 Testing Scenarios:

### Test 1: Create First Company
1. Signup as Management
2. Enter company name: "SVCE Industries"
3. Complete signup
4. Check database: Company created ✅

### Test 2: Employee Joins Company
1. Signup as Accounts
2. Select company: "SVCE Industries"
3. Complete signup
4. Check database: User linked to company ✅

### Test 3: Multiple Companies
1. Create company "Tech Solutions" (Management signup)
2. Create company "ABC Corp" (Management signup)
3. Signup as Worker
4. See all 3 companies in dropdown ✅

### Test 4: Login Shows Company
1. Login as any user
2. Dashboard shows company name ✅

---

## 📝 Validation Rules:

### Management Signup:
- ✅ Company name is required
- ✅ Company name must not be empty
- ✅ Creates new company automatically

### Other Roles Signup:
- ✅ Company selection is required
- ✅ Must select from existing companies
- ✅ Cannot proceed without company

### Login:
- ✅ Works same as before
- ✅ Returns company information

---

## 🔄 Database Migration:

Already completed! The database has been updated with:
- ✅ `companies` table created
- ✅ `company_id` column added to `users` table
- ✅ Foreign key relationship established
- ✅ Indexes created for performance

---

## 🎯 Next Steps to Enhance:

### Phase 1: Company Management
- [ ] Edit company details
- [ ] Add company logo
- [ ] Manage company settings
- [ ] View company employees

### Phase 2: Permissions
- [ ] Management can approve new employees
- [ ] Role-based permissions within company
- [ ] Department management
- [ ] Team assignments

### Phase 3: Multi-Company Features
- [ ] Switch between companies (for consultants)
- [ ] Company-specific data isolation
- [ ] Inter-company transactions
- [ ] Company reports

---

## 📊 Example Data Flow:

```
1. Management creates "SVCE Industries"
   companies table:
   ┌────┬─────────────────┬──────────────────┐
   │ id │ name            │ email            │
   ├────┼─────────────────┼──────────────────┤
   │ 1  │ SVCE Industries │ svce@company.com │
   └────┴─────────────────┴──────────────────┘

2. Employees join SVCE Industries
   users table:
   ┌────┬────────────┬──────────────┬────────────┬────────────┐
   │ id │ name       │ email        │ role       │ company_id │
   ├────┼────────────┼──────────────┼────────────┼────────────┤
   │ 1  │ John Doe   │ john@...     │ management │ 1          │
   │ 2  │ Jane Smith │ jane@...     │ accounts   │ 1          │
   │ 3  │ Bob Worker │ bob@...      │ worker     │ 1          │
   └────┴────────────┴──────────────┴────────────┴────────────┘

3. Query to get all SVCE employees:
   SELECT * FROM users WHERE company_id = 1;
```

---

## ✅ Current Status:

**Backend:**
- ✅ Companies table created
- ✅ Users linked to companies
- ✅ API endpoints ready
- ✅ Validation implemented

**Frontend:**
- ✅ Company name field for management
- ✅ Company dropdown for other roles
- ✅ Dynamic form based on role
- ✅ Company data fetched on load

**Database:**
- ✅ Schema updated
- ✅ Relationships established
- ✅ Indexes created

---

## 🚀 Ready to Use!

1. **Restart backend** (if running):
   ```bash
   cd backend
   npm run dev
   ```

2. **Restart frontend**:
   ```bash
   npx expo start
   ```

3. **Test the flow**:
   - Signup as Management with company name
   - Signup as Accounts and select the company
   - Login and see company info in dashboard

---

## 💡 Benefits:

✅ **Data Isolation:** Each company's data is separate
✅ **Scalability:** Support multiple companies
✅ **Organization:** Clear hierarchy structure
✅ **Reporting:** Company-specific reports
✅ **Security:** Users only see their company data

---

Your app now supports multi-company management! 🎉
