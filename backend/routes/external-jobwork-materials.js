const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// The challan-based flow (Accountant creates a CHAL-<time> challan, Store receives it, stock is matched by
// company + material name) is replaced by Store's customer material inward (routes/ejw_inwards.js).
// Its routes answer 410 Gone unless LEGACY_EXTERNAL_FLOW=1 is set in the environment.
const legacyOnly = (req, res, next) => {
  if (process.env.LEGACY_EXTERNAL_FLOW === '1') return next();
  return res.status(410).json({ error: 'This screen has been replaced by customer material inward (Store). Ask your administrator if you really need the old flow.' });
};


// ============ INVENTORY ENDPOINTS ============

// Get inventory for a specific job work
router.get('/inventory/:jobWorkId/:companyId', legacyOnly, authenticateToken, async (req, res) => {
  try {
    const { jobWorkId, companyId } = req.params;

    const inventoryResult = await pool.query(`
      SELECT 
        id,
        challan_id,
        material_name,
        quantity,
        unit,
        received_quantity,
        status,
        hsn_code,
        gst_rate
      FROM external_jobwork_inventory
      WHERE job_work_id = $1 AND company_id = $2
        AND (status IN ('received', 'in_stock') OR received_quantity > 0)
      ORDER BY material_name ASC
    `, [jobWorkId, companyId]);

    res.json(inventoryResult.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory', details: error.message });
  }
});

// ============ PROJECT MANAGER ENDPOINTS ============



// ============ STORE INCHARGE ENDPOINTS ============







// Get collection history for a project
router.get('/project/:projectId/collections', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log('📋 Fetching collections for project:', projectId);

    // First, let's check what requests exist for this project
    const requestsCheck = await pool.query(`
      SELECT id, project_id, status FROM external_jobwork_outstock_requests 
      WHERE project_id = $1
      LIMIT 5
    `, [projectId]);
    console.log(`🔍 DEBUG: Found ${requestsCheck.rows.length} requests for project_id=${projectId}:`, requestsCheck.rows);

    // Check if there are ANY transactions for this project
    const debugResult = await pool.query(`
      SELECT id, project_id, request_id, qr_scan_time 
      FROM external_jobwork_outstock_transactions 
      WHERE project_id = $1
      ORDER BY qr_scan_time DESC
      LIMIT 5
    `, [projectId]);

    console.log(`🔍 DEBUG: Found ${debugResult.rows.length} transactions for project_id=${projectId}`);
    if (debugResult.rows.length === 0) {
      console.log('⚠️  No transactions found. Checking all transactions in DB...');
      const allTransactions = await pool.query(`
        SELECT DISTINCT project_id FROM external_jobwork_outstock_transactions LIMIT 10
      `);
      console.log('📊 Existing project_ids in transactions table:', allTransactions.rows.map(r => r.project_id));
      
      // Also check if there are fulfilled requests
      const fulfilledRequests = await pool.query(`
        SELECT id, project_id, status FROM external_jobwork_outstock_requests 
        WHERE status = 'fulfilled'
        LIMIT 10
      `);
      console.log('📊 Fulfilled requests:', fulfilledRequests.rows);
    } else {
      console.log('✅ Found transactions:', debugResult.rows);
    }

    const result = await pool.query(`
      SELECT 
        t.id as transaction_id,
        t.qr_scan_time as collected_at,
        w.name as worker_name,
        w.id as worker_id,
        i.material_name,
        i.issued_quantity as quantity,
        i.unit
      FROM external_jobwork_outstock_transactions t
      LEFT JOIN users w ON t.worker_id = w.id
      LEFT JOIN external_jobwork_outstock_transaction_items i ON t.id = i.transaction_id
      WHERE t.project_id = $1
      ORDER BY t.qr_scan_time DESC
    `, [projectId]);

    console.log('✅ Found', result.rows.length, 'collection records');

    // Group by transaction
    const collections = {};
    result.rows.forEach(row => {
      if (!collections[row.transaction_id]) {
        collections[row.transaction_id] = {
          transaction_id: row.transaction_id,
          collected_at: row.collected_at,
          worker_name: row.worker_name,
          worker_id: row.worker_id,
          materials: []
        };
      }
      if (row.material_name) {
        collections[row.transaction_id].materials.push({
          material_name: row.material_name,
          quantity: row.quantity,
          unit: row.unit
        });
      }
    });

    res.json({
      collections: Object.values(collections),
      debug: {
        projectIdSearched: projectId,
        transactionsFound: result.rows.length,
        requestsCount: requestsCheck.rows.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// Get external job work outstock history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { company_id, project_id, worker_id } = req.query;
    const userCompanyId = req.user.company_id;

    let query = `
      SELECT 
        t.id,
        t.request_id,
        t.project_id,
        t.worker_id,
        t.issued_by,
        t.fulfillment_date,
        t.qr_verification_status,
        p.name as project_name,
        w.name as worker_name,
        si.name as issued_by_name
      FROM external_jobwork_outstock_transactions t
      JOIN projects p ON t.project_id = p.id
      JOIN users w ON t.worker_id = w.id
      JOIN users si ON t.issued_by = si.id
      WHERE t.company_id = $1
    `;

    let params = [userCompanyId];
    let paramCount = 2;

    if (project_id) {
      query += ` AND t.project_id = $${paramCount}`;
      params.push(parseInt(project_id));
      paramCount++;
    }

    if (worker_id) {
      query += ` AND t.worker_id = $${paramCount}`;
      params.push(parseInt(worker_id));
      paramCount++;
    }

    query += ' ORDER BY t.fulfillment_date DESC';

    const transactionsResult = await pool.query(query, params);

    // Get items for each transaction
    const transactions = await Promise.all(transactionsResult.rows.map(async (trans) => {
      const itemsResult = await pool.query(`
        SELECT * FROM external_jobwork_outstock_transaction_items
        WHERE transaction_id = $1
      `, [trans.id]);

      return {
        ...trans,
        items: itemsResult.rows
      };
    }));

    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});


// ============ CHALLAN ENDPOINTS (Placeholders for future implementation) ============




router.get('/challans/store-incharge/:userId/:companyId', legacyOnly, authenticateToken, async (req, res) => {
  try {
    const { userId, companyId } = req.params;

    console.log('📋 Fetching pending challans for store incharge:', userId, 'company:', companyId);

    // First, check all challans in this company
    const allChallansResult = await pool.query(`
      SELECT id, store_incharge_id, challan_status, received_by, received_at FROM external_jobwork_challans 
      WHERE company_id = $1
      ORDER BY id DESC
    `, [companyId]);
    console.log('📊 All challans in company:', allChallansResult.rows);

    const challansResult = await pool.query(`
      SELECT 
        c.id,
        c.challan_number,
        c.material_description,
        c.quantity,
        c.unit,
        c.challan_status,
        c.expected_arrival_date,
        c.store_incharge_id,
        jw.job_id,
        n.material_description as notification_description
      FROM external_jobwork_challans c
      LEFT JOIN job_work_requests jw ON c.job_work_id = jw.id
      LEFT JOIN external_jobwork_material_notifications n ON c.notification_id = n.id
      WHERE c.company_id = $1 
      AND c.challan_status = 'pending'
      AND c.store_incharge_id = $2
      ORDER BY c.created_at DESC
    `, [companyId, userId]);

    console.log('📦 Found', challansResult.rows.length, 'pending challans for this store incharge');
    console.log('Challans:', challansResult.rows);

    res.json(challansResult.rows);
  } catch (error) {
    console.error('❌ Error fetching challans:', error);
    res.status(500).json({ error: 'Failed to fetch challans' });
  }
});

// Get challan details
router.get('/challan-details/:challanId', legacyOnly, authenticateToken, async (req, res) => {
  try {
    const { challanId } = req.params;

    const challanResult = await pool.query(`
      SELECT 
        c.id,
        c.notification_id,
        c.job_work_id,
        c.challan_number,
        c.material_description,
        c.quantity,
        c.unit,
        c.expected_arrival_date,
        c.notes,
        c.challan_status,
        c.created_at,
        n.material_description as notification_material,
        n.expected_arrival_date as notification_arrival_date,
        n.status,
        jw.job_id,
        p.name as project_name,
        u.name as npd_name
      FROM external_jobwork_challans c
      LEFT JOIN external_jobwork_material_notifications n ON c.notification_id = n.id
      LEFT JOIN job_work_requests jw ON c.job_work_id = jw.id
      LEFT JOIN projects p ON jw.project_id = p.id
      LEFT JOIN users u ON n.npd_user_id = u.id
      WHERE c.id = $1
    `, [challanId]);

    if (challanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    const challan = challanResult.rows[0];

    // Get inventory items for this challan
    const itemsResult = await pool.query(`
      SELECT * FROM external_jobwork_inventory WHERE challan_id = $1
    `, [challanId]);

    console.log('📦 Fetched challan with details:', {
      id: challan.id,
      job_work_id: challan.job_work_id,
      material_description: challan.material_description,
      expected_arrival_date: challan.expected_arrival_date,
      status: challan.status,
      job_id: challan.job_id,
      project_name: challan.project_name,
      npd_name: challan.npd_name,
      items_count: itemsResult.rows.length
    });

    res.json({
      challan,
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Error fetching challan details:', error);
    res.status(500).json({ error: 'Failed to fetch challan details' });
  }
});

// Receive challan materials
router.post('/receive-challan/:challanId', legacyOnly, authenticateToken, async (req, res) => {
  console.log('🔵 RECEIVE-CHALLAN ENDPOINT CALLED');
  console.log('challanId:', req.params.challanId);
  console.log('Body:', req.body);
  
  try {
    const { challanId } = req.params;
    const { received_materials, notes, store_incharge_id } = req.body;
    const received_by = store_incharge_id || req.user.id;

    console.log('📥 Receiving challan:', challanId);
    console.log('Received materials:', received_materials);
    console.log('Notes:', notes);
    console.log('Received by:', received_by);

    // Update challan status
    const challanResult = await pool.query(`
      UPDATE external_jobwork_challans 
      SET challan_status = 'received', received_at = CURRENT_TIMESTAMP, received_by = $1, notes = $2
      WHERE id = $3
      RETURNING *
    `, [received_by, notes || null, challanId]);

    if (challanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    const challan = challanResult.rows[0];
    console.log('✅ Challan updated:', challan.challan_number);

    // Update inventory items with their specific received quantities
    if (received_materials && received_materials.length > 0) {
      for (const material of received_materials) {
        console.log(`📦 Updating inventory for: ${material.material_name}, qty: ${material.received_quantity}`);
        
        await pool.query(`
          UPDATE external_jobwork_inventory 
          SET received_quantity = $1, status = 'received', received_by = $2, received_date = CURRENT_TIMESTAMP
          WHERE challan_id = $3 AND material_name = $4
        `, [material.received_quantity, received_by, challanId, material.material_name]);
      }
    }

    console.log('✅ All materials received and inventory updated');

    res.json({
      status: 'success',
      message: 'Challan received successfully',
      challan: {
        challan_number: challan.challan_number,
        id: challan.id
      }
    });
  } catch (error) {
    console.error('❌ Error receiving challan:', error);
    res.status(500).json({ error: 'Failed to receive challan', details: error.message });
  }
});

// Get material notifications for accountant
router.get('/notifications/accountant/:userId/:companyId', legacyOnly, authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;

    const notificationsResult = await pool.query(`
      SELECT 
        n.id,
        n.job_work_id,
        n.material_description,
        n.expected_arrival_date,
        n.status,
        n.created_at,
        jw.job_id,
        p.name as project_name,
        u.name as npd_name
      FROM external_jobwork_material_notifications n
      LEFT JOIN job_work_requests jw ON n.job_work_id = jw.id
      LEFT JOIN projects p ON jw.project_id = p.id
      LEFT JOIN users u ON n.npd_user_id = u.id
      WHERE n.company_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM external_jobwork_challans c 
        WHERE c.notification_id = n.id
      )
      ORDER BY n.created_at DESC
    `, [companyId]);

    console.log('📋 Accountant notifications (with job_work_id):', notificationsResult.rows);
    res.json(notificationsResult.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Create challan from notification
router.post('/create-challan', legacyOnly, authenticateToken, async (req, res) => {
  try {
    const { 
      notification_id, 
      job_work_id, 
      challan_number, 
      quantity, 
      unit, 
      hsn_code, 
      gst_rate,
      notes,
      company_id,
      // Alternative field names from frontend
      material_description,
      expected_arrival_date,
      accountant_id: req_accountant_id,
      store_incharge_id: req_store_incharge_id,
      materials_list
    } = req.body;
    const accountant_id = req_accountant_id || req.user.id;

    // Validate required fields
    if (!job_work_id || !company_id) {
      return res.status(400).json({ 
        error: 'Required fields missing: job_work_id, company_id' 
      });
    }

    // Get quantity and unit from various sources
    let finalQuantity = quantity;
    let finalUnit = unit;

    // If materials_list provided, use it to calculate total quantity and unit
    if (materials_list && materials_list.length > 0) {
      finalQuantity = materials_list.reduce((sum, m) => sum + (parseFloat(m.quantity) || 0), 0);
      finalUnit = materials_list[0].unit || 'unit';
    }

    // Final validation
    if (!finalQuantity || !finalUnit) {
      return res.status(400).json({ 
        error: 'Required fields missing: quantity, unit' 
      });
    }

    // Generate challan_number if not provided
    const finalChallanNumber = challan_number || `CHAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get store incharge if not provided
    let final_store_incharge_id = req_store_incharge_id;
    if (!final_store_incharge_id) {
      const storeInchargeResult = await pool.query(`
        SELECT id FROM users 
        WHERE company_id = $1 AND role = 'store_incharge' 
        LIMIT 1
      `, [company_id]);

      if (storeInchargeResult.rows.length === 0) {
        return res.status(400).json({ error: 'No store incharge found for this company' });
      }
      final_store_incharge_id = storeInchargeResult.rows[0].id;
    }

    console.log(`📝 Creating challan: ${finalChallanNumber}, qty=${finalQuantity}, unit=${finalUnit}`);

    // Create challan
    const challanResult = await pool.query(`
      INSERT INTO external_jobwork_challans 
      (notification_id, job_work_id, company_id, accountant_id, store_incharge_id, challan_number, material_description, quantity, unit, notes, challan_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *
    `, [
      notification_id || null, 
      job_work_id, 
      company_id, 
      accountant_id, 
      final_store_incharge_id, 
      finalChallanNumber, 
      material_description || finalChallanNumber, 
      finalQuantity, 
      finalUnit, 
      notes || null
    ]);

    const challan = challanResult.rows[0];

    console.log(`✅ Challan created with ID: ${challan.id}`);

    // Create inventory record for each material
    if (materials_list && materials_list.length > 0) {
      for (const material of materials_list) {
        await pool.query(`
          INSERT INTO external_jobwork_inventory 
          (challan_id, job_work_id, company_id, material_name, quantity, unit, hsn_code, gst_rate, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        `, [
          challan.id, 
          job_work_id, 
          company_id, 
          material.material_name || finalChallanNumber, 
          parseFloat(material.quantity) || finalQuantity, 
          material.unit || finalUnit, 
          material.hsn_code || hsn_code || null, 
          material.gst_rate || gst_rate || null
        ]);
      }
    } else {
      // Fallback: create single inventory entry
      await pool.query(`
        INSERT INTO external_jobwork_inventory 
        (challan_id, job_work_id, company_id, material_name, quantity, unit, hsn_code, gst_rate, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      `, [
        challan.id, 
        job_work_id, 
        company_id, 
        material_description || finalChallanNumber, 
        finalQuantity, 
        finalUnit, 
        hsn_code || null, 
        gst_rate || null
      ]);
    }

    console.log(`📦 Inventory record(s) created`);

    res.status(201).json({
      status: 'success',
      message: 'Challan created successfully',
      challan: {
        id: challan.id,
        challan_number: finalChallanNumber
      },
      challanId: challan.id,
      challanNumber: finalChallanNumber
    });
  } catch (error) {
    console.error('❌ Error creating challan:', error);
    res.status(500).json({ error: 'Failed to create challan', details: error.message });
  }
});

// Notify about material arrival
router.post('/notify-material-arrival', legacyOnly, authenticateToken, async (req, res) => {
  try {
    const {
      job_work_id,
      material_description,
      expected_arrival_date,
      company_id,
      material_details
    } = req.body;
    const npd_user_id = req.user.id;

    const result = await pool.query(`
      INSERT INTO external_jobwork_material_notifications 
      (job_work_id, npd_user_id, company_id, material_description, expected_arrival_date, material_details, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [job_work_id, npd_user_id, company_id, material_description, expected_arrival_date, JSON.stringify(material_details) || null]);

    res.status(201).json({
      status: 'success',
      message: 'Material arrival notification created',
      notificationId: result.rows[0].id
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ============ WORKER COLLECTION ENDPOINTS ============

// Get collected external materials for a worker
router.get('/worker/:workerId/collected', authenticateToken, async (req, res) => {
  try {
    const { workerId } = req.params;

    // Get fulfilled requests for this worker (which means materials were collected)
    const result = await pool.query(`
      SELECT 
        r.id,
        r.project_id,
        r.worker_id,
        r.requested_by,
        r.company_id,
        r.request_notes,
        r.status,
        r.request_date,
        r.updated_at,
        p.name as project_name,
        u1.name as requested_by_name,
        u2.name as worker_name
      FROM external_jobwork_outstock_requests r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN users u1 ON r.requested_by = u1.id
      LEFT JOIN users u2 ON r.worker_id = u2.id
      WHERE r.worker_id = $1 AND r.status = 'fulfilled'
      ORDER BY r.updated_at DESC
    `, [workerId]);

    // Get items and collections for each request
    const collectedWithItems = await Promise.all(result.rows.map(async (request) => {
      // Get request items
      const itemsResult = await pool.query(`
        SELECT 
          id,
          request_id,
          material_name,
          requested_quantity,
          unit
        FROM external_jobwork_outstock_request_items
        WHERE request_id = $1
      `, [request.id]);

      // Get collection record
      const collectionResult = await pool.query(`
        SELECT 
          id,
          collection_timestamp
        FROM external_material_collections
        WHERE request_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [request.id]);

      return {
        ...request,
        items: itemsResult.rows,
        collection: collectionResult.rows[0] || null
      };
    }));

    res.json({ collected: collectedWithItems });
  } catch (error) {
    console.error('Error fetching collected materials:', error);
    res.status(500).json({ error: 'Failed to fetch collected materials' });
  }
});

// Get pending external material requests for a worker
router.get('/worker/:workerId/requests', authenticateToken, async (req, res) => {
  try {
    const { workerId } = req.params;

    const result = await pool.query(`
      SELECT 
        r.id,
        r.project_id,
        r.worker_id,
        r.requested_by,
        r.company_id,
        r.request_notes,
        r.status,
        r.request_date,
        p.name as project_name,
        u1.name as requested_by_name,
        u2.name as worker_name
      FROM external_jobwork_outstock_requests r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN users u1 ON r.requested_by = u1.id
      LEFT JOIN users u2 ON r.worker_id = u2.id
      WHERE r.worker_id = $1 AND r.status = 'pending'
      ORDER BY r.request_date DESC
    `, [workerId]);

    // Get items for each request
    const requestsWithItems = await Promise.all(result.rows.map(async (request) => {
      const itemsResult = await pool.query(`
        SELECT 
          id,
          request_id,
          material_name,
          requested_quantity,
          unit,
          available_quantity
        FROM external_jobwork_outstock_request_items
        WHERE request_id = $1
      `, [request.id]);

      return {
        ...request,
        items: itemsResult.rows
      };
    }));

    res.json({ requests: requestsWithItems });
  } catch (error) {
    console.error('Error fetching worker requests:', error);
    res.status(500).json({ error: 'Failed to fetch worker requests' });
  }
});

// Get worker collections for a request (for Store Incharge to verify)
router.get('/requests/:requestId/collections', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    let numericRequestId = requestId;
    if (typeof requestId === 'string' && requestId.startsWith('REQ-')) {
      numericRequestId = requestId.substring(4);
    }
    numericRequestId = parseInt(numericRequestId);

    const result = await pool.query(`
      SELECT 
        c.id,
        c.request_id,
        c.collected_by,
        c.collection_timestamp,
        c.status,
        u.name as worker_name,
        r.project_id,
        p.name as project_name,
        r.request_notes
      FROM external_material_collections c
      LEFT JOIN users u ON c.collected_by = u.id
      LEFT JOIN external_jobwork_outstock_requests r ON c.request_id = r.id
      LEFT JOIN projects p ON r.project_id = p.id
      WHERE c.request_id = $1
      ORDER BY c.created_at DESC
    `, [numericRequestId]);

    res.json({ collections: result.rows });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});


module.exports = router;
