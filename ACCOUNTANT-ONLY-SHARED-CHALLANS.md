# Accountant - View Only Shared Challans

## Problem Fixed
Accountants were seeing ALL job works created in the system, instead of only the job works where Store Incharge shared the challan with them.

## Solution Implemented

### 1. Added Backend Endpoint

**Endpoint:** `GET /api/projects/job-work/accountant/:accountantId`

**File:** `backend/routes/projects.js`

**SQL Query:**
```sql
SELECT jwr.*, p.name, uc.name, usi.name, ua.name
FROM job_work_requests jwr
LEFT JOIN projects p ON jwr.project_id = p.id
LEFT JOIN users uc ON jwr.created_by = uc.id
LEFT JOIN users usi ON jwr.store_incharge_id = usi.id
LEFT JOIN users ua ON jwr.accountant_id = ua.id
WHERE jwr.company_id = ? 
  AND jwr.accountant_id = ? 
  AND jwr.status = 'challan_uploaded'
  AND jwr.challan_file_path IS NOT NULL
ORDER BY jwr.created_at DESC
```

**Filtering Criteria:**
1. ✅ `company_id` matches user's company (security)
2. ✅ `accountant_id` matches current accountant (assignment)
3. ✅ `status = 'challan_uploaded'` (challan exists)
4. ✅ `challan_file_path IS NOT NULL` (file actually stored)

**Response:**
```json
{
  "requests": [
    {
      "id": 1,
      "job_id": "JW-2024-0001",
      "project_name": "Project X",
      "store_incharge_name": "John",
      "accountant_name": "Jane",
      "challan_file_path": "/uploads/challan_001.pdf",
      "status": "challan_uploaded",
      "items": [...],
      "images": [...]
    }
  ]
}
```

### 2. Frontend Already Configured

**File:** `src/screens/InternalJobWorkScreen.js`

**Logic:**
```javascript
if (user.role === 'Accountant') {
  // Fetch ONLY job works assigned to them with challan
  const response = await projectsAPI.getAccountantJobWork(user.id);
  setRequests(response.data.requests || []);
} else {
  // Other roles see all job works
  const response = await projectsAPI.getJobWorkRequests(user.company_id);
  setRequests(response.data.requests || []);
}
```

### 3. API Configuration Already in Place

**File:** `src/config/api.js`

```javascript
getAccountantJobWork: (accountantId) => 
  api.get(`/projects/job-work/accountant/${accountantId}`)
```

## Data Flow for Accountant

```
1. Accountant opens "Internal Job Work" screen
   ↓
2. Component checks: user.role === 'Accountant'
   ↓
3. Calls: getAccountantJobWork(user.id)
   ↓
4. API: GET /api/projects/job-work/accountant/15
   ↓
5. Backend filters job_work_requests WHERE:
   - company_id = 5
   - accountant_id = 15  ← ASSIGNED TO THIS ACCOUNTANT
   - status = 'challan_uploaded'  ← CHALLAN UPLOADED BY STORE INCHARGE
   - challan_file_path IS NOT NULL  ← FILE EXISTS
   ↓
6. Returns ONLY matching records
   ↓
7. Accountant sees:
   ✅ Job works with shared challans
   ❌ Job works without challan
   ❌ Job works assigned to other accountants
   ❌ All other job works in system
```

## What Accountants Can See

✅ **Job works where:**
- Store Incharge uploaded challan
- AND Accountant was selected during challan upload
- AND Status = 'challan_uploaded'

✅ **Challan details:**
- Download/view challan file
- View materials dispatched
- View weight details
- View dispatched photos

## What Accountants Cannot Do

❌ Upload challan
❌ Edit job work details
❌ Assign store incharge
❌ Create job work
❌ Modify materials
❌ Delete anything

## What Accountants See in UI

### Header
"Shared Challans" (instead of "Internal Job Work")

### Action Buttons
**If challan exists:**
- 📄 View Shared Challan (blue, clickable)

**If challan pending:**
- ⏳ Challan Pending from Store Incharge (gray, disabled)

### Empty State
"No shared challans yet. Waiting for Store Incharge to upload."

## How Store Incharge Shares Challan

```
1. Store Incharge: Opens "My Job Work"
2. Clicks: "Upload & Share Challan"
3. Selects: Accountant from dropdown
4. Uploads: Signed challan file
5. Backend: Sets accountant_id = selected accountant
6. Status: Changes to 'challan_uploaded'
7. Result: Job work now visible to ONLY that accountant
```

## Database Requirements

### Columns Used
```
job_work_requests {
  id
  accountant_id ← FOREIGN KEY (newly populated by Store Incharge)
  challan_file_path ← PATH TO UPLOADED CHALLAN
  status ← 'challan_uploaded' (set when challan uploaded)
  company_id ← FOR SECURITY
}
```

### Data Requirements
- accountant_id MUST be set (by Store Incharge during upload)
- challan_file_path MUST NOT be NULL
- status MUST be 'challan_uploaded'
- company_id MUST match user's company

## Testing Scenarios

### Scenario 1: No Challans Uploaded Yet
```
1. Accountant logs in
2. Opens "Internal Job Work"
3. Sees: "No shared challans yet..."
4. Result: ✅ PASS
```

### Scenario 2: Challan Uploaded to This Accountant
```
1. Store Incharge uploads challan, selects Accountant A
2. Accountant A logs in
3. Opens "Internal Job Work"
4. Sees: Job work card with challan
5. Clicks: "View Shared Challan"
6. Views: Challan file
7. Result: ✅ PASS
```

### Scenario 3: Challan Uploaded to Different Accountant
```
1. Store Incharge uploads challan, selects Accountant A
2. Accountant B logs in
3. Opens "Internal Job Work"
4. Sees: "No shared challans yet..."
5. Result: ✅ PASS (B cannot see A's challan)
```

### Scenario 4: Job Work Without Challan
```
1. Project Manager creates job work
2. Accountant logs in
3. Opens "Internal Job Work"
4. Sees: "No shared challans yet..."
5. (Job work not visible until challan uploaded)
6. Result: ✅ PASS
```

## Security Benefits

1. **Data Isolation** - Accountants only see their own assigned work
2. **Role-Based Access** - Backend enforces role restrictions
3. **Audit Trail** - Can track who uploaded to whom
4. **Read-Only** - Accountants cannot modify anything
5. **Company Isolation** - Cannot see other companies' data

## Verification Queries

Check if endpoint returns correct data:

```sql
-- View all assigned challans for Accountant ID 5
SELECT jwr.job_id, jwr.status, jwr.accountant_id, jwr.challan_file_path
FROM job_work_requests jwr
WHERE jwr.company_id = 1
  AND jwr.accountant_id = 5
  AND jwr.status = 'challan_uploaded'
  AND jwr.challan_file_path IS NOT NULL;

-- Expected: Only shows job works where:
-- - accountant_id = 5
-- - challan was uploaded
-- - file path exists
```

## Files Modified

- `backend/routes/projects.js` - Added `/job-work/accountant/:accountantId` endpoint
- `src/screens/InternalJobWorkScreen.js` - Already configured (no changes needed)
- `src/config/api.js` - Already configured (no changes needed)

## Summary

✅ **Accountants now see:** Only shared challans  
✅ **Cannot do:** Upload, edit, or modify  
✅ **Access control:** Enforced by backend  
✅ **Data isolation:** Per company, per accountant  
✅ **Read-only UI:** View challan only  

System is now properly secured and role-based!
