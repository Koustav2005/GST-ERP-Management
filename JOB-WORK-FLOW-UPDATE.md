# Job Work Flow Update - Complete Implementation

## Overview
Updated the job work flow so that:
1. **Project Manager** only selects **Store Incharge** when creating job work
2. **Store Incharge** selects **Accountant** when uploading challan
3. **Challan is only visible to Accountant** after Store Incharge uploads it

## Changes Made

### 1. Backend Route Updates (`backend/routes/projects.js`)

#### Updated: Job Work Submission Endpoint
**Endpoint:** `POST /api/projects/job-work/submit`

**Changes:**
- Removed `accountant_id` requirement from request validation
- Removed `accountant_id` from INSERT statement
- Project Manager only needs to provide: `store_incharge_id`
- Accountant will be assigned later by Store Incharge

**Before:**
```javascript
if (!project_id || !job_work_type || !loaded_vehicle_weight || !unloaded_vehicle_weight || !store_incharge_id || !accountant_id) {
```

**After:**
```javascript
if (!project_id || !job_work_type || !loaded_vehicle_weight || !unloaded_vehicle_weight || !store_incharge_id) {
```

#### Updated: Challan Upload Endpoint
**Endpoint:** `PUT /api/projects/job-work/:id/challan`

**Changes:**
- Now **requires** `accountant_id` in request body (from Store Incharge)
- Sets `accountant_id` when challan is uploaded
- Only stores challan when accountant is selected

**Before:**
- Only accepted `vendor_email`
- Used static accountant_id

**After:**
```javascript
const { vendor_email, accountant_id } = req.body;
if (!accountant_id) {
  return res.status(400).json({ error: 'Accountant must be selected' });
}
```

#### New: Fetch Job Work for Accountant
**Endpoint:** `GET /api/projects/job-work/accountant/:accountantId`

**Purpose:**
- Fetches job work requests assigned to a specific accountant
- Only returns job works with status `challan_uploaded`
- Ensures accountant only sees uploaded challans

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
      "status": "challan_uploaded",
      "challan_file_path": "/uploads/...",
      "items": [...],
      "images": [...]
    }
  ]
}
```

### 2. Backend Users Route (`backend/routes/users.js`)

#### Updated: Get Company Users Endpoint
**Endpoint:** `GET /api/users/company/:companyId`

**Changes:**
- Removed management-only restriction
- Now allows any authenticated user from the company to access it
- Store Incharge can now fetch list of accountants for their company

**Before:**
```javascript
if (req.user.role !== 'management' || req.user.company_id != companyId) {
  return res.status(403).json({ error: 'Unauthorized' });
}
```

**After:**
```javascript
if (req.user.company_id != companyId) {
  return res.status(403).json({ error: 'Unauthorized - Not in this company' });
}
```

**Response Format:** Now returns `{ users: [...] }` instead of just array

### 3. Frontend API Configuration (`src/config/api.js`)

**Added Methods:**
```javascript
getCompanyUsers: (companyId) => api.get(`/users/company/${companyId}`),
getAccountantJobWork: (accountantId) => api.get(`/projects/job-work/accountant/${accountantId}`),
```

### 4. Store Incharge Job Work Screen (`src/screens/StoreInchargeJobWorkScreen.js`)

#### New Features:

**Accountant Picker in Upload Modal:**
- Added state for accountant selection: `accountantId`, `accountants`
- Added `fetchAccountants()` function to fetch company accountants
- Displays dropdown with all accountants in the company
- Validates accountant is selected before upload

**UI Changes:**
- Added accountant picker dropdown in the upload challan modal
- Positioned before vendor email field
- Marked as required field (with asterisk)

**Validation:**
```javascript
if (!accountantId) {
  Alert.alert('Error', 'Please select an accountant.');
  return;
}
```

**Form Data:**
```javascript
formData.append('accountant_id', accountantId);
```

### 5. Project Details Screen (`src/screens/ProjectDetailsScreen.js`)

#### Removed:

**Accountant Picker:**
- Removed `Select Accountant for Challan *` section from job work modal
- Removed accountant selection UI with picker

**Validation:**
- Removed: `if (!selectedAccountantForJobWork)` validation
- Removed: Alert for accountant selection

**Form Submission:**
- Removed: `formData.append('accountant_id', selectedAccountantForJobWork);`
- Kept: Store Incharge selection only

**State Cleanup:**
- Removed accountant state reset from modal close handler

### 6. Picker Styles Added to Store Incharge Screen

```javascript
pickerContainer: {
  backgroundColor: '#F2F2F7',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#E5E5EA',
  overflow: 'hidden',
  marginBottom: 12,
},
picker: {
  height: 50,
  backgroundColor: '#F2F2F7',
  color: '#1C1C1E',
},
```

## Flow Diagram

### Job Work Creation (Project Manager)
```
1. Project Manager opens ProjectDetailsScreen
2. Selects "Job Work" from Next Phase
3. Fills job work details:
   - Type (Laser Cutting, Fabrication, etc.)
   - Purpose (if "Others" selected)
   - Vehicle weights
   - Materials dispatch
   - Photos
4. Selects ONLY Store Incharge ✓
5. Submits job work
6. Backend creates record with:
   - store_incharge_id (set)
   - accountant_id (NULL)
   - status: "pending"
```

### Job Work Processing (Store Incharge)
```
1. Store Incharge opens Dashboard
2. Clicks "Job Work" → View assigned job works
3. Expands job work card to see details
4. Clicks "Upload & Share Challan"
5. Modal opens with:
   - Accountant picker (required) ✓
   - Vendor email field (optional)
   - File picker for challan
6. Selects Accountant from dropdown
7. Uploads signed challan file
8. Backend updates record:
   - accountant_id (set)
   - challan_file_path (set)
   - status: "challan_uploaded"
9. Optional: Email sent to vendor
```

### Job Work Approval (Accountant)
```
1. Accountant sees notification or navigates to Job Work
2. Fetches via: GET /api/projects/job-work/accountant/:accountantId
3. Only sees job works assigned to them with challan uploaded
4. Reviews:
   - Challan file
   - Materials dispatched
   - Weight details
   - Photos
5. Can approve/process further
```

## Database Changes

**Table:** `job_work_requests`

**Fields:**
- `job_id` - Unique job work ID
- `project_id` - Related project
- `company_id` - Company ownership
- `job_work_type` - Type of job work
- `store_incharge_id` - Set at creation (NOT NULL)
- `accountant_id` - Set when challan uploaded (can be NULL initially)
- `challan_file_path` - Path to uploaded challan
- `status` - "pending" → "challan_uploaded"
- `created_by` - Project Manager who created
- `created_at` - Timestamp

## API Request/Response Examples

### 1. Create Job Work (Project Manager)
```
POST /api/projects/job-work/submit
Content-Type: multipart/form-data

Body:
- project_id: 5
- job_work_type: "Laser Cutting"
- store_incharge_id: 12
- loaded_vehicle_weight: 500
- unloaded_vehicle_weight: 200
- actual_vehicle_weight: 300
- items: [{"material_name": "Steel", "hsn": "7208", "quantity": 100, "unit": "kg"}]
- images: [File1, File2, ...]

Response:
{
  "jobId": "JW-2024-0001",
  "message": "Job work submitted successfully"
}
```

### 2. Upload Challan (Store Incharge) - NEW
```
PUT /api/projects/job-work/1/challan
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- challan: File (PDF/Image)
- accountant_id: 15  // REQUIRED - NEW
- vendor_email: vendor@company.com  // Optional

Response:
{
  "success": true,
  "jobWork": {
    "id": 1,
    "job_id": "JW-2024-0001",
    "accountant_id": 15,  // Now set
    "status": "challan_uploaded",
    "challan_file_path": "/uploads/jw_challan_001.pdf"
  }
}
```

### 3. Fetch Accountant Job Works - NEW
```
GET /api/projects/job-work/accountant/15
Authorization: Bearer {token}

Response:
{
  "requests": [
    {
      "id": 1,
      "job_id": "JW-2024-0001",
      "status": "challan_uploaded",
      "challan_file_path": "/uploads/...",
      ...
    }
  ]
}
```

### 4. Fetch Accountants for Store Incharge - UPDATED
```
GET /api/users/company/5
Authorization: Bearer {token}

Response:
{
  "users": [
    {
      "id": 15,
      "name": "Jane Accountant",
      "email": "jane@company.com",
      "role": "Accountant"
    }
  ]
}
```

## Testing Checklist

- [ ] Project Manager can submit job work with ONLY Store Incharge (no accountant picker)
- [ ] Job work creation succeeds without accountant_id
- [ ] Store Incharge sees job work in their dashboard
- [ ] Store Incharge can expand job work details
- [ ] Store Incharge upload modal shows accountant picker
- [ ] Accountant picker loads all company accountants
- [ ] Can select accountant from dropdown
- [ ] Upload fails if no accountant selected
- [ ] Upload succeeds with accountant and challan
- [ ] Accountant can fetch only their assigned job works
- [ ] Only job works with challan_uploaded status shown to accountant
- [ ] Challan file is accessible to accountant
- [ ] Job work notifications work properly

## File Changes Summary

```
Modified:
├── backend/routes/projects.js
│   ├── POST /job-work/submit (removed accountant_id)
│   ├── PUT /job-work/:id/challan (added accountant_id requirement)
│   └── GET /job-work/accountant/:accountantId (NEW)
├── backend/routes/users.js
│   └── GET /company/:companyId (opened to all company users)
├── src/config/api.js
│   ├── getCompanyUsers (added)
│   └── getAccountantJobWork (added)
├── src/screens/ProjectDetailsScreen.js
│   ├── Removed accountant picker from job work modal
│   ├── Removed accountant validation
│   └── Removed accountant_id from form submission
└── src/screens/StoreInchargeJobWorkScreen.js
    ├── Added accountant picker in upload modal
    ├── Added fetchAccountants function
    └── Added picker styles

Created:
├── JOB-WORK-FLOW-UPDATE.md (this file)
```

## Security Notes

- Accountant can only see job works assigned to them
- Store Incharge can only see job works assigned to them
- Project Manager can only create job work for their company
- Each user is verified to belong to the company
- Accountant ID is validated on backend before assignment

## Notes

1. **Backward Compatibility**: Existing job works without accountant_id will still work for Store Incharge view
2. **Notifications**: Consider adding notifications when:
   - Job work is assigned to Store Incharge
   - Challan is uploaded (notify accountant)
3. **Audit Trail**: All accountant assignments are tracked via `accountant_id` field
4. **Future Enhancement**: Could add approval workflow for accountant
