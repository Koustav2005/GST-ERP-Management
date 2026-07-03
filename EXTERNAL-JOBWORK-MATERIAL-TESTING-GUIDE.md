# External Job Work Material Feature - Quick Testing Guide

## Pre-requisites

1. **Backend running**: `cd backend && npm run dev`
2. **Frontend running**: `expo start`
3. **Database migrations run**:
   ```bash
   cd backend
   node create-external-jobwork-tables.js
   node create-external-jobwork-outstock-tables.js
   ```

## Step 1: Create Test Project

1. Log in as NPD/PM
2. Create a new project
   - Name: "External Job Work Test"
   - Type: Select "external_job_work" if available, else regular
3. Note the project ID

## Step 2: Create External Job Work Request

1. As NPD, create job work request for the project
   - This creates an entry in `job_work_requests` table
   - Links the project to materials via job_work_id

## Step 3: Receive Materials (as Accountant)

1. Accountant creates challan for the job work
2. Challan includes materials:
   - Steel Sheet 2mm - 100 kg
   - Aluminum Plate - 50 kg
3. Verify materials are added to `external_jobwork_inventory`

## Step 4: Test PM - Fetch Available Materials

**Endpoint**: `GET /api/external-jobwork-materials/project/{projectId}/available`

**Using curl**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/external-jobwork-materials/project/1/available
```

**Expected Response**:
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

**Troubleshooting**:
- If empty array returned:
  - Check job_work_requests exists for this project
  - Verify external_jobwork_inventory has records
  - Check company_id matches

## Step 5: Test PM - Create Material Request

**Endpoint**: `POST /api/external-jobwork-materials/request`

**Payload**:
```json
{
  "project_id": 1,
  "worker_id": 5,
  "company_id": 1,
  "request_notes": "Needed for fabrication",
  "items": [
    {
      "material_name": "Steel Sheet 2mm",
      "requested_quantity": 50,
      "unit": "kg",
      "available_quantity": 100
    }
  ]
}
```

**Expected Response**:
```json
{
  "requestId": 1,
  "status": "success",
  "message": "Request created successfully"
}
```

**Check in frontend**:
- PM gets notification
- Request created successfully

## Step 6: Test SI - View Pending Requests

**Endpoint**: `GET /api/external-jobwork-materials/requests/pending`

**Using curl**:
```bash
curl -H "Authorization: Bearer SI_TOKEN" \
  http://localhost:3000/api/external-jobwork-materials/requests/pending
```

**Expected Response**:
```json
{
  "requests": [
    {
      "id": 1,
      "project_id": 1,
      "worker_id": 5,
      "requested_by": 3,
      "project_name": "External Job Work Test",
      "worker_name": "John Worker",
      "requested_by_name": "PM Name",
      "status": "pending",
      "request_date": "2024-01-15T10:30:00Z",
      "items": [
        {
          "id": 1,
          "request_id": 1,
          "material_name": "Steel Sheet 2mm",
          "requested_quantity": 50,
          "unit": "kg"
        }
      ]
    }
  ]
}
```

**Check in frontend**:
- SI sees pending request in dashboard
- Material details visible

## Step 7: Test SI - Fulfill Request (Success Case)

**Endpoint**: `POST /api/external-jobwork-materials/requests/{requestId}/fulfill`

**Payload**:
```json
{
  "qr_code": "QR-001",
  "qr_verification_status": "verified",
  "transaction_notes": "Materials issued to worker"
}
```

**Expected Response**:
```json
{
  "transactionId": 1,
  "status": "success",
  "message": "Request fulfilled successfully"
}
```

**Check in database**:
```sql
-- Verify transaction created
SELECT * FROM external_jobwork_outstock_transactions WHERE id = 1;

-- Verify request status updated
SELECT status FROM external_jobwork_outstock_requests WHERE id = 1;
-- Should show: "fulfilled"

-- Verify inventory updated
SELECT status FROM external_jobwork_inventory 
WHERE material_name = 'Steel Sheet 2mm' AND job_work_id = 1;
-- Should show: "issued"
```

## Step 8: Test Full-Request-Only Policy

**Scenario**: Try to fulfill a request when material quantity is insufficient

1. Create new request for 100 kg Steel Sheet (50 kg remaining)
2. Call fulfill endpoint
3. Should get error

**Expected Error Response**:
```json
{
  "error": "Insufficient stock for Steel Sheet 2mm. Cannot fulfill this request. (No partial issuance allowed)",
  "material_name": "Steel Sheet 2mm",
  "requested": 100,
  "available": 50
}
```

## Step 9: Test Transaction History

**Endpoint**: `GET /api/external-jobwork-materials/history`

**Query Parameters**:
- `company_id`: Filter by company (optional)
- `project_id`: Filter by project (optional)
- `worker_id`: Filter by worker (optional)

**Using curl**:
```bash
curl -H "Authorization: Bearer SI_TOKEN" \
  "http://localhost:3000/api/external-jobwork-materials/history?project_id=1"
```

**Expected Response**:
```json
{
  "transactions": [
    {
      "id": 1,
      "request_id": 1,
      "project_id": 1,
      "project_name": "External Job Work Test",
      "worker_name": "John Worker",
      "issued_by_name": "Store Incharge",
      "fulfillment_date": "2024-01-15T10:45:00Z",
      "qr_verification_status": "verified",
      "items": [
        {
          "id": 1,
          "transaction_id": 1,
          "material_name": "Steel Sheet 2mm",
          "issued_quantity": 50,
          "unit": "kg"
        }
      ]
    }
  ]
}
```

## Step 10: Test Request Cancellation

**Endpoint**: `PUT /api/external-jobwork-materials/requests/{requestId}/cancel`

**Payload**: Empty or `{}`

**Expected Response**:
```json
{
  "status": "success",
  "message": "Request cancelled successfully"
}
```

**Rules**:
- Only pending requests can be cancelled
- Fulfilled requests cannot be cancelled

## Database Verification Queries

### Check if materials exist
```sql
SELECT * FROM external_jobwork_inventory 
WHERE job_work_id IN (
  SELECT id FROM job_work_requests WHERE project_id = 1
);
```

### Check request status
```sql
SELECT id, status, requested_by, worker_id 
FROM external_jobwork_outstock_requests 
WHERE project_id = 1;
```

### Check transaction details
```sql
SELECT t.id, r.project_id, r.worker_id, t.fulfillment_date, t.qr_verification_status
FROM external_jobwork_outstock_transactions t
JOIN external_jobwork_outstock_requests r ON t.request_id = r.id
WHERE r.project_id = 1;
```

### Check inventory status
```sql
SELECT material_name, status, received_quantity 
FROM external_jobwork_inventory 
WHERE job_work_id = 1;
```

## Common Issues & Solutions

### Issue: 404 Not Found
**Solution**: 
- Verify project exists
- Check project_id in URL

### Issue: Empty materials array
**Solution**:
- Verify job_work_requests exist for project
- Run: `SELECT * FROM job_work_requests WHERE project_id = 1;`
- Verify materials in `external_jobwork_inventory`

### Issue: Insufficient stock error on fulfillment
**Expected behavior** - This is the feature working correctly
- Request more materials via challan
- Or reduce requested quantity in new request

### Issue: "Worker not assigned to project"
**Solution**:
- Assign worker to project first
- Use project workers API

## Frontend Testing

### Access External Job Work Material Screen
1. Open ProjectDetailsScreen
2. Scroll to "External Job Work Material" section
3. Click "View Materials" button
4. Two tabs should appear: "Available Materials" and "Create Request"

### Tab 1: Available Materials
- Shows all materials with quantities
- Simple card layout
- Shows batch/lot numbers if available

### Tab 2: Create Request
- Material selection with checkboxes
- Quantity input for each selected material
- Worker picker (dropdown)
- Optional notes field
- Submit button

### After Submit
- Success alert with request ID
- Returns to project details
- Request should appear in SI dashboard

## Performance Notes

- Queries use indexes on:
  - external_jobwork_inventory(company_id)
  - external_jobwork_inventory(job_work_id)
  - external_jobwork_outstock_requests(project_id)
  - external_jobwork_outstock_requests(company_id)
  - external_jobwork_outstock_requests(status)

- For large datasets, consider pagination in future versions

## Success Criteria

- ✅ PM fetches materials for their project
- ✅ PM creates request with validation
- ✅ SI sees pending request
- ✅ SI fulfills request with QR verification
- ✅ Inventory updates to 'issued' status
- ✅ Full-request-only policy enforced
- ✅ Transaction history recorded
- ✅ Notifications sent appropriately
- ✅ Data isolation by company maintained
