# Job Work Flow Changes - Documentation

## Summary
Changed the job work submission flow so that:
1. **Job work** is now sent to **Store Incharge** (instead of Accountant)
2. **Challan** is now sent to **Accountant** (for approval)

## Changes Made

### 1. Database Migration
**File**: `backend/add-store-incharge-to-job-work.js`
- Added new column `store_incharge_id` to `job_work_requests` table
- Kept existing `accountant_id` column for challan tracking

**To run the migration:**
```bash
cd backend
node add-store-incharge-to-job-work.js
```

### 2. Backend API Changes

**File**: `backend/routes/projects.js`

#### Updated POST `/api/projects/job-work/submit` endpoint
- Now accepts both `store_incharge_id` and `accountant_id` as required fields
- Both fields must be provided during job work submission
- Stores job work request with store incharge assignment

#### Updated GET `/api/projects/job-work/company/:companyId` endpoint
- Fetches both `store_incharge_name` and `accountant_name`
- Displays who the job work is assigned to and who will receive the challan

#### Added new GET `/api/projects/store-incharge/:companyId` endpoint
- Returns list of all store incharge users in a company
- Used for dropdown selection in the job work form

### 3. Frontend API Client

**File**: `src/config/api.js`
- Added new endpoint: `getStoreIncharge: (companyId) => api.get('/projects/store-incharge/${companyId}')`

### 4. Frontend UI Changes

**File**: `src/screens/ProjectDetailsScreen.js`

#### New state variables:
```javascript
const [selectedStoreInchargeForJobWork, setSelectedStoreInchargeForJobWork] = useState('');
const [storeInchargeUsers, setStoreInchargeUsers] = useState([]);
```

#### New function:
```javascript
const fetchStoreIncharge = async () => {
  // Fetches store incharge users for the company
}
```

#### Updated `handleJobWorkSubmit`:
- Now requires selection of both Store Incharge AND Accountant
- Sends both IDs to the backend

#### Updated Job Work Modal UI:
- Added "Select Store Incharge" picker (for job work assignment)
- Updated "Select Accountant" label to "Select Accountant for Challan" (for challan approval)

### 5. Frontend Job Work Display

**File**: `src/screens/InternalJobWorkScreen.js`

#### Updated display labels:
- Changed "Assigned Accountant" to show both:
  - "Assigned to Store Incharge" 
  - "Challan to Accountant"

## Workflow Summary

### Old Flow:
```
Project Manager 
  → submits Job Work with accountant_id 
  → Accountant receives job work + uploads challan
```

### New Flow:
```
Project Manager 
  → selects Store Incharge (for job work) 
  → selects Accountant (for challan)
  → Job Work goes to Store Incharge
  → Challan goes to Accountant
```

## User Roles Involved

1. **Project Manager**: Creates and submits job work
   - Selects which Store Incharge receives the job work
   - Selects which Accountant receives the challan

2. **Store Incharge**: Receives job work
   - Views assigned job work
   - Coordinates with vendor for job work execution

3. **Accountant**: Receives challan
   - Uploads challan document
   - Sends to vendor via email

## Testing Checklist

- [ ] Run migration: `node add-store-incharge-to-job-work.js`
- [ ] Create a new job work and verify:
  - [ ] Store Incharge dropdown appears
  - [ ] Accountant dropdown appears
  - [ ] Both fields are required
  - [ ] Job work data is saved correctly
- [ ] Check InternalJobWorkScreen:
  - [ ] Shows correct Store Incharge name
  - [ ] Shows correct Accountant name
  - [ ] Challan upload functionality still works
- [ ] Verify notifications are sent to both:
  - [ ] Store Incharge (for job work assignment)
  - [ ] Accountant (when challan is uploaded)

## Files Modified

1. `backend/routes/projects.js` - API endpoints
2. `backend/add-store-incharge-to-job-work.js` - Database migration (NEW)
3. `src/config/api.js` - API client endpoints
4. `src/screens/ProjectDetailsScreen.js` - Job work form UI
5. `src/screens/InternalJobWorkScreen.js` - Display labels
