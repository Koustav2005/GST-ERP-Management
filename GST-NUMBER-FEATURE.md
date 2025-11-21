# GST Number Feature - Added!

## ✅ What's New:

Added GST Number field for Management signup:
- **Optional field** - Management can enter GST number during signup
- **Auto-uppercase** - Automatically converts to uppercase
- **15 character limit** - Standard GST number format
- **Stored in database** - Saved in companies table
- **Returned in API** - Included in login/signup responses

---

## 🎨 UI Changes:

### Management Signup Form:

```
┌─────────────────────────────────────┐
│ Full Name: [John Doe             ] │
│ Email: [john@svce.com            ] │
│ Password: [********              ] │
│ Confirm Password: [********      ] │
│ Role: [Management (Company)     ▼] │
│ Company Name: [SVCE Industries   ] │
│ GST Number: [29ABCDE1234F1Z5    ] │ ← NEW (Optional)
│                                     │
│           [Sign Up]                 │
└─────────────────────────────────────┘
```

---

## 📊 Database:

GST number is stored in the `companies` table:

```sql
companies
├── id
├── name
├── email
├── gst_number ← Stores the GST number
├── address
├── phone
├── created_at
└── updated_at
```

---

## 🔄 API Changes:

### Signup Request (Management):
```json
POST /api/auth/signup
{
  "name": "John Doe",
  "email": "john@svce.com",
  "password": "password123",
  "role": "management",
  "company_name": "SVCE Industries",
  "gst_number": "29ABCDE1234F1Z5"
}
```

### Signup Response:
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@svce.com",
    "role": "management",
    "company_id": 1,
    "company": {
      "id": 1,
      "name": "SVCE Industries",
      "gst_number": "29ABCDE1234F1Z5"
    }
  },
  "token": "..."
}
```

### Login Response:
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@svce.com",
    "role": "management",
    "company_id": 1,
    "company": {
      "id": 1,
      "name": "SVCE Industries",
      "gst_number": "29ABCDE1234F1Z5"
    }
  },
  "token": "..."
}
```

---

## ✨ Features:

### Auto-Uppercase:
- User types: `29abcde1234f1z5`
- Automatically converts to: `29ABCDE1234F1Z5`

### Optional Field:
- Management can skip GST number during signup
- Can be added later (future feature)

### Character Limit:
- Maximum 15 characters (standard GST format)
- Format: 2 digits + 10 alphanumeric + 1 digit + 1 letter + 1 alphanumeric

---

## 🧪 Testing:

### Test 1: Signup with GST Number
1. Select role: Management (Company)
2. Enter company name: "SVCE Industries"
3. Enter GST number: "29ABCDE1234F1Z5"
4. Sign up
5. Check response: GST number included ✅

### Test 2: Signup without GST Number
1. Select role: Management (Company)
2. Enter company name: "Tech Solutions"
3. Leave GST number empty
4. Sign up
5. Company created without GST ✅

### Test 3: Auto-Uppercase
1. Enter GST: "29abcde1234f1z5"
2. Field shows: "29ABCDE1234F1Z5" ✅

### Test 4: Login Shows GST
1. Login as management user
2. Response includes company.gst_number ✅

---

## 📝 GST Number Format:

Standard Indian GST format:
```
29ABCDE1234F1Z5
││││││││││││││└─ Check digit
│││││││││││││└── Z (default)
││││││││││││└─── Entity code (1-9, A-Z)
│││││││││││└──── Reserved (blank)
││││││││││└───── PAN (10 characters)
│└────────────── State code (01-37)
```

Example valid GST numbers:
- `29ABCDE1234F1Z5`
- `27XYZAB5678G2Y4`
- `09AABCU9603R1ZM`

---

## 🔍 Validation (Future Enhancement):

Can add validation for:
- [ ] Check digit verification
- [ ] State code validation (01-37)
- [ ] PAN format validation
- [ ] Duplicate GST number check

---

## 📊 Use Cases:

### Invoice Generation:
- Use company GST number on invoices
- Required for GST-compliant billing

### GST Filing:
- Pre-fill GST number in forms
- Track GST returns by company

### Reports:
- Filter by GST number
- Company-wise GST reports

### Compliance:
- Verify GST registration
- Track GST status

---

## 🚀 To Test:

1. **Restart backend** (if running):
   ```bash
   cd backend
   npm run dev
   ```

2. **Restart frontend**:
   ```bash
   npx expo start
   ```
   Press `r` to reload

3. **Test signup**:
   - Role: Management (Company)
   - Company Name: SVCE Industries
   - GST Number: 29ABCDE1234F1Z5
   - Sign up

4. **Verify**:
   ```bash
   cd backend
   node check-companies.js
   ```
   See GST number in company details!

---

## ✅ Summary:

**Added:**
- ✅ GST Number field for management signup
- ✅ Auto-uppercase conversion
- ✅ 15 character limit
- ✅ Optional field (can be empty)
- ✅ Stored in database
- ✅ Returned in API responses

**Files Updated:**
- ✅ `src/screens/AuthScreen.js` - Added GST input field
- ✅ `src/config/api.js` - Updated signup API call
- ✅ `backend/routes/auth.js` - Handle GST in signup/login

Ready to use! 🎉
