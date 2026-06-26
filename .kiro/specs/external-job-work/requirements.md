# External Job Work Feature - Requirements Specification

## Overview
Implement a new "External Job Work" workflow alongside the existing "Regular Project" workflow. When a customer accepts a quotation and uploads a PO, a modal should appear asking users to choose between:
1. **Regular Project** - Standard project workflow (existing)
2. **External Job Work** - Single/few operations for external companies (new)

---

## Business Requirements

### What is External Job Work?
- Fabrication work from other companies
- NOT a complete project, just single or few tasks/operations
- Simplified workflow compared to regular projects
- Should have its own tab/section in all project-related screens

### What is Regular Project?
- Full in-house projects with multiple phases
- Complete BOM, revisions, internal reports
- Existing workflow (unchanged)

---

## Functional Requirements

### 1. Customer Acceptance Modal - Project Type Selection
**Trigger**: When "Customer Accepted" is clicked in EnquiryScreen
**Current Behavior**: Uploads PO and creates project immediately
**New Behavior**: 
- Show modal asking: "Regular Project or External Job Work?"
- If "Regular Project" selected → Same workflow as before
- If "External Job Work" selected → Create external job work record

### 2. External Job Work Screen
**New Screen**: `ExternalJobWorkListScreen.js`
- Similar to ProjectListScreen but for external job work
- Show all external job work records for the company
- Search functionality
- Filter by status

### 3. External Job Work Details Screen
**New Screen**: `ExternalJobWorkDetailsScreen.js`
- Simplified view compared to ProjectDetailsScreen
- Show:
  - External job work name/ID
  - Assigned to (Project Manager or person responsible)
  - Status
  - Description/Purpose
  - Materials list (simpler than BOM)
  - Simple revisions (if needed)
  - Status history
- No complex phases/stages

### 4. Tab Navigation Updates
**Screens to Update**:
- Any dashboard showing projects should add "External Job Work" tab
- ProjectListScreen should become tabbed:
  - Tab 1: "Regular Projects"
  - Tab 2: "External Job Work"

### 5. Database Schema
**New Tables**:
- `external_job_work` - Main records
- `external_job_work_items` - Materials/operations list
- `external_job_work_history` - Status tracking

### 6. API Endpoints
**New Endpoints**:
- `POST /external-job-work` - Create new external job work
- `GET /external-job-work/company/:companyId` - List all
- `GET /external-job-work/:id` - Get details
- `PUT /external-job-work/:id` - Update
- `GET /external-job-work/:id/history` - Get history

### 7. Workflow Consistency
- Same user roles can access (Management, PM, etc.)
- Similar permissions model as projects
- Similar notification system
- Same status tracking

---

## Key Differences from Regular Projects

| Aspect | Regular Project | External Job Work |
|--------|-----------------|-------------------|
| Complexity | Full | Simplified |
| Phases | Multiple (Started, Cutting, etc.) | Simple (Pending, In Progress, Completed) |
| BOM | Detailed Bill of Materials | Simple items list |
| Revisions | Full revision history with sketches | Simple optional revisions |
| Internal Reports | Multiple phase-specific PDFs | None or minimal |
| Job Work Integration | Can submit job work | Simplified or direct |
| Lifecycle | Complex (6+ phases) | Simple (3 phases) |

---

## Data Model

### external_job_work Table
```sql
id SERIAL PRIMARY KEY
external_job_id VARCHAR(50) UNIQUE          -- EJW_EN00010001
enquiry_id INT REFERENCES enquiries(id)
company_id INT REFERENCES companies(id)
name VARCHAR(255)                            -- Descriptive name
description TEXT
assigned_to INT REFERENCES users(id)         -- PM or responsible person
created_by INT REFERENCES users(id)
status VARCHAR(50) DEFAULT 'pending'         -- pending, in_progress, completed, cancelled
po_number VARCHAR(50)
po_filename VARCHAR(255)
po_path VARCHAR(255)
priority VARCHAR(50) DEFAULT 'medium'
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP
```

### external_job_work_items Table
```sql
id SERIAL PRIMARY KEY
job_work_id INT REFERENCES external_job_work(id) ON DELETE CASCADE
item_name VARCHAR(255)
description TEXT
quantity DECIMAL(10,2)
unit VARCHAR(50)
hsn VARCHAR(50)
estimated_cost DECIMAL(10,2)
notes TEXT
created_at TIMESTAMP
```

### external_job_work_history Table
```sql
id SERIAL PRIMARY KEY
job_work_id INT REFERENCES external_job_work(id) ON DELETE CASCADE
old_status VARCHAR(50)
new_status VARCHAR(50)
changed_by INT REFERENCES users(id)
notes TEXT
changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

---

## UI/UX Requirements

### 1. Project Type Modal
**Location**: Appears when "Customer Accepted" clicked
**Options**:
- "📁 Regular Project" button
- "🔧 External Job Work" button
- "Cancel" button

### 2. External Job Work Tab
**Icon**: 🔧 or 📦
**Label**: "External Job Work"
**Count**: Show number of items

### 3. Status Badges
- Pending (gray)
- In Progress (blue)
- Completed (green)
- Cancelled (red)

---

## Integration Points

### 1. EnquiryScreen.js
- After "Customer Accepted" → Show modal
- If Regular Project → Existing flow
- If External Job Work → Call API to create external job work

### 2. ProjectListScreen.js (becomes ProjectAndJobWorkListScreen.js)
- Add tabbed navigation
- Tab 1: Existing project list
- Tab 2: External job work list

### 3. Navigation (App.js)
- Add new stack: `ExternalJobWorkDetails`
- Add new screen: `ExternalJobWorkListScreen`
- Add new screen: `ExternalJobWorkDetailsScreen`

### 4. Dashboards
- Update to show both regular projects and external job work
- Add separate counts

---

## Permissions & Access Control

### Regular Project Access
- NPD: Can create and view own projects
- Project Manager: Can view assigned projects
- Management: Can view all company projects
- Store Incharge: Can submit job work

### External Job Work Access (Same as Projects)
- NPD: Can create and view own
- Project Manager: Can view assigned
- Management: Can view all company external job work
- Store Incharge: Can submit related job work (if applicable)

---

## Status Workflow

### External Job Work Statuses
1. **Pending** → Awaiting PM assignment/start
2. **In Progress** → Work is being done
3. **Completed** → Work finished
4. **Cancelled** → Cancelled by PM/Management

### Status Transitions
- Pending → In Progress (by PM/Management)
- In Progress → Completed (by PM/Management)
- Any → Cancelled (by Management)

---

## Notifications

### When to Notify
1. External job work created → Notify assigned user
2. Status changes → Notify assigned user
3. External job work completed → Notify management

---

## Success Criteria
✅ Modal appears when customer accepts quotation  
✅ Can select between Regular Project and External Job Work  
✅ External job work records created correctly with unique ID  
✅ External job work visible in separate tab  
✅ Full CRUD operations work for external job work  
✅ Status tracking and history maintained  
✅ Permissions enforced correctly  
✅ All endpoints return correct data  
✅ UI consistent with existing design  

