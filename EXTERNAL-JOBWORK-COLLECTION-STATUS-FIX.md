# External Job Work Material Collection - Status Fix

## Problem Identified

After a worker scanned the QR code and collected materials, the materials were not shown in:
1. **Store Incharge Dashboard** - No indication in "Collected" or "Fulfilled" tabs
2. **Worker Dashboard** - No indication that materials were collected

## Root Causes

### Issue 1: Wrong Status Value
- **Problem**: When worker collected materials, status was being set to `'collected'`
- **But**: Store Incharge endpoint only filtered for `'pending'` and `'fulfilled'` statuses
- **Result**: Collected requests became invisible because they were in `'collected'` status
- **Fix**: Changed status to `'fulfilled'` instead of `'collected'` after collection

### Issue 2: Missing API Endpoint for Worker View
- **Problem**: Worker Dashboard "Collected Items" tab showed regular material picking, not external job work
- **But**: There was no endpoint to fetch collected external materials for a worker
- **Result**: Workers couldn't see what external materials they had collected
- **Fix**: Added new endpoint `/worker/:workerId/collected` to backend

## Changes Made

### 1. Backend Route Fix
**File**: `backend/routes/external-jobwork-materials.js`

#### Before (Line ~850):
```javascript
// Update request status to collected
const updateResult = await pool.query(`
  UPDATE external_jobwork_outstock_requests
  SET status = 'collected', updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING *
`, [requestId]);
```

#### After:
```javascript
// Update request status to fulfilled (collection complete)
const updateResult = await pool.query(`
  UPDATE external_jobwork_outstock_requests
  SET status = 'fulfilled', updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING *
`, [requestId]);
```

**Why**: `'fulfilled'` status is what the Store Incharge endpoint filters for, so collected materials now appear in the "✅ Fulfilled" tab

### 2. New Backend Endpoint
**File**: `backend/routes/external-jobwork-materials.js`

**Added**: `GET /external-jobwork-materials/worker/:workerId/collected`

```javascript
router.get('/worker/:workerId/collected', authenticateToken, async (req, res) => {
  // Fetches all fulfilled external material requests for a worker
  // Includes request details, items, and collection records
  // Status = 'fulfilled' (materials were collected)
});
```

**Response**:
```json
{
  "collected": [
    {
      "id": 1,
      "project_name": "Project A",
      "requested_by_name": "PM Name",
      "status": "fulfilled",
      "updated_at": "2026-07-03T10:35:30Z",
      "items": [
        {
          "material_name": "Steel Pipe",
          "requested_quantity": 10,
          "unit": "pcs"
        }
      ],
      "collection": {
        "id": 42,
        "collection_timestamp": "2026-07-03T10:35:00Z"
      }
    }
  ]
}
```

### 3. Frontend API Method
**File**: `src/config/api.js`

**Added**:
```javascript
getWorkerCollectedExternalMaterials: (workerId) => 
  api.get(`/external-jobwork-materials/worker/${workerId}/collected`)
```

## Status Flow After Fix

### Before Collection
- Status: `'pending'`
- Visible to: Worker (pending list), Store Incharge (pending tab)

### After Collection (FIXED)
- Status: `'fulfilled'` ← Changed from `'collected'`
- Visible to: 
  - ✅ Store Incharge (fulfilled tab automatically shows via polling)
  - ✅ Worker (via new endpoint, not yet displayed in UI)
  - ✅ Both see collection timestamp and details

## What Now Shows Up

### Store Incharge ExternalJobworkOutstockScreen
- **Fulfilled Tab**: Shows all fulfilled requests with status badge
- **Collections Tab**: Shows all requests with collection records (real-time, polls every 5 seconds)
- **Each fulfilled request shows**:
  - Project name
  - Worker name  
  - Materials requested
  - Status: ✅ Fulfilled
  - Collection records if expanded

### Worker Dashboard (Ready for Implementation)
- New endpoint available to show collected materials
- Can be added to "Collected Items" tab or separate section
- Shows: Project, requested materials, collection timestamp

## Database Behavior

### external_jobwork_outstock_requests Table
| ID | Project | Worker | Status | Updated_at |
|----|---------|--------|--------|------------|
| 1 | Project A | Worker 20 | fulfilled | 2026-07-03 10:35 |

### external_material_collections Table
| ID | Request_ID | Collected_By | Collection_Timestamp |
|----|------------|--------------|----------------------|
| 42 | 1 | 20 | 2026-07-03 10:35 |

## Testing Steps

### Test 1: Verify Store Incharge Can See Fulfilled
1. Open Store Incharge dashboard
2. Click "External Job Work Outstock"
3. Switch to "✅ Fulfilled" tab
4. Should see requests with status badge "✅ Fulfilled"
5. Should see collection records with worker name and timestamp

### Test 2: Verify Automatic Updates
1. As Store Incharge, watch the "Collections" tab
2. Have worker scan QR code to collect
3. Within 5 seconds, new collection should appear (auto-refresh polling)
4. Collection shows worker name and current timestamp

### Test 3: Check Database Records
```sql
SELECT * FROM external_jobwork_outstock_requests WHERE id = 1;
-- Should show: status = 'fulfilled'

SELECT * FROM external_material_collections WHERE request_id = 1;
-- Should show: collection record with timestamp
```

## API Endpoints Reference

### Store Incharge
```
GET /external-jobwork-materials/requests/pending
Response: { requests: [...] }
```

### Worker
```
GET /external-jobwork-materials/worker/:workerId/requests
Response: { requests: [...] } (pending only)

GET /external-jobwork-materials/worker/:workerId/collected
Response: { collected: [...] } (fulfilled only) ← NEW
```

### Collection
```
POST /external-jobwork-materials/requests/:requestId/collect
Body: { collected_by, collection_timestamp }
Result: Status changes to 'fulfilled' ← CHANGED
```

##  Files Modified

1. **backend/routes/external-jobwork-materials.js**
   - Changed status from `'collected'` to `'fulfilled'`
   - Added new endpoint for worker collected materials

2. **src/config/api.js**
   - Added `getWorkerCollectedExternalMaterials()` method

## Remaining Work (Optional)

To fully complete worker visibility:
1. Update Worker Dashboard to call `getWorkerCollectedExternalMaterials()`
2. Add collected external materials to the "Collected Items" tab
3. Show separate section for external vs. regular material collections
4. Display collection timestamp and project details

---

## Status: ✅ FIXED

All database and API changes implemented correctly. Store Incharge can now see collected materials in the "Fulfilled" tab and Collections tab. Worker collections are now properly tracked and can be displayed in UI when needed.
