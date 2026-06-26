# Project Creation from Purchase Order Flow

## Overview
Projects are automatically created when a Purchase Order (PO) file is uploaded to an enquiry. This document outlines the complete flow from PO upload to project creation.

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INITIATES PO UPLOAD                      │
│              (NPD/Management uploads PO file)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │  EnquiryScreen     │
                    │  (Frontend)        │
                    │                    │
                    │ 1. Select enquiry  │
                    │ 2. Pick PO file    │
                    │ 3. Upload file     │
                    └────────┬───────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────┐
        │   POST /enquiries/:id/upload-po            │
        │   (Backend Route)                          │
        │                                            │
        │   Headers:                                 │
        │   - Authorization: JWT token               │
        │   - Content-Type: multipart/form-data      │
        │                                            │
        │   Body:                                    │
        │   - file: PDF/Document                     │
        └────────────┬─────────────────────────────┘
                     │
                     ▼
    ┌───────────────────────────────────────────────────┐
    │  1. VALIDATE REQUEST                              │
    ├───────────────────────────────────────────────────┤
    │  ✓ Check user is authenticated                    │
    │  ✓ Get enquiry ID from params                     │
    │  ✓ Verify file exists in request                  │
    │  ✓ Check user owns enquiry (company_id match)     │
    │  ✓ Verify enquiry belongs to user's company       │
    └────────────────┬─────────────────────────────────┘
                     │
                     ▼
    ┌───────────────────────────────────────────────────┐
    │  2. FILE PREPARATION                              │
    ├───────────────────────────────────────────────────┤
    │  ✓ Get original file path: req.file.path          │
    │  ✓ Create new filename:                           │
    │    Format: PO_{enquiry_number}_{original_name}    │
    │                                                   │
    │  Example:                                         │
    │  Original: quotation.pdf                          │
    │  New: PO_EN0001_quotation.pdf                     │
    │                                                   │
    │  ✓ Rename file to new path in /uploads            │
    │  ✓ Delete original temp file                      │
    └────────────────┬─────────────────────────────────┘
                     │
                     ▼
    ┌───────────────────────────────────────────────────┐
    │  3. UPDATE ENQUIRY RECORD                         │
    ├───────────────────────────────────────────────────┤
    │  SQL: UPDATE enquiries                            │
    │       SET po_filename = new_filename              │
    │           po_path = full_path                     │
    │           po_uploaded_at = NOW()                  │
    │       WHERE id = enquiry_id                       │
    │                                                   │
    │  Fields Updated:                                  │
    │  - po_filename: PO_EN0001_quotation.pdf           │
    │  - po_path: /uploads/PO_EN0001_quotation.pdf      │
    │  - po_uploaded_at: 2024-01-20 10:30:00            │
    └────────────────┬─────────────────────────────────┘
                     │
                     ▼
    ┌───────────────────────────────────────────────────┐
    │  4. GENERATE UNIQUE PO NUMBER FOR PROJECT         │
    ├───────────────────────────────────────────────────┤
    │  ✓ Query latest PO number from projects table     │
    │    WHERE company_id = current_company             │
    │                                                   │
    │  ✓ Extract sequence from last PO                  │
    │    Example: if last is "PO_EN00010002"            │
    │             extract: 0002                         │
    │                                                   │
    │  ✓ Increment sequence by 1                        │
    │    Example: 0002 + 1 = 0003                       │
    │                                                   │
    │  ✓ Create new PO number:                          │
    │    Format: PO_{enquiry_number}{sequence}          │
    │    Example: PO_EN00010003                         │
    │                                                   │
    │  If no existing PO for company:                   │
    │    Start with: PO_{enquiry_number}0001            │
    └────────────────┬─────────────────────────────────┘
                     │
                     ▼
    ┌───────────────────────────────────────────────────┐
    │  5. CREATE PROJECT RECORD                         │
    ├───────────────────────────────────────────────────┤
    │  SQL: INSERT INTO projects (...)                  │
    │                                                   │
    │  INSERT Data:                                     │
    │  ┌──────────────────┬──────────────────────────┐  │
    │  │ Column           │ Value                    │  │
    │  ├──────────────────┼──────────────────────────┤  │
    │  │ name             │ PO_EN00010003            │  │
    │  │ description      │ Auto-created from        │  │
    │  │                  │ Enquiry EN0001.          │  │
    │  │                  │ PO uploaded by {user}    │  │
    │  │ company_id       │ enquiry.company_id       │  │
    │  │ assigned_to      │ enquiry.assigned_to      │  │
    │  │ priority         │ 'medium' (default)       │  │
    │  │ status           │ 'pending' (default)      │  │
    │  │ po_number        │ PO_EN00010003            │  │
    │  │ created_by       │ current_user.id          │  │
    │  │ po_filename      │ PO_EN0001_quotation.pdf  │  │
    │  │ po_path          │ /uploads/PO_EN0001_...   │  │
    │  │ created_at       │ NOW()                    │  │
    │  └──────────────────┴──────────────────────────┘  │
    │                                                   │
    │  Returns: newProject (with all fields)            │
    └────────────────┬─────────────────────────────────┘
                     │
                     ▼
    ┌───────────────────────────────────────────────────┐
    │  6. CREATE NOTIFICATION (Optional)                │
    ├───────────────────────────────────────────────────┤
    │  If enquiry.assigned_to exists:                   │
    │                                                   │
    │  INSERT INTO notifications:                       │
    │  - user_id: enquiry.assigned_to                   │
    │  - title: "New Project Created"                   │
    │  - message: "A new project {PO_number} has        │
    │             been auto-created for enquiry         │
    │             {enquiry_number} after PO upload"     │
    │  - type: "project_created"                        │
    │  - project_id: newProject.id                      │
    │                                                   │
    │  Purpose: Alert user about new project            │
    └────────────────┬─────────────────────────────────┘
                     │
                     ▼
         ┌────────────────────────────┐
         │   RESPONSE TO FRONTEND      │
         ├────────────────────────────┤
         │ HTTP 200 OK                │
         │                            │
         │ {                          │
         │   message: "PO uploaded    │
         │   and project created"     │
         │   enquiry: {...}           │
         │   project: {...}           │
         │ }                          │
         └────────────────┬───────────┘
                          │
                          ▼
         ┌──────────────────────────────────┐
         │    FRONTEND (React Native)       │
         ├──────────────────────────────────┤
         │ ✓ Show success alert             │
         │ ✓ Update local state             │
         │ ✓ Navigate to Projects list      │
         │ ✓ User can now see new project   │
         └──────────────────────────────────┘
```

---

## Database Tables Involved

### 1. **enquiries** (Updated)
```sql
UPDATE enquiries SET
  po_filename = 'PO_EN0001_quotation.pdf',
  po_path = '/uploads/PO_EN0001_quotation.pdf',
  po_uploaded_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
WHERE id = {enquiry_id};
```

### 2. **projects** (New Record Created)
```sql
INSERT INTO projects (
  name,
  description,
  company_id,
  assigned_to,
  priority,
  status,
  po_number,
  created_by,
  po_filename,
  po_path,
  created_at
) VALUES (
  'PO_EN00010001',
  'Auto-created from Enquiry EN0001. PO uploaded by John.',
  {company_id},
  {assigned_to_id},
  'medium',
  'pending',
  'PO_EN00010001',
  {user_id},
  'PO_EN0001_quotation.pdf',
  '/uploads/PO_EN0001_quotation.pdf',
  NOW()
);
```

### 3. **notifications** (If User Assigned)
```sql
INSERT INTO notifications (
  user_id,
  title,
  message,
  type,
  project_id,
  created_at
) VALUES (
  {assigned_user_id},
  'New Project Created',
  'A new project PO_EN00010001 has been auto-created...',
  'project_created',
  {project_id},
  NOW()
);
```

---

## Frontend to Backend Communication

### Request
```javascript
// From: EnquiryScreen.js
POST /enquiries/:id/upload-po
Headers:
  - Authorization: Bearer {jwt_token}
  - Content-Type: multipart/form-data

Body (FormData):
  - file: {File object from device}

Example JavaScript:
const formData = new FormData();
formData.append('file', {
  uri: 'file:///path/to/quotation.pdf',
  type: 'application/pdf',
  name: 'quotation.pdf'
});

await api.post(`/enquiries/${enquiry.id}/upload-po`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Response
```json
{
  "message": "PO uploaded and project created successfully",
  "enquiry": {
    "id": 5,
    "enquiry_number": "EN0001",
    "company_id": 2,
    "assigned_to": 10,
    "po_filename": "PO_EN0001_quotation.pdf",
    "po_path": "/uploads/PO_EN0001_quotation.pdf",
    "po_uploaded_at": "2024-01-20T10:30:00Z",
    "updated_at": "2024-01-20T10:30:00Z"
  },
  "project": {
    "id": 142,
    "name": "PO_EN00010001",
    "description": "Auto-created from Enquiry EN0001...",
    "company_id": 2,
    "assigned_to": 10,
    "priority": "medium",
    "status": "pending",
    "po_number": "PO_EN00010001",
    "created_by": 7,
    "po_filename": "PO_EN0001_quotation.pdf",
    "po_path": "/uploads/PO_EN0001_quotation.pdf",
    "created_at": "2024-01-20T10:30:00Z"
  }
}
```

---

## PO Numbering System

### How PO Numbers Are Generated

1. **Pattern**: `PO_{enquiry_number}{sequence}`
   - `PO_` = Prefix (indicates Purchase Order)
   - `EN0001` = Enquiry number (e.g., EN0001)
   - `0001` = Sequential number (4 digits, zero-padded)

2. **Examples**:
   ```
   First PO for EN0001:  PO_EN00010001
   Second PO for EN0001: PO_EN00010002
   Third PO for EN0001:  PO_EN00010003
   
   First PO for EN0002:  PO_EN00020001
   ```

3. **Generation Logic** (Backend):
   ```javascript
   const poPrefix = `PO${enquiry.enquiry_number}`; // "PO_EN0001"
   
   // Get latest PO for company
   const latestPO = await pool.query(
     `SELECT po_number FROM projects
      WHERE company_id = $1 AND po_number LIKE 'PO%'
      ORDER BY created_at DESC LIMIT 1`,
     [company_id]
   );
   
   if (latestPO.rows.length > 0) {
     // Extract and increment
     const lastPO = latestPO.rows[0].po_number; // "PO_EN00010002"
     const match = lastPO.match(/(\d+)$/); // ["0002", "0002"]
     const nextSeq = parseInt(match[1]) + 1; // 3
     nextPONumber = `${poPrefix}${String(nextSeq).padStart(4, '0')}`; 
     // "PO_EN00010003"
   } else {
     nextPONumber = `${poPrefix}0001`; // "PO_EN00010001"
   }
   ```

---

## File Handling

### File Upload Process

1. **Upload Location**: `/uploads/` directory
2. **Filename Format**: `PO_{enquiry_number}_{original_filename}`
   - Original: `quotation.pdf`
   - Renamed: `PO_EN0001_quotation.pdf`

3. **File Operations**:
   - Multer receives file in temp directory
   - File renamed to include PO prefix
   - Renamed file moved to `/uploads/`
   - Temp file deleted
   - Path stored in database

### Stored in Database
```javascript
po_filename: "PO_EN0001_quotation.pdf"
po_path: "/uploads/PO_EN0001_quotation.pdf"
```

### Accessing the File (Frontend)
```javascript
// From ProjectDetailsScreen.js
const viewPODocument = async () => {
  if (!project.po_path && !project.po_filename) {
    Alert.alert('Error', 'No PO file associated');
    return;
  }
  
  // Download and open PO document
  const filename = project.po_filename || project.po_path.split('/').pop();
  // Open document viewer with: api.get(`/enquiries/${enquiry_id}/download-po`)
};
```

---

## User Roles & Permissions

### Who Can Upload PO?
- **NPD Users**: Can upload PO for assigned enquiries
- **Management Users**: Can upload PO for company enquiries
- **Project Managers**: Generally cannot upload (viewing only)

### Authorization Check
```javascript
// Backend verification
if (enquiry.company_id !== req.user.company_id) {
  return res.status(403).json({ error: 'Unauthorized' });
}

if (req.user.id !== enquiry.assigned_to && req.user.role !== 'management') {
  return res.status(403).json({ error: 'Only assigned user can upload' });
}
```

---

## Status Flow After Project Creation

```
PO Upload
    │
    ▼
PROJECT CREATED (status: 'pending')
    │
    ├─ Can view in Projects list
    ├─ Can view BOM (Bill of Materials)
    ├─ Can add revisions
    ├─ Can track status history
    │
    ▼
PROJECT DETAILS SCREEN SHOWS:
    - Project name (PO number)
    - Description
    - Status: pending
    - Priority: medium
    - Assigned to: NPD user
    - Purchase Order document (viewable)
    - BOM management
    - Revision tracking
    - Status history
```

---

## Related Screens & Navigation

### Frontend Screens Involved

1. **EnquiryScreen**
   - Shows list of enquiries
   - Allows PO file upload for each enquiry
   - Shows PO upload status

2. **ProjectListScreen**
   - Shows all created projects
   - Displays PO number in project list
   - Filterable by name or PO number

3. **ProjectDetailsScreen**
   - Shows full project details
   - Displays "Purchase Order" card
   - Link to view PO document
   - Shows po_filename and po_path

### Backend Routes

1. `POST /enquiries/:id/upload-po`
   - Main route for PO upload
   - Creates project automatically

2. `GET /enquiries/:id/download-po`
   - Download PO file from project

3. `GET /projects/company/:companyId`
   - Fetch all projects (includes PO info)

4. `GET /projects/:id`
   - Fetch single project details (with PO info)

---

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| 403 Unauthorized | User doesn't own enquiry | Verify user company_id matches |
| 400 Bad Request | No file in request | Ensure file is selected before upload |
| 500 File Error | Cannot rename file | Check file permissions in /uploads |
| 500 DB Error | Cannot create project | Verify projects table exists |

### Error Response Example
```json
{
  "error": "Server error",
  "details": "Cannot create project: Invalid company_id"
}
```

---

## Summary

**Project Creation Flow from PO**:
1. User uploads PO file to an enquiry
2. Backend validates request and generates unique PO number
3. File renamed and stored with PO prefix
4. Enquiry record updated with PO file info
5. **New project automatically created** with:
   - Name = PO number
   - Status = pending
   - Assigned to = enquiry's assigned user
   - Links to PO file
6. Notification sent to assigned user
7. Project now visible in Projects list

**Key Features**:
- ✅ Automatic project creation on PO upload
- ✅ Unique PO numbering system
- ✅ File management with naming convention
- ✅ User notifications
- ✅ Role-based access control
- ✅ Project tracking with PO references

