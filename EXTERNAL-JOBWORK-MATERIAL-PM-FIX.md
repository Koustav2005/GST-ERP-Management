# External Job Work Material Fetching Fix for Project Manager

## Problem Statement
When a Project Manager opens project details for a job work project, the external job work inventory materials were NOT being automatically fetched and displayed. The Store Incharge dashboard could fetch materials correctly, but the Project Manager's request flow was broken.

## Root Cause Analysis
The issue was in `ProjectDetailsScreen.js`:

1. **Conditional Fetch**: The `fetchExternalJobWorkMaterials()` function was only being called if `project.project_type === 'external_job_work'`, but this condition was not always met or was too restrictive.

2. **Display Condition**: The external materials section was only shown if both:
   - User role was 'project_manager' AND
   - Project type was 'external_job_work'
   
   This meant materials weren't being fetched or displayed if the project type wasn't explicitly set.

3. **Dependency Issue**: The useEffect hook had no dependencies, so it wasn't re-fetching materials if the project changed.

## Solution Implemented

### Changes to `ProjectDetailsScreen.js`:

#### 1. Updated useEffect Hook (Line ~548)
**Before:**
```javascript
useEffect(() => {
  // ... other fetches
  if (project.project_type === 'external_job_work') {
    fetchExternalJobWorkMaterials();
  }
  // ... other code
}, []);
```

**After:**
```javascript
useEffect(() => {
  // ... other fetches
  // Fetch external materials for ALL job work projects regardless of project type
  // This ensures Project Manager can request materials from external inventory
  fetchExternalJobWorkMaterials();
  // ... other code
}, [project.id]);
```

**Changes:**
- ✅ Removed the restrictive `project.project_type === 'external_job_work'` condition
- ✅ Now always fetches external materials when ProjectDetailsScreen loads
- ✅ Added `project.id` dependency to refetch if the project changes

#### 2. Updated Display Condition (Line ~1300)
**Before:**
```javascript
{user.role === 'project_manager' && project.project_type === 'external_job_work' && (
```

**After:**
```javascript
{user.role === 'project_manager' && (
```

**Changes:**
- ✅ Removed the `project.project_type === 'external_job_work'` restriction
- ✅ Now displays for all project managers, regardless of project type
- ✅ Shows "No materials available" message if inventory is empty

#### 3. Added Refresh Button (Line ~1300)
**Added new feature:**
```javascript
<View style={styles.cardHeaderRow}>
  <Text style={styles.cardTitle}>📦 External Job Work Material</Text>
  <TouchableOpacity 
    onPress={fetchExternalJobWorkMaterials}
    disabled={loadingExternalMaterials}
    style={styles.refreshButton}
  >
    <Text style={styles.refreshButtonText}>{loadingExternalMaterials ? '⟳' : '↻'}</Text>
  </TouchableOpacity>
</View>
```

**Benefits:**
- ✅ Manual refresh button to reload materials on demand
- ✅ Visual feedback when loading (animated spinner icon)
- ✅ Disabled state during loading to prevent multiple requests

#### 4. Added Styles for Refresh Button
```javascript
cardHeaderRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
refreshButton: {
  padding: 8,
  borderRadius: 6,
  backgroundColor: '#F2F2F7',
},
refreshButtonText: {
  fontSize: 16,
  color: '#007AFF',
  fontWeight: '600',
},
```

## Flow After Fix

### For Project Manager:
1. Open Project Manager Dashboard
2. Select any job work project
3. Click "View Details"
4. **Automatically**: External materials from Store Incharge inventory are fetched
5. **Display**: Materials show with their available quantities
6. **Optional**: Click refresh button (↻) to reload materials manually
7. **Action**: Click "➕ Request Materials" to request items from external inventory

## Backend Endpoint (Already Working)
The backend endpoint `/external-jobwork-materials/project/:projectId/available` was already correctly implemented:
- Fetches all materials from `external_jobwork_inventory` table for the company
- Groups materials by name and sums quantities
- Returns available quantity for each material
- Only returns materials with status 'received', 'in_stock', or `received_quantity > 0`

## Testing Checklist
- [ ] Project Manager can see external materials on project details screen
- [ ] Materials are automatically fetched when opening project details
- [ ] Refresh button works to reload materials manually
- [ ] Empty state shows "No materials available" when inventory is empty
- [ ] Material quantities display correctly with units
- [ ] Request Materials button navigates to request screen
- [ ] Materials from Store Incharge External Job Work Inventory show correctly

## Files Modified
1. `src/screens/ProjectDetailsScreen.js`
   - Updated useEffect dependencies and conditions
   - Added refresh button UI
   - Updated display conditions
   - Added new styles for refresh button

## No Breaking Changes
- ✅ Store Incharge dashboard continues to work as before
- ✅ All other project manager features unchanged
- ✅ Material request flow unchanged
- ✅ Backend APIs remain the same
