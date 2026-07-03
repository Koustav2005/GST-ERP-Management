# External Job Work Material Collection - Quick Reference

## 🎯 Feature Summary
Workers can now scan QR codes to collect external job work materials, and Store Incharge can see real-time pickups in a dedicated "Collected" tab.

---

## 🚀 How to Use

### For Workers
1. Open Worker Dashboard
2. Tap "📦 Collect External Materials" quick action
3. Select a pending material request
4. Tap "📷 Scan QR Code to Collect"
5. Scan the Store Incharge's QR code
6. ✅ See "Order Picked!" confirmation
7. Material is marked as collected

### For Store Incharge
1. Open External Job Work Outstock Screen
2. Generate QR code for worker to scan
3. Switch to "📦 Collected" tab
4. See real-time list of materials workers have collected
5. Each collection shows: Worker name, timestamp, collection ID

---

## 📱 UI Components

### Worker Collection Screen
- **Pending Requests List**: Shows materials to collect
- **QR Scanner Modal**: Camera or manual entry
- **Success Modal**: Green confirmation with collection ID
- **Manual Entry**: Can type `REQ-{id}` if QR doesn't work

### Store Incharge Outstock Screen
- **3 Tabs**:
  - ⏳ Pending requests
  - ✅ Fulfilled requests
  - 📦 Collected materials (NEW)
- **Auto-refresh**: Every 5 seconds
- **Collection Records**: Shows worker name and timestamp

---

## 🔧 Technical Details

### Request ID Formats Supported
- Numeric: `1`, `42`
- Manual: `REQ-1`, `REQ-42`

### QR Code Payload
```json
{
  "type": "external_material_request",
  "request_id": 1,
  "project_id": 5,
  "worker_id": 20,
  "materials_count": 3,
  "timestamp": "2026-07-03T10:30:00Z"
}
```

### Success Modal Data
- Collection ID (from database)
- Timestamp
- Worker confirmation message

---

## 📊 Database Tables

### `external_jobwork_outstock_requests`
Stores material requests with status tracking

### `external_material_collections`
Records when workers collect materials
- request_id
- collected_by (worker ID)
- collection_timestamp
- status

---

## 🔌 API Endpoints

### Create Collection
```
POST /external-jobwork-materials/requests/:requestId/collect
Body: { collected_by, collection_timestamp }
Response: { collectionId, status, message }
```

### Get Collections for Request
```
GET /external-jobwork-materials/requests/:requestId/collections
Response: { collections: [...] }
```

### Get Worker Pending Requests
```
GET /external-jobwork-materials/worker/:workerId/requests
Response: { requests: [...] }
```

---

## 🎨 Color Scheme

- **Success**: Green (#34C759)
- **Pending**: Orange (#FF9500)
- **Primary**: Purple (#5856D6)
- **Store Incharge Header**: Yellow (#FFC107)

---

## 🔔 Notifications

### Store Incharge Receives
- Notification when material is collected
- Real-time "Collected" count update
- Worker name and timestamp

### Worker Receives
- Success confirmation modal
- Collection ID for reference
- Refreshed pending requests list

---

## ✅ Error Handling

### Common Errors
| Error | Cause | Solution |
|-------|-------|----------|
| Request not found | Already collected | Check status in app |
| Access denied | Worker mismatch | Assign correct worker |
| Invalid ID format | Malformed string | Use numeric or REQ- format |
| Camera permission | Not granted | Enable in phone settings |

---

## 📈 Performance

- **Auto-refresh**: 5 second polling (Store Incharge only)
- **Network**: Single API call per collection
- **Database**: Indexed on request_id for fast queries
- **Notifications**: Async processing

---

## 🔒 Security

- ✅ Token-based authentication
- ✅ Worker verification (can only collect their requests)
- ✅ Company isolation (Store Incharge sees only company requests)
- ✅ Timestamp validation

---

## 📝 Files Structure

```
src/
├── screens/
│   ├── ExternalJobworkMaterialCollectionScreen.js (Worker)
│   ├── ExternalJobworkOutstockScreen.js (Store Incharge)
│   ├── dashboards/
│   │   └── WorkerDashboard.js (Quick action)
│   └── ExternalJobworkMaterialRequestScreen.js (PM)
├── config/
│   └── api.js (API methods)
└── App.js (Navigation)

backend/
├── routes/
│   └── external-jobwork-materials.js (All endpoints)
└── database/
    └── create-external-jobwork-tables.js (Schema)
```

---

## 🚀 Getting Started

1. **Backend must be running**: `npm run dev` in backend folder
2. **Database tables created**: Run migration if not done
3. **Frontend build**: Just open the app
4. **Test workflow**:
   - Create request as PM
   - Generate QR as Store Incharge
   - Scan/collect as Worker
   - View collections as Store Incharge

---

## 💡 Tips

- QR codes are valid for unlimited use (can be scanned multiple times)
- Manual code format: Copy from "REQ-{id}" shown in QR modal
- Collection timestamp is automatic (current time)
- Real-time updates happen automatically - no refresh needed
- Success modal auto-closes but can be dismissed manually

---

## 📞 Support

For issues or questions about the feature, check:
1. Backend logs for API errors
2. Frontend console for UI errors
3. Database for collection records
4. Notification system for alerts

---

**Status**: ✅ Production Ready
