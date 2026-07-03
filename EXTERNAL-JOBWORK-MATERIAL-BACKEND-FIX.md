# External Job Work Material Backend Fix

## Problem
The Project Manager was not fetching materials from the external job work inventory properly. The backend endpoint was querying from non-existent table `job_work_materials` instead of the correct `external_jobwork_inventory` table.

## Root Cause
1. **Wrong table reference**: Endpoint tried to query `job_work_materials` which doesn't exist
2. **Incorrect relationship**: Was trying to use `project_id` directly on inventory table, but the inventory is connected to projects through `job_work_requests`
3. **Missing fallback logic**: Had complex fallback queries that weren't targeting the right data source

## Solution

### Fixed Endpoint: `GET /external-jobwork-materials/project/:projectId/available`

#### Changes Made:

1. **Get Job Work IDs for Project**
   - Query `job_work_requests` table to find all job work requests for the project
   - This establishes the relationship between projects and inventory items

2. **Query Correct Table**
   - Query `external_jobwork_inventory` table instead of non-existent `job_work_materials`
   - Filter by `job_work_id IN (job work ids from step 1)`
   - Include only materials with status 'received' or 'in_stock' or received_quantity > 0

3. **Proper Aggregation**
   - Group materials by `material_name` 
   - Sum `received_quantity` for each material across all challan entries
   - Return unit, HSN code, GST rate for each material

### Updated Fulfillment Logic: `POST /external-jobwork-materials/requests/:requestId/fulfill`

1. **Availability Check**
   - Query `external_jobwork_inventory` for the corresponding job_work_id
   - Check if total `received_quantity` >= requested quantity
   - Enforce full-request-only policy (no partial fulfillment)

2. **Inventory Update**
   - Update `external_jobwork_inventory` records to status 'issued'
   - Only update records that are in 'received' or 'in_stock' status
   - Maintain transaction audit trail

## Database Tables Reference

### external_jobwork_inventory
- **Relationship**: Connected via `job_work_id` to `job_work_requests.id`
- **Fields**: id, challan_id, job_work_id, company_id, material_name, quantity, unit, received_quantity, status, etc.
- **Status Values**: pending, received, in_stock, issued
- **Purpose**: Stores materials received via external job work challans

### job_work_requests
- **Relationship**: Links projects to external job work via `project_id`
- **Fields**: id, job_id, project_id, company_id, job_work_type, etc.
- **Purpose**: Tracks external job work requests for projects

## API Response Format

```json
{
  "materials": [
    {
      "id": 1,
      "material_name": "Steel Sheet 2mm",
      "unit": "kg",
      "received_quantity": 100,
      "available_quantity": 100,
      "hsn_code": "7210.50",
      "gst_rate": 5
    },
    {
      "id": 2,
      "material_name": "Aluminum Plate",
      "unit": "kg",
      "received_quantity": 50,
      "available_quantity": 50,
      "hsn_code": "7606.92",
      "gst_rate": 5
    }
  ]
}
```

## Testing Checklist

- [ ] Create a test project with external job work type
- [ ] Create an external job work challan for the project
- [ ] Receive materials through the challan
- [ ] Call GET endpoint - verify materials appear with correct quantities
- [ ] Create a material request as Project Manager
- [ ] Verify request appears in SI dashboard
- [ ] Fulfill request as Store Incharge with QR verification
- [ ] Verify inventory is updated to 'issued' status
- [ ] Verify transaction history is recorded

## Files Modified

- `backend/routes/external-jobwork-materials.js`
  - Fixed GET `/project/:projectId/available` endpoint
  - Updated POST `requests/:requestId/fulfill` availability check
  - Fixed inventory deduction logic

## Next Steps

1. Test the endpoint with actual data in database
2. If still returning empty results:
   - Verify job_work_requests exist for the project
   - Verify external_jobwork_inventory records exist with correct job_work_id
   - Check company_id matches
3. Consider adding database migration to ensure external_jobwork_outstock_request_items table is created if missing
