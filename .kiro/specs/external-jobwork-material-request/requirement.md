# Feature Enhancement: External Job Work Material Request & Outstock Workflow

## Objective

Extend the existing External Job Work module by introducing a new **External Job Work Material** request section within Project Details → External Job Work page. This enables Project Managers to request project-specific materials from the external job work inventory while allowing Store Incharge to issue those materials using the existing QR verification and inventory workflow.

## Current System Context

### Existing Modules
- **External Job Work Notification**: NPD creates notifications → Accountant creates challan → Store Incharge receives materials
- **External Job Work Inventory**: Store Incharge views project-specific materials from received external job work
- **Normal Outstock Module**: Project Manager requests materials → Worker collects from store → QR verification → Inventory deducted
- **Project Details Screen**: Displays project information, allows PM to view/manage project data

### Key Constraint
**No Partial Fulfillment**: Unlike the normal outstock which allows partial issuance, this workflow must enforce full-request-only policy. Either the entire request is fulfilled or it remains pending.

---

## Feature Scope

### 1. Project Manager Dashboard - External Job Work Material Section

#### Location
Inside existing screen:
```
Project Details → External Job Work → [NEW] External Job Work Material Section
```

#### Sub-Sections

##### A. Material Listing
Display project-specific external job work materials with:
- Material Name
- Material Code (if available)
- Available Quantity (from external inventory for this project)
- Unit
- Batch/Lot Number (if applicable)

**Source**: External Job Work Inventory (materials already allocated for this project)

##### B. Worker Selection
- Display: Active workers currently assigned to the project
- Requirement: **Mandatory** - Worker must be selected before submitting request
- Fetch from: `project_workers` via `/projects/:projectId/workers` endpoint
- Display fields: Worker Name, Worker ID

##### C. Material Request Form
Allow Project Manager to:
1. Select one or multiple available materials (checkboxes)
2. Specify required quantities for each selected material
3. Select the worker who will collect materials
4. Add optional notes/remarks
5. Submit request

**Validation**:
- At least one material must be selected
- Quantity must be > 0 and ≤ available quantity
- Worker must be selected
- All fields must be filled before submission

##### D. Request Submission
- POST to new endpoint: `/external-jobwork-materials/request`
- Create record in new table: `external_jobwork_outstock_requests`
- Immediately notify Store Incharge about new request

---

### 2. Store Incharge Dashboard - External Job Work Outstock

#### New Menu Section
Add to Store Incharge Dashboard:
```
External Job Work Outstock (📦 icon)
```

#### Display Structure

##### Pending Requests Tab
Show all incoming requests with:
- **Project Name** (from projects table)
- **Project ID**
- **Requested By** (Project Manager name)
- **Assigned Worker** (Worker name who will collect)
- **Request Date & Time**
- **Status Badge** (Pending / Fulfilled / Cancelled)
- **Expand Button** to see material details

##### Request Details (Expandable)
When expanded, show:
- **Requested Materials** (list):
  - Material Name
  - Requested Quantity
  - Available Quantity
  - Unit
- **Request Notes** (if any)
- **Action Buttons**:
  - "View Request Details" → Opens fulfillment modal
  - "Cancel Request" → Soft delete (if not started)

#### Fulfillment Process
1. Store Incharge clicks "View Request Details"
2. System verifies full quantity is available for ALL requested materials
3. If **NO** → Show warning: "Insufficient stock for [material name]. Cannot fulfill this request. (No partial issuance allowed)"
4. If **YES** → Proceed to QR verification

##### QR Verification (Reuse Existing Logic)
- Scan worker's QR code
- Verify worker identity matches assigned worker
- Display confirmation screen with material details
- Confirm handover

#### Fulfillment Completion
1. Deduct quantities from external job work inventory
2. Create transaction record in: `external_jobwork_outstock_transactions`
3. Update request status to "Fulfilled"
4. Record:
   - Issued By (Store Incharge user ID)
   - Received By (Worker user ID)
   - Project ID
   - Material Details & Quantities
   - Date & Time
   - QR Verification Status

---

### 3. Data Model & Database Tables

#### New Tables

##### `external_jobwork_outstock_requests`
```sql
CREATE TABLE external_jobwork_outstock_requests (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  worker_id INTEGER NOT NULL REFERENCES users(id),
  requested_by INTEGER NOT NULL REFERENCES users(id),  -- Project Manager
  company_id INTEGER NOT NULL REFERENCES companies(id),
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  request_notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, fulfilled, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_request ON external_jobwork_outstock_requests(project_id);
CREATE INDEX idx_worker_request ON external_jobwork_outstock_requests(worker_id);
CREATE INDEX idx_status_request ON external_jobwork_outstock_requests(status);
```

##### `external_jobwork_outstock_request_items`
```sql
CREATE TABLE external_jobwork_outstock_request_items (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES external_jobwork_outstock_requests(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL,  -- Reference to external job work material/inventory
  material_name VARCHAR(255) NOT NULL,
  requested_quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_request_items ON external_jobwork_outstock_request_items(request_id);
```

##### `external_jobwork_outstock_transactions`
```sql
CREATE TABLE external_jobwork_outstock_transactions (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES external_jobwork_outstock_requests(id),
  project_id INTEGER NOT NULL REFERENCES projects(id),
  worker_id INTEGER NOT NULL REFERENCES users(id),
  issued_by INTEGER NOT NULL REFERENCES users(id),  -- Store Incharge
  company_id INTEGER NOT NULL REFERENCES companies(id),
  fulfillment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  qr_verification_status VARCHAR(50),  -- verified, failed
  qr_scan_time TIMESTAMP,
  transaction_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_project ON external_jobwork_outstock_transactions(project_id);
CREATE INDEX idx_transaction_worker ON external_jobwork_outstock_transactions(worker_id);
CREATE INDEX idx_transaction_issued_by ON external_jobwork_outstock_transactions(issued_by);
```

##### `external_jobwork_outstock_transaction_items`
```sql
CREATE TABLE external_jobwork_outstock_transaction_items (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES external_jobwork_outstock_transactions(id) ON DELETE CASCADE,
  material_name VARCHAR(255) NOT NULL,
  issued_quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_items ON external_jobwork_outstock_transaction_items(transaction_id);
```

---

## Backend Endpoints

### External Job Work Material Request Endpoints

#### 1. Create Material Request
```
POST /external-jobwork-materials/request
Body: {
  project_id: number,
  worker_id: number,
  requested_by: number (Project Manager ID),
  company_id: number,
  request_notes?: string,
  items: [
    {
      material_name: string,
      requested_quantity: number,
      unit: string
    }
  ]
}
Response: { 
  requestId: number,
  status: 'success' | 'error',
  message: string
}
```

#### 2. Get Pending External Job Work Requests
```
GET /external-jobwork-materials/requests/pending?company_id=:companyId
Query Parameters:
  - company_id: number (Store Incharge company)
Response: {
  requests: [
    {
      id: number,
      project_id: number,
      project_name: string,
      worker_id: number,
      worker_name: string,
      requested_by: number,
      requested_by_name: string,
      request_date: timestamp,
      status: string,
      items: [
        {
          material_name: string,
          requested_quantity: number,
          available_quantity: number,
          unit: string
        }
      ]
    }
  ]
}
```

#### 3. Get Request Details
```
GET /external-jobwork-materials/requests/:requestId
Response: {
  request: {
    id: number,
    project_id: number,
    project_name: string,
    worker_id: number,
    worker_name: string,
    requested_by: number,
    requested_by_name: string,
    request_date: timestamp,
    status: string,
    request_notes: string,
    items: [...]
  }
}
```

#### 4. Verify & Fulfill Request (with QR)
```
POST /external-jobwork-materials/requests/:requestId/fulfill
Body: {
  issued_by: number (Store Incharge ID),
  qr_code: string (scanned QR),
  qr_verification_status: string,
  transaction_notes?: string
}
Response: {
  transactionId: number,
  status: 'success' | 'error',
  message: string
}
```

#### 5. Get External Job Work Outstock History
```
GET /external-jobwork-materials/history?company_id=:companyId
Query Parameters:
  - company_id: number
  - project_id?: number (optional filter)
  - worker_id?: number (optional filter)
Response: {
  transactions: [
    {
      id: number,
      request_id: number,
      project_id: number,
      project_name: string,
      worker_id: number,
      worker_name: string,
      issued_by: number,
      issued_by_name: string,
      fulfillment_date: timestamp,
      qr_verification_status: string,
      items: [...]
    }
  ]
}
```

#### 6. Get Project's External Job Work Materials (for dropdown in request form)
```
GET /external-jobwork-materials/project/:projectId/available
Response: {
  materials: [
    {
      id: number,
      project_id: number,
      material_name: string,
      available_quantity: number,
      received_quantity: number,
      unit: string,
      batch_lot_number?: string
    }
  ]
}
```

---

## Frontend Screens

### 1. ExternalJobworkMaterialRequestScreen
**Location**: Project Details → External Job Work → External Job Work Material

**Features**:
- Tab: "View Available Materials" (read-only list)
- Tab: "Create Request" (form)

**Create Request Form**:
- Material selection with quantity input
- Worker dropdown (fetched from project workers)
- Notes textarea
- Submit button

**Reusable Components**:
- Material selector component (checkboxes with quantities)
- Worker selector component (dropdown)
- Confirmation dialog

### 2. ExternalJobworkOutstockScreen
**Location**: Store Incharge Dashboard → External Job Work Outstock

**Features**:
- Tabs: "Pending" | "Fulfilled" | "History"
- Request cards with expandable details
- Fulfillment action button
- QR scanner integration

**Reuse**:
- Existing QR verification workflow from Normal Outstock
- Existing notification logic

### 3. ExternalJobworkOutstockHistoryScreen
**Location**: External Job Work Outstock → History Tab

**Features**:
- Transaction list with filters
- Search by project name / worker name
- Date range filter
- Transaction details modal

---

## Integration Points

### Existing Code Reuse
1. **QR Verification**: Reuse logic from `OrderReceiptScreen.js` and Outstock
2. **Worker Selection**: Reuse from `ProjectDetailsScreen.js` (already has worker management)
3. **Material Display**: Reuse styles from `ExternalJobworkInventoryScreen.js`
4. **Notification System**: Reuse existing notification creation logic
5. **API Config**: Extend `projectsAPI` in `src/config/api.js`

### Role-Based Access Control
- **Project Manager**: Can only create material requests (access to request form)
- **Store Incharge**: Can only fulfill requests (access to outstock module)
- **NPD**: No access to this workflow (read-only for reference if needed)

### Audit & Logging
- Log all request creations
- Log all fulfillments with QR verification details
- Maintain complete transaction history

---

## Business Rules

### Request Rules
1. Only active workers assigned to the project can be selected
2. Only materials in project's external job work inventory can be requested
3. Requested quantity must not exceed available quantity
4. Request cannot be edited after submission (must be cancelled and recreated)

### Fulfillment Rules
1. **NO PARTIAL FULFILLMENT**: All materials must be available in requested quantities
2. If any material is insufficient, entire request remains pending
3. QR verification is mandatory
4. Worker must match assigned worker in request
5. Fulfillment is one-time operation; no revisions after completion

### Cancellation Rules
1. Only pending requests can be cancelled
2. Cancellation must be logged
3. Fulfilled/Cancelled requests are immutable

---

## UI/UX Requirements

### Design Language
- Maintain existing ERP design (purple #5856D6 primary color)
- Use consistent spacing & typography
- Follow existing component patterns

### Components
- Responsive layouts (mobile-first)
- Modern cards with shadows
- Badges for status indicators
- Loading states with spinners
- Empty states with icons
- Success/Error notifications
- Confirmation dialogs before destructive actions

### User Experience
- Inline validation with error messages
- Loading indicators for async operations
- Success toasts after submission
- Intuitive navigation
- Clear CTA buttons

---

## Implementation Constraints

### Technical
1. Do NOT modify existing External Job Work module
2. Do NOT modify existing Outstock module
3. Reuse QR verification without changes
4. Reuse notification system without changes
5. Enforce full-request-only (no partial issuance)

### Security
1. All endpoints require `authenticateToken` middleware
2. Verify user's company_id in all operations
3. Verify role-based access (PM for requests, SI for fulfillment)
4. Log all transactions for audit trail

### Performance
1. Index frequently queried fields (project_id, status, worker_id)
2. Use efficient joins in listing endpoints
3. Pagination for history with large datasets (if needed)

---

## Success Criteria

- ✅ PM can create material requests for external job work projects
- ✅ PM can select active workers assigned to project
- ✅ PM can request materials from project's external inventory
- ✅ Store Incharge sees pending requests in dashboard
- ✅ Store Incharge can fulfill requests (full quantity only)
- ✅ System prevents partial fulfillment
- ✅ QR verification workflow works correctly
- ✅ Inventory is properly deducted after fulfillment
- ✅ Complete audit trail maintained
- ✅ UI is clean, responsive, and user-friendly
- ✅ No modifications to existing modules
- ✅ Role-based access control enforced
- ✅ All validations work correctly

---

## Workflow Summary

```
PROJECT MANAGER
├─ Views project external job work materials
├─ Selects materials & quantities
├─ Selects assigned worker
├─ Submits request
│
↓ REQUEST CREATED → Notification to Store Incharge
│
STORE INCHARGE
├─ Views pending request in dashboard
├─ Checks available quantities
├─ If PARTIAL AVAILABLE → Cannot fulfill (shows warning)
├─ If FULL AVAILABLE → Proceeds to QR verification
├─ Scans worker QR code
├─ Confirms handover
│
↓ FULFILLMENT COMPLETED
├─ Inventory deducted from external job work stock
├─ Transaction logged
├─ Request marked as Fulfilled
└─ Report generated in history
```
