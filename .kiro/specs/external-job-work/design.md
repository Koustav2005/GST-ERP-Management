# External Job Work Feature - Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ENQUIRY SCREEN                           │
│         Customer Accepted with PO Upload                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  PROJECT TYPE SELECTION      │
        │  Modal                       │
        ├──────────────────────────────┤
        │ 📁 Regular Project           │
        │ 🔧 External Job Work        │
        │ ❌ Cancel                    │
        └──┬─────────────┬─────────────┘
           │             │
    ┌──────▼──┐    ┌─────▼──────────────┐
    │ PROJECTS │    │ EXTERNAL JOB WORK  │
    │ (OLD)    │    │ (NEW)              │
    │ FLOW     │    │ FLOW               │
    └──────────┘    └────────────────────┘
           │                  │
           ▼                  ▼
    ┌──────────────┐  ┌──────────────────────┐
    │PROJECT LIST  │  │EXTERNAL JOB WORK LIST│
    │SCREEN       │  │SCREEN (NEW)          │
    │(EXISTING)   │  │With Tab Support      │
    └──────────────┘  └──────────────────────┘
           │                  │
           ▼                  ▼
    ┌──────────────┐  ┌──────────────────────┐
    │PROJECT       │  │EXTERNAL JOB WORK     │
    │DETAILS       │  │DETAILS SCREEN (NEW)  │
    │(EXISTING)    │  │Simplified View       │
    └──────────────┘  └──────────────────────┘
```

---

## Component Hierarchy

### Frontend Components

```
App.js (Navigation)
│
├── ProjectAndJobWorkListScreen.js (NEW - Combined List with Tabs)
│   ├── Tab Navigation
│   ├── ProjectListContent (existing)
│   └── ExternalJobWorkListContent (NEW)
│
├── ExternalJobWorkDetailsScreen.js (NEW)
│   ├── Header (Name, Status, Dates)
│   ├── AssignmentSection
│   ├── ItemsList (Materials/Operations)
│   ├── StatusHistory
│   ├── ActionButtons
│   └── Footer
│
└── EnquiryScreen.js (MODIFIED)
    └── ProjectTypeSelectionModal (NEW)
        ├── Regular Project Button
        └── External Job Work Button
```

---

## Database Schema Design

### New Tables Structure

```sql
-- Main External Job Work Table
CREATE TABLE external_job_work (
  id SERIAL PRIMARY KEY,
  external_job_id VARCHAR(50) UNIQUE NOT NULL,    -- EJW_EN00010001
  enquiry_id INT REFERENCES enquiries(id),
  company_id INT NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to INT REFERENCES users(id),
  created_by INT NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending',           -- pending, in_progress, completed, cancelled
  po_number VARCHAR(50),
  po_filename VARCHAR(255),
  po_path VARCHAR(255),
  priority VARCHAR(50) DEFAULT 'medium',          -- urgent, high, medium, low
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_company_id (company_id),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_status (status)
);

-- Items/Operations in External Job Work
CREATE TABLE external_job_work_items (
  id SERIAL PRIMARY KEY,
  job_work_id INT NOT NULL REFERENCES external_job_work(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2),
  unit VARCHAR(50),                              -- pcs, kg, m, etc.
  hsn VARCHAR(50),
  estimated_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_job_work_id (job_work_id)
);

-- Status History Tracking
CREATE TABLE external_job_work_history (
  id SERIAL PRIMARY KEY,
  job_work_id INT NOT NULL REFERENCES external_job_work(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by INT NOT NULL REFERENCES users(id),
  notes TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_job_work_id (job_work_id),
  INDEX idx_changed_at (changed_at)
);
```

---

## API Design

### Endpoints Structure

```
POST   /external-job-work                          Create new external job work
GET    /external-job-work/company/:companyId      List all for company
GET    /external-job-work/:id                      Get single details
PUT    /external-job-work/:id                      Update status/details
DELETE /external-job-work/:id                      Delete (soft or hard)

GET    /external-job-work/:id/items                Get all items
POST   /external-job-work/:id/items                Add item
PUT    /external-job-work/:id/items/:itemId        Update item
DELETE /external-job-work/:id/items/:itemId        Delete item

GET    /external-job-work/:id/history              Get status history
POST   /external-job-work/:id/status               Update status + history
```

### Request/Response Examples

#### Create External Job Work
```javascript
POST /external-job-work

Request Body:
{
  enquiry_id: 5,
  name: "Fabrication - External Company A",
  description: "Sheet metal fabrication",
  assigned_to: 10,
  po_number: "PO_EN00010001",
  priority: "high"
}

Response:
{
  id: 1,
  external_job_id: "EJW_EN00010001",
  enquiry_id: 5,
  company_id: 2,
  name: "Fabrication - External Company A",
  description: "Sheet metal fabrication",
  assigned_to: 10,
  created_by: 7,
  status: "pending",
  po_number: "PO_EN00010001",
  created_at: "2026-06-12T10:30:00Z"
}
```

#### List External Job Work
```javascript
GET /external-job-work/company/2

Response:
{
  jobs: [
    {
      id: 1,
      external_job_id: "EJW_EN00010001",
      name: "Fabrication Work",
      status: "in_progress",
      assigned_to_name: "John PM",
      created_at: "2026-06-12T10:30:00Z"
    },
    {...}
  ],
  total: 15,
  pending: 3,
  in_progress: 7,
  completed: 5
}
```

---

## Screen Mockups

### 1. Project Type Selection Modal

```
┌─────────────────────────────────────┐
│  📋 Choose Project Type             │
│                                     │
│  Enquiry: EN0001                    │
│  PO: quotation.pdf (selected)       │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ 📁 Regular Project           │  │
│  │                              │  │
│  │ Full project with multiple   │  │
│  │ phases, BOM, and revisions   │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ 🔧 External Job Work         │  │
│  │                              │  │
│  │ Single/few fabrication tasks │  │
│  │ for external companies       │  │
│  └──────────────────────────────┘  │
│                                     │
│  [Cancel]                           │
└─────────────────────────────────────┘
```

### 2. Combined Project List with Tabs

```
┌─────────────────────────────────────┐
│ Projects                       [Back]│
├─────────────────────────────────────┤
│ [📁 Regular Projects] [🔧 Job Work] │
│ (Search: ______________)            │
├─────────────────────────────────────┤
│                                     │
│ ┌──────────────────────────────┐  │
│ │ PO_EN00010001                │  │
│ │ Priority: HIGH      ⚡       │  │
│ │                              │  │
│ │ Status: IN PROGRESS    ●     │  │
│ │ Created: 12 Jun 2026         │  │
│ └──────────────────────────────┘  │
│                                     │
│ ┌──────────────────────────────┐  │
│ │ EJW_EN00010001               │  │
│ │ Priority: MEDIUM      ◆      │  │
│ │                              │  │
│ │ Status: PENDING        ●     │  │
│ │ Created: 12 Jun 2026         │  │
│ └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### 3. External Job Work Details

```
┌─────────────────────────────────────┐
│ [←] EJW_EN00010001                  │
├─────────────────────────────────────┤
│                                     │
│ Status: IN PROGRESS           ●    │
│ Priority: HIGH                ⚡   │
│                                     │
│ 📝 Description                     │
│ Sheet metal fabrication work for   │
│ external customer ABC Company      │
│                                     │
│ 👤 Assigned to: John PM            │
│ 📄 PO: PO_EN00010001               │
│ 📅 Created: 12 Jun 2026            │
│                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 📦 Items/Operations                │
│ ├─ Laser Cutting (50 pcs)          │
│ ├─ Bending (30 pcs)                │
│ └─ Assembly (15 pcs)               │
│                                     │
│ [+ Add Item]                       │
│                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 📋 Status History                  │
│ • 12 Jun 10:30 → In Progress       │
│   Changed by: Admin                │
│ • 12 Jun 09:00 → Pending           │
│   Created                          │
│                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│ [Change Status] [Edit] [Delete]    │
│                                     │
└─────────────────────────────────────┘
```

---

## State Management

### Frontend State (React)

```javascript
// ExternalJobWorkListScreen
const [jobWorks, setJobWorks] = useState([]);
const [filteredJobWorks, setFilteredJobWorks] = useState([]);
const [loading, setLoading] = useState(true);
const [activeTab, setActiveTab] = useState('regular'); // 'regular' or 'external'
const [searchQuery, setSearchQuery] = useState('');

// ExternalJobWorkDetailsScreen
const [jobWork, setJobWork] = useState(null);
const [items, setItems] = useState([]);
const [history, setHistory] = useState([]);
const [loading, setLoading] = useState(true);
const [statusModalVisible, setStatusModalVisible] = useState(false);
const [newStatus, setNewStatus] = useState('');
```

---

## Implementation Timeline

### Phase 1: Backend Setup
1. Create database migration/tables
2. Create API endpoints (CRUD)
3. Add authorization checks

### Phase 2: Frontend - List Screen
1. Modify ProjectListScreen to support tabs
2. Create ExternalJobWorkListScreen content
3. Add tab navigation

### Phase 3: Frontend - Details Screen
1. Create ExternalJobWorkDetailsScreen
2. Implement items management
3. Add status history display

### Phase 4: Enquiry Integration
1. Create project type selection modal
2. Integrate with existing customer acceptance flow
3. Route to appropriate creation endpoint

### Phase 5: Testing & Polish
1. Test all workflows
2. Bug fixes
3. Performance optimization

---

## Security Considerations

### Authorization
- Only company users can create/access their company's external job work
- Only assigned user or management can modify
- Store incharge cannot directly access (unless related to job work)

### Data Validation
- All inputs sanitized
- PO number format validated
- Status values from predefined list only

### Audit Trail
- All changes logged to history table
- Changed_by tracks user
- Timestamp on all records

---

## Performance Considerations

### Database Optimization
- Indexes on frequently queried fields (company_id, assigned_to, status)
- Pagination for large lists
- Lazy load items and history

### Frontend Optimization
- Memoize list components
- Lazy load status history
- Cache job work list until refresh

---

## Testing Strategy

### Unit Tests
- External job work creation logic
- Status validation
- Item addition/removal

### Integration Tests
- API endpoint responses
- Authorization checks
- Database transactions

### E2E Tests
- Customer selects External Job Work from modal
- External job work created successfully
- Visible in list and details screens
- Status changes tracked correctly

---

## Rollback Plan
- Keep projects table and external_job_work separate
- No modifications to existing tables
- If feature fails, can be disabled without data loss
- Migration scripts are reversible

