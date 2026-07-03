const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ============ INVENTORY ENDPOINTS ============

// Get inventory for a specific job work
router.get('/inventory/:jobWorkId/:companyId', authenticateToken, async (req, res) => {
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

// Get project's external job work materials (available from external inventory)
router.get('/project/:projectId/available', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get project details to find company and project type
    const projectResult = await pool.query(
      'SELECT id, company_id, project_type FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { company_id: companyId, project_type: projectType } = projectResult.rows[0];

    // For external job work projects, fetch ALL external job work inventory materials
    // available in the company (not filtered by specific job work IDs)
    const materialsResult = await pool.query(`
      SELECT 
        id,
        challan_id,
        job_work_id,
        material_name,
        unit,
        quantity,
        received_quantity,
        status,
        hsn_code,
        gst_rate
      FROM external_jobwork_inventory
      WHERE company_id = $1
        AND (status IN ('received', 'in_stock') OR received_quantity > 0)
      ORDER BY material_name ASC
    `, [companyId]);

    // Group by material_name and sum quantities
    const materialsMap = new Map();

    materialsResult.rows.forEach(row => {
      const key = row.material_name;
      if (!materialsMap.has(key)) {
        materialsMap.set(key, {
          id: row.id,
          material_name: row.material_name,
          unit: row.unit,
          received_quantity: 0,
          available_quantity: 0,
          hsn_code: row.hsn_code,
          gst_rate: row.gst_rate
        });
      }
      const material = materialsMap.get(key);
      material.received_quantity += parseFloat(row.received_quantity) || 0;
      material.available_quantity += parseFloat(row.received_quantity) || 0;
    });

    const materials = Array.from(materialsMap.values());

    res.json({ materials });
  } catch (error) {
    console.error('Error fetching available materials:', error);
    res.status(500).json({ error: 'Failed to fetch available materials', details: error.message });
  }
});

// Create material request
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { project_id, worker_id, company_id, request_notes, items } = req.body;
    const requested_by = req.user.id;

    // Validate required fields
    if (!project_id || !worker_id || !company_id || !items || items.length === 0) {
      return res.status(400).json({ 
        error: 'project_id, worker_id, company_id, and items are required' 
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.material_name || !item.requested_quantity || !item.unit) {
        return res.status(400).json({ 
          error: 'Each item must have material_name, requested_quantity, and unit' 
        });
      }
      if (parseFloat(item.requested_quantity) <= 0) {
        return res.status(400).json({ 
          error: 'Requested quantity must be greater than 0' 
        });
      }
    }

    // Check if worker is assigned to the project
    const workerCheckResult = await pool.query(`
      SELECT * FROM project_workers 
      WHERE project_id = $1 AND worker_id = $2
    `, [project_id, worker_id]);

    if (workerCheckResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Worker is not assigned to this project' 
      });
    }

    // Create the request
    const requestResult = await pool.query(`
      INSERT INTO external_jobwork_outstock_requests 
      (project_id, worker_id, requested_by, company_id, request_notes, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [project_id, worker_id, requested_by, company_id, request_notes || null]);

    const request = requestResult.rows[0];

    // Add items to request
    for (const item of items) {
      await pool.query(`
        INSERT INTO external_jobwork_outstock_request_items 
        (request_id, material_name, requested_quantity, unit, available_quantity)
        VALUES ($1, $2, $3, $4, $5)
      `, [request.id, item.material_name, item.requested_quantity, item.unit, item.available_quantity || null]);
    }

    // Send notification to Store Incharge
    const storeInchargeResult = await pool.query(`
      SELECT id FROM users 
      WHERE company_id = $1 AND role = 'store_incharge' 
      LIMIT 1
    `, [company_id]);

    if (storeInchargeResult.rows.length > 0) {
      const storeInchargeId = storeInchargeResult.rows[0].id;
      
      const projectResult = await pool.query(
        'SELECT name FROM projects WHERE id = $1',
        [project_id]
      );
      const projectName = projectResult.rows[0]?.name || 'Unknown Project';

      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, project_id)
        VALUES ($1, 'material_request', 'New External Job Work Material Request', $2, $3)
      `, [storeInchargeId, `New material request for project: ${projectName}`, project_id]);
    }

    res.status(201).json({ 
      requestId: request.id,
      status: 'success',
      message: 'Request created successfully'
    });
  } catch (error) {
    console.error('Error creating material request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// ============ STORE INCHARGE ENDPOINTS ============

// Get pending external job work requests for store incharge
router.get('/requests/pending', authenticateToken, async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const requestsResult = await pool.query(`
      SELECT 
        r.id,
        r.project_id,
        r.worker_id,
        r.requested_by,
        r.request_date,
        r.request_notes,
        r.status,
        p.name as project_name,
        w.name as worker_name,
        pm.name as requested_by_name
      FROM external_jobwork_outstock_requests r
      JOIN projects p ON r.project_id = p.id
      JOIN users w ON r.worker_id = w.id
      JOIN users pm ON r.requested_by = pm.id
      WHERE r.company_id = $1 AND r.status IN ('pending', 'fulfilled')
      ORDER BY r.request_date DESC
    `, [company_id]);

    // Get items for each request
    const requests = await Promise.all(requestsResult.rows.map(async (req) => {
      const itemsResult = await pool.query(`
        SELECT * FROM external_jobwork_outstock_request_items
        WHERE request_id = $1
      `, [req.id]);

      return {
        ...req,
        items: itemsResult.rows
      };
    }));

    res.json({ requests });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get request details
router.get('/requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    const requestResult = await pool.query(`
      SELECT 
        r.*,
        p.name as project_name,
        w.name as worker_name,
        pm.name as requested_by_name
      FROM external_jobwork_outstock_requests r
      JOIN projects p ON r.project_id = p.id
      JOIN users w ON r.worker_id = w.id
      JOIN users pm ON r.requested_by = pm.id
      WHERE r.id = $1
    `, [requestId]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    // Get items
    const itemsResult = await pool.query(`
      SELECT * FROM external_jobwork_outstock_request_items
      WHERE request_id = $1
    `, [requestId]);

    res.json({
      request: {
        ...request,
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ error: 'Failed to fetch request details' });
  }
});

// Fulfill request with QR verification (no partial fulfillment allowed)
router.post('/requests/:requestId/fulfill', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { qr_code, qr_verification_status, transaction_notes } = req.body;
    const issued_by = req.user.id;

    console.log('🔄 Fulfilling request:', requestId);

    // Get request details
    const requestResult = await pool.query(
      'SELECT * FROM external_jobwork_outstock_requests WHERE id = $1',
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];
    console.log('📋 Request details:', { 
      id: request.id, 
      project_id: request.project_id,
      worker_id: request.worker_id,
      requested_by: request.requested_by,
      company_id: request.company_id
    });

    // Get request items
    const itemsResult = await pool.query(
      'SELECT * FROM external_jobwork_outstock_request_items WHERE request_id = $1',
      [requestId]
    );

    const requestItems = itemsResult.rows;
    console.log(`📋 Request has ${requestItems.length} items`);

    // Check if ALL materials are available (full-request-only policy)
    for (const item of requestItems) {
      console.log(`🔍 Checking availability for: ${item.material_name}, requested: ${item.requested_quantity}`);
      
      // Get available quantity from external_jobwork_inventory
      const availabilityResult = await pool.query(`
        SELECT 
          SUM(received_quantity) as available_quantity
        FROM external_jobwork_inventory
        WHERE job_work_id = (
          SELECT id FROM job_work_requests 
          WHERE project_id = $1 
          LIMIT 1
        )
        AND LOWER(TRIM(material_name)) = LOWER(TRIM($2))
        AND (status IN ('received', 'in_stock') OR received_quantity > 0)
      `, [request.project_id, item.material_name]);

      const availableQty = availabilityResult.rows.length > 0 && availabilityResult.rows[0].available_quantity
        ? parseFloat(availabilityResult.rows[0].available_quantity)
        : 0;

      console.log(`✅ Available: ${availableQty}`);

      if (availableQty < parseFloat(item.requested_quantity)) {
        console.error(`❌ INSUFFICIENT STOCK: ${item.material_name}. Need ${item.requested_quantity}, have ${availableQty}`);
        return res.status(400).json({
          error: `Insufficient stock for ${item.material_name}. Cannot fulfill this request. (No partial issuance allowed)`,
          material_name: item.material_name,
          requested: item.requested_quantity,
          available: availableQty
        });
      }
    }

    console.log('✅ All materials available. Creating transaction...');

    // Create transaction
    try {
      const transactionResult = await pool.query(`
        INSERT INTO external_jobwork_outstock_transactions 
        (request_id, project_id, worker_id, issued_by, company_id, qr_verification_status, qr_scan_time, transaction_notes)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
        RETURNING *
      `, [
        requestId, 
        request.project_id, 
        request.worker_id, 
        issued_by, 
        request.company_id,
        qr_verification_status || 'verified',
        transaction_notes || null
      ]);

      const transaction = transactionResult.rows[0];
      console.log('✅ Transaction created:', { 
        id: transaction.id,
        project_id: transaction.project_id,
        request_id: transaction.request_id
      });

      // Deduct from external job work inventory and create transaction items
      for (const item of requestItems) {
        try {
          // Create transaction item record
          console.log(`📝 Creating transaction item for: ${item.material_name}`);
          await pool.query(`
            INSERT INTO external_jobwork_outstock_transaction_items 
            (transaction_id, material_name, issued_quantity, unit)
            VALUES ($1, $2, $3, $4)
          `, [transaction.id, item.material_name, item.requested_quantity, item.unit]);
          console.log(`✅ Transaction item created`);

          // Update inventory status to 'issued' for the corresponding materials
          const inventoryUpdate = await pool.query(`
            UPDATE external_jobwork_inventory 
            SET status = 'issued', updated_at = CURRENT_TIMESTAMP
            WHERE job_work_id = (
              SELECT id FROM job_work_requests 
              WHERE project_id = $1 
              LIMIT 1
            )
            AND LOWER(TRIM(material_name)) = LOWER(TRIM($2))
            AND status IN ('received', 'in_stock')
          `, [request.project_id, item.material_name]);
          console.log(`✅ Inventory updated. Rows affected: ${inventoryUpdate.rowCount}`);
        } catch (e) {
          // Log but continue
          console.log('⚠️ Warning: Could not update inventory:', e.message);
        }
      }

      // Update request status to fulfilled
      console.log('📝 Marking request as fulfilled...');
      await pool.query(`
        UPDATE external_jobwork_outstock_requests 
        SET status = 'fulfilled', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [requestId]);

      console.log('✅ Request marked as fulfilled');

      // Send notification to requestor (Project Manager) with collection details
      const projectResult = await pool.query(
        'SELECT name FROM projects WHERE id = $1',
        [request.project_id]
      );
      const projectName = projectResult.rows[0]?.name || 'Unknown Project';

      // Get worker details
      const workerResult = await pool.query(
        'SELECT name, email FROM users WHERE id = $1',
        [request.worker_id]
      );
      const workerName = workerResult.rows[0]?.name || 'Unknown Worker';

      // Get materials collected
      const materialsCollected = requestItems.map(item => `${item.requested_quantity} ${item.unit} of ${item.material_name}`).join(', ');

      const notificationMessage = `✅ Material collected by ${workerName}. Items: ${materialsCollected}. Collected at: ${new Date().toLocaleString()}`;

      console.log('📬 Creating notification for PM:', {
        project_id: request.project_id,
        requested_by: request.requested_by,
        message: notificationMessage,
        transaction_id: transaction.id
      });

      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, project_id, metadata)
        VALUES ($1, 'material_collected', 'Material Collected', $2, $3, $4)
      `, [
        request.requested_by, 
        notificationMessage, 
        request.project_id,
        JSON.stringify({
          transaction_id: transaction.id,
          worker_id: request.worker_id,
          worker_name: workerName,
          materials: requestItems,
          collected_at: new Date().toISOString()
        })
      ]);

      console.log('✅ Notification created');

      res.status(201).json({
        transactionId: transaction.id,
        status: 'success',
        message: 'Request fulfilled successfully'
      });
    } catch (transactionError) {
      console.error('❌ ERROR creating transaction:', transactionError.message);
      console.error('Stack:', transactionError.stack);
      throw transactionError;
    }
  } catch (error) {
    console.error('❌ Error fulfilling request:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to fulfill request', details: error.message });
  }
});

// DEBUG: Check all transactions in system
router.get('/debug/all-transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, project_id, request_id, qr_scan_time FROM external_jobwork_outstock_transactions 
      ORDER BY qr_scan_time DESC
      LIMIT 10
    `);
    res.json({ 
      total: result.rows.length,
      transactions: result.rows 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Complete data dump
router.get('/debug/complete-state', authenticateToken, async (req, res) => {
  try {
    const company_id = req.user.company_id;
    
    // Get all requests for this company
    const requests = await pool.query(`
      SELECT id, project_id, status, worker_id, requested_by 
      FROM external_jobwork_outstock_requests 
      WHERE company_id = $1
      LIMIT 20
    `, [company_id]);
    
    // Get all transactions for this company
    const transactions = await pool.query(`
      SELECT t.id, t.project_id, t.request_id, t.qr_scan_time,
        COUNT(i.id) as item_count
      FROM external_jobwork_outstock_transactions t
      LEFT JOIN external_jobwork_outstock_transaction_items i ON t.id = i.transaction_id
      WHERE t.company_id = $1
      GROUP BY t.id
      LIMIT 20
    `, [company_id]);
    
    // Get projects
    const projects = await pool.query(`
      SELECT id, name FROM projects 
      WHERE company_id = $1
      LIMIT 20
    `, [company_id]);
    
    res.json({
      company_id,
      requests: requests.rows,
      transactions: transactions.rows,
      projects: projects.rows,
      summary: {
        totalRequests: requests.rows.length,
        totalTransactions: transactions.rows.length,
        totalProjects: projects.rows.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Check all transactions for a project
router.get('/debug/transactions/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(`
      SELECT id, project_id, worker_id, qr_scan_time FROM external_jobwork_outstock_transactions 
      WHERE project_id = $1
      ORDER BY qr_scan_time DESC
      LIMIT 5
    `, [projectId]);
    res.json({ transactions: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// Cancel request (only pending requests can be cancelled)
router.put('/requests/:requestId/cancel', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Check if request is pending
    const requestResult = await pool.query(
      'SELECT * FROM external_jobwork_outstock_requests WHERE id = $1',
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Only pending requests can be cancelled' 
      });
    }

    // Update status to cancelled
    await pool.query(`
      UPDATE external_jobwork_outstock_requests 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [requestId]);

    res.json({ 
      status: 'success',
      message: 'Request cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// ============ CHALLAN ENDPOINTS (Placeholders for future implementation) ============

// Get pending challans for store incharge
// DEBUG: Check all challans in a company
router.get('/debug/challans/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await pool.query(`
      SELECT id, challan_number, store_incharge_id, challan_status, company_id FROM external_jobwork_challans 
      WHERE company_id = $1
      ORDER BY id DESC
      LIMIT 10
    `, [companyId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Reset a challan to pending
router.post('/debug/reset-challan/:challanId', authenticateToken, async (req, res) => {
  try {
    const { challanId } = req.params;
    console.log('🔄 Resetting challan', challanId, 'to pending status');

    const result = await pool.query(`
      UPDATE external_jobwork_challans 
      SET challan_status = 'pending', received_at = NULL, received_by = NULL
      WHERE id = $1
      RETURNING *
    `, [challanId]);

    if (result.rows.length > 0) {
      console.log('✅ Reset challan:', result.rows[0].challan_number);
      res.json({ message: 'Challan reset to pending', challan: result.rows[0] });
    } else {
      res.status(404).json({ error: 'Challan not found' });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/debug/fix-store-incharge/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    console.log('🔧 Fixing challan store_incharge for company:', companyId);

    // Get all challans with NULL store_incharge_id
    const challanResult = await pool.query(`
      SELECT c.id FROM external_jobwork_challans c
      WHERE c.company_id = $1 AND c.store_incharge_id IS NULL
    `, [companyId]);

    console.log(`Found ${challanResult.rows.length} challans with missing store_incharge_id`);

    let fixed = 0;
    for (const challan of challanResult.rows) {
      const siResult = await pool.query(`
        SELECT id FROM users 
        WHERE company_id = $1 AND role = 'store_incharge'
        LIMIT 1
      `, [companyId]);

      if (siResult.rows.length > 0) {
        await pool.query(`
          UPDATE external_jobwork_challans 
          SET store_incharge_id = $1
          WHERE id = $2
        `, [siResult.rows[0].id, challan.id]);
        fixed++;
      }
    }

    console.log(`✅ Fixed ${fixed} challans`);
    res.json({ fixed, message: `Fixed ${fixed} challans` });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/challans/store-incharge/:userId/:companyId', authenticateToken, async (req, res) => {
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
router.get('/challan-details/:challanId', authenticateToken, async (req, res) => {
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
router.post('/receive-challan/:challanId', authenticateToken, async (req, res) => {
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
router.get('/notifications/accountant/:userId/:companyId', authenticateToken, async (req, res) => {
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
router.post('/create-challan', authenticateToken, async (req, res) => {
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
router.post('/notify-material-arrival', authenticateToken, async (req, res) => {
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

// Worker collects external materials
router.post('/requests/:requestId/collect', authenticateToken, async (req, res) => {
  try {
    let { requestId } = req.params;
    const { collected_by, collection_timestamp } = req.body;

    if (!collected_by) {
      return res.status(400).json({ error: 'collected_by is required' });
    }

    // Handle both numeric IDs and REQ-{id} format
    if (typeof requestId === 'string' && requestId.startsWith('REQ-')) {
      requestId = requestId.substring(4); // Remove 'REQ-' prefix
    }

    // Convert to number
    requestId = parseInt(requestId);

    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID format' });
    }

    console.log('🔄 Collecting materials for request:', requestId);

    // Verify the request exists and is pending
    const requestResult = await pool.query(
      'SELECT * FROM external_jobwork_outstock_requests WHERE id = $1 AND status = $2',
      [requestId, 'pending']
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or already completed' });
    }

    const request = requestResult.rows[0];
    console.log('📋 Request details:', { id: request.id, project_id: request.project_id, worker_id: request.worker_id });

    // Verify the worker matches
    if (request.worker_id !== collected_by && request.worker_id !== parseInt(collected_by)) {
      return res.status(403).json({ error: 'Access denied: Worker mismatch' });
    }

    // Get request items FIRST (needed for transaction)
    const itemsResult = await pool.query(`
      SELECT material_name, requested_quantity, unit
      FROM external_jobwork_outstock_request_items
      WHERE request_id = $1
    `, [requestId]);

    const requestItems = itemsResult.rows;
    console.log(`📦 Collection ${requestId}: Found ${requestItems.length} items to deduct`);

    // Create transaction BEFORE updating request status
    console.log('📝 Creating transaction...');
    let transaction = null;
    
    try {
      const transactionResult = await pool.query(`
        INSERT INTO external_jobwork_outstock_transactions 
        (request_id, project_id, worker_id, issued_by, company_id, qr_verification_status, qr_scan_time, transaction_notes)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
        RETURNING *
      `, [
        requestId, 
        request.project_id, 
        request.worker_id, 
        collected_by,  // issued_by = the worker collecting
        request.company_id,
        'verified',
        `Collected on ${new Date().toLocaleString()}`
      ]);

      transaction = transactionResult.rows[0];
      console.log('✅ Transaction created:', { id: transaction.id, project_id: transaction.project_id });

      // Create transaction items
      for (const item of requestItems) {
        console.log(`📝 Creating transaction item for: ${item.material_name}`);
        await pool.query(`
          INSERT INTO external_jobwork_outstock_transaction_items 
          (transaction_id, material_name, issued_quantity, unit)
          VALUES ($1, $2, $3, $4)
        `, [transaction.id, item.material_name, item.requested_quantity, item.unit]);
        console.log(`✅ Transaction item created`);
      }
    } catch (transactionError) {
      console.error('⚠️ Warning: Transaction creation failed:', transactionError.message);
      console.log('Continuing with collection without transaction...');
      // Don't block collection if transaction fails - still mark as fulfilled
    }

    // Update request status to fulfilled (collection complete)
    console.log('📝 Marking request as fulfilled...');
    const updateResult = await pool.query(`
      UPDATE external_jobwork_outstock_requests
      SET status = 'fulfilled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [requestId]);

    console.log('✅ Request marked as fulfilled');

    // Create collection record (for backward compatibility)
    console.log('📝 Creating collection record...');
    const collectionResult = await pool.query(`
      INSERT INTO external_material_collections 
      (request_id, collected_by, collection_timestamp, status)
      VALUES ($1, $2, $3, 'completed')
      RETURNING id
    `, [requestId, collected_by, collection_timestamp || new Date().toISOString()]);

    console.log(`✅ Collection record created: ${collectionResult.rows[0].id}`);

    // Deduct from external job work inventory
    for (const item of requestItems) {
      try {
        console.log(`🔄 Processing: ${item.material_name} (${item.requested_quantity} ${item.unit})`);
        
        // First, find matching inventory items (case-insensitive, trimmed)
        const matchingInventory = await pool.query(`
          SELECT id, received_quantity, material_name, status
          FROM external_jobwork_inventory
          WHERE company_id = $1
            AND LOWER(TRIM(material_name)) = LOWER(TRIM($2))
            AND (status IN ('received', 'in_stock') OR received_quantity > 0)
          ORDER BY created_at ASC
          LIMIT 1
        `, [request.company_id, item.material_name]);

        console.log(`  Found ${matchingInventory.rows.length} matching inventory items`);

        if (matchingInventory.rows.length > 0) {
          const inventoryItem = matchingInventory.rows[0];
          const newQuantity = Math.max(0, parseFloat(inventoryItem.received_quantity) - parseFloat(item.requested_quantity));
          
          console.log(`  Before: ${inventoryItem.material_name} = ${inventoryItem.received_quantity} qty, status=${inventoryItem.status}`);
          console.log(`  Deducting: ${item.requested_quantity}`);
          console.log(`  After: ${newQuantity} qty, status=${newQuantity <= 0 ? 'issued' : 'in_stock'}`);
          
          // Update inventory: reduce received_quantity by the requested amount
          const updateRes = await pool.query(`
            UPDATE external_jobwork_inventory
            SET 
              received_quantity = $1::numeric,
              status = CASE 
                WHEN $1::numeric <= 0 THEN 'issued'
                ELSE 'in_stock'
              END,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, received_quantity, status
          `, [newQuantity, inventoryItem.id]);

          console.log(`  ✅ Updated inventory ID ${inventoryItem.id}: qty=${newQuantity}, status=${updateRes.rows[0].status}`);
        } else {
          console.log(`  ⚠️  WARNING: No matching inventory found for: ${item.material_name}`);
          console.log(`  Searching all inventory for this company...`);
          
          const allInventory = await pool.query(`
            SELECT id, material_name, received_quantity, status
            FROM external_jobwork_inventory
            WHERE company_id = $1
            LIMIT 10
          `, [request.company_id]);
          
          console.log(`  Found ${allInventory.rows.length} total inventory items in company:`);
          allInventory.rows.forEach(inv => {
            console.log(`    - ${inv.material_name} (${inv.received_quantity} qty, ${inv.status})`);
          });
        }
      } catch (e) {
        console.error(`  ❌ Error updating inventory for ${item.material_name}:`, e.message);
      }
    }

    // Send notification to PM (Project Manager - requestor)
    console.log('📬 Creating notification for PM...');
    const workerResult = await pool.query(
      'SELECT name FROM users WHERE id = $1',
      [request.worker_id]
    );
    const workerName = workerResult.rows[0]?.name || 'Worker';

    const materialsCollected = requestItems.map(item => `${item.requested_quantity} ${item.unit} of ${item.material_name}`).join(', ');
    const notificationMessage = `✅ Material collected by ${workerName}. Items: ${materialsCollected}. Collected at: ${new Date().toLocaleString()}`;

    // Send PM notification (only if transaction was created)
    if (transaction) {
      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, project_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        request.requested_by, 
        'material_collected',
        'Material Collected', 
        notificationMessage, 
        request.project_id
      ]);

      console.log('✅ PM notification created with transaction details');
    } else {
      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, project_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        request.requested_by, 
        'material_collected',
        'Material Collected', 
        notificationMessage, 
        request.project_id
      ]);

      console.log('⚠️ PM notification created (transaction unavailable)');
    }

    // Notify store incharge about collection (for backward compatibility)
    const storeInchargeResult = await pool.query(
      `SELECT id FROM users 
       WHERE company_id = $1 AND role = 'store_incharge' LIMIT 1`,
      [request.company_id]
    );

    if (storeInchargeResult.rows.length > 0) {
      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, project_id)
        VALUES ($1, 'material_collected', 'External Material Collected', $2, $3)
      `, [storeInchargeResult.rows[0].id, 
          `Materials collected from request #${requestId}`, 
          request.project_id]);

      console.log('✅ Store incharge notification created');
    }

    console.log('✅ Collection complete. Transaction ID:', transaction?.id || 'N/A');

    res.json({
      status: 'success',
      message: 'Materials collected successfully',
      collectionId: collectionResult.rows[0].id,
      transactionId: transaction?.id || null
    });
  } catch (error) {
    console.error('❌ Error collecting materials:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to collect materials', details: error.message });
  }
});

module.exports = router;
