# External Job Work Material Flow - Complete Implementation

## Overview
This document describes the complete flow for managing external job work materials from notification to inventory tracking.

---

## User Roles & Responsibilities

| Role | Action | Trigger |
|------|--------|---------|
| **NPD** | Notifies accountant about incoming materials | When material is expected to arrive |
| **Accountant** | Creates challan for received materials | Upon receiving NPD notification |
| **Store Incharge** | Receives materials and logs them | When challan is received |

---

## Complete Material Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL JOB WORK MATERIAL FLOW               │
└─────────────────────────────────────────────────────────────────┘

1. NPD NOTIFIES ABOUT MATERIAL ARRIVAL
   ├─ Selects external job work project
   ├─ Enters material description
   ├─ Sets expected arrival date
   ├─ Adds material details (optional)
   └─ Submits notification
       │
       ▼
   BACKEND: POST /api/external-jobwork-materials/notify-material-arrival
   ├─ Creates notification record
   ├─ Sends notification to ALL ACCOUNTANTS in company
   └─ Stores in: external_jobwork_material_notifications table
       │
       ▼
   ACCOUNTANT RECEIVES NOTIFICATION
   ├─ Title: "Material Arrival Notification"
   ├─ Message: Material description + Expected arrival date
   ├─ Opens notification
   └─ Navigates to AccountantDashboard → External Job Work Materials

───────────────────────────────────────────────────────────────────

2. ACCOUNTANT CREATES CHALLAN
   ├─ Selects notification from pending list
   ├─ Enters material details:
   │  ├─ Material name/description
   │  ├─ Quantity
   │  ├─ Unit (kg, pcs, m, etc.)
   │  ├─ HSN code
   │  ├─ GST rate
   │  └─ Notes
   ├─ Selects store incharge responsible
   └─ Creates challan
       │
       ▼
   BACKEND: POST /api/external-jobwork-materials/create-challan
   ├─ Generates unique challan number (EJW-CHALLAN-{company}-{timestamp})
   ├─ Creates record in: external_jobwork_challans table
   ├─ Adds materials to: external_jobwork_inventory table (status: pending)
   ├─ Updates notification status to: 'challan_created'
   └─ Sends notification to STORE INCHARGE
       │
       ▼
   STORE INCHARGE RECEIVES NOTIFICATION
   ├─ Title: "External Job Work Material Challan Created"
   ├─ Message: Challan number + Material description
   ├─ Opens notification
   └─ Navigates to StoreInchargeDashboard → External Challans

───────────────────────────────────────────────────────────────────

3. STORE INCHARGE RECEIVES MATERIAL
   ├─ Selects challan from pending list
   ├─ Verifies material arrival
   ├─ Enters received quantities for each material
   │  ├─ Material name
   │  ├─ Received quantity
   │  ├─ Inspection notes (optional)
   │  └─ Damage/discrepancy notes
   └─ Marks as received
       │
       ▼
   BACKEND: POST /api/external-jobwork-materials/receive-challan/{challanId}
   ├─ Updates challan status to: 'received'
   ├─ Updates all materials status to: 'received'
   ├─ Records received quantities and timestamps
   ├─ Records received by: store incharge ID
   ├─ Stores in: external_jobwork_inventory table
   └─ Sends notification to ACCOUNTANT
       │
       ▼
   ACCOUNTANT RECEIVES NOTIFICATION
   ├─ Title: "External Job Work Material Received"
   ├─ Message: Challan number + Confirmation
   ├─ Can view challan details
   └─ Material logged to external inventory
```

---

## Database Schema

### 1. external_jobwork_material_notifications
Tracks when NPD notifies about incoming materials

```sql
id                      SERIAL PRIMARY KEY
job_work_id             INT (FK to job_work)
npd_user_id             INT (FK to users) - NPD who notified
accountant_id           INT (FK to users) - Accountant to notify
company_id              INT (FK to companies)
material_description    TEXT
expected_arrival_date   DATE
material_details        JSONB (optional extra info)
status                  VARCHAR(50) - pending / challan_created / received
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

**Status Flow**: pending → challan_created → received

### 2. external_jobwork_challans
Accounts create challans for received materials

```sql
id                      SERIAL PRIMARY KEY
notification_id         INT (FK to external_jobwork_material_notifications)
job_work_id             INT (FK to job_work)
company_id              INT (FK to companies)
accountant_id           INT (FK to users) - Who created challan
store_incharge_id       INT (FK to users) - Who should receive
challan_number          VARCHAR(100) UNIQUE - EJW-CHALLAN-{company}-{ts}
material_description    TEXT
quantity                DECIMAL(10,2)
unit                    VARCHAR(50)
expected_arrival_date   DATE
notes                   TEXT
challan_status          VARCHAR(50) - pending / received / partial
received_at             TIMESTAMP
received_by             INT (FK to users)
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

**Status Flow**: pending → received

### 3. external_jobwork_inventory
Separate inventory tracking for external job work materials

```sql
id                      SERIAL PRIMARY KEY
challan_id              INT (FK to external_jobwork_challans)
job_work_id             INT (FK to job_work)
company_id              INT (FK to companies)
material_name           VARCHAR(255)
quantity                DECIMAL(10,2) - Ordered quantity
unit                    VARCHAR(50)
hsn_code                VARCHAR(50)
gst_rate                DECIMAL(5,2)
received_quantity       DECIMAL(10,2) - Actual received
received_date           TIMESTAMP
received_by             INT (FK to users)
status                  VARCHAR(50) - pending / received / partial / returned
notes                   TEXT
created_at              TIMESTAMP
updated_at              TIMESTAMP
UNIQUE(challan_id, material_name)
```

---

## API Endpoints

### 1. NPD Notifies About Material Arrival
```
POST /api/external-jobwork-materials/notify-material-arrival

Request:
{
  "job_work_id": 5,
  "npd_user_id": 10,
  "company_id": 2,
  "material_description": "Steel plates for external job",
  "expected_arrival_date": "2026-07-05",
  "material_details": {
    "supplier": "ABC Industries",
    "estimated_cost": 50000,
    "po_number": "PO12345"
  }
}

Response:
{
  "message": "Material arrival notification sent to all accountants",
  "notifications": [
    {
      "id": 1,
      "job_work_id": 5,
      "npd_user_id": 10,
      "accountant_id": 15,
      "company_id": 2,
      "material_description": "Steel plates for external job",
      "status": "pending",
      "created_at": "2026-07-02T10:30:00Z"
    }
  ]
}
```

### 2. Accountant Creates Challan
```
POST /api/external-jobwork-materials/create-challan

Request:
{
  "notification_id": 1,
  "job_work_id": 5,
  "company_id": 2,
  "accountant_id": 15,
  "store_incharge_id": 20,
  "material_description": "Steel plates",
  "quantity": 100,
  "unit": "kg",
  "expected_arrival_date": "2026-07-05",
  "notes": "Material should arrive between 9 AM - 5 PM",
  "materials_list": [
    {
      "material_name": "Steel Plate Grade A",
      "quantity": 50,
      "unit": "kg",
      "hsn_code": "7208",
      "gst_rate": 5
    },
    {
      "material_name": "Steel Plate Grade B",
      "quantity": 50,
      "unit": "kg",
      "hsn_code": "7208",
      "gst_rate": 5
    }
  ]
}

Response:
{
  "message": "Challan created successfully",
  "challan": {
    "id": 1,
    "notification_id": 1,
    "job_work_id": 5,
    "company_id": 2,
    "accountant_id": 15,
    "store_incharge_id": 20,
    "challan_number": "EJW-CHALLAN-2-1719918600000",
    "material_description": "Steel plates",
    "quantity": 100,
    "unit": "kg",
    "challan_status": "pending",
    "created_at": "2026-07-02T10:35:00Z"
  },
  "notification": "Store incharge has been notified"
}
```

### 3. Store Incharge Receives Material
```
POST /api/external-jobwork-materials/receive-challan/1

Request:
{
  "store_incharge_id": 20,
  "received_materials": [
    {
      "material_name": "Steel Plate Grade A",
      "received_quantity": 50
    },
    {
      "material_name": "Steel Plate Grade B",
      "received_quantity": 48
    }
  ],
  "notes": "2 plates damaged during delivery"
}

Response:
{
  "message": "Materials received and logged to external job work inventory",
  "challan": {
    "id": 1,
    "challan_number": "EJW-CHALLAN-2-1719918600000",
    "challan_status": "received",
    "received_at": "2026-07-05T14:20:00Z",
    "received_by": 20
  }
}
```

### 4. Get Material Notifications for Accountant
```
GET /api/external-jobwork-materials/notifications/accountant/{accountantId}/{companyId}

Response:
[
  {
    "id": 1,
    "job_work_id": 5,
    "npd_user_id": 10,
    "npd_name": "Rahul Kumar",
    "material_description": "Steel plates for external job",
    "expected_arrival_date": "2026-07-05",
    "status": "pending",
    "challan_count": 0,
    "created_at": "2026-07-02T10:30:00Z"
  }
]
```

### 5. Get Challans for Store Incharge
```
GET /api/external-jobwork-materials/challans/store-incharge/{storeInchargeId}/{companyId}

Response:
[
  {
    "id": 1,
    "challan_number": "EJW-CHALLAN-2-1719918600000",
    "material_description": "Steel plates",
    "quantity": 100,
    "unit": "kg",
    "challan_status": "pending",
    "expected_arrival_date": "2026-07-05",
    "accountant_name": "Priya Sharma",
    "material_count": 2,
    "created_at": "2026-07-02T10:35:00Z"
  }
]
```

### 6. Get External Job Work Inventory
```
GET /api/external-jobwork-materials/inventory/{jobWorkId}/{companyId}

Response:
[
  {
    "id": 1,
    "challan_id": 1,
    "job_work_id": 5,
    "material_name": "Steel Plate Grade A",
    "quantity": 50,
    "unit": "kg",
    "received_quantity": 50,
    "received_date": "2026-07-05T14:20:00Z",
    "received_by_name": "Rajesh Singh",
    "status": "received",
    "challan_number": "EJW-CHALLAN-2-1719918600000",
    "challan_status": "received"
  }
]
```

### 7. Get Challan Details with Materials
```
GET /api/external-jobwork-materials/challan-details/{challanId}

Response:
{
  "challan": {
    "id": 1,
    "challan_number": "EJW-CHALLAN-2-1719918600000",
    "material_description": "Steel plates",
    "quantity": 100,
    "unit": "kg",
    "challan_status": "received",
    "accountant_name": "Priya Sharma",
    "store_incharge_name": "Rajesh Singh",
    "received_at": "2026-07-05T14:20:00Z"
  },
  "materials": [
    {
      "id": 1,
      "material_name": "Steel Plate Grade A",
      "quantity": 50,
      "unit": "kg",
      "received_quantity": 50,
      "status": "received",
      "created_at": "2026-07-02T10:35:00Z"
    }
  ]
}
```

---

## Frontend Implementation

### 1. NPD Screen - Notify About Material
```javascript
// src/screens/ExternalJobworkMaterialNotificationScreen.js

const handleNotifyMaterial = async () => {
  const payload = {
    job_work_id: selectedJobWork.id,
    npd_user_id: user.id,
    company_id: user.company_id,
    material_description: description,
    expected_arrival_date: arrivalDate,
    material_details: {
      supplier: supplierName,
      po_number: poNumber
    }
  };

  await api.post(
    '/external-jobwork-materials/notify-material-arrival',
    payload
  );
};
```

### 2. Accountant Screen - Create Challan
```javascript
// src/screens/ExternalJobworkChallanScreen.js

const handleCreateChallan = async () => {
  const payload = {
    notification_id: selectedNotification.id,
    job_work_id: selectedNotification.job_work_id,
    company_id: user.company_id,
    accountant_id: user.id,
    store_incharge_id: selectedStoreIncharge.id,
    material_description: description,
    materials_list: materials,
    notes: notes
  };

  await api.post(
    '/external-jobwork-materials/create-challan',
    payload
  );
};
```

### 3. Store Incharge Screen - Receive Material
```javascript
// src/screens/ExternalJobworkReceiptScreen.js

const handleReceiveChallan = async () => {
  const payload = {
    store_incharge_id: user.id,
    received_materials: materials.map(m => ({
      material_name: m.material_name,
      received_quantity: m.received_quantity
    })),
    notes: inspectionNotes
  };

  await api.post(
    `/external-jobwork-materials/receive-challan/${challanId}`,
    payload
  );
};
```

---

## Key Features

✅ **Separate Inventory**: External job work materials tracked separately from main inventory  
✅ **Notification Chain**: NPD → Accountant → Store Incharge  
✅ **Challan System**: Unique challan generation and tracking  
✅ **Material Tracking**: GST rate, HSN code, quantity tracking  
✅ **Audit Trail**: All timestamps and user records maintained  
✅ **Quantity Reconciliation**: Track ordered vs received quantities  
✅ **Company Isolation**: Data isolated by company  

---

## Data Flow Summary

```
NPD Notifies
  ↓
(external_jobwork_material_notifications created)
  ↓
Accountant Gets Notification
  ↓
Accountant Creates Challan
  ↓
(external_jobwork_challans created)
(external_jobwork_inventory created with status: pending)
  ↓
Store Incharge Gets Notification
  ↓
Material Arrives
  ↓
Store Incharge Marks as Received
  ↓
(external_jobwork_inventory status: received)
(Received quantities updated)
  ↓
Accountant Gets Confirmation
  ↓
Material Ready for External Job Work
```

---

## Testing Checklist

- [ ] NPD can send material arrival notification
- [ ] All accountants in company receive notification
- [ ] Accountant can create challan from notification
- [ ] Store incharge receives challan notification
- [ ] Store incharge can mark material as received
- [ ] External inventory shows received materials
- [ ] Accountant gets receipt confirmation
- [ ] Quantities are properly tracked
- [ ] Challan numbers are unique
- [ ] Data is isolated by company

---

## Installation

Run the migration script to create tables:

```bash
cd backend
node create-external-jobwork-tables.js
```

This creates:
- external_jobwork_material_notifications
- external_jobwork_challans  
- external_jobwork_inventory
- Indexes for optimal performance

---

## Next Steps

1. Create UI screens for each role
2. Add Material List views in dashboards
3. Implement receipt photo/document upload
4. Add report generation for external materials
5. Implement return/adjustment workflow
