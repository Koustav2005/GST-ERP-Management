# External Job Work Material Request & Outstock - Design Reference

## Screen Layout Reference

### 1. Project Manager - External Job Work Material Screen

```
┌─────────────────────────────────────────────────┐
│  ← Project Details > External Job Work Material │
├─────────────────────────────────────────────────┤
│  TABS:  [Available Materials] [Create Request]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  TAB 1: AVAILABLE MATERIALS                     │
│  ─────────────────────────────────────────────  │
│  (Read-only list of materials in inventory)     │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 📦 Material Name                         │  │
│  │ Code: MAT-001                            │  │
│  │ Available: 50 pcs | Unit: pcs            │  │
│  │ Batch: LOT-2024-001 | Stock: ✓ In Stock  │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 📦 Material Name 2                       │  │
│  │ Code: MAT-002                            │  │
│  │ Available: 100 pcs | Unit: pcs           │  │
│  │ Batch: LOT-2024-002 | Stock: ✓ In Stock  │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  TAB 2: CREATE REQUEST                         │
│  ─────────────────────────────────────────────  │
│  (Form to create material request)              │
│                                                 │
│  🔹 MATERIAL SELECTION                         │
│  ┌────────────────────────────────────────┐   │
│  │ ☑ Material Name 1                      │   │
│  │   Requested Qty: [50______] pcs         │   │
│  │   Available: 50 (Maximum)                │   │
│  │                                          │   │
│  │ ☐ Material Name 2                       │   │
│  │   Requested Qty: [__] pcs                │   │
│  │   Available: 100 (Maximum)               │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│  🔹 WORKER SELECTION                           │
│  ┌────────────────────────────────────────┐   │
│  │ Select Worker (Required)                │   │
│  │ ▼ [Worker Name - ID: 5]                 │   │
│  │ - Worker 1 - ID: 1                       │   │
│  │ - Worker 2 - ID: 2                       │   │
│  │ - Worker 3 - ID: 5                       │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│  🔹 REQUEST NOTES (Optional)                   │
│  ┌────────────────────────────────────────┐   │
│  │ Add notes...                            │   │
│  │ ________________________________          │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│           [CANCEL]  [SUBMIT REQUEST]          │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Colors & Styling**:
- Primary: #5856D6 (purple buttons)
- Success: #34C759 (checkmarks)
- Warning: #FF9500 (quantity warnings)
- Cards: white with shadow, radius 10px
- Material cards: border-left 4px #5856D6

---

### 2. Store Incharge - External Job Work Outstock Screen

```
┌─────────────────────────────────────────────────┐
│  ← Store Dashboard > External Job Work Outstock │
├─────────────────────────────────────────────────┤
│  TABS: [Pending (5)] [Fulfilled (12)] [History] │
├─────────────────────────────────────────────────┤
│                                                 │
│  TAB 1: PENDING REQUESTS                        │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 📋 REQ-001 | PROJECT-PO-EN0001           │  │
│  │ Requested By: Rajesh Kumar (PM)          │  │
│  │ Assigned Worker: Vikram Singh (ID: 7)    │  │
│  │ Date: 02/07/2026, 14:30                  │  │
│  │ Status: [Pending]                        │  │
│  │                                           │  │
│  │ ▼ Show Details                           │  │
│  │                                           │  │
│  │ (When expanded:)                         │  │
│  │ Requested Items:                         │  │
│  │  • Steel Plate - 50 pcs (Avail: 50)      │  │
│  │  • Bolt M10 - 100 pcs (Avail: 100)       │  │
│  │ Request Notes: Urgent for assembly       │  │
│  │                                           │  │
│  │         [View & Fulfill]                 │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 📋 REQ-002 | PROJECT-PO-EN0002           │  │
│  │ Requested By: Priya Singh (PM)           │  │
│  │ Assigned Worker: Amit Kumar (ID: 5)      │  │
│  │ Date: 02/07/2026, 15:45                  │  │
│  │ Status: [Pending]                        │  │
│  │ ...                                       │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  TAB 2: FULFILLED REQUESTS                      │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ ✅ REQ-001 | PROJECT-PO-EN0001           │  │
│  │ Issued By: Ankit (Store Incharge)        │  │
│  │ Fulfillment Date: 02/07/2026, 15:00      │  │
│  │ QR Status: ✓ Verified                    │  │
│  │ Status: [Fulfilled]                      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  TAB 3: HISTORY                                 │
│  ─────────────────────────────────────────────  │
│  Search: [_____________] 🔍                    │
│  Filter: [All Projects ▼] [Date Range ▼]      │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ TRANS-001 | PROJECT-PO-EN0001            │  │
│  │ Worker: Vikram Singh | Issued: 02/07     │  │
│  │ Items: Steel Plate (50 pcs), Bolt M10... │  │
│  │ Issued By: Ankit | QR: Verified ✓        │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Colors & Styling**:
- Pending badge: #FF9500 (orange)
- Fulfilled badge: #34C759 (green)
- Request cards: white, border-left 4px #5856D6
- Status indicators: ✓ for verified, ⚠ for issues

---

### 3. Fulfillment Modal - Stock Verification

```
┌─────────────────────────────────────────────────┐
│  Fulfill Material Request                    ✕  │
├─────────────────────────────────────────────────┤
│                                                 │
│  REQUEST DETAILS                                │
│  Project: PROJECT-PO-EN0001                     │
│  Requested By: Rajesh Kumar                     │
│  Worker: Vikram Singh (Assigned)                │
│                                                 │
│  REQUESTED ITEMS - STOCK VERIFICATION           │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ ✓ Steel Plate                            │  │
│  │   Requested: 50 pcs | Available: 50 pcs │  │
│  │   Status: ✓ OK TO FULFILL                │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ ✓ Bolt M10                               │  │
│  │   Requested: 100 pcs | Available: 100 pcs  │
│  │   Status: ✓ OK TO FULFILL                │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ⚠️ INSUFFICIENT STOCK SCENARIO:               │
│  ┌──────────────────────────────────────────┐  │
│  │ ✗ Bolt M10                               │  │
│  │   Requested: 100 pcs | Available: 50 pcs   │
│  │   ⚠️  INSUFFICIENT STOCK!                  │  │
│  │                                            │  │
│  │   Cannot fulfill this request.             │  │
│  │   (No partial issuance allowed)            │  │
│  │                                            │  │
│  │   Action: Restock materials or cancel req. │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  [CANCEL] [PROCEED TO QR VERIFICATION]        │
│  (Button disabled if stock insufficient)      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### 4. QR Verification Screen

```
┌─────────────────────────────────────────────────┐
│  QR Verification                             ✕  │
├─────────────────────────────────────────────────┤
│                                                 │
│  SCAN WORKER QR CODE                            │
│  ─────────────────────────────────────────────  │
│                                                 │
│  📱 [QR Camera View]                            │
│  [                                            ] │
│  [      Hold QR Code in frame...             ] │
│  [                                            ] │
│  [                                            ] │
│                                                 │
│  ⚠️ No QR Detected                             │
│                                                 │
│  Manual Entry (Alternative):                   │
│  Scan or enter: [________________]              │
│                                                 │
│  [CANCEL]                                       │
│                                                 │
└─────────────────────────────────────────────────┘

After Successful Scan:

┌─────────────────────────────────────────────────┐
│  QR Verification - Confirmed                  ✕ │
├─────────────────────────────────────────────────┤
│                                                 │
│  ✓ QR CODE VERIFIED SUCCESSFULLY                │
│                                                 │
│  WORKER DETAILS                                 │
│  Name: Vikram Singh                             │
│  ID: 7                                          │
│  Company: Subhash Engineering                   │
│  ✓ Matches assigned worker for this request     │
│                                                 │
│  MATERIAL HANDOVER CONFIRMATION                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Items being issued:                            │
│  • Steel Plate - 50 pcs                         │
│  • Bolt M10 - 100 pcs                           │
│                                                 │
│  ⚠️ Verify physical materials match before OK   │
│                                                 │
│           [CANCEL]  [CONFIRM HANDOVER]         │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Store Incharge Dashboard Integration

```
┌─────────────────────────────────────────────────┐
│  Store Incharge Dashboard                    ⚙️  │
├─────────────────────────────────────────────────┤
│                                                 │
│  📦 In Stock Orders                             │
│  📦 Outstock                                    │
│  📦 External Job Work Outstock [NEW]            │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ External Job Work Outstock         (5)🔔 │  │
│  │ View & manage external material requests  │  │
│  │ from project managers                     │  │
│  │                                           │  │
│  │ [TAP TO OPEN]                             │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Color Palette

```
Primary Colors:
  - Primary Purple: #5856D6 (buttons, headers, accents)
  - Dark Purple: #4c47b8 (pressed states)
  - Light Purple: #f0ecff (backgrounds)

Status Colors:
  - Success: #34C759 (✓ verified, fulfilled)
  - Warning: #FF9500 (pending, attention needed)
  - Danger: #FF3B30 (insufficient stock, errors)
  - Neutral: #8E8E93 (inactive, borders)

Text Colors:
  - Primary Text: #333333
  - Secondary Text: #666666
  - Tertiary Text: #999999

Backgrounds:
  - Card Background: #FFFFFF
  - Screen Background: #f5f5f5
  - Input Background: #FFFFFF

Shadows:
  - Light Shadow: shadowColor '#000' offset {0,2} opacity 0.1 radius 4
  - Medium Shadow: elevation 3
```

---

## Component Reuse

### From Existing Code

1. **QR Scanner** (from OrderReceiptScreen.js)
   - Reuse camera integration logic
   - Reuse QR verification logic
   - Reuse manual entry fallback

2. **Request Cards** (style from ExternalJobworkChallanScreen.js)
   - Expandable card structure
   - Status badge styling
   - Material item list

3. **Material Selector** (from ExternalJobworkMaterialNotificationScreen.js)
   - Material display with quantities
   - Checkbox selection
   - Quantity input fields

4. **Worker Dropdown** (from ProjectDetailsScreen.js)
   - Worker selection modal
   - Worker details display
   - Existing API pattern

5. **Tab Navigation** (from InStockOrdersScreen.js)
   - Tab bar styling
   - Active/inactive states
   - Tab content switching

---

## Responsive Breakpoints

```
Mobile (< 480px):
  - Single column layout
  - Card full width
  - Touch-friendly buttons (48px min height)
  - Stacked form fields

Tablet (480px - 768px):
  - Two column for lists
  - Wider cards with padding
  - Form fields side-by-side where appropriate

Desktop (> 768px):
  - Multi-column possible
  - Filters on the side
  - Expanded details inline

Mobile-First Approach:
  - Start with mobile layout
  - Add max-width constraints for desktop
  - Use responsive utilities for spacing
```

---

## Accessibility

- ✓ Touch target minimum 44x44 dp
- ✓ Sufficient color contrast ratios
- ✓ Clear focus indicators for keyboard navigation
- ✓ Descriptive button labels
- ✓ Error messages near error fields
- ✓ Loading states clearly visible
- ✓ Icon + text for clarity

---

## Animation & Transitions

- Tab switches: 200ms ease
- Modal appearance: 300ms spring
- Button press: 100ms scale feedback
- Loading spinner: continuous smooth rotation
- Success toast: slide in 200ms, auto-hide after 3s

---

## Empty States

```
No Pending Requests:
  Icon: 📦
  Title: "No Pending Requests"
  Message: "All external materials have been distributed"
  CTA: "Refresh" or back to dashboard

No Available Materials:
  Icon: ⚠️
  Title: "No Materials Available"
  Message: "This project has no external materials in inventory"
  CTA: "Check with Accountant"

No History:
  Icon: 📋
  Title: "No Transactions Yet"
  Message: "Material transactions will appear here"
```

---

## Error States

```
Insufficient Stock:
  Type: Alert
  Icon: ⚠️
  Title: "Cannot Fulfill Request"
  Message: "Material '[name]' has insufficient stock. 
           Required: 100 pcs, Available: 50 pcs
           (No partial issuance allowed)"
  Action: "Close" or "Cancel Request"

QR Verification Failed:
  Type: Alert
  Icon: ✗
  Title: "QR Verification Failed"
  Message: "QR code does not match assigned worker.
           Assigned: Vikram Singh (ID: 7)
           Scanned: Amit Kumar (ID: 5)"
  Action: "Retry" or "Cancel"

API Error:
  Type: Toast
  Message: "Failed to load requests. Please try again."
  Auto-dismiss: 5 seconds
  Action: "Retry" button
```

---

## Loading States

```
Fetching Data:
  - Skeleton loaders for list items
  - Spinner in center for modals
  - "Loading..." text with spinner
  - Disabled interaction during load

Submitting Form:
  - Button shows spinner + "Submitting..."
  - Form inputs disabled
  - Cancel option available
```

---

## Success States

```
Request Created:
  Toast: "✓ Request submitted successfully"
  Details: "REQ-001 created. Notifying Store Incharge..."
  Auto-close: 3 seconds
  Navigation: Back to project details

Request Fulfilled:
  Toast: "✓ Materials issued successfully"
  Details: "Transaction TRANS-001 recorded"
  Auto-close: 3 seconds
  Refresh: Pending list updated
```
