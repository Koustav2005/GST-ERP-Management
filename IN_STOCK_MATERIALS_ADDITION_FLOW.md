# In Stock Materials Addition Flow

## Question: Who adds materials to store (in stock)?

### Answer: **Accountant** creates Purchase Orders and Major Orders to add materials to the store

---

## Complete Workflow

```
ACCOUNTANT (in CreatePOScreen or MajorOrderScreen)
    ↓
    1. Creates Purchase Order OR Major Order
       ├─ Selects Vendor
       ├─ Adds Items (Material Name, Quantity, Unit Price, HSN)
       ├─ Specifies Quantity to Order
       └─ Clicks "Place Order"
          ↓
BACKEND: POST /projects/major-orders (or purchase_orders)
    ├─ Creates major_orders OR purchase_orders record
    ├─ Inserts items with quantity ordered
    └─ Returns order ID
       ↓
ORDER TRACKING (in InStockOrdersScreen)
    ├─ Shows "New" Orders (pending receipt)
    ├─ Shows "Partial" Orders (partially received)
    └─ Shows "Complete" Orders (fully received)
       ↓
STORE STAFF or VENDOR UPLOADS RECEIPT
    ├─ Navigates to OrderReceipt Screen
    ├─ Selects Items Received
    ├─ Enters Quantity Received
    ├─ Uploads Receipt Images/Bill
    └─ Submits Receipt
       ↓
BACKEND: POST /projects/order-receipts
    ├─ Creates order_receipts record
    ├─ Inserts order_receipt_items with quantity_received
    ├─ Adds received items to inventory table
    └─ Updates order status
       ↓
INVENTORY UPDATED
    ├─ New record added to inventory table
    ├─ item_name, quantity, unit
    ├─ company_id tracked
    └─ Ready for Store Requests
```

---

## Two Types of Orders

### 1. **Major Order** (from Accountant/Procurement)
**Flow**: Accountant → Orders from Contracted Vendors → Store Receives → Added to Inventory

```
MajorOrderScreen (CreateOrder)
    ↓
Accountant selects:
  - Vendor (from master vendors)
  - Items (from saved materials)
  - Quantity to order
  - Unit price
    ↓
POST /projects/major-orders
    ↓
Order sits in "New" tab in InStockOrdersScreen
    ↓
When material arrives:
  - Navigate to OrderReceipt
  - Enter quantity received
  - Upload bill/receipt
    ↓
POST /projects/order-receipts
    ↓
Items added to inventory table
```

### 2. **Purchase Order** (from Accountant)
**Flow**: Accountant → Creates PO → Tracks Receipt → Added to Inventory

```
CreatePOScreen
    ↓
Accountant selects:
  - Master Vendor
  - Items with HSN
  - Quantity & Price
  - GST Rate
    ↓
POST /projects/purchase_orders
    ↓
Order sits in "New" tab in InStockOrdersScreen
    ↓
When material arrives:
  - Navigate to OrderReceipt
  - Confirm quantity received
  - Upload bill images
    ↓
POST /projects/order-receipts
    ↓
Items added to inventory table
```

---

## Key Tables

### major_orders Table
```
id SERIAL PRIMARY KEY
company_id INT REFERENCES companies(id)
vendor_id INT REFERENCES users(id)              ← Vendor/Supplier
item_name VARCHAR(255)
hsn VARCHAR(50)
quantity DECIMAL(10,2)                          ← Quantity ordered
unit VARCHAR(50)
unit_price DECIMAL(10,2)
total_price DECIMAL(10,2)
created_by INT REFERENCES users(id)             ← Accountant who created
status VARCHAR(50)                              ← pending, confirmed, delivered
created_at TIMESTAMP
```

### purchase_orders Table
```
id SERIAL PRIMARY KEY
company_id INT REFERENCES companies(id)
master_vendor_id INT REFERENCES users(id)
vendor_name VARCHAR(255)
vendor_email VARCHAR(255)
total_amount DECIMAL(10,2)
created_by INT REFERENCES users(id)             ← Accountant who created
status VARCHAR(50)
po_number_sequential INT
created_at TIMESTAMP
```

### purchase_order_items Table
```
id SERIAL PRIMARY KEY
po_id INT REFERENCES purchase_orders(id)
material_name VARCHAR(255)
hsn VARCHAR(50)
quantity DECIMAL(10,2)                          ← Quantity ordered
unit VARCHAR(50)
unit_price DECIMAL(10,2)
total_price DECIMAL(10,2)
gst_rate DECIMAL(5,2)
```

### order_receipts Table
```
id SERIAL PRIMARY KEY
order_id INT REFERENCES major_orders(id)        ← Or purchase_order_id
purchase_order_id INT REFERENCES purchase_orders(id)
company_id INT REFERENCES companies(id)
receipt_status VARCHAR(50)                      ← partial, complete
created_at TIMESTAMP
approved_by INT REFERENCES users(id)
```

### order_receipt_items Table
```
id SERIAL PRIMARY KEY
order_id INT REFERENCES major_orders(id)
order_receipt_id INT REFERENCES order_receipts(id)
material_name VARCHAR(255)
quantity_received DECIMAL(10,2)                 ← Actual quantity received
unit VARCHAR(50)
hsn VARCHAR(50)
```

### inventory Table (Created when receipt is submitted)
```
id SERIAL PRIMARY KEY
company_id INT REFERENCES companies(id)
item_name VARCHAR(255)                          ← From order_receipt_items
quantity DECIMAL(10,2)                          ← From quantity_received
unit VARCHAR(50)
created_at TIMESTAMP                            ← When added to inventory
updated_at TIMESTAMP
```

---

## Code Flow

### Step 1: Accountant Creates Order
```javascript
// MajorOrderScreen.js or CreatePOScreen.js

// For Major Order:
const handleCreateOrder = async () => {
  await projectsAPI.createMajorOrder({
    vendor_id: selectedVendor.id,
    company_id: user.company_id,
    items: [
      { item_name: "Steel Plate", quantity: 50, unit_price: 500 },
      { item_name: "Bolts", quantity: 100, unit_price: 10 }
    ],
    created_by: user.id
  });
}

// For Purchase Order:
const handleCreatePO = async () => {
  await purchaseOrdersAPI.create({
    master_vendor_id: selectedVendor.id,
    vendor_name: selectedVendor.name,
    company_id: user.company_id,
    items: [
      { material_name: "Steel", hsn: "7326", quantity: 50, unit_price: 500, gst_rate: 5 }
    ],
    created_by: user.id
  });
}
```

### Step 2: Backend Creates Order Record
```javascript
// backend/routes/projects.js - Line 2450
router.post('/major-orders', async (req, res) => {
  const { vendor_id, items, company_id, created_by } = req.body;

  // Insert into major_orders
  const result = await client.query(`
    INSERT INTO major_orders 
    (company_id, vendor_id, item_name, hsn, quantity, unit, unit_price, total_price, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `);
});
```

### Step 3: Order Appears in InStockOrdersScreen
```javascript
// src/screens/InStockOrdersScreen.js

const fetchOrders = async () => {
  const [ordersResponse, receiptsResponse] = await Promise.all([
    projectsAPI.getMajorOrders(user.company_id),  // ← Gets all major orders
    projectsAPI.getOrderReceipts(user.company_id)  // ← Gets receipts for tracking
  ]);
  
  // Orders grouped into tabs: new, partial, complete
  // Based on receipt status
};
```

### Step 4: Materials Received - Receipt Submitted
```javascript
// OrderReceiptScreen.js

const handleSubmitReceipt = async () => {
  const receiptData = {
    order_id: order.id,
    company_id: user.company_id,
    items: [
      {
        material_name: "Steel Plate",
        quantity_received: 50,      // ← Actual quantity received
        unit: "kg"
      }
    ]
  };

  await projectsAPI.submitOrderReceipt(receiptData);
}
```

### Step 5: Backend Adds to Inventory
```javascript
// backend/routes/projects.js - Order Receipt endpoint

router.post('/order-receipts', async (req, res) => {
  const { order_id, items, company_id } = req.body;

  // 1. Create order_receipts record
  const receipt = await client.query(`
    INSERT INTO order_receipts (order_id, company_id, receipt_status)
    VALUES ($1, $2, $3)
    RETURNING *
  `);

  // 2. For each received item, add to inventory
  for (const item of items) {
    // Check if item already exists in inventory
    const existingItem = await client.query(
      `SELECT * FROM inventory WHERE company_id = $1 AND item_name = $2`,
      [company_id, item.material_name]
    );

    if (existingItem.rows.length > 0) {
      // Update quantity
      await client.query(`
        UPDATE inventory 
        SET quantity = quantity + $1 
        WHERE company_id = $2 AND item_name = $3
      `, [item.quantity_received, company_id, item.material_name]);
    } else {
      // Insert new item to inventory
      await client.query(`
        INSERT INTO inventory (company_id, item_name, quantity, unit)
        VALUES ($1, $2, $3, $4)
      `, [company_id, item.material_name, item.quantity_received, item.unit]);
    }
  }
});
```

---

## Who Does What

| Role | Action | Screen |
|------|--------|--------|
| **Accountant** | Creates Purchase Orders or Major Orders | CreatePOScreen, MajorOrderScreen |
| **Accountant** | Views pending orders | InStockOrdersScreen (New tab) |
| **Store Staff** | Receives materials | OrderReceipt Screen |
| **Store Staff** | Uploads receipt/bill images | OrderReceipt Screen |
| **Store Staff** | Marks items received (quantity) | OrderReceipt Screen |
| **System** | Adds to inventory automatically | inventory table |
| **Store Incharge** | Fulfills PM requests from inventory | OutStockRequestsScreen |

---

## Implications for External Job Work

### For External Job Work Materials:

**Option 1: Same Process**
- External job work materials also ordered through Purchase Orders
- Same inventory system
- Store Incharge fulfills external job work material requests

**Option 2: Direct Supply**
- External job work bypasses inventory
- Materials ordered directly to external company
- No inventory tracking
- No store request workflow

**Option 3: Hybrid**
- Some external jobs use inventory materials (through store requests)
- Some external jobs have direct vendor shipment
- Flexible based on job nature

---

## Summary

**In Stock Material Addition Flow**:
1. ✅ Accountant creates Purchase Order or Major Order
2. ✅ Order tracked in InStockOrdersScreen
3. ✅ Vendor/Supplier delivers materials
4. ✅ Store staff uploads receipt and confirms quantity
5. ✅ Materials automatically added to inventory table
6. ✅ Store Incharge uses inventory to fulfill PM store requests
7. ✅ Workers collect materials via QR codes

**Complete Workflow Chain**:
```
Accountant Creates Order 
    → Vendor Delivers 
    → Store Staff Confirms Receipt 
    → Added to Inventory 
    → PM Requests from Store 
    → Store Incharge Fulfills 
    → Worker Collects
```

 