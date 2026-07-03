# Project Details - External Job Work Material Enhancement

## Overview
Enhanced the Project Details screen to display available external job work materials directly in the PM dashboard. Instead of just showing a button, the screen now fetches and displays all available materials for the project's external job work inventory.

## Changes Made

### Frontend: ProjectDetailsScreen.js

#### 1. Added State Variables
```javascript
const [externalJobWorkMaterials, setExternalJobWorkMaterials] = useState([]);
const [loadingExternalMaterials, setLoadingExternalMaterials] = useState(false);
```

#### 2. Added Fetch Function
```javascript
const fetchExternalJobWorkMaterials = async () => {
  // Calls getProjectExternalMaterials endpoint
  // Sets materials state or empty array if error
};
```

#### 3. Updated useEffect Hook
- Added check for `project.project_type === 'external_job_work'`
- Calls `fetchExternalJobWorkMaterials()` when project is of external job work type

#### 4. Enhanced UI
**Before:**
- Just a button to navigate to material request screen

**After:**
- Shows "External Job Work Material" section
- Displays list of available materials with:
  - Material name
  - Available quantity and unit
  - Badge showing quantity
- Loading indicator while fetching
- Empty state message if no materials
- Button to create new request

#### 5. Added Styles
- `materialsListContainer` - Container for materials list
- `materialItemRow` - Individual material row
- `materialItemContent` - Material info content
- `materialItemName` - Material name text
- `materialItemQty` - Quantity text
- `materialItemBadge` - Quantity badge
- `materialItemBadgeText` - Badge text
- `noMaterialsText` - Empty state text

## API Integration

### Endpoint Used
```
GET /api/external-jobwork-materials/project/:projectId/available
```

### Response Format
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
      "unit": "pieces",
      "received_quantity": 50,
      "available_quantity": 50,
      "hsn_code": "7606.92",
      "gst_rate": 5
    }
  ]
}
```

## UI Display

### Section Layout
```
┌─────────────────────────────────────┐
│ 📦 External Job Work Material       │
│ Request materials from project's    │
│ external job work inventory         │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Steel Sheet 2mm                 │ │ 100 kg
│ │ Available: 100 kg               │ │
│ ├─────────────────────────────────┤ │
│ │ Aluminum Plate                  │ │ 50 pcs
│ │ Available: 50 pieces            │ │
│ └─────────────────────────────────┘ │
│                                      │
│ [➕ Request Materials]              │
└─────────────────────────────────────┘
```

### States

**Loading State:**
- Shows ActivityIndicator while fetching

**Empty State:**
- Shows: "No materials available in external job work inventory"

**Data State:**
- Lists all available materials with quantities

## Behavior

### When Section Appears
- Only shows for Project Manager role
- Only shows when project.project_type === 'external_job_work'
- Automatically fetches materials on component mount

### Fetching Materials
- Called from useEffect on component mount
- Also triggers when project type is 'external_job_work'
- Handles errors gracefully with empty array fallback
- Shows loading indicator during fetch

### Clicking "Request Materials"
- Navigates to ExternalJobworkMaterialRequestScreen
- Passes project and user as route params
- ExternalJobworkMaterialRequest screen will use already-fetched materials

## Business Logic

1. **Project Type Check**: Only displays for external job work projects
2. **Role Check**: Only visible to Project Managers
3. **Real-time Data**: Fetches current inventory for the project
4. **Material Filtering**: Shows only materials from project's external job work inventory
5. **Quantity Display**: Shows both quantity and unit type

## Data Flow

```
Project Details Screen Loads
        ↓
Check if External Job Work Project
        ↓
Is Project Manager? → Yes
        ↓
Call fetchExternalJobWorkMaterials()
        ↓
GET /project/:projectId/available
        ↓
Receive materials list
        ↓
Display in materials section
```

## Error Handling

- If fetch fails: Shows empty materials list
- If no materials: Shows "No materials available" message
- Shows loading state during fetch
- Errors logged to console

## Performance Considerations

- Fetch called once on component mount
- No pagination (assumes reasonable material count)
- Uses existing API endpoint
- Minimal state updates

## Integration Points

### With ExternalJobworkMaterialRequestScreen
- PM can see available materials in project details
- Click "Request Materials" button
- ExternalJobworkMaterialRequestScreen calls same endpoint
- Provides consistent material list across screens

### With StoreIncharge Dashboard
- SI can see pending requests from external job work materials
- Fulfillment workflow uses same inventory data

## Testing Scenarios

### Scenario 1: External Job Work Project
1. Create project with type 'external_job_work'
2. Add materials to external_jobwork_inventory for that project
3. Open project as PM
4. Should see "External Job Work Material" section
5. Should see list of materials
6. Material quantities should be accurate

### Scenario 2: No Materials
1. Create external job work project
2. Don't add materials to inventory
3. Open project as PM
4. Should show "No materials available" message

### Scenario 3: Regular Project
1. Create regular project (not external job work)
2. Open as PM
3. Should NOT see "External Job Work Material" section

### Scenario 4: Non-PM User
1. Open external job work project as NPD/Admin
2. Should NOT see "External Job Work Material" section

## Code References

**File:** `src/screens/ProjectDetailsScreen.js`

**State Variables:**
- Line: `const [externalJobWorkMaterials, setExternalJobWorkMaterials]`
- Line: `const [loadingExternalMaterials, setLoadingExternalMaterials]`

**Function:**
- `fetchExternalJobWorkMaterials()` - Fetches materials from API

**useEffect:**
- Calls `fetchExternalJobWorkMaterials()` when mounted

**JSX:**
- External Job Work Material section - Renders materials list
- Uses ActivityIndicator for loading
- Maps materials array for display

**Styles:**
- Added 8 new style definitions for materials display

## Related Files

- `src/config/api.js` - getProjectExternalMaterials method
- `backend/routes/external-jobwork-materials.js` - API endpoint
- `src/screens/ExternalJobworkMaterialRequestScreen.js` - Request screen

## Future Enhancements

1. **Pull to Refresh**: Add refresh functionality to reload materials
2. **Material Search**: Add search/filter for material names
3. **Quantity Warnings**: Show warnings if quantity is low
4. **Quick Request**: Quick button to request each material individually
5. **Request History**: Show recent requests in project details
6. **Material Trends**: Show material usage trends over time

## Verification Checklist

- [x] Syntax is correct (no diagnostics)
- [x] State variables added
- [x] Fetch function implemented
- [x] useEffect calls fetch on mount
- [x] UI displays materials when available
- [x] Loading state shows during fetch
- [x] Empty state displays when no materials
- [x] Styles are complete and consistent
- [x] Error handling is in place
- [x] Only shows for PM + external job work projects
