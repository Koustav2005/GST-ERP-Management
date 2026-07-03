# External Job Work Material Request & Outstock Workflow - Implementation Tasks

## Phase 1: Database & Backend Foundation

### Task 1.1: Create Database Tables
- [x] Create `external_jobwork_outstock_requests` table with schema
- [ ] Create `external_jobwork_outstock_request_items` table
- [ ] Create `external_jobwork_outstock_transactions` table
- [ ] Create `external_jobwork_outstock_transaction_items` table
- [ ] Add indexes for frequently queried fields
- [ ] Create migration script for deployment

**Output Files**:
- `backend/create-external-jobwork-outstock-tables.js` (migration script)

**Verification**:
- [ ] All tables created in PostgreSQL
- [ ] Indexes present and working
- [ ] Schema matches requirements

---

### Task 1.2: Create Backend API Endpoints (Part 1 - Request Management)
- [ ] `POST /external-jobwork-materials/request` - Create new request
- [ ] `GET /external-jobwork-materials/requests/pending` - Get pending requests
- [ ] `GET /external-jobwork-materials/requests/:requestId` - Get request details
- [ ] `GET /external-jobwork-materials/project/:projectId/available` - Get project's available materials

**Requirements**:
- All endpoints require `authenticateToken` middleware
- Verify company_id and role-based access
- Input validation for all POST/PUT endpoints
- Proper error handling and logging

**Output Files**:
- `backend/routes/external-jobwork-materials.js` (update existing file to add endpoints)

**Verification**:
- [ ] All endpoints respond with correct status codes
- [ ] Proper error messages on validation failure
- [ ] Data returned matches schema

---

### Task 1.3: Create Backend API Endpoints (Part 2 - Fulfillment & History)
- [ ] `POST /external-jobwork-materials/requests/:requestId/fulfill` - Fulfill request with QR verification
- [ ] `GET /external-jobwork-materials/history` - Get fulfillment history
- [ ] `PUT /external-jobwork-materials/requests/:requestId/cancel` - Cancel pending request

**Requirements**:
- Implement full-request-only fulfillment logic (no partial issuance)
- Integrate with existing QR verification
- Update inventory after successful fulfillment
- Create transaction records

**Output Files**:
- Extend `backend/routes/external-jobwork-materials.js`

**Verification**:
- [ ] Fulfillment prevents partial quantities
- [ ] Inventory deducted correctly
- [ ] Transaction records created with all details
- [ ] QR verification logic works

---

## Phase 2: Frontend - Project Manager Interface

### Task 2.1: Create ExternalJobworkMaterialRequestScreen
- [ ] Create new screen file: `src/screens/ExternalJobworkMaterialRequestScreen.js`
- [ ] Implement two tabs: "Available Materials" (read-only) and "Create Request"
- [ ] Build material listing component:
  - [ ] Display available materials from external job work inventory
  - [ ] Show: Name, Code, Available Qty, Unit, Batch/Lot
  - [ ] Fetch from `/external-jobwork-materials/project/:projectId/available`
- [ ] Build request form with:
  - [ ] Material selection (checkboxes with quantity inputs)
  - [ ] Worker dropdown (fetch from `/projects/:projectId/workers`)
  - [ ] Notes textarea (optional)
  - [ ] Validation logic
  - [ ] Submit button

**Requirements**:
- Validate at least one material selected
- Validate quantities > 0 and ≤ available
- Validate worker selected
- Show loading states during data fetch
- Show error messages on failure
- Confirmation dialog before submission

**Output Files**:
- `src/screens/ExternalJobworkMaterialRequestScreen.js`

**Styling**:
- [ ] Use existing color scheme (#5856D6 primary)
- [ ] Responsive layout
- [ ] Material cards with shadows
- [ ] Status badges

**Verification**:
- [ ] Screen renders without errors
- [ ] Data fetches correctly
- [ ] Form validation works
- [ ] API call succeeds on submission

---

### Task 2.2: Integrate Request Screen into Project Details
- [ ] Update `src/screens/ProjectDetailsScreen.js`:
  - [ ] Add new section: "External Job Work Material"
  - [ ] Add navigation button to request screen
  - [ ] Pass project & user data to screen
  - [ ] Handle return/refresh from request screen
- [ ] Update `App.js`:
  - [ ] Register new route: "ExternalJobworkMaterialRequest"

**Verification**:
- [ ] New section visible in External Job Work tab
- [ ] Navigation works both directions
- [ ] Data persistence after request creation

---

## Phase 3: Frontend - Store Incharge Interface

### Task 3.1: Create ExternalJobworkOutstockScreen
- [ ] Create new screen: `src/screens/ExternalJobworkOutstockScreen.js`
- [ ] Implement three tabs: "Pending", "Fulfilled", "History"
- [ ] Pending tab:
  - [ ] Fetch from `/external-jobwork-materials/requests/pending?company_id=X`
  - [ ] Display request cards with:
    - Project Name, Project ID
    - Requested By (PM name)
    - Assigned Worker name
    - Request Date
    - Status badge
    - Expandable details
  - [ ] Expand to show items list
  - [ ] Action button: "View & Fulfill"
- [ ] Fulfilled tab:
  - [ ] Show completed requests
  - [ ] Display fulfillment date, issued by
- [ ] History tab:
  - [ ] Show transaction history from `/external-jobwork-materials/history`
  - [ ] Add filters: by project, worker, date range
  - [ ] Show transaction details

**Requirements**:
- Real-time fetching of pending requests
- Proper state management
- Loading & empty states
- Error handling

**Output Files**:
- `src/screens/ExternalJobworkOutstockScreen.js`

**Verification**:
- [ ] Screen renders without errors
- [ ] Tabs switch correctly
- [ ] Data fetches from API
- [ ] Expandable cards work

---

### Task 3.2: Create Fulfillment Modal & QR Integration
- [ ] Create fulfillment modal component:
  - [ ] Display request details (all items)
  - [ ] Check stock availability for all items
  - [ ] Show warning if any item insufficient (full-request-only rule)
  - [ ] If all available: "Proceed to QR Verification" button
- [ ] Integrate QR verification:
  - [ ] Scan worker QR code
  - [ ] Verify QR matches assigned worker
  - [ ] Show verification status
  - [ ] Confirmation screen with material details
- [ ] On successful fulfillment:
  - [ ] Call `/external-jobwork-materials/requests/:id/fulfill`
  - [ ] Show success message
  - [ ] Update UI (move request to fulfilled)
  - [ ] Refresh inventory view

**Requirements**:
- Reuse existing QR scanning logic (no modifications)
- Prevent partial issuance with clear messaging
- Complete audit trail

**Output Files**:
- Fulfillment logic in `ExternalJobworkOutstockScreen.js`
- Reuse QR scanner component

**Verification**:
- [ ] Fulfillment flow works end-to-end
- [ ] Partial fulfillment is prevented
- [ ] QR verification succeeds
- [ ] Inventory updates correctly

---

### Task 3.3: Integrate Outstock Screen into Store Incharge Dashboard
- [ ] Update `src/screens/dashboards/StoreInchargeDashboard.js`:
  - [ ] Add new menu item: "External Job Work Outstock" (📦 icon)
  - [ ] Link to ExternalJobworkOutstockScreen
- [ ] Update `App.js`:
  - [ ] Register new route: "ExternalJobworkOutstock"
- [ ] Add notification badge showing pending requests count

**Verification**:
- [ ] Menu item visible in Store Incharge dashboard
- [ ] Navigation works
- [ ] Badge shows correct count

---

## Phase 4: API Configuration & Integration

### Task 4.1: Update API Configuration File
- [ ] Update `src/config/api.js`:
  - [ ] Add new API methods:
    - `createExternalJobworkMaterialRequest()`
    - `getPendingExternalRequests()`
    - `getExternalRequestDetails()`
    - `fulfillExternalRequest()`
    - `getExternalJobworkHistory()`
    - `getProjectExternalMaterials()`
  - [ ] All methods should follow existing pattern
  - [ ] Include proper error handling

**Verification**:
- [ ] All methods callable without errors
- [ ] Correct API endpoints used
- [ ] Response parsing works

---

## Phase 5: Testing & Validation

### Task 5.1: Backend Testing
- [ ] Test all API endpoints with Postman/curl:
  - [ ] Create request (valid data)
  - [ ] Create request (missing fields)
  - [ ] Create request (invalid quantities)
  - [ ] Get pending requests
  - [ ] Fulfill request (all available)
  - [ ] Fulfill request (partial available - should fail)
  - [ ] Get history
- [ ] Test database transactions and rollbacks
- [ ] Test authorization/authentication on all endpoints

**Verification**:
- [ ] All endpoints work as expected
- [ ] Error messages clear and accurate
- [ ] Full-request-only logic enforced

---

### Task 5.2: Frontend Integration Testing
- [ ] Test Project Manager workflow:
  - [ ] PM creates material request
  - [ ] Request appears in Store Incharge pending list
- [ ] Test Store Incharge workflow:
  - [ ] SI sees pending request
  - [ ] SI attempts to fulfill with insufficient stock
  - [ ] SI fulfills with sufficient stock
  - [ ] QR verification succeeds
  - [ ] Inventory deducted
  - [ ] Transaction logged
- [ ] Test edge cases:
  - [ ] Request with multiple materials
  - [ ] Cancel pending request
  - [ ] Filter history by project/worker

**Verification**:
- [ ] Complete workflow functions end-to-end
- [ ] Data consistency across screens
- [ ] Inventory updates reflect in real-time

---

### Task 5.3: UI/UX Validation
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Loading states smooth and visible
- [ ] Error messages clear and helpful
- [ ] Success notifications show
- [ ] Confirmation dialogs work
- [ ] Navigation smooth and intuitive

**Verification**:
- [ ] UI looks professional
- [ ] All states properly handled
- [ ] No console errors

---

## Phase 6: Documentation & Deployment

### Task 6.1: Create Migration & Deployment Scripts
- [ ] Create: `backend/create-external-jobwork-outstock-tables.js`
- [ ] Document database changes
- [ ] Test migration on fresh database
- [ ] Create rollback script if needed

---

### Task 6.2: Update Feature Summary Documentation
- [ ] Update `EXTERNAL-JOBWORK-MATERIAL-FEATURE-SUMMARY.md`
- [ ] Document all new endpoints
- [ ] Document all new screens
- [ ] Document database schema

---

### Task 6.3: Code Review & Cleanup
- [ ] Code follows project conventions
- [ ] No console.log left behind (use proper logging)
- [ ] Proper error handling throughout
- [ ] Comments on complex logic
- [ ] No unused imports or variables

---

## Phase 7: Git & Handoff

### Task 7.1: Commit & Push
- [ ] Stage all changes
- [ ] Create meaningful commit message
- [ ] Push to GitHub
- [ ] Verify changes on GitHub

---

## Task Dependencies

```
1.1 (DB Tables)
  ↓
1.2, 1.3 (Backend APIs)
  ↓
2.1, 3.1 (Frontend Screens)
  ↓
2.2, 3.2, 3.3 (Integration)
  ↓
4.1 (API Config)
  ↓
5.1, 5.2, 5.3 (Testing)
  ↓
6.x (Documentation)
  ↓
7.x (Deployment)
```

---

## Estimated Effort

| Phase | Task | Effort |
|-------|------|--------|
| 1 | 1.1 | 30 min |
| 1 | 1.2 | 1.5 hrs |
| 1 | 1.3 | 1.5 hrs |
| 2 | 2.1 | 2 hrs |
| 2 | 2.2 | 30 min |
| 3 | 3.1 | 2 hrs |
| 3 | 3.2 | 2 hrs |
| 3 | 3.3 | 30 min |
| 4 | 4.1 | 30 min |
| 5 | 5.1 | 1 hr |
| 5 | 5.2 | 1.5 hrs |
| 5 | 5.3 | 1 hr |
| 6 | 6.1-6.3 | 1 hr |
| 7 | 7.1 | 15 min |
| **TOTAL** | | **~17-18 hrs** |

---

## Status Tracking

- [ ] Phase 1: Database & Backend
- [ ] Phase 2: Frontend - PM Interface
- [ ] Phase 3: Frontend - SI Interface
- [ ] Phase 4: API Configuration
- [ ] Phase 5: Testing & Validation
- [ ] Phase 6: Documentation
- [ ] Phase 7: Git & Deployment
