# Collections Not Showing - Debugging Guide

## Issue Summary
Material collections are not appearing in Project Manager's ProjectDetailsScreen even though workers have fulfilled requests.

## Root Cause Analysis

The collections feature works through this flow:
1. **PM creates material request** → ExternalJobworkMaterialRequestScreen sends project_id
2. **Worker fulfills request** → Backend creates transaction with project_id  
3. **PM views collections** → Backend queries transactions WHERE project_id = $1

**Potential issues identified:**
- No transactions exist in database (requests never fulfilled)
- Transactions exist but project_id doesn't match
- Queries are filtering incorrectly

## Debug Endpoints Added

1. **`GET /external-jobwork-materials/debug/complete-state`**
   - Shows all requests, transactions, and projects for your company
   - Helps identify if data exists at all

2. **`GET /external-jobwork-materials/project/:projectId/collections`**
   - Now includes detailed logging showing:
     - Exact project_id being searched
     - Number of requests found
     - Number of transactions found
     - Debug metadata in response

3. **`GET /external-jobwork-materials/debug/all-transactions`**
   - List all transactions in database

4. **`GET /external-jobwork-materials/debug/transactions/:projectId`**
   - List transactions for a specific project

## Testing Steps

### Step 1: Check if ANY data exists
```
Call: /external-jobwork-materials/debug/complete-state
Expected: Should show:
- totalRequests > 0 (requests should exist)
- totalTransactions > 0 (fulfilled requests should have transactions)
- totalProjects > 0 (your projects)
```

### Step 2: Create a test request
1. Go to ProjectDetailsScreen
2. Click "➕ Request Materials"
3. Select materials and a worker
4. Submit request
5. Check logs for: `Submitting request data:` to confirm project_id

### Step 3: Fulfill the request
1. Go to ExternalJobworkOutstockScreen (worker view)
2. Click "🔍 Verify Collection" on pending request
3. Scan worker QR code
4. Check backend logs for:
   - `🔄 Fulfilling request: {requestId}`
   - `✅ Transaction created: {transaction details}`
   - `📬 Creating notification for PM:`

### Step 4: View collections
1. Go back to ProjectDetailsScreen
2. Scroll to "📥 Material Collections"
3. Check browser console for:
   - `📋 Fetching collections for project: {projectId}`
   - `🔍 DEBUG: Found X requests for project_id={projectId}`
   - `🔍 DEBUG: Found X transactions for project_id={projectId}`
   - Response should include debug metadata

## Key Information Logged

**In ExternalJobworkMaterialRequestScreen:**
- `User company_id:`
- `Project id:`
- `Submitting request data:`

**In Fulfill Endpoint:**
- `🔄 Fulfilling request: {requestId}`
- `📋 Request details: { id, project_id, worker_id, requested_by }`
- `✅ Transaction created: { id, project_id, request_id }`

**In Collections Endpoint:**
- `🔍 DEBUG: Found X requests for project_id=X`
- `🔍 DEBUG: Found X transactions for project_id=X`
- Response includes `debug.projectIdSearched`, `debug.transactionsFound`, `debug.requestsCount`

## Common Issues & Solutions

### Issue 1: No transactions found
**Cause:** Requests haven't been fulfilled yet
**Solution:** Follow Step 3 above to fulfill a request

### Issue 2: Requests exist but transactions = 0
**Cause:** Fulfill endpoint not creating transactions, OR transactions table doesn't exist
**Solution:** Check backend logs for errors during fulfillment, or verify database schema

### Issue 3: Transactions exist but project_id is NULL
**Cause:** Request's project_id is NULL (request created without project_id)
**Solution:** Check request creation - project_id must be passed in request body

### Issue 4: project_id mismatch
**Cause:** ProjectDetailsScreen using different project object than when request was created
**Solution:** Verify that project.id is consistent across navigation

## Database Schema Check

Verify these tables and columns exist:
```sql
-- Should exist:
external_jobwork_outstock_requests:
  - id, project_id, status, worker_id, requested_by, company_id

external_jobwork_outstock_transactions:
  - id, project_id, request_id, worker_id, company_id, qr_scan_time

external_jobwork_outstock_transaction_items:
  - id, transaction_id, material_name, issued_quantity, unit
```

## Next Steps

1. Call `/debug/complete-state` and note what data exists
2. If no requests/transactions, create a test request and fulfill it
3. If requests/transactions exist, check if project_id matches
4. Review logs in both frontend and backend console
5. Share the debug output and logs if issue persists
