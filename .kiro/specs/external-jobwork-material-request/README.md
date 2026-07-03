# External Job Work Material Request & Outstock Workflow - Specification

## 📋 Overview

This specification defines a new **External Job Work Material Request & Outstock** workflow that extends the existing External Job Work module. The feature enables Project Managers to request project-specific materials from the external job work inventory, while Store Incharge personnel fulfill those requests using QR verification.

**Key Differentiator**: Unlike the normal outstock module that allows partial fulfillment, this workflow enforces **full-request-only** fulfillment—either all materials are issued or the request remains pending.

---

## 📚 Documents in This Spec

### 1. **requirement.md** (Main Specification)
Complete functional and technical requirements including:
- Objective and scope
- Detailed feature description
- Data model and database schema
- All backend API endpoints
- Frontend screens and components
- Business rules and constraints
- Success criteria

**Start here for understanding what needs to be built.**

### 2. **tasks.md** (Implementation Breakdown)
Detailed task breakdown organized by phase:
- **Phase 1**: Database & Backend Foundation (3 tasks)
- **Phase 2**: Frontend - Project Manager Interface (2 tasks)
- **Phase 3**: Frontend - Store Incharge Interface (3 tasks)
- **Phase 4**: API Configuration (1 task)
- **Phase 5**: Testing & Validation (3 tasks)
- **Phase 6**: Documentation & Deployment (3 tasks)
- **Phase 7**: Git & Handoff (1 task)

**Estimated total effort**: ~17-18 hours

**Use this to track progress and manage implementation.**

### 3. **DESIGN_REFERENCE.md** (UI/UX Guidelines)
Visual and design guidance including:
- Screen layout wireframes
- Color palette and styling
- Component reuse guidelines
- Responsive breakpoints
- Accessibility standards
- Animation & transitions
- Empty/Error/Loading states

**Reference this when building UI components.**

---

## 🎯 Key Features

### For Project Managers
- ✅ View project's external job work materials (in inventory)
- ✅ Create material requests with quantities
- ✅ Select worker to collect materials
- ✅ Track request status

### For Store Incharge
- ✅ View pending material requests
- ✅ Verify stock availability (full quantity required)
- ✅ Use QR verification for worker identity
- ✅ Issue materials (full request only, no partial)
- ✅ View fulfillment history with audit trail

### System Features
- ✅ Role-based access control
- ✅ Automatic inventory deduction
- ✅ Complete audit logging
- ✅ Full-request-only enforcement
- ✅ Real-time notifications

---

## 🏗️ Architecture Overview

### Database Layer
```
New Tables:
├── external_jobwork_outstock_requests
├── external_jobwork_outstock_request_items
├── external_jobwork_outstock_transactions
└── external_jobwork_outstock_transaction_items
```

### Backend Layer
```
New Endpoints (7):
├── POST   /external-jobwork-materials/request
├── GET    /external-jobwork-materials/requests/pending
├── GET    /external-jobwork-materials/requests/:id
├── GET    /external-jobwork-materials/project/:projectId/available
├── POST   /external-jobwork-materials/requests/:id/fulfill
├── GET    /external-jobwork-materials/history
└── PUT    /external-jobwork-materials/requests/:id/cancel
```

### Frontend Layer
```
New Screens:
├── ExternalJobworkMaterialRequestScreen (PM interface)
└── ExternalJobworkOutstockScreen (SI interface)

New Integrations:
├── ProjectDetailsScreen (add material request section)
└── StoreInchargeDashboard (add outstock menu)
```

---

## 🔄 Complete Workflow

```
┌─────────────────────────────────────────────────────────┐
│ PROJECT MANAGER                                          │
├─────────────────────────────────────────────────────────┤
│ 1. Navigate to Project Details → External Job Work       │
│ 2. Click "External Job Work Material" section            │
│ 3. View available materials for the project              │
│ 4. Select materials and quantities to request            │
│ 5. Select the worker who will collect materials          │
│ 6. Add optional notes                                    │
│ 7. Submit request                                        │
│                                                          │
│ ↓ REQUEST CREATED & NOTIFICATION SENT TO STORE INCHARGE  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ STORE INCHARGE                                           │
├─────────────────────────────────────────────────────────┤
│ 1. Open dashboard → External Job Work Outstock           │
│ 2. View pending requests                                 │
│ 3. Select a request to fulfill                           │
│ 4. System verifies FULL quantity available for ALL items │
│    ├─ If INSUFFICIENT → Show warning, cannot fulfill     │
│    └─ If SUFFICIENT → Proceed to QR verification         │
│ 5. Scan worker's QR code                                 │
│ 6. Verify worker identity matches assigned worker        │
│ 7. Confirm material handover                             │
│ 8. System deducts inventory from external job work stock │
│ 9. Transaction recorded and request marked fulfilled     │
│                                                          │
│ ↓ FULFILLMENT COMPLETE                                   │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ RESULTS                                                  │
├─────────────────────────────────────────────────────────┤
│ ✓ Materials issued to worker                             │
│ ✓ Inventory deducted from external job work storage      │
│ ✓ Transaction logged with complete audit trail           │
│ ✓ Request status updated to "Fulfilled"                  │
│ ✓ History maintained for reporting                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🚫 Critical Business Rule

### No Partial Fulfillment
- **Rule**: All requested materials must be available in requested quantities
- **Consequence**: If ANY material is insufficient, the request CANNOT be fulfilled
- **User Experience**: Clear warning message explaining the issue and available options
- **Enforcement**: Frontend and backend validation
- **Alternative**: Store Incharge can restock materials or cancel request

**Example Scenario**:
```
Request Items:
  ✓ Steel Plate - 50 pcs (Available: 60 pcs) → OK
  ✗ Bolt M10 - 100 pcs (Available: 80 pcs) → INSUFFICIENT

Result: REQUEST CANNOT BE FULFILLED
Message: "Cannot fulfill this request. Material 'Bolt M10' 
          has insufficient stock (Required: 100 pcs, Available: 80 pcs).
          No partial issuance allowed."
```

---

## 🔐 Security & Authorization

### Role-Based Access
```
Project Manager:
  ✓ Create material requests
  ✓ View own project requests
  ✗ Cannot fulfill requests
  ✗ Cannot view other PM's requests

Store Incharge:
  ✓ View all pending requests
  ✓ Fulfill requests (with QR verification)
  ✓ View transaction history
  ✗ Cannot create requests
  ✗ Cannot modify PM's requests

NPD:
  ✗ No access to this workflow
```

### Middleware Requirements
- All endpoints require `authenticateToken` middleware
- All operations verify user's `company_id`
- Role-based checks before sensitive operations
- Audit logging for all transactions

---

## 📊 Data Flow

### Request Creation
```
PM Form Submission
  ↓
Backend Validation (quantities, worker, materials)
  ↓
Create Record in external_jobwork_outstock_requests
  ↓
Create Item Records in external_jobwork_outstock_request_items
  ↓
Send Notification to Store Incharge
  ↓
Return Success Response to PM
```

### Request Fulfillment
```
Store Incharge Opens Request
  ↓
System Fetches Request & Items
  ↓
Check Stock for ALL Items
  ↓
If Insufficient → Show Warning, Block Fulfillment
  ↓
If Sufficient → Show "Proceed to QR" Button
  ↓
QR Verification Flow
  ├─ Scan Worker QR
  ├─ Verify Worker ID Matches
  └─ Get Verification Confirmation
  ↓
Create Transaction Record
  ↓
Create Transaction Item Records
  ↓
Deduct Inventory from external_jobwork_inventory table
  ↓
Update Request Status to "Fulfilled"
  ↓
Return Success Response
```

---

## 🧪 Testing Strategy

### Unit Testing (Backend)
- [ ] API endpoint input validation
- [ ] Stock availability check logic
- [ ] Full-request-only enforcement
- [ ] Inventory deduction calculations
- [ ] Transaction record creation

### Integration Testing (End-to-End)
- [ ] Complete PM workflow
- [ ] Complete SI workflow
- [ ] Stock verification prevents partial issuance
- [ ] Inventory properly updated
- [ ] QR verification integration

### UI Testing (Frontend)
- [ ] Responsive design across devices
- [ ] Form validation messages
- [ ] Loading/error states
- [ ] Modal interactions
- [ ] Navigation flows

---

## 📈 Implementation Phases

| Phase | Tasks | Duration | Status |
|-------|-------|----------|--------|
| 1 | Database & Backend APIs | ~3 hrs | ⬜ |
| 2 | PM Frontend Interface | ~2.5 hrs | ⬜ |
| 3 | SI Frontend Interface | ~4.5 hrs | ⬜ |
| 4 | API Configuration | ~0.5 hrs | ⬜ |
| 5 | Testing & Validation | ~3.5 hrs | ⬜ |
| 6 | Documentation & Cleanup | ~1 hr | ⬜ |
| 7 | Git & Deployment | ~0.25 hrs | ⬜ |
| **TOTAL** | | **~17-18 hrs** | ⬜ |

---

## ✅ Success Criteria

- ✓ PM can create material requests for external job work projects
- ✓ PM can select active workers assigned to project
- ✓ PM can request materials from project's external inventory
- ✓ Store Incharge sees all pending requests in dashboard
- ✓ Store Incharge cannot fulfill requests with insufficient stock
- ✓ Full-request-only enforcement prevents partial issuance
- ✓ QR verification works correctly with worker matching
- ✓ Inventory is deducted correctly after fulfillment
- ✓ Complete audit trail maintained for all transactions
- ✓ UI is clean, responsive, and user-friendly
- ✓ No modifications made to existing modules
- ✓ Role-based access control properly enforced
- ✓ All validations work correctly
- ✓ Error handling is robust and user-friendly

---

## 🔗 Related Documentation

- `EXTERNAL-JOBWORK-MATERIAL-FEATURE-SUMMARY.md` - Previous feature documentation
- `APP-COMPLETE-FLOW.md` - Overall application workflow
- `COMPANY-HIERARCHY-GUIDE.md` - User roles and permissions
- Database: `backend/database/projects-schema.sql`

---

## 📞 Notes & Questions

### Design Decisions

1. **Why Full-Request-Only?**
   - External job work is typically project-specific and time-sensitive
   - Partial fulfillment could lead to project delays
   - Ensures accountability and clarity on what was issued

2. **Why Separate from Normal Outstock?**
   - Different source inventory (external job work vs. in-stock)
   - Different business logic (no partial)
   - Separate audit trail and tracking

3. **Why Extend Project Details?**
   - PM already has context of the project
   - Minimizes navigation
   - Keeps all project operations in one place

---

## 📝 Implementation Checklist

- [ ] Review this specification thoroughly
- [ ] Understand all requirements and constraints
- [ ] Review related code (ProjectDetailsScreen, OrderReceiptScreen, etc.)
- [ ] Start with Phase 1 (Database)
- [ ] Follow task breakdown in sequential order
- [ ] Test each phase before moving to next
- [ ] Document any deviations from spec
- [ ] Get code review before final commit
- [ ] Create commit with clear message
- [ ] Push to GitHub

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 02-Jul-2026 | Kiro | Initial specification |

---

**Status**: 🟢 Ready for Implementation

**Next Step**: Start with Phase 1 - Create database tables
