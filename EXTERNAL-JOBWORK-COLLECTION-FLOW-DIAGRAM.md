# External Job Work Material Collection - Flow Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL JOB WORK MATERIAL COLLECTION FLOW                 │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
                           STEP 1: PROJECT SETUP
═══════════════════════════════════════════════════════════════════════════════

    PROJECT MANAGER
         │
         ├─→ Open Project Details (External Job Work)
         │
         ├─→ Access "Request External Materials" Option
         │
         ├─→ View Available Inventory (from Store Incharge)
         │
         ├─→ Select Materials Needed
         │
         ├─→ Choose Worker to Collect
         │
         └─→ Create Material Request
              │
              └─→ [Database: external_jobwork_outstock_requests]
                 └─→ [Notification sent to Store Incharge]


═══════════════════════════════════════════════════════════════════════════════
                      STEP 2: STORE INCHARGE PREPARATION
═══════════════════════════════════════════════════════════════════════════════

    STORE INCHARGE
         │
         ├─→ Open External Job Work Outstock Screen
         │
         ├─→ View Pending Material Requests (Tab 1)
         │
         ├─→ Select Request to Fulfill
         │
         ├─→ Expand Request Details
         │   └─→ See requested materials
         │   └─→ Verify stock availability
         │   └─→ Check special notes
         │
         ├─→ Tap "Generate QR Code" Button
         │
         └─→ QR Modal Opens
              │
              ├─→ QR Code Generated with Payload:
              │   {
              │     "type": "external_material_request",
              │     "request_id": 1,
              │     "project_id": 5,
              │     "worker_id": 20,
              │     "materials_count": 3,
              │     "timestamp": "2026-07-03T10:30:00Z"
              │   }
              │
              └─→ Manual Code Available: "REQ-1"


═══════════════════════════════════════════════════════════════════════════════
                       STEP 3: WORKER COLLECTION
═══════════════════════════════════════════════════════════════════════════════

    WORKER
         │
         ├─→ Open Worker Dashboard
         │
         ├─→ Tap "📦 Collect External Materials" Quick Action
         │
         ├─→ View Pending Material Requests
         │   └─→ Grouped by project
         │   └─→ Shows items to collect
         │   └─→ Displays any notes
         │
         ├─→ Select Request
         │
         ├─→ Tap "📷 Scan QR Code to Collect"
         │
         ├─→ QR Scanner Opens
         │
         └─→ SCAN or MANUAL ENTRY
              │
              ├─ CAMERA SCAN:
              │   ├─→ Point camera at QR code
              │   ├─→ QR detected automatically
              │   └─→ Payload parsed
              │
              └─ MANUAL ENTRY:
                   ├─→ Can't access camera?
                   ├─→ Type manual code "REQ-1"
                   └─→ Tap "Collect Materials"


═══════════════════════════════════════════════════════════════════════════════
                      STEP 4: BACKEND PROCESSING
═══════════════════════════════════════════════════════════════════════════════

    BACKEND (POST /requests/:requestId/collect)
         │
         ├─→ Validate Request ID
         │   ├─→ Handle "REQ-" prefix
         │   └─→ Convert to numeric
         │
         ├─→ Verify Request Exists
         │   └─→ Status = 'pending'
         │
         ├─→ Verify Worker Access
         │   └─→ Worker ID matches
         │
         ├─→ Create Collection Record
         │   ├─→ [external_material_collections]
         │   ├─→ INSERT: request_id, collected_by, timestamp
         │   └─→ Return: collection_id
         │
         ├─→ Update Request Status
         │   └─→ SET status = 'collected'
         │
         ├─→ Send Notification
         │   └─→ Store Incharge notified
         │
         └─→ Return Success Response
              {
                "status": "success",
                "message": "Materials collected successfully",
                "collectionId": 42
              }


═══════════════════════════════════════════════════════════════════════════════
                    STEP 5: WORKER SUCCESS CONFIRMATION
═══════════════════════════════════════════════════════════════════════════════

    WORKER'S PHONE
         │
         ├─→ Success Modal Appears
         │   ├─→ ✅ Large Green Checkmark
         │   ├─→ "Order Picked!" Title (Green Text)
         │   ├─→ Collection Success Message
         │   ├─→ Collection ID: 42
         │   └─→ Details Section:
         │       ├─→ "Materials have been collected by worker"
         │       └─→ "Store Incharge will be notified"
         │
         ├─→ Modal Visible for 3 Seconds
         │
         ├─→ Auto-Close (or tap to close)
         │
         ├─→ Pending Requests List Refreshed
         │
         └─→ Ready for Next Collection


═══════════════════════════════════════════════════════════════════════════════
                  STEP 6: STORE INCHARGE REAL-TIME VIEW
═══════════════════════════════════════════════════════════════════════════════

    STORE INCHARGE'S SCREEN
         │
         ├─→ See Real-Time Updates (Every 5 Seconds)
         │
         ├─→ Switch to "📦 Collected" Tab (Tab 3)
         │
         ├─→ Collections Now Visible!
         │   │
         │   └─→ Collection Card Shows:
         │       ├─→ ✓ Collection Records
         │       ├─→ Worker Name: "John Doe"
         │       ├─→ Status: "✓ Collected" (Green)
         │       ├─→ Timestamp: "July 3, 2026 10:35:30 AM"
         │       └─→ Collection ID: 42
         │
         ├─→ Collection Count Updated in Tab
         │   └─→ "📦 Collected (5)" ← increases dynamically
         │
         ├─→ No Manual Refresh Needed!
         │   └─→ Automatic polling every 5 seconds
         │
         └─→ Can Expand Multiple Collections
              └─→ See all workers' pickups


═══════════════════════════════════════════════════════════════════════════════
                          DATABASE RELATIONSHIPS
═══════════════════════════════════════════════════════════════════════════════

    external_jobwork_outstock_requests
    ├─ id (PK)
    ├─ project_id (FK) ──→ projects.id
    ├─ worker_id (FK) ──→ users.id (WORKER)
    ├─ requested_by (FK) ──→ users.id (PROJECT_MANAGER)
    ├─ company_id (FK) ──→ companies.id
    ├─ status: 'pending' → 'collected' → 'fulfilled'
    ├─ request_date
    └─ request_notes

           ↓
           │
           ├─→ external_jobwork_outstock_request_items
           │   ├─ id (PK)
           │   ├─ request_id (FK)
           │   ├─ material_name
           │   ├─ requested_quantity
           │   └─ unit
           │
           └─→ external_material_collections (NEW)
               ├─ id (PK) ← Returns as collectionId
               ├─ request_id (FK)
               ├─ collected_by (FK) ──→ users.id (WORKER)
               ├─ collection_timestamp
               └─ status: 'completed'


═══════════════════════════════════════════════════════════════════════════════
                            API CALL SEQUENCE
═══════════════════════════════════════════════════════════════════════════════

    WORKER CLIENT (React Native App)
         │
         1. getWorkerExternalMaterialRequests(worker_id)
         │  GET /external-jobwork-materials/worker/:workerId/requests
         │  ↓ Returns: [{ id, project_name, items, ... }]
         │
         2. [Displays pending requests]
         │
         3. [Scans QR code or enters manual code]
         │
         4. collectExternalMaterial(requestId, data)
         │  POST /external-jobwork-materials/requests/:requestId/collect
         │  Body: { collected_by: worker_id, collection_timestamp }
         │  ↓ Returns: { collectionId, status: "success" }
         │
         5. [Shows success modal with collectionId]
         │
         └─ [Refreshes pending requests]


    STORE INCHARGE CLIENT (React Native App)
         │
         1. getPendingExternalRequests()
         │  GET /external-jobwork-materials/requests/pending
         │  ↓ Returns: [{ id, project_name, items, ... }]
         │
         2. [Display Pending tab]
         │
         3. Polling Loop (Every 5 seconds):
         │  │
         │  └─ For each request:
         │     getRequestCollections(request_id)
         │     GET /external-jobwork-materials/requests/:requestId/collections
         │     ↓ Returns: { collections: [{ id, worker_name, timestamp, ... }] }
         │
         4. [Update Collected tab with new records]
         │
         └─ [Continue polling...]


═══════════════════════════════════════════════════════════════════════════════
                         NOTIFICATION SYSTEM
═══════════════════════════════════════════════════════════════════════════════

    EVENT 1: Material Request Created
    ┌─────────────────────────────────────┐
    │ PM creates request                   │
    └─→ Notification inserted in DB        │
        │                                 │
        └─→ Store Incharge notified:       │
            "New External Job Work        │
             Material Request"            │
            Project: "Building A"         │
            Request ID: 1                 │

    EVENT 2: Material Collected
    ┌─────────────────────────────────────┐
    │ Worker scans QR & collects           │
    └─→ Notification inserted in DB        │
        │                                 │
        └─→ Store Incharge notified:       │
            "External Material           │
             Collected"                  │
            Request #: 1                 │
            Worker: John Doe             │
            Time: 10:35:30 AM           │


═══════════════════════════════════════════════════════════════════════════════
                          ERROR HANDLING FLOW
═══════════════════════════════════════════════════════════════════════════════

    WORKER SCANS QR CODE
         │
         ├─ Request Not Found (404)
         │  └─→ Alert: "Request not found or already completed"
         │
         ├─ Worker Mismatch (403)
         │  └─→ Alert: "Access denied: Worker mismatch"
         │  └─→ Can't collect request assigned to another worker
         │
         ├─ Invalid ID Format (400)
         │  └─→ Alert: "Invalid request ID format"
         │  └─→ Must be numeric or REQ-###
         │
         └─ Network Error (500)
             └─→ Alert: "Failed to collect materials"
                 └─→ Check backend server status


═══════════════════════════════════════════════════════════════════════════════
                        SECURITY VERIFICATION
═══════════════════════════════════════════════════════════════════════════════

    ✅ Authentication Required
       └─ All endpoints require valid JWT token

    ✅ Worker Verification
       └─ Worker can only collect assigned requests
       └─ Checked: request.worker_id === user.id

    ✅ Company Isolation
       └─ Store Incharge sees only company requests
       └─ PM can only create requests for assigned projects

    ✅ Data Validation
       └─ Request ID must be numeric or REQ- format
       └─ Collected_by must be valid user ID
       └─ Timestamp must be valid date


═══════════════════════════════════════════════════════════════════════════════
                          COMPLETE TIMELINE
═══════════════════════════════════════════════════════════════════════════════

    10:00 AM → PM creates material request for Worker A
               ↓
    10:05 AM → Store Incharge receives notification
               ↓
    10:10 AM → Store Incharge generates QR code
               ↓
    10:15 AM → Worker A scans QR code
               ↓
    10:15:05 → Worker A sees success modal "Order Picked!"
    AM         (Collection ID: 42)
               ↓
    10:15:30 → Store Incharge sees collection in real-time
    AM         (via 5-second polling)
               ↓
    10:20 AM → Worker A can collect another request
               ↓
    [Process repeats for each material request]


═══════════════════════════════════════════════════════════════════════════════
```

## Key Features Visualization

### Worker Experience
```
Worker Dashboard
    │
    ├─→ 📦 Collect External Materials
         │
         └─→ ExternalJobworkMaterialCollectionScreen
             │
             ├─ Pending Requests (by project)
             ├─ Instructions (4 steps)
             └─ For Each Request:
                  │
                  ├─ Material names & quantities
                  ├─ Scan QR Code button
                  │
                  └─ [SCAN] → Success Modal ✅
                       └─ Collection ID displayed
                       └─ Auto-close in 3 seconds
```

### Store Incharge Experience
```
External Job Work Outstock
    │
    ├─ Tab 1: ⏳ Pending (Initial)
    │   └─ Material requests to fulfill
    │
    ├─ Tab 2: ✅ Fulfilled
    │   └─ Completed requests
    │
    └─ Tab 3: 📦 Collected (NEW!)
         └─ Real-time worker pickups
            ├─ Worker name
            ├─ Timestamp
            ├─ Collection ID
            └─ Auto-refresh every 5 seconds
```

## Status Flow Diagram

```
REQUEST STATUS PROGRESSION

     PENDING
       ↓
   [Generate QR]
       ↓
   PENDING (waiting for worker)
       ↓
   [Worker Scans QR]
       ↓
   COLLECTED
       ↓
   [Store Incharge Verifies]
       ↓
   FULFILLED
```

---

**Created**: July 3, 2026
**Feature**: External Job Work Material Collection
**Status**: Complete & Production Ready
