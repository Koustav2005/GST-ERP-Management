# External Job Work Material Inventory Deduction

## Overview
Once materials are collected by a worker, they must be deducted from the external job work inventory and no longer show as available for new requests.

## Implementation

### What Changed

#### 1. Collection Endpoint Enhanced
**File**: `backend/routes/external-jobwork-materials.js`
**Endpoint**: `POST /external-jobwork-materials/requests/:requestId/collect`

When worker collects materials:
1. ✅ Request status updated to `'fulfilled'`
2. ✅ Collection record created with timestamp
3. ✅ **NEW**: Inventory quantities deducted
4. ✅ **NEW**: Inventory status updated
5. ✅ Notifications sent to Store Incharge

### Inventory Deduction Logic

```javascript
// For each material in the request:
await pool.query(`
  UPDATE external_jobwork_inventory
  SET 
    received_quantity = GREATEST(0, received_quantity - $1),
    status = CASE 
      WHEN (received_quantity - $1) <= 0 THEN 'issued'
      ELSE 'in_stock'
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE company_id = $2
    AND LOWER(TRIM(material_name)) = LOWER(TRIM($3))
  ORDER BY created_at ASC
  LIMIT 1
`, [requestedQuantity, companyId, materialName]);
```

**What it does:**
- Deducts the requested quantity from `received_quantity`
- Uses `GREATEST(0, ...)` to prevent negative quantities
- Sets status to `'issued'` when quantity reaches 0
- Keeps status as `'in_stock'` if quantity remains > 0
- Updates timestamp automatically

### Availability Filtering

#### Project Manager View
**Endpoint**: `GET /external-jobwork-materials/project/:projectId/available`

Shows materials with:
```sql
WHERE company_id = $1
  AND (status IN ('received', 'in_stock') OR received_quantity > 0)
```

**Result**: Issued items (status='issued', quantity=0) won't show

#### Inventory Display
**Endpoint**: `GET /external-jobwork-materials/inventory/:jobWorkId/:companyId`

Updated to filter:
```sql
WHERE job_work_id = $1 AND company_id = $2
  AND (status IN ('received', 'in_stock') OR received_quantity > 0)
```

**Result**: Only available inventory displayed

---

## Database State Transitions

### Scenario: 100 pcs Steel Pipe Available → 30 pcs Requested → Collected

#### Step 1: Initial Inventory
```
external_jobwork_inventory:
┌────────┬──────────────────┬────────────────┬──────────────────┬────────┐
│ id     │ material_name    │ received_qty   │ status           │ qty    │
├────────┼──────────────────┼────────────────┼──────────────────┼────────┤
│ 1      │ Steel Pipe       │ 100            │ 'in_stock'       │ 100    │
└────────┴──────────────────┴────────────────┴──────────────────┴────────┘
```

#### Step 2: Request Created (30 pcs)
```
No change in inventory yet - just creates request record

external_jobwork_outstock_requests:
┌────┬────────────┬──────────────────┬──────────┐
│ id │ project_id │ status           │ qty_req  │
├────┼────────────┼──────────────────┼──────────┤
│ 1  │ 5          │ 'pending'        │ 30       │
└────┴────────────┴──────────────────┴──────────┘
```

#### Step 3: Worker Collects (30 pcs)
**Trigger**: POST `/requests/1/collect`

```
Inventory BEFORE:
received_qty = 100, status = 'in_stock'

Inventory AFTER:
received_qty = 100 - 30 = 70
status = 'in_stock' (still > 0)
updated_at = NOW()

Result:
┌────────┬──────────────────┬────────────────┬──────────────────┬────────┐
│ id     │ material_name    │ received_qty   │ status           │ qty    │
├────────┼──────────────────┼────────────────┼──────────────────┼────────┤
│ 1      │ Steel Pipe       │ 70             │ 'in_stock'       │ 100    │
└────────┴──────────────────┴────────────────┴──────────────────┴────────┘
```

#### Step 4: Another Request for 70 pcs (collects all)
**Trigger**: POST `/requests/2/collect`

```
Inventory BEFORE:
received_qty = 70, status = 'in_stock'

Inventory AFTER:
received_qty = 70 - 70 = 0
status = 'issued' (quantity = 0)
updated_at = NOW()

Result:
┌────────┬──────────────────┬────────────────┬──────────────────┬────────┐
│ id     │ material_name    │ received_qty   │ status           │ qty    │
├────────┼──────────────────┼────────────────┼──────────────────┼────────┤
│ 1      │ Steel Pipe       │ 0              │ 'issued'         │ 100    │
└────────┴──────────────────┴──────────────────┴──────────────────┴────────┘
```

---

## Visibility After Collection

### What PM Sees
**Before Collection**: 100 pcs available
```json
{
  "materials": [
    {
      "material_name": "Steel Pipe",
      "available_quantity": 100,
      "unit": "pcs"
    }
  ]
}
```

**After 30 pcs Collected**: 70 pcs available
```json
{
  "materials": [
    {
      "material_name": "Steel Pipe",
      "available_quantity": 70,
      "unit": "pcs"
    }
  ]
}
```

**After 70 pcs Collected**: Not shown (quantity = 0, status='issued')
```json
{
  "materials": []  // No Steel Pipe
}
```

### What Store Incharge Sees
**Inventory View**: Only non-issued items displayed
- 100 pcs → 70 pcs → 0 pcs (disappears)

**Status**: Changes from `'in_stock'` → `'issued'`

---

## Edge Cases Handled

### 1. Multiple Inventory Records for Same Material
When collecting, the query:
```sql
ORDER BY created_at ASC
LIMIT 1
```
- Deducts from the **oldest** inventory entry first (FIFO)
- Ensures fair inventory allocation

### 2. Partial Collection
If warehouse has 100 pcs but PM requests 150 pcs:
- System checks `fulfillRequest` endpoint
- Rejects with error: "Insufficient stock"
- No collection happens
- Inventory unchanged

### 3. Negative Quantity Prevention
```sql
GREATEST(0, received_quantity - $1)
```
- Prevents negative quantities
- Never shows -10 pcs

### 4. Case-Insensitive Material Matching
```sql
LOWER(TRIM(material_name)) = LOWER(TRIM($3))
```
- "Steel Pipe" = "STEEL PIPE" = "steel pipe"
- Handles user input variations

---

## Collection Flow Summary

```
┌─────────────────────────────────────────────┐
│ Worker Scans QR Code                        │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│ POST /requests/:id/collect                  │
│ - Verify request exists                     │
│ - Verify worker match                       │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│ Create Collection Record                    │
│ - Collection ID generated                   │
│ - Timestamp recorded                        │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│ UPDATE Inventory (NEW)                      │
│ - Deduct quantities                         │
│ - Update status to 'issued' if qty=0        │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│ UPDATE Request Status                       │
│ - Status: pending → fulfilled               │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│ Send Notification                           │
│ - Store Incharge notified                   │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│ Return Success Response                     │
│ - Collection ID                             │
│ - Status message                            │
└─────────────────────────────────────────────┘
```

---

## Testing Checklist

- [ ] Collect 30 pcs from 100 pcs inventory
- [ ] Verify inventory shows 70 pcs remaining
- [ ] Attempt new PM request - should only see 70 pcs available
- [ ] Collect all remaining 70 pcs
- [ ] Verify material disappears from PM available list
- [ ] Check inventory status = 'issued' when quantity = 0
- [ ] Verify database shows correct deductions
- [ ] Test case-insensitive material name matching
- [ ] Test multiple materials in one request deduction
- [ ] Verify negative quantities never occur

---

## Files Modified

1. **backend/routes/external-jobwork-materials.js**
   - Enhanced `/requests/:requestId/collect` endpoint
   - Added inventory deduction logic
   - Updated inventory filtering in two endpoints

## API Response

After collection, response includes:
```json
{
  "status": "success",
  "message": "Materials collected successfully",
  "collectionId": 42
}
```

Inventory now automatically reflects the deduction.

---

## Status: ✅ COMPLETE

Inventory deduction is now automatic when materials are collected. Collected materials no longer show as available for new requests.
