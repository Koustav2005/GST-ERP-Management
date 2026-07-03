# External Job Work 404 Error Fix

## Problem
The Store Incharge Dashboard was showing "Error fetching inventory" with a 404 status code. The frontend screens were calling multiple API endpoints that didn't exist in the backend route file.

## Root Cause
The `external-jobwork-materials` backend route file only had endpoints for the Material Request & Outstock feature but was missing endpoints for:
1. Challan management (create, receive, view)
2. Material notifications
3. Inventory retrieval by job work

Multiple frontend screens were calling these endpoints which resulted in 404 errors.

## Solution
Added missing endpoints to `backend/routes/external-jobwork-materials.js`:

### 1. Inventory Endpoint
**GET /api/external-jobwork-materials/inventory/:jobWorkId/:companyId**
- Returns inventory items for a specific job work
- Used by: ExternalJobworkInventoryScreen
- Returns list of materials with quantities, status, HSN, GST rate

### 2. Challan Endpoints

**GET /api/external-jobwork-materials/challans/store-incharge/:userId/:companyId**
- Returns pending challans for store incharge
- Used by: ExternalJobworkReceiptScreen
- Filters by company and challan_status

**GET /api/external-jobwork-materials/challan-details/:challanId**
- Returns full challan details with inventory items
- Used by: ExternalJobworkReceiptScreen

**POST /api/external-jobwork-materials/receive-challan/:challanId**
- Receives challan and marks materials as received
- Updates inventory status to 'received'
- Records received_by and received_date

**POST /api/external-jobwork-materials/create-challan**
- Creates new challan from material notification
- Creates corresponding inventory record
- Assigns to store incharge

### 3. Material Notification Endpoints

**GET /api/external-jobwork-materials/notifications/accountant/:userId/:companyId**
- Returns pending material notifications for accountant
- Used by: ExternalJobworkChallanScreen
- Shows expected arrival dates and status

**POST /api/external-jobwork-materials/notify-material-arrival**
- Creates material arrival notification
- Used by: ExternalJobworkMaterialNotificationScreen
- Stores material details as JSONB

## API Endpoints Summary

All endpoints now available:

### Material Request & Outstock (Primary Feature)
- GET `/project/:projectId/available` - Fetch available materials
- POST `/request` - Create material request
- GET `/requests/pending` - Get pending requests (SI)
- GET `/requests/:requestId` - Get request details
- POST `/requests/:requestId/fulfill` - Fulfill request with QR verification
- GET `/history` - Get transaction history
- PUT `/requests/:requestId/cancel` - Cancel request

### Inventory Management (New)
- GET `/inventory/:jobWorkId/:companyId` - Get inventory for job work

### Challan Management (New)
- GET `/challans/store-incharge/:userId/:companyId` - Get pending challans
- GET `/challan-details/:challanId` - Get challan details
- POST `/receive-challan/:challanId` - Receive challan
- POST `/create-challan` - Create new challan

### Material Notifications (New)
- GET `/notifications/accountant/:userId/:companyId` - Get notifications
- POST `/notify-material-arrival` - Create notification

## Frontend Screens Fixed

1. **ExternalJobworkInventoryScreen** 
   - Now can fetch inventory by job work
   - Shows all received materials with quantities

2. **ExternalJobworkReceiptScreen**
   - Can fetch pending challans for receipt
   - Can receive materials into inventory

3. **ExternalJobworkChallanScreen**
   - Can view material notifications
   - Can create challans

4. **ExternalJobworkMaterialNotificationScreen**
   - Can notify about incoming materials

## Database Tables Used

- `external_jobwork_inventory` - Material inventory
- `external_jobwork_challans` - Challan records
- `external_jobwork_material_notifications` - Notifications
- `external_jobwork_outstock_requests` - Material requests

## How to Test

1. **Verify 404 error is gone**
   - Open Store Incharge Dashboard
   - Should load without errors now

2. **Test Inventory Screen**
   - Navigate to "External Inventory"
   - Select a job work
   - Should display materials from that job work

3. **Test Receipt Screen**
   - Navigate to "External Material Receipt"
   - Should show pending challans
   - Select challan to view details
   - Should be able to mark as received

4. **Test Challan Creation**
   - Navigate to "External Material Receipt" or Challan screen
   - Create new challan
   - Should create inventory record

## Backend Changes Made

**File: `backend/routes/external-jobwork-materials.js`**

- Added 8 new API endpoints
- All use database queries to existing tables
- Include proper error handling
- Follow same authentication pattern as other endpoints

## Notes

- All endpoints use `authenticateToken` middleware
- Proper error responses with 400/404 status codes
- Database isolation by company_id maintained
- Full audit trail (created_at, received_by, etc.)

## Next Steps

1. Restart backend server to load new routes
2. Test Store Incharge Dashboard - should load without errors
3. Navigate through External Job Work features
4. Check console logs for any remaining issues

## Verification Checklist

- [ ] Store Incharge Dashboard loads without 404 error
- [ ] Inventory can be fetched for job works
- [ ] Challan receipt process works
- [ ] Material notifications are visible
- [ ] All screens in External Job Work section work
