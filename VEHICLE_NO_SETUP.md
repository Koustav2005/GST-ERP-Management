# 🚐 Vehicle Number Feature - Quick Setup

## What's New
A new "Vehicle Number" field has been added to the Job Work feature. Project Managers can now capture vehicle information when creating job works.

---

## Setup Steps

### Step 1: Update Existing Database (One-time)
```bash
cd backend
node add-vehicle-no-to-jobwork.js
```

**Output:**
```
📦 Adding vehicle_no column to job_work_requests...
✅ vehicle_no column added successfully!
```

### Step 2: Restart Backend Server
```bash
npm start
# or your backend startup command
```

### Step 3: Clear App Cache & Restart
```bash
# For Expo
expo start --clear

# Then force reload the app (Cmd+R twice or Ctrl+R twice)
```

---

## Where to Find the New Field

### Project Manager
1. Open any Project → Job Work section
2. After "Unloaded Vehicle Weight" field
3. New field: **Vehicle No.** with placeholder "e.g. MH-02-AB-1234"

### Store Incharge
1. Open "My Job Work" screen
2. Expand any job work
3. See **🚐 Vehicle No:** displayed after weight details

### Accountant
1. Open "Shared Challans" screen
2. Expand any assigned job work
3. See **🚐 Vehicle No:** displayed after weight details

---

## Usage Example

**Project Manager enters:**
- Job Work Type: Laser Cutting
- Loaded Weight: 5000 kg
- Unloaded Weight: 3500 kg
- **Vehicle No.: MH-02-AB-1234** ← NEW
- Materials: Steel plates, dimensions, etc.

**Store Incharge sees:**
- Job ID: JW-2026-0001
- Weight details
- **Vehicle No.: MH-02-AB-1234** ← DISPLAYS HERE
- Materials and images

**Accountant sees:**
- Same information
- **Vehicle No.: MH-02-AB-1234** ← DISPLAYS HERE

---

## Field Specifications

| Property | Value |
|----------|-------|
| Field Name | Vehicle No. |
| Type | Text Input |
| Max Length | 20 characters |
| Required | No (Optional) |
| Placeholder | e.g. MH-02-AB-1234 |
| Position | After "Actual Net Weight" |

---

## Database Changes

New column added to `job_work_requests` table:
```sql
ALTER TABLE job_work_requests
ADD COLUMN vehicle_no VARCHAR(50);
```

**For new installations:** Column is automatically included in CREATE TABLE

---

## Testing

Quick test after setup:

1. **Create a Job Work:**
   - Login as Project Manager
   - Go to Project → Job Work
   - Fill in details
   - Enter a vehicle number: "MH-02-AB-1234"
   - Submit

2. **View as Store Incharge:**
   - Login as Store Incharge
   - Open "My Job Work"
   - Expand the job work
   - Verify vehicle number displays: "🚐 Vehicle No: MH-02-AB-1234"

3. **View as Accountant:**
   - After Store Incharge uploads challan
   - Login as Accountant
   - Open "Shared Challans"
   - Expand job work
   - Verify vehicle number displays: "🚐 Vehicle No: MH-02-AB-1234"

✅ All good!

---

## Troubleshooting

### Vehicle number field not showing in job work form
- Clear app cache
- Restart development server with `--clear` flag
- Force reload app (Cmd+R twice)

### Vehicle number not displaying to Store Incharge/Accountant
- Run migration script: `node add-vehicle-no-to-jobwork.js`
- Verify data exists in database: `SELECT vehicle_no FROM job_work_requests LIMIT 1;`
- Check for null values (field is optional)

### Database migration error
```bash
# Check if column already exists
psql -d gst_management -c "\d job_work_requests" | grep vehicle_no

# If exists, script will skip automatically
# If not exists, run again
node add-vehicle-no-to-jobwork.js
```

---

## Backward Compatibility

✅ **Fully backward compatible**
- Field is optional - existing code continues to work
- Existing job works without vehicle number will just skip display
- No breaking changes
- Database migration is non-destructive

---

## Status

✅ Feature Complete
✅ Database Migration Script Ready
✅ Frontend Integration Complete
✅ Backend Integration Complete
✅ Ready for Production

---

## Next Steps

1. Run migration: `node add-vehicle-no-to-jobwork.js`
2. Restart backend and frontend
3. Test creation and display
4. Deploy to production

Done! 🚐

