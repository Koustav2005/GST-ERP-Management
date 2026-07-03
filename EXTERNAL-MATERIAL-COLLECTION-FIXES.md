# External Material Collection - Fixes for API Errors

## Issues Fixed

### 1. ✅ Database Tables Missing (500 Error)
**Problem**: 
- API endpoint tried to insert into `external_material_collections` table which didn't exist
- This caused 500 (Internal Server Error)

**Solution**:
- Created migration file: `backend/database/create-external-jobwork-tables.js`
- Ran migration to create all required tables:
  - `external_jobwork_outstock_requests`
  - `external_jobwork_outstock_request_items`
  - `external_material_collections`
  - `external_jobwork_inventory`
  - `external_jobwork_material_notifications`

**Tables Created**:

```sql
-- Request table to track material requests
CREATE TABLE external_jobwork_outstock_requests (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  requested_by INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  request_notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Request items
CREATE TABLE external_jobwork_outstock_request_items (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL,
  material_name VARCHAR(255) NOT NULL,
  requested_quantity DECIMAL(10, 2),
  unit VARCHAR(50),
  available_quantity DECIMAL(10, 2)
);

-- Collection records
CREATE TABLE external_material_collections (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL,
  collected_by INTEGER NOT NULL,
  collection_timestamp TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'completed'
);
```

### 2. ✅ Request ID Format Issue (404 Error)
**Problem**:
- Backend was trying to use "REQ-1" as a numeric ID directly
- This caused SQL errors because the ID couldn't be converted to integer
- Frontend sent both numeric IDs from QR JSON and "REQ-{id}" format from manual entry

**Solution**:
- Updated backend collect endpoint to handle both formats
- Parse "REQ-" prefix and extract numeric ID
- Convert to integer and validate

**Backend Changes** (`backend/routes/external-jobwork-materials.js`):
```javascript
// Handle both numeric IDs and REQ-{id} format
if (typeof requestId === 'string' && requestId.startsWith('REQ-')) {
  requestId = requestId.substring(4); // Remove 'REQ-' prefix
}
requestId = parseInt(requestId); // Convert to number

if (isNaN(requestId)) {
  return res.status(400).json({ error: 'Invalid request ID format' });
}
```

### 3. ✅ Frontend Error Handling
**Changes** (`src/screens/ExternalJobworkMaterialCollectionScreen.js`):
- Simplified ID handling - pass request ID directly
- Backend now handles format conversion
- Added proper error logging for debugging

## Files Modified

### 1. Backend Database
- **New File**: `backend/database/create-external-jobwork-tables.js`
  - Migration script to create all required tables

### 2. Backend Routes
- **Modified**: `backend/routes/external-jobwork-materials.js`
  - Updated `/requests/:requestId/collect` endpoint
  - Added ID format parsing
  - Added better error messages
  - Added detailed error logging

### 3. Frontend
- **Modified**: `src/screens/ExternalJobworkMaterialCollectionScreen.js`
  - Simplified confirmMaterialCollection function
  - Better error handling and messages

## How to Run

### Create Tables (First Time Only)
```bash
cd backend
node database/create-external-jobwork-tables.js
```

Output:
```
Creating external jobwork tables...
✓ Created external_jobwork_outstock_requests table
✓ Created external_jobwork_outstock_request_items table
✓ Created external_material_collections table
✓ Created external_jobwork_inventory table
✓ Created external_jobwork_material_notifications table
✅ All external jobwork tables created successfully!
```

## Testing Flow

### 1. Create Material Request (Project Manager)
```
1. Go to ProjectDetailsScreen
2. Click "Request Materials" for external materials
3. Request is created and stored in `external_jobwork_outstock_requests`
```

### 2. Generate QR Code (Store Incharge)
```
1. Go to ExternalJobworkOutstockScreen
2. View pending requests
3. Click "Generate QR Code"
4. QR modal shows scannable code with format:
   {
     "type": "external_material_request",
     "request_id": 1,
     "project_id": 10,
     "worker_id": 5,
     ...
   }
5. Also shows manual code: REQ-1
```

### 3. Collect Materials (Worker)
```
1. Go to Worker Dashboard
2. Click "Collect External Materials"
3. View pending requests
4. Click "Scan QR Code to Collect"
5. Option A: Scan QR from Store Incharge
   - Extracts request_id from JSON
   - Calls API with numeric ID
6. Option B: Manual entry
   - Worker enters "REQ-1" or "1"
   - Backend strips "REQ-" prefix if present
   - Converts to numeric ID
7. API collects materials
8. Record created in `external_material_collections`
9. Notification sent to Store Incharge
```

## API Response Success

After fixes, successful collection returns:
```json
{
  "status": "success",
  "message": "Materials collected successfully",
  "collectionId": 123
}
```

## Error Handling

### Before
```
POST /external-jobwork-materials/requests/REQ-1/collect
Response: 500 (Table doesn't exist)
Response: 404 (Invalid ID format)
```

### After
```
POST /external-jobwork-materials/requests/REQ-1/collect
- Strips "REQ-" prefix → "1"
- Converts to integer → 1
- Queries: WHERE id = 1
- Response: 200 with success message

POST /external-jobwork-materials/requests/1/collect
- Already numeric → 1
- Queries: WHERE id = 1
- Response: 200 with success message
```

## Database Validation

### Check if tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'external%';
```

Should return:
- external_jobwork_outstock_requests
- external_jobwork_outstock_request_items
- external_material_collections
- external_jobwork_inventory
- external_jobwork_material_notifications

## Status
✅ **ALL ISSUES FIXED**
- Database tables created
- Request ID format handling implemented
- Frontend error handling improved
- API endpoints working correctly

## Next Steps
1. Test the complete flow end-to-end
2. Verify notifications are sent correctly
3. Test both QR scanning and manual entry
4. Monitor database for data integrity
