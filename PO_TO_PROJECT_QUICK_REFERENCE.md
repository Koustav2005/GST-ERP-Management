# PO to Project Creation - Quick Reference

## Flow Summary

```
Enquiry
  ↓
Upload PO File
  ↓
POST /enquiries/:id/upload-po
  ↓
[Backend Processing]
  - Validate user
  - Rename file (PO_EN0001_file.pdf)
  - Update enquiry (po_filename, po_path, po_uploaded_at)
  - Generate PO number (PO_EN00010001)
  - Create project record
  - Send notification
  ↓
Project Created ✅
  - Status: pending
  - Name: PO_EN00010001
  - PO File: Linked
  - Assigned to: Enquiry's assigned user
```

---

## Data Transformation

```javascript
// INPUT: Enquiry + PO File
{
  enquiry_id: 5,
  enquiry_number: "EN0001",
  assigned_to: 10,
  company_id: 2,
  file: "quotation.pdf"
}

// PROCESSING
const newFilename = "PO_EN0001_quotation.pdf";
const newPath = "/uploads/PO_EN0001_quotation.pdf";
const poNumber = "PO_EN00010001";

// OUTPUT: Project Created
{
  id: 142,
  name: "PO_EN00010001",
  po_number: "PO_EN00010001",
  po_filename: "PO_EN0001_quotation.pdf",
  po_path: "/uploads/PO_EN0001_quotation.pdf",
  company_id: 2,
  assigned_to: 10,
  status: "pending",
  priority: "medium",
  created_by: 7
}
```

---

## API Endpoint

### Upload PO & Create Project

```http
POST /enquiries/:id/upload-po
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

Body:
{
  file: <PDF/Document file>
}

Response (200):
{
  message: "PO uploaded and project created successfully",
  enquiry: { /* updated enquiry */ },
  project: { /* new project */ }
}
```

---

## Database Operations

### Step 1: Update Enquiry
```sql
UPDATE enquiries 
SET po_filename = 'PO_EN0001_quotation.pdf',
    po_path = '/uploads/PO_EN0001_quotation.pdf',
    po_uploaded_at = NOW(),
    updated_at = NOW()
WHERE id = 5;
```

### Step 2: Get Latest PO Number
```sql
SELECT po_number FROM projects 
WHERE company_id = 2 AND po_number LIKE 'PO%' 
ORDER BY created_at DESC LIMIT 1;
```

### Step 3: Create Project
```sql
INSERT INTO projects (
  name, description, company_id, assigned_to, 
  priority, status, po_number, created_by,
  po_filename, po_path
) VALUES (
  'PO_EN00010001',
  'Auto-created from Enquiry EN0001...',
  2, 10, 'medium', 'pending', 'PO_EN00010001', 7,
  'PO_EN0001_quotation.pdf',
  '/uploads/PO_EN0001_quotation.pdf'
);
```

### Step 4: Notify User (Optional)
```sql
INSERT INTO notifications (user_id, title, message, type, project_id)
VALUES (10, 'New Project Created', 'Project PO_EN00010001 created...', 'project_created', 142);
```

---

## Frontend Code Example

### Uploading PO (EnquiryScreen)
```javascript
const handleUploadPO = async (enquiry) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*'
    });
    
    if (result.type === 'success') {
      const formData = new FormData();
      formData.append('file', {
        uri: result.uri,
        name: result.name,
        type: 'application/pdf'
      });
      
      const response = await api.post(
        `/enquiries/${enquiry.id}/upload-po`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      Alert.alert('Success', 'PO uploaded and project created!');
      // Project: response.data.project
    }
  } catch (error) {
    Alert.alert('Error', error.response?.data?.error || 'Upload failed');
  }
};
```

### Viewing Project (ProjectDetailsScreen)
```javascript
const viewPODocument = async () => {
  if (!project.po_path) {
    Alert.alert('Error', 'No PO file associated');
    return;
  }
  
  // Download and open the file
  const response = await Linking.openURL(
    `http://backend/api/enquiries/download-po?path=${project.po_path}`
  );
};
```

---

## PO Number Generation Logic

```javascript
const poPrefix = `PO${enquiry.enquiry_number}`; // "PO_EN0001"

const latestResult = await pool.query(
  `SELECT po_number FROM projects 
   WHERE company_id = $1 
   ORDER BY created_at DESC LIMIT 1`,
  [company_id]
);

let nextPONumber;

if (latestResult.rows.length > 0) {
  const lastPO = latestResult.rows[0].po_number;      // "PO_EN00010002"
  const match = lastPO.match(/(\d+)$/);               // ["0002", "0002"]
  const nextSeq = parseInt(match[1]) + 1;             // 3
  nextPONumber = `${poPrefix}${String(nextSeq).padStart(4, '0')}`;
  // Result: "PO_EN00010003"
} else {
  nextPONumber = `${poPrefix}0001`;                   // "PO_EN00010001"
}
```

---

## Important Fields

| Field | Where Set | Purpose |
|-------|-----------|---------|
| `po_number` | Generated in backend | Unique identifier for project |
| `po_filename` | From file upload | Original uploaded filename (renamed with PO prefix) |
| `po_path` | Generated in backend | Full file path on server |
| `po_uploaded_at` | Backend timestamp | When PO was uploaded (in enquiry) |
| `assigned_to` | From enquiry | User responsible for project |
| `status` | Set to 'pending' | Project is pending until started |
| `description` | Auto-generated | References enquiry and uploader |

---

## Key Points

✅ **Automatic**: Project is created automatically when PO is uploaded  
✅ **Unique**: Each project gets a unique PO number  
✅ **Linked**: Project retains reference to PO file  
✅ **Notified**: Assigned user gets notification  
✅ **Pending**: Project starts in 'pending' status  
✅ **Traceable**: Description includes enquiry reference  

---

## Troubleshooting

**Q: Why wasn't project created after PO upload?**  
A: Check that:
- User is assigned to enquiry
- company_id is correctly set
- projects table has required columns

**Q: PO file not accessible?**  
A: Verify:
- File was renamed with PO_ prefix
- Path stored correctly in database
- /uploads/ directory has read permissions

**Q: Wrong PO number generated?**  
A: Check:
- Latest PO query is working
- Regex extracts correct sequence
- No duplicate sequence numbers

