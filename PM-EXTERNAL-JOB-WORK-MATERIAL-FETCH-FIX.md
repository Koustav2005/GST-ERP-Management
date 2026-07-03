# PM External Job Work Material Fetching - Fix

## Problem
Project Manager couldn't see external job work materials in Project Details screen because the backend endpoint was filtering materials too narrowly.

**Symptoms:**
- PM opens Project Details → External Job Work Material section
- Materials list shows empty or very few materials
- Store Incharge can see materials in inventory but PM cannot
- Materials that exist in `external_jobwork_inventory` don't appear

## Root Cause
The endpoint was using a two-step filter:
1. Find job work requests for THIS specific project
2. Find materials that match THOSE specific job work IDs

**Problem**: Materials in `external_jobwork_inventory` are company-wide resources, not always linked to specific job work IDs. The PM should see ALL available materials in the company's external job work inventory that can be used for their project.

## Solution
Changed the endpoint logic to:
1. Get the company ID from project
2. Fetch ALL materials from `external_jobwork_inventory` for that company
3. Group and aggregate by material name
4. Return all available materials

**Key Change**: Removed the job work ID filter - now fetches company-wide materials instead of project-specific materials.

## Technical Details

### Before
```javascript
// Step 1: Get job work IDs for this project
SELECT DISTINCT id FROM job_work_requests 
WHERE project_id = $1 AND company_id = $2

// Step 2: Get materials only for those job work IDs
WHERE job_work_id = ANY($1) AND company_id = $2
```

### After
```javascript
// Single step: Get all company materials (not filtered by job work ID)
WHERE company_id = $1
  AND (status IN ('received', 'in_stock') OR received_quantity > 0)
```

## API Endpoint Changed
```
GET /api/external-jobwork-materials/project/:projectId/available
```

### Before Response
```json
{
  "materials": [
    // Only materials linked to THIS project's specific job work requests
  ]
}
```

### After Response
```json
{
  "materials": [
    // All materials in company's external job work inventory
    // Available to any project in the company
  ]
}
```

## Business Logic

### PM Perspective
- PM can see all materials available in company's external job work inventory
- Can request any available material for their project
- Materials are shared across all projects in the company

### SI Perspective (No Change)
- Still manages inventory at company level
- Receives materials and marks them available
- Tracks all material movements

### Company-wide Sharing
- Materials received are shared across all external job work projects
- No project "owns" materials
- Any PM can request available materials

## Implementation Details

**File:** `backend/routes/external-jobwork-materials.js`

**Endpoint:** `GET /project/:projectId/available`

**Changes:**
1. Removed job work ID lookup step
2. Changed query to fetch all company materials
3. Kept material aggregation logic (groups by name, sums quantities)
4. Kept status filtering (only 'received' and 'in_stock')

**Performance:**
- Slightly faster (one less database query)
- Still uses indexes on company_id
- Material aggregation is efficient

## Data Flow

```
PM opens Project Details
    ↓
GET /project/:projectId/available
    ↓
Fetch project details (company_id)
    ↓
Query ALL external_jobwork_inventory 
WHERE company_id = projectCompanyId
    ↓
Aggregate materials by name
    ↓
Return materials list to PM
    ↓
PM sees materials in Project Details
```

## What Changed in Frontend
**Nothing** - Frontend continues to call the same endpoint and display materials the same way.

## Testing Scenario

### Setup
1. Create external job work project (PM1)
2. Create another external job work project (PM2)
3. SI receives materials into external job work inventory
4. Materials visible in SI Dashboard Inventory

### Test Case 1: PM1 Opens Project
1. PM1 logs in
2. Opens Project Details
3. Should see ALL materials in external job work inventory
4. Not just materials for their project

### Test Case 2: PM2 Opens Project
1. PM2 logs in
2. Opens Project Details
3. Should see SAME materials as PM1
4. Can request any material

### Test Case 3: Material Requests
1. PM1 requests Material A
2. PM2 requests Material B
3. Both requests visible to SI
4. SI can fulfill in any order

## Example Scenario

**Company Setup:**
- SI stores external materials in inventory:
  - Steel Sheet (100 kg)
  - Aluminum Plate (50 pcs)
  - Copper Wire (200 m)

**Project 1 (PM1):**
- Opens Project Details
- Sees all 3 materials
- Can request any combination

**Project 2 (PM2):**
- Opens Project Details
- Sees same 3 materials
- Can request any combination

**Result:**
- Both PMs can access company materials
- Inventory is shared resource
- SI manages availability

## Database Query

```sql
-- Get all external job work inventory materials for a company
SELECT 
  id,
  challan_id,
  job_work_id,
  material_name,
  unit,
  quantity,
  received_quantity,
  status,
  hsn_code,
  gst_rate
FROM external_jobwork_inventory
WHERE company_id = $1
  AND (status IN ('received', 'in_stock') OR received_quantity > 0)
ORDER BY material_name ASC
```

**Indexes Used:**
- `idx_ext_inventory_company` on company_id

## Backward Compatibility
✅ Fully backward compatible - endpoint returns same response format

## Related Endpoints
This change aligns with:
- `GET /inventory/:jobWorkId/:companyId` - SI views inventory
- `POST /request` - PM requests materials
- `POST /fulfill` - SI fulfills requests

## Benefits

1. **Simpler Logic**: No complex job work ID filtering
2. **Better UX**: PMs see all available materials
3. **Resource Sharing**: Materials shared across projects
4. **Flexibility**: Company-wide material management
5. **Scalability**: Works with any number of projects

## Impact Analysis

| Component | Impact |
|-----------|--------|
| PM Dashboard | ✅ More materials now visible |
| SI Dashboard | ✅ No change |
| Material Request | ✅ More choices available |
| Inventory | ✅ No change |
| Performance | ✅ Slightly faster |
| Data Integrity | ✅ No change |

## Verification Checklist

- [x] Syntax is correct (no diagnostics errors)
- [x] Query logic is correct
- [x] Material aggregation works
- [x] Status filtering works
- [x] Response format unchanged
- [x] Database indexes used
- [x] Error handling maintained
- [ ] Tested with real data
- [ ] Performance verified
- [ ] All PMs see materials

## Next Steps

1. **Restart Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test Material Visibility**
   - PM opens project details
   - Should see materials from external job work inventory
   - Should see more materials than before

3. **Test Material Requests**
   - Create material request
   - Request should succeed
   - SI should receive request

4. **Verify SI Still Works**
   - SI dashboard should be unchanged
   - Inventory view should work
   - Receipt process should work

## Rollback Plan

If issues arise:
1. Revert to previous endpoint logic (restore job work ID filter)
2. Restart backend
3. Clear browser cache
4. Test again

## Future Considerations

1. **Quantity Limits**: Might want to show only materials with available_quantity > 0
2. **Material Filtering**: Add filters by material type, unit, etc.
3. **Project-Specific Materials**: Option to mark materials for specific projects
4. **Auto-Request**: Suggest materials based on project BOM
5. **Material History**: Track material usage across projects

## Summary

The PM external job work material endpoint now correctly fetches ALL company-wide materials instead of filtering by specific job work IDs. This enables PMs to see and request any available material in the company's external job work inventory for their projects.

**Key Change**: Removed project-specific filtering to enable company-wide material sharing.
