# Job Work Accountant Visibility Security Fix - Verification Guide

## 🔴 ROOT CAUSE IDENTIFIED

### Original Bug
Accountants could see Job Works not assigned to them if they manipulated:
1. Frontend role checking (localStorage manipulation)
2. Direct API calls to `/projects/job-work/company/:companyId`
3. Frontend logic to call wrong endpoint

### Security Issues Fixed

#### Issue 1: No User Validation in Accountant Endpoint
**File:** `backend/routes/projects.js` (line ~5693)
**Before:** 
```javascript
router.get('/job-work/accountant/:accountantId', authenticateToken, async (req, res) => {
  // No check that logged-in user matches :accountantId parameter
  // Any user could fetch job works for any accountant
```

**After:**
```javascript
// Security: Ensure logged-in user can only fetch their own assigned job works
if (loggedInUserId !== parsedAccountantId && req.user.role !== 'Admin') {
  return res.status(403).json({ error: 'Unauthorized...' });
}
```

#### Issue 2: Company-Wide Endpoint Accessible to Accountants
**File:** `backend/routes/projects.js` (line ~5558)
**Before:**
```javascript
router.get('/job-work/company/:companyId', authenticateToken, async (req, res) => {
  // Returns ALL job works - no role check
  // Accountants could see all company job works
```

**After:**
```javascript
// Security: Accountants should NOT access this endpoint
if (req.user.role === 'Accountant') {
  return res.status(403).json({ error: 'Accountants can only view job works specifically assigned to them...' });
}
```

#### Issue 3: No Authorization Check on Challan Upload
**File:** `backend/routes/projects.js` (line ~5642)
**Before:**
```javascript
router.put('/job-work/:id/challan', authenticateToken, jobWorkUpload.single('challan'), async (req, res) => {
  // Any authenticated user could update any job work and assign accountant
  // No verification that user is the Store Incharge
```

**After:**
```javascript
// Security: Only the assigned Store Incharge can upload challan
if (jobWork.store_incharge_id !== req.user.id) {
  return res.status(403).json({ error: 'Unauthorized: Only the assigned Store Incharge...' });
}

// Verify the accountant exists and belongs to the same company
if (accountant_id) {
  const accountantRes = await pool.query(`
    SELECT id FROM users WHERE id = $1 AND company_id = $2 AND role = 'Accountant'
  `, ...);
  if (accountantRes.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid accountant selected...' });
  }
}
```

---

## ✅ VERIFICATION TEST CASES

### Test 1: Unassigned Accountant Cannot See Job Work
**Scenario:** 
- Project Manager creates Job Work and assigns Store Incharge (NOT Accountant)
- Store Incharge has NOT yet uploaded challan and assigned accountant
- Unassigned Accountant tries to view the job work

**Steps:**
1. Login as Project Manager
2. Create new Job Work with:
   - Store Incharge: "John (Store Manager)"
   - Do NOT assign any accountant
3. Job Work status: "Pending Store Incharge"
4. Logout and Login as "Ravi (Accountant)" - someone NOT assigned
5. Navigate to "Shared Challans" screen
6. **Expected Result:** ✅ No job works visible (empty screen)
7. **Database Query:** 
   ```sql
   SELECT * FROM job_work_requests WHERE accountant_id = <Ravi's ID> AND status = 'challan_uploaded';
   -- Should return: 0 rows
   ```

---

### Test 2: Store Incharge Cannot See Job Work Created for Another Store Incharge
**Scenario:**
- Project Manager creates Job Work assigned to Store Incharge A
- Store Incharge B tries to access it

**Steps:**
1. Login as Project Manager
2. Create Job Work assigned to "John (Store Incharge A)"
3. Logout and Login as "Ram (Store Incharge B)"
4. Navigate to "My Job Work" screen
5. **Expected Result:** ✅ Job work NOT visible (filtered by store_incharge_id)
6. **Database Query:**
   ```sql
   SELECT * FROM job_work_requests 
   WHERE store_incharge_id = <Ram's ID> AND store_incharge_id <> <John's ID>;
   -- Should return: 0 rows for this job work
   ```

---

### Test 3: Assigned Accountant CAN See Job Work After Store Incharge Assignment
**Scenario:**
- Project Manager creates Job Work
- Store Incharge uploads challan and assigns Accountant
- Assigned Accountant can now view it

**Steps:**
1. Login as Project Manager
2. Create Job Work and assign "John (Store Incharge)"
3. Job work saved with status: "Pending Store Incharge"
4. Logout and Login as "John (Store Incharge)"
5. Go to "My Job Work"
6. Find the newly created job work
7. Expand it and click "Upload & Share Challan"
8. Fill in:
   - Accountant: "Ravi (Accountant)" ← IMPORTANT
   - Challan File: Select a PDF
   - Vendor Email: (optional)
9. Click "Upload & Share"
10. **Backend Action:** 
    - Sets `accountant_id = Ravi's ID`
    - Sets `status = 'challan_uploaded'`
    - Sets `challan_file_path = '/uploads/...'`
11. Logout and Login as "Ravi (Accountant)"
12. Navigate to "Shared Challans"
13. **Expected Result:** ✅ Job work IS visible (because accountant_id = Ravi's ID and status = 'challan_uploaded')
14. **Database Query:**
    ```sql
    SELECT * FROM job_work_requests 
    WHERE accountant_id = <Ravi's ID> AND status = 'challan_uploaded' AND challan_file_path IS NOT NULL;
    -- Should return: 1 row (the job work assigned to Ravi)
    ```

---

### Test 4: Security - Cannot Bypass by Calling Company Endpoint
**Scenario:**
- Accountant tries to manipulate API by calling `/projects/job-work/company/:companyId`
- Even if frontend is hacked or user tries curl command

**Steps:**
1. Login as "Ravi (Accountant)" - Get the auth token
2. Make API call (via Postman/curl):
   ```
   GET /api/projects/job-work/company/1
   Authorization: Bearer <Ravi's token>
   ```
3. **Expected Result:** ✅ 403 Forbidden Error
   ```json
   {
     "error": "Accountants can only view job works specifically assigned to them. Use the accountant endpoint."
   }
   ```

---

### Test 5: Security - Cannot Fetch Another Accountant's Job Works
**Scenario:**
- Accountant A tries to fetch job works assigned to Accountant B
- Tries: `GET /api/projects/job-work/accountant/12` (Accountant B's ID)
- But logged in as Accountant A (ID: 5)

**Steps:**
1. Login as "Ravi (Accountant A)" with ID=5 - Get auth token
2. Make API call:
   ```
   GET /api/projects/job-work/accountant/12
   Authorization: Bearer <Ravi's token>
   ```
3. **Expected Result:** ✅ 403 Forbidden
   ```json
   {
     "error": "Unauthorized: You can only view job works assigned to you"
   }
   ```
4. Admin CAN fetch: `GET /api/projects/job-work/accountant/12` (as Admin)
   - **Expected Result:** ✅ 200 OK (Admin can view any accountant's job works)

---

### Test 6: Security - Cannot Upload Challan if Not Store Incharge
**Scenario:**
- Project Manager creates Job Work for Store Incharge A
- Project Manager B (different user, same role) tries to upload challan

**Steps:**
1. Login as Project Manager A
2. Create Job Work assigned to "John (Store Incharge)"
3. Get the Job Work ID (e.g., ID=5)
4. Logout
5. Login as Project Manager B (different PM, same company)
6. Try to upload challan via API:
   ```
   PUT /api/projects/job-work/5/challan
   Authorization: Bearer <PM B's token>
   
   Body:
   - challan (file)
   - accountant_id: 7
   - vendor_email: vendor@test.com
   ```
7. **Expected Result:** ✅ 403 Forbidden
   ```json
   {
     "error": "Unauthorized: Only the assigned Store Incharge can upload challan and assign accountant"
   }
   ```

---

### Test 7: Verify Accountant Assignment Validation
**Scenario:**
- Store Incharge tries to assign an invalid accountant (user doesn't exist or is not an accountant)

**Steps:**
1. Login as Store Incharge
2. Find a Job Work
3. Try to upload challan with invalid accountant:
   ```
   PUT /api/projects/job-work/5/challan
   
   Body:
   - challan (file)
   - accountant_id: 999 (non-existent user)
   - vendor_email: vendor@test.com
   ```
4. **Expected Result:** ✅ 400 Bad Request
   ```json
   {
     "error": "Invalid accountant selected or accountant does not belong to this company"
   }
   ```

---

## 📋 DATABASE VERIFICATION QUERIES

Run these to verify the implementation:

### Query 1: Check if Store Incharge is assigned to all job works
```sql
SELECT id, job_id, store_incharge_id, accountant_id, status, created_at
FROM job_work_requests
WHERE company_id = 1
ORDER BY created_at DESC;
```
**Expected:** All rows have `store_incharge_id` populated

### Query 2: Check accountant_id is NULL for pending job works
```sql
SELECT id, job_id, store_incharge_id, accountant_id, status
FROM job_work_requests
WHERE status = 'Pending Store Incharge';
```
**Expected:** All rows have `accountant_id = NULL`

### Query 3: Check accountant_id is populated only for challan_uploaded
```sql
SELECT id, job_id, store_incharge_id, accountant_id, status, challan_file_path
FROM job_work_requests
WHERE status = 'challan_uploaded';
```
**Expected:** All rows have `accountant_id` populated AND `challan_file_path` populated

### Query 4: Verify no job work is visible to accountant if not assigned
```sql
-- For Accountant with ID = 5
SELECT COUNT(*) FROM job_work_requests
WHERE accountant_id = 5
  AND status = 'challan_uploaded'
  AND challan_file_path IS NOT NULL;

-- Compare with total job works for this accountant
SELECT COUNT(*) FROM job_work_requests
WHERE company_id = (SELECT company_id FROM users WHERE id = 5);
```
**Expected:** First query returns ONLY job works assigned to accountant 5

---

## 🔧 FILES MODIFIED

1. **backend/routes/projects.js**
   - `GET /job-work/company/:companyId` - Added role check to prevent accountants
   - `GET /job-work/accountant/:accountantId` - Added user validation
   - `PUT /job-work/:id/challan` - Added authorization checks

2. **backend/create-job-work-tables.js**
   - Added `store_incharge_id` column to initial CREATE TABLE (for fresh deployments)
   - Changed status default from 'pending' to 'Pending Store Incharge'

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Run database migration for existing databases (add `store_incharge_id` if missing)
- [ ] Deploy updated backend code
- [ ] Clear app cache on client devices
- [ ] Test each scenario above
- [ ] Verify logs for 403 errors when unauthorized access is attempted
- [ ] Confirm accountants only see assigned job works

---

## ⚠️ IMPORTANT SECURITY NOTES

1. **Backend is the Source of Truth** - All access control is enforced on backend, not frontend
2. **User Validation** - Every endpoint verifies the logged-in user's ID against the parameter
3. **Role-Based Access** - Different endpoints for different roles (accountant vs. company-wide)
4. **Accountant Existence Validation** - When assigning accountant, system verifies they exist and belong to the same company

---

## 📊 SUMMARY OF FIXES

| Issue | Before | After | Risk Level |
|-------|--------|-------|------------|
| Accountant could see ALL company job works | ❌ No check | ✅ Blocked by role | 🔴 Critical |
| Accountant could fetch another accountant's job works | ❌ No user validation | ✅ 403 Forbidden | 🔴 Critical |
| Non-Store Incharge could assign accountant | ❌ No authorization | ✅ 403 Forbidden | 🔴 Critical |
| Invalid accountant could be assigned | ❌ No validation | ✅ 400 Bad Request | 🟡 Medium |

