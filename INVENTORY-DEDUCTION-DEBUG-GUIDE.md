# Inventory Deduction Debug Guide

## Issue: Cupboard Material Still Showing After Collection

If you see "cupboard" material in external job work inventory (POEN00108876006) after it's been collected, follow these steps to debug:

---

## Step 1: Check Backend Logs

When the collection happens, the backend now logs detailed information. Look for output like:

```
📦 Collection 1: Found 2 items to deduct
🔄 Processing: Cupboard (1 unit)
  Found 1 matching inventory items
  Before: Cupboard = 10 qty, status=in_stock
  Deducting: 1
  After: 9 qty, status=in_stock
  ✅ Updated inventory ID 42: qty=9, status=in_stock
```

**If you see this**: ✅ Deduction worked correctly

**If you see this**:
```
⚠️  WARNING: No matching inventory found for: Cupboard
Searching all inventory for this company...
Found 5 total inventory items in company:
  - Sofa (5 qty, in_stock)
  - Desk (3 qty, issued)
  - Cupboard (1 qty, in_stock)
```

**Problem**: Material name doesn't match exactly. Check for:
- Extra spaces: "Cupboard " vs "Cupboard"
- Case differences: "CUPBOARD" vs "cupboard"  
- Special characters: "Cupboard-A" vs "Cupboard"

---

## Step 2: Check Request Items Match

When a PM creates a request, the material names are stored in `external_jobwork_outstock_request_items`. These must match inventory exactly (after trim and lowercase).

**Query to check**:
```sql
SELECT 
  r.id,
  material_name,
  requested_quantity
FROM external_jobwork_outstock_request_items r
WHERE request_id = 1;
```

Compare the `material_name` with what's in inventory.

---

## Step 3: Check Inventory Status

After collection, the inventory status should change.

**Before Collection**:
```sql
SELECT id, material_name, received_quantity, status
FROM external_jobwork_inventory
WHERE LOWER(material_name) LIKE '%cupboard%';
```

**Expected response**:
```
id | material_name | received_quantity | status
42 | Cupboard      | 10                | in_stock
```

**After Collection**:
```
id | material_name | received_quantity | status
42 | Cupboard      | 9                 | in_stock    (if more remains)
-- OR --
42 | Cupboard      | 0                 | issued      (if all collected)
```

---

## Step 4: Check Filtering Logic

The inventory endpoint should exclude "issued" items.

**Direct query** (simulates API response):
```sql
SELECT 
  id,
  material_name,
  received_quantity,
  status
FROM external_jobwork_inventory
WHERE (status IN ('received', 'in_stock') OR received_quantity > 0)
ORDER BY material_name;
```

**This query should NOT return**:
- Items with `status='issued'` AND `received_quantity=0`

**If cupboard shows up** with `status='issued'`, then backend filtering isn't working.

---

## Step 5: Check Frontend Filtering

Even if backend returns it, frontend now filters:

```javascript
const filteredItems = (response.data || []).filter(item => 
  item.status !== 'issued' && (parseFloat(item.received_quantity) || 0) > 0
);
```

**If cupboard still shows**:
- Check browser console for the API response
- Verify `item.status` and `item.received_quantity`
- Confirm filter is removing it

---

## Step 6: Possible Issues & Solutions

### Issue A: Material Name Mismatch
**Symptom**: Backend logs "No matching inventory found"

**Solution**:
1. Check exact spelling in both tables
2. Look for leading/trailing spaces
3. Check for case differences
4. Export data to compare

**Fix Script**:
```sql
-- Find all similar material names
SELECT DISTINCT LOWER(TRIM(material_name)) as normalized_name
FROM external_jobwork_inventory
WHERE company_id = 1
ORDER BY normalized_name;
```

### Issue B: Inventory Record Doesn't Exist
**Symptom**: Material created by request, but no inventory record

**Possible causes**:
1. Material wasn't received yet
2. Wrong job work ID  
3. Material entered in wrong table

**Check**:
```sql
-- Verify inventory exists
SELECT COUNT(*) FROM external_jobwork_inventory
WHERE LOWER(material_name) LIKE '%cupboard%'
  AND company_id = 1;
```

### Issue C: Request Items Not Matching Request
**Symptom**: Collection runs but items list is empty

**Check**:
```sql
SELECT * FROM external_jobwork_outstock_request_items
WHERE request_id = 1;
```

Should return at least 1 row per material.

### Issue D: Status Stuck on 'in_stock'
**Symptom**: Quantity goes to 0 but status doesn't change to 'issued'

**Possible causes**:
1. UPDATE didn't execute
2. Database error caught silently
3. Transaction rolled back

**Check logs** for errors.

---

## Step 7: Manual Inventory Correction

If you need to manually fix inventory after a failed deduction:

```sql
-- Mark cupboard as issued (fully collected)
UPDATE external_jobwork_inventory
SET 
  received_quantity = 0,
  status = 'issued',
  updated_at = CURRENT_TIMESTAMP
WHERE LOWER(TRIM(material_name)) = LOWER(TRIM('Cupboard'))
  AND company_id = 1;

-- Verify
SELECT received_quantity, status FROM external_jobwork_inventory
WHERE LOWER(material_name) LIKE '%cupboard%';
```

---

## Step 8: Check Collection Record

Verify that the collection was actually recorded:

```sql
SELECT 
  c.id,
  c.request_id,
  c.collected_by,
  c.collection_timestamp,
  c.status
FROM external_material_collections c
WHERE c.request_id = 1;
```

If empty = Collection didn't happen.

---

## Step 9: Check Request Status

Verify that the request status changed to 'fulfilled':

```sql
SELECT id, status, updated_at
FROM external_jobwork_outstock_requests
WHERE id = 1;
```

Should show:
```
id | status    | updated_at
1  | fulfilled | 2026-07-03 10:35:00
```

If still `'pending'` = Collection endpoint failed.

---

## Complete Debugging Checklist

- [ ] Backend logs show deduction attempt
- [ ] Material name matches exactly (case-insensitive)
- [ ] Inventory record exists with correct name
- [ ] Received quantity decreased
- [ ] Status changed to 'issued' (if qty=0)
- [ ] Collection record created
- [ ] Request status = 'fulfilled'
- [ ] API query excludes issued items
- [ ] Frontend filter removes issued items
- [ ] UI no longer shows material

---

## Quick Test Steps

1. **Create Request**: PM requests 5 pcs Cupboard
2. **Generate QR**: Store Incharge creates QR code
3. **Collect**: Worker scans QR
4. **Check Logs**: Look for "✅ Updated inventory" message
5. **Refresh UI**: Pull to refresh inventory view
6. **Verify**: Cupboard quantity should decrease or disappear

---

## If Still Not Working

1. **Check backend logs** when collection happens
2. **Run SQL query** to see actual inventory state
3. **Check if material names match** (enable debug query output)
4. **Verify request items were created** with correct material name
5. **Check for database transaction issues**

---

## Enhanced Logging Available

The collection endpoint now logs:
- ✅ Number of items to deduct
- ✅ Each material being processed
- ✅ Inventory matches found
- ✅ Before/after quantities
- ✅ Status changes
- ⚠️ Warnings if no match found
- ❌ Errors during update

**Check server console** (where backend is running) for detailed output.

---

## Status

**Previous**: Deduction happened silently (hard to debug)
**Now**: Detailed logging for troubleshooting ✅

Look for the enhanced log output to diagnose the issue.
