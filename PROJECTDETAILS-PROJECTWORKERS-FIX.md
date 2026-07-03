# ProjectDetailsScreen - projectWorkers Reference Error Fix

## Problem
Error: `[ReferenceError: Property 'projectWorkers' doesn't exist]`

This occurred when the ProjectDetailsScreen was trying to access the `projectWorkers` state variable, which wasn't properly declared.

## Root Cause
When I added the `externalJobWorkMaterials` state declarations, the `projectWorkers` state declarations that came after them were accidentally removed during the refactoring.

The state variables were being referenced in multiple places:
- Line 484: `projectWorkers.some(w => ...)`
- Line 496: `!projectWorkers.some(pw => ...)`
- Line 1244: `projectWorkers.length === 0`
- Line 1247: `projectWorkers.map((worker) => ...)`
- Line 1271: `!projectWorkers.some(pw => ...)`
- Line 2817: `projectWorkers.length === 0`
- Line 2820: `projectWorkers.map((worker) => ...)`

But the state was never declared because it got accidentally replaced.

## Solution
Re-added all the missing state declarations:

```javascript
const [projectWorkers, setProjectWorkers] = useState([]);
const [availableWorkers, setAvailableWorkers] = useState([]);
const [selectedWorkerForAssign, setSelectedWorkerForAssign] = useState('');
const [selectedWorkerForRequest, setSelectedWorkerForRequest] = useState('');
const [loadingWorkers, setLoadingWorkers] = useState(false);
```

## File Changed
- `src/screens/ProjectDetailsScreen.js`
  - Lines 92-96: Restored missing state declarations

## State Variables
These were restored:

| Variable | Type | Purpose |
|----------|------|---------|
| `projectWorkers` | array | Stores list of workers assigned to project |
| `availableWorkers` | array | Stores all company workers available to assign |
| `selectedWorkerForAssign` | string | Currently selected worker for assignment |
| `selectedWorkerForRequest` | string | Currently selected worker for material requests |
| `loadingWorkers` | boolean | Loading state for worker operations |

## What Each Does

### projectWorkers
- Populated by `fetchProjectWorkers()` function
- Used to display currently assigned workers
- Used to filter available workers (only show unassigned)
- Used in worker management section of Project Details

### availableWorkers
- Populated by `fetchCompanyWorkers()` function
- Contains all workers in the company
- Filtered to hide already-assigned workers

### selectedWorkerForAssign
- Stores the worker ID selected in the picker
- Used when assigning new workers to project

### selectedWorkerForRequest
- Stores the worker ID for material requests
- Used in material request workflows

### loadingWorkers
- Shows loading indicator during worker operations
- Set to true during API calls for adding/removing workers

## Usage in Code

### Displaying Assigned Workers
```javascript
{projectWorkers.length === 0 ? (
  <Text>No workers assigned to this project yet.</Text>
) : (
  projectWorkers.map((worker) => (
    <View key={worker.worker_id}>
      {/* Display worker */}
    </View>
  ))
)}
```

### Filtering Available Workers
```javascript
availableWorkers
  .filter(w => !projectWorkers.some(pw => pw.worker_id === w.id))
  .map((worker) => ...)
```

### Worker Assignment
```javascript
const handleAssignWorker = async () => {
  const isAlreadyAssigned = projectWorkers.some(
    w => w.worker_id === parseInt(selectedWorkerForAssign)
  );
  // ... assignment logic
};
```

## Verification

✅ No syntax errors (diagnostics check passed)
✅ All state variables declared
✅ No duplicate declarations
✅ All references have corresponding state

## Testing

After fix, verify:

1. **Project Details loads**: No reference errors
2. **Assigned Workers section displays**: Shows workers if assigned
3. **Add Worker dropdown works**: Shows available workers
4. **Assign Worker button works**: Can add workers
5. **Remove Worker works**: Can remove assigned workers
6. **Material Request screen loads**: Worker selection works

## Related Functions

These functions use the restored state:

- `fetchProjectWorkers()` - Populates projectWorkers
- `fetchCompanyWorkers()` - Populates availableWorkers
- `handleAssignWorker()` - Uses selectedWorkerForAssign
- `handleRemoveWorker()` - Uses projectWorkers
- `fetchExternalJobWorkMaterials()` - Uses selectedWorkerForRequest (in requests)

## Dependencies

The following API methods are used:

- `projectsAPI.getProjectWorkers(projectId)` - Get assigned workers
- `projectsAPI.getWorkers(companyId)` - Get available workers
- `projectsAPI.addProjectWorker(projectId, workerId)` - Assign worker
- `projectsAPI.removeProjectWorker(projectId, workerId)` - Remove worker

## Error Prevention

To prevent this in the future:

1. Keep state declarations together
2. Search for all references before removing declarations
3. Run diagnostics after refactoring
4. Test the affected features

## Timeline

- **Created**: During externalJobWorkMaterials enhancement
- **Discovered**: Runtime error on ProjectDetailsScreen load
- **Fixed**: Re-added missing state declarations
- **Verified**: Diagnostics check passed

## Notes

This fix maintains backward compatibility and doesn't change any existing functionality. It simply restores the state declarations that are required for the worker management features in ProjectDetailsScreen.
